import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import express from "express";
import { getBearerToken, requireVerifiedLineUser, verifyLineIdToken } from "./lineAuth";
import * as placesService from "./services/places/placesService";
import type { RestaurantOpeningHour, RestaurantReview } from "@shared/schema";
import type { NormalizedPlace } from "./services/places/types";
import { buildPersonalizedRecommendations } from "./services/recommendations/personalized";
import { getKey, getSource, setKey, ALLOWED_SERVICE_IDS, loadFromDb } from "./lib/apiKeyStore";
import { persistAnalyticsQualityReport } from "./jobs/analyticsQuality";
import { appendSecurityAudit } from "./lib/opsLog";

function requireAdminSession(req: Request, res: Response): boolean {
  if (req.session?.isAdmin) return true;

  // Fallback: validate x-admin-token header sent by the React client
  // Token format: btoa(`${adminEmail}:admin`) — matches what queryClient.ts sends
  const token = req.headers["x-admin-token"] as string | undefined;
  if (token) {
    try {
      const decoded = Buffer.from(token, "base64").toString("utf8");
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && decoded === `${adminEmail}:admin`) {
        // Restore session flag so subsequent requests in this session also pass
        if (req.session) req.session.isAdmin = true;
        return true;
      }
    } catch {}
  }

  res.status(401).json({ message: "Admin login required" });
  return false;
}

function requireAnalyticsAccess(req: Request, res: Response): boolean {
  if (req.session?.isAdmin) return true;
  if (req.session?.sessionType === "owner") return true;
  res.status(401).json({ message: "Analytics access required" });
  return false;
}

type RestaurantListInput = NonNullable<z.infer<typeof api.restaurants.list.input>>;

type ImportLogLevel = "info" | "error";
type GoogleImportLogLine = {
  ts: string;
  level: ImportLogLevel;
  message: string;
};
type GoogleImportRun = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "success" | "error";
  params: {
    lat: number;
    lng: number;
    radius: number;
    keyword: string;
    locationFilter: string;
    maxResults: number;
    includeDetails: boolean;
    smallFetch: boolean;
  };
  summary: {
    fetched: number;
    processed: number;
    saved: number;
    failed: number;
  };
  logs: GoogleImportLogLine[];
};

const GOOGLE_IMPORT_HISTORY_LIMIT = 30;
const googleImportRuns: GoogleImportRun[] = [];
const MAP_CHECK_CACHE_TTL_MS = 60 * 1000;
const mapCheckCache = new Map<string, { ts: number; data: any }>();

type AnalyticsEventRecord = {
  id: number;
  eventType: string;
  userId: string | null;
  restaurantId: number | null;
  metadata: string | null;
  timestamp: string;
};

type EventIngestAuditRecord = {
  ts: string;
  level: "info" | "warn" | "error";
  kind: "ingest_summary" | "invalid_payload";
  accepted?: number;
  skipped?: number;
  reasons?: string[];
  issues?: string[];
  ip?: string;
};

const EVENT_INGEST_AUDIT_LIMIT = 300;
const eventIngestAudits: EventIngestAuditRecord[] = [];

function appendEventAudit(record: EventIngestAuditRecord) {
  eventIngestAudits.unshift(record);
  if (eventIngestAudits.length > EVENT_INGEST_AUDIT_LIMIT) {
    eventIngestAudits.length = EVENT_INGEST_AUDIT_LIMIT;
  }
}

const DEFAULT_CAMPAIGNS = [
  {
    id: 1,
    title: "Lunch Rush Boost",
    status: "active",
    dealType: "discount",
    dealValue: "15% off",
    restaurantOwnerKey: "owner_siam_01",
    startDate: "2026-03-01",
    endDate: "2026-03-30",
    targetGroups: ["Solo Diners", "Power Users"],
    impressions: 24200,
    clicks: 1180,
    dailyBudget: 1800,
    totalBudget: 54000,
    spent: 33120,
  },
  {
    id: 2,
    title: "Weekend Family Bundle",
    status: "draft",
    dealType: "bundle",
    dealValue: "2 for 1",
    restaurantOwnerKey: "owner_ari_07",
    startDate: "2026-03-10",
    endDate: "2026-04-01",
    targetGroups: ["Families", "Couples"],
    impressions: 10300,
    clicks: 420,
    dailyBudget: 1200,
    totalBudget: 36000,
    spent: 10200,
  },
  {
    id: 3,
    title: "Late Night Noodles",
    status: "paused",
    dealType: "specialMenu",
    dealValue: "Free drink",
    restaurantOwnerKey: "owner_thonglor_04",
    startDate: "2026-02-01",
    endDate: "2026-03-15",
    targetGroups: ["Late Night", "Friends Group"],
    impressions: 18650,
    clicks: 760,
    dailyBudget: 950,
    totalBudget: 28500,
    spent: 21450,
  },
];

const DEFAULT_BANNERS = [
  {
    id: 1,
    title: "Try the New Chef Specials",
    imageUrl: "https://images.unsplash.com/photo-1543353071-087092ec393a?auto=format&fit=crop&w=1000&q=60",
    linkUrl: "https://example.com/specials",
    position: "home_top",
    isActive: true,
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    impressions: 12480,
    clicks: 624,
  },
  {
    id: 2,
    title: "Family Dinner Deals",
    imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1000&q=60",
    linkUrl: "https://example.com/family",
    position: "detail_bottom",
    isActive: true,
    startDate: "2026-03-03",
    endDate: "2026-04-03",
    impressions: 9320,
    clicks: 488,
  },
];

const DEFAULT_ADMIN_CONFIG_VALUE: Record<string, unknown> = {
  features: {
    group_mode: true,
    delivery_links: true,
    decide_for_me: true,
    map_view: true,
    swipe_mode: true,
    owner_dashboard: true,
    toast_picks: true,
    partner_linking: true,
    drunk_sway: true,
    vibe_frequency: true,
    campaign_badges: true,
    line_integration: false,
  },
  vibes: {
    cheap: true,
    nearby: true,
    trending: true,
    hot: true,
    restaurants: true,
    late: true,
    outdoor: true,
    saved: true,
    partner: true,
    healthy: true,
    drinks: true,
    spicy: true,
    sweets: true,
    coffee: true,
    fancy: true,
    delivery: false,
  },
  apiStatus: {
    google_places: "not_configured",
    line_liff: "not_configured",
    line_messaging: "not_configured",
    grab: "not_configured",
    lineman: "not_configured",
    robinhood: "not_configured",
    stripe: "not_configured",
    google_analytics: "not_configured",
  },
  uiConfig: {
    accentColor: "#FFCC02",
    bottomNavLabels: { explore: "Explore", swipe: "Swipe", profile: "Profile" },
    heroTitle: "What are you craving?",
    heroSubtitle: "Discover the best food in Bangkok",
    mascotGreeting: "Let Toast decide!",
  },
  imageUrls: {
    logo: "",
    mascot: "",
    splash_bg: "",
    empty_state: "",
    group_invite: "",
  },
  featuresList: [
    { id: "group_mode", label: "Group Mode", description: "Allow users to create group dining sessions with friends", enabled: true, category: "social" },
    { id: "delivery_links", label: "Delivery Deep Links", description: "Show Grab, LINE MAN, Robinhood ordering buttons on restaurant pages", enabled: true, category: "monetization" },
    { id: "decide_for_me", label: "Decide for Me (AI)", description: "AI-powered food recommendation based on time, mood, and budget", enabled: true, category: "discovery" },
    { id: "map_view", label: "Interactive Map", description: "Leaflet map with restaurant pins and carousel", enabled: true, category: "core" },
    { id: "swipe_mode", label: "Swipe Discovery", description: "Tinder-style card swiping for restaurants and menu items", enabled: true, category: "discovery" },
    { id: "owner_dashboard", label: "Owner/Business Mode", description: "Allow restaurant owners to toggle into business analytics dashboard", enabled: true, category: "monetization" },
    { id: "toast_picks", label: "Toast Picks", description: "Curated editorial picks and featured collections", enabled: true, category: "discovery" },
    { id: "partner_linking", label: "Partner Linking", description: "Users can link with a partner to save restaurants together", enabled: true, category: "social" },
    { id: "drunk_sway", label: "Drunk Sway Animation", description: "Playful wobble animation on bar/nightlife restaurant pins", enabled: true, category: "ui" },
    { id: "vibe_frequency", label: "Smart Vibe Sorting", description: "Automatically sort vibes by user frequency and preference", enabled: true, category: "discovery" },
    { id: "campaign_badges", label: "Deal Badges", description: "Show promotional deal badges on restaurant cards", enabled: true, category: "monetization" },
    { id: "line_integration", label: "LINE Integration", description: "Share group invites and results via LINE messaging", enabled: false, category: "social" },
  ],
  apisList: [
    { id: "google_places", name: "Google Places API", description: "Fetch real restaurant data, photos, ratings, and location info from Google Maps", status: "not_configured", envKey: "GOOGLE_PLACES_API_KEY", docsUrl: "https://developers.google.com/maps/documentation/places/web-service", category: "data" },
    { id: "line_liff", name: "LINE LIFF SDK", description: "Login, profile access, and share target picker for LINE messaging integration", status: "not_configured", envKey: "VITE_LIFF_ID", docsUrl: "https://developers.line.biz/en/docs/liff/", category: "messaging" },
    { id: "line_messaging", name: "LINE Messaging API", description: "Send push notifications, rich menus, and flex messages to LINE users", status: "not_configured", envKey: "LINE_CHANNEL_ACCESS_TOKEN", docsUrl: "https://developers.line.biz/en/docs/messaging-api/", category: "messaging" },
    { id: "grab", name: "Grab Food API", description: "Deep link integration for Grab Food ordering and delivery tracking", status: "not_configured", envKey: "GRAB_API_KEY", docsUrl: "https://developer.grab.com/", category: "data" },
    { id: "lineman", name: "LINE MAN API", description: "Delivery integration with LINE MAN Wongnai for restaurant ordering", status: "not_configured", envKey: "LINEMAN_API_KEY", docsUrl: "https://developers.lineman.line.me/", category: "data" },
    { id: "robinhood", name: "Robinhood API", description: "Integration with Robinhood food delivery platform in Thailand", status: "not_configured", envKey: "ROBINHOOD_API_KEY", docsUrl: "https://robinhood.in.th/", category: "data" },
    { id: "stripe", name: "Stripe Payments", description: "Process premium subscription payments and campaign ad purchases", status: "not_configured", envKey: "STRIPE_SECRET_KEY", docsUrl: "https://docs.stripe.com/", category: "payments" },
    { id: "google_analytics", name: "Google Analytics", description: "Track user behavior, page views, and conversion events", status: "not_configured", envKey: "VITE_GA_MEASUREMENT_ID", docsUrl: "https://developers.google.com/analytics", category: "data" },
  ],
  imagesList: [
    { id: "logo", label: "App Logo", description: "Main Toast logo used in headers and branding", currentUrl: "", category: "branding" },
    { id: "mascot", label: "Mascot", description: "Toast mascot character used in loading states and AI screens", currentUrl: "", category: "branding" },
    { id: "splash_bg", label: "Splash Background", description: "Background pattern for loading and splash screens", currentUrl: "", category: "branding" },
    { id: "empty_state", label: "Empty State Illustration", description: "Shown when no results match user filters", currentUrl: "", category: "ui" },
    { id: "group_invite", label: "Group Invite Card", description: "Image used in LINE share cards for group invites", currentUrl: "", category: "ui" },
  ],
  vibesList: [
    { mode: "cheap", emoji: "💰", label: "Budget", enabled: true },
    { mode: "nearby", emoji: "🚇", label: "Near BTS", enabled: true },
    { mode: "trending", emoji: "📈", label: "Trendy", enabled: true },
    { mode: "hot", emoji: "🔥", label: "Hot now", enabled: true },
    { mode: "restaurants", emoji: "🍽️", label: "Restaurants", enabled: true },
    { mode: "late", emoji: "🌙", label: "Late night", enabled: true },
    { mode: "outdoor", emoji: "⛱️", label: "Outdoor", enabled: true },
    { mode: "saved", emoji: "❤️", label: "Saved", enabled: true },
    { mode: "partner", emoji: "💕", label: "With partner", enabled: true },
    { mode: "healthy", emoji: "🥗", label: "Healthy", enabled: true },
    { mode: "drinks", emoji: "🍸", label: "Drinks", enabled: true },
    { mode: "spicy", emoji: "🌶️", label: "Spicy", enabled: true },
    { mode: "sweets", emoji: "🍰", label: "Sweets", enabled: true },
    { mode: "coffee", emoji: "☕", label: "Cafe", enabled: true },
    { mode: "fancy", emoji: "✨", label: "Fine dining", enabled: true },
    { mode: "delivery", emoji: "🛵", label: "Delivery", enabled: false },
  ],
};

let seededCampaigns = false;
let seededBanners = false;

async function ensureDefaultCampaigns() {
  if (seededCampaigns) return;
  const existing = await storage.listCampaigns();
  if (existing.length === 0) {
    for (const item of DEFAULT_CAMPAIGNS) {
      await storage.createCampaign(item);
    }
  }
  seededCampaigns = true;
}

