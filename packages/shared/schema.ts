import { pgTable, text, serial, integer, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type RestaurantOpeningHour = {
  day: string;
  hours: string;
};

export type RestaurantReview = {
  author: string;
  rating: number;
  text: string;
  timeAgo?: string;
};

export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  lat: text("lat").notNull(),
  lng: text("lng").notNull(),
  category: text("category").notNull(),
  priceLevel: integer("price_level").notNull(),
  rating: text("rating").notNull(),
  address: text("address").notNull(),
  isNew: boolean("is_new").default(false),
  trendingScore: integer("trending_score").default(0),
  phone: text("phone"),
  openingHours: jsonb("opening_hours").$type<RestaurantOpeningHour[]>(),
  reviews: jsonb("reviews").$type<RestaurantReview[]>(),
  isSponsored: boolean("is_sponsored").notNull().default(false),
  sponsoredUntil: text("sponsored_until"),
  vibes: text("vibes").array().default([]),
  district: text("district"),
  photos: text("photos").array().default([]),
  googlePlaceId: text("google_place_id"),
  osmId: text("osm_id"),
  reviewCount: integer("review_count").notNull().default(0),
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({ id: true });
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = typeof restaurants.$inferInsert;

export const menus = pgTable("menus", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  priceApprox: integer("price_approx"),
  tags: text("tags").array().default([]),
  dietFlags: text("diet_flags").array().default([]),
  isActive: boolean("is_active").notNull().default(true),
  isSponsored: boolean("is_sponsored").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  restaurantIdIdx: index("menus_restaurant_id_idx").on(t.restaurantId),
  nameIdx: index("menus_name_idx").on(t.name),
}));

export const insertMenuSchema = createInsertSchema(menus).omit({ id: true, createdAt: true });
export type Menu = typeof menus.$inferSelect;
export type InsertMenu = z.infer<typeof insertMenuSchema>;

export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  restaurantIdIdx: index("promotions_restaurant_id_idx").on(t.restaurantId),
  isActiveIdx: index("promotions_is_active_idx").on(t.isActive),
}));

export const insertPromotionSchema = createInsertSchema(promotions).omit({ id: true, createdAt: true });
export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;

export const restaurantOwners = pgTable("restaurant_owners", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  lineUserId: text("line_user_id"),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationStatus: text("verification_status").notNull().default("pending"),
  subscriptionTier: text("subscription_tier").notNull().default("free"),
  subscriptionExpiry: text("subscription_expiry"),
  paymentConnected: boolean("payment_connected").notNull().default(false),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  restaurantIdIdx: index("restaurant_owners_restaurant_id_idx").on(t.restaurantId),
  emailIdx: index("restaurant_owners_email_idx").on(t.email),
}));

export const insertRestaurantOwnerSchema = createInsertSchema(restaurantOwners).omit({ id: true, createdAt: true });
export type RestaurantOwnerRow = typeof restaurantOwners.$inferSelect;
export type InsertRestaurantOwner = z.infer<typeof insertRestaurantOwnerSchema>;

export const restaurantClaims = pgTable("restaurant_claims", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id").notNull().references(() => restaurantOwners.id, { onDelete: "cascade" }),
  ownershipType: text("ownership_type").default("single_location"),
  status: text("status").notNull().default("pending"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewNotes: text("review_notes"),
  proofDocuments: text("proof_documents").array().default([]),
  verificationChecklist: jsonb("verification_checklist").$type<Record<string, boolean>>().default({}),
}, (t) => ({
  restaurantIdIdx: index("restaurant_claims_restaurant_id_idx").on(t.restaurantId),
  ownerIdIdx: index("restaurant_claims_owner_id_idx").on(t.ownerId),
  statusIdx: index("restaurant_claims_status_idx").on(t.status),
}));

