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
    sessionType?: "admin" | "owner";
    username?: string;
    ownerEmail?: string;
    ownerRestaurantId?: number;
  }
}

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── Request ID ────────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  req.requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  next();
});

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no origin header)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

// ── Rate limiting on auth endpoints ──────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});
app.use(["/api/admin/login", "/api/admin/owner-login"], authLimiter);

// ── Session (PostgreSQL store) ────────────────────────────────────────────────
const PgSessionStore = connectPgSimple(session);
app.use(
  session({
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
    store: new PgSessionStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
  }),
);

app.use(
  express.json({
    limit: "50kb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

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
  // ── Auto-migrate on startup ────────────────────────────────────────────────
  try {
    const migrationsFolder = path.resolve(__dirname, "../../migrations");
    await migrate(db, { migrationsFolder });
    log("Database migrations applied.", "migrate");
  } catch (err) {
    // Non-fatal in dev if migrations folder doesn't exist yet; fatal in production
    if (process.env.NODE_ENV === "production") {
      console.error("FATAL: Database migration failed:", err);
      process.exit(1);
    } else {
      log(`Migration skipped (dev): ${String(err)}`, "migrate");
    }
  }

  startDataRetentionJob();
  startAnalyticsQualityJob();
  startAggregationJob();
  startFeatureUpdateJob();
  await registerRoutes(httpServer, app);

  // ── Global error handler ────────────────────────────────────────────────────
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    console.error(`[${req.requestId}] Internal Server Error:`, err);

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
