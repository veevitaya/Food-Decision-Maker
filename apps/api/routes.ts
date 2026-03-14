import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import express from "express";
import bcrypt from "bcryptjs";
import OpenAI from "openai";
import { getBearerToken, requireVerifiedLineUser, verifyLineIdToken } from "./lineAuth";
import * as placesService from "./services/places/placesService";
import type { RestaurantOpeningHour, RestaurantReview, AdminRole, AdminPermission, InsertRestaurant } from "@shared/schema";
import { ROLE_DEFAULT_PERMISSIONS } from "@shared/schema";
import { autoAssignVibes } from "@shared/vibeConfig";
import { insertMenuSchema } from "@shared/schema";
import { insertPromotionSchema, insertRestaurantClaimSchema, insertRestaurantOwnerSchema } from "@shared/schema";
import type { NormalizedPlace } from "./services/places/types";
import { queryOverpass } from "./services/places/providers/overpass";
import { queryGoogle } from "./services/places/providers/google";
import { buildPersonalizedRecommendations } from "./services/recommendations/personalized";
import { blendSnapshots, computePerMemberScores } from "./services/recommendations/groupBlend";
import { blendPartnerSnapshots, buildPartnerMemberEntries, computeCompatibilityScore } from "./services/recommendations/partnerBlend";
import { enqueueFeatureUpdate } from "./jobs/featureUpdateJob";
import { getRecCache, setRecCache, invalidateRecCache, invalidateRecCacheByPrefix } from "./lib/recCache";
import { getKey, getSource, setKey, ALLOWED_SERVICE_IDS, loadFromDb } from "./lib/apiKeyStore";
import { persistAnalyticsQualityReport } from "./jobs/analyticsQuality";
import { appendSecurityAudit } from "./lib/opsLog";
import { checkSLOs } from "./lib/slo";
import { sendAlert } from "./lib/alerting";
import { deriveItemFeatureDelta, hasItemFeatureDelta } from "./lib/itemFeatureMetrics";
import { reverseGeocodeDistrict } from "./lib/locationCluster";
import {
  DEFAULT_RECOMMENDATION_EXPERIMENT_KEY,
  parseExperimentConfigs,
  parseRecommendationWeightsConfig,
  resolveRecommendationExperiment,
  validateVariantPresetMapping,
  type ExperimentConfig,
} from "./lib/recommendationExperiment";
import { aggregateRecommendationExperimentReport } from "./lib/recommendationExperimentReport";
import * as lineMessaging from "./services/line/messaging";
import {
  buildMenuDrafts,
  countRealActiveMenus,
  detectCuisineKey,
  parseOpenAIDishesResponse,
  type MenuTextCandidate,
} from "./lib/menuGeneration";

const isDev = process.env.NODE_ENV !== "production";

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

function requireOwnerOrAdmin(req: Request, res: Response): boolean {
  if (req.session?.isAdmin) return true;
  if (req.session?.sessionType === "owner") return true;
  res.status(401).json({ message: "Owner or admin login required" });
  return false;
}

type OwnerScope = {
  ownerId: number;
  ownerEmail: string;
  approvedRestaurantIds: Set<number>;
  activeRestaurantId: number | null;
};

async function getOwnerScope(req: Request): Promise<OwnerScope | null> {
  if (req.session?.sessionType !== "owner") return null;
  const ownerEmail = (req.session.ownerEmail ?? "").trim();
  if (!ownerEmail) return null;

  const owner = await storage.getRestaurantOwnerByEmail(ownerEmail);
  if (!owner) return null;

  const claims = await storage.listRestaurantClaims("approved");
  const approvedRestaurantIds = new Set<number>(
    claims.filter((claim) => claim.ownerId === owner.id).map((claim) => claim.restaurantId),
  );

  if (owner.isVerified && owner.restaurantId) {
    approvedRestaurantIds.add(owner.restaurantId);
  }

  const sessionRestaurantId = req.session.ownerRestaurantId;
  const activeRestaurantId = sessionRestaurantId && approvedRestaurantIds.has(sessionRestaurantId)
    ? sessionRestaurantId
    : (approvedRestaurantIds.values().next().value ?? null);

  return {
    ownerId: owner.id,
    ownerEmail,
    approvedRestaurantIds,
    activeRestaurantId,
  };
}

/**
 * Returns a guard that checks:
 *  1. The request has an active admin session
 *  2. The admin's role grants the requested permission
 *
 * The env-based admin always gets "superadmin" role (all permissions).
 */
function requirePermission(perm: AdminPermission) {
  return (req: Request, res: Response): boolean => {
    if (!req.session?.isAdmin) {
      res.status(401).json({ message: "Admin login required" });
      return false;
    }
    const role: AdminRole = req.session.adminRole ?? "superadmin";
    const granted = ROLE_DEFAULT_PERMISSIONS[role] ?? [];
    if (!granted.includes(perm)) {
      res.status(403).json({ message: `Permission denied: ${perm} required` });
      return false;
    }
    return true;
  };
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
  restaurantName: string | null;
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

type MenuGenerateRestaurantResult = {
  restaurantId: number;
  restaurantName: string;
  status: "generated" | "skipped" | "failed";
  reason?: string;
  existingRealCount: number;
  createdCount: number;
  createdItemNames: string[];
  missingImages: number;
};

type MenuGenerateJobSummary = {
  selected: number;
  processed: number;
  generatedRestaurants: number;
  generatedItems: number;
  skippedRestaurants: number;
  failedRestaurants: number;
};

type MenuGenerateJob = {
  jobId: string;
  status: "running" | "completed" | "failed";
  restaurantId: number | null;
  force: boolean;
  summary: MenuGenerateJobSummary;
  results: MenuGenerateRestaurantResult[];
  startedAt: string;
  finishedAt?: string;
};

const MENU_GENERATE_JOB_HISTORY_LIMIT = 30;
const menuGenerateJobs = new Map<string, MenuGenerateJob>();

function createMenuGenerateJobId(): string {
  return `menugen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function pruneMenuGenerateJobs(): void {
  if (menuGenerateJobs.size <= MENU_GENERATE_JOB_HISTORY_LIMIT) return;
  const ordered = Array.from(menuGenerateJobs.entries())
    .sort((a, b) => {
      const left = new Date(a[1].startedAt).getTime();
      const right = new Date(b[1].startedAt).getTime();
      return left - right;
    });
  while (ordered.length > MENU_GENERATE_JOB_HISTORY_LIMIT) {
    const oldest = ordered.shift();
    if (!oldest) break;
    menuGenerateJobs.delete(oldest[0]);
  }
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) return codeBlockMatch[1].trim();
  return trimmed;
}

async function requestMenuTextFromOpenAI(args: {
  client: OpenAI;
  model: string;
  restaurant: { id: number; name: string; category: string; description: string; district: string | null; priceLevel: number };
  cuisineKey: string;
  targetCount: number;
}): Promise<MenuTextCandidate[]> {
  const prompt = [
    "Generate realistic menu items for a Bangkok restaurant.",
    `Restaurant name: ${args.restaurant.name}`,
    `Category: ${args.restaurant.category}`,
    `District: ${args.restaurant.district ?? "unknown"}`,
    `Cuisine key: ${args.cuisineKey}`,
    `Price level (1-4): ${args.restaurant.priceLevel}`,
    `Restaurant description: ${args.restaurant.description}`,
    `Generate exactly ${args.targetCount} menu dishes in English.`,
    "Return strict JSON only with shape: {\"dishes\":[{\"name\":\"...\",\"description\":\"...\",\"tags\":[\"...\"],\"dietFlags\":[\"...\"]}]}",
    "No markdown, no commentary, no explanation.",
  ].join("\n");

  const completion = await args.client.chat.completions.create({
    model: args.model,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a culinary data generator. Output valid JSON only, and keep dishes plausible for Bangkok restaurants.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  return parseOpenAIDishesResponse(extractJsonObject(content));
}

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

type StoredOwner = {
  id: number;
  restaurantId: number;
  displayName: string;
  email: string;
  phone?: string | null;
  lineUserId?: string | null;
  isVerified?: boolean;
  paymentConnected?: boolean;
  paymentMethod?: string | null;
  subscriptionTier?: string;
  subscriptionExpiry?: string | null;
  verificationStatus?: string;
};

type StoredClaim = {
  id: number;
  restaurantId: number;
  ownerId: number;
  ownershipType?: string | null;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewNotes?: string | null;
  proofDocuments?: string[] | null;
  verificationChecklist?: Array<{ id: string; label: string; checked: boolean }> | null;
  notes?: string | null;
};

const OWNERS_CONFIG_KEY = "restaurant_owners";
const CLAIMS_CONFIG_KEY = "restaurant_claims";

async function buildAnalyticsEvents(): Promise<AnalyticsEventRecord[]> {
  const logs = await storage.listEventLogs(500);
  if (logs.length > 0) {
    const allRestaurants = await storage.getRestaurants();
    const restaurantNames: Record<number, string> = {};
    for (const r of allRestaurants) restaurantNames[r.id] = r.name;
    return logs.map((log) => ({
      id: log.id,
      eventType: log.eventType,
      userId: log.userId ?? null,
      restaurantId: log.itemId ?? null,
      restaurantName: log.itemId ? (restaurantNames[log.itemId] ?? null) : null,
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
    restaurantName: null,
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

const GOOGLE_NEARBY_URL  = "https://places.googleapis.com/v1/places:searchNearby";
const GOOGLE_TEXT_URL    = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_DETAILS_URL = "https://places.googleapis.com/v1/places"; // append /{id}
const GOOGLE_PHOTO_URL   = "https://places.googleapis.com/v1";         // prefix for photo names

// Raw response shape from Places API (New)
type GooglePlaceNew = {
  id: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  shortFormattedAddress?: string;
  formattedAddress?: string;
  rating?: number;
  priceLevel?: string; // e.g. "PRICE_LEVEL_MODERATE"
  photos?: Array<{ name: string }>;
  types?: string[];
  internationalPhoneNumber?: string;
  currentOpeningHours?: { weekdayDescriptions?: string[] };
  reviews?: Array<{
    authorAttribution?: { displayName?: string };
    rating?: number;
    text?: { text?: string };
    relativePublishTimeDescription?: string;
  }>;
};

// Adapter output types — same shape as before, so all callers are unchanged.
// photo_reference now holds the new photo name string (e.g. places/ChIJ.../photos/xxx)
// which toPhotoUrl converts to the correct URL.
// _details carries rich data already returned by the new Nearby Search so callers
// can skip a separate fetchGoogleDetails call when this is populated.
type GoogleNearbyResult = {
  place_id: string;
  name: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  vicinity?: string;
  rating?: number;
  price_level?: number;
  photos?: Array<{ photo_reference: string }>;
  types?: string[];
  _details?: GoogleDetailsResult; // pre-populated from Nearby Search FieldMask
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

function parsePriceLevel(priceLevel?: string): number | undefined {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE":
    case "PRICE_LEVEL_INEXPENSIVE":    return 1;
    case "PRICE_LEVEL_MODERATE":       return 2;
    case "PRICE_LEVEL_EXPENSIVE":      return 3;
    case "PRICE_LEVEL_VERY_EXPENSIVE": return 4;
    default:                           return undefined;
  }
}

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
  // photoReference is a Places API (New) photo name: "places/ChIJ.../photos/AUc7tXx"
  return `${GOOGLE_PHOTO_URL}/${photoReference}/media?maxWidthPx=800&key=${encodeURIComponent(apiKey)}`;
}

function isLegacyGooglePhotoUrl(url?: string | null): boolean {
  if (!url) return false;
  return (
    /maps\.googleapis\.com\/maps\/api\/place\/photo\?/i.test(url) ||
    /[?&]photo_reference=/i.test(url)
  );
}

function normalizeVibes(vibes?: string[] | null): string[] {
  return Array.from(new Set((vibes ?? []).filter((v) => Boolean(v && v.trim().length > 0)))).sort();
}

function sameVibes(a?: string[] | null, b?: string[] | null): boolean {
  const left = normalizeVibes(a);
  const right = normalizeVibes(b);
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
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

const PLACES_NEW_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.shortFormattedAddress",
  "places.formattedAddress",
  "places.rating",
  "places.priceLevel",
  "places.photos",
  "places.types",
  "places.internationalPhoneNumber",
  "places.currentOpeningHours",
  "places.reviews",
].join(",");

function adaptNearbyPlace(p: GooglePlaceNew): GoogleNearbyResult {
  const photos = p.photos?.map((ph) => ({ photo_reference: ph.name }));

  // Pre-populate _details from rich data already returned by Nearby Search,
  // so callers can skip a separate fetchGoogleDetails call.
  const hasRichData = !!(p.formattedAddress || p.internationalPhoneNumber || p.currentOpeningHours || p.reviews?.length);
  const _details: GoogleDetailsResult | undefined = hasRichData ? {
    formatted_address: p.formattedAddress ?? p.shortFormattedAddress,
    formatted_phone_number: p.internationalPhoneNumber,
    opening_hours: p.currentOpeningHours?.weekdayDescriptions?.length
      ? { weekday_text: p.currentOpeningHours.weekdayDescriptions }
      : undefined,
    reviews: p.reviews?.map((r) => ({
      author_name: r.authorAttribution?.displayName,
      rating: r.rating,
      text: r.text?.text,
      relative_time_description: r.relativePublishTimeDescription,
    })),
    photos,
    types: p.types,
    rating: p.rating,
    price_level: parsePriceLevel(p.priceLevel),
  } : undefined;

  return {
    place_id: p.id,
    name: p.displayName?.text ?? "",
    geometry: { location: { lat: p.location?.latitude, lng: p.location?.longitude } },
    vicinity: p.shortFormattedAddress,
    rating: p.rating,
    price_level: parsePriceLevel(p.priceLevel),
    photos,
    types: p.types,
    _details,
  };
}

async function fetchGoogleNearby(
  apiKey: string,
  lat: number,
  lng: number,
  radius: number,
  keyword: string,
  maxResults = 20,
): Promise<GoogleNearbyResult[]> {
  // Places API (New) caps at 20 per request — no pagination token
  const count = Math.min(maxResults, 20);
  if (maxResults > 20) {
    console.warn(`[google] Places API (New): maxResultCount capped at 20 (requested ${maxResults})`);
  }

  const useTextSearch = keyword.trim().length > 0;
  const url = useTextSearch ? GOOGLE_TEXT_URL : GOOGLE_NEARBY_URL;
  const circle = { center: { latitude: lat, longitude: lng }, radiusMeters: radius };
  const body = useTextSearch
    ? {
        textQuery: keyword.trim(),
        // locationRestriction (not locationBias) enforces the radius strictly
        locationRestriction: { circle },
        maxResultCount: count,
        rankPreference: "RELEVANCE",
      }
    : {
        locationRestriction: { circle },
        includedTypes: ["restaurant"],
        maxResultCount: count,
        rankPreference: "DISTANCE",
      };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": PLACES_NEW_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => String(res.status));
    throw new Error(`Google Places (New) nearby call failed (${res.status}): ${errText}`);
  }

  const json = (await res.json()) as { places?: GooglePlaceNew[]; error?: { message?: string } };
  if (json.error) throw new Error(`Google Places (New): ${json.error.message ?? "unknown error"}`);

  return (json.places ?? []).map(adaptNearbyPlace);
}

async function fetchGoogleDetails(apiKey: string, placeId: string): Promise<GoogleDetailsResult | null> {
  const detailsMask = [
    "id",
    "displayName",
    "formattedAddress",
    "internationalPhoneNumber",
    "currentOpeningHours",
    "reviews",
    "photos",
    "types",
    "rating",
    "priceLevel",
  ].join(",");

  const res = await fetch(`${GOOGLE_DETAILS_URL}/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": detailsMask,
    },
  });
  if (!res.ok) return null;

  const p = (await res.json()) as GooglePlaceNew;
  if (!p.id) return null;

  return {
    formatted_address: p.formattedAddress,
    formatted_phone_number: p.internationalPhoneNumber,
    opening_hours: p.currentOpeningHours?.weekdayDescriptions?.length
      ? { weekday_text: p.currentOpeningHours.weekdayDescriptions }
      : undefined,
    reviews: p.reviews?.map((r) => ({
      author_name: r.authorAttribution?.displayName,
      rating: r.rating,
      text: r.text?.text,
      relative_time_description: r.relativePublishTimeDescription,
    })),
    photos: p.photos?.map((ph) => ({ photo_reference: ph.name })),
    types: p.types,
    rating: p.rating,
    price_level: parsePriceLevel(p.priceLevel),
  };
}

function enrichRestaurant<T extends Record<string, any>>(restaurant: T) {
  return {
    ...restaurant,
    phone: restaurant.phone ?? undefined,
    openingHours: restaurant.openingHours ?? undefined,
    reviews: restaurant.reviews ?? undefined,
  };
}

function normalizePlaceName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pickBestGoogleNearbyMatch(
  restaurant: { name: string; lat: string | null; lng: string | null },
  results: GoogleNearbyResult[],
): GoogleNearbyResult | null {
  if (results.length === 0) return null;

  const targetName = normalizePlaceName(restaurant.name);
  const targetLat = Number(restaurant.lat);
  const targetLng = Number(restaurant.lng);

  const ranked = results
    .map((candidate) => {
      const candidateName = normalizePlaceName(candidate.name ?? "");
      const nameScore =
        candidateName === targetName
          ? 3
          : candidateName.includes(targetName) || targetName.includes(candidateName)
            ? 2
            : 0;

      const candidateLat = candidate.geometry?.location?.lat;
      const candidateLng = candidate.geometry?.location?.lng;
      const distScore =
        Number.isFinite(targetLat) &&
        Number.isFinite(targetLng) &&
        typeof candidateLat === "number" &&
        typeof candidateLng === "number"
          ? distanceMeters(targetLat, targetLng, candidateLat, candidateLng)
          : Number.MAX_SAFE_INTEGER;

      return { candidate, nameScore, distScore };
    })
    .filter((item) => item.nameScore > 0)
    .sort((a, b) => {
      if (b.nameScore !== a.nameScore) return b.nameScore - a.nameScore;
      return a.distScore - b.distScore;
    });

  return ranked[0]?.candidate ?? results[0] ?? null;
}

