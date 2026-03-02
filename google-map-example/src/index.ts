import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { URL } from "node:url";
import { CONFIG } from "./config.js";
import { PlacesService } from "./service.js";
import { SearchParams } from "./types.js";
import { db } from "./db.js";

process.on("uncaughtException", (err) => {
  console.error("uncaughtException", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection", reason);
  process.exit(1);
});

const service = new PlacesService();
const publicDir = join(process.cwd(), "public");

console.log("[config] providerFallback:", CONFIG.providerFallback);
console.log("[config] googlePhotoEnrich:", CONFIG.googlePhotoEnrich);

const sendJson = (res: ServerResponse, status: number, data: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(data));
};

const parseSearchParams = (url: URL): SearchParams | null => {
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const radius = Number(url.searchParams.get("radius") || 1000);
  const query = url.searchParams.get("q") || "restaurant";
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, radius, query };
};

const serveStatic = async (path: string, res: ServerResponse) => {
  try {
    const file = await readFile(path);
    const contentType = contentTypeByExt(extname(path));
    if (contentType) res.setHeader("Content-Type", contentType);
    res.statusCode = 200;
    res.end(file);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
};

const contentTypeByExt = (ext: string): string | undefined => {
  const map: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
  };
  return map[ext];
};

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const reqUrl = new URL(req.url || "/", `http://${req.headers.host}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method === "GET" && reqUrl.pathname === "/health") {
    sendJson(res, 200, { ok: true, providerFallback: CONFIG.providerFallback });
    return;
  }

  if (req.method === "GET" && reqUrl.pathname === "/places") {
    const params = parseSearchParams(reqUrl);
    if (!params) {
      sendJson(res, 400, { error: "lat, lon required" });
      return;
    }
    try {
      const force = reqUrl.searchParams.get("force") === "true";
      const data = force ? await service.prefetch(params) : await service.search(params);
      if (Array.isArray(data)) {
        sendJson(res, 200, { data, source: force ? "prefetch" : "cache-first" });
      } else {
        sendJson(res, 200, { data, source: "prefetch" });
      }
    } catch (err: any) {
      sendJson(res, 500, { error: err?.message || "unknown error" });
    }
    return;
  }

  if (req.method === "POST" && reqUrl.pathname === "/prefetch") {
    const params = parseSearchParams(new URL(req.url || "/", `http://${req.headers.host}`));
    if (!params) {
      sendJson(res, 400, { error: "lat, lon required" });
      return;
    }
    try {
      const count = await service.prefetch(params);
      sendJson(res, 200, { ok: true, cached: count });
    } catch (err: any) {
      sendJson(res, 500, { error: err?.message || "unknown error" });
    }
    return;
  }

  if (req.method === "GET" && reqUrl.pathname.startsWith("/place/")) {
    const id = decodeURIComponent(reqUrl.pathname.replace("/place/", ""));
    try {
      const place = await service.getPlace(id);
      if (!place) {
        sendJson(res, 404, { error: "not found" });
        return;
      }
      sendJson(res, 200, { data: place });
    } catch (err: any) {
      sendJson(res, 500, { error: err?.message || "unknown error" });
    }
    return;
  }

  // Admin: list cached places from DB
  if (req.method === "GET" && reqUrl.pathname === "/admin/places") {
    const limit = clampInt(reqUrl.searchParams.get("limit"), 1, 1000, 200);
    const offset = clampInt(reqUrl.searchParams.get("offset"), 0, 1_000_000, 0);
    const source = reqUrl.searchParams.get("source") || null;
    const hasPhotoParam = reqUrl.searchParams.get("hasPhoto");
    const hasPhoto =
      hasPhotoParam === "true" ? true : hasPhotoParam === "false" ? false : null;

    // fetch more rows than requested to avoid losing items after in-memory filter
    const fetchSize = Math.min(Math.max(limit * 10, 2000), 20000);
    const rows = db
      .prepare(
        "SELECT value FROM cache WHERE key LIKE 'place:%' LIMIT ? OFFSET ?"
      )
      .all(fetchSize, offset) as { value: string }[];
    const filtered = rows
      .map((r) => {
        try {
          return JSON.parse(r.value);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((p: any) => (source ? p.source === source : true))
      .filter((p: any) =>
        hasPhoto === null ? true : hasPhoto ? !!(p.photos && p.photos.length) : !(p.photos && p.photos.length)
      ) as any[];
    const data = filtered.slice(0, limit);
    sendJson(res, 200, {
      data,
      limit,
      offset,
      count: data.length,
      totalFiltered: filtered.length,
      scanned: rows.length,
    });
    return;
  }

  // Admin: request logs
  if (req.method === "GET" && reqUrl.pathname === "/admin/logs") {
    const limit = clampInt(reqUrl.searchParams.get("limit"), 1, 1000, 200);
    const offset = clampInt(reqUrl.searchParams.get("offset"), 0, 1_000_000, 0);
    const source = reqUrl.searchParams.get("source") || null;
    const cacheHit = reqUrl.searchParams.get("cacheHit");
    const force = reqUrl.searchParams.get("force");
    let query = "SELECT * FROM logs WHERE 1=1";
    const params: any[] = [];
    if (source) {
      query += " AND source = ?";
      params.push(source);
    }
    if (cacheHit === "true" || cacheHit === "false") {
      query += " AND cacheHit = ?";
      params.push(cacheHit === "true" ? 1 : 0);
    }
    if (force === "true" || force === "false") {
      query += " AND force = ?";
      params.push(force === "true" ? 1 : 0);
    }
    query += " ORDER BY ts DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    const rows = db.prepare(query).all(...params);
    sendJson(res, 200, { data: rows, limit, offset, count: rows.length });
    return;
  }

  // Static assets (ป้องกัน path traversal)
  const requestedPath =
    reqUrl.pathname === "/" ? "index.html" : reqUrl.pathname.replace(/^\/+/, "");
  const candidate = join(publicDir, requestedPath);
  if (!candidate.startsWith(publicDir)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }
  await serveStatic(candidate, res);
});

server.listen(CONFIG.port, () => {
  console.log(`Server running http://localhost:${CONFIG.port}`);
  startPrefetchLoop();
});

function startPrefetchLoop() {
  if (!CONFIG.prefetchBBoxes.length) return;
  console.log(
    `Prefetch enabled for ${CONFIG.prefetchBBoxes.length} areas every ${CONFIG.prefetchIntervalMs /
      3600000}h`
  );
  const run = async () => {
    for (const bbox of CONFIG.prefetchBBoxes) {
      try {
        await service.search({
          lat: bbox.lat,
          lon: bbox.lon,
          radius: bbox.radius,
          query: bbox.query || "restaurant",
        });
        console.log(
          `Prefetched ${bbox.lat},${bbox.lon} r=${bbox.radius} q=${bbox.query || "restaurant"}`
        );
      } catch (err) {
        console.warn("Prefetch failed", err);
      }
    }
  };
  run(); // initial
  setInterval(run, CONFIG.prefetchIntervalMs);
}

function clampInt(value: string | null, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}
