import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import { pool, db } from "./db";
import { startDataRetentionJob } from "./jobs/dataRetention";
import { startAnalyticsQualityJob } from "./jobs/analyticsQuality";
import { startAggregationJob } from "./jobs/aggregationJob";
import { startFeatureUpdateJob } from "./jobs/featureUpdateJob";
import type { AdminRole } from "@shared/schema";
import { adminUsers } from "@shared/schema";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Fail-fast env validation ──────────────────────────────────────────────────
const sessionSecret = process.env.SESSION_SECRET ?? "";
if (!sessionSecret) {
  console.error("FATAL: SESSION_SECRET environment variable is not set. Refusing to start.");
  process.exit(1);
}
if (sessionSecret.length < 32) {
  console.error(`FATAL: SESSION_SECRET is too short (${sessionSecret.length} chars). Must be at least 32 characters.`);
  console.error("Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
    requestId: string;
  }
}

declare module "express-session" {
  interface SessionData {
    isAdmin?: boolean;
    adminRole?: AdminRole;
    adminUserId?: number;
    sessionType?: "admin" | "owner";
    username?: string;
    ownerEmail?: string;
    ownerRestaurantId?: number;
  }
}

// ── Ultra-early request logger ───────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith("/api/admin")) {
    console.log("\n========== [INCOMING REQUEST] ==========");
    console.log("  Method:", req.method);
    console.log("  Path:", req.path);
    console.log("  Content-Type:", req.headers["content-type"]);
    console.log("  Origin:", req.headers["origin"]);
    console.log("========================================\n");
  }
  next();
});

// ── Security headers ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log("[middleware/helmet] Entering");
  helmet()(req, res, (err: any) => {
    if (err) console.error("[HELMET ERROR]", err);
    console.log("[middleware/helmet] Done");
    next(err);
  });
});

// ── Request ID ────────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  req.requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  next();
});

// ── Debug: Catch errors in middleware chain ───────────────────────────────────
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[MIDDLEWARE ERROR]", err);
  next(err);
});

// ── CORS ──────────────────────────────────────────────────────────────────────
console.log("[init] Setting up CORS...");
const apiPort = process.env.API_PORT || "3002";
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3001,http://localhost:5001")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
// Always allow the API's own origin and the admin dev server
const selfOrigin = `http://localhost:${apiPort}`;
if (!allowedOrigins.includes(selfOrigin)) allowedOrigins.push(selfOrigin);
const adminOrigin = "http://localhost:5001";
if (!allowedOrigins.includes(adminOrigin)) allowedOrigins.push(adminOrigin);
console.log("[init] CORS allowed origins:", allowedOrigins);

app.use((req, res, next) => {
  console.log("[middleware/cors] Entering");
  cors({
    origin: (origin, callback) => {
      console.log("[cors] Checking origin:", origin);
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })(req, res, (err: any) => {
    if (err) console.error("[CORS ERROR]", err);
    console.log("[middleware/cors] Done");
    next(err);
  });
});

// ── Rate limiting on auth endpoints ──────────────────────────────────────────
console.log("[init] Setting up rate limiter...");
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});
app.use((req, res, next) => {
  if (req.path === "/api/admin/login" || req.path === "/api/admin/owner-login") {
    console.log("[middleware/rateLimiter] Entering for", req.path);
    authLimiter(req, res, (err: any) => {
      if (err) console.error("[RATE LIMITER ERROR]", err);
      console.log("[middleware/rateLimiter] Done");
      next(err);
    });
  } else {
    next();
  }
});

// ── Debug middleware for login endpoint ──────────────────────────────────────
app.use("/api/admin/login", (req, res, next) => {
  console.log("[middleware/login] Request reached:", req.method, req.path, "session:", !!req.session);
  next();
});

// ── Session (PostgreSQL store) ────────────────────────────────────────────────
const PgSessionStore = connectPgSimple(session);
const pgStore = new PgSessionStore({
  pool,
  tableName: "session",
  createTableIfMissing: true,
});
pgStore.on("error", (err: any) => {
  console.error("[PgSessionStore ERROR EVENT]", err);
});
console.log("[init] PgSessionStore created OK");

const sessionMiddleware = session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  },
  store: pgStore,
});
console.log("[init] Session middleware created OK");

app.use((req, res, next) => {
  console.log("[middleware/session] Entering for", req.method, req.path);
  try {
    sessionMiddleware(req, res, (err: any) => {
      if (err) {
        console.error("[SESSION ERROR]", err);
        console.error("[SESSION ERROR] stack:", err?.stack);
        return res.status(500).json({ message: "Session error", detail: String(err) });
      }
      console.log("[middleware/session] OK - sessionID:", req.sessionID, "path:", req.path);
      next();
    });
  } catch (err) {
    console.error("[SESSION INIT ERROR]", err);
    next(err);
  }
});