export const insertRestaurantClaimSchema = createInsertSchema(restaurantClaims).omit({ id: true, submittedAt: true });
export type RestaurantClaimRow = typeof restaurantClaims.$inferSelect;
export type InsertRestaurantClaim = z.infer<typeof insertRestaurantClaimSchema>;

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  preference: text("preference").notNull(),
}, (t) => ({
  userIdIdx: index("user_preferences_user_id_idx").on(t.userId),
}));
export const insertUserPreferenceSchema = createInsertSchema(userPreferences).omit({ id: true });
export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  lineUserId: text("line_user_id").notNull().unique(),
  role: text("role").notNull().default("user"),
  displayName: text("display_name").notNull(),
  pictureUrl: text("picture_url"),
  statusMessage: text("status_message"),
  dietaryRestrictions: text("dietary_restrictions").array().default([]),
  cuisinePreferences: text("cuisine_preferences").array().default([]),
  defaultBudget: integer("default_budget").default(2),
  defaultDistance: text("default_distance").default("5km"),
  partnerLineUserId: text("partner_line_user_id"),
  partnerDisplayName: text("partner_display_name"),
  partnerPictureUrl: text("partner_picture_url"),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true });
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export const groupSessions = pgTable("group_sessions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  status: text("status").notNull().default("active"),
  settings: jsonb("settings").$type<{
    mode?: "restaurant" | "menu";
    locations?: string[];
    budget?: string;
    diet?: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => groupSessions.id, { onDelete: "cascade" }),
  lineUserId: text("line_user_id"),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  joined: boolean("joined").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  sessionIdIdx: index("group_members_session_id_idx").on(t.sessionId),
  lineUserIdIdx: index("group_members_line_user_id_idx").on(t.lineUserId),
}));

export const insertGroupSessionSchema = createInsertSchema(groupSessions).omit({ id: true, createdAt: true });
export type GroupSession = typeof groupSessions.$inferSelect;
export type InsertGroupSession = z.infer<typeof insertGroupSessionSchema>;

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({ id: true, createdAt: true });
export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;

export const placesRequestLogs = pgTable("places_request_logs", {
  id: serial("id").primaryKey(),
  ts: timestamp("ts").defaultNow().notNull(),
  source: text("source").notNull().default("osm"),
  cacheHit: boolean("cache_hit").notNull().default(false),
  fallbackUsed: boolean("fallback_used").notNull().default(false),
  query: text("query").notNull().default("restaurant"),
  resultCount: integer("result_count").notNull().default(0),
});

export const insertPlacesRequestLogSchema = createInsertSchema(placesRequestLogs).omit({ id: true, ts: true });
export type PlacesRequestLog = typeof placesRequestLogs.$inferSelect;
export type InsertPlacesRequestLog = z.infer<typeof insertPlacesRequestLogSchema>;

/**
 * Geo tile cache tracker.
 * Records which grid tiles have had their restaurant data fetched from external APIs.
 * Key format: "tile:{lat2dp}:{lng2dp}:{radiusM}:{query}"
 * Allows the places service to skip API calls for already-fetched areas, surviving server restarts.
 */
export const placesTiles = pgTable("places_tiles", {
  tileKey: text("tile_key").primaryKey(),
  lastFetchedAt: timestamp("last_fetched_at").defaultNow().notNull(),
  resultCount: integer("result_count").notNull().default(0),
  source: text("source").notNull().default("osm"),
});
export type PlacesTile = typeof placesTiles.$inferSelect;

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  dealType: text("deal_type"),
  dealValue: text("deal_value"),
  restaurantOwnerKey: text("restaurant_owner_key").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  targetGroups: text("target_groups").array().default([]),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  dailyBudget: integer("daily_budget").notNull().default(0),
  totalBudget: integer("total_budget").notNull().default(0),
  spent: integer("spent").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  statusIdx: index("campaigns_status_idx").on(t.status),
  ownerKeyIdx: index("campaigns_owner_key_idx").on(t.restaurantOwnerKey),
}));