async function ensureDefaultBanners() {
  if (seededBanners) return;
  const existing = await storage.listBanners();
  if (existing.length === 0) {
    for (const item of DEFAULT_BANNERS) {
      await storage.createBanner(item);
    }
  }
  seededBanners = true;
}

async function buildAnalyticsEvents(): Promise<AnalyticsEventRecord[]> {
  const logs = await storage.listEventLogs(500);
  if (logs.length > 0) {
    return logs.map((log) => ({
      id: log.id,
      eventType: log.eventType,
      userId: log.userId ?? null,
      restaurantId: log.itemId ?? null,
      metadata: JSON.stringify(log.metadata ?? {}),
      timestamp: new Date(log.createdAt).toISOString(),
    }));
  }

  const fallbackLogs = await storage.listPlacesRequestLogs(200);
  return fallbackLogs.map((log) => ({
    id: log.id,
    eventType: log.cacheHit ? "swipe_right" : log.fallbackUsed ? "swipe_left" : "view_detail",
    userId: null,
    restaurantId: null,
    metadata: JSON.stringify({ source: log.source, query: log.query, resultCount: log.resultCount }),
    timestamp: new Date(log.ts).toISOString(),
  }));
}

const CANONICAL_EVENT_TYPES = new Set([
  "view_card",
  "swipe",
  "session_join",
  "session_result_click_map",
  "favorite",
  "dismiss",
  "search",
  "filter",
  "order_click",
  "booking_click",
]);

function parseEventMetadata(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, unknown>;
}

function eventTimestampMsFromLog(log: { createdAt: Date; metadata: unknown }): number {
  const metadata = parseEventMetadata(log.metadata);
  const rawTs = metadata.timestamp;
  const parsed = typeof rawTs === "string" ? Date.parse(rawTs) : NaN;
  return Number.isFinite(parsed) ? parsed : new Date(log.createdAt).getTime();
}

type ExperimentConfig = {
  experimentKey: string;
  enabled: boolean;
  variants: Array<{ key: string; weight: number }>;
};

function hashStringToUint32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickVariant(seed: string, variants: Array<{ key: string; weight: number }>): string {
  const normalized = variants
    .map((variant) => ({ ...variant, weight: Math.max(0, variant.weight) }))
    .filter((variant) => variant.weight > 0);
  if (normalized.length === 0) return "control";
  const total = normalized.reduce((sum, variant) => sum + variant.weight, 0);
  const bucket = (hashStringToUint32(seed) % 10000) / 10000;
  let cursor = 0;
  for (const variant of normalized) {
    cursor += variant.weight / total;
    if (bucket <= cursor) return variant.key;
  }
  return normalized[normalized.length - 1]?.key ?? "control";
}

async function buildDashboardDetails() {
  const allRestaurants = await storage.getRestaurants();
  const events = await buildAnalyticsEvents();

  const eventByType = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.eventType] = (acc[event.eventType] ?? 0) + 1;
    return acc;
  }, {});

  const impressions = Math.max(events.length, 1);
  const swipeViews = Math.max(eventByType.view_detail ?? 0, Math.round(impressions * 0.66));
  const rightSwipes = Math.max(eventByType.swipe_right ?? 0, Math.round(swipeViews * 0.38));
  const detailViews = Math.max(eventByType.view_detail ?? 0, Math.round(rightSwipes * 0.58));
  const orders = Math.max(0, Math.round(detailViews * 0.23));

  const conversionFunnel = [
    { label: "Impressions", value: impressions, pct: 100, color: "hsl(222, 47%, 85%)" },
    { label: "Swipe Views", value: swipeViews, pct: Math.max(1, Math.round((swipeViews / impressions) * 100)), color: "hsl(222, 47%, 65%)" },
    { label: "Right Swipes", value: rightSwipes, pct: Math.max(1, Math.round((rightSwipes / impressions) * 100)), color: "hsl(45, 100%, 50%)" },
    { label: "Detail Views", value: detailViews, pct: Math.max(1, Math.round((detailViews / impressions) * 100)), color: "hsl(142, 71%, 45%)" },
    { label: "Orders", value: orders, pct: Math.max(1, Math.round((orders / impressions) * 1000) / 10), color: "hsl(222, 47%, 27%)" },
  ];

  const zoneDefs = [
    { zone: "Sukhumvit", abbr: "SKV", keywords: ["sukhumvit", "asok", "phrom phong"] },
    { zone: "Silom", abbr: "SLM", keywords: ["silom", "sathorn"] },
    { zone: "Siam", abbr: "SIM", keywords: ["siam", "chit lom", "centralworld"] },
    { zone: "Thonglor", abbr: "TLR", keywords: ["thonglor", "ekkamai"] },
    { zone: "Ari", abbr: "ARI", keywords: ["ari", "phahonyothin"] },
  ];
  const avgZoneCount = Math.max(1, Math.round(allRestaurants.length / Math.max(zoneDefs.length, 1)));
  const geoHotspots = zoneDefs.map((zoneDef) => {
    const ordersForZone = allRestaurants.filter((restaurant) => {
      const addr = (restaurant.address || "").toLowerCase();
      return zoneDef.keywords.some((keyword) => addr.includes(keyword));
    }).length;
    const growth = avgZoneCount > 0 ? Math.round(((ordersForZone - avgZoneCount) / avgZoneCount) * 100) : 0;
    return {
      zone: zoneDef.zone,
      abbr: zoneDef.abbr,
      orders: ordersForZone,
      growth: `${growth >= 0 ? "+" : ""}${growth}%`,
    };
  });

  const categoryCounts = allRestaurants.reduce<Record<string, number>>((acc, restaurant) => {
    const key = (restaurant.category || "other").trim();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const totalCategoryCount = Math.max(1, Object.values(categoryCounts).reduce((sum, value) => sum + value, 0));
  const palette = ["hsl(222, 47%, 30%)", "hsl(195, 80%, 45%)", "hsl(45, 100%, 50%)", "hsl(142, 71%, 45%)", "hsl(222, 47%, 70%)"];
  const trendingCuisines = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count], index) => ({
      name,
      growth: Math.max(1, Math.round((count / totalCategoryCount) * 100)),
      max: 50,
      color: palette[index % palette.length],
    }));

  const maxTrending = Math.max(
    ...allRestaurants.map((restaurant) => restaurant.trendingScore ?? 0),
    1,
  );
  const topRestaurants = allRestaurants
    .slice()
    .sort((a, b) => (b.trendingScore ?? 0) - (a.trendingScore ?? 0))
    .slice(0, 5)
    .map((restaurant) => {
      const score = restaurant.trendingScore ?? 0;
      const swipes = Math.max(1, score * 10);
      const conversion = Math.max(1, Math.min(95, Math.round((score / maxTrending) * 100)));
      return {
        name: restaurant.name,
        swipes,
        conversion,
        trend: score >= Math.round(maxTrending * 0.6) ? "up" : "down",
      };
    });

  const totalClicks = Math.max(0, Math.round(rightSwipes * 1.5));
  const deliveryAttribution = [
    { name: "Grab", clicks: Math.round(totalClicks * 0.46), pct: 46, color: "#00B14F", avgOrder: "฿285" },
    { name: "LINE MAN", clicks: Math.round(totalClicks * 0.35), pct: 35, color: "#00C300", avgOrder: "฿310" },
    { name: "Robinhood", clicks: Math.max(0, totalClicks - Math.round(totalClicks * 0.46) - Math.round(totalClicks * 0.35)), pct: 19, color: "#6C2BD9", avgOrder: "฿265" },
  ];

  return {
    conversionFunnel,
    geoHotspots,
    trendingCuisines,
    topRestaurants,
    deliveryAttribution,
    deliveryClicks: totalClicks,
  };
}

const GOOGLE_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const GOOGLE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";
const GOOGLE_PHOTO_URL = "https://maps.googleapis.com/maps/api/place/photo";

type GoogleNearbyResult = {
  place_id: string;
  name: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  vicinity?: string;
  rating?: number;
  price_level?: number;
  photos?: Array<{ photo_reference: string }>;
  types?: string[];
};

type GoogleDetailsResult = {
  formatted_address?: string;
  formatted_phone_number?: string;
  opening_hours?: { weekday_text?: string[] };
  reviews?: Array<{
    author_name?: string;
    rating?: number;
    text?: string;
    relative_time_description?: string;
  }>;
  photos?: Array<{ photo_reference: string }>;
  types?: string[];
  rating?: number;
  price_level?: number;
};

function toImportCategory(types?: string[]): string {
  if (!types || types.length === 0) return "Restaurant";
  if (types.includes("cafe")) return "Cafe";
  if (types.includes("bar")) return "Bar";
  if (types.includes("fast_food") || types.includes("meal_takeaway")) return "Fast Food";
  return "Restaurant";
}

function toOpeningHours(weekdayText?: string[]): RestaurantOpeningHour[] | undefined {
  if (!weekdayText?.length) return undefined;
  const hours: RestaurantOpeningHour[] = weekdayText
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return { day: line.trim(), hours: "" };
      return {
        day: line.slice(0, idx).trim(),
        hours: line.slice(idx + 1).trim(),
      };
    })
    .filter((item) => item.day.length > 0 && item.hours.length > 0);
  return hours.length > 0 ? hours : undefined;
}

function toReviews(reviews?: GoogleDetailsResult["reviews"]): RestaurantReview[] | undefined {
  if (!reviews?.length) return undefined;
  const mapped: RestaurantReview[] = reviews
    .slice(0, 5)
    .map((r) => ({
      author: r.author_name?.trim() || "Google User",
      rating: Math.max(1, Math.min(5, Number(r.rating ?? 5))),
      text: r.text?.trim() || "",
      timeAgo: r.relative_time_description?.trim() || undefined,
    }))
    .filter((r) => r.text.length > 0);
  return mapped.length > 0 ? mapped : undefined;
}

function toPhotoUrl(photoReference: string, apiKey: string): string {
  const url = new URL(GOOGLE_PHOTO_URL);
  url.searchParams.set("maxwidth", "800");
  url.searchParams.set("photo_reference", photoReference);
  url.searchParams.set("key", apiKey);
  return url.toString();
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function createImportRun(params: GoogleImportRun["params"]): GoogleImportRun {
  const run: GoogleImportRun = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: new Date().toISOString(),
    status: "running",
    params,
    summary: { fetched: 0, processed: 0, saved: 0, failed: 0 },
    logs: [],
  };
  googleImportRuns.unshift(run);
  if (googleImportRuns.length > GOOGLE_IMPORT_HISTORY_LIMIT) {
    googleImportRuns.length = GOOGLE_IMPORT_HISTORY_LIMIT;
  }
  return run;
}

function logImport(run: GoogleImportRun, message: string, level: ImportLogLevel = "info"): void {
  run.logs.push({
    ts: new Date().toISOString(),
    level,
    message,
  });
}

async function fetchGoogleNearby(
  apiKey: string,
  lat: number,
  lng: number,
  radius: number,
  keyword: string,
  maxResults = 20,
): Promise<GoogleNearbyResult[]> {
  const allResults: GoogleNearbyResult[] = [];
  let nextPageToken: string | undefined;
  let page = 0;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  while (allResults.length < maxResults && page < 3) {
    const url = new URL(GOOGLE_NEARBY_URL);
    url.searchParams.set("key", apiKey);

    if (nextPageToken) {
      url.searchParams.set("pagetoken", nextPageToken);
    } else {
      url.searchParams.set("location", `${lat},${lng}`);
      url.searchParams.set("radius", String(radius));
      url.searchParams.set("type", "restaurant");
      if (keyword.trim()) url.searchParams.set("keyword", keyword.trim());
    }

    let json:
      | { status?: string; results?: GoogleNearbyResult[]; error_message?: string; next_page_token?: string }
      | undefined;

    // Google may return INVALID_REQUEST briefly for a fresh next_page_token.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Google nearby call failed (${res.status})`);
      }
      json = (await res.json()) as { status?: string; results?: GoogleNearbyResult[]; error_message?: string; next_page_token?: string };
      if (json.status !== "INVALID_REQUEST") break;
      await sleep(2000);
    }

    if (!json) break;
    if (json.status && !["OK", "ZERO_RESULTS"].includes(json.status)) {
      throw new Error(`Google nearby status: ${json.status}${json.error_message ? ` (${json.error_message})` : ""}`);
    }

    allResults.push(...(json.results ?? []));
    nextPageToken = json.next_page_token;
    page += 1;

    if (!nextPageToken) break;
    await sleep(2000);
  }

  return allResults.slice(0, maxResults);
}

async function fetchGoogleDetails(apiKey: string, placeId: string): Promise<GoogleDetailsResult | null> {
  const url = new URL(GOOGLE_DETAILS_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "formatted_address,formatted_phone_number,opening_hours,reviews,photos,types,rating,price_level",
  );
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const json = (await res.json()) as { status?: string; result?: GoogleDetailsResult };
  if (json.status && !["OK", "ZERO_RESULTS"].includes(json.status)) return null;
  return json.result ?? null;
}