async function enrichRestaurantDetailsFromGoogle<T extends {
  id: number;
  name: string;
  lat: string | null;
  lng: string | null;
  imageUrl: string | null;
  address: string | null;
  category: string | null;
  priceLevel: number | null;
  rating: string | null;
  phone: string | null;
  openingHours: RestaurantOpeningHour[] | null;
  reviews: RestaurantReview[] | null;
  googlePlaceId?: string | null;
  reviewCount?: number | null;
}>(restaurant: T): Promise<T> {
  const alreadyEnriched =
    Boolean(restaurant.phone) &&
    Boolean(restaurant.openingHours?.length) &&
    Boolean(restaurant.reviews?.length) &&
    Boolean(restaurant.imageUrl);
  if (alreadyEnriched) return restaurant;

  const apiKey = getKey("google_places");
  if (!apiKey) return restaurant;

  const lat = Number(restaurant.lat);
  const lng = Number(restaurant.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return restaurant;

  try {
    const nearby = await fetchGoogleNearby(apiKey, lat, lng, 250, restaurant.name, 5);
    const match = pickBestGoogleNearbyMatch(restaurant, nearby);
    if (!match) return restaurant;

    const details = await fetchGoogleDetails(apiKey, match.place_id);
    const mergedTypes = details?.types?.length ? details.types : match.types;
    const category = toImportCategory(mergedTypes);
    const ratingNum = details?.rating ?? match.rating ?? Number(restaurant.rating ?? 0);
    const rating = ratingNum > 0 ? ratingNum.toFixed(1) : (restaurant.rating ?? "N/A");
    const priceLevel = details?.price_level ?? match.price_level ?? restaurant.priceLevel ?? 2;
    const address = details?.formatted_address || match.vicinity || restaurant.address || "N/A";
    const photoRef = details?.photos?.[0]?.photo_reference ?? match.photos?.[0]?.photo_reference;
    const imageUrl = photoRef ? toPhotoUrl(photoRef, apiKey) : (restaurant.imageUrl ?? "");
    const openingHours = toOpeningHours(details?.opening_hours?.weekday_text);
    const reviews = toReviews(details?.reviews);
    const phone = details?.formatted_phone_number ?? restaurant.phone ?? null;

    const updated = await storage.updateRestaurant(restaurant.id, {
      imageUrl,
      address,
      category,
      description: restaurant.category || category,
      priceLevel: Math.max(1, Math.min(4, Number(priceLevel || 2))),
      rating,
      phone,
      openingHours: openingHours ?? restaurant.openingHours ?? null,
      reviews: reviews ?? restaurant.reviews ?? null,
      googlePlaceId: match.place_id || restaurant.googlePlaceId || undefined,
      reviewCount: details?.reviews?.length ?? restaurant.reviewCount ?? 0,
    });

    return (updated as T | undefined) ?? restaurant;
  } catch (err) {
    if (isDev) {
      console.warn("[restaurants-debug] failed to enrich restaurant details from Google", {
        restaurantId: restaurant.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return restaurant;
  }
}

async function hydrateRestaurantFromGooglePlace(place: NormalizedPlace, restaurantId: number): Promise<void> {
  if (!place.id.startsWith("google:")) return;

  const apiKey = getKey("google_places");
  if (!apiKey) return;

  const existing = await storage.getRestaurantById(restaurantId);
  if (!existing) return;

  const alreadyEnriched =
    Boolean(existing.phone) &&
    Boolean(existing.openingHours?.length) &&
    Boolean(existing.reviews?.length) &&
    Boolean(existing.imageUrl);
  if (alreadyEnriched) return;

  const placeId = place.id.slice("google:".length).trim();
  if (!placeId) return;

  const details = await fetchGoogleDetails(apiKey, placeId);
  if (isDev) {
    console.log("[group-deck-debug] hydrate-google-details", {
      restaurantId,
      placeId,
      placeName: place.name,
      hasDetails: Boolean(details),
      hasPhone: Boolean(details?.formatted_phone_number),
      openingHoursCount: details?.opening_hours?.weekday_text?.length ?? 0,
      reviewsCount: details?.reviews?.length ?? 0,
      hasPhotoRef: Boolean(details?.photos?.[0]?.photo_reference),
      rating: details?.rating ?? null,
      priceLevel: details?.price_level ?? null,
      formattedAddress: details?.formatted_address ?? null,
    });
  }
  if (!details) return;

  const mergedTypes = details.types?.length ? details.types : undefined;
  const category = mergedTypes ? toImportCategory(mergedTypes) : (existing.category || place.category || "Restaurant");
  const ratingNum = details.rating ?? Number(existing.rating ?? place.rating ?? 0);
  const rating = ratingNum > 0 ? ratingNum.toFixed(1) : (existing.rating ?? place.rating ?? "N/A");
  const priceLevel = Math.max(1, Math.min(4, Number(details.price_level ?? existing.priceLevel ?? place.priceLevel ?? 2)));
  const address = details.formatted_address || existing.address || place.address || "N/A";
  const photoRef = details.photos?.[0]?.photo_reference;
  const imageUrl = photoRef ? toPhotoUrl(photoRef, apiKey) : (existing.imageUrl || place.photos?.[0] || "");
  const openingHours = toOpeningHours(details.opening_hours?.weekday_text);
  const reviews = toReviews(details.reviews);

  await storage.updateRestaurant(restaurantId, {
    imageUrl,
    address,
    category,
    description: existing.description || category,
    priceLevel,
    rating,
    phone: details.formatted_phone_number ?? existing.phone ?? null,
    openingHours: openingHours ?? existing.openingHours ?? null,
    reviews: reviews ?? existing.reviews ?? null,
  });

  if (isDev) {
    const updated = await storage.getRestaurantById(restaurantId);
    console.log("[group-deck-debug] hydrated-db-row", {
      restaurantId,
      name: updated?.name ?? null,
      imageUrl: updated?.imageUrl ? "present" : "missing",
      phone: updated?.phone ?? null,
      openingHoursCount: updated?.openingHours?.length ?? 0,
      reviewsCount: updated?.reviews?.length ?? 0,
      rating: updated?.rating ?? null,
      address: updated?.address ?? null,
      category: updated?.category ?? null,
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── WebSocket for group sessions ────────────────────────────────────────────
  // Clients connect to ws://host/group-ws?code=ABC123 and receive push updates
  // whenever a member joins. No more polling GET /api/group/sessions/:code.
  const groupRooms = new Map<string, Set<WebSocket>>();
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    if (url.pathname === "/group-ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (ws, request) => {
    const url = new URL((request as any).url ?? "/", `http://${(request as any).headers.host}`);
    const code = url.searchParams.get("code")?.trim().toUpperCase();
    if (!code) { ws.close(4000, "Missing session code"); return; }

    // Verify the group session actually exists before admitting the client
    try {
      const session = await storage.getGroupSessionByCode(code);
      if (!session) { ws.close(4001, "Session not found"); return; }
    } catch {
      ws.close(4002, "Server error");
      return;
    }

    if (!groupRooms.has(code)) groupRooms.set(code, new Set());
    groupRooms.get(code)!.add(ws);

    ws.on("close", () => {
      const room = groupRooms.get(code);
      if (room) {
        room.delete(ws);
        if (room.size === 0) groupRooms.delete(code);
      }
    });
  });

  function broadcastGroupUpdate(code: string, event: unknown): void {
    const room = groupRooms.get(code);
    if (!room || room.size === 0) return;
    const msg = JSON.stringify(event);
    for (const client of room) {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    }
  }

  // Preload API keys from DB into memory store
  await loadFromDb((key) => storage.getAdminConfig(key));
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  const openAiModel = process.env.OPENAI_MENU_MODEL?.trim() || "gpt-4o-mini";
  const openAiClient = openAiApiKey ? new OpenAI({ apiKey: openAiApiKey }) : null;

  async function runMenuGenerationJob(jobId: string, restaurantsToProcess: Array<{
    id: number;
    name: string;
    category: string;
    description: string;
    district: string | null;
    priceLevel: number;
  }>): Promise<void> {
    const job = menuGenerateJobs.get(jobId);
    if (!job) return;

    try {
      for (const restaurant of restaurantsToProcess) {
        let restaurantResult: MenuGenerateRestaurantResult | null = null;
        try {
          const existingMenus = await storage.listMenusByRestaurant(restaurant.id);
          const existingRealCount = countRealActiveMenus(existingMenus.map((item) => ({
            name: item.name,
            isActive: item.isActive,
          })));

          if (!job.force && existingRealCount >= 3) {
            restaurantResult = {
              restaurantId: restaurant.id,
              restaurantName: restaurant.name,
              status: "skipped",
              reason: "existing_real_menus>=3",
              existingRealCount,
              createdCount: 0,
              createdItemNames: [],
              missingImages: 0,
            };
            job.summary.skippedRestaurants += 1;
          } else {
            const targetCount = 5 + (restaurant.id % 4);
            const cuisineKey = detectCuisineKey(restaurant.category);
            let llmDishes: MenuTextCandidate[] | undefined;
            let llmError: string | undefined;

            if (openAiClient) {
              try {
                llmDishes = await requestMenuTextFromOpenAI({
                  client: openAiClient,
                  model: openAiModel,
                  restaurant,
                  cuisineKey,
                  targetCount,
                });
              } catch (error) {
                llmError = error instanceof Error ? error.message : "openai_error";
              }
            } else {
              llmError = "openai_not_configured";
            }

            const generated = buildMenuDrafts({
              restaurant,
              targetCount,
              existingNames: existingMenus.map((item) => item.name),
              llmDishes,
            });

            if (generated.drafts.length === 0) {
              restaurantResult = {
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
                status: "failed",
                reason: llmError ? `openai_error:${llmError}` : "no_drafts_generated",
                existingRealCount,
                createdCount: 0,
                createdItemNames: [],
                missingImages: 0,
              };
              job.summary.failedRestaurants += 1;
            } else {
              const createdNames: string[] = [];
              for (const draft of generated.drafts) {
                await storage.createMenu({
                  restaurantId: restaurant.id,
                  name: draft.name,
                  description: draft.description,
                  imageUrl: draft.imageUrl,
                  priceApprox: draft.priceApprox,
                  tags: draft.tags,
                  dietFlags: draft.dietFlags,
                  isActive: draft.isActive,
                  isSponsored: draft.isSponsored,
                });
                createdNames.push(draft.name);
              }

              const reasonParts: string[] = [];
              if (llmError && generated.usedFallback) reasonParts.push("openai_error_fallback");
              if (!openAiClient) reasonParts.push("openai_not_configured_template_only");
              if (generated.usedLlm && generated.usedFallback) reasonParts.push("partial_fallback");

              restaurantResult = {
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
                status: "generated",
                reason: reasonParts.length ? reasonParts.join("|") : undefined,
                existingRealCount,
                createdCount: createdNames.length,
                createdItemNames: createdNames,
                missingImages: generated.missingImages,
              };
              job.summary.generatedRestaurants += 1;
              job.summary.generatedItems += createdNames.length;
            }
          }
        } catch (error) {
          restaurantResult = {
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            status: "failed",
            reason: error instanceof Error ? error.message : "generation_failed",
            existingRealCount: 0,
            createdCount: 0,
            createdItemNames: [],
            missingImages: 0,
          };
          job.summary.failedRestaurants += 1;
        } finally {
          job.summary.processed += 1;
          if (restaurantResult) job.results.push(restaurantResult);
        }
      }
      job.status = "completed";
      job.finishedAt = new Date().toISOString();
    } catch {
      job.status = "failed";
      job.finishedAt = new Date().toISOString();
    } finally {
      menuGenerateJobs.set(jobId, job);
      pruneMenuGenerateJobs();
    }
  }

  // Uploads directory — served at /api/uploads/*
  const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB decoded image size cap
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

  async function handleImageUpload(req: Request, res: Response) {
    try {
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
      if (buffer.length > MAX_UPLOAD_BYTES) {
        return res.status(413).json({ message: "Image too large. Maximum size is 10MB." });
      }
      fs.writeFileSync(filePath, buffer);

      res.json({ url: `/api/uploads/${filename}` });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Upload failed" });
    }
  }

  // Admin-only file upload — accepts base64 image, saves to disk, returns public URL
  app.post("/api/admin/upload", async (req, res) => {
    if (!requireAdminSession(req, res)) return;
    await handleImageUpload(req, res);
  });

  // Owner-upload endpoint (requires owner/admin auth; owners must have at least one approved claim)
  app.post("/api/owner/upload", async (req, res) => {
    if (!requireOwnerOrAdmin(req, res)) return;
    if (!req.session?.isAdmin) {
      const ownerScope = await getOwnerScope(req);
      if (!ownerScope || ownerScope.approvedRestaurantIds.size === 0) {
        return res.status(403).json({ message: "Approved claimed restaurant required for uploads" });
      }
    }
    await handleImageUpload(req, res);
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
      if (isDev) {
        console.log("[group-deck-debug] restaurant-detail-request", {
          id,
          path: req.path,
          referer: req.headers.referer ?? null,
          userAgent: req.headers["user-agent"] ?? null,
        });
      }
      const restaurant = await storage.getRestaurantById(id);
      if (!restaurant) return res.status(404).json({ message: "Not found" });
      if (isDev) {
        console.log("[group-deck-debug] restaurant-detail-db-before-enrich", {
          id,
          name: restaurant.name,
          imageUrl: restaurant.imageUrl ? "present" : "missing",
          phone: restaurant.phone ?? null,
          openingHoursCount: restaurant.openingHours?.length ?? 0,
          reviewsCount: restaurant.reviews?.length ?? 0,
          rating: restaurant.rating ?? null,
          address: restaurant.address ?? null,
          category: restaurant.category ?? null,
        });
      }
      const enrichedRestaurant = await enrichRestaurantDetailsFromGoogle(restaurant);
      if (isDev) {
        console.log("[group-deck-debug] restaurant-detail-response", {
          id,
          name: enrichedRestaurant.name,
          imageUrl: enrichedRestaurant.imageUrl ? "present" : "missing",
          phone: enrichedRestaurant.phone ?? null,
          openingHoursCount: enrichedRestaurant.openingHours?.length ?? 0,
          reviewsCount: enrichedRestaurant.reviews?.length ?? 0,
          rating: enrichedRestaurant.rating ?? null,
          address: enrichedRestaurant.address ?? null,
          category: enrichedRestaurant.category ?? null,
        });
      }
      res.json(enrichRestaurant(enrichedRestaurant));
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/restaurants/:id/menus", async (req, res) => {
    try {
      const restaurantId = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(restaurantId)) return res.status(400).json({ message: "Invalid restaurant ID" });
      const menus = await storage.listMenusByRestaurant(restaurantId);
      res.json(menus);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/menus", async (req, res) => {
    try {
      if (!requireOwnerOrAdmin(req, res)) return;
      const input = insertMenuSchema.parse(req.body ?? {});

      let safeInput = input;
      if (req.session?.sessionType === "owner") {
        const ownerScope = await getOwnerScope(req);
        if (!ownerScope || ownerScope.approvedRestaurantIds.size === 0) {
          return res.status(403).json({ message: "Approved claimed restaurant required" });
        }
        const targetRestaurantId = ownerScope.approvedRestaurantIds.has(input.restaurantId)
          ? input.restaurantId
          : ownerScope.activeRestaurantId;
        if (!targetRestaurantId) {
          return res.status(403).json({ message: "No approved restaurant available for this owner" });
        }
        safeInput = { ...input, restaurantId: targetRestaurantId };
      }

      const created = await storage.createMenu(safeInput);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/menus/:id", async (req, res) => {
    try {
      if (!requireOwnerOrAdmin(req, res)) return;
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid menu ID" });
      const updates = insertMenuSchema.partial().parse(req.body ?? {});

      if (req.session?.sessionType === "owner") {
        const ownerScope = await getOwnerScope(req);
        if (!ownerScope || ownerScope.approvedRestaurantIds.size === 0) {
          return res.status(403).json({ message: "Approved claimed restaurant required" });
        }
        const menu = await storage.getMenuById(id);
        if (!menu) return res.status(404).json({ message: "Menu not found" });
        if (!ownerScope.approvedRestaurantIds.has(menu.restaurantId)) {
          return res.status(403).json({ message: "Not allowed to edit this menu item" });
        }
        if (updates.restaurantId && updates.restaurantId !== menu.restaurantId) {
          return res.status(403).json({ message: "Owners cannot move menu items across restaurants" });
        }
      }

      const updated = await storage.updateMenu(id, updates);
      if (!updated) return res.status(404).json({ message: "Menu not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/menus/:id", async (req, res) => {
    try {
      if (!requireOwnerOrAdmin(req, res)) return;
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid menu ID" });

      if (req.session?.sessionType === "owner") {
        const ownerScope = await getOwnerScope(req);
        if (!ownerScope || ownerScope.approvedRestaurantIds.size === 0) {
          return res.status(403).json({ message: "Approved claimed restaurant required" });
        }
        const menu = await storage.getMenuById(id);
        if (!menu) return res.status(404).json({ message: "Menu not found" });
        if (!ownerScope.approvedRestaurantIds.has(menu.restaurantId)) {
          return res.status(403).json({ message: "Not allowed to delete this menu item" });
        }
      }

      const deleted = await storage.deleteMenu(id);
      if (!deleted) return res.status(404).json({ message: "Menu not found" });
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/owner/restaurant", async (req, res) => {
    try {
      if (!requireOwnerOrAdmin(req, res)) return;

      let restaurantId: number | null = null;
      let allowedRestaurantIds: number[] = [];

      if (req.session?.isAdmin) {
        const adminRestaurantId = Number(req.query.restaurantId ?? req.query.id);
        if (!Number.isFinite(adminRestaurantId) || adminRestaurantId <= 0) {
          return res.status(400).json({ message: "restaurantId is required for admin requests" });
        }
        restaurantId = adminRestaurantId;
      } else {
        const ownerScope = await getOwnerScope(req);
        if (!ownerScope || ownerScope.approvedRestaurantIds.size === 0) {
          return res.status(403).json({ message: "Approved claimed restaurant required" });
        }
        restaurantId = ownerScope.activeRestaurantId;
        allowedRestaurantIds = Array.from(ownerScope.approvedRestaurantIds);
      }

      if (!restaurantId) {
        return res.status(404).json({ message: "No restaurant assigned to this owner account" });
      }

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const menuItems = await storage.listMenusByRestaurant(restaurant.id);

      res.json({
        restaurant: enrichRestaurant(restaurant),
        menus: menuItems,
        allowedRestaurantIds,
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/owner/restaurant", async (req, res) => {
    try {
      if (!requireOwnerOrAdmin(req, res)) return;

      let restaurantId: number | null = null;
      if (req.session?.isAdmin) {
        const adminRestaurantId = Number(req.body?.restaurantId ?? req.query.restaurantId);
        if (!Number.isFinite(adminRestaurantId) || adminRestaurantId <= 0) {
          return res.status(400).json({ message: "restaurantId is required for admin requests" });
        }
        restaurantId = adminRestaurantId;
      } else {
        const ownerScope = await getOwnerScope(req);
        if (!ownerScope || ownerScope.approvedRestaurantIds.size === 0 || !ownerScope.activeRestaurantId) {
          return res.status(403).json({ message: "Approved claimed restaurant required" });
        }
        restaurantId = ownerScope.activeRestaurantId;
      }

      const current = await storage.getRestaurantById(restaurantId);
      if (!current) return res.status(404).json({ message: "Restaurant not found" });

      const input = z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().min(1).max(4000).optional(),
        imageUrl: z.string().optional(),
        photos: z.array(z.string()).max(20).optional(),
        category: z.string().min(1).max(120).optional(),
        priceLevel: z.number().int().min(1).max(4).optional(),
        rating: z.string().min(1).max(10).optional(),
        address: z.string().min(1).max(500).optional(),
        phone: z.string().nullable().optional(),
        district: z.string().nullable().optional(),
        openingHours: z.array(z.object({
          day: z.string().min(1),
          hours: z.string().min(1),
        })).nullable().optional(),
        reviews: z.array(z.object({
          author: z.string().min(1),
          rating: z.number().min(1).max(5),
          text: z.string().min(1),
          timeAgo: z.string().optional(),
        })).nullable().optional(),
        vibes: z.array(z.string()).optional(),
      }).parse(req.body ?? {});

      const updates: Partial<InsertRestaurant> = {
        name: input.name,
        description: input.description,
        category: input.category,
        priceLevel: input.priceLevel,
        rating: input.rating,
        address: input.address,
        phone: input.phone,
        district: input.district,
        openingHours: input.openingHours,
        reviews: input.reviews,
        vibes: input.vibes,
      };

      const candidateCover = typeof input.imageUrl === "string" ? input.imageUrl.trim() : current.imageUrl;
      const candidatePhotos = Array.from(new Set([
        ...(input.photos ?? current.photos ?? []),
        candidateCover,
      ].map((url) => String(url ?? "").trim()).filter(Boolean))).slice(0, 20);

      updates.imageUrl = candidateCover;
      updates.photos = candidatePhotos;

      const updated = await storage.updateRestaurant(restaurantId, updates);
      if (!updated) return res.status(404).json({ message: "Restaurant not found" });

      res.json(enrichRestaurant(updated));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/owner/menus", async (req, res) => {
    try {
      if (!requireOwnerOrAdmin(req, res)) return;

      let restaurantId: number | null = null;
      if (req.session?.isAdmin) {
        const adminRestaurantId = Number(req.query.restaurantId);
        if (!Number.isFinite(adminRestaurantId) || adminRestaurantId <= 0) {
          return res.status(400).json({ message: "restaurantId is required for admin requests" });
        }
        restaurantId = adminRestaurantId;
      } else {
        const ownerScope = await getOwnerScope(req);
        if (!ownerScope || ownerScope.approvedRestaurantIds.size === 0 || !ownerScope.activeRestaurantId) {
          return res.status(403).json({ message: "Approved claimed restaurant required" });
        }
        restaurantId = ownerScope.activeRestaurantId;
      }

      const menuItems = await storage.listMenusByRestaurant(restaurantId);
      res.json(menuItems);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/owner/menus", async (req, res) => {
    try {
      if (!requireOwnerOrAdmin(req, res)) return;

      let restaurantId: number | null = null;
      if (req.session?.isAdmin) {
        const adminRestaurantId = Number(req.body?.restaurantId ?? req.query.restaurantId);
        if (!Number.isFinite(adminRestaurantId) || adminRestaurantId <= 0) {
          return res.status(400).json({ message: "restaurantId is required for admin requests" });
        }
        restaurantId = adminRestaurantId;
      } else {
        const ownerScope = await getOwnerScope(req);
        if (!ownerScope || ownerScope.approvedRestaurantIds.size === 0 || !ownerScope.activeRestaurantId) {
          return res.status(403).json({ message: "Approved claimed restaurant required" });
        }
        restaurantId = ownerScope.activeRestaurantId;
      }

      const input = insertMenuSchema.omit({ restaurantId: true }).parse(req.body ?? {});
      const created = await storage.createMenu({ ...input, restaurantId });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/owner/menus/:id", async (req, res) => {
    try {
      if (!requireOwnerOrAdmin(req, res)) return;
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid menu ID" });

      const menu = await storage.getMenuById(id);
      if (!menu) return res.status(404).json({ message: "Menu not found" });

      if (!req.session?.isAdmin) {
        const ownerScope = await getOwnerScope(req);
        if (!ownerScope || ownerScope.approvedRestaurantIds.size === 0) {
          return res.status(403).json({ message: "Approved claimed restaurant required" });
        }
        if (!ownerScope.approvedRestaurantIds.has(menu.restaurantId)) {
          return res.status(403).json({ message: "Not allowed to edit this menu item" });
        }
      }

      const updates = insertMenuSchema.omit({ restaurantId: true }).partial().parse(req.body ?? {});
      const updated = await storage.updateMenu(id, updates);
      if (!updated) return res.status(404).json({ message: "Menu not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/owner/menus/:id", async (req, res) => {
    try {
      if (!requireOwnerOrAdmin(req, res)) return;
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid menu ID" });

      const menu = await storage.getMenuById(id);
      if (!menu) return res.status(404).json({ message: "Menu not found" });

      if (!req.session?.isAdmin) {
        const ownerScope = await getOwnerScope(req);
        if (!ownerScope || ownerScope.approvedRestaurantIds.size === 0) {
          return res.status(403).json({ message: "Approved claimed restaurant required" });
        }
        if (!ownerScope.approvedRestaurantIds.has(menu.restaurantId)) {
          return res.status(403).json({ message: "Not allowed to delete this menu item" });
        }
      }

      const deleted = await storage.deleteMenu(id);
      if (!deleted) return res.status(404).json({ message: "Menu not found" });
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/restaurants/:id/promotions", async (req, res) => {
    try {
      const restaurantId = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(restaurantId)) return res.status(400).json({ message: "Invalid restaurant ID" });
      const items = await storage.listPromotionsByRestaurant(restaurantId, true);
      res.json(items);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/promotions", async (req, res) => {
    try {
      const input = insertPromotionSchema.parse(req.body ?? {});
      const created = await storage.createPromotion(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.restaurants.list.path, async (req, res) => {
    try {
      const input: Partial<RestaurantListInput> = api.restaurants.list.input?.parse(req.query) ?? {};
      const resultLimit = Number.isFinite(input.limit) ? Math.max(1, Math.min(100, Number(input.limit))) : undefined;
      const localOnly = Boolean(input.localOnly);
      if (isDev) console.log("[restaurants-debug] request", {
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
          // Default to hybrid so baseline data uses both OSM + Google enrichment.
          sourcePreference: input.sourcePreference ?? "hybrid",
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
        if (isDev) console.log("[restaurants-debug] geo-result", {
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

          if (isDev && withinRadius.length === 0) {
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
        if (isDev) console.log("[restaurants-debug] db-result", { count: restaurants.length, localOnly });
      }

      if (typeof resultLimit === "number") {
        restaurants = restaurants.slice(0, resultLimit);
        if (isDev) console.log("[restaurants-debug] applied-limit", { limit: resultLimit, countAfterLimit: restaurants.length });
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

  // ── Partner linking ─────────────────────────────────────────────────────

  app.post("/api/partner/invite", async (req, res) => {
    try {
      const verifiedUser = await requireVerifiedLineUser(req, res);
      if (!verifiedUser) return;

      const token = crypto.randomBytes(9).toString("base64url").slice(0, 12);
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await storage.createPartnerInvite({ token, initiatorLineUserId: verifiedUser.lineUserId, expiresAt });

      const inviteUrl = `${req.protocol}://${req.get("host")}/partner/accept?token=${token}`;
      res.json({ token, expiresAt: expiresAt.toISOString(), inviteUrl });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/partner/invite/:token", async (req, res) => {
    try {
      const token = String(req.params.token || "").trim();
      if (!token) return res.status(400).json({ message: "Token required" });

      // Check without expiry filter to give proper error for expired tokens
      const invite = await storage.getPartnerInviteByTokenAny(token);

      if (!invite) return res.status(404).json({ message: "Invite not found" });
      if (new Date(invite.expiresAt) < new Date()) return res.status(410).json({ message: "Invite link has expired" });
      if (invite.status !== "pending") return res.status(409).json({ message: "Invite already used" });

      const initiatorProfile = await storage.getProfile(invite.initiatorLineUserId);
      res.json({
        initiatorDisplayName: initiatorProfile?.displayName ?? "Someone",
        initiatorPictureUrl: initiatorProfile?.pictureUrl ?? null,
        expiresAt: invite.expiresAt.toISOString(),
        status: invite.status,
      });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/partner/accept", async (req, res) => {
    try {
      const verifiedUser = await requireVerifiedLineUser(req, res);
      if (!verifiedUser) return;

      const { token } = z.object({ token: z.string().min(1) }).parse(req.body ?? {});
      const invite = await storage.getPartnerInviteByToken(token);

      if (!invite) return res.status(410).json({ message: "Invite link has expired or does not exist" });
      if (invite.status !== "pending") return res.status(409).json({ message: "Invite already used" });
      if (invite.initiatorLineUserId === verifiedUser.lineUserId) {
        return res.status(400).json({ message: "You cannot accept your own invite" });
      }

      const [initiatorProfile, acceptorProfile] = await Promise.all([
        storage.getProfile(invite.initiatorLineUserId),
        storage.getProfile(verifiedUser.lineUserId),
      ]);

      if (!initiatorProfile) return res.status(404).json({ message: "Initiator profile not found" });

      await Promise.all([
        storage.updateProfile(verifiedUser.lineUserId, {
          partnerLineUserId: invite.initiatorLineUserId,
          partnerDisplayName: initiatorProfile.displayName,
          partnerPictureUrl: initiatorProfile.pictureUrl ?? null,
        }),
        storage.updateProfile(invite.initiatorLineUserId, {
          partnerLineUserId: verifiedUser.lineUserId,
          partnerDisplayName: acceptorProfile?.displayName ?? "Your partner",
          partnerPictureUrl: acceptorProfile?.pictureUrl ?? null,
        }),
        storage.updatePartnerInvite(token, { status: "accepted", acceptedAt: new Date() }),
      ]);

      // Invalidate rec caches for both users
      invalidateRecCache(verifiedUser.lineUserId);
      invalidateRecCache(invite.initiatorLineUserId);
      invalidateRecCacheByPrefix(`partner:${verifiedUser.lineUserId}:`);
      invalidateRecCacheByPrefix(`partner:${invite.initiatorLineUserId}:`);

      res.json({
        ok: true,
        partnerDisplayName: initiatorProfile.displayName,
        partnerPictureUrl: initiatorProfile.pictureUrl ?? null,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/partner", async (req, res) => {
    try {
      const verifiedUser = await requireVerifiedLineUser(req, res);
      if (!verifiedUser) return;

      const userProfile = await storage.getProfile(verifiedUser.lineUserId);
      if (!userProfile) return res.status(404).json({ message: "Profile not found" });

      const partnerLineUserId = userProfile.partnerLineUserId;

      await storage.unlinkPartner(verifiedUser.lineUserId);
      invalidateRecCache(verifiedUser.lineUserId);
      invalidateRecCacheByPrefix(`partner:${verifiedUser.lineUserId}:`);

      if (partnerLineUserId) {
        try {
          await storage.unlinkPartner(partnerLineUserId);
          invalidateRecCache(partnerLineUserId);
          invalidateRecCacheByPrefix(`partner:${partnerLineUserId}:`);
        } catch {
          // Partner profile may no longer exist — self-unlink already done
        }
      }

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/recommendations/partner", async (req, res) => {
    try {
      const input = z.object({
        userId: z.string().min(1),
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        hour: z.coerce.number().int().min(0).max(23).optional(),
        day: z.coerce.number().int().min(0).max(6).optional(),
        limit: z.coerce.number().int().positive().max(50).optional().default(20),
      }).parse(req.query ?? {});

      const cacheKey = `partner:${input.userId}:${input.lat ?? ""}:${input.lng ?? ""}:${input.hour ?? ""}:${input.day ?? ""}:${input.limit}`;
      const cached = getRecCache(cacheKey);
      if (cached) return res.json(cached);

      const userProfile = await storage.getProfile(input.userId);
      const restaurants = await storage.getRestaurants("trending");
      const now = new Date();
      const context = {
        hourOfDay: input.hour ?? now.getHours(),
        dayOfWeek: input.day ?? now.getDay(),
      };

      if (!userProfile?.partnerLineUserId) {
        // No partner linked — fall through to single-user personalized
        const userSnapshot = await storage.getUserFeatureSnapshot(input.userId);
        const result = buildPersonalizedRecommendations({
          restaurants,
          feature: userSnapshot
            ? {
                cuisineAffinity: userSnapshot.cuisineAffinity ?? {},
                preferredPriceLevel: userSnapshot.preferredPriceLevel ?? 2,
                dislikedItemIds: userSnapshot.dislikedItemIds ?? [],
                activeHours: userSnapshot.activeHours ?? [],
              }
            : null,
          context,
          lat: input.lat,
          lng: input.lng,
          limit: input.limit,
        });
        const response = {
          source: result.source,
          linked: false,
          compatibilityScore: null,
          memberCount: 1,
          membersWithData: userSnapshot ? 1 : 0,
          items: result.items.map((r) => ({ ...r, groupScore: r.score, memberScores: [] })),
        };
        setRecCache(cacheKey, response);
        return res.json(response);
      }

      const partnerLineUserId = userProfile.partnerLineUserId;
      const [userSnapshot, partnerSnapshot, partnerProfile] = await Promise.all([
        storage.getUserFeatureSnapshot(input.userId),
        storage.getUserFeatureSnapshot(partnerLineUserId),
        storage.getProfile(partnerLineUserId),
      ]);

      const blendInput = {
        userSnapshot: userSnapshot
          ? {
              cuisineAffinity: userSnapshot.cuisineAffinity ?? {},
              preferredPriceLevel: userSnapshot.preferredPriceLevel ?? 2,
              dislikedItemIds: userSnapshot.dislikedItemIds ?? [],
              activeHours: userSnapshot.activeHours ?? [],
            }
          : null,
        partnerSnapshot: partnerSnapshot
          ? {
              cuisineAffinity: partnerSnapshot.cuisineAffinity ?? {},
              preferredPriceLevel: partnerSnapshot.preferredPriceLevel ?? 2,
              dislikedItemIds: partnerSnapshot.dislikedItemIds ?? [],
              activeHours: partnerSnapshot.activeHours ?? [],
            }
          : null,
        userLineUserId: input.userId,
        partnerLineUserId,
        userDisplayName: userProfile.displayName,
        partnerDisplayName: partnerProfile?.displayName ?? userProfile.partnerDisplayName ?? "Partner",
        userAvatarUrl: userProfile.pictureUrl,
        partnerAvatarUrl: partnerProfile?.pictureUrl ?? userProfile.partnerPictureUrl,
      };

      const blended = blendPartnerSnapshots(blendInput);
      const result = buildPersonalizedRecommendations({
        restaurants,
        feature: blended,
        context,
        lat: input.lat,
        lng: input.lng,
        limit: input.limit,
      });

      const memberEntries = buildPartnerMemberEntries(blendInput);
      const perMemberScores = computePerMemberScores(result.items, memberEntries, input.lat, input.lng, context);
      const compatibilityScore = computeCompatibilityScore(blendInput.userSnapshot, blendInput.partnerSnapshot);

      const membersWithData = [blendInput.userSnapshot, blendInput.partnerSnapshot].filter(Boolean).length;

      const items = result.items.map((r) => ({
        ...r,
        groupScore: r.score,
        memberScores: perMemberScores.get(r.id) ?? [],
      }));

      const response = {
        source: blended ? result.source : "trending" as const,
        linked: true,
        compatibilityScore,
        memberCount: 2,
        membersWithData,
        partnerDisplayName: blendInput.partnerDisplayName,
        partnerPictureUrl: blendInput.partnerAvatarUrl ?? null,
        items,
      };

      setRecCache(cacheKey, response);
      res.json(response);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid query" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Admin authentication ────────────────────────────────────────────────
  app.post("/api/admin/login", async (req, res) => {
    try {
      console.log("[admin/login] Request received:", { body: req.body, hasSession: !!req.session });
      const { email, username, password } = (req.body ?? {}) as { email?: string; username?: string; password?: string };
      const loginId = (email ?? username ?? "").trim();
      console.log("[admin/login] loginId:", loginId, "hasPassword:", !!password);
      if (!loginId || typeof password !== "string") {
        console.log("[admin/login] Missing credentials");
        return res.status(400).json({ message: "Email/username and password are required" });
      }

      // ── 1. DB lookup (by email or username) ─────────────────────────────
      let dbAdmin = await storage.getAdminUserByEmail(loginId);
      if (!dbAdmin) dbAdmin = await storage.getAdminUserByUsername(loginId);

      let resolvedRole: AdminRole = "superadmin";
      let resolvedUserId: number | undefined;
      let resolvedUsername: string = loginId;
      let passwordValid = false;

      if (dbAdmin) {
        if (!dbAdmin.isActive) {
          void appendSecurityAudit({ ts: new Date().toISOString(), level: "warn", source: "auth", message: "admin_login_inactive", metadata: { loginId, ip: req.ip } });
          return res.status(401).json({ message: "Account is disabled" });
        }
        passwordValid = await bcrypt.compare(password, dbAdmin.passwordHash);
        resolvedRole = (dbAdmin.role as AdminRole) ?? "admin";
        resolvedUserId = dbAdmin.id;
        resolvedUsername = dbAdmin.username;
      } else {
        // ── 2. Env-based fallback (backwards-compat) ────────────────────
        console.log("[admin/login] No DB user found — falling back to env credentials");
        const adminEmail = process.env.ADMIN_EMAIL ?? "";
        if (loginId.toLowerCase() !== adminEmail.toLowerCase()) {
          console.log("[admin/login] Email mismatch (env fallback)");
          void appendSecurityAudit({ ts: new Date().toISOString(), level: "warn", source: "auth", message: "admin_login_failed", metadata: { loginId, ip: req.ip } });
          return res.status(401).json({ message: "Invalid login or password" });
        }
        const hashEnv = process.env.ADMIN_PASSWORD_HASH;
        const plainEnv = process.env.ADMIN_PASSWORD;
        console.log("[admin/login] Password check - hasHash:", !!hashEnv, "hasPlain:", !!plainEnv);
        passwordValid = hashEnv
          ? await bcrypt.compare(password, hashEnv)
          : (plainEnv ? password === plainEnv : false);
        resolvedRole = "superadmin";
        resolvedUsername = loginId;
      }

      console.log("[admin/login] Password valid:", passwordValid);
      if (!passwordValid) {
        console.log("[admin/login] Password invalid");
        void appendSecurityAudit({ ts: new Date().toISOString(), level: "warn", source: "auth", message: "admin_login_failed", metadata: { loginId, ip: req.ip } });
        return res.status(401).json({ message: "Invalid login or password" });
      }

      if (!req.session) {
        console.log("[admin/login] ❌ Session middleware unavailable - req.session is undefined");
        return res.status(500).json({ message: "Session middleware unavailable" });
      }
      console.log("[admin/login] Session OK, setting admin flags. sessionID:", req.sessionID);
      req.session.isAdmin = true;
      req.session.adminRole = resolvedRole;
      req.session.adminUserId = resolvedUserId;
      req.session.sessionType = "admin";
      req.session.username = resolvedUsername;

      // Explicitly save session so we can catch DB write errors
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("[admin/login] ❌ Session SAVE failed:", err);
            reject(err);
          } else {
            console.log("[admin/login] ✅ Session saved OK, sessionID:", req.sessionID);
            resolve();
          }
        });
      });

      void appendSecurityAudit({ ts: new Date().toISOString(), level: "info", source: "auth", message: "admin_login_success", metadata: { loginId, role: resolvedRole, ip: req.ip } });
      console.log("[admin/login] ✅ Login success for:", resolvedUsername, "role:", resolvedRole);
      return res.json({ ok: true, username: resolvedUsername, role: resolvedRole });
    } catch (err) {
      console.error("[admin/login] ❌ ERROR:", err);
      return res.status(500).json({ message: "Internal server error", detail: String(err) });
    }
  });

  // ── Admin user management ─────────────────────────────────────────────────
  app.get("/api/admin/admin-users", async (req, res) => {
    if (!requirePermission("manage_users")(req, res)) return;
    try {
      const users = await storage.listAdminUsers();
      // Strip password_hash before returning
      const safe = users.map(({ passwordHash: _ph, ...rest }) => rest);
      return res.json(safe);
    } catch {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/admin-users", async (req, res) => {
    if (!requirePermission("manage_users")(req, res)) return;
    try {
      const input = z.object({
        username: z.string().min(2).max(64),
        password: z.string().min(6),
        role: z.enum(["superadmin", "admin", "moderator", "viewer"]).default("viewer"),
        permissions: z.array(z.string()).optional(),
      }).parse(req.body ?? {});

      const existing = await storage.getAdminUserByUsername(input.username);
      if (existing) return res.status(409).json({ message: "Username already taken" });

      const passwordHash = await bcrypt.hash(input.password, 10);
      const perms = (input.permissions as AdminPermission[] | undefined) ?? ROLE_DEFAULT_PERMISSIONS[input.role] ?? [];
      const created = await storage.createAdminUser({
        username: input.username,
        email: `${input.username}@admin.local`,
        passwordHash,
        role: input.role,
        permissions: perms,
        isActive: true,
      });
      const { passwordHash: _ph, ...safe } = created;
      void appendSecurityAudit({ ts: new Date().toISOString(), level: "info", source: "admin", message: "admin_user_created", metadata: { newUsername: created.username, role: created.role, by: req.session.username } });
      return res.status(201).json(safe);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: err.errors });
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/admin-users/:id", async (req, res) => {
    if (!requirePermission("manage_users")(req, res)) return;
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID" });

      const input = z.object({
        role: z.enum(["superadmin", "admin", "moderator", "viewer"]).optional(),
        permissions: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
        password: z.string().min(6).optional(),
      }).parse(req.body ?? {});

      const updates: Record<string, unknown> = {};
      if (input.role !== undefined) updates.role = input.role;
      if (input.permissions !== undefined) updates.permissions = input.permissions;
      if (input.isActive !== undefined) updates.isActive = input.isActive;
      if (input.password) updates.passwordHash = await bcrypt.hash(input.password, 10);

      const updated = await storage.updateAdminUser(id, updates as Parameters<typeof storage.updateAdminUser>[1]);
      if (!updated) return res.status(404).json({ message: "Admin user not found" });

      const { passwordHash: _ph, ...safe } = updated;
      void appendSecurityAudit({ ts: new Date().toISOString(), level: "info", source: "admin", message: "admin_user_updated", metadata: { targetId: id, changes: Object.keys(updates), by: req.session.username } });
      return res.json(safe);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: err.errors });
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Sponsored requests ─────────────────────────────────────────────────────
  // Owner submits a request
  app.post("/api/sponsored-requests", async (req, res) => {
    if (!requireOwnerOrAdmin(req, res)) return;
    try {
      const input = z.object({
        restaurantId: z.number().int().positive(),
        ownerId: z.number().int().positive(),
        requestedStartDate: z.string().optional(),
        requestedEndDate: z.string().optional(),
        notes: z.string().max(500).optional(),
      }).parse(req.body ?? {});
      const created = await storage.createSponsoredRequest({ ...input, status: "pending" });
      return res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: err.errors });
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin lists pending/all sponsored requests
  app.get("/api/admin/sponsored-requests", async (req, res) => {
    if (!requirePermission("manage_campaigns")(req, res)) return;
    try {
      const status = (req.query.status as string | undefined) || undefined;
      const requests = await storage.listSponsoredRequests(status);
      return res.json(requests);
    } catch {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin approves / rejects a sponsored request
  app.patch("/api/admin/sponsored-requests/:id", async (req, res) => {
    if (!requirePermission("manage_campaigns")(req, res)) return;
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const input = z.object({
        status: z.enum(["approved", "rejected"]),
        reviewNotes: z.string().max(500).optional(),
      }).parse(req.body ?? {});

      const request = await storage.getSponsoredRequestById(id);
      if (!request) return res.status(404).json({ message: "Sponsored request not found" });

      const updated = await storage.updateSponsoredRequest(id, {
        status: input.status,
        reviewNotes: input.reviewNotes ?? null,
        reviewedAt: new Date(),
      });

      // On approval, flip is_sponsored on the restaurant with the date range
      if (input.status === "approved") {
        await storage.updateRestaurant(request.restaurantId, {
          isSponsored: true,
          sponsoredUntil: request.requestedEndDate ?? null,
        });
      }

      return res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: err.errors });
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/owner-login", async (req, res) => {
    try {
      const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
      const loginEmail = (email ?? "").trim();
      if (!loginEmail || typeof password !== "string") {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const dbOwner = await storage.getRestaurantOwnerByEmail(loginEmail);
      const ownerEmail = (dbOwner?.email ?? process.env.OWNER_EMAIL ?? "owner@example.com").trim();
      const ownerHashEnv = process.env.OWNER_PASSWORD_HASH;
      const ownerPlainEnv = process.env.OWNER_PASSWORD ?? "change-me-owner";
      const ownerPasswordValid = ownerHashEnv
        ? await bcrypt.compare(password, ownerHashEnv)
        : password === ownerPlainEnv;
      if (loginEmail.toLowerCase() !== ownerEmail.toLowerCase() || !ownerPasswordValid) {
        void appendSecurityAudit({
          ts: new Date().toISOString(),
          level: "warn",
          source: "auth",
          message: "owner_login_failed",
          metadata: { loginEmail, ip: req.ip },
        });
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const preferredRestaurantId = dbOwner?.restaurantId ?? Number(process.env.OWNER_RESTAURANT_ID ?? "");
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
        id: dbOwner?.id ?? 1,
        email: ownerEmail,
        displayName: dbOwner?.displayName ?? process.env.OWNER_DISPLAY_NAME ?? "Restaurant Owner",
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        isVerified: dbOwner?.isVerified ?? true,
        subscriptionTier: dbOwner?.subscriptionTier ?? process.env.OWNER_SUBSCRIPTION_TIER ?? "pro",
      });
    } catch {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/owners/register", async (req, res) => {
    try {
      const input = z.object({
        displayName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        lineUserId: z.string().optional(),
        restaurantId: z.number().int().positive().optional(),
        restaurantName: z.string().optional(),
        ownershipType: z.string().optional().default("single_location"),
      }).parse(req.body ?? {});

      const existingOwner = await storage.getRestaurantOwnerByEmail(input.email);
      if (existingOwner) {
        return res.status(409).json({ message: "Owner with this email already exists", ownerId: existingOwner.id });
      }

      let restaurantId = input.restaurantId;
      if (!restaurantId) {
        const restaurants = await storage.getRestaurants();
        const byName = restaurants.find((r) =>
          input.restaurantName ? r.name.toLowerCase().includes(input.restaurantName.toLowerCase()) : false,
        );
        if (!byName) return res.status(400).json({ message: "Restaurant not found. Provide a valid restaurant name or ID." });
        restaurantId = byName.id;
      }

      const owner = await storage.createRestaurantOwner({
        restaurantId,
        lineUserId: input.lineUserId ?? null,
        displayName: input.displayName,
        email: input.email,
        phone: input.phone ?? null,
        isVerified: false,
        verificationStatus: "pending",
        subscriptionTier: "free",
        subscriptionExpiry: null,
        paymentConnected: false,
        paymentMethod: null,
      });

      const claim = await storage.createRestaurantClaim({
        restaurantId,
        ownerId: owner.id,
        ownershipType: input.ownershipType,
        status: "pending",
        reviewNotes: null,
        proofDocuments: [],
        verificationChecklist: {},
      });

      res.status(201).json({ owner, claim });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/owners/:id", async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid owner ID" });
      const owner = await storage.getRestaurantOwnerById(id);
      if (!owner) return res.status(404).json({ message: "Owner not found" });
      const claims = (await storage.listRestaurantClaims()).filter((claim) => claim.ownerId === owner.id);
      res.json({ owner, claims });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/claims", async (req, res) => {
    try {
      const input = insertRestaurantClaimSchema.parse(req.body ?? {});
      const created = await storage.createRestaurantClaim(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
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
      const role: AdminRole = req.session.adminRole ?? "superadmin";
      return res.json({
        isAdmin: true,
        username: req.session.username ?? process.env.ADMIN_EMAIL ?? "admin",
        role,
        permissions: ROLE_DEFAULT_PERMISSIONS[role] ?? [],
        sessionType: "admin",
      });
    }
    if (req.session?.sessionType === "owner") {
      return res.json({
        isAdmin: false,
        role: "owner",
        permissions: [],
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
      const query = z.object({
        status: z.enum(["draft", "active", "paused", "ended"]).optional(),
        search: z.string().optional(),
        page: z.coerce.number().int().min(1).optional().default(1),
        pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
      }).parse(req.query ?? {});

      const allCampaigns = await storage.listCampaigns();
      const normalizedSearch = (query.search ?? "").trim().toLowerCase();
      const filtered = allCampaigns.filter((campaign) => {
        if (query.status && campaign.status !== query.status) return false;
        if (!normalizedSearch) return true;
        return (
          campaign.title.toLowerCase().includes(normalizedSearch) ||
          campaign.restaurantOwnerKey.toLowerCase().includes(normalizedSearch)
        );
      });

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
      const page = Math.min(query.page, totalPages);
      const start = (page - 1) * query.pageSize;
      const items = filtered.slice(start, start + query.pageSize);

      const impressions = filtered.reduce((sum, item) => sum + (item.impressions ?? 0), 0);
      const clicks = filtered.reduce((sum, item) => sum + (item.clicks ?? 0), 0);
      const spent = filtered.reduce((sum, item) => sum + (item.spent ?? 0), 0);
      const ctrPct = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;

      res.json({
        items,
        total,
        page,
        pageSize: query.pageSize,
        totalPages,
        summary: {
          impressions,
          clicks,
          ctrPct,
          spent,
        },
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async function listCampaignsLegacyHandler(req: Request, res: Response) {
    try {
      if (!requireAdminSession(req, res)) return;
      const campaigns = await storage.listCampaigns();
      res.json(campaigns);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async function getCampaignHandler(req: Request, res: Response) {
    try {
      if (!requireAdminSession(req, res)) return;
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
  app.get("/api/campaigns", listCampaignsLegacyHandler);
  app.patch("/api/campaigns/:id", updateCampaignHandler);
  app.delete("/api/campaigns/:id", deleteCampaignHandler);

  function isBannerCurrentlyLive(banner: { isActive: boolean; startDate: string | null; endDate: string | null }): boolean {
    if (!banner.isActive) return false;
    const today = new Date().toISOString().slice(0, 10);
    const startDate = banner.startDate?.trim().slice(0, 10);
    const endDate = banner.endDate?.trim().slice(0, 10);
    if (startDate && startDate > today) return false;
    if (endDate && endDate < today) return false;
    return true;
  }

  app.get("/api/public/banners", async (req, res) => {
    try {
      const position = typeof req.query.position === "string" ? req.query.position.trim() : undefined;
      const limitParam = typeof req.query.limit === "string" ? Number(req.query.limit) : NaN;
      const limit = Number.isFinite(limitParam)
        ? Math.min(Math.max(Math.floor(limitParam), 1), 10)
        : 3;

      const banners = await storage.listPublicActiveBanners(position);
      res.json(banners.slice(0, limit));
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/public/banners/:id/impression", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid banner id" });

      const existing = await storage.getBannerById(id);
      if (!existing || !isBannerCurrentlyLive(existing)) {
        return res.status(404).json({ message: "Banner not found" });
      }

      const updated = await storage.incrementBannerImpressions(id);
      if (!updated) return res.status(404).json({ message: "Banner not found" });
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/public/banners/:id/click", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid banner id" });

      const existing = await storage.getBannerById(id);
      if (!existing || !isBannerCurrentlyLive(existing)) {
        return res.status(404).json({ message: "Banner not found" });
      }

      const updated = await storage.incrementBannerClicks(id);
      if (!updated) return res.status(404).json({ message: "Banner not found" });
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/banners", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
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
      if (!requirePermission("manage_config")(req, res)) return;
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
      if (!requirePermission("manage_config")(req, res)) return;
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
      if (!requirePermission("manage_config")(req, res)) return;
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
      if (!requirePermission("manage_config")(req, res)) return;
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
      if (!requirePermission("manage_config")(req, res)) return;
      const { serviceId } = z.object({ serviceId: z.enum(ALLOWED_SERVICE_IDS) }).parse(req.params);
      const key = getKey(serviceId);
      if (!key) {
        return res.status(400).json({ ok: false, message: "API key not configured" });
      }

      if (serviceId === "google_places") {
        const probeRes = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": "places.id",
          },
          body: JSON.stringify({
            locationRestriction: { circle: { center: { latitude: 13.7563, longitude: 100.5018 }, radiusMeters: 100 } },
            includedTypes: ["restaurant"],
            maxResultCount: 1,
          }),
        });
        const probeJson = await probeRes.json() as { places?: unknown[]; error?: { status?: string; message?: string } };
        if (!probeRes.ok || probeJson.error) {
          const msg = probeJson.error?.message ?? `HTTP ${probeRes.status}`;
          return res.json({ ok: false, message: `Key rejected by Google Places (New): ${msg}` });
        }
        return res.json({ ok: true, message: "Google Places API (New) responded OK" });
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

  app.get("/api/admin/menus/stats", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const stats = await storage.getMenuAdminStats();
      res.json(stats);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/menus/generate", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const input = z.object({
        restaurantId: z.number().int().positive().optional(),
        force: z.boolean().optional().default(false),
      }).parse(req.body ?? {});

      const selectedRestaurants = input.restaurantId
        ? (() => {
            const id = input.restaurantId!;
            return storage.getRestaurantById(id).then((restaurant) => (restaurant ? [restaurant] : []));
          })()
        : storage.getRestaurants();

      const restaurants = (await selectedRestaurants).map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        category: restaurant.category,
        description: restaurant.description ?? "",
        district: restaurant.district ?? null,
        priceLevel: restaurant.priceLevel ?? 2,
      }));

      if (!restaurants.length) {
        return res.status(404).json({ message: "No restaurants found for generation scope" });
      }

      const jobId = createMenuGenerateJobId();
      const now = new Date().toISOString();
      const job: MenuGenerateJob = {
        jobId,
        status: "running",
        restaurantId: input.restaurantId ?? null,
        force: input.force,
        summary: {
          selected: restaurants.length,
          processed: 0,
          generatedRestaurants: 0,
          generatedItems: 0,
          skippedRestaurants: 0,
          failedRestaurants: 0,
        },
        results: [],
        startedAt: now,
      };
      menuGenerateJobs.set(jobId, job);
      pruneMenuGenerateJobs();

      setTimeout(() => {
        void runMenuGenerationJob(jobId, restaurants);
      }, 0);

      res.status(202).json({
        jobId,
        status: "running",
        totalRestaurants: restaurants.length,
        startedAt: now,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/menus/generate/:jobId", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const jobId = String(req.params.jobId ?? "").trim();
      if (!jobId) return res.status(400).json({ message: "Invalid job id" });
      const job = menuGenerateJobs.get(jobId);
      if (!job) return res.status(404).json({ message: "Job not found" });
      res.json(job);
    } catch {
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

  async function getStoredOwners(): Promise<StoredOwner[]> {
    const config = await storage.getAdminConfig(OWNERS_CONFIG_KEY);
    const items = Array.isArray(config?.value?.items) ? (config?.value?.items as unknown[]) : [];
    return items as StoredOwner[];
  }

  async function saveStoredOwners(items: StoredOwner[]) {
    await storage.upsertAdminConfig(OWNERS_CONFIG_KEY, {
      updatedAt: new Date().toISOString(),
      items,
    });
  }

  async function getStoredClaims(): Promise<StoredClaim[]> {
    const config = await storage.getAdminConfig(CLAIMS_CONFIG_KEY);
    const items = Array.isArray(config?.value?.items) ? (config?.value?.items as unknown[]) : [];
    return items as StoredClaim[];
  }

  async function saveStoredClaims(items: StoredClaim[]) {
    await storage.upsertAdminConfig(CLAIMS_CONFIG_KEY, {
      updatedAt: new Date().toISOString(),
      items,
    });
  }

  app.get("/api/admin/owners", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const owners = await storage.listRestaurantOwners();
      res.json(owners);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/claims", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const [claims, owners, restaurants] = await Promise.all([
        storage.listRestaurantClaims(),
        storage.listRestaurantOwners(),
        storage.getRestaurants(),
      ]);
      const ownerById = new Map(owners.map((o) => [o.id, o as any]));
      const restaurantById = new Map(restaurants.map((r) => [r.id, r]));
      const enriched = (claims as any[])
        .slice()
        .sort((a, b) => new Date(b.submittedAt ?? b.submitted_at).getTime() - new Date(a.submittedAt ?? a.submitted_at).getTime())
        .map((claim) => {
          const owner = ownerById.get(claim.ownerId);
          const restaurant = restaurantById.get(claim.restaurantId);
          return {
            ...claim,
            restaurantName: restaurant?.name ?? `Restaurant #${claim.restaurantId}`,
            ownerName: owner?.displayName ?? "Unknown owner",
            ownerEmail: owner?.email ?? "",
            ownerPhone: owner?.phone ?? "",
            restaurantAddress: restaurant?.address ?? "",
            restaurantCategory: restaurant?.category ?? "",
            restaurantImageUrl: restaurant?.imageUrl ?? "",
          };
        });
      res.json(enriched);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/claims", async (req, res) => {
    try {
      if (!requireOwnerOrAdmin(req, res)) return;
      const input = insertRestaurantClaimSchema.parse(req.body ?? {});
      const created = await storage.createRestaurantClaim(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/claims/bootstrap-test", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const input = z.object({
        restaurantId: z.number().int().positive().optional(),
      }).parse(req.body ?? {});

      const restaurants = await storage.getRestaurants();
      const targetRestaurant =
        typeof input.restaurantId === "number"
          ? restaurants.find((r) => r.id === input.restaurantId)
          : restaurants[0];
      if (!targetRestaurant) {
        return res.status(400).json({ message: "No restaurants available for test claim bootstrap" });
      }

      const [owners, claims] = await Promise.all([getStoredOwners(), getStoredClaims()]);
      const testEmail = "test-owner@example.com";
      let owner = owners.find((o) => o.email.toLowerCase() === testEmail);
      if (!owner) {
        const nextOwnerId = owners.reduce((max, item) => Math.max(max, item.id), 0) + 1;
        owner = {
          id: nextOwnerId,
          restaurantId: targetRestaurant.id,
          displayName: "Test Owner",
          email: testEmail,
          phone: "+66-000-000-000",
          isVerified: false,
          paymentConnected: false,
          paymentMethod: null,
          subscriptionTier: "free",
          subscriptionExpiry: null,
          verificationStatus: "pending",
        };
        await saveStoredOwners([owner, ...owners]);
      }

      const existingClaim = claims.find(
        (c) => c.ownerId === owner!.id && c.restaurantId === targetRestaurant.id && c.status === "pending",
      );
      if (existingClaim) {
        return res.status(200).json({ owner, claim: existingClaim, reused: true });
      }

      const nextClaimId = claims.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      const claim: StoredClaim = {
        id: nextClaimId,
        restaurantId: targetRestaurant.id,
        ownerId: owner.id,
        ownershipType: "single_location",
        status: "pending",
        submittedAt: new Date().toISOString(),
        reviewNotes: null,
        notes: "Auto-generated test claim",
        proofDocuments: ["https://example.com/test-proof.pdf"],
        verificationChecklist: [
          { id: "business_license", label: "Business license", checked: true },
          { id: "id_match", label: "Owner ID matches profile", checked: false },
        ],
      };
      await saveStoredClaims([claim, ...claims]);
      res.status(201).json({ owner, claim, reused: false });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/claims/:id", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid claim id" });
      const input = z.object({
        status: z.enum(["pending", "approved", "rejected"]),
        reviewNotes: z.string().optional(),
        verificationChecklist: z.record(z.boolean()).optional(),
      }).parse(req.body ?? {});

      const existing = (await storage.listRestaurantClaims()).find((claim) => claim.id === id);
      if (!existing) return res.status(404).json({ message: "Claim not found" });

      const updated = await storage.updateRestaurantClaim(id, {
        status: input.status,
        reviewNotes: input.reviewNotes ?? existing.reviewNotes ?? null,
        verificationChecklist: (input.verificationChecklist ?? existing.verificationChecklist ?? {}) as Record<string, boolean>,
      });
      if (!updated) return res.status(404).json({ message: "Claim not found" });

      if (updated.status === "approved") {
        await storage.updateRestaurantOwner(updated.ownerId, {
          restaurantId: updated.restaurantId,
          isVerified: true,
          verificationStatus: "approved",
        });
      } else if (updated.status === "rejected") {
        await storage.updateRestaurantOwner(updated.ownerId, {
          isVerified: false,
          verificationStatus: "rejected",
        });
      }

      res.json(updated as any);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/claims/:id", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid claim id" });
      const input = z.object({
        status: z.enum(["pending", "approved", "rejected"]),
        reviewNotes: z.string().optional(),
        verificationChecklist: z.record(z.boolean()).optional(),
      }).parse(req.body ?? {});

      const existing = (await storage.listRestaurantClaims()).find((claim) => claim.id === id);
      if (!existing) return res.status(404).json({ message: "Claim not found" });

      const updated = await storage.updateRestaurantClaim(id, {
        status: input.status,
        reviewNotes: input.reviewNotes ?? existing.reviewNotes ?? null,
        verificationChecklist: input.verificationChecklist ?? (existing.verificationChecklist as Record<string, boolean> ?? {}),
      });
      if (!updated) return res.status(404).json({ message: "Claim not found" });

      if (updated.status === "approved") {
        await storage.updateRestaurantOwner(updated.ownerId, {
          restaurantId: updated.restaurantId,
          isVerified: true,
          verificationStatus: "approved",
        });
      } else if (updated.status === "rejected") {
        await storage.updateRestaurantOwner(updated.ownerId, {
          isVerified: false,
          verificationStatus: "rejected",
        });
      }

      res.json(updated as any);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/owner/search-restaurants", async (req, res) => {
    try {
      if (!requireOwnerOrAdmin(req, res)) return;
      const q = String(req.query.q ?? "").trim().toLowerCase();
      if (q.length < 2) return res.json([]);
      const restaurants = await storage.getRestaurants();
      const items = restaurants
        .filter((r) => (
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)
        ))
        .slice(0, 20)
        .map((r) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          address: r.address,
          imageUrl: r.imageUrl,
          rating: r.rating,
          priceLevel: r.priceLevel,
        }));
      res.json(items);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/owner/dashboard", async (req, res) => {
    try {
      if (!requireOwnerOrAdmin(req, res)) return;
      const ownerEmail = req.session?.ownerEmail ?? process.env.OWNER_EMAIL ?? "owner@example.com";
      const [owners, claims, restaurants, campaigns, events] = await Promise.all([
        getStoredOwners(),
        getStoredClaims(),
        storage.getRestaurants(),
        storage.listCampaigns(),
        storage.listEventLogs(2000),
      ]);

      let owner = owners.find((o) => o.email.toLowerCase() === ownerEmail.toLowerCase());
      if (!owner) {
        const nextId = owners.reduce((max, item) => Math.max(max, item.id), 0) + 1;
        owner = {
          id: nextId,
          restaurantId: req.session?.ownerRestaurantId ?? 0,
          displayName: process.env.OWNER_DISPLAY_NAME ?? "Restaurant Owner",
          email: ownerEmail,
          phone: null,
          isVerified: false,
          paymentConnected: false,
          subscriptionTier: process.env.OWNER_SUBSCRIPTION_TIER ?? "free",
          subscriptionExpiry: null,
          verificationStatus: "pending",
        };
        await saveStoredOwners([owner, ...owners]);
      }

      const restaurant = owner.restaurantId ? restaurants.find((r) => r.id === owner?.restaurantId) ?? null : null;
      const ownerClaims = claims.filter((c) => c.ownerId === owner?.id);
      const ownerCampaigns = campaigns.filter((c) => (
        owner?.restaurantId ? c.restaurantOwnerKey === `owner_${owner.restaurantId}` : false
      ));
      const relatedEvents = owner?.restaurantId ? events.filter((e) => e.itemId === owner?.restaurantId) : [];
      const stats = {
        views: relatedEvents.filter((e) => e.eventType === "view_card" || e.eventType === "view_detail").length,
        likes: relatedEvents.filter((e) => e.eventType === "favorite").length,
        saves: relatedEvents.filter((e) => e.eventType === "favorite").length,
        deliveryTaps: relatedEvents.filter((e) => e.eventType === "order_click" || e.eventType === "booking_click" || e.eventType === "deeplink_click").length,
      };

      res.json({
        owner: {
          id: owner.id,
          email: owner.email,
          displayName: owner.displayName,
          phone: owner.phone ?? null,
          restaurantId: owner.restaurantId || null,
          isVerified: owner.isVerified ?? false,
          verificationStatus: owner.verificationStatus ?? "pending",
          subscriptionTier: owner.subscriptionTier ?? "free",
          subscriptionExpiry: owner.subscriptionExpiry ?? null,
        },
        restaurant: restaurant ? {
          id: restaurant.id,
          name: restaurant.name,
          category: restaurant.category,
          address: restaurant.address,
          imageUrl: restaurant.imageUrl,
          rating: restaurant.rating,
          priceLevel: restaurant.priceLevel,
          ownerClaimStatus: ownerClaims[0]?.status ?? null,
        } : null,
        campaigns: ownerCampaigns,
        claims: ownerClaims,
        stats,
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

  app.post("/api/admin/restaurants/import/osm", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const input = z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        radius: z.number().int().min(100).max(50000).optional().default(2000),
        enrichWithGoogle: z.boolean().optional().default(true),
      }).parse(req.body);

      const osmPlaces = await queryOverpass(input.lat, input.lng, input.radius);

      let googleMap = new Map<string, NormalizedPlace>();
      if (input.enrichWithGoogle) {
        const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
        if (apiKey) {
          const googlePlaces = await queryGoogle(input.lat, input.lng, input.radius);
          for (const gp of googlePlaces) {
            const key = gp.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            googleMap.set(key, gp);
          }
        }
      }

      let saved = 0;
      let failed = 0;
      const results: { name: string; id: number; enriched: boolean }[] = [];

      for (const place of osmPlaces) {
        try {
          const key = place.name.toLowerCase().replace(/[^a-z0-9]/g, "");
          const google = googleMap.get(key);
          const enriched: NormalizedPlace = {
            ...place,
            rating: place.rating ?? google?.rating,
            priceLevel: place.priceLevel ?? google?.priceLevel,
            photos: (google?.photos?.length ? google.photos : place.photos) ?? [],
            phone: place.phone ?? google?.phone,
          };
          const id = await storage.findOrCreateFromPlace(enriched);
          await storage.updateRestaurant(id, {
            osmId: place.id,
            ...(google?.photos?.length ? {
              imageUrl: google.photos[0],
              photos: google.photos,
              rating: enriched.rating ?? "N/A",
              priceLevel: enriched.priceLevel ?? 2,
              googlePlaceId: google.id.startsWith("google:") ? google.id.slice(7) : undefined,
            } : {}),
          });
          results.push({ name: place.name, id, enriched: !!google });
          saved += 1;
        } catch {
          failed += 1;
        }
      }

      await storage.createPlacesRequestLog({
        source: "osm",
        cacheHit: false,
        fallbackUsed: input.enrichWithGoogle,
        query: "admin-import:osm",
        resultCount: saved,
      });

      res.json({ ok: true, fetched: osmPlaces.length, saved, failed, results });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ message });
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
          // Use rich data already returned by Nearby Search (new API returns it in one call).
          // Only fall back to a separate Details call if the nearby result lacks the data.
          const shouldFetchDetails = input.includeDetails && i < detailsLimit && !place._details;
          const details: GoogleDetailsResult | null = place._details ?? (shouldFetchDetails ? await fetchGoogleDetails(apiKey, place.place_id) : null);
          if (shouldFetchDetails) {
            logImport(
              run,
              `Details ${details ? "loaded" : "not available"} for ${placeName} (placeId=${placeId})`,
            );
          } else if (place._details) {
            logImport(run, `Details pre-loaded from Nearby Search for ${placeName}`);
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
          const allPhotoRefs = (details?.photos ?? place.photos ?? []).slice(0, 5);
          const allPhotoUrls = allPhotoRefs
            .map((p: { photo_reference: string }) => p.photo_reference ? toPhotoUrl(p.photo_reference, apiKey) : null)
            .filter((u): u is string => !!u);
          const imageUrl = allPhotoUrls[0] ?? "";
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
            photos: allPhotoUrls,
            phone: details?.formatted_phone_number,
            source: "google",
          };

          const id = await storage.findOrCreateFromPlace(normalized);
          await storage.updateRestaurant(id, {
            name: placeName,
            description: category,
            imageUrl,
            photos: allPhotoUrls,
            lat: String(lat),
            lng: String(lng),
            category,
            priceLevel: safePrice,
            rating,
            address,
            phone: details?.formatted_phone_number ?? null,
            openingHours: openingHours ?? null,
            reviews: reviews ?? null,
            googlePlaceId: place.place_id,
            reviewCount: details?.reviews?.length ?? 0,
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

  // Re-enrich images: fetch Google photo for restaurants with empty imageUrl
  app.post("/api/admin/restaurants/re-enrich-images", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
      if (!apiKey) return res.status(400).json({ message: "GOOGLE_PLACES_API_KEY not configured" });

      const input = z.object({
        limit: z.number().int().min(1).max(200).optional().default(50),
        includeLegacy: z.boolean().optional().default(true),
      }).parse(req.body ?? {});

      const all = await storage.getRestaurants();
      const missing = all
        .filter((r) => !r.imageUrl || (input.includeLegacy && isLegacyGooglePhotoUrl(r.imageUrl)))
        .slice(0, input.limit);

      let updated = 0;
      let failed = 0;

      for (const r of missing) {
        try {
          const lat = Number(r.lat);
          const lng = Number(r.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) { failed++; continue; }

          const nearby = await fetchGoogleNearby(apiKey, lat, lng, 50, r.name, 1);
          if (!nearby.length) { failed++; continue; }

          const photoRef = nearby[0].photos?.[0]?.photo_reference;
          if (!photoRef) { failed++; continue; }

          const imageUrl = toPhotoUrl(photoRef, apiKey);
          await storage.updateRestaurant(r.id, { imageUrl, photos: [imageUrl] });
          updated++;
        } catch {
          failed++;
        }
      }

      res.json({ ok: true, total: missing.length, updated, failed });
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  // Auto-assign vibes to ALL restaurants (bulk)
  app.post("/api/admin/restaurants/auto-assign-vibes/preview", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const input = z.object({
        limit: z.number().int().min(1).max(1000).optional().default(500),
        onlyChanged: z.boolean().optional().default(true),
        search: z.string().optional().default(""),
      }).parse(req.body ?? {});

      const all = await storage.getRestaurants();
      const search = input.search.trim().toLowerCase();
      const filtered = search
        ? all.filter((r) =>
            r.name.toLowerCase().includes(search) ||
            r.category.toLowerCase().includes(search) ||
            r.address.toLowerCase().includes(search),
          )
        : all;

      const selected = filtered.slice(0, input.limit);
      const rows = selected.map((r) => {
        const before = normalizeVibes(r.vibes);
        const after = autoAssignVibes(r);
        const added = after.filter((v) => !before.includes(v));
        const removed = before.filter((v) => !after.includes(v));
        const changed = added.length > 0 || removed.length > 0;
        return {
          id: r.id,
          name: r.name,
          category: r.category,
          priceLevel: r.priceLevel,
          rating: r.rating,
          before,
          after,
          added,
          removed,
          changed,
        };
      });

      const changedCount = rows.filter((row) => row.changed).length;
      const items = input.onlyChanged ? rows.filter((row) => row.changed) : rows;

      res.json({
        scanned: selected.length,
        changed: changedCount,
        unchanged: selected.length - changedCount,
        onlyChanged: input.onlyChanged,
        items,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Auto-assign vibes to ALL restaurants (bulk)
  app.post("/api/admin/restaurants/auto-assign-vibes", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const input = z.object({
        ids: z.array(z.number().int().positive()).optional().default([]),
      }).parse(req.body ?? {});

      const all = await storage.getRestaurants();
      const targetIds = new Set(input.ids);
      const targets = targetIds.size > 0 ? all.filter((r) => targetIds.has(r.id)) : all;
      let updated = 0;
      let skipped = 0;

      for (const r of targets) {
        const nextVibes = autoAssignVibes(r);
        if (sameVibes(r.vibes, nextVibes)) {
          skipped += 1;
          continue;
        }
        await storage.updateRestaurant(r.id, { vibes: nextVibes });
        updated++;
      }

      res.json({ scanned: targets.length, updated, skipped });
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
        imageUrl: z.string().min(1),
        lat: z.string().min(1),
        lng: z.string().min(1),
        category: z.string().min(1),
        priceLevel: z.number().int().min(1).max(4),
        rating: z.string().min(1),
        address: z.string().min(1),
        isNew: z.boolean().optional().default(false),
        trendingScore: z.number().int().optional().default(0),
        phone: z.string().nullable().optional(),
        vibes: z.array(z.string()).optional().default([]),
        district: z.string().nullable().optional(),
        openingHours: z.array(z.object({
          day: z.string().min(1),
          hours: z.string().min(1),
        })).nullable().optional(),
        reviews: z.array(z.object({
          author: z.string().min(1),
          rating: z.number().min(1).max(5),
          text: z.string().min(1),
          timeAgo: z.string().optional(),
        })).nullable().optional(),
        photos: z.array(z.string()).max(20).optional(),
      }).parse(req.body);
      const normalizedCover = input.imageUrl.trim();
      const normalizedPhotos = Array.from(new Set([
        ...(input.photos ?? []),
        normalizedCover,
      ].map((url) => String(url ?? "").trim()).filter(Boolean))).slice(0, 20);

      const created = await storage.createRestaurant({
        ...input,
        imageUrl: normalizedCover,
        photos: normalizedPhotos,
      });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Auto-assign vibes to a single restaurant
  app.post("/api/admin/restaurants/:id/auto-assign-vibes", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid restaurant id" });
      const restaurant = await storage.getRestaurantById(id);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const vibes = autoAssignVibes(restaurant);
      const updated = await storage.updateRestaurant(id, { vibes });
      res.json(updated);
    } catch {
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
          imageUrl: z.string().min(1).optional(),
          lat: z.string().min(1).optional(),
          lng: z.string().min(1).optional(),
          category: z.string().min(1).optional(),
          priceLevel: z.number().int().min(1).max(4).optional(),
          rating: z.string().min(1).optional(),
          address: z.string().min(1).optional(),
          isNew: z.boolean().optional(),
          trendingScore: z.number().int().optional(),
          phone: z.string().nullable().optional(),
          vibes: z.array(z.string()).optional(),
          district: z.string().nullable().optional(),
          openingHours: z.array(z.object({
            day: z.string().min(1),
            hours: z.string().min(1),
          })).nullable().optional(),
          reviews: z.array(z.object({
            author: z.string().min(1),
            rating: z.number().min(1).max(5),
            text: z.string().min(1),
            timeAgo: z.string().optional(),
          })).nullable().optional(),
          photos: z.array(z.string()).max(20).optional(),
        })
        .parse(req.body);
      const current = await storage.getRestaurantById(id);
      if (!current) return res.status(404).json({ message: "Restaurant not found" });

      const nextUpdates: Partial<InsertRestaurant> = { ...updates };
      if (typeof updates.imageUrl === "string" || updates.photos) {
        const candidateCover = typeof updates.imageUrl === "string" ? updates.imageUrl.trim() : current.imageUrl;
        const candidatePhotos = Array.from(new Set([
          ...(updates.photos ?? current.photos ?? []),
          candidateCover,
        ].map((url) => String(url ?? "").trim()).filter(Boolean))).slice(0, 20);
        nextUpdates.imageUrl = candidateCover;
        nextUpdates.photos = candidatePhotos;
      }

      const updated = await storage.updateRestaurant(id, nextUpdates);
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
      if (!requirePermission("manage_users")(req, res)) return;
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
      if (!requirePermission("manage_users")(req, res)) return;
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
      const [events, allRestaurants] = await Promise.all([
        storage.listEventLogs(10000),
        storage.getRestaurants(),
      ]);
      const now = new Date();
      const hour = now.getHours();

      // Event counts by type
      const byType = (type: string) => events.filter(e => e.eventType === type).length;
      const impressions = byType("view_card") + byType("view_detail");
      const swipeRights = byType("swipe_right");
      const saves = byType("favorite");
      const deliveryTaps = byType("order_click") + byType("booking_click");
      const detailViews = byType("view_detail");
      const mapTaps = byType("map_click");

      // Hourly distribution from event timestamps
      const hourlyData = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        value: events.filter(e => new Date(e.createdAt).getHours() === h).length,
      }));

      // Weekly distribution
      const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weeklyData = dayLabels.map((day, idx) => {
        const dayEvents = events.filter(e => new Date(e.createdAt).getDay() === idx);
        return {
          day,
          views: dayEvents.filter(e => e.eventType === "view_card" || e.eventType === "view_detail").length,
          orders: dayEvents.filter(e => e.eventType === "order_click" || e.eventType === "booking_click").length,
        };
      });

      // Top restaurants by swipe_right event count
      const swipesByRestaurant = new Map<number, number>();
      const likesByRestaurant = new Map<number, number>();
      for (const e of events) {
        if (!e.itemId) continue;
        if (e.eventType === "swipe_right" || e.eventType === "swipe_left") {
          swipesByRestaurant.set(e.itemId, (swipesByRestaurant.get(e.itemId) ?? 0) + 1);
        }
        if (e.eventType === "swipe_right" || e.eventType === "favorite") {
          likesByRestaurant.set(e.itemId, (likesByRestaurant.get(e.itemId) ?? 0) + 1);
        }
      }
      const topMenuItems = allRestaurants
        .map(r => {
          const sw = swipesByRestaurant.get(r.id) ?? 0;
          const likes = likesByRestaurant.get(r.id) ?? 0;
          return { name: r.name, swipes: sw, likes, conversionRate: sw > 0 ? Number(((likes / sw) * 100).toFixed(1)) : 0 };
        })
        .filter(r => r.swipes > 0)
        .sort((a, b) => b.swipes - a.swipes)
        .slice(0, 5);

      // Peak hours from real data
      const peakHours = hourlyData
        .slice()
        .sort((a, b) => b.value - a.value)
        .slice(0, 4)
        .map(h => ({
          time: `${String(h.hour).padStart(2, "0")}:00 - ${String((h.hour + 1) % 24).padStart(2, "0")}:00`,
          label: h.hour >= 11 && h.hour <= 13 ? "Lunch peak" : h.hour >= 17 && h.hour <= 21 ? "Dinner rush" : "Peak activity",
          activity: Math.min(100, h.value),
        }));

      // Engagement funnel from real event counts
      const totalViews = impressions || 1;
      const engagementFunnel = [
        { stage: "Impressions", count: impressions, percentage: 100 },
        { stage: "Swipe Views", count: swipeRights, percentage: Math.round((swipeRights / totalViews) * 100) },
        { stage: "Detail Views", count: detailViews, percentage: Math.round((detailViews / totalViews) * 100) },
        { stage: "Saves", count: saves, percentage: Math.round((saves / totalViews) * 100) },
        { stage: "Delivery Taps", count: deliveryTaps, percentage: Math.round((deliveryTaps / totalViews) * 100) },
      ];

      // Repeat visitors from unique vs returning userIds
      const userEventCounts = new Map<string, number>();
      for (const e of events) {
        if (!e.userId) continue;
        userEventCounts.set(e.userId, (userEventCounts.get(e.userId) ?? 0) + 1);
      }
      const totalUsers = userEventCounts.size || 1;
      const returningCount = Array.from(userEventCounts.values()).filter(c => c > 1).length;
      const returningPct = Math.round((returningCount / totalUsers) * 100);
      const repeatVisitors = {
        firstTime: 100 - returningPct,
        returning: returningPct,
        avgVisitsPerUser: totalUsers > 0 ? Number((events.length / totalUsers).toFixed(1)) : 0,
        loyaltyScore: Math.min(100, returningPct + Math.round(saves / Math.max(1, totalUsers) * 10)),
      };

      // Competitor benchmark: rank this restaurant by total events vs all others
      const restaurantEventCounts = new Map<number, number>();
      for (const e of events) {
        if (e.itemId) restaurantEventCounts.set(e.itemId, (restaurantEventCounts.get(e.itemId) ?? 0) + 1);
      }
      const sortedCounts = Array.from(restaurantEventCounts.values()).sort((a, b) => b - a);
      const avgSwipes = sortedCounts.length ? Math.round(sortedCounts.reduce((s, v) => s + v, 0) / sortedCounts.length) : 0;
      const yourTotal = swipeRights;
      const yourRankIdx = sortedCounts.findIndex(c => c <= yourTotal);
      const yourRank = yourRankIdx >= 0 ? yourRankIdx + 1 : sortedCounts.length + 1;
      const competitorBenchmark = {
        yourRank,
        totalInCategory: Math.max(sortedCounts.length, 1),
        avgCategorySwipes: avgSwipes,
        yourSwipes: yourTotal,
        percentile: Math.round(((sortedCounts.length - yourRank + 1) / Math.max(sortedCounts.length, 1)) * 100),
      };

      // Revenue estimate (฿245 avg order value assumption)
      const avgOrderValue = 245;
      const revenueEstimate = {
        estimatedRevenue: deliveryTaps * avgOrderValue,
        avgOrderValue,
        projectedMonthly: Math.round(deliveryTaps * avgOrderValue * 4.3),
        revenueGrowth: 0,
      };

      // Audience breakdown from user profiles of engaged users
      const engagedUserIds = new Set<string>();
      for (const e of events) {
        if (e.userId && (e.eventType === "swipe_right" || e.eventType === "favorite" || e.eventType === "view_detail")) {
          engagedUserIds.add(e.userId);
        }
      }
      const profiles = await storage.listProfiles(500);
      const engagedProfiles = profiles.filter(p => engagedUserIds.has(p.lineUserId));
      const totalEngaged = engagedProfiles.length || 1;
      const cuisineCount: Record<string, number> = {};
      const healthCount = engagedProfiles.filter(p =>
        (p.dietaryRestrictions ?? []).some(d => ["vegetarian", "vegan", "healthy"].includes(d))
      ).length;
      for (const p of engagedProfiles) {
        for (const c of (p.cuisinePreferences ?? [])) {
          cuisineCount[c] = (cuisineCount[c] ?? 0) + 1;
        }
      }
      const topCuisines = Object.entries(cuisineCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c, n]) => ({
          segment: c.charAt(0).toUpperCase() + c.slice(1) + " Lovers",
          pct: Math.round((n / totalEngaged) * 100),
          trend: "+0%",
        }));
      const healthPct = Math.round((healthCount / totalEngaged) * 100);
      const audienceBreakdown = [
        ...topCuisines,
        ...(healthPct > 0 ? [{ segment: "Health-conscious", pct: healthPct, trend: "+0%" }] : []),
      ].filter(s => s.pct > 0).slice(0, 5);

      // Opportunity score from KPIs
      const swipeRate = impressions > 0 ? swipeRights / impressions : 0;
      const convRate = impressions > 0 ? deliveryTaps / impressions : 0;
      let opportunityScore = 50;
      if (impressions > 100) opportunityScore += 5;
      if (impressions > 500) opportunityScore += 5;
      if (impressions > 1000) opportunityScore += 5;
      if (swipeRate > 0.3) opportunityScore += 5;
      if (swipeRate > 0.5) opportunityScore += 5;
      if (convRate > 0.05) opportunityScore += 5;
      if (convRate > 0.15) opportunityScore += 5;
      if (returningPct > 20) opportunityScore += 5;
      if (returningPct > 40) opportunityScore += 5;
      if (saves > 10) opportunityScore += 5;
      opportunityScore = Math.min(100, opportunityScore);

      // Recommendations generated from real metrics
      const recommendationsData: { title: string; impact: "high" | "medium" | "low"; reason: string; action: string }[] = [];
      if (impressions < 500) {
        recommendationsData.push({ title: "Increase your visibility", impact: "high", reason: `You've had ${impressions} impressions this month — top restaurants get 2,000+`, action: "Boost listing" });
      }
      if (swipeRate < 0.5 && impressions > 50) {
        recommendationsData.push({ title: "Improve your main photo", impact: "high", reason: `Your swipe-right rate is ${(swipeRate * 100).toFixed(0)}% — listings with better photos average 65%+`, action: "Upload photo" });
      }
      if (convRate < 0.1 && impressions > 50) {
        recommendationsData.push({ title: "Add delivery platform links", impact: "high", reason: `Only ${(convRate * 100).toFixed(1)}% of viewers click to order — add Grab or LINE MAN`, action: "Add link" });
      }
      if (saves < 20) {
        recommendationsData.push({ title: "Create a weekend promotion", impact: "medium", reason: "Promotions increase saves by 38% on average", action: "Create promo" });
      }
      if (returningPct < 30) {
        recommendationsData.push({ title: "Update vibe tags", impact: "low", reason: `${returningPct}% of visitors return — adding tags like 'date night' boosts discovery`, action: "Edit tags" });
      }
      if (recommendationsData.length < 3) {
        recommendationsData.push({ title: "Add more menu photos", impact: "medium", reason: "Listings with 5+ photos get 42% more clickouts", action: "Upload images" });
      }

      res.json({
        overview: {
          impressions: { value: impressions, trend: 0, label: "Impressions" },
          swipes: { value: swipeRights, trend: 0, label: "Swipe Views" },
          saves: { value: saves, trend: 0, label: "Saves" },
          deliveryTaps: { value: deliveryTaps, trend: 0, label: "Delivery Taps" },
        },
        hourlyData,
        weeklyData,
        topMenuItems,
        peakHours,
        userActions: [
          { action: "Swiped right (liked)", count: swipeRights },
          { action: "Viewed details", count: detailViews },
          { action: "Opened map directions", count: mapTaps },
          { action: "Tapped 'Order on Grab'", count: deliveryTaps },
          { action: "Saved to favorites", count: saves },
        ],
        engagementFunnel,
        repeatVisitors,
        competitorBenchmark,
        revenueEstimate,
        audienceBreakdown,
        recommendationsData,
        opportunityScore,
        conversionRate: impressions > 0 ? ((deliveryTaps / impressions) * 100).toFixed(1) : "0.0",
        avgTimeOnPage: null,
        returnVisitors: `${returningPct}%`,
        currentPeakHour: hour >= 11 && hour <= 13 ? "Lunch" : hour >= 17 && hour <= 21 ? "Dinner" : hour >= 7 && hour <= 10 ? "Breakfast" : "Off-peak",
        bestDay: weeklyData.slice().sort((a, b) => b.views - a.views)[0]?.day ?? "N/A",
      });
    } catch (err) {
      console.error("[owner/insights] error:", err);
      res.status(500).json({ message: "Internal server error", detail: String(err) });
    }
  });

  app.get("/api/owner/delivery-conversions", async (req, res) => {
    if (!requireOwnerOrAdmin(req, res)) return;
    try {
      const restaurantId = (req.session as any)?.ownerRestaurantId ?? parseInt(String(req.query.restaurantId ?? "0"), 10);
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const logs = await storage.listEventLogs(20000, since);
      const myLogs = restaurantId ? logs.filter(e => e.itemId === restaurantId) : logs;

      const seen = myLogs.filter(e => e.eventType === "view_card").length;
      const swipedRight = myLogs.filter(e => e.eventType === "swipe" && (e.metadata as any)?.direction === "right").length;
      const clickedDelivery = myLogs.filter(e => e.eventType === "deeplink_click").length;

      // Platform breakdown
      const byPlatform: Record<string, number> = {};
      for (const e of myLogs.filter(e => e.eventType === "deeplink_click")) {
        const plat = (e.metadata as any)?.platform ?? "other";
        byPlatform[plat] = (byPlatform[plat] ?? 0) + 1;
      }

      // Time of day clicks
      const timeMap: Record<number, number> = {};
      for (const e of myLogs.filter(e => e.eventType === "deeplink_click")) {
        const h = new Date(e.createdAt).getHours();
        timeMap[h] = (timeMap[h] ?? 0) + 1;
      }
      const timeClicks = Object.entries(timeMap)
        .map(([hour, clicks]) => ({ hour: `${String(Number(hour)).padStart(2, "0")}:00`, clicks }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      // Solo vs group
      const soloClicks = myLogs.filter(e => e.eventType === "deeplink_click" && !(e.metadata as any)?.groupSessionId).length;
      const groupClicks = myLogs.filter(e => e.eventType === "deeplink_click" && (e.metadata as any)?.groupSessionId).length;

      // Previous 30-day window (30-60 days ago) for week-over-week badge
      const prevSince = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const prevLogs = await storage.listEventLogs(20000, prevSince);
      const cutoff = since.getTime();
      const prevMyLogs = (restaurantId ? prevLogs.filter(e => e.itemId === restaurantId) : prevLogs)
        .filter(e => new Date(e.createdAt).getTime() < cutoff);
      const prevClicks = prevMyLogs.filter(e => e.eventType === "deeplink_click").length;
      const clicksChangePct = prevClicks > 0 ? Math.round(((clickedDelivery - prevClicks) / prevClicks) * 100) : 0;

      // Dish clicks from menus table — real counts from click_menu_item events
      const menuItems = restaurantId ? await storage.listMenusByRestaurant(restaurantId) : [];
      const menuItemIds = new Set(menuItems.map(m => m.id));
      const clicksByMenuItemId = new Map<number, number>();
      for (const e of myLogs) {
        if (e.eventType === "click_menu_item" && e.menuItemId && menuItemIds.has(e.menuItemId)) {
          clicksByMenuItemId.set(e.menuItemId, (clicksByMenuItemId.get(e.menuItemId) ?? 0) + 1);
        }
      }
      const dishClicks = menuItems
        .filter(m => m.isActive)
        .map(m => {
          const clicks = clicksByMenuItemId.get(m.id) ?? 0;
          const ctr = seen > 0 ? Number(((clicks / seen) * 100).toFixed(1)) : 0;
          return { name: m.name, clicks, ctr, trend: "up" as const, matchRate: 0 };
        })
        .sort((a, b) => b.clicks - a.clicks);

      // Campaign clicks from campaigns table
      const allCampaigns = await storage.listCampaigns();
      const ownerEmail = (req.session as any)?.ownerEmail ?? "";
      const ownerCampaigns = allCampaigns.filter(c =>
        ownerEmail ? c.restaurantOwnerKey === ownerEmail : false
      );
      const campaignClicks = ownerCampaigns.map(c => ({
        campaign: c.title,
        clicks: c.clicks ?? 0,
        ctr: c.impressions > 0 ? Number(((c.clicks / c.impressions) * 100).toFixed(1)) : 0,
        spend: c.spent ?? 0,
        roi: c.spent > 0 ? Number(((c.clicks * 245) / c.spent).toFixed(1)) : 0,
      }));

      res.json({
        funnel: {
          seen,
          swipedRight,
          matched: Math.round(swipedRight * 0.13),
          clickedDelivery,
        },
        byPlatform,
        timeClicks,
        sessionClicks: { solo: soloClicks, group: groupClicks },
        totalClicks: clickedDelivery,
        overallCtr: seen > 0 ? Number(((clickedDelivery / seen) * 100).toFixed(1)) : 0,
        clicksChangePct,
        dishClicks,
        campaignClicks,
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/owner/notifications", async (req, res) => {
    if (!requireOwnerOrAdmin(req, res)) return;
    try {
      const restaurantId = (req.session as any)?.ownerRestaurantId ?? parseInt(String(req.query.restaurantId ?? "0"), 10);
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const logs = await storage.listEventLogs(20000, since);
      const myLogs = restaurantId ? logs.filter(e => e.itemId === restaurantId) : logs;

      const saves = myLogs.filter(e => e.eventType === "favorite").length;
      const deliveryClicks = myLogs.filter(e => e.eventType === "deeplink_click").length;
      const swipeRights = myLogs.filter(e => e.eventType === "swipe" && (e.metadata as any)?.direction === "right").length;
      const impressions = myLogs.filter(e => e.eventType === "view_card").length;

      const notifications: { id: number; type: string; title: string; message: string; time: string; read: boolean }[] = [];
      let id = 1;

      if (saves >= 5) {
        notifications.push({ id: id++, type: "milestone", title: "Milestone Reached", message: `Your restaurant has been saved by ${saves} users this month!`, time: "recently", read: false });
      }
      if (deliveryClicks > 0) {
        notifications.push({ id: id++, type: "campaign", title: "Delivery Activity", message: `You received ${deliveryClicks} delivery click${deliveryClicks !== 1 ? "s" : ""} in the past 30 days.`, time: "this month", read: false });
      }
      if (swipeRights >= 20) {
        notifications.push({ id: id++, type: "milestone", title: "Popular Restaurant", message: `${swipeRights} users swiped right on your restaurant this month!`, time: "this month", read: false });
      }
      if (impressions >= 50) {
        notifications.push({ id: id++, type: "tip", title: "Great Visibility", message: `Your restaurant appeared in ${impressions} feeds this month — keep your listing updated!`, time: "this month", read: true });
      }
      notifications.push(
        { id: id++, type: "tip", title: "Performance Tip", message: "Add more photos to your listing — restaurants with 5+ photos get 40% more views.", time: "2 days ago", read: true },
        { id: id++, type: "verification", title: "Verification Reminder", message: "Complete your business verification to unlock premium features and the Verified badge.", time: "3 days ago", read: true },
      );

      res.json({ notifications });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/group/sessions", async (req, res) => {
    try {
      const input = z.object({
        mode: z.enum(["restaurant", "menu"]).optional().default("restaurant"),
        locations: z.array(z.string()).optional().default([]),
        budget: z.string().optional().default(""),
        diet: z.array(z.string()).optional().default([]),
        creatorName: z.string().optional().default("You"),
        creatorAvatarUrl: z.string().url().optional(),
        creatorLineUserId: z.string().optional(),
      }).parse(req.body ?? {});

      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const session = await storage.createGroupSession({
        code,
        status: "active",
        settings: {
          mode: input.mode,
          locations: input.locations,
          budget: input.budget,
          diet: input.diet,
        },
      });

      const creator = await storage.createGroupMember({
        sessionId: session.id,
        lineUserId: input.creatorLineUserId || null,
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
      if (isDev) {
        console.log("[group-deck-debug] group-session-request", {
          code,
          path: req.path,
          query: req.query,
          referer: req.headers.referer ?? null,
        });
      }
      const session = await storage.getGroupSessionByCode(code);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const members = await storage.listGroupMembers(session.id);
      if (isDev) {
        console.log("[group-deck-debug] group-session-response", {
          code,
          sessionId: session.id,
          status: session.status,
          memberCount: members.length,
        });
      }
      res.json({ session, members });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/group/sessions/:code/join", async (req, res) => {
    try {
      const code = String(req.params.code || "").trim().toUpperCase();
      const input = z.object({
        lineUserId: z.string().optional(),
        name: z.string().min(1),
        avatarUrl: z.string().optional(),
      }).parse(req.body ?? {});

      const session = await storage.getGroupSessionByCode(code);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const existing = input.lineUserId
        ? await storage.findGroupMemberByLineUserId(session.id, input.lineUserId)
        : await storage.findGroupMemberByName(session.id, input.name);
      if (existing) {
        const shouldUpdateIdentity =
          (input.lineUserId && input.lineUserId !== existing.lineUserId) ||
          input.name !== existing.name ||
          (input.avatarUrl && input.avatarUrl !== existing.avatarUrl);
        if (shouldUpdateIdentity) {
          const updated = await storage.updateGroupMember(existing.id, {
            lineUserId: input.lineUserId ?? existing.lineUserId ?? null,
            name: input.name,
            avatarUrl: input.avatarUrl ?? existing.avatarUrl ?? null,
            joined: true,
          });
          const allMembers = await storage.listGroupMembers(session.id);
          broadcastGroupUpdate(code, { type: "member_joined", members: allMembers });
          return res.json(updated ?? existing);
        }
        if (!existing.joined) {
          const updated = await storage.updateGroupMember(existing.id, { joined: true });
          const allMembers = await storage.listGroupMembers(session.id);
          broadcastGroupUpdate(code, { type: "member_joined", members: allMembers });
          return res.json(updated ?? existing);
        }
        return res.json(existing);
      }

      const created = await storage.createGroupMember({
        sessionId: session.id,
        lineUserId: input.lineUserId || null,
        name: input.name,
        avatarUrl: input.avatarUrl,
        joined: true,
      });
      const allMembers = await storage.listGroupMembers(session.id);
      broadcastGroupUpdate(code, { type: "member_joined", members: allMembers });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/group/sessions/:code/status", async (req, res) => {
    try {
      const code = String(req.params.code || "").trim().toUpperCase();
      const { status } = z.object({ status: z.string().min(1) }).parse(req.body ?? {});
      const session = await storage.getGroupSessionByCode(code);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const updated = await storage.updateGroupSessionStatus(code, status);
      broadcastGroupUpdate(code, { type: "status_changed", status });
      res.json(updated);
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
      if (isDev) {
        console.log("[group-deck-debug] group-deck-request", {
          code,
          path: req.path,
          query: req.query,
          referer: req.headers.referer ?? null,
          userAgent: req.headers["user-agent"] ?? null,
        });
      }
      const session = await storage.getGroupSessionByCode(code);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radius = Math.max(300, Math.min(20000, Number(req.query.radius || 5000)));

      const settings = (session.settings || {}) as {
        mode?: "restaurant" | "menu";
        locations?: string[];
        budget?: string;
        diet?: string[];
      };
      const sessionMode = settings.mode === "menu" ? "menu" : "restaurant";
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
        bts: ["bts", "station", "skytrain"],
        mall: ["mall", "plaza", "center", "centre"],
        street: ["street", "market", "night market"],
        rooftop: ["rooftop", "sky", "view"],
        riverside: ["river", "riverside", "waterfront"],
        latenight: ["late", "night", "24", "midnight"],
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

      // ── Geo-aware fetch: L1 memory → L2 DB tile → L3 external API ───────────
      const toMeters = (aLat: number, aLng: number, bLat: number, bLng: number) => {
        const dLat = (aLat - bLat) * 111_320;
        const dLng = (aLng - bLng) * 111_320 * Math.cos(((aLat + bLat) * Math.PI) / 360);
        return Math.sqrt(dLat * dLat + dLng * dLng);
      };

      // Build the deck from NormalizedPlace objects so we keep live photo URLs
      // (OSM has none; Google provides them). DB rows lose photos after insert.
      type DeckItem = {
        id: number; name: string; description: string; imageUrl: string;
        lat: string; lng: string; category: string; priceLevel: number;
        rating: string; address: string; isNew: boolean; trendingScore: number;
        distanceMeters?: number;
        mode?: "restaurant" | "menu";
        availableCount?: number;
      };
      let deckItems: DeckItem[] = [];

      if (sessionMode === "menu") {
        const nearRestaurants = Number.isFinite(lat) && Number.isFinite(lng)
          ? await storage.findRestaurantsNear(lat, lng, radius)
          : await storage.getRestaurants();

        const textMatchRestaurant = (
          r: { name: string; category: string; description: string; address: string },
          tokens: string[],
        ) => {
          if (tokens.length === 0) return true;
          const haystack = `${r.name} ${r.category} ${r.description} ${r.address}`.toLowerCase();
          return tokens.some((t) => haystack.includes(t.toLowerCase()));
        };

        const filteredRestaurants = nearRestaurants.filter((r) => {
          if (!budgetPredicate(Number(r.priceLevel ?? 2))) return false;
          return textMatchRestaurant(
            {
              name: r.name,
              category: r.category ?? "",
              description: r.description ?? "",
              address: r.address ?? "",
            },
            locationTokens,
          );
        });

        const menusPerRestaurant = await Promise.all(
          filteredRestaurants.map(async (restaurant) => {
            const menuRows = await storage.listMenusByRestaurant(restaurant.id);
            return { restaurant, menuRows: menuRows.filter((m) => m.isActive) };
          }),
        );

        type GroupedMenu = {
          id: number;
          name: string;
          description: string;
          imageUrl: string;
          restaurantIds: Set<number>;
          sampleAddress: string;
          sampleLat: string;
          sampleLng: string;
          minDistanceMeters: number;
          minPrice: number | null;
          maxPrice: number | null;
        };
        const grouped = new Map<string, GroupedMenu>();

        for (const { restaurant, menuRows } of menusPerRestaurant) {
          for (const menu of menuRows) {
            const menuText = `${menu.name} ${menu.description ?? ""} ${(menu.tags ?? []).join(" ")} ${(menu.dietFlags ?? []).join(" ")}`.toLowerCase();
            const dietMatches = dietTokens.length === 0 || dietTokens.some((t) => menuText.includes(t.toLowerCase()));
            if (!dietMatches) continue;

            const key = menu.name.trim().toLowerCase();
            const distanceMeters = Number.isFinite(lat) && Number.isFinite(lng)
              ? toMeters(lat, lng, Number(restaurant.lat), Number(restaurant.lng))
              : Number.MAX_SAFE_INTEGER;
            const current = grouped.get(key);

            if (!current) {
              grouped.set(key, {
                id: menu.id,
                name: menu.name,
                description: menu.description ?? restaurant.category ?? "Menu item",
                imageUrl: menu.imageUrl || restaurant.imageUrl || "",
                restaurantIds: new Set([restaurant.id]),
                sampleAddress: restaurant.address,
                sampleLat: restaurant.lat,
                sampleLng: restaurant.lng,
                minDistanceMeters: distanceMeters,
                minPrice: menu.priceApprox ?? null,
                maxPrice: menu.priceApprox ?? null,
              });
              continue;
            }

            current.restaurantIds.add(restaurant.id);
            if (!current.imageUrl && (menu.imageUrl || restaurant.imageUrl)) {
              current.imageUrl = menu.imageUrl || restaurant.imageUrl || "";
            }
            if (!current.description && menu.description) current.description = menu.description;
            if (distanceMeters < current.minDistanceMeters) {
              current.minDistanceMeters = distanceMeters;
              current.sampleAddress = restaurant.address;
              current.sampleLat = restaurant.lat;
              current.sampleLng = restaurant.lng;
              current.id = menu.id;
            }
            if (menu.priceApprox != null) {
              current.minPrice = current.minPrice == null ? menu.priceApprox : Math.min(current.minPrice, menu.priceApprox);
              current.maxPrice = current.maxPrice == null ? menu.priceApprox : Math.max(current.maxPrice, menu.priceApprox);
            }
          }
        }

        deckItems = Array.from(grouped.values())
          .map((entry) => {
            const avgPrice = entry.minPrice != null && entry.maxPrice != null
              ? (entry.minPrice + entry.maxPrice) / 2
              : null;
            const derivedPriceLevel = avgPrice == null
              ? 2
              : avgPrice <= 120
              ? 1
              : avgPrice <= 250
              ? 2
              : avgPrice <= 450
              ? 3
              : 4;
            return {
              id: entry.id,
              name: entry.name,
              description: entry.description,
              imageUrl: entry.imageUrl,
              lat: entry.sampleLat,
              lng: entry.sampleLng,
              category: "Dish",
              priceLevel: derivedPriceLevel,
              rating: "-",
              address: `${entry.restaurantIds.size} places nearby`,
              isNew: false,
              trendingScore: 0,
              distanceMeters: Number.isFinite(entry.minDistanceMeters) ? entry.minDistanceMeters : undefined,
              mode: "menu" as const,
              availableCount: entry.restaurantIds.size,
            };
          })
          .sort((a, b) => (b.availableCount ?? 0) - (a.availableCount ?? 0) || (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
          .slice(0, 30);
      } else if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const placesResult = await placesService.query({
          lat,
          lng,
          radius,
          sourcePreference: "google-first",
        });
        if (isDev) {
          const firstPlace = placesResult.data[0];
          console.log("[group-deck-debug] places-result", {
            code,
            lat,
            lng,
            radius,
            source: placesResult.source,
            fromCache: placesResult.fromCache,
            isFallback: placesResult.isFallback,
            resultCount: placesResult.data.length,
            firstPlace: firstPlace
              ? {
                  id: firstPlace.id,
                  name: firstPlace.name,
                  source: firstPlace.source,
                  address: firstPlace.address ?? null,
                  category: firstPlace.category ?? null,
                  rating: firstPlace.rating ?? null,
                  priceLevel: firstPlace.priceLevel ?? null,
                  phone: firstPlace.phone ?? null,
                  photosCount: firstPlace.photos?.length ?? 0,
                  distanceMeters: firstPlace.distanceMeters ?? null,
                }
              : null,
          });
        }
        // Upsert every place into DB so they get stable IDs for detail routing
        const ids = await Promise.all(placesResult.data.map((p) => storage.findOrCreateFromPlace(p)));
        if (isDev && ids.length > 0) {
          const firstDbRow = await storage.getRestaurantById(ids[0]);
          console.log("[group-deck-debug] first-db-row-after-upsert", {
            restaurantId: ids[0],
            name: firstDbRow?.name ?? null,
            imageUrl: firstDbRow?.imageUrl ? "present" : "missing",
            phone: firstDbRow?.phone ?? null,
            openingHoursCount: firstDbRow?.openingHours?.length ?? 0,
            reviewsCount: firstDbRow?.reviews?.length ?? 0,
            rating: firstDbRow?.rating ?? null,
            address: firstDbRow?.address ?? null,
            category: firstDbRow?.category ?? null,
          });
        }
        await Promise.all(
          placesResult.data.map((p, i) => hydrateRestaurantFromGooglePlace(p, ids[i])),
        );
        // Build deck from live NormalizedPlace data — retains photo URLs from Google
        deckItems = placesResult.data.map((p, i) => ({
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
          distanceMeters: p.distanceMeters,
          mode: "restaurant" as const,
        }));
        if (isDev) {
          const firstDeckItem = deckItems[0];
          const firstHydratedDbRow = firstDeckItem ? await storage.getRestaurantById(firstDeckItem.id) : null;
          console.log("[group-deck-debug] first-deck-item", {
            firstDeckItem,
            firstHydratedDbRow: firstHydratedDbRow
              ? {
                  id: firstHydratedDbRow.id,
                  name: firstHydratedDbRow.name,
                  imageUrl: firstHydratedDbRow.imageUrl ? "present" : "missing",
                  phone: firstHydratedDbRow.phone ?? null,
                  openingHoursCount: firstHydratedDbRow.openingHours?.length ?? 0,
                  reviewsCount: firstHydratedDbRow.reviews?.length ?? 0,
                  rating: firstHydratedDbRow.rating ?? null,
                  address: firstHydratedDbRow.address ?? null,
                  category: firstHydratedDbRow.category ?? null,
                }
              : null,
          });
        }
      } else {
        // No location — fall back to full DB scan
        const dbAll = await storage.getRestaurants();
        deckItems = dbAll.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description ?? "",
          imageUrl: r.imageUrl ?? "",
          lat: r.lat ?? "",
          lng: r.lng ?? "",
          category: r.category ?? "restaurant",
          priceLevel: Number(r.priceLevel ?? 2),
          rating: r.rating ?? "N/A",
          address: r.address ?? "N/A",
          isNew: r.isNew ?? false,
          trendingScore: Number(r.trendingScore ?? 0),
          mode: "restaurant" as const,
        }));
      }

      const textMatch = (r: DeckItem, tokens: string[]) => {
        if (tokens.length === 0) return true;
        const haystack = `${r.name} ${r.category} ${r.description} ${r.address}`.toLowerCase();
        return tokens.some((t) => haystack.includes(t.toLowerCase()));
      };

      let filtered = sessionMode === "menu"
        ? deckItems
        : deckItems.filter((r) => budgetPredicate(Number(r.priceLevel || 2)));

      if (locationTokens.length > 0 && sessionMode !== "menu") {
        const byLocation = filtered.filter((r) => textMatch(r, locationTokens));
        if (byLocation.length > 0) filtered = byLocation;
      }
      if (dietTokens.length > 0 && sessionMode !== "menu") {
        const byDiet = filtered.filter((r) => textMatch(r, dietTokens));
        if (byDiet.length > 0) filtered = byDiet;
      }

      filtered = filtered
        .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
        .slice(0, 30);

      if (isDev) {
        console.log("[group-deck-debug] filtered-deck-summary", {
          code,
          filteredCount: filtered.length,
          firstFiltered: filtered[0] ?? null,
        });
      }

      if (isDev) {
        console.log("[group-deck-debug] group-deck-response", {
          code,
          count: filtered.length,
          firstId: filtered[0]?.id ?? null,
          firstName: filtered[0]?.name ?? null,
        });
      }

      res.json(filtered);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── In-memory swipe store for group sessions ────────────────────────────────
  type GroupSwipeRecord = { voterName: string; menuItemId: number; direction: "left" | "right" | "super" };
  type FinalVoteRecord = { voterName: string; menuItemId: number };
  const groupSwipes = new Map<string, GroupSwipeRecord[]>();
  const groupFinalVotes = new Map<string, FinalVoteRecord[]>();

  function getSessionSwipeMode(session: Awaited<ReturnType<typeof storage.getGroupSessionByCode>>) {
    const mode = (session?.settings as { mode?: "restaurant" | "menu" } | null | undefined)?.mode;
    return mode === "menu" ? "menu" : "restaurant";
  }

  async function listRestaurantsServingMenu(menuItemId: number, lat?: number, lng?: number, radius = 5000) {
    const menu = await storage.getMenuById(menuItemId);
    if (!menu) return [];
    const sameNameMenus = await storage.listMenusByName(menu.name);
    const restaurantIds = Array.from(new Set(sameNameMenus.map((m) => m.restaurantId)));
    const restaurants = await Promise.all(restaurantIds.map((id) => storage.getRestaurantById(id)));
    const valid = restaurants.filter(Boolean);
    const normalized = valid.map((restaurant) => {
      const r = restaurant!;
      const distanceMeters =
        Number.isFinite(lat) && Number.isFinite(lng)
          ? (() => {
              const dLat = (Number(r.lat) - Number(lat)) * 111_320;
              const dLng =
                (Number(r.lng) - Number(lng)) *
                111_320 *
                Math.cos(((Number(r.lat) + Number(lat)) * Math.PI) / 360);
              return Math.sqrt(dLat * dLat + dLng * dLng);
            })()
          : null;
      return { restaurant: r, distanceMeters };
    });
    return normalized
      .filter((entry) => entry.distanceMeters == null || entry.distanceMeters <= radius)
      .sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER));
  }

  async function resolveResultItem(menuItemId: number, mode: "restaurant" | "menu") {
    if (mode === "menu") {
      const menu = await storage.getMenuById(menuItemId);
      if (!menu) return null;
      const restaurants = await listRestaurantsServingMenu(menuItemId);
      const firstRestaurant = restaurants[0]?.restaurant ?? null;
      return {
        id: menu.id,
        name: menu.name,
        imageUrl: menu.imageUrl || firstRestaurant?.imageUrl || "",
        address: `${restaurants.length} places nearby`,
        rating: "-",
        priceLevel: menu.priceApprox == null ? 2 : menu.priceApprox <= 120 ? 1 : menu.priceApprox <= 250 ? 2 : menu.priceApprox <= 450 ? 3 : 4,
        restaurantCount: restaurants.length,
      };
    }
    const restaurant = await storage.getRestaurantById(menuItemId);
    if (!restaurant) return null;
    return {
      id: restaurant.id,
      name: restaurant.name,
      imageUrl: restaurant.imageUrl,
      address: restaurant.address,
      rating: restaurant.rating,
      priceLevel: restaurant.priceLevel,
      restaurantCount: 1,
    };
  }

  async function buildGroupResult(code: string) {
    const session = await storage.getGroupSessionByCode(code);
    if (!session) return null;
    const mode = getSessionSwipeMode(session);
    const members = await storage.listGroupMembers(session.id);
    const memberCount = members.length;
    const swipes = groupSwipes.get(code) ?? [];
    const scoreByItem = new Map<number, number>();
    const votersByItem = new Map<number, Set<string>>();

    for (const swipe of swipes) {
      if (!votersByItem.has(swipe.menuItemId)) votersByItem.set(swipe.menuItemId, new Set());
      if (swipe.direction === "right" || swipe.direction === "super") {
        votersByItem.get(swipe.menuItemId)!.add(swipe.voterName);
        const weight = swipe.direction === "super" ? 2 : 1;
        scoreByItem.set(swipe.menuItemId, (scoreByItem.get(swipe.menuItemId) ?? 0) + weight);
      }
    }

    const ranked = Array.from(scoreByItem.entries())
      .map(([menuItemId, score]) => ({
        menuItemId,
        score,
        agreeCount: votersByItem.get(menuItemId)?.size ?? 0,
      }))
      .sort((a, b) => b.score - a.score || b.agreeCount - a.agreeCount)
      .slice(0, 3);

    const top3 = await Promise.all(
      ranked.map(async (entry) => {
        return {
          ...entry,
          item: await resolveResultItem(entry.menuItemId, mode),
        };
      }),
    );

    const winner = top3[0] ?? null;
    const hasStrongMatch = Boolean(winner && winner.agreeCount > 0 && winner.agreeCount >= Math.ceil(memberCount * 0.7));
    return {
      code,
      mode,
      memberCount,
      hasStrongMatch,
      top3,
      winner: hasStrongMatch ? winner : null,
    };
  }

  app.post("/api/group/sessions/:code/swipe", async (req, res) => {
    try {
      const code = String(req.params.code || "").trim().toUpperCase();
      const session = await storage.getGroupSessionByCode(code);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const body = z.object({
        lineUserId: z.string().optional(),
        voterName: z.string().optional(),
        menuItemId: z.number().int(),
        direction: z.enum(["left", "right", "super"]),
      }).parse(req.body ?? {});
      const { menuItemId, direction } = body;
      const voterName = body.lineUserId ?? body.voterName ?? "";
      if (!voterName) return res.status(400).json({ message: "lineUserId is required" });

      if (!groupSwipes.has(code)) groupSwipes.set(code, []);
      const swipes = groupSwipes.get(code)!;
      // Replace existing vote for same voter + item
      const idx = swipes.findIndex(s => s.voterName === voterName && s.menuItemId === menuItemId);
      if (idx >= 0) swipes[idx] = { voterName, menuItemId, direction };
      else swipes.push({ voterName, menuItemId, direction });

      // Compute current matches (items where all members voted right/super)
      const members = await storage.listGroupMembers(session.id);
      const memberCount = members.length;

      const positiveByItem = new Map<number, Set<string>>();
      for (const s of swipes) {
        if (s.direction === "right" || s.direction === "super") {
          if (!positiveByItem.has(s.menuItemId)) positiveByItem.set(s.menuItemId, new Set());
          positiveByItem.get(s.menuItemId)!.add(s.voterName);
        }
      }

      const matches = Array.from(positiveByItem.entries()).map(([menuItemId, voters]) => ({
        menuItemId,
        voters: Array.from(voters),
      }));

      broadcastGroupUpdate(code, { type: "swipe", voterName, menuItemId, direction });
      res.json({ matches, memberCount });
    } catch (err) {
      res.status(400).json({ message: String(err) });
    }
  });

  app.get("/api/group/sessions/:code/swipes", async (req, res) => {
    try {
      const code = String(req.params.code || "").trim().toUpperCase();
      const session = await storage.getGroupSessionByCode(code);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const members = await storage.listGroupMembers(session.id);
      const swipes = groupSwipes.get(code) ?? [];
      res.json({ swipes, members });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/group/sessions/:code/matches", async (req, res) => {
    try {
      const code = String(req.params.code || "").trim().toUpperCase();
      const session = await storage.getGroupSessionByCode(code);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const members = await storage.listGroupMembers(session.id);
      const memberCount = members.length;
      const swipes = groupSwipes.get(code) ?? [];

      const positiveByItem = new Map<number, Set<string>>();
      for (const s of swipes) {
        if (s.direction === "right" || s.direction === "super") {
          if (!positiveByItem.has(s.menuItemId)) positiveByItem.set(s.menuItemId, new Set());
          positiveByItem.get(s.menuItemId)!.add(s.voterName);
        }
      }

      const matches = Array.from(positiveByItem.entries())
        .filter(([, voters]) => voters.size >= memberCount && memberCount > 0)
        .map(([menuItemId, voters]) => ({ menuItemId, voters: Array.from(voters) }));

      res.json({ matches, memberCount });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/group/:code/result", async (req, res) => {
    try {
      const code = String(req.params.code || "").trim().toUpperCase();
      const result = await buildGroupResult(code);
      if (!result) return res.status(404).json({ message: "Session not found" });
      res.json(result);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/group/:code/menu/:menuItemId/restaurants", async (req, res) => {
    try {
      const code = String(req.params.code || "").trim().toUpperCase();
      const menuItemId = Number(req.params.menuItemId);
      if (!Number.isFinite(menuItemId)) return res.status(400).json({ message: "Invalid menuItemId" });
      const session = await storage.getGroupSessionByCode(code);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (getSessionSwipeMode(session) !== "menu") return res.status(400).json({ message: "Session is not in menu mode" });
      const menu = await storage.getMenuById(menuItemId);
      if (!menu) return res.status(404).json({ message: "Menu item not found" });

      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radius = Math.max(300, Math.min(20000, Number(req.query.radius || 5000)));
      const restaurants = await listRestaurantsServingMenu(
        menuItemId,
        Number.isFinite(lat) ? lat : undefined,
        Number.isFinite(lng) ? lng : undefined,
        radius,
      );

      res.json({
        menuItemId,
        menuName: menu.name,
        menuImageUrl: menu.imageUrl,
        restaurants: restaurants.map((entry) => ({
          id: entry.restaurant.id,
          name: entry.restaurant.name,
          imageUrl: entry.restaurant.imageUrl,
          address: entry.restaurant.address,
          rating: entry.restaurant.rating,
          priceLevel: entry.restaurant.priceLevel,
          distanceMeters: entry.distanceMeters,
        })),
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/group/:code/vote", async (req, res) => {
    try {
      const code = String(req.params.code || "").trim().toUpperCase();
      const session = await storage.getGroupSessionByCode(code);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const mode = getSessionSwipeMode(session);

      const { voterName, menuItemId } = z.object({
        voterName: z.string().min(1),
        menuItemId: z.number().int(),
      }).parse(req.body ?? {});

      const members = await storage.listGroupMembers(session.id);
      const memberCount = members.length;
      if (!groupFinalVotes.has(code)) groupFinalVotes.set(code, []);
      const votes = groupFinalVotes.get(code)!;

      const existingIdx = votes.findIndex((vote) => vote.voterName === voterName);
      if (existingIdx >= 0) votes[existingIdx] = { voterName, menuItemId };
      else votes.push({ voterName, menuItemId });

      const voteCounts = votes.reduce<Map<number, number>>((acc, vote) => {
        acc.set(vote.menuItemId, (acc.get(vote.menuItemId) ?? 0) + 1);
        return acc;
      }, new Map());
      const winnerEntry = Array.from(voteCounts.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;
      const winnerId = winnerEntry?.[0] ?? null;
      const winnerVotes = winnerEntry?.[1] ?? 0;
      const winner = winnerId ? await resolveResultItem(winnerId, mode) : null;
      const completed = votes.length >= memberCount && memberCount > 0;

      res.json({
        mode,
        completed,
        totalVotes: votes.length,
        memberCount,
        winner: winner
          ? {
              ...winner,
            }
          : null,
        winnerVotes,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
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
            "deeplink_click",
            "view_menu_item",
            "click_menu_item",
          ]),
          eventName: z.string().optional(),
          timestamp: z.string().datetime(),
          platform: z.string().min(1),
          context: z.string().min(1),
          userId: z.string().optional(),
          sessionId: z.string().optional(),
          itemId: z.number().int().optional(),
          menuItemId: z.number().int().positive().optional(),
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

        const enrichedMetadata: Record<string, unknown> = {
          ...(event.metadata ?? {}),
          eventId: event.eventId,
          eventVersion: event.eventVersion,
          eventName: event.eventName ?? event.eventType,
          timestamp: event.timestamp,
          platform: event.platform,
          context: event.context,
        };

        if (event.eventType === "view_card" && !enrichedMetadata.district) {
          const lat = Number((event.metadata as Record<string, unknown> | undefined)?.lat);
          const lng = Number((event.metadata as Record<string, unknown> | undefined)?.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const district = await reverseGeocodeDistrict(lat, lng);
            if (district) enrichedMetadata.district = district;
          }
        }

        const created = await storage.createEventLog({
          idempotencyKey: event.idempotencyKey,
          eventType: event.eventType,
          userId: event.userId ?? null,
          sessionId: event.sessionId ?? null,
          itemId: event.itemId ?? null,
          menuItemId: event.menuItemId ?? null,
          metadata: enrichedMetadata,
        });
        if (created) accepted += 1;
        else {
          skipped += 1;
          reasonCounts.duplicate_or_idempotent = (reasonCounts.duplicate_or_idempotent ?? 0) + 1;
        }

        if (created && event.userId) {
          // Async: enqueue for the feature-update job (runs every 60s).
          // This removes 2 blocking DB round-trips from the hot event-ingestion path.
          enqueueFeatureUpdate(event.userId);
        }

        if (created && event.itemId) {
          const delta = deriveItemFeatureDelta(event.eventType, event.metadata);
          if (hasItemFeatureDelta(delta)) {
            await storage.upsertItemFeatureSnapshot(event.itemId, delta);
          }
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

  // ── Clickout analytics ────────────────────────────────────────────────────
  app.get("/api/admin/analytics/clickouts", async (req, res) => {
    if (!requireAdminSession(req, res)) return;
    try {
      const days = Math.min(parseInt(String(req.query.days ?? "7"), 10) || 7, 90);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const events = await storage.listEventLogsByType("deeplink_click", since, 5000);

      // Total counts
      const total = events.length;

      // By platform (from metadata.platform)
      const byPlatform: Record<string, number> = {};
      for (const e of events) {
        const platform = (e.metadata as Record<string, unknown> | null)?.platform as string | undefined;
        const key = platform ?? "unknown";
        byPlatform[key] = (byPlatform[key] ?? 0) + 1;
      }

      // By restaurant (itemId = restaurantId)
      const byRestaurantId: Record<number, number> = {};
      for (const e of events) {
        if (e.itemId) byRestaurantId[e.itemId] = (byRestaurantId[e.itemId] ?? 0) + 1;
      }
      // Enrich with restaurant names
      const restaurantIds = Object.keys(byRestaurantId).map(Number);
      const restaurantNames: Record<number, string> = {};
      if (restaurantIds.length > 0) {
        const allRestaurants = await storage.getRestaurants();
        for (const r of allRestaurants) {
          restaurantNames[r.id] = r.name;
        }
      }
      const topRestaurants = Object.entries(byRestaurantId)
        .map(([id, count]) => ({ restaurantId: Number(id), name: restaurantNames[Number(id)] ?? `Restaurant #${id}`, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // By daypart
      const daypartBuckets: Record<string, number> = { Breakfast: 0, Brunch: 0, Lunch: 0, Dinner: 0, "Late Night": 0 };
      for (const e of events) {
        const h = new Date(e.createdAt ?? Date.now()).getHours();
        if (h >= 6 && h < 10) daypartBuckets["Breakfast"]++;
        else if (h >= 10 && h < 12) daypartBuckets["Brunch"]++;
        else if (h >= 12 && h < 15) daypartBuckets["Lunch"]++;
        else if (h >= 17 && h < 22) daypartBuckets["Dinner"]++;
        else daypartBuckets["Late Night"]++;
      }
      const dayparts = Object.entries(daypartBuckets).map(([daypart, count]) => ({
        daypart,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));

      return res.json({ total, days, byPlatform, topRestaurants, dayparts });
    } catch {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Overview: funnel, top restaurants, cuisine trend, day patterns, heatmap — all from event_logs
  app.get("/api/admin/analytics/overview", async (req, res) => {
    if (!requireAdminSession(req, res)) return;
    try {
      const daysParam = req.query.days === "all" ? 365 : Math.min(parseInt(String(req.query.days ?? "30"), 10) || 30, 365);
      const since = new Date(Date.now() - daysParam * 24 * 60 * 60 * 1000);
      const logs = await storage.listEventLogs(30000, since);

      // Funnel
      let impressions = 0, swipeViews = 0, rightSwipes = 0, orderIntent = 0, deliveryTotal = 0;
      for (const e of logs) {
        if (e.eventType === "view_card") impressions++;
        if (e.eventType === "swipe") {
          swipeViews++;
          const dir = (e.metadata as Record<string, unknown> | null)?.direction;
          if (dir === "right") rightSwipes++;
        }
        if (e.eventType === "deeplink_click") { deliveryTotal++; orderIntent++; }
        else if (e.eventType === "order_click" || e.eventType === "booking_click") orderIntent++;
      }

      // Enrich with restaurant data (categories + names + district)
      const allRestaurants = await storage.getRestaurants();
      const restaurantMap: Record<number, { name: string; category: string; district: string | null }> = {};
      for (const r of allRestaurants) restaurantMap[r.id] = { name: r.name, category: r.category ?? "Other", district: r.district ?? null };

      // Top restaurants by right swipes
      const byRestaurant: Record<number, { rightSwipes: number; views: number }> = {};
      const byCuisine: Record<string, number> = {};
      for (const e of logs) {
        if (!e.itemId) continue;
        if (!byRestaurant[e.itemId]) byRestaurant[e.itemId] = { rightSwipes: 0, views: 0 };
        if (e.eventType === "swipe" && (e.metadata as Record<string, unknown> | null)?.direction === "right") {
          byRestaurant[e.itemId].rightSwipes++;
          const cat = restaurantMap[e.itemId]?.category ?? "Other";
          byCuisine[cat] = (byCuisine[cat] ?? 0) + 1;
        }
        if (e.eventType === "view_card") byRestaurant[e.itemId].views++;
      }

      const topRestaurants = Object.entries(byRestaurant)
        .map(([id, data]) => ({
          restaurantId: Number(id),
          name: restaurantMap[Number(id)]?.name ?? `#${id}`,
          rightSwipes: data.rightSwipes,
          views: data.views,
        }))
        .sort((a, b) => b.rightSwipes - a.rightSwipes)
        .slice(0, 8);

      // Cuisine trend
      const cuisineTotal = Object.values(byCuisine).reduce((s, v) => s + v, 0) || 1;
      const cuisineTrend = Object.entries(byCuisine)
        .map(([cuisine, count]) => ({ cuisine, rightSwipes: count, pct: Math.round((count / cuisineTotal) * 100) }))
        .sort((a, b) => b.rightSwipes - a.rightSwipes)
        .slice(0, 8);

      // Day patterns (Mon=0 ... Sun=6)
      const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const dayCount = [0, 0, 0, 0, 0, 0, 0];
      for (const e of logs) {
        const d = new Date(e.createdAt ?? Date.now()).getDay(); // 0=Sun, 6=Sat
        const idx = d === 0 ? 6 : d - 1;
        dayCount[idx]++;
      }
      const maxDay = Math.max(...dayCount, 1);
      const dayPatterns = DAY_NAMES.map((day, i) => ({
        day,
        count: dayCount[i],
        pct: Math.round((dayCount[i] / maxDay) * 100),
      }));

      // Heatmap: 7 rows (Mon-Sun) × 18 cols (6am-11pm)
      const heatmap: number[][] = Array.from({ length: 7 }, () => new Array(18).fill(0));
      for (const e of logs) {
        const dt = new Date(e.createdAt ?? Date.now());
        const d = dt.getDay();
        const dayIdx = d === 0 ? 6 : d - 1;
        const h = dt.getHours();
        if (h >= 6 && h < 24) {
          const hourIdx = h - 6;
          if (hourIdx < 18) heatmap[dayIdx][hourIdx]++;
        }
      }

      // Geo hotspots by district (split logs into two halves for growth %)
      const DISTRICT_ABBR: Record<string, string> = {
        "sukhumvit": "SKV", "silom": "SLM", "siam": "SIM", "thonglor": "TLR",
        "ari": "ARI", "sathorn": "SAT", "bang rak": "BRK", "pathumwan": "PTW",
        "chatuchak": "CTK", "ekkamai": "EKK", "on nut": "ONN", "bearing": "BRG",
      };
      const midpoint = new Date(Date.now() - (daysParam / 2) * 24 * 60 * 60 * 1000);
      const byDistrictCurrent: Record<string, number> = {};
      const byDistrictPrev: Record<string, number> = {};
      for (const e of logs) {
        if (!e.itemId) continue;
        const district = restaurantMap[e.itemId]?.district?.toLowerCase() ?? null;
        if (!district) continue;
        if (new Date(e.createdAt) >= midpoint) {
          byDistrictCurrent[district] = (byDistrictCurrent[district] ?? 0) + 1;
        } else {
          byDistrictPrev[district] = (byDistrictPrev[district] ?? 0) + 1;
        }
      }
      const allDistricts = new Set([...Object.keys(byDistrictCurrent), ...Object.keys(byDistrictPrev)]);
      const geoHotspots = [...allDistricts]
        .map(district => {
          const current = byDistrictCurrent[district] ?? 0;
          const prev = byDistrictPrev[district] ?? 0;
          const growth = prev > 0 ? Math.round(((current - prev) / prev) * 100) : (current > 0 ? 100 : 0);
          const abbr = DISTRICT_ABBR[district] ?? district.substring(0, 3).toUpperCase();
          const zoneName = district.charAt(0).toUpperCase() + district.slice(1);
          return { zone: zoneName, abbr, count: current + prev, growth };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return res.json({ funnel: { impressions, swipeViews, rightSwipes, orderIntent }, topRestaurants, cuisineTrend, dayPatterns, heatmap, deliveryTotal, geoHotspots });
    } catch {
      return res.status(500).json({ message: "Internal server error" });
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

  app.get("/api/admin/analytics/quality-trend", async (req, res) => {
    try {
      if (!requireAnalyticsAccess(req, res)) return;
      const config = await storage.getAdminConfig("analytics_quality_reports");
      const reports = Array.isArray(config?.value?.items) ? config.value.items : [];
      const lastAlerts = Array.isArray(config?.value?.latestAlerts) ? config.value.latestAlerts : [];
      res.json({ reports, lastAlerts });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/analytics/slo-status", async (req, res) => {
    try {
      if (!requireAnalyticsAccess(req, res)) return;

      const config = await storage.getAdminConfig("analytics_quality_reports");
      const reports = Array.isArray(config?.value?.items) ? config.value.items : [];
      const latestReport = reports[0] as { ratesPct?: Record<string, number> } | undefined;

      const qualityPassRatePct = latestReport?.ratesPct
        ? Math.max(0, 100 - (latestReport.ratesPct.unknownEventType ?? 0) - (latestReport.ratesPct.missingTimestamp ?? 0))
        : 100;

      const userSnapshots = await storage.listUserFeatureSnapshots(500);
      const now = Date.now();
      const freshnessHours =
        userSnapshots.length > 0
          ? userSnapshots.reduce((sum, s) => sum + (now - new Date(s.updatedAt).getTime()) / 3_600_000, 0) / userSnapshots.length
          : 0;

      const slos = checkSLOs({
        qualityPassRatePct,
        featureFreshnessHoursAvg: freshnessHours,
      });

      const failing = slos.filter((s) => !s.passing);
      if (failing.length > 0) {
        await sendAlert({
          source: "slo-check",
          severity: "warn",
          message: `SLO breach: ${failing.map((s) => s.name).join(", ")}`,
          metadata: { slos: failing },
        });
      }

      res.json({ slos, checkedAt: new Date().toISOString() });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/analytics/derived", async (req, res) => {
    try {
      if (!requireAnalyticsAccess(req, res)) return;
      const daysParam = Number(req.query.days ?? 30);
      const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 180) : 30;

      // Try materialized rollups first (fast path)
      const rollups = await storage.listDailyRollups(days);
      if (rollups.length > 0) {
        const totals = rollups.reduce(
          (acc, r) => ({
            events: acc.events + r.totalEvents,
            users: Math.max(acc.users, r.uniqueUsers),
            items: Math.max(acc.items, r.uniqueItems),
          }),
          { events: 0, users: 0, items: 0 },
        );
        const byTypeAgg: Record<string, number> = {};
        for (const r of rollups) {
          for (const [k, v] of Object.entries(r.byType ?? {})) {
            byTypeAgg[k] = (byTypeAgg[k] ?? 0) + v;
          }
        }
        const funnel = rollups.reduce(
          (acc, r) => ({
            views: acc.views + r.funnelViews,
            swipes: acc.swipes + r.funnelSwipes,
            favorites: acc.favorites + r.funnelFavorites,
            orderIntent: acc.orderIntent + r.funnelOrders,
          }),
          { views: 0, swipes: 0, favorites: 0, orderIntent: 0 },
        );
        const dailyEvents = rollups
          .map((r) => ({ day: r.date, count: r.totalEvents }))
          .sort((a, b) => a.day.localeCompare(b.day));
        const latestRollup = rollups[0];
        return res.json({
          windowDays: days,
          source: "rollup",
          updatedAt: latestRollup?.updatedAt,
          totals,
          funnel,
          dailyEvents,
          topUsers: [],
          topItems: [],
          retention: {
            cohortSize: totals.users,
            d1RatePct: latestRollup?.d1RetentionPct ?? 0,
            d7RatePct: latestRollup?.d7RetentionPct ?? 0,
          },
        });
      }

      // Fallback: on-the-fly computation (no rollups yet)
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
        source: "realtime",
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
      if (!requirePermission("manage_config")(req, res)) return;
      const [config, recommendationWeightsConfig] = await Promise.all([
        storage.getAdminConfig("experiments_config"),
        storage.getAdminConfig("recommendation_weights"),
      ]);
      const defaults: ExperimentConfig[] = [
        {
          experimentKey: DEFAULT_RECOMMENDATION_EXPERIMENT_KEY,
          enabled: true,
          variants: [
            { key: "control", weight: 50 },
            { key: "hybrid_v2", weight: 50 },
          ],
        },
      ];
      const experiments = parseExperimentConfigs(config?.value?.experiments);
      const recommendationWeights = parseRecommendationWeightsConfig(recommendationWeightsConfig?.value);
      res.json({
        experiments: experiments.length > 0 ? experiments : defaults,
        recommendationWeights,
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/experiments/config", async (req, res) => {
    try {
      if (!requirePermission("manage_config")(req, res)) return;
      const input = z.object({
        experiments: z.array(z.object({
          experimentKey: z.string().min(1),
          enabled: z.boolean(),
          variants: z.array(z.object({
            key: z.string().min(1),
            weight: z.number().min(0),
          })).min(1),
        })).min(1),
        recommendationWeights: z.object({
          activePresetKey: z.string().min(1),
          presets: z.record(z.string().min(1), z.object({
            cuisineAffinity: z.number().finite(),
            priceMatch: z.number().finite(),
            distanceScore: z.number().finite(),
            globalPopularity: z.number().finite(),
            recentNegativePenalty: z.number().finite(),
          })).refine((value) => Object.keys(value).length > 0, "At least one preset is required"),
        }),
      }).parse(req.body ?? {});

      const missingPresetKeys = validateVariantPresetMapping(input.experiments, input.recommendationWeights.presets);
      if (missingPresetKeys.length > 0) {
        return res.status(400).json({
          message: `Missing weight presets for variants: ${missingPresetKeys.join(", ")}`,
        });
      }
      if (!input.recommendationWeights.presets[input.recommendationWeights.activePresetKey]) {
        return res.status(400).json({
          message: "Active preset key must exist in recommendationWeights.presets",
        });
      }

      const nowIso = new Date().toISOString();
      const [savedExperiments] = await Promise.all([
        storage.upsertAdminConfig("experiments_config", {
          updatedAt: nowIso,
          experiments: input.experiments,
        }),
        storage.upsertAdminConfig("recommendation_weights", {
          updatedAt: nowIso,
          activePresetKey: input.recommendationWeights.activePresetKey,
          presets: input.recommendationWeights.presets,
        }),
      ]);
      void appendSecurityAudit({
        ts: new Date().toISOString(),
        level: "info",
        source: "experiments",
        message: "experiments_config_updated",
        metadata: {
          updatedBy: req.session?.username ?? req.session?.ownerEmail ?? "unknown",
          experimentCount: input.experiments.length,
          presetCount: Object.keys(input.recommendationWeights.presets).length,
          activePresetKey: input.recommendationWeights.activePresetKey,
          ip: req.ip,
        },
      });
      res.json({
        ...savedExperiments.value,
        recommendationWeights: input.recommendationWeights,
      });
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

      const [config, recommendationWeightsConfig] = await Promise.all([
        storage.getAdminConfig("experiments_config"),
        storage.getAdminConfig("recommendation_weights"),
      ]);
      const experiments = parseExperimentConfigs(config?.value?.experiments);
      const recommendationWeights = parseRecommendationWeightsConfig(recommendationWeightsConfig?.value);
      const resolved = resolveRecommendationExperiment({
        experiments,
        recommendationWeights,
        experimentKey: input.experimentKey,
        seed: input.userId,
      });

      const exposureConfig = await storage.getAdminConfig("experiments_exposures");
      const exposures = Array.isArray(exposureConfig?.value?.items)
        ? (exposureConfig?.value?.items as Array<Record<string, unknown>>)
        : [];
      const exposure = {
        ts: new Date().toISOString(),
        userId: input.userId,
        experimentKey: input.experimentKey,
        variant: resolved.variant,
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
          variant: resolved.variant,
          ip: req.ip,
        },
      });

      res.json({
        experimentKey: input.experimentKey,
        variant: resolved.variant,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/experiments/recommendations/report", async (req, res) => {
    try {
      if (!requireAnalyticsAccess(req, res)) return;
      const daysParam = Number(req.query.days ?? 7);
      const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 90) : 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const logs = await storage.listEventLogs(10000, since);
      const filtered = logs.filter((log) =>
        log.eventType === "view_card" ||
        log.eventType === "swipe" ||
        log.eventType === "deeplink_click",
      );
      const rows = aggregateRecommendationExperimentReport(filtered);
      res.json({
        windowDays: days,
        rows,
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/recommendations/personalized", async (req, res) => {
    try {
      const input = z.object({
        userId: z.string().min(1),
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        hour: z.coerce.number().int().min(0).max(23).optional(),
        day: z.coerce.number().int().min(0).max(6).optional(),
        limit: z.coerce.number().int().positive().max(50).optional().default(20),
      }).parse(req.query ?? {});

      const [experimentsConfig, recommendationWeightsConfig] = await Promise.all([
        storage.getAdminConfig("experiments_config"),
        storage.getAdminConfig("recommendation_weights"),
      ]);
      const resolvedExperiment = resolveRecommendationExperiment({
        experiments: parseExperimentConfigs(experimentsConfig?.value?.experiments),
        recommendationWeights: parseRecommendationWeightsConfig(recommendationWeightsConfig?.value),
        experimentKey: DEFAULT_RECOMMENDATION_EXPERIMENT_KEY,
        seed: input.userId,
      });

      // Check per-user cache first (TTL: 5 min, invalidated on feature-snapshot rebuild)
      const cacheKey = `${input.userId}:${resolvedExperiment.experimentKey}:${resolvedExperiment.variant}:${input.lat ?? ""}:${input.lng ?? ""}:${input.hour ?? ""}:${input.day ?? ""}:${input.limit}`;
      const cached = getRecCache(cacheKey);
      if (cached) return res.json(cached);

      const latestConsent = await storage.getLatestConsent(input.userId, "behavior_tracking");
      const restaurants = await storage.getRestaurants("trending");

      let source: "personalized" | "sparse_blend" | "segment" | "trending" = "trending";
      let items: Array<any> = [];
      const now = new Date();

      if (latestConsent?.granted) {
        const feature = await storage.getUserFeatureSnapshot(input.userId);
        const result = buildPersonalizedRecommendations({
          restaurants,
          feature: feature
            ? {
                cuisineAffinity: feature.cuisineAffinity ?? {},
                preferredPriceLevel: feature.preferredPriceLevel ?? 2,
                dislikedItemIds: feature.dislikedItemIds ?? [],
                activeHours: feature.activeHours ?? [],
                locationClusters: feature.locationClusters ?? [],
              }
            : null,
          context: {
            hourOfDay: input.hour ?? now.getHours(),
            dayOfWeek: input.day ?? now.getDay(),
          },
          weights: resolvedExperiment.weights,
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

      const response = {
        source,
        variant: resolvedExperiment.variant,
        experimentKey: resolvedExperiment.experimentKey,
        items,
      };
      setRecCache(cacheKey, response);
      res.json(response);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid query" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/recommendations/group", async (req, res) => {
    try {
      const input = z.object({
        sessionCode: z.string().min(1).transform((s) => s.toUpperCase()),
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        hour: z.coerce.number().int().min(0).max(23).optional(),
        day: z.coerce.number().int().min(0).max(6).optional(),
        limit: z.coerce.number().int().positive().max(50).optional().default(20),
      }).parse(req.query ?? {});

      const [experimentsConfig, recommendationWeightsConfig] = await Promise.all([
        storage.getAdminConfig("experiments_config"),
        storage.getAdminConfig("recommendation_weights"),
      ]);
      const resolvedExperiment = resolveRecommendationExperiment({
        experiments: parseExperimentConfigs(experimentsConfig?.value?.experiments),
        recommendationWeights: parseRecommendationWeightsConfig(recommendationWeightsConfig?.value),
        experimentKey: DEFAULT_RECOMMENDATION_EXPERIMENT_KEY,
        seed: input.sessionCode,
      });

      const cacheKey = `group:${input.sessionCode}:${resolvedExperiment.experimentKey}:${resolvedExperiment.variant}:${input.lat ?? ""}:${input.lng ?? ""}:${input.hour ?? ""}:${input.day ?? ""}:${input.limit}`;
      const cached = getRecCache(cacheKey);
      if (cached) return res.json(cached);

      const session = await storage.getGroupSessionByCode(input.sessionCode);
      if (!session) return res.status(404).json({ message: "Session not found" });

      // Build restaurant pool — replicate deck endpoint's filtering pattern
      const settings = (session.settings || {}) as {
        mode?: "restaurant" | "menu";
        locations?: string[];
        budget?: string;
        diet?: string[];
      };
      const selectedBudget = String(settings.budget || "").toLowerCase();
      const selectedLocations = settings.locations ?? [];
      const selectedDiet = settings.diet ?? [];

      const budgetPredicate = (priceLevel: number) => {
        if (selectedBudget.includes("cheap")) return priceLevel <= 1;
        if (selectedBudget.includes("moderate")) return priceLevel <= 2;
        if (selectedBudget.includes("fancy")) return priceLevel >= 3;
        if (selectedBudget.includes("expensive")) return priceLevel >= 4;
        return true;
      };

      const locationTokensMap: Record<string, string[]> = {
        bts: ["bts", "station", "skytrain"],
        mall: ["mall", "plaza", "center", "centre"],
        street: ["street", "market", "night market"],
        rooftop: ["rooftop", "sky", "view"],
        riverside: ["river", "riverside", "waterfront"],
        latenight: ["late", "night", "24", "midnight"],
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

      const textMatch = (r: { name: string; category: string; description: string; address: string }, tokens: string[]) => {
        if (tokens.length === 0) return true;
        const haystack = `${r.name} ${r.category} ${r.description} ${r.address}`.toLowerCase();
        return tokens.some((t) => haystack.includes(t.toLowerCase()));
      };

      const nearbyRestaurants =
        Number.isFinite(input.lat) && Number.isFinite(input.lng)
          ? await storage.findRestaurantsNear(input.lat!, input.lng!, 5000)
          : await storage.getRestaurants();

      const pool = nearbyRestaurants.filter((r) => {
        if (!budgetPredicate(r.priceLevel ?? 2)) return false;
        const combined = [...locationTokens, ...dietTokens];
        return textMatch({ name: r.name, category: r.category ?? "", description: r.description ?? "", address: r.address ?? "" }, combined.length > 0 ? combined : []);
      });

      // Load members and their feature snapshots
      const members = await storage.listGroupMembers(session.id);
      const snapshotResults = await Promise.all(
        members.map((m) => (m.lineUserId ? storage.getUserFeatureSnapshot(m.lineUserId) : Promise.resolve(null))),
      );

      const memberSnapshots = members.map((m, i) => ({
        memberId: m.id,
        name: m.name,
        avatarUrl: m.avatarUrl,
        snapshot: snapshotResults[i] != null
          ? {
              cuisineAffinity: snapshotResults[i]!.cuisineAffinity ?? {},
              preferredPriceLevel: snapshotResults[i]!.preferredPriceLevel ?? 2,
              dislikedItemIds: snapshotResults[i]!.dislikedItemIds ?? [],
              activeHours: snapshotResults[i]!.activeHours ?? [],
            }
          : null,
      }));

      const blended = blendSnapshots(memberSnapshots.map((m) => m.snapshot));
      const now = new Date();
      const context = {
        hourOfDay: input.hour ?? now.getHours(),
        dayOfWeek: input.day ?? now.getDay(),
      };

      const result = buildPersonalizedRecommendations({
        restaurants: pool,
        feature: blended,
        lat: input.lat,
        lng: input.lng,
        context,
        weights: resolvedExperiment.weights,
        limit: input.limit,
      });

      const perMemberScores = computePerMemberScores(
        result.items,
        memberSnapshots,
        input.lat,
        input.lng,
        context,
        resolvedExperiment.weights,
      );

      const membersWithData = memberSnapshots.filter((m) => m.snapshot != null).length;

      const items = result.items.map((r) => ({
        ...r,
        groupScore: r.score,
        memberScores: perMemberScores.get(r.id) ?? [],
      }));

      const response = {
        source: result.source,
        variant: resolvedExperiment.variant,
        experimentKey: resolvedExperiment.experimentKey,
        memberCount: members.length,
        membersWithData,
        items,
      };

      setRecCache(cacheKey, response);
      res.json(response);
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
      const [events, preferences, features, consent] = await Promise.all([
        storage.listEventLogsByUser(input.userId),
        storage.listUserPreferences(input.userId),
        storage.getUserFeatureSnapshot(input.userId),
        storage.getLatestConsent(input.userId, "behavior_tracking"),
      ]);
      res.json({
        userId: input.userId,
        exportedAt: new Date().toISOString(),
        events,
        preferences,
        featureSnapshot: features ?? null,
        consentLog: consent ?? null,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/campaigns/active", async (req, res) => {
    try {
      const allCampaigns = await storage.listCampaigns();
      const today = new Date().toISOString().slice(0, 10);
      const active = allCampaigns
        .filter((c) => c.status === "active" && (!c.endDate || c.endDate >= today))
        .map((c) => ({
          id: String(c.id),
          title: c.title,
          dealType: c.dealType ?? "fixedAmount",
          dealValue: c.dealValue ?? "",
          endDate: c.endDate ?? "",
          restaurantOwnerKey: c.restaurantOwnerKey,
          restaurantName: c.restaurantOwnerKey.split("@")[0] ?? c.title,
          restaurantImage: "",
          description: "",
          accentColor: "#1E293B",
        }));
      res.json(active);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/analytics/kpi-trends", async (req, res) => {
    try {
      if (!requireAnalyticsAccess(req, res)) return;
      const rollups = await storage.listDailyRollups(7);
      const sorted = [...rollups].sort((a, b) => a.date.localeCompare(b.date));
      const padTo7 = <T>(arr: T[], fill: T): T[] => {
        const out = [...arr];
        while (out.length < 7) out.unshift(fill);
        return out.slice(-7);
      };
      res.json({
        dates: padTo7(sorted.map((r) => r.date), ""),
        eventCounts: padTo7(sorted.map((r) => r.totalEvents), 0),
        userCounts: padTo7(sorted.map((r) => r.uniqueUsers), 0),
        swipeCounts: padTo7(sorted.map((r) => r.funnelSwipes), 0),
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Notifications: admin manual campaign send ────────────────────────────────
  app.post("/api/notifications/send", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const input = z.object({
        lineUserIds: z.array(z.string().min(1)).min(1),
        message: z.string().min(1).max(2000),
        campaignId: z.number().int().optional(),
      }).parse(req.body ?? {});

      const ok = await lineMessaging.sendToUsers(input.lineUserIds, [{ type: "text", text: input.message }]);
      const status = ok ? "sent" : "failed";

      await storage.createNotificationLog({
        channel: "line",
        type: "campaign",
        recipientId: `multicast:${input.lineUserIds.length}`,
        campaignId: input.campaignId ?? null,
        sessionCode: null,
        messageText: input.message,
        status,
        sentBy: req.session?.username ?? "admin",
      });

      res.json({ ok, lineConfigured: lineMessaging.isConfigured(), recipientCount: input.lineUserIds.length });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Notifications: logs list ─────────────────────────────────────────────────
  app.get("/api/notifications/logs", async (req, res) => {
    try {
      if (!requireAdminSession(req, res)) return;
      const limit = Math.min(Number(req.query.limit ?? 100), 500);
      const logs = await storage.listNotificationLogs(limit);
      res.json(logs);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Group nudge: server-side rate limited (max 1 per member per 5 min) ───────
  const nudgeLog = new Map<string, number>(); // key: "code:memberName" → lastSentMs
  const NUDGE_COOLDOWN_MS = 5 * 60 * 1000;

  app.post("/api/group/:code/nudge", async (req, res) => {
    try {
      const { code } = req.params;
      const input = z.object({
        memberName: z.string().min(1),
        lineUserId: z.string().optional(),
        inviteText: z.string().max(500).optional(),
      }).parse(req.body ?? {});

      const key = `${code}:${input.memberName}`;
      const lastSent = nudgeLog.get(key) ?? 0;
      const now = Date.now();

      if (now - lastSent < NUDGE_COOLDOWN_MS) {
        const waitSec = Math.ceil((NUDGE_COOLDOWN_MS - (now - lastSent)) / 1000);
        return res.status(429).json({ message: `Please wait ${waitSec}s before nudging ${input.memberName} again.` });
      }

      nudgeLog.set(key, now);

      const message = input.inviteText ?? `Hey! Your group is waiting for you to join the Toast session (${code}). Come swipe! 🍽️`;

      let lineOk = false;
      if (input.lineUserId) {
        lineOk = await lineMessaging.sendToUser(input.lineUserId, [{ type: "text", text: message }]);
      }

      await storage.createNotificationLog({
        channel: "line",
        type: "nudge",
        recipientId: input.lineUserId ?? input.memberName,
        campaignId: null,
        sessionCode: code,
        messageText: message,
        status: input.lineUserId ? (lineOk ? "sent" : "skipped") : "skipped",
        sentBy: "system",
      });

      res.json({ ok: true, lineDelivered: lineOk, lineConfigured: lineMessaging.isConfigured() });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid payload" });
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