export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true, createdAt: true });
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export const adBanners = pgTable("ad_banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  position: text("position"),
  isActive: boolean("is_active").notNull().default(true),
  startDate: text("start_date"),
  endDate: text("end_date"),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdBannerSchema = createInsertSchema(adBanners).omit({ id: true, createdAt: true });
export type AdBanner = typeof adBanners.$inferSelect;
export type InsertAdBanner = z.infer<typeof insertAdBannerSchema>;

export const adminConfigs = pgTable("admin_configs", {
  id: serial("id").primaryKey(),
  configKey: text("config_key").notNull().unique(),
  value: jsonb("value").notNull().$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAdminConfigSchema = createInsertSchema(adminConfigs).omit({ id: true, updatedAt: true });
export type AdminConfig = typeof adminConfigs.$inferSelect;
export type InsertAdminConfig = z.infer<typeof insertAdminConfigSchema>;

export const eventLogs = pgTable("event_logs", {
  id: serial("id").primaryKey(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  eventType: text("event_type").notNull(),
  userId: text("user_id"),
  sessionId: text("session_id"),
  itemId: integer("item_id"),
  menuItemId: integer("menu_item_id").references(() => menus.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("event_logs_user_id_idx").on(t.userId),
  createdAtIdx: index("event_logs_created_at_idx").on(t.createdAt),
}));

export const insertEventLogSchema = createInsertSchema(eventLogs).omit({ id: true, createdAt: true });
export type EventLog = typeof eventLogs.$inferSelect;
export type InsertEventLog = z.infer<typeof insertEventLogSchema>;

export const userFeatureSnapshots = pgTable("user_feature_snapshots", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  cuisineAffinity: jsonb("cuisine_affinity").$type<Record<string, number>>().default({}),
  preferredPriceLevel: integer("preferred_price_level").default(2),
  activeHours: integer("active_hours").array().default([]),
  locationClusters: text("location_clusters").array().default([]),
  dislikedItemIds: integer("disliked_item_ids").array().default([]),
  menuItemAffinity: jsonb("menu_item_affinity").$type<Record<number, number>>().default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserFeatureSnapshotSchema = createInsertSchema(userFeatureSnapshots).omit({ id: true, updatedAt: true });
export type UserFeatureSnapshot = typeof userFeatureSnapshots.$inferSelect;
export type InsertUserFeatureSnapshot = z.infer<typeof insertUserFeatureSnapshotSchema>;

export const itemFeatureSnapshots = pgTable("item_feature_snapshots", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().unique().references(() => restaurants.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull().default("restaurant"),
  ctr: integer("ctr").notNull().default(0),
  likeRate: integer("like_rate").notNull().default(0),
  superLikeRate: integer("super_like_rate").notNull().default(0),
  conversionRate: integer("conversion_rate").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertItemFeatureSnapshotSchema = createInsertSchema(itemFeatureSnapshots).omit({ id: true, updatedAt: true });
export type ItemFeatureSnapshot = typeof itemFeatureSnapshots.$inferSelect;
export type InsertItemFeatureSnapshot = z.infer<typeof insertItemFeatureSnapshotSchema>;

export const consentLogs = pgTable("consent_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  consentType: text("consent_type").notNull().default("behavior_tracking"),
  granted: boolean("granted").notNull().default(false),
  version: text("version").notNull().default("v1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("consent_logs_user_id_idx").on(t.userId),
}));

export const insertConsentLogSchema = createInsertSchema(consentLogs).omit({ id: true, createdAt: true });
export type ConsentLog = typeof consentLogs.$inferSelect;
export type InsertConsentLog = z.infer<typeof insertConsentLogSchema>;

export const analyticsDailyRollups = pgTable("analytics_daily_rollups", {
  date: text("date").primaryKey(),
  totalEvents: integer("total_events").notNull().default(0),
  uniqueUsers: integer("unique_users").notNull().default(0),
  uniqueItems: integer("unique_items").notNull().default(0),
  byType: jsonb("by_type").$type<Record<string, number>>().default({}),
  funnelViews: integer("funnel_views").notNull().default(0),
  funnelSwipes: integer("funnel_swipes").notNull().default(0),
  funnelFavorites: integer("funnel_favorites").notNull().default(0),
  funnelOrders: integer("funnel_orders").notNull().default(0),
  d1RetentionPct: integer("d1_retention_pct").notNull().default(0),
  d7RetentionPct: integer("d7_retention_pct").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAnalyticsDailyRollupSchema = createInsertSchema(analyticsDailyRollups).omit({ updatedAt: true });
export type AnalyticsDailyRollup = typeof analyticsDailyRollups.$inferSelect;
export type InsertAnalyticsDailyRollup = z.infer<typeof insertAnalyticsDailyRollupSchema>;

export const notificationLogs = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  channel: text("channel").notNull().default("line"), // "line" | "internal"
  type: text("type").notNull(), // "campaign", "nudge", "group_result"
  recipientId: text("recipient_id"), // LINE userId or group member name
  campaignId: integer("campaign_id"),
  sessionCode: text("session_code"),
  messageText: text("message_text").notNull(),
  status: text("status").notNull().default("sent"), // "sent" | "failed" | "skipped"
  sentBy: text("sent_by"), // admin username or "system"
  sentAt: timestamp("sent_at").defaultNow().notNull(),
}, (t) => ({
  typeIdx: index("notification_logs_type_idx").on(t.type),
  sentAtIdx: index("notification_logs_sent_at_idx").on(t.sentAt),
}));

export const insertNotificationLogSchema = createInsertSchema(notificationLogs).omit({ id: true, sentAt: true });
export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;

// UI compatibility types for admin modules
export type AnalyticsEvent = {
  id: number;
  eventType: string;
  userId: string | null;
  restaurantId: number | null;
  metadata: string | null;
  timestamp: string;
};

export type RestaurantOwner = {
  id: number;
  restaurantId: number;
  displayName: string;
  email: string;
  phone?: string | null;
  lineUserId?: string | null;
  isVerified?: boolean;
  paymentConnected?: boolean;
  paymentMethod?: string | null;
  subscriptionTier?: "free" | "pro" | "premium" | string;
  subscriptionExpiry?: string | null;
  verificationStatus?: "pending" | "verified" | "rejected" | string;
};

export type RestaurantClaim = {
  id: number;
  restaurantId: number;
  ownerId: number;
  ownershipType?: string | null;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewNotes?: string | null;
  proofDocuments?: string[] | null;
  verificationChecklist?: Array<{ id: string; label: string; checked: boolean }> | null;
};

export type AdminPermission =
  | "manage_restaurants"
  | "manage_users"
  | "manage_campaigns"
  | "manage_banners"
  | "view_analytics"
  | "manage_claims"
  | "manage_config";

export type AdminRole = "superadmin" | "admin" | "moderator" | "viewer";

export const ADMIN_ROLES: AdminRole[] = ["superadmin", "admin", "moderator", "viewer"];

export const ADMIN_PERMISSIONS: AdminPermission[] = [
  "manage_restaurants",
  "manage_users",
  "manage_campaigns",
  "manage_banners",
  "view_analytics",
  "manage_claims",
  "manage_config",
];

export const ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  superadmin: [...ADMIN_PERMISSIONS],
  admin: ["manage_restaurants", "manage_campaigns", "manage_banners", "view_analytics", "manage_claims", "manage_config"],
  moderator: ["manage_restaurants", "view_analytics", "manage_claims"],
  viewer: ["view_analytics"],
};

export type AdminUser = {
  id: number;
  username: string;
  role: AdminRole;
  permissions: AdminPermission[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  passwordHash?: string;
};

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  permissions: jsonb("permissions").$type<AdminPermission[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  emailIdx: index("admin_users_email_idx").on(t.email),
}));

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export const sponsoredRequests = pgTable("sponsored_requests", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id").notNull().references(() => restaurantOwners.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  requestedStartDate: text("requested_start_date"),
  requestedEndDate: text("requested_end_date"),
  notes: text("notes"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
}, (t) => ({
  restaurantIdIdx: index("sponsored_requests_restaurant_id_idx").on(t.restaurantId),
  ownerIdIdx: index("sponsored_requests_owner_id_idx").on(t.ownerId),
  statusIdx: index("sponsored_requests_status_idx").on(t.status),
}));

export const insertSponsoredRequestSchema = createInsertSchema(sponsoredRequests).omit({ id: true, createdAt: true, reviewedAt: true });
export type SponsoredRequest = typeof sponsoredRequests.$inferSelect;
export type InsertSponsoredRequest = z.infer<typeof insertSponsoredRequestSchema>;

export const partnerInvites = pgTable("partner_invites", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  initiatorLineUserId: text("initiator_line_user_id").notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "accepted" | "declined" | "expired"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
}, (t) => ({
  tokenIdx: index("partner_invites_token_idx").on(t.token),
  initiatorIdx: index("partner_invites_initiator_idx").on(t.initiatorLineUserId),
}));

export type PartnerInvite = typeof partnerInvites.$inferSelect;