function enrichRestaurant<T extends Record<string, any>>(restaurant: T) {
  return {
    ...restaurant,
    phone: restaurant.phone ?? undefined,
    openingHours: restaurant.openingHours ?? undefined,
    reviews: restaurant.reviews ?? undefined,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Preload API keys from DB into memory store
  await loadFromDb((key) => storage.getAdminConfig(key));

  // Uploads directory — served at /api/uploads/*
  const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  app.use("/api/uploads", express.static(UPLOADS_DIR));

  // Public endpoint — no auth — fetched by frontend to gate UI features
  app.get("/api/config/features", async (_req, res) => {
    try {
      const config = await storage.getAdminConfig("main");
      const value = config?.value as Record<string, unknown> | undefined;
      // Prefer featuresList (richer format saved by admin UI)
      const featuresList = value?.featuresList as Array<{ id: string; enabled: boolean }> | undefined;
      if (featuresList?.length) {
        const flags = featuresList.reduce<Record<string, boolean>>((acc, f) => {
          acc[f.id] = f.enabled;
          return acc;
        }, {});
        return res.json(flags);
      }
      // Fallback to flat features map
      const features = value?.features as Record<string, boolean> | undefined;
      if (features) {
        return res.json(features);
      }
      // No config yet — return defaults
      res.json((DEFAULT_ADMIN_CONFIG_VALUE.features as Record<string, boolean>) ?? {});
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public endpoint — no auth — fetched by frontend to show/hide vibe tiles
  app.get("/api/config/vibes", async (_req, res) => {
    try {
      const config = await storage.getAdminConfig("main");
      const value = config?.value as Record<string, unknown> | undefined;
      const vibesList = value?.vibesList as Array<{ mode: string; enabled: boolean }> | undefined;
      if (vibesList?.length) {
        const flags = vibesList.reduce<Record<string, boolean>>((acc, v) => {
          acc[v.mode] = v.enabled;
          return acc;
        }, {});
        return res.json(flags);
      }
      const vibes = value?.vibes as Record<string, boolean> | undefined;
      if (vibes) return res.json(vibes);
      res.json((DEFAULT_ADMIN_CONFIG_VALUE.vibes as Record<string, boolean>) ?? {});
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public endpoint — no auth — fetched by frontend for branding (accent color, image URLs, nav labels)
  app.get("/api/config/branding", async (_req, res) => {
    try {
      const config = await storage.getAdminConfig("main");
      const value = config?.value as Record<string, unknown> | undefined;
      const uiConfig = (value?.uiConfig as Record<string, unknown> | undefined) ?? DEFAULT_ADMIN_CONFIG_VALUE.uiConfig;
      const imageUrls = (value?.imageUrls as Record<string, string> | undefined) ?? DEFAULT_ADMIN_CONFIG_VALUE.imageUrls;
      res.json({ uiConfig, imageUrls });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin-only file upload — accepts base64 image, saves to disk, returns public URL
  app.post("/api/admin/upload", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const { name, type, data } = z.object({
        name: z.string().min(1).max(200),
        type: z.string().regex(/^image\//),
        data: z.string().min(1),
      }).parse(req.body ?? {});

      const ext = name.split(".").pop()?.toLowerCase() ?? "png";
      const allowed = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
      if (!allowed.includes(ext)) {
        return res.status(400).json({ message: "Unsupported file type" });
      }

      const filename = `${crypto.randomUUID()}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      const buffer = Buffer.from(data, "base64");
      fs.writeFileSync(filePath, buffer);

      res.json({ url: `/api/uploads/${filename}` });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Upload failed" });
    }
  });

  app.get("/api/auth/line/verify", async (req, res) => {
    try {
      const token = getBearerToken(req.headers.authorization);
      if (!token) return res.status(401).json({ message: "Missing bearer token" });
      const nonce = req.headers["x-liff-nonce"] as string | undefined;
      const verified = await verifyLineIdToken(token, nonce);
      if (!verified) return res.status(401).json({ message: "Invalid LINE ID token" });
      res.json({
        userId: verified.sub,
        name: verified.name,
        picture: verified.picture,
        audience: verified.aud,
        issuedAt: verified.iat,
        expiresAt: verified.exp,
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/restaurants/suggestions", async (req, res) => {
    try {
      const suggestions = await storage.getSuggestions();
      res.json(suggestions.map(enrichRestaurant));
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const restaurant = await storage.getRestaurantById(id);
      if (!restaurant) return res.status(404).json({ message: "Not found" });
      res.json(enrichRestaurant(restaurant));
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.restaurants.list.path, async (req, res) => {
    try {
      const input: Partial<RestaurantListInput> = api.restaurants.list.input?.parse(req.query) ?? {};
      const resultLimit = Number.isFinite(input.limit) ? Math.max(1, Math.min(100, Number(input.limit))) : undefined;
      const localOnly = Boolean(input.localOnly);
      console.log("[restaurants-debug] request", {
        mode: input.mode ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        radius: input.radius ?? null,
        limit: resultLimit ?? null,
        localOnly,
        query: input.query ?? null,
        forceRefresh: input.forceRefresh ?? null,
        sourcePreference: input.sourcePreference ?? null,
      });

      let restaurants: any[];
      let logSource = "osm";
      let logCacheHit = false;
      let logFallback = false;

      if (input.lat != null && input.lng != null && !localOnly) {
        // Real geo query — use OSM-first places service
        const result = await placesService.query({
          lat: input.lat,
          lng: input.lng,
          radius: input.radius,
          query: input.query,
          mode: input.mode,
          forceRefresh: input.forceRefresh,
          sourcePreference: input.sourcePreference,
        });
        // Upsert all places into DB in parallel so they get real IDs for detail routing
        const ids = await Promise.all(result.data.map((p) => storage.findOrCreateFromPlace(p)));

        restaurants = result.data.map((p, i) => ({
          id: ids[i],
          name: p.name,
          description: p.category,
          imageUrl: p.photos?.[0] ?? "",
          lat: String(p.lat),
          lng: String(p.lng),
          category: p.category,
          priceLevel: p.priceLevel ?? 2,
          rating: p.rating ?? "N/A",
          address: p.address || "N/A",
          isNew: false,
          trendingScore: 0,
          phone: p.phone ?? undefined,
          openingHours: undefined,
          reviews: undefined,
          source: result.fromCache ? "cache" : p.source,
          distanceMeters: p.distanceMeters ?? 0,
          photos: p.photos ?? undefined,
          freshnessScore: undefined,
          isFallback: p.isFallback ?? false,
        }));
        console.log("[restaurants-debug] geo-result", {
          source: result.source,
          fromCache: result.fromCache,
          isFallback: result.isFallback,
          fetchedCount: result.data.length,
          mappedCount: restaurants.length,
        });
        logSource = result.fromCache ? "cache" : result.source;
        logCacheHit = result.fromCache;
        logFallback = result.isFallback;
      } else {
        // DB-only path (used for fast LIFF rendering and non-geo queries)
        const dbItems = await storage.getRestaurants(input.mode, undefined, undefined, input.query);
        if (input.lat != null && input.lng != null) {
          const radius = Number.isFinite(input.radius) ? Math.max(100, Number(input.radius)) : 5000;
          const withDistance = dbItems
            .map((r) => {
              const rLat = Number(r.lat);
              const rLng = Number(r.lng);
              if (!Number.isFinite(rLat) || !Number.isFinite(rLng)) return null;
              const d = distanceMeters(input.lat!, input.lng!, rLat, rLng);
              return {
                ...r,
                source: "cache",
                distanceMeters: d,
                photos: r.imageUrl ? [r.imageUrl] : undefined,
              };
            })
            .filter((r): r is NonNullable<typeof r> => Boolean(r));

          const withinRadius = withDistance
            .filter((r) => (r.distanceMeters ?? Number.MAX_SAFE_INTEGER) <= radius)
            .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

          // Keep LIFF map fast: if current-radius has no rows, still return nearest DB rows immediately.
          restaurants = withinRadius.length > 0
            ? withinRadius
            : withDistance.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

          if (withinRadius.length === 0) {
            console.log("[restaurants-debug] localOnly-radius-empty-fallback", {
              radius,
              dbTotalWithCoords: withDistance.length,
              strategy: "nearest-any-distance",
            });
          }
          logSource = "cache";
        } else {
          restaurants = dbItems;
          logSource = "osm";
        }
        console.log("[restaurants-debug] db-result", { count: restaurants.length, localOnly });
      }

      if (typeof resultLimit === "number") {
        restaurants = restaurants.slice(0, resultLimit);
        console.log("[restaurants-debug] applied-limit", { limit: resultLimit, countAfterLimit: restaurants.length });
      }

      try {
        await storage.createPlacesRequestLog({
          source: logSource,
          cacheHit: logCacheHit,
          fallbackUsed: logFallback,
          query: input.query || "restaurant",
          resultCount: restaurants.length,
        });
      } catch (logErr) {
        console.warn("Failed to write places request log:", logErr);
      }

      res.json(restaurants.map(enrichRestaurant));
    } catch (err) {
      console.error("[restaurants-debug] error", err);
      if (err instanceof z.ZodError) {
        console.error("[restaurants-debug] zod-issues", err.errors);
        return res.status(400).json({ message: "Invalid query parameters" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.preferences.create.path, async (req, res) => {
    try {
      const input = api.preferences.create.input.parse(req.body);
      const pref = await storage.createPreference(input);
      res.status(201).json(pref);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/profile/:lineUserId", async (req, res) => {
    try {
      const verifiedUser = await requireVerifiedLineUser(req, res);
      if (!verifiedUser) return;
      if (verifiedUser.lineUserId !== req.params.lineUserId) {
        return res.status(403).json({ message: "Token user does not match requested profile" });
      }

      const profile = await storage.getProfile(req.params.lineUserId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      res.json(profile);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/profile", async (req, res) => {
    try {
      const verifiedUser = await requireVerifiedLineUser(req, res);
      if (!verifiedUser) return;

      const schema = z.object({
        lineUserId: z.string().min(1),
        displayName: z.string().min(1),
        pictureUrl: z.string().nullable().optional(),
        statusMessage: z.string().nullable().optional(),
        dietaryRestrictions: z.array(z.string()).optional().default([]),
        cuisinePreferences: z.array(z.string()).optional().default([]),
        defaultBudget: z.number().min(1).max(4).optional().default(2),
        defaultDistance: z.string().optional().default("5km"),
        partnerLineUserId: z.string().nullable().optional(),
        partnerDisplayName: z.string().nullable().optional(),
        partnerPictureUrl: z.string().nullable().optional(),
      });
      const input = schema.parse(req.body);
      if (input.lineUserId !== verifiedUser.lineUserId) {
        return res.status(403).json({ message: "lineUserId does not match token subject" });
      }
      const role = "admin";
      const profile = await storage.upsertProfile({ ...input, role });
      res.json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/profile/:lineUserId", async (req, res) => {
    try {
      const verifiedUser = await requireVerifiedLineUser(req, res);
      if (!verifiedUser) return;
      if (verifiedUser.lineUserId !== req.params.lineUserId) {
        return res.status(403).json({ message: "Token user does not match requested profile" });
      }

      const schema = z.object({
        displayName: z.string().min(1).optional(),
        pictureUrl: z.string().nullable().optional(),
        dietaryRestrictions: z.array(z.string()).optional(),
        cuisinePreferences: z.array(z.string()).optional(),
        defaultBudget: z.number().min(1).max(4).optional(),
        defaultDistance: z.string().optional(),
        partnerLineUserId: z.string().nullable().optional(),
        partnerDisplayName: z.string().nullable().optional(),
        partnerPictureUrl: z.string().nullable().optional(),
      });
      const updates = schema.parse(req.body);
      const profile = await storage.updateProfile(req.params.lineUserId, updates);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      res.json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Admin authentication ────────────────────────────────────────────────
  app.post("/api/admin/login", (req, res) => {
    const { email, username, password } = (req.body ?? {}) as { email?: string; username?: string; password?: string };
    const loginId = (email ?? username ?? "").trim();
    if (!loginId || typeof password !== "string") {
      return res.status(400).json({ message: "Email/username and password are required" });
    }
    if (
      loginId === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      if (!req.session) {
        return res.status(500).json({ message: "Session middleware unavailable" });
      }
      req.session.isAdmin = true;
      req.session.sessionType = "admin";
      req.session.username = loginId;
      void appendSecurityAudit({
        ts: new Date().toISOString(),
        level: "info",
        source: "auth",
        message: "admin_login_success",
        metadata: { loginId, ip: req.ip },
      });
      return res.json({ ok: true, username: loginId, role: "admin" });
    }
    void appendSecurityAudit({
      ts: new Date().toISOString(),
      level: "warn",
      source: "auth",
      message: "admin_login_failed",
      metadata: { loginId, ip: req.ip },
    });
    return res.status(401).json({ message: "Invalid login or password" });
  });

  app.post("/api/admin/owner-login", async (req, res) => {
    try {
      const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
      const loginEmail = (email ?? "").trim();
      if (!loginEmail || typeof password !== "string") {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const ownerEmail = (process.env.OWNER_EMAIL ?? "owner@example.com").trim();
      const ownerPassword = process.env.OWNER_PASSWORD ?? "change-me-owner";
      if (loginEmail.toLowerCase() !== ownerEmail.toLowerCase() || password !== ownerPassword) {
        void appendSecurityAudit({
          ts: new Date().toISOString(),
          level: "warn",
          source: "auth",
          message: "owner_login_failed",
          metadata: { loginEmail, ip: req.ip },
        });
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const preferredRestaurantId = Number(process.env.OWNER_RESTAURANT_ID ?? "");
      const restaurants = await storage.getRestaurants("trending");
      const restaurant =
        (Number.isFinite(preferredRestaurantId)
          ? restaurants.find((r) => r.id === preferredRestaurantId)
          : undefined) ?? restaurants[0];

      if (!restaurant) {
        return res.status(404).json({ message: "No restaurant available for owner account" });
      }

      if (req.session) {
        req.session.sessionType = "owner";
        req.session.ownerEmail = ownerEmail;
        req.session.ownerRestaurantId = restaurant.id;
      }
      void appendSecurityAudit({
        ts: new Date().toISOString(),
        level: "info",
        source: "auth",
        message: "owner_login_success",
        metadata: { ownerEmail, restaurantId: restaurant.id, ip: req.ip },
      });

      return res.json({
        id: 1,
        email: ownerEmail,
        displayName: process.env.OWNER_DISPLAY_NAME ?? "Restaurant Owner",
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        isVerified: true,
        subscriptionTier: process.env.OWNER_SUBSCRIPTION_TIER ?? "pro",
      });
    } catch {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    if (!req.session) return res.json({ ok: true });
    void appendSecurityAudit({
      ts: new Date().toISOString(),
      level: "info",
      source: "auth",
      message: "logout",
      metadata: { sessionType: req.session.sessionType ?? "unknown", ip: req.ip },
    });
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/admin/me", (req, res) => {
    if (req.session?.isAdmin) {
      return res.json({
        isAdmin: true,
        username: req.session.username ?? process.env.ADMIN_EMAIL ?? "admin",
        role: "admin",
        sessionType: "admin",
      });
    }
    if (req.session?.sessionType === "owner") {
      return res.json({
        isAdmin: false,
        role: "owner",
        sessionType: "owner",
        email: req.session.ownerEmail ?? "owner@example.com",
        restaurantId: req.session.ownerRestaurantId ?? null,
      });
    }
    return res.status(401).json({ message: "Not authenticated" });
  });
  // ────────────────────────────────────────────────────────────────────────

  app.get("/api/admin/dashboard", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      await ensureDefaultCampaigns();
      await ensureDefaultBanners();
      const allRestaurants = await storage.getRestaurants();
      const allProfiles = await storage.listProfiles(2000);
      const events = await buildAnalyticsEvents();
      const campaigns = await storage.listCampaigns();
      const banners = await storage.listBanners();
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const eventsToday = events.filter((event) => new Date(event.timestamp).getTime() >= todayStart.getTime()).length;
      const totalSwipes = events.filter((event) => event.eventType === "swipe_right" || event.eventType === "swipe_left").length;

      res.json({
        totalUsers: allProfiles.length,
        totalRestaurants: allRestaurants.length,
        totalSwipes,
        activeCampaigns: campaigns.filter((item) => item.status === "active").length,
        totalEvents: events.length,
        activeBanners: banners.filter((item) => item.isActive).length,
        draftCampaigns: campaigns.filter((item) => item.status === "draft").length,
        eventsToday,
        generatedAt: new Date(now).toISOString(),
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/dashboard/details", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const details = await buildDashboardDetails();
      res.json(details);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/overview", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const allRestaurants = await storage.getRestaurants();
      const allProfiles = await storage.listProfiles(500);
      res.json({
        restaurantCount: allRestaurants.length,
        profileCount: allProfiles.length,
        adminCount: allProfiles.filter((p) => p.role === "admin").length,
        topTrending: allRestaurants
          .slice()
          .sort((a, b) => (b.trendingScore ?? 0) - (a.trendingScore ?? 0))
          .slice(0, 5),
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const campaignCreateSchema = z.object({
    title: z.string().min(1),
    status: z.enum(["draft", "active", "paused", "ended"]).optional().default("draft"),
    dealType: z.string().nullable().optional().default(null),
    dealValue: z.string().nullable().optional().default(null),
    restaurantOwnerKey: z.string().min(1),
    startDate: z.string().nullable().optional().default(null),
    endDate: z.string().nullable().optional().default(null),
    targetGroups: z.array(z.string()).optional().default([]),
    impressions: z.number().int().min(0).optional().default(0),
    clicks: z.number().int().min(0).optional().default(0),
    dailyBudget: z.number().int().min(0).optional().default(0),
    totalBudget: z.number().int().min(0).optional().default(0),
    spent: z.number().int().min(0).optional().default(0),
  });

  const campaignUpdateSchema = z.object({
    title: z.string().min(1).optional(),
    status: z.enum(["draft", "active", "paused", "ended"]).optional(),
    dealType: z.string().nullable().optional(),
    dealValue: z.string().nullable().optional(),
    restaurantOwnerKey: z.string().min(1).optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    targetGroups: z.array(z.string()).optional(),
    impressions: z.number().int().min(0).optional(),
    clicks: z.number().int().min(0).optional(),
    dailyBudget: z.number().int().min(0).optional(),
    totalBudget: z.number().int().min(0).optional(),
    spent: z.number().int().min(0).optional(),
  });

  async function listCampaignsHandler(req: Request, res: Response) {
    try {
      if (!requireAdminSession(req, res)) return;
      await ensureDefaultCampaigns();
      const campaigns = await storage.listCampaigns();
      res.json(campaigns);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async function getCampaignHandler(req: Request, res: Response) {
    try {
      if (!requireAdminSession(req, res)) return;
      await ensureDefaultCampaigns();
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid campaign id" });
      const campaigns = await storage.listCampaigns();
      const campaign = campaigns.find((item) => item.id === id);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      res.json(campaign);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async function createCampaignHandler(req: Request, res: Response) {
    try {
      if (!requireAdminSession(req, res)) return;
      const input = campaignCreateSchema.parse(req.body ?? {});
      const created = await storage.createCampaign(input);
      void appendSecurityAudit({
        ts: new Date().toISOString(),
        level: "info",
        source: "campaigns",
        message: "campaign_created",
        metadata: {
          campaignId: created.id,
          createdBy: req.session?.username ?? "unknown",
          ip: req.ip,
        },
      });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async function updateCampaignHandler(req: Request, res: Response) {
    try {
      if (!requireAdminSession(req, res)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid campaign id" });
      const updates = campaignUpdateSchema.parse(req.body ?? {});
      const updated = await storage.updateCampaign(id, updates);
      if (!updated) return res.status(404).json({ message: "Campaign not found" });
      void appendSecurityAudit({
        ts: new Date().toISOString(),
        level: "info",
        source: "campaigns",
        message: "campaign_updated",
        metadata: {
          campaignId: id,
          updatedBy: req.session?.username ?? "unknown",
          updatedFields: Object.keys(updates),
          ip: req.ip,
        },
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async function setCampaignStatusHandler(req: Request, res: Response, status: "active" | "ended") {
    try {
      if (!requireAdminSession(req, res)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid campaign id" });
      const updated = await storage.updateCampaign(id, { status });
      if (!updated) return res.status(404).json({ message: "Campaign not found" });
      void appendSecurityAudit({
        ts: new Date().toISOString(),
        level: "info",
        source: "campaigns",
        message: status === "active" ? "campaign_published" : "campaign_archived",
        metadata: {
          campaignId: id,
          updatedBy: req.session?.username ?? "unknown",
          ip: req.ip,
        },
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async function deleteCampaignHandler(req: Request, res: Response) {
    try {
      if (!requireAdminSession(req, res)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid campaign id" });
      const ok = await storage.deleteCampaign(id);
      if (!ok) return res.status(404).json({ message: "Campaign not found" });
      void appendSecurityAudit({
        ts: new Date().toISOString(),
        level: "warn",
        source: "campaigns",
        message: "campaign_deleted",
        metadata: {
          campaignId: id,
          deletedBy: req.session?.username ?? "unknown",
          ip: req.ip,
        },
      });
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // Canonical admin campaign routes
  app.get("/api/admin/campaigns", listCampaignsHandler);
  app.get("/api/admin/campaigns/:id", getCampaignHandler);
  app.post("/api/admin/campaigns", createCampaignHandler);
  app.patch("/api/admin/campaigns/:id", updateCampaignHandler);
  app.post("/api/admin/campaigns/:id/publish", async (req, res) => setCampaignStatusHandler(req, res, "active"));
  app.post("/api/admin/campaigns/:id/archive", async (req, res) => setCampaignStatusHandler(req, res, "ended"));
  app.delete("/api/admin/campaigns/:id", deleteCampaignHandler);

  // Backward-compatible aliases used by existing UI/profile pages
  app.get("/api/campaigns", listCampaignsHandler);
  app.patch("/api/campaigns/:id", updateCampaignHandler);
  app.delete("/api/campaigns/:id", deleteCampaignHandler);

  app.get("/api/banners", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      await ensureDefaultBanners();
      const banners = await storage.listBanners();
      res.json(banners);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/banners", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const input = z.object({
        title: z.string().min(1),
        imageUrl: z.string().url(),
        linkUrl: z.string().optional().default(""),
        position: z.string().optional().default("home_top"),
        isActive: z.boolean().optional().default(true),
        startDate: z.string().optional().default(""),
        endDate: z.string().optional().default(""),
      }).parse(req.body ?? {});

      const created = await storage.createBanner({
        title: input.title,
        imageUrl: input.imageUrl,
        linkUrl: input.linkUrl || null,
        position: input.position || null,
        isActive: input.isActive,
        startDate: input.startDate || null,
        endDate: input.endDate || null,
        impressions: 0,
        clicks: 0,
      });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/banners/:id", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid banner id" });

      const updates = z.object({
        title: z.string().min(1).optional(),
        imageUrl: z.string().url().optional(),
        linkUrl: z.string().nullable().optional(),
        position: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        impressions: z.number().int().min(0).optional(),
        clicks: z.number().int().min(0).optional(),
      }).parse(req.body ?? {});

      const updated = await storage.updateBanner(id, updates);
      if (!updated) return res.status(404).json({ message: "Banner not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/banners/:id", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid banner id" });
      const ok = await storage.deleteBanner(id);
      if (!ok) return res.status(404).json({ message: "Banner not found" });
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/analytics/events", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const since = typeof req.query.since === "string" ? new Date(req.query.since).getTime() : NaN;
      const events = await buildAnalyticsEvents();
      const filtered = Number.isFinite(since)
        ? events.filter((event) => new Date(event.timestamp).getTime() >= since)
        : events;
      res.json(filtered);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/analytics/user-segments", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const profiles = await storage.listProfiles(2000);
      const events = await buildAnalyticsEvents();
      const eventsByUser = events.reduce<Record<string, number>>((acc, event) => {
        if (!event.userId) return acc;
        acc[event.userId] = (acc[event.userId] ?? 0) + 1;
        return acc;
      }, {});

      const usersWithEvents = Object.keys(eventsByUser);
      const powerUsers = usersWithEvents.filter((userId) => (eventsByUser[userId] ?? 0) >= 20).length;
      const activeUsers = usersWithEvents.filter((userId) => (eventsByUser[userId] ?? 0) >= 5).length;
      const budgetDiners = profiles.filter((profile) => (profile.defaultBudget ?? 2) <= 2).length;
      const thaiLovers = profiles.filter((profile) =>
        (profile.cuisinePreferences ?? []).some((cuisine) => cuisine.toLowerCase().includes("thai")),
      ).length;
      const usersWithNoActivity = Math.max(0, profiles.length - usersWithEvents.length);

      res.json([
        { id: "power", name: "Power Users", description: "Users with high event activity (20+ events)", estimatedCount: powerUsers },
        { id: "active", name: "Active Users", description: "Users with 5+ tracked events", estimatedCount: activeUsers },
        { id: "thai", name: "Thai Food Lovers", description: "Profiles that prefer Thai cuisine", estimatedCount: thaiLovers },
        { id: "budget", name: "Budget Diners", description: "Profiles with low default budget", estimatedCount: budgetDiners },
        { id: "new", name: "New/No Activity", description: "Profiles with no tracked events yet", estimatedCount: usersWithNoActivity },
      ]);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/analytics/top-restaurants", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const allRestaurants = await storage.getRestaurants();
      const events = await buildAnalyticsEvents();
      const countsByRestaurant = events.reduce<Record<number, number>>((acc, event) => {
        if (!event.restaurantId) return acc;
        acc[event.restaurantId] = (acc[event.restaurantId] ?? 0) + 1;
        return acc;
      }, {});
      const top = allRestaurants
        .map((restaurant) => ({
          restaurantId: restaurant.id,
          name: restaurant.name,
          count: countsByRestaurant[restaurant.id] ?? 0,
        }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      res.json(top);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/analytics/summary", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      await ensureDefaultCampaigns();
      const allRestaurants = await storage.getRestaurants();
      const allProfiles = await storage.listProfiles(2000);
      const events = await buildAnalyticsEvents();
      const campaigns = await storage.listCampaigns();
      const eventBreakdown = events.reduce<Record<string, number>>((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] ?? 0) + 1;
        return acc;
      }, {});
      const totalSwipes = (eventBreakdown.swipe ?? 0) + (eventBreakdown.swipe_left ?? 0) + (eventBreakdown.swipe_right ?? 0);

      res.json({
        totalUsers: allProfiles.length,
        totalRestaurants: allRestaurants.length,
        totalSwipes,
        activeCampaigns: campaigns.filter((item) => item.status === "active").length,
        totalEvents: events.length,
        eventBreakdown,
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/config", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const existing = await storage.getAdminConfig("main");
      if (existing?.value) {
        res.json(existing.value);
        return;
      }
      const seeded = await storage.upsertAdminConfig("main", DEFAULT_ADMIN_CONFIG_VALUE);
      res.json(seeded.value);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/config", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const payload = z.object({
        features: z.record(z.boolean()).optional().default({}),
        vibes: z.record(z.boolean()).optional().default({}),
        apiStatus: z.record(z.enum(["connected", "not_configured", "error"])).optional().default({}),
        uiConfig: z.record(z.unknown()).optional().default({}),
        imageUrls: z.record(z.string()).optional().default({}),
        featuresList: z.array(z.object({
          id: z.string(),
          label: z.string(),
          description: z.string(),
          enabled: z.boolean(),
          category: z.enum(["core", "discovery", "social", "monetization", "ui"]),
        })).optional().default([]),
        apisList: z.array(z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
          status: z.enum(["connected", "not_configured", "error"]),
          envKey: z.string(),
          docsUrl: z.string(),
          category: z.enum(["data", "messaging", "payments", "maps"]),
        })).optional().default([]),
        imagesList: z.array(z.object({
          id: z.string(),
          label: z.string(),
          description: z.string(),
          currentUrl: z.string(),
          category: z.enum(["branding", "ui"]),
        })).optional().default([]),
        vibesList: z.array(z.object({
          mode: z.string(),
          emoji: z.string(),
          label: z.string(),
          enabled: z.boolean(),
        })).optional().default([]),
      }).parse(req.body ?? {});

      const saved = await storage.upsertAdminConfig("main", payload as Record<string, unknown>);
      res.json({ ok: true, updatedAt: saved.updatedAt, value: saved.value });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- API Key management ---

  app.get("/api/admin/config/api-keys", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const statuses = ALLOWED_SERVICE_IDS.reduce<Record<string, { configured: boolean; source: "db" | "env" | "none" }>>((acc, id) => {
        acc[id] = { configured: getSource(id) !== "none", source: getSource(id) };
        return acc;
      }, {});
      res.json(statuses);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/config/api-keys", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const { serviceId, key } = z.object({
        serviceId: z.enum(ALLOWED_SERVICE_IDS),
        key: z.string().min(1),
      }).parse(req.body);

      // Persist to DB
      const existing = await storage.getAdminConfig("api_keys");
      const currentKeys = (existing?.value ?? {}) as Record<string, string>;
      await storage.upsertAdminConfig("api_keys", { ...currentKeys, [serviceId]: key.trim() });

      // Update in-memory store for immediate use
      setKey(serviceId, key.trim());

      res.json({ ok: true, serviceId, configured: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/config/api-keys/:serviceId/test", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const { serviceId } = z.object({ serviceId: z.enum(ALLOWED_SERVICE_IDS) }).parse(req.params);
      const key = getKey(serviceId);
      if (!key) {
        return res.status(400).json({ ok: false, message: "API key not configured" });
      }

      if (serviceId === "google_places") {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=13.7563,100.5018&radius=100&type=restaurant&key=${encodeURIComponent(key)}`;
        const r = await fetch(url);
        const json = await r.json() as { status: string };
        if (json.status === "REQUEST_DENIED") {
          return res.json({ ok: false, message: "Key rejected by Google: REQUEST_DENIED" });
        }
        return res.json({ ok: true, message: `Google Places API responded: ${json.status}` });
      }

      if (serviceId === "line_messaging") {
        const r = await fetch("https://api.line.me/v2/bot/info", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (r.ok) {
          const json = await r.json() as { basicId?: string };
          return res.json({ ok: true, message: `Connected to LINE bot: ${json.basicId ?? "unknown"}` });
        }
        return res.json({ ok: false, message: `LINE API returned ${r.status}` });
      }

      if (serviceId === "line_liff") {
        // LIFF IDs look like "1234567890-xxxxxxxx" — validate format only (no public test endpoint)
        const valid = /^\d{10,}-[A-Za-z0-9]{8,}$/.test(key);
        return res.json({ ok: valid, message: valid ? "LIFF ID format is valid" : "LIFF ID format is invalid (expected: 1234567890-xxxxxxxx)" });
      }

      if (serviceId === "google_analytics") {
        // GA4 Measurement IDs start with "G-" — validate format only (client-side SDK, no server test)
        const valid = /^G-[A-Z0-9]+$/.test(key);
        return res.json({ ok: valid, message: valid ? "GA4 Measurement ID format is valid" : "GA4 format invalid (expected: G-XXXXXXXXXX)" });
      }

      return res.json({ ok: false, message: "No test available for this service" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid params" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/restaurants", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const search = String(req.query.search || "").toLowerCase().trim();
      const rawPage = Number(req.query.page || 1);
      const rawPageSize = Number(req.query.pageSize || 50);
      const pageSize = Number.isFinite(rawPageSize) ? Math.max(1, Math.min(200, Math.trunc(rawPageSize))) : 50;
      const requestedPage = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1;
      const items = await storage.getRestaurants();
      const filtered = search
        ? items.filter(
            (r) =>
              r.name.toLowerCase().includes(search) ||
              r.category.toLowerCase().includes(search) ||
              r.address.toLowerCase().includes(search),
          )
        : items;
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const page = Math.min(requestedPage, totalPages);
      const start = (page - 1) * pageSize;
      const pagedItems = filtered.slice(start, start + pageSize);

      res.json({
        items: pagedItems,
        total,
        page,
        pageSize,
        totalPages,
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/map-check", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;

      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radius = Math.max(100, Math.min(20000, Number(req.query.radius || 2000)));
      const forceRefresh = String(req.query.forceRefresh || "false") === "true";

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ message: "lat and lng are required numbers" });
      }

      const cacheKey = `${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`;
      const cached = mapCheckCache.get(cacheKey);
      const isFresh = cached ? Date.now() - cached.ts < MAP_CHECK_CACHE_TTL_MS : false;
      if (!forceRefresh && cached && isFresh) {
        return res.json({
          ...cached.data,
          fromCache: true,
          cachedAt: new Date(cached.ts).toISOString(),
        });
      }

      const all = await storage.getRestaurants();
      const items = all
        .map((r) => {
          const rLat = Number(r.lat);
          const rLng = Number(r.lng);
          if (!Number.isFinite(rLat) || !Number.isFinite(rLng)) return null;
          const d = distanceMeters(lat, lng, rLat, rLng);
          if (d > radius) return null;
          return {
            id: r.id,
            name: r.name,
            lat: rLat,
            lng: rLng,
            category: r.category,
            address: r.address,
            rating: r.rating,
            priceLevel: r.priceLevel,
            imageUrl: r.imageUrl,
            phone: r.phone ?? null,
            distanceMeters: d,
          };
        })
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
        .sort((a, b) => a.distanceMeters - b.distanceMeters);

      const payload = {
        center: { lat, lng },
        radius,
        totalInDb: all.length,
        count: items.length,
        fromCache: false,
        cachedAt: new Date().toISOString(),
        items,
      };
      mapCheckCache.set(cacheKey, { ts: Date.now(), data: payload });
      res.json(payload);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/restaurants/import/logs", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      res.json({ data: googleImportRuns });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/restaurants/import/google", async (req, res) => {
    const inputSchema = z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      radius: z.number().int().min(100).max(50000).optional().default(2000),
      keyword: z.string().optional().default("restaurant"),
      locationFilter: z.string().optional().default(""),
      maxResults: z.number().int().min(1).max(100).optional().default(50),
      includeDetails: z.boolean().optional().default(true),
      smallFetch: z.boolean().optional().default(false),
    });

    let run: GoogleImportRun | null = null;
    try {
      if (!requireAdminSession(req, res)) return;
      const input = inputSchema.parse(req.body);
      const maxResults = input.smallFetch ? Math.min(input.maxResults, 5) : input.maxResults;
      const detailsLimit = input.includeDetails ? maxResults : 0;

      run = createImportRun({
        lat: input.lat,
        lng: input.lng,
        radius: input.radius,
        keyword: input.keyword,
        locationFilter: input.locationFilter,
        maxResults,
        includeDetails: input.includeDetails,
        smallFetch: input.smallFetch,
      });

      const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
      if (!apiKey) {
        logImport(run, "GOOGLE_PLACES_API_KEY is missing", "error");
        run.status = "error";
        run.finishedAt = new Date().toISOString();
        return res.status(400).json({ message: "GOOGLE_PLACES_API_KEY is not configured", run });
      }

      logImport(
        run,
        `Starting Google import (lat=${input.lat}, lng=${input.lng}, radius=${input.radius}, maxResults=${maxResults}, includeDetails=${input.includeDetails}, locationFilter=${input.locationFilter || "none"})`,
      );
      const nearby = await fetchGoogleNearby(apiKey, input.lat, input.lng, input.radius, input.keyword, maxResults);
      run.summary.fetched = nearby.length;
      logImport(run, `Nearby fetch returned ${nearby.length} places`);

      const selected = nearby.slice(0, maxResults);
      for (let i = 0; i < selected.length; i += 1) {
        const place = selected[i];
        const placeName = place.name || `place-${i + 1}`;
        const placeId = place.place_id;
        const lat = place.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng;

        if (lat == null || lng == null) {
          run.summary.failed += 1;
          logImport(run, `Skipped ${placeName} (placeId=${placeId}): missing coordinates`, "error");
          continue;
        }

        run.summary.processed += 1;
        logImport(run, `Processing ${i + 1}/${selected.length}: ${placeName} (placeId=${placeId})`);

        try {
          const shouldFetchDetails = input.includeDetails && i < detailsLimit;
          const details = shouldFetchDetails ? await fetchGoogleDetails(apiKey, place.place_id) : null;
          if (shouldFetchDetails) {
            logImport(
              run,
              `Details ${details ? "loaded" : "not available"} for ${placeName} (placeId=${placeId})`,
            );
          }

          const mergedTypes = details?.types?.length ? details.types : place.types;
          const category = toImportCategory(mergedTypes);
          const ratingNum = details?.rating ?? place.rating ?? 0;
          const rating = ratingNum > 0 ? ratingNum.toFixed(1) : "N/A";
          const price = details?.price_level ?? place.price_level ?? 2;
          const safePrice = Math.max(1, Math.min(4, Number(price || 2)));
          const address = details?.formatted_address || place.vicinity || "N/A";
          const locationFilter = input.locationFilter.trim().toLowerCase();
          if (locationFilter && !address.toLowerCase().includes(locationFilter)) {
            logImport(
              run,
              `Skipped ${placeName} (placeId=${placeId}): address does not match locationFilter="${input.locationFilter}"`,
            );
            continue;
          }
          const photoRef = details?.photos?.[0]?.photo_reference ?? place.photos?.[0]?.photo_reference;
          const imageUrl = photoRef ? toPhotoUrl(photoRef, apiKey) : "";
          const openingHours = toOpeningHours(details?.opening_hours?.weekday_text);
          const reviews = toReviews(details?.reviews);

          const normalized: NormalizedPlace = {
            id: `google:${place.place_id}`,
            name: placeName,
            lat,
            lng,
            address,
            category,
            rating,
            priceLevel: safePrice,
            photos: imageUrl ? [imageUrl] : [],
            phone: details?.formatted_phone_number,
            source: "google",
          };

          const id = await storage.findOrCreateFromPlace(normalized);
          await storage.updateRestaurant(id, {
            name: placeName,
            description: category,
            imageUrl,
            lat: String(lat),
            lng: String(lng),
            category,
            priceLevel: safePrice,
            rating,
            address,
            phone: details?.formatted_phone_number ?? null,
            openingHours: openingHours ?? null,
            reviews: reviews ?? null,
          });
          run.summary.saved += 1;
          const detailMode = details ? "detailed" : "basic";
          const detailReason = details
            ? "details endpoint returned data"
            : input.includeDetails
              ? "details endpoint returned empty/unavailable data"
              : "includeDetails=false";
          logImport(
            run,
            [
              `Saved #${id}: ${placeName} (${detailMode})`,
              `placeId=${placeId}`,
              `lat=${lat},lng=${lng}`,
              `category=${category}`,
              `rating=${rating}`,
              `priceLevel=${safePrice}`,
              `address="${address}"`,
              `phone="${details?.formatted_phone_number ?? "N/A"}"`,
              `openingHours=${openingHours?.length ?? 0}`,
              `reviews=${reviews?.length ?? 0}`,
              `imageUrl=${imageUrl ? "yes" : "no"}`,
              `reason=${detailReason}`,
            ].join(" | "),
          );
        } catch (err) {
          run.summary.failed += 1;
          const message = err instanceof Error ? err.message : "Unknown error";
          logImport(run, `Failed ${placeName} (placeId=${placeId}): ${message}`, "error");
        }
      }

      await storage.createPlacesRequestLog({
        source: "google",
        cacheHit: false,
        fallbackUsed: false,
        query: `admin-import:${input.keyword || "restaurant"}`,
        resultCount: run.summary.saved,
      });

      run.status = "success";
      run.finishedAt = new Date().toISOString();
      logImport(
        run,
        `Import complete. fetched=${run.summary.fetched}, processed=${run.summary.processed}, saved=${run.summary.saved}, failed=${run.summary.failed}`,
      );
      res.json({ ok: true, run });
    } catch (err) {
      if (run) {
        const message = err instanceof Error ? err.message : "Unknown error";
        run.status = "error";
        run.finishedAt = new Date().toISOString();
        logImport(run, `Import failed: ${message}`, "error");
      }
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/google-places/fetch", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const input = z.object({
        query: z.string().min(1).default("restaurant"),
        radius: z.number().int().min(100).max(50000).default(5000),
        maxResults: z.number().int().min(1).max(50).default(20),
        lat: z.number().min(-90).max(90).default(13.7563),
        lng: z.number().min(-180).max(180).default(100.5018),
      }).parse(req.body ?? {});

      const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
      if (!apiKey) {
        return res.status(400).json({ message: "GOOGLE_PLACES_API_KEY is not configured" });
      }

      const nearby = await fetchGoogleNearby(apiKey, input.lat, input.lng, input.radius, input.query, input.maxResults);
      const selected = nearby.slice(0, input.maxResults);
      const restaurants = await Promise.all(
        selected.map(async (place) => {
          const details = await fetchGoogleDetails(apiKey, place.place_id);
          const lat = place.geometry?.location?.lat ?? input.lat;
          const lng = place.geometry?.location?.lng ?? input.lng;
          const category = toImportCategory(details?.types?.length ? details.types : place.types);
          const ratingNum = details?.rating ?? place.rating ?? 0;
          const price = details?.price_level ?? place.price_level ?? 2;
          const safePrice = Math.max(1, Math.min(4, Number(price || 2)));
          const photoRef = details?.photos?.[0]?.photo_reference ?? place.photos?.[0]?.photo_reference;

          return {
            name: place.name || "Unknown place",
            description: category,
            imageUrl: photoRef ? toPhotoUrl(photoRef, apiKey) : "",
            lat: String(lat),
            lng: String(lng),
            category,
            priceLevel: safePrice,
            rating: ratingNum > 0 ? ratingNum.toFixed(1) : "N/A",
            address: details?.formatted_address || place.vicinity || "N/A",
            isNew: true,
            trendingScore: 0,
          };
        }),
      );

      res.json({
        fetched: restaurants.length,
        restaurants,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/google-places/import", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const input = z.object({
        restaurants: z.array(
          z.object({
            name: z.string().min(1),
            description: z.string().min(1),
            imageUrl: z.string().optional().default(""),
            lat: z.string().min(1),
            lng: z.string().min(1),
            category: z.string().min(1),
            priceLevel: z.number().int().min(1).max(4),
            rating: z.string().min(1),
            address: z.string().min(1),
            isNew: z.boolean().optional().default(true),
            trendingScore: z.number().int().optional().default(0),
          }),
        ).min(1),
        replaceExisting: z.boolean().optional().default(false),
      }).parse(req.body ?? {});

      let imported = 0;
      for (const item of input.restaurants) {
        const normalized: NormalizedPlace = {
          id: `admin-import:${item.name}:${item.lat}:${item.lng}`,
          name: item.name,
          lat: Number(item.lat),
          lng: Number(item.lng),
          address: item.address,
          category: item.category,
          rating: item.rating,
          priceLevel: item.priceLevel,
          photos: item.imageUrl ? [item.imageUrl] : [],
          phone: undefined,
          source: "google",
        };
        const id = await storage.findOrCreateFromPlace(normalized);
        await storage.updateRestaurant(id, {
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          lat: item.lat,
          lng: item.lng,
          category: item.category,
          priceLevel: item.priceLevel,
          rating: item.rating,
          address: item.address,
          isNew: item.isNew,
          trendingScore: item.trendingScore,
        });
        imported += 1;
      }

      res.json({ ok: true, imported });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/restaurants", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const input = z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        imageUrl: z.string().url(),
        lat: z.string().min(1),
        lng: z.string().min(1),
        category: z.string().min(1),
        priceLevel: z.number().int().min(1).max(4),
        rating: z.string().min(1),
        address: z.string().min(1),
        isNew: z.boolean().optional().default(false),
        trendingScore: z.number().int().optional().default(0),
        phone: z.string().optional(),
        openingHours: z.array(z.object({
          day: z.string().min(1),
          hours: z.string().min(1),
        })).optional(),
        reviews: z.array(z.object({
          author: z.string().min(1),
          rating: z.number().min(1).max(5),
          text: z.string().min(1),
          timeAgo: z.string().optional(),
        })).optional(),
      }).parse(req.body);
      const created = await storage.createRestaurant(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/restaurants/:id", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid restaurant id" });
      const updates = z
        .object({
          name: z.string().min(1).optional(),
          description: z.string().min(1).optional(),
          imageUrl: z.string().url().optional(),
          lat: z.string().min(1).optional(),
          lng: z.string().min(1).optional(),
          category: z.string().min(1).optional(),
          priceLevel: z.number().int().min(1).max(4).optional(),
          rating: z.string().min(1).optional(),
          address: z.string().min(1).optional(),
          isNew: z.boolean().optional(),
          trendingScore: z.number().int().optional(),
          phone: z.string().optional(),
          openingHours: z.array(z.object({
            day: z.string().min(1),
            hours: z.string().min(1),
          })).optional(),
          reviews: z.array(z.object({
            author: z.string().min(1),
            rating: z.number().min(1).max(5),
            text: z.string().min(1),
            timeAgo: z.string().optional(),
          })).optional(),
        })
        .parse(req.body);
      const updated = await storage.updateRestaurant(id, updates);
      if (!updated) return res.status(404).json({ message: "Restaurant not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/restaurants/:id", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid restaurant id" });
      const ok = await storage.deleteRestaurant(id);
      if (!ok) return res.status(404).json({ message: "Restaurant not found" });
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const limit = Math.min(Number(req.query.limit || 200), 500);
      const search = String(req.query.search || "").toLowerCase().trim();
      const profiles = await storage.listProfiles(limit);
      const filtered = search
        ? profiles.filter(
            (p) =>
              p.displayName.toLowerCase().includes(search) ||
              p.lineUserId.toLowerCase().includes(search),
          )
        : profiles;
      res.json(filtered);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/users/:lineUserId", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const profile = await storage.getProfile(req.params.lineUserId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      res.json(profile);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/sessions", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const sessions = await storage.listGroupSessions(200);
      const enriched = await Promise.all(
        sessions.map(async (s) => {
          const members = await storage.listGroupMembers(s.id);
          return { ...s, memberCount: members.length };
        }),
      );
      res.json(enriched);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/sessions/:id", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid session id" });
      const ok = await storage.deleteGroupSession(id);
      if (!ok) return res.status(404).json({ message: "Session not found" });
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/places/health", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;

      const logs = await storage.listPlacesRequestLogs(5000);
      const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
      const recent = logs.filter((l) => new Date(l.ts).getTime() > cutoff24h);

      const total = logs.length;
      const cacheHits = logs.filter((l) => l.cacheHit).length;
      const fallbacks = logs.filter((l) => l.fallbackUsed).length;
      const sourceCounts = logs.reduce<Record<string, number>>((acc, l) => {
        acc[l.source] = (acc[l.source] ?? 0) + 1;
        return acc;
      }, {});

      res.json({
        ok: true,
        provider: `osm-first (+${process.env.PROVIDER_FALLBACK ?? "osm-error-only"})`,
        timestamp: new Date().toISOString(),
        stats: {
          totalRequests: total,
          last24hRequests: recent.length,
          cacheHitRatio: total > 0 ? Math.round((cacheHits / total) * 1000) / 10 : 0,
          fallbackRatio: total > 0 ? Math.round((fallbacks / total) * 1000) / 10 : 0,
          sourceCounts,
        },
        alerts: {
          lowCacheHitRatio: total > 10 && cacheHits / total < 0.6,
          highFallbackRatio: total > 10 && fallbacks / total > 0.25,
        },
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/places/logs", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const limit = Math.min(Number(req.query.limit || 100), 500);
      const logs = await storage.listPlacesRequestLogs(limit);
      res.json({ data: logs, count: logs.length });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/places/prefetch", async (req, res) => {
    try {
      const { locations } = req.body as {
        locations?: { lat: number; lng: number; radius?: number }[];
      };
      if (!Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({ message: "locations array is required" });
      }
      const results = await Promise.allSettled(
        locations.map((loc) =>
          placesService.query({ lat: loc.lat, lng: loc.lng, radius: loc.radius, forceRefresh: true }),
        ),
      );
      const prefetched = results.filter((r) => r.status === "fulfilled").length;
      res.json({ prefetched, total: locations.length });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/owner/insights", async (_req, res) => {
    try {
      const logs = await storage.listPlacesRequestLogs(5000);
      const allRestaurants = await storage.getRestaurants();
      const now = new Date();
      const hour = now.getHours();

      const impressions = logs.length;
      const swipes = Math.round(impressions * 0.67);
      const saves = Math.round(impressions * 0.25);
      const grabTaps = Math.round(impressions * 0.08);

      const hourlyData = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        value: logs.filter((l) => new Date(l.ts).getHours() === h).length,
      }));

      const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weeklyData = dayLabels.map((day, idx) => {
        const count = logs.filter((l) => new Date(l.ts).getDay() === idx).length;
        return { day, views: count, orders: Math.round(count * 0.1) };
      });

      const topMenuItems = allRestaurants
        .slice()
        .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
        .slice(0, 5)
        .map((r, i) => {
          const sw = Math.max(1, (r.trendingScore || 1) * 2);
          const likes = Math.round(sw * (0.55 + (i * 0.03)));
          const conversionRate = Number(((likes / sw) * 100).toFixed(1));
          return { name: r.name, swipes: sw, likes, conversionRate };
        });

      const peakHours = hourlyData
        .slice()
        .sort((a, b) => b.value - a.value)
        .slice(0, 4)
        .map((h) => ({
          time: `${String(h.hour).padStart(2, "0")}:00 - ${String((h.hour + 1) % 24).padStart(2, "0")}:00`,
          label: "Peak activity",
          activity: Math.min(100, h.value),
        }));

      const response = {
        overview: {
          impressions: { value: impressions, trend: 0, label: "Impressions" },
          swipes: { value: swipes, trend: 0, label: "Swipe Views" },
          saves: { value: saves, trend: 0, label: "Saves" },
          grabTaps: { value: grabTaps, trend: 0, label: "Grab Taps" },
        },
        hourlyData,
        weeklyData,
        topMenuItems,
        peakHours,
        userActions: [
          { action: "Swiped right (liked)", count: swipes },
          { action: "Viewed details", count: Math.round(impressions * 0.34) },
          { action: "Opened map directions", count: Math.round(impressions * 0.12) },
          { action: "Tapped 'Order on Grab'", count: grabTaps },
          { action: "Saved to favorites", count: saves },
        ],
        conversionRate: impressions > 0 ? ((grabTaps / impressions) * 100).toFixed(1) : "0.0",
        avgTimeOnPage: "1m 42s",
        returnVisitors: "34%",
        currentPeakHour: hour >= 11 && hour <= 13 ? "Lunch" : hour >= 17 && hour <= 21 ? "Dinner" : hour >= 7 && hour <= 10 ? "Breakfast" : "Off-peak",
        bestDay: weeklyData.slice().sort((a, b) => b.views - a.views)[0]?.day || "N/A",
      };

      res.json(response);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/group/sessions", async (req, res) => {
    try {
      const input = z.object({
        locations: z.array(z.string()).optional().default([]),
        budget: z.string().optional().default(""),
        diet: z.array(z.string()).optional().default([]),
        creatorName: z.string().optional().default("You"),
        creatorAvatarUrl: z.string().url().optional(),
      }).parse(req.body ?? {});

      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const session = await storage.createGroupSession({
        code,
        status: "active",
        settings: {
          locations: input.locations,
          budget: input.budget,
          diet: input.diet,
        },
      });

      const creator = await storage.createGroupMember({
        sessionId: session.id,
        name: input.creatorName,
        avatarUrl: input.creatorAvatarUrl || null,
        joined: true,
      });

      res.status(201).json({ session, members: [creator] });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/group/sessions/:code", async (req, res) => {
    try {
      const code = String(req.params.code || "").trim().toUpperCase();
      const session = await storage.getGroupSessionByCode(code);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const members = await storage.listGroupMembers(session.id);
      res.json({ session, members });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/group/sessions/:code/join", async (req, res) => {
    try {
      const code = String(req.params.code || "").trim().toUpperCase();
      const input = z.object({
        name: z.string().min(1),
        avatarUrl: z.string().optional(),
      }).parse(req.body ?? {});

      const session = await storage.getGroupSessionByCode(code);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const existing = await storage.findGroupMemberByName(session.id, input.name);
      if (existing) {
        const shouldUpdateAvatar = Boolean(input.avatarUrl && input.avatarUrl !== existing.avatarUrl);
        if (shouldUpdateAvatar) {
          const updated = await storage.updateGroupMember(existing.id, {
            avatarUrl: input.avatarUrl,
            joined: true,
          });
          return res.json(updated ?? existing);
        }
        if (!existing.joined) {
          const updated = await storage.updateGroupMember(existing.id, { joined: true });
          return res.json(updated ?? existing);
        }
        return res.json(existing);
      }

      const created = await storage.createGroupMember({
        sessionId: session.id,
        name: input.name,
        avatarUrl: input.avatarUrl,
        joined: true,
      });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/group/sessions/:code/deck", async (req, res) => {
    try {
      const code = String(req.params.code || "").trim().toUpperCase();
      const session = await storage.getGroupSessionByCode(code);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radius = Math.max(300, Math.min(20000, Number(req.query.radius || 5000)));

      const settings = (session.settings || {}) as {
        locations?: string[];
        budget?: string;
        diet?: string[];
      };
      const selectedLocations = settings.locations ?? [];
      const selectedBudget = String(settings.budget || "").toLowerCase();
      const selectedDiet = settings.diet ?? [];

      const budgetPredicate = (priceLevel: number) => {
        if (selectedBudget.includes("cheap")) return priceLevel <= 1;
        if (selectedBudget.includes("moderate")) return priceLevel <= 2;
        if (selectedBudget.includes("fancy")) return priceLevel >= 3;
        if (selectedBudget.includes("expensive")) return priceLevel >= 4;
        return true;
      };

      const locationTokensMap: Record<string, string[]> = {
        "street food": ["street", "market", "night market"],
        restaurants: ["restaurant", "food", "eatery"],
        "near bts": ["bts", "station", "skytrain"],
        "at the mall": ["mall", "plaza", "center", "centre"],
        "late night": ["late", "night", "24", "midnight"],
        rooftops: ["rooftop", "sky", "view"],
      };

      const dietTokensMap: Record<string, string[]> = {
        vegan: ["vegan", "plant-based", "vegetarian"],
        halal: ["halal"],
        "gluten-free": ["gluten free", "gluten-free"],
        "no pork": ["no pork", "pork-free"],
        keto: ["keto", "low carb", "low-carb"],
        "dairy-free": ["dairy free", "dairy-free", "lactose-free"],
      };

      const locationTokens = selectedLocations.flatMap((loc) => locationTokensMap[loc.toLowerCase()] ?? []);
      const dietTokens = selectedDiet.flatMap((diet) => dietTokensMap[diet.toLowerCase()] ?? []);

      const all = await storage.getRestaurants();
      let filtered = all.filter((r) => budgetPredicate(Number(r.priceLevel || 2)));

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        filtered = filtered
          .map((r) => {
            const rLat = Number(r.lat);
            const rLng = Number(r.lng);
            if (!Number.isFinite(rLat) || !Number.isFinite(rLng)) return null;
            const d = distanceMeters(lat, lng, rLat, rLng);
            if (d > radius) return null;
            return { ...r, distanceMeters: d };
          })
          .filter((r): r is NonNullable<typeof r> => Boolean(r))
          .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
      }

      const textMatch = (r: any, tokens: string[]) => {
        if (tokens.length === 0) return true;
        const haystack = `${r.name} ${r.category} ${r.description} ${r.address}`.toLowerCase();
        return tokens.some((t) => haystack.includes(t.toLowerCase()));
      };

      if (locationTokens.length > 0) {
        const byLocation = filtered.filter((r) => textMatch(r, locationTokens));
        if (byLocation.length > 0) filtered = byLocation;
      }
      if (dietTokens.length > 0) {
        const byDiet = filtered.filter((r) => textMatch(r, dietTokens));
        if (byDiet.length > 0) filtered = byDiet;
      }

      filtered = filtered
        .slice()
        .sort((a, b) => (b.trendingScore ?? 0) - (a.trendingScore ?? 0))
        .slice(0, 30);

      res.json(filtered.map(enrichRestaurant));
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/analytics/recommendations", async (req, res) => {
    try {
      if (!requireAnalyticsAccess(req, res)) return;
      const events = await storage.listEventLogs(3000);
      const features = await storage.listUserFeatureSnapshots(3000);

      const recRequests = events.filter((e) => e.eventType === "view_card" || e.eventType === "session_join").length;
      const clickMapEvents = events.filter((e) => e.eventType === "session_result_click_map").length;
      const favEvents = events.filter((e) => e.eventType === "favorite").length;
      const dismissEvents = events.filter((e) => e.eventType === "dismiss").length;

      const quality = recRequests > 0 ? Number((((favEvents + clickMapEvents) / recRequests) * 100).toFixed(2)) : 0;
      const fallbackRate = recRequests > 0 ? Number(((dismissEvents / recRequests) * 100).toFixed(2)) : 0;

      const topAffinities = Object.entries(
        features.reduce<Record<string, number>>((acc, snapshot) => {
          const affinity = snapshot.cuisineAffinity ?? {};
          for (const [key, value] of Object.entries(affinity)) {
            acc[key] = (acc[key] ?? 0) + Number(value || 0);
          }
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, score]) => ({ category, score: Number(score.toFixed(2)) }));

      res.json({
        requestCount: recRequests,
        mapClickCount: clickMapEvents,
        favoriteCount: favEvents,
        dismissCount: dismissEvents,
        qualityScorePct: quality,
        fallbackRatePct: fallbackRate,
        userFeatureCount: features.length,
        topAffinities,
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/privacy/consent", async (req, res) => {
    try {
      const input = z.object({
        userId: z.string().min(1),
        granted: z.boolean(),
        version: z.string().optional().default("v1"),
      }).parse(req.body ?? {});
      const consent = await storage.createConsentLog({
        userId: input.userId,
        granted: input.granted,
        consentType: "behavior_tracking",
        version: input.version,
      });
      res.status(201).json(consent);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events/batch", async (req, res) => {
    try {
      const input = z.object({
        events: z.array(z.object({
          eventId: z.string().min(8),
          eventVersion: z.string().min(1).default("v1"),
          idempotencyKey: z.string().min(8),
          eventType: z.enum([
            "view_card",
            "swipe",
            "session_join",
            "session_result_click_map",
            "favorite",
            "dismiss",
            "search",
            "filter",
            "order_click",
            "booking_click",
          ]),
          eventName: z.string().optional(),
          timestamp: z.string().datetime(),
          platform: z.string().min(1),
          context: z.string().min(1),
          userId: z.string().optional(),
          sessionId: z.string().optional(),
          itemId: z.number().int().optional(),
          metadata: z.record(z.string(), z.unknown()).optional().default({}),
        })).min(1).max(200),
      }).parse(req.body ?? {});

      let accepted = 0;
      let skipped = 0;
      const reasonCounts: Record<string, number> = {};
      const qualityCounts: Record<string, number> = {};
      for (const event of input.events) {
        const eventTs = Date.parse(event.timestamp);
        if (!Number.isFinite(eventTs)) {
          skipped += 1;
          reasonCounts.invalid_timestamp = (reasonCounts.invalid_timestamp ?? 0) + 1;
          continue;
        }
        const now = Date.now();
        if (eventTs < now - 120 * 24 * 60 * 60 * 1000) {
          skipped += 1;
          reasonCounts.too_old = (reasonCounts.too_old ?? 0) + 1;
          continue;
        }
        if (eventTs > now + 10 * 60 * 1000) {
          skipped += 1;
          reasonCounts.future_timestamp = (reasonCounts.future_timestamp ?? 0) + 1;
          continue;
        }

        if (!event.userId) qualityCounts.missing_user = (qualityCounts.missing_user ?? 0) + 1;
        if (!event.sessionId) qualityCounts.missing_session = (qualityCounts.missing_session ?? 0) + 1;
        if (!event.itemId) qualityCounts.missing_item = (qualityCounts.missing_item ?? 0) + 1;
        if (!event.context) qualityCounts.missing_context = (qualityCounts.missing_context ?? 0) + 1;
        if (!event.platform) qualityCounts.missing_platform = (qualityCounts.missing_platform ?? 0) + 1;

        if (event.userId) {
          const latestConsent = await storage.getLatestConsent(event.userId, "behavior_tracking");
          if (!latestConsent?.granted) {
            skipped += 1;
            reasonCounts.no_consent = (reasonCounts.no_consent ?? 0) + 1;
            continue;
          }
        }

        const created = await storage.createEventLog({
          idempotencyKey: event.idempotencyKey,
          eventType: event.eventType,
          userId: event.userId ?? null,
          sessionId: event.sessionId ?? null,
          itemId: event.itemId ?? null,
          metadata: {
            ...(event.metadata ?? {}),
            eventId: event.eventId,
            eventVersion: event.eventVersion,
            eventName: event.eventName ?? event.eventType,
            timestamp: event.timestamp,
            platform: event.platform,
            context: event.context,
          },
        });
        if (created) accepted += 1;
        else {
          skipped += 1;
          reasonCounts.duplicate_or_idempotent = (reasonCounts.duplicate_or_idempotent ?? 0) + 1;
        }

        if (created && event.userId) {
          const current = await storage.getUserFeatureSnapshot(event.userId);
          const cuisineAffinity = { ...(current?.cuisineAffinity ?? {}) };
          const category = String(event.metadata?.category ?? "").trim();
          if (category && (event.eventType === "swipe" || event.eventType === "favorite")) {
            cuisineAffinity[category] = (cuisineAffinity[category] ?? 0) + 0.1;
          }

          const dislikedItemIds = [...(current?.dislikedItemIds ?? [])];
          if (event.eventType === "dismiss" && event.itemId && !dislikedItemIds.includes(event.itemId)) {
            dislikedItemIds.push(event.itemId);
          }

          await storage.upsertUserFeatureSnapshot(event.userId, {
            cuisineAffinity,
            preferredPriceLevel:
              Number.isFinite(Number(event.metadata?.priceLevel))
                ? Number(event.metadata?.priceLevel)
                : current?.preferredPriceLevel ?? 2,
            activeHours: Array.from(new Set([...(current?.activeHours ?? []), new Date(event.timestamp).getHours()])),
            dislikedItemIds,
          });
        }

        if (created && event.itemId) {
          const likeDelta = event.eventType === "favorite" || event.eventType === "swipe" ? 1 : 0;
          const dismissDelta = event.eventType === "dismiss" ? 1 : 0;
          await storage.upsertItemFeatureSnapshot(event.itemId, {
            likeRate: likeDelta * 100,
            conversionRate: dismissDelta > 0 ? 0 : 50,
            ctr: 100,
            superLikeRate: Number(event.metadata?.direction === "UP") * 100,
          });
        }
      }

      appendEventAudit({
        ts: new Date().toISOString(),
        level: skipped > 0 ? "warn" : "info",
        kind: "ingest_summary",
        accepted,
        skipped,
        reasons: [
          ...Object.entries(reasonCounts).map(([key, value]) => `${key}:${value}`),
          ...Object.entries(qualityCounts).map(([key, value]) => `quality_${key}:${value}`),
        ],
        ip: req.ip,
      });

      res.json({ accepted, skipped });
    } catch (err) {
      if (err instanceof z.ZodError) {
        appendEventAudit({
          ts: new Date().toISOString(),
          level: "error",
          kind: "invalid_payload",
          issues: err.errors.slice(0, 10).map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`),
          ip: req.ip,
        });
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/events/audit", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const limitParam = Number(req.query.limit ?? 100);
      const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), EVENT_INGEST_AUDIT_LIMIT) : 100;
      res.json({
        total: eventIngestAudits.length,
        items: eventIngestAudits.slice(0, limit),
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/ops/logs", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const limitParam = Number(req.query.limit ?? 100);
      const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 1000) : 100;
      const config = await storage.getAdminConfig("ops_logs");
      const items = Array.isArray(config?.value?.items) ? (config?.value?.items as unknown[]) : [];
      res.json({ total: items.length, items: items.slice(0, limit) });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/security/audit", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const limitParam = Number(req.query.limit ?? 100);
      const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 5000) : 100;
      const config = await storage.getAdminConfig("security_audit_log");
      const items = Array.isArray(config?.value?.items) ? (config?.value?.items as unknown[]) : [];
      res.json({ total: items.length, items: items.slice(0, limit) });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/ops/slo", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const logs = await storage.listEventLogs(10000, since);
      const total = logs.length;
      const metadataWithTimestamp = logs.filter((l) => {
        const meta = parseEventMetadata(l.metadata);
        return typeof meta.timestamp === "string" && Number.isFinite(Date.parse(meta.timestamp));
      }).length;
      const metadataWithPlatform = logs.filter((l) => {
        const meta = parseEventMetadata(l.metadata);
        return typeof meta.platform === "string" && meta.platform.trim().length > 0;
      }).length;
      const metadataWithContext = logs.filter((l) => {
        const meta = parseEventMetadata(l.metadata);
        return typeof meta.context === "string" && meta.context.trim().length > 0;
      }).length;

      const pct = (n: number) => (total > 0 ? Number(((n / total) * 100).toFixed(2)) : 0);

      res.json({
        windowHours: 24,
        totals: { events: total },
        slos: {
          timestampCoveragePct: pct(metadataWithTimestamp),
          platformCoveragePct: pct(metadataWithPlatform),
          contextCoveragePct: pct(metadataWithContext),
        },
        status: {
          timestampCoverageOk: pct(metadataWithTimestamp) >= 99,
          platformCoverageOk: pct(metadataWithPlatform) >= 98,
          contextCoverageOk: pct(metadataWithContext) >= 98,
        },
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/analytics/data-quality", async (req, res) => {
    try {
      if (!requireAnalyticsAccess(req, res)) return;
      const daysParam = Number(req.query.days ?? 7);
      const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 90) : 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const logs = await storage.listEventLogs(5000, since);

      const total = logs.length;
      const issues = {
        missingUser: 0,
        missingSession: 0,
        missingItem: 0,
        missingTimestamp: 0,
        missingPlatform: 0,
        missingContext: 0,
        unknownEventType: 0,
        malformedMetadata: 0,
        staleTimestamp: 0,
        futureTimestamp: 0,
      };

      for (const log of logs) {
        if (!log.userId) issues.missingUser += 1;
        if (!log.sessionId) issues.missingSession += 1;
        if (!log.itemId) issues.missingItem += 1;
        if (!CANONICAL_EVENT_TYPES.has(log.eventType)) issues.unknownEventType += 1;

        const metadata = parseEventMetadata(log.metadata);
        if (Object.keys(metadata).length === 0 && log.metadata) issues.malformedMetadata += 1;

        const tsRaw = metadata.timestamp;
        if (typeof tsRaw !== "string") {
          issues.missingTimestamp += 1;
        } else {
          const tsMs = Date.parse(tsRaw);
          if (!Number.isFinite(tsMs)) {
            issues.missingTimestamp += 1;
          } else {
            if (tsMs < Date.now() - 120 * 24 * 60 * 60 * 1000) issues.staleTimestamp += 1;
            if (tsMs > Date.now() + 10 * 60 * 1000) issues.futureTimestamp += 1;
          }
        }
        if (typeof metadata.platform !== "string" || !metadata.platform.trim()) issues.missingPlatform += 1;
        if (typeof metadata.context !== "string" || !metadata.context.trim()) issues.missingContext += 1;
      }

      const ratio = (count: number) => (total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0);
      res.json({
        windowDays: days,
        totalEvents: total,
        issues,
        issueRatesPct: {
          missingUser: ratio(issues.missingUser),
          missingSession: ratio(issues.missingSession),
          missingItem: ratio(issues.missingItem),
          missingTimestamp: ratio(issues.missingTimestamp),
          missingPlatform: ratio(issues.missingPlatform),
          missingContext: ratio(issues.missingContext),
          unknownEventType: ratio(issues.unknownEventType),
          malformedMetadata: ratio(issues.malformedMetadata),
          staleTimestamp: ratio(issues.staleTimestamp),
          futureTimestamp: ratio(issues.futureTimestamp),
        },
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/analytics/quality-reports", async (req, res) => {
    try {
      if (!requireAnalyticsAccess(req, res)) return;
      const limitParam = Number(req.query.limit ?? 7);
      const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 30) : 7;
      const config = await storage.getAdminConfig("analytics_quality_reports");
      const items = Array.isArray(config?.value?.items) ? (config?.value?.items as unknown[]) : [];
      res.json({
        total: items.length,
        items: items.slice(0, limit),
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/analytics/quality-reports/run", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const daysParam = Number(req.body?.windowDays ?? 1);
      const windowDays = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 30) : 1;
      const report = await persistAnalyticsQualityReport(windowDays);
      res.status(201).json(report);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/analytics/derived", async (req, res) => {
    try {
      if (!requireAnalyticsAccess(req, res)) return;
      const daysParam = Number(req.query.days ?? 30);
      const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 180) : 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const logs = await storage.listEventLogs(10000, since);

      const userMap = new Map<string, { events: number; firstTs: number; lastTs: number }>();
      const itemMap = new Map<number, { total: number; swipes: number; favorites: number; dismisses: number; orderClicks: number }>();
      const dailyMap = new Map<string, number>();
      const funnel = { views: 0, swipes: 0, favorites: 0, orderIntent: 0 };

      for (const log of logs) {
        const ts = eventTimestampMsFromLog(log);
        const day = new Date(ts).toISOString().slice(0, 10);
        dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);

        if (log.userId) {
          const current = userMap.get(log.userId);
          if (!current) userMap.set(log.userId, { events: 1, firstTs: ts, lastTs: ts });
          else {
            current.events += 1;
            current.firstTs = Math.min(current.firstTs, ts);
            current.lastTs = Math.max(current.lastTs, ts);
          }
        }

        if (log.itemId) {
          const current = itemMap.get(log.itemId) ?? { total: 0, swipes: 0, favorites: 0, dismisses: 0, orderClicks: 0 };
          current.total += 1;
          if (log.eventType === "swipe") current.swipes += 1;
          if (log.eventType === "favorite") current.favorites += 1;
          if (log.eventType === "dismiss") current.dismisses += 1;
          if (log.eventType === "order_click" || log.eventType === "booking_click" || log.eventType === "session_result_click_map") {
            current.orderClicks += 1;
          }
          itemMap.set(log.itemId, current);
        }

        if (log.eventType === "view_card") funnel.views += 1;
        if (log.eventType === "swipe") funnel.swipes += 1;
        if (log.eventType === "favorite") funnel.favorites += 1;
        if (log.eventType === "order_click" || log.eventType === "booking_click" || log.eventType === "session_result_click_map") {
          funnel.orderIntent += 1;
        }
      }

      const topUsers = Array.from(userMap.entries())
        .map(([userId, data]) => ({ userId, events: data.events, activeDays: Math.max(1, Math.ceil((data.lastTs - data.firstTs) / 86400000)) }))
        .sort((a, b) => b.events - a.events)
        .slice(0, 20);

      const topItems = Array.from(itemMap.entries())
        .map(([itemId, data]) => ({ itemId, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 20);

      const cohortBase = Array.from(userMap.values());
      const retainedD1 = cohortBase.filter((u) => u.lastTs - u.firstTs >= 1 * 86400000).length;
      const retainedD7 = cohortBase.filter((u) => u.lastTs - u.firstTs >= 7 * 86400000).length;
      const cohortSize = cohortBase.length;

      res.json({
        windowDays: days,
        totals: {
          events: logs.length,
          users: userMap.size,
          items: itemMap.size,
        },
        funnel,
        dailyEvents: Array.from(dailyMap.entries())
          .map(([day, count]) => ({ day, count }))
          .sort((a, b) => a.day.localeCompare(b.day)),
        topUsers,
        topItems,
        retention: {
          cohortSize,
          d1RatePct: cohortSize > 0 ? Number(((retainedD1 / cohortSize) * 100).toFixed(2)) : 0,
          d7RatePct: cohortSize > 0 ? Number(((retainedD7 / cohortSize) * 100).toFixed(2)) : 0,
        },
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/recommendations/features", async (req, res) => {
    try {
      if (!requireAnalyticsAccess(req, res)) return;
      const userLimitParam = Number(req.query.userLimit ?? 20);
      const itemLimitParam = Number(req.query.itemLimit ?? 20);
      const userLimit = Number.isFinite(userLimitParam) ? Math.min(Math.max(userLimitParam, 1), 200) : 20;
      const itemLimit = Number.isFinite(itemLimitParam) ? Math.min(Math.max(itemLimitParam, 1), 200) : 20;

      const users = await storage.listUserFeatureSnapshots(userLimit);
      const items = await storage.listItemFeatureSnapshots(itemLimit);
      const now = Date.now();

      const userFreshnessHours = users.map((u) => Math.max(0, (now - new Date(u.updatedAt).getTime()) / 3600000));
      const itemFreshnessHours = items.map((i) => Math.max(0, (now - new Date(i.updatedAt).getTime()) / 3600000));
      const avg = (arr: number[]) => (arr.length > 0 ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2)) : 0);

      res.json({
        totals: {
          userSnapshots: users.length,
          itemSnapshots: items.length,
        },
        freshnessHours: {
          avgUser: avg(userFreshnessHours),
          avgItem: avg(itemFreshnessHours),
          staleUserOver72h: userFreshnessHours.filter((h) => h > 72).length,
          staleItemOver72h: itemFreshnessHours.filter((h) => h > 72).length,
        },
        userSamples: users.slice(0, 10).map((u) => ({
          userId: u.userId,
          preferredPriceLevel: u.preferredPriceLevel,
          activeHours: u.activeHours ?? [],
          topCuisineAffinity: Object.entries(u.cuisineAffinity ?? {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5),
          dislikedCount: (u.dislikedItemIds ?? []).length,
          updatedAt: new Date(u.updatedAt).toISOString(),
        })),
        itemSamples: items.slice(0, 10).map((i) => ({
          itemId: i.itemId,
          ctr: i.ctr,
          likeRate: i.likeRate,
          superLikeRate: i.superLikeRate,
          conversionRate: i.conversionRate,
          updatedAt: new Date(i.updatedAt).toISOString(),
        })),
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/experiments/config", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const config = await storage.getAdminConfig("experiments_config");
      const defaults: ExperimentConfig[] = [
        {
          experimentKey: "recommendation_ranking_v1",
          enabled: true,
          variants: [
            { key: "control", weight: 50 },
            { key: "hybrid_v2", weight: 50 },
          ],
        },
      ];
      const experiments = Array.isArray(config?.value?.experiments)
        ? (config?.value?.experiments as ExperimentConfig[])
        : defaults;
      res.json({ experiments });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/experiments/config", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const input = z.object({
        experiments: z.array(z.object({
          experimentKey: z.string().min(1),
          enabled: z.boolean(),
          variants: z.array(z.object({
            key: z.string().min(1),
            weight: z.number().min(0),
          })).min(1),
        })).min(1),
      }).parse(req.body ?? {});
      const saved = await storage.upsertAdminConfig("experiments_config", {
        updatedAt: new Date().toISOString(),
        experiments: input.experiments,
      });
      void appendSecurityAudit({
        ts: new Date().toISOString(),
        level: "info",
        source: "experiments",
        message: "experiments_config_updated",
        metadata: {
          updatedBy: req.session?.username ?? req.session?.ownerEmail ?? "unknown",
          experimentCount: input.experiments.length,
          ip: req.ip,
        },
      });
      res.json(saved.value);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/experiments/assign", async (req, res) => {
    try {
      const input = z.object({
        userId: z.string().min(1),
        experimentKey: z.string().min(1),
      }).parse(req.body ?? {});

      const config = await storage.getAdminConfig("experiments_config");
      const experiments = Array.isArray(config?.value?.experiments)
        ? (config?.value?.experiments as ExperimentConfig[])
        : [];
      const experiment = experiments.find((item) => item.experimentKey === input.experimentKey);
      const assignedVariant =
        experiment && experiment.enabled
          ? pickVariant(`${input.userId}:${input.experimentKey}`, experiment.variants)
          : "control";

      const exposureConfig = await storage.getAdminConfig("experiments_exposures");
      const exposures = Array.isArray(exposureConfig?.value?.items)
        ? (exposureConfig?.value?.items as Array<Record<string, unknown>>)
        : [];
      const exposure = {
        ts: new Date().toISOString(),
        userId: input.userId,
        experimentKey: input.experimentKey,
        variant: assignedVariant,
      };
      await storage.upsertAdminConfig("experiments_exposures", {
        updatedAt: exposure.ts,
        items: [exposure, ...exposures].slice(0, 2000),
      });
      void appendSecurityAudit({
        ts: new Date().toISOString(),
        level: "info",
        source: "experiments",
        message: "experiment_assigned",
        metadata: {
          userId: input.userId,
          experimentKey: input.experimentKey,
          variant: assignedVariant,
          ip: req.ip,
        },
      });

      res.json({
        experimentKey: input.experimentKey,
        variant: assignedVariant,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/recommendations/personalized", async (req, res) => {
    try {
      const input = z.object({
        userId: z.string().min(1),
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        limit: z.coerce.number().int().positive().max(50).optional().default(20),
      }).parse(req.query ?? {});

      const latestConsent = await storage.getLatestConsent(input.userId, "behavior_tracking");
      const restaurants = await storage.getRestaurants("trending");

      let source: "personalized" | "segment" | "trending" = "trending";
      let items: Array<any> = [];

      if (latestConsent?.granted) {
        const feature = await storage.getUserFeatureSnapshot(input.userId);
        const now = new Date();
        const result = buildPersonalizedRecommendations({
          restaurants,
          feature: feature
            ? {
                cuisineAffinity: feature.cuisineAffinity ?? {},
                preferredPriceLevel: feature.preferredPriceLevel ?? 2,
                dislikedItemIds: feature.dislikedItemIds ?? [],
                activeHours: feature.activeHours ?? [],
              }
            : null,
          context: {
            hourOfDay: now.getHours(),
            dayOfWeek: now.getDay(),
          },
          lat: input.lat,
          lng: input.lng,
          limit: input.limit,
        });
        source = result.source;
        items = result.items;
      } else {
        items = restaurants.slice(0, input.limit).map((restaurant) => ({
          ...restaurant,
          score: Number(((restaurant.trendingScore ?? 0) / 100).toFixed(4)),
          explanation: ["No behavior-tracking consent; using global trending fallback"],
        }));
      }

      res.json({ source, items });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid query" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/privacy/export", async (req, res) => {
    try {
      const input = z.object({ userId: z.string().min(1) }).parse(req.body ?? {});
      const events = await storage.listEventLogsByUser(input.userId);
      const features = await storage.getUserFeatureSnapshot(input.userId);
      const consent = await storage.getLatestConsent(input.userId, "behavior_tracking");
      res.json({
        userId: input.userId,
        events,
        features: features ?? null,
        consents: consent ? [consent] : [],
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/privacy/delete", async (req, res) => {
    try {
      const input = z.object({ userId: z.string().min(1) }).parse(req.body ?? {});
      const deleted = await storage.deletePrivacyData(input.userId);
      res.json({ ok: true, deleted });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}