app.use(
  express.json({
    // Allow base64 image payloads for admin/owner upload endpoints.
    limit: process.env.API_JSON_LIMIT ?? "20mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// ── Debug: log parsed body for login endpoints ──────────────────────────────
app.use("/api/admin/login", (req, _res, next) => {
  console.log("[debug/body-parser] /api/admin/login body:", JSON.stringify(req.body), "content-type:", req.headers["content-type"]);
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Request logging with request ID ──────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Expose request ID to the client for distributed tracing
  res.setHeader("x-request-id", req.requestId);

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms [${req.requestId}]`;
      if (capturedJsonResponse) {
        if (Array.isArray(capturedJsonResponse)) {
          logLine += ` :: response=array(${capturedJsonResponse.length})`;
        } else if (
          typeof capturedJsonResponse === "object" &&
          "items" in capturedJsonResponse &&
          Array.isArray((capturedJsonResponse as any).items)
        ) {
          logLine += ` :: response.items=${(capturedJsonResponse as any).items.length}`;
        } else {
          logLine += " :: response=object";
        }
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // ── Database connection health check ───────────────────────────────────────────
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW() as now, current_database() as db");
    client.release();
    log(`✅ Database connected OK - ${result.rows[0].db} @ ${result.rows[0].now}`, "db");
  } catch (err) {
    log(`❌ Database connection FAILED: ${err instanceof Error ? err.message : String(err)}`, "db");
    if (process.env.NODE_ENV === "production") {
      console.error("FATAL: Cannot connect to database in production");
      process.exit(1);
    }
  }

  // ── Auto-migrate on startup ────────────────────────────────────────────────
  try {
    const migrationsFolder = path.resolve(__dirname, "../../migrations");
    await migrate(db, { migrationsFolder });
    log("✅ Database migrations applied.", "migrate");
  } catch (err) {
    // Non-fatal in dev if migrations folder doesn't exist yet; fatal in production
    if (process.env.NODE_ENV === "production") {
      console.error("FATAL: Database migration failed:", err);
      process.exit(1);
    } else {
      log(`⚠️ Migration skipped (dev): ${String(err)}`, "migrate");
    }
  }

  startDataRetentionJob();
  startAnalyticsQualityJob();
  startAggregationJob();
  startFeatureUpdateJob();

  // ── Seed initial superadmin from env if none exists ────────────────────────
  try {
    const seedEmail = process.env.ADMIN_EMAIL;
    const seedPassword = process.env.ADMIN_PASSWORD;
    const seedUsername = process.env.ADMIN_USERNAME ?? "admin";
    if (seedEmail && seedPassword) {
      const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
      if (!existing) {
        const passwordHash = await bcrypt.hash(seedPassword, 10);
        await db.insert(adminUsers).values({
          username: seedUsername,
          email: seedEmail,
          passwordHash,
          role: "superadmin",
          permissions: [
            "manage_restaurants", "manage_users", "manage_campaigns",
            "manage_banners", "view_analytics", "manage_claims", "manage_config",
          ],
          isActive: true,
        });
        log(`✅ Seeded superadmin: ${seedEmail}`, "seed");
      }
    }
  } catch (err) {
    log(`⚠️ Superadmin seed skipped: ${String(err)}`, "seed");
  }

  await registerRoutes(httpServer, app);

  // ── Global error handler ────────────────────────────────────────────────────
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    console.error("\n========== [GLOBAL ERROR HANDLER] ==========");
    console.error("  Request:", req.method, req.path);
    console.error("  Status:", status);
    console.error("  Error message:", err?.message);
    console.error("  Error type:", err?.type);
    console.error("  Error code:", err?.code);
    console.error("  Full error:", err);
    console.error("  Stack:", err?.stack);
    console.error("=============================================\n");

    if (res.headersSent) {
      return next(err);
    }

    // Never leak internal error details to clients in production
    const message =
      process.env.NODE_ENV === "production" && status >= 500
        ? "Internal Server Error"
        : (err.message || "Internal Server Error");

    return res.status(status).json({ message });
  });

  const port = parseInt(process.env.API_PORT || "3002", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on("SIGTERM", () => {
  log("SIGTERM received, shutting down gracefully...");
  httpServer.close(async () => {
    try {
      await pool.end();
      log("Database pool closed. Exiting.");
    } catch {
      log("Error closing database pool.");
    }
    process.exit(0);
  });

  // Force exit after 10 seconds if connections don't drain
  setTimeout(() => {
    log("Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000).unref();
});

process.on("SIGINT", () => {
  log("SIGINT received, shutting down...");
  process.exit(0);
});
