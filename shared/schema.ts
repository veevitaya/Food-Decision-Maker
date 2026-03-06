import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
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
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({ id: true });
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = typeof restaurants.$inferInsert;

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  restaurantId: integer("restaurant_id").notNull(),
  preference: text("preference").notNull(),
});
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
    locations?: string[];
    budget?: string;
    diet?: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  joined: boolean("joined").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
});

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
