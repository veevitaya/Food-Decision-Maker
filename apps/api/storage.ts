import { db } from "./db";
import { applyItemFeatureDeltas } from "./lib/itemFeatureSnapshot";
import {
  restaurants,
  userPreferences,
  userProfiles,
  groupSessions,
  groupMembers,
  menus,
  promotions,
  restaurantOwners,
  restaurantClaims,
  placesRequestLogs,
  campaigns,
  adBanners,
  adminConfigs,
  eventLogs,
  userFeatureSnapshots,
  itemFeatureSnapshots,
  consentLogs,
  analyticsDailyRollups,
  adminUsers,
  sponsoredRequests,
  type SponsoredRequest,
  type InsertSponsoredRequest,
  type Restaurant,
  type InsertRestaurant,
  type UserPreference,
  type InsertUserPreference,
  type UserProfile,
  type InsertUserProfile,
  type GroupSession,
  type InsertGroupSession,
  type GroupMember,
  type InsertGroupMember,
  type Menu,
  type InsertMenu,
  type Promotion,
  type InsertPromotion,
  type RestaurantOwnerRow,
  type InsertRestaurantOwner,
  type RestaurantClaimRow,
  type InsertRestaurantClaim,
  type PlacesRequestLog,
  type InsertPlacesRequestLog,
  type Campaign,
  type InsertCampaign,
  type AdBanner,
  type InsertAdBanner,
  type AdminConfig,
  type EventLog,
  type InsertEventLog,
  type UserFeatureSnapshot,
  type InsertUserFeatureSnapshot,
  type ItemFeatureSnapshot,
  type InsertItemFeatureSnapshot,
  type ConsentLog,
  type InsertConsentLog,
  type AnalyticsDailyRollup,
  type InsertAdminUser,
  placesTiles,
  type PlacesTile,
  notificationLogs,
  type NotificationLog,
  type InsertNotificationLog,
  partnerInvites,
  type PartnerInvite,
} from "@shared/schema";
import { eq, desc, ilike, or, and, lte, gte, lt, sql, SQL } from "drizzle-orm";
import type { NormalizedPlace } from "./services/places/types";

type GroupSessionSettings = {
  mode?: "restaurant" | "menu";
  locations?: string[];
  budget?: string;
  diet?: string[];
};

export interface IStorage {
  getRestaurants(
    mode?: string,
    lat?: number,
    lng?: number,
    query?: string,
    radius?: number,
    forceRefresh?: boolean,
    sourcePreference?: "osm-first" | "google-first" | "hybrid"
  ): Promise<Restaurant[]>;
  getRestaurantById(id: number): Promise<Restaurant | undefined>;
  createRestaurant(data: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: number, updates: Partial<InsertRestaurant>): Promise<Restaurant | undefined>;
  deleteRestaurant(id: number): Promise<boolean>;
  listMenusByRestaurant(restaurantId: number): Promise<Menu[]>;
  getMenuById(id: number): Promise<Menu | undefined>;
  listMenusByName(name: string): Promise<Menu[]>;
  createMenu(data: InsertMenu): Promise<Menu>;
  updateMenu(id: number, updates: Partial<InsertMenu>): Promise<Menu | undefined>;
  deleteMenu(id: number): Promise<boolean>;
  listPromotionsByRestaurant(restaurantId: number, activeOnly?: boolean): Promise<Promotion[]>;
  createPromotion(data: InsertPromotion): Promise<Promotion>;
  updatePromotion(id: number, updates: Partial<InsertPromotion>): Promise<Promotion | undefined>;
  deletePromotion(id: number): Promise<boolean>;
  listRestaurantOwners(): Promise<RestaurantOwnerRow[]>;
  getRestaurantOwnerById(id: number): Promise<RestaurantOwnerRow | undefined>;
  getRestaurantOwnerByEmail(email: string): Promise<RestaurantOwnerRow | undefined>;
  createRestaurantOwner(data: InsertRestaurantOwner): Promise<RestaurantOwnerRow>;
  updateRestaurantOwner(id: number, updates: Partial<InsertRestaurantOwner>): Promise<RestaurantOwnerRow | undefined>;
  listRestaurantClaims(status?: "pending" | "approved" | "rejected"): Promise<RestaurantClaimRow[]>;
  createRestaurantClaim(data: InsertRestaurantClaim): Promise<RestaurantClaimRow>;
  updateRestaurantClaim(id: number, updates: Partial<InsertRestaurantClaim>): Promise<RestaurantClaimRow | undefined>;
  getSuggestions(): Promise<Restaurant[]>;
  createPreference(pref: InsertUserPreference): Promise<UserPreference>;
  seedRestaurants(data: InsertRestaurant[]): Promise<void>;
  getProfile(lineUserId: string): Promise<UserProfile | undefined>;
  listProfiles(limit?: number): Promise<UserProfile[]>;
  upsertProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateProfile(lineUserId: string, updates: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  createGroupSession(data: InsertGroupSession): Promise<GroupSession>;
  getGroupSessionByCode(code: string): Promise<GroupSession | undefined>;
  createGroupMember(data: InsertGroupMember): Promise<GroupMember>;
  updateGroupMember(id: number, updates: Partial<InsertGroupMember>): Promise<GroupMember | undefined>;
  findGroupMemberByLineUserId(sessionId: number, lineUserId: string): Promise<GroupMember | undefined>;
  findGroupMemberByName(sessionId: number, name: string): Promise<GroupMember | undefined>;
  listGroupMembers(sessionId: number): Promise<GroupMember[]>;
  createPlacesRequestLog(data: InsertPlacesRequestLog): Promise<PlacesRequestLog>;
  listPlacesRequestLogs(limit?: number): Promise<PlacesRequestLog[]>;
  findOrCreateFromPlace(place: NormalizedPlace): Promise<number>;
  getPlacesTile(tileKey: string): Promise<PlacesTile | undefined>;
  upsertPlacesTile(tileKey: string, resultCount: number, source: string): Promise<void>;
  findRestaurantsNear(lat: number, lng: number, radiusMeters: number): Promise<Restaurant[]>;
  listGroupSessions(limit?: number): Promise<GroupSession[]>;
  deleteGroupSession(id: number): Promise<boolean>;
  listCampaigns(): Promise<Campaign[]>;
  createCampaign(data: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, updates: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;
  listBanners(): Promise<AdBanner[]>;
  createBanner(data: InsertAdBanner): Promise<AdBanner>;
  updateBanner(id: number, updates: Partial<InsertAdBanner>): Promise<AdBanner | undefined>;
  deleteBanner(id: number): Promise<boolean>;
  getAdminConfig(configKey: string): Promise<AdminConfig | undefined>;
  upsertAdminConfig(configKey: string, value: Record<string, unknown>): Promise<AdminConfig>;
  createEventLog(data: InsertEventLog): Promise<EventLog | null>;
  listEventLogsByUser(userId: string): Promise<EventLog[]>;
  listEventLogs(limit?: number, since?: Date): Promise<EventLog[]>;
  listEventLogsByType(eventType: string, since?: Date, limit?: number): Promise<EventLog[]>;
  listActiveUsersInRange(start: Date, end: Date): Promise<Set<string>>;
  listUserFeatureSnapshots(limit?: number): Promise<UserFeatureSnapshot[]>;
  listItemFeatureSnapshots(limit?: number): Promise<ItemFeatureSnapshot[]>;
  upsertUserFeatureSnapshot(userId: string, data: Partial<InsertUserFeatureSnapshot>): Promise<UserFeatureSnapshot>;
  getUserFeatureSnapshot(userId: string): Promise<UserFeatureSnapshot | undefined>;
  // Applies additive deltas to item metrics. Fields are incremented, not overwritten.
  upsertItemFeatureSnapshot(itemId: number, delta: Partial<InsertItemFeatureSnapshot>): Promise<ItemFeatureSnapshot>;
  createConsentLog(data: InsertConsentLog): Promise<ConsentLog>;
  getLatestConsent(userId: string, consentType?: string): Promise<ConsentLog | undefined>;
  deletePrivacyData(userId: string): Promise<number>;
  listUserPreferences(userId: string): Promise<UserPreference[]>;
  runDataRetention(rawEventDays?: number, aggregateDays?: number): Promise<{ rawEventsDeleted: number; snapshotsDeleted: number }>;
  upsertDailyRollup(date: string, data: Omit<AnalyticsDailyRollup, "date" | "updatedAt">): Promise<AnalyticsDailyRollup>;
  listDailyRollups(days: number): Promise<AnalyticsDailyRollup[]>;
  listAdminUsers(): Promise<typeof adminUsers.$inferSelect[]>;
  getAdminUserById(id: number): Promise<typeof adminUsers.$inferSelect | undefined>;
  getAdminUserByEmail(email: string): Promise<typeof adminUsers.$inferSelect | undefined>;
  getAdminUserByUsername(username: string): Promise<typeof adminUsers.$inferSelect | undefined>;
  createAdminUser(data: InsertAdminUser): Promise<typeof adminUsers.$inferSelect>;
  updateAdminUser(id: number, updates: Partial<InsertAdminUser & { updatedAt: Date }>): Promise<typeof adminUsers.$inferSelect | undefined>;
  listSponsoredRequests(status?: string): Promise<SponsoredRequest[]>;
  getSponsoredRequestById(id: number): Promise<SponsoredRequest | undefined>;
  createSponsoredRequest(data: InsertSponsoredRequest): Promise<SponsoredRequest>;
  updateSponsoredRequest(id: number, updates: Partial<SponsoredRequest>): Promise<SponsoredRequest | undefined>;
  createPartnerInvite(data: { token: string; initiatorLineUserId: string; expiresAt: Date }): Promise<PartnerInvite>;
  getPartnerInviteByToken(token: string): Promise<PartnerInvite | undefined>;
  getPartnerInviteByTokenAny(token: string): Promise<PartnerInvite | undefined>;
  updatePartnerInvite(token: string, updates: Partial<{ status: string; acceptedAt: Date }>): Promise<PartnerInvite | undefined>;
  unlinkPartner(lineUserId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getRestaurants(
    mode?: string,
    lat?: number,
    lng?: number,
    query?: string,
    radius?: number,
    forceRefresh?: boolean,
    sourcePreference?: "osm-first" | "google-first" | "hybrid"
  ): Promise<Restaurant[]> {
    const conditions: SQL[] = [];

    // Text search across name, category, description
    if (query?.trim()) {
      const q = `%${query.trim()}%`;
      conditions.push(
        or(
          ilike(restaurants.name, q),
          ilike(restaurants.category, q),
          ilike(restaurants.description, q),
        )!,
      );
    }

    // Mode-based filters
    if (mode === "new") {
      conditions.push(eq(restaurants.isNew, true));
    } else if (mode === "budget") {
      conditions.push(lte(restaurants.priceLevel, 2));
    }

    const baseQuery = db.select().from(restaurants);
    const filtered =
      conditions.length > 0
        ? baseQuery.where(and(...conditions))
        : baseQuery;

    // Mode-based sort
    if (mode === "trending" || mode === "hot") {
      return filtered.orderBy(desc(restaurants.trendingScore));
    }

    return filtered.orderBy(desc(restaurants.id));
  }

  async getRestaurantById(id: number): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id)).limit(1);
    return restaurant;
  }

  async createRestaurant(data: InsertRestaurant): Promise<Restaurant> {
    const [created] = await db.insert(restaurants).values(data).returning();
    return created;
  }

  async updateRestaurant(id: number, updates: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    const [updated] = await db.update(restaurants).set(updates).where(eq(restaurants.id, id)).returning();
    return updated;
  }

  async deleteRestaurant(id: number): Promise<boolean> {
    const deleted = await db.delete(restaurants).where(eq(restaurants.id, id)).returning({ id: restaurants.id });
    return deleted.length > 0;
  }

  async listMenusByRestaurant(restaurantId: number): Promise<Menu[]> {
    return db.select().from(menus).where(eq(menus.restaurantId, restaurantId)).orderBy(desc(menus.createdAt));
  }

  async getMenuById(id: number): Promise<Menu | undefined> {
    const [menu] = await db.select().from(menus).where(eq(menus.id, id)).limit(1);
    return menu;
  }

  async listMenusByName(name: string): Promise<Menu[]> {
    const normalized = name.trim();
    if (!normalized) return [];
    return db
      .select()
      .from(menus)
      .where(and(sql`LOWER(${menus.name}) = LOWER(${normalized})`, eq(menus.isActive, true)));
  }

  async createMenu(data: InsertMenu): Promise<Menu> {
    const [created] = await db.insert(menus).values(data).returning();
    return created;
  }

  async updateMenu(id: number, updates: Partial<InsertMenu>): Promise<Menu | undefined> {
    const [updated] = await db.update(menus).set(updates).where(eq(menus.id, id)).returning();
    return updated;
  }

  async deleteMenu(id: number): Promise<boolean> {
    const deleted = await db.delete(menus).where(eq(menus.id, id)).returning({ id: menus.id });
    return deleted.length > 0;
  }

  async listPromotionsByRestaurant(restaurantId: number, activeOnly = false): Promise<Promotion[]> {
    const now = new Date().toISOString().slice(0, 10);
    if (activeOnly) {
      return db
        .select()
        .from(promotions)
        .where(
          and(
            eq(promotions.restaurantId, restaurantId),
            eq(promotions.isActive, true),
            or(sql`${promotions.startDate} is null`, lte(promotions.startDate, now)),
            or(sql`${promotions.endDate} is null`, gte(promotions.endDate, now)),
          ),
        )
        .orderBy(desc(promotions.createdAt));
    }
    return db.select().from(promotions).where(eq(promotions.restaurantId, restaurantId)).orderBy(desc(promotions.createdAt));
  }

  async createPromotion(data: InsertPromotion): Promise<Promotion> {
    const [created] = await db.insert(promotions).values(data).returning();
    return created;
  }

  async updatePromotion(id: number, updates: Partial<InsertPromotion>): Promise<Promotion | undefined> {
    const [updated] = await db.update(promotions).set(updates).where(eq(promotions.id, id)).returning();
    return updated;
  }

  async deletePromotion(id: number): Promise<boolean> {
    const deleted = await db.delete(promotions).where(eq(promotions.id, id)).returning({ id: promotions.id });
    return deleted.length > 0;
  }

  async listRestaurantOwners(): Promise<RestaurantOwnerRow[]> {
    return db.select().from(restaurantOwners).orderBy(desc(restaurantOwners.createdAt));
  }

  async getRestaurantOwnerById(id: number): Promise<RestaurantOwnerRow | undefined> {
    const [owner] = await db.select().from(restaurantOwners).where(eq(restaurantOwners.id, id)).limit(1);
    return owner;
  }

  async getRestaurantOwnerByEmail(email: string): Promise<RestaurantOwnerRow | undefined> {
    const [owner] = await db.select().from(restaurantOwners).where(eq(restaurantOwners.email, email)).limit(1);
    return owner;
  }

  async createRestaurantOwner(data: InsertRestaurantOwner): Promise<RestaurantOwnerRow> {
    const [created] = await db.insert(restaurantOwners).values(data).returning();
    return created;
  }

  async updateRestaurantOwner(id: number, updates: Partial<InsertRestaurantOwner>): Promise<RestaurantOwnerRow | undefined> {
    const [updated] = await db.update(restaurantOwners).set(updates).where(eq(restaurantOwners.id, id)).returning();
    return updated;
  }

  async listRestaurantClaims(status?: "pending" | "approved" | "rejected"): Promise<RestaurantClaimRow[]> {
    if (status) {
      return db.select().from(restaurantClaims).where(eq(restaurantClaims.status, status)).orderBy(desc(restaurantClaims.submittedAt));
    }
    return db.select().from(restaurantClaims).orderBy(desc(restaurantClaims.submittedAt));
  }

  async createRestaurantClaim(data: InsertRestaurantClaim): Promise<RestaurantClaimRow> {
    const [created] = await db.insert(restaurantClaims).values(data).returning();
    return created;
  }

  async updateRestaurantClaim(id: number, updates: Partial<InsertRestaurantClaim>): Promise<RestaurantClaimRow | undefined> {
    const [updated] = await db.update(restaurantClaims).set(updates).where(eq(restaurantClaims.id, id)).returning();
    return updated;
  }

  async getSuggestions(): Promise<Restaurant[]> {
    return await db.select().from(restaurants).limit(5);
  }

  async createPreference(pref: InsertUserPreference): Promise<UserPreference> {
    const [preference] = await db.insert(userPreferences).values(pref).returning();
    return preference;
  }

  async seedRestaurants(data: InsertRestaurant[]): Promise<void> {
    for (const restaurant of data) {
      await db.insert(restaurants).values(restaurant);
    }
  }

  async getProfile(lineUserId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.lineUserId, lineUserId)).limit(1);
    return profile;
  }

  async listProfiles(limit = 50): Promise<UserProfile[]> {
    return db.select().from(userProfiles).limit(limit);
  }

  async upsertProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const existing = await this.getProfile(profile.lineUserId);
    if (existing) {
      const [updated] = await db.update(userProfiles)
        .set(profile)
        .where(eq(userProfiles.lineUserId, profile.lineUserId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }

  async updateProfile(lineUserId: string, updates: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [updated] = await db.update(userProfiles)
      .set(updates)
      .where(eq(userProfiles.lineUserId, lineUserId))
      .returning();
    return updated;
  }

  async createGroupSession(data: InsertGroupSession): Promise<GroupSession> {
    const settingsRaw = data.settings as
      | GroupSessionSettings
      | null
      | undefined
      | Record<string, unknown>;
    const settings: GroupSessionSettings | null | undefined = settingsRaw
        ? {
          mode:
            (settingsRaw as Record<string, unknown>).mode === "menu"
              ? "menu"
              : "restaurant",
          locations: Array.isArray((settingsRaw as Record<string, unknown>).locations)
            ? ((settingsRaw as Record<string, unknown>).locations as string[])
            : undefined,
          budget:
            typeof (settingsRaw as Record<string, unknown>).budget === "string"
              ? ((settingsRaw as Record<string, unknown>).budget as string)
              : undefined,
          diet: Array.isArray((settingsRaw as Record<string, unknown>).diet)
            ? ((settingsRaw as Record<string, unknown>).diet as string[])
            : undefined,
        }
      : settingsRaw;
    const [created] = await db
      .insert(groupSessions)
      .values({
        code: data.code,
        status: data.status ?? "active",
        settings,
      })
      .returning();
    return created;
  }

  async getGroupSessionByCode(code: string): Promise<GroupSession | undefined> {
    const [session] = await db.select().from(groupSessions).where(eq(groupSessions.code, code)).limit(1);
    return session;
  }

  async updateGroupSessionStatus(code: string, status: string): Promise<GroupSession | undefined> {
    const [updated] = await db
      .update(groupSessions)
      .set({ status })
      .where(eq(groupSessions.code, code))
      .returning();
    return updated;
  }

  async createGroupMember(data: InsertGroupMember): Promise<GroupMember> {
    const [created] = await db.insert(groupMembers).values(data).returning();
    return created;
  }

  async updateGroupMember(id: number, updates: Partial<InsertGroupMember>): Promise<GroupMember | undefined> {
    const [updated] = await db.update(groupMembers).set(updates).where(eq(groupMembers.id, id)).returning();
    return updated;
  }

  async findGroupMemberByLineUserId(sessionId: number, lineUserId: string): Promise<GroupMember | undefined> {
    const members = await db.select().from(groupMembers).where(eq(groupMembers.sessionId, sessionId));
    return members.find((m) => (m.lineUserId ?? "").toLowerCase() === lineUserId.toLowerCase());
  }

  async findGroupMemberByName(sessionId: number, name: string): Promise<GroupMember | undefined> {
    const members = await db.select().from(groupMembers).where(eq(groupMembers.sessionId, sessionId));
    return members.find((m) => m.name.toLowerCase() === name.toLowerCase());
  }

  async listGroupMembers(sessionId: number): Promise<GroupMember[]> {
    return db.select().from(groupMembers).where(eq(groupMembers.sessionId, sessionId));
  }

  async createPlacesRequestLog(data: InsertPlacesRequestLog): Promise<PlacesRequestLog> {
    const [created] = await db.insert(placesRequestLogs).values(data).returning();
    return created;
  }

  async listPlacesRequestLogs(limit = 100): Promise<PlacesRequestLog[]> {
    return db.select().from(placesRequestLogs).orderBy(desc(placesRequestLogs.ts)).limit(limit);
  }

  async getPlacesTile(tileKey: string): Promise<PlacesTile | undefined> {
    const [row] = await db.select().from(placesTiles).where(eq(placesTiles.tileKey, tileKey)).limit(1);
    return row;
  }

  async upsertPlacesTile(tileKey: string, resultCount: number, source: string): Promise<void> {
    await db
      .insert(placesTiles)
      .values({ tileKey, resultCount, source, lastFetchedAt: new Date() })
      .onConflictDoUpdate({
        target: placesTiles.tileKey,
        set: { resultCount, source, lastFetchedAt: new Date() },
      });
  }

  /**
   * Bounding-box query on the restaurants table.
   * lat/lng are stored as TEXT so we cast to numeric in SQL.
   * delta = radiusMeters / 111_320 converts meters to degrees (approx, sufficient for Bangkok).
   */
  async findRestaurantsNear(lat: number, lng: number, radiusMeters: number): Promise<Restaurant[]> {
    const delta = radiusMeters / 111_320;
    return db
      .select()
      .from(restaurants)
      .where(
        and(
          sql`CAST(${restaurants.lat} AS numeric) BETWEEN ${lat - delta} AND ${lat + delta}`,
          sql`CAST(${restaurants.lng} AS numeric) BETWEEN ${lng - delta} AND ${lng + delta}`,
        ),
      )
      .limit(200);
  }

  async findOrCreateFromPlace(place: NormalizedPlace): Promise<number> {
    // Try to find by name (case-insensitive) first, then check proximity in JS
    const candidates = await db
      .select({
        id: restaurants.id,
        lat: restaurants.lat,
        lng: restaurants.lng,
        imageUrl: restaurants.imageUrl,
        rating: restaurants.rating,
        address: restaurants.address,
        priceLevel: restaurants.priceLevel,
        phone: restaurants.phone,
        category: restaurants.category,
      })
      .from(restaurants)
      .where(ilike(restaurants.name, place.name))
      .limit(10);

    // Check if any candidate is within ~100m
    for (const c of candidates) {
      const dLat = Number(c.lat) - place.lat;
      const dLng = Number(c.lng) - place.lng;
      if (Math.sqrt(dLat * dLat + dLng * dLng) < 0.001) {
        const updates: Partial<InsertRestaurant> = {};

        if (!c.imageUrl && place.photos?.[0]) updates.imageUrl = place.photos[0];
        if ((!c.rating || c.rating === "N/A") && place.rating) updates.rating = place.rating;
        if ((!c.address || c.address === "N/A") && place.address) updates.address = place.address;
        if (!c.priceLevel && place.priceLevel) updates.priceLevel = place.priceLevel;
        if (!c.phone && place.phone) updates.phone = place.phone;
        if ((!c.category || c.category === "restaurant") && place.category) {
          updates.category = place.category;
          updates.description = place.category;
        }

        if (Object.keys(updates).length > 0) {
          await db.update(restaurants).set(updates).where(eq(restaurants.id, c.id));
        }
        return c.id;
      }
    }

    // Not found — insert it
    const [created] = await db
      .insert(restaurants)
      .values({
        name: place.name,
        description: place.category,
        imageUrl: place.photos?.[0] ?? "",
        lat: String(place.lat),
        lng: String(place.lng),
        category: place.category,
        priceLevel: place.priceLevel ?? 2,
        rating: place.rating ?? "N/A",
        address: place.address || "N/A",
        phone: place.phone ?? null,
        isNew: false,
        trendingScore: 0,
      })
      .returning({ id: restaurants.id });

    return created.id;
  }

  async listGroupSessions(limit = 100): Promise<GroupSession[]> {
    return db.select().from(groupSessions).orderBy(desc(groupSessions.createdAt)).limit(limit);
  }

  async deleteGroupSession(id: number): Promise<boolean> {
    const deleted = await db.delete(groupSessions).where(eq(groupSessions.id, id)).returning({ id: groupSessions.id });
    return deleted.length > 0;
  }

  async listCampaigns(): Promise<Campaign[]> {
    return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async createCampaign(data: InsertCampaign): Promise<Campaign> {
    const [created] = await db.insert(campaigns).values(data).returning();
    return created;
  }

  async updateCampaign(id: number, updates: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [updated] = await db.update(campaigns).set(updates).where(eq(campaigns.id, id)).returning();
    return updated;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    const deleted = await db.delete(campaigns).where(eq(campaigns.id, id)).returning({ id: campaigns.id });
    return deleted.length > 0;
  }

  async listBanners(): Promise<AdBanner[]> {
    return db.select().from(adBanners).orderBy(desc(adBanners.createdAt));
  }

  async createBanner(data: InsertAdBanner): Promise<AdBanner> {
    const [created] = await db.insert(adBanners).values(data).returning();
    return created;
  }

  async updateBanner(id: number, updates: Partial<InsertAdBanner>): Promise<AdBanner | undefined> {
    const [updated] = await db.update(adBanners).set(updates).where(eq(adBanners.id, id)).returning();
    return updated;
  }

  async deleteBanner(id: number): Promise<boolean> {
    const deleted = await db.delete(adBanners).where(eq(adBanners.id, id)).returning({ id: adBanners.id });
    return deleted.length > 0;
  }

  async getAdminConfig(configKey: string): Promise<AdminConfig | undefined> {
    const [config] = await db.select().from(adminConfigs).where(eq(adminConfigs.configKey, configKey)).limit(1);
    return config;
  }

  async upsertAdminConfig(configKey: string, value: Record<string, unknown>): Promise<AdminConfig> {
    const existing = await this.getAdminConfig(configKey);
    if (existing) {
      const [updated] = await db
        .update(adminConfigs)
        .set({ value, updatedAt: new Date() })
        .where(eq(adminConfigs.configKey, configKey))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(adminConfigs)
      .values({ configKey, value })
      .returning();
    return created;
  }

  async createEventLog(data: InsertEventLog): Promise<EventLog | null> {
    const existing = await db
      .select()
      .from(eventLogs)
      .where(eq(eventLogs.idempotencyKey, data.idempotencyKey))
      .limit(1);
    if (existing[0]) return null;
    const [created] = await db.insert(eventLogs).values(data).returning();
    return created;
  }

  async listEventLogsByUser(userId: string, limit = 500): Promise<EventLog[]> {
    return db
      .select()
      .from(eventLogs)
      .where(eq(eventLogs.userId, userId))
      .orderBy(desc(eventLogs.createdAt))
      .limit(limit);
  }

  async listEventLogs(limit = 500, since?: Date): Promise<EventLog[]> {
    if (since) {
      return db
        .select()
        .from(eventLogs)
        .where(gte(eventLogs.createdAt, since))
        .orderBy(desc(eventLogs.createdAt))
        .limit(limit);
    }
    return db
      .select()
      .from(eventLogs)
      .orderBy(desc(eventLogs.createdAt))
      .limit(limit);
  }

  async listEventLogsByType(eventType: string, since?: Date, limit = 5000): Promise<EventLog[]> {
    const condition = since
      ? and(eq(eventLogs.eventType, eventType), gte(eventLogs.createdAt, since))
      : eq(eventLogs.eventType, eventType);
    return db.select().from(eventLogs).where(condition).orderBy(desc(eventLogs.createdAt)).limit(limit);
  }

  async listActiveUsersInRange(start: Date, end: Date): Promise<Set<string>> {
    const rows = await db
      .select({ userId: eventLogs.userId })
      .from(eventLogs)
      .where(and(gte(eventLogs.createdAt, start), lt(eventLogs.createdAt, end)));
    const result = new Set<string>();
    for (const row of rows) {
      if (row.userId) result.add(row.userId);
    }
    return result;
  }

  async listUserFeatureSnapshots(limit = 2000): Promise<UserFeatureSnapshot[]> {
    return db
      .select()
      .from(userFeatureSnapshots)
      .orderBy(desc(userFeatureSnapshots.updatedAt))
      .limit(limit);
  }

  async listItemFeatureSnapshots(limit = 2000): Promise<ItemFeatureSnapshot[]> {
    return db
      .select()
      .from(itemFeatureSnapshots)
      .orderBy(desc(itemFeatureSnapshots.updatedAt))
      .limit(limit);
  }

  async upsertUserFeatureSnapshot(
    userId: string,
    data: Partial<InsertUserFeatureSnapshot>,
  ): Promise<UserFeatureSnapshot> {
    const existing = await this.getUserFeatureSnapshot(userId);
    if (existing) {
      const [updated] = await db
        .update(userFeatureSnapshots)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userFeatureSnapshots.userId, userId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(userFeatureSnapshots)
      .values({
        userId,
        cuisineAffinity: data.cuisineAffinity ?? {},
        preferredPriceLevel: data.preferredPriceLevel ?? 2,
        activeHours: data.activeHours ?? [],
        locationClusters: data.locationClusters ?? [],
        dislikedItemIds: data.dislikedItemIds ?? [],
        menuItemAffinity: data.menuItemAffinity ?? {},
      })
      .returning();
    return created;
  }

  async getUserFeatureSnapshot(userId: string): Promise<UserFeatureSnapshot | undefined> {
    const [snapshot] = await db
      .select()
      .from(userFeatureSnapshots)
      .where(eq(userFeatureSnapshots.userId, userId))
      .limit(1);
    return snapshot;
  }

  async upsertItemFeatureSnapshot(
    itemId: number,
    delta: Partial<InsertItemFeatureSnapshot>,
  ): Promise<ItemFeatureSnapshot> {
    const ctrDelta = delta.ctr ?? 0;
    const likeRateDelta = delta.likeRate ?? 0;
    const superLikeRateDelta = delta.superLikeRate ?? 0;
    const conversionRateDelta = delta.conversionRate ?? 0;

    const [existing] = await db
      .select()
      .from(itemFeatureSnapshots)
      .where(eq(itemFeatureSnapshots.itemId, itemId))
      .limit(1);
    if (existing) {
      const merged = applyItemFeatureDeltas(existing, {
        ctr: ctrDelta,
        likeRate: likeRateDelta,
        superLikeRate: superLikeRateDelta,
        conversionRate: conversionRateDelta,
      });
      const [updated] = await db
        .update(itemFeatureSnapshots)
        .set({
          ctr: merged.ctr,
          likeRate: merged.likeRate,
          superLikeRate: merged.superLikeRate,
          conversionRate: merged.conversionRate,
          updatedAt: new Date(),
        })
        .where(eq(itemFeatureSnapshots.itemId, itemId))
        .returning();
      return updated;
    }
    const initial = applyItemFeatureDeltas(
      { ctr: 0, likeRate: 0, superLikeRate: 0, conversionRate: 0 },
      { ctr: ctrDelta, likeRate: likeRateDelta, superLikeRate: superLikeRateDelta, conversionRate: conversionRateDelta },
    );
    const [created] = await db
      .insert(itemFeatureSnapshots)
      .values({
        itemId,
        itemType: delta.itemType ?? "restaurant",
        ctr: initial.ctr,
        likeRate: initial.likeRate,
        superLikeRate: initial.superLikeRate,
        conversionRate: initial.conversionRate,
      })
      .returning();
    return created;
  }

  async createConsentLog(data: InsertConsentLog): Promise<ConsentLog> {
    const [created] = await db.insert(consentLogs).values(data).returning();
    return created;
  }

  async getLatestConsent(userId: string, consentType = "behavior_tracking"): Promise<ConsentLog | undefined> {
    const [consent] = await db
      .select()
      .from(consentLogs)
      .where(and(eq(consentLogs.userId, userId), eq(consentLogs.consentType, consentType)))
      .orderBy(desc(consentLogs.createdAt))
      .limit(1);
    return consent;
  }

  async deletePrivacyData(userId: string): Promise<number> {
    const events = await db.delete(eventLogs).where(eq(eventLogs.userId, userId)).returning({ id: eventLogs.id });
    await db.delete(userPreferences).where(eq(userPreferences.userId, userId));
    await db.delete(userFeatureSnapshots).where(eq(userFeatureSnapshots.userId, userId));
    await db.delete(consentLogs).where(eq(consentLogs.userId, userId));
    return events.length;
  }

  async listUserPreferences(userId: string): Promise<UserPreference[]> {
    return db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
  }

  async runDataRetention(rawEventDays = 180, aggregateDays = 365): Promise<{ rawEventsDeleted: number; snapshotsDeleted: number }> {
    const now = Date.now();
    const rawCutoff = new Date(now - rawEventDays * 24 * 60 * 60 * 1000);
    const aggregateCutoff = new Date(now - aggregateDays * 24 * 60 * 60 * 1000);

    const rawDeleted = await db
      .delete(eventLogs)
      .where(lte(eventLogs.createdAt, rawCutoff))
      .returning({ id: eventLogs.id });

    const snapshotDeleted = await db
      .delete(userFeatureSnapshots)
      .where(lte(userFeatureSnapshots.updatedAt, aggregateCutoff))
      .returning({ id: userFeatureSnapshots.id });

    return {
      rawEventsDeleted: rawDeleted.length,
      snapshotsDeleted: snapshotDeleted.length,
    };
  }

  async upsertDailyRollup(date: string, data: Omit<AnalyticsDailyRollup, "date" | "updatedAt">): Promise<AnalyticsDailyRollup> {
    const now = new Date();
    const [row] = await db
      .insert(analyticsDailyRollups)
      .values({ date, ...data, updatedAt: now })
      .onConflictDoUpdate({
        target: analyticsDailyRollups.date,
        set: { ...data, updatedAt: now },
      })
      .returning();
    return row;
  }

  async listDailyRollups(days: number): Promise<AnalyticsDailyRollup[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return db
      .select()
      .from(analyticsDailyRollups)
      .where(gte(analyticsDailyRollups.date, since))
      .orderBy(desc(analyticsDailyRollups.date));
  }

  async listAdminUsers(): Promise<typeof adminUsers.$inferSelect[]> {
    return db.select().from(adminUsers).orderBy(adminUsers.createdAt);
  }

  async getAdminUserById(id: number): Promise<typeof adminUsers.$inferSelect | undefined> {
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    return row;
  }

  async getAdminUserByEmail(email: string): Promise<typeof adminUsers.$inferSelect | undefined> {
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    return row;
  }

  async getAdminUserByUsername(username: string): Promise<typeof adminUsers.$inferSelect | undefined> {
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
    return row;
  }

  async createAdminUser(data: InsertAdminUser): Promise<typeof adminUsers.$inferSelect> {
    const [row] = await db.insert(adminUsers).values(data).returning();
    return row;
  }

  async updateAdminUser(id: number, updates: Partial<InsertAdminUser & { updatedAt: Date }>): Promise<typeof adminUsers.$inferSelect | undefined> {
    const [row] = await db
      .update(adminUsers)
      .set({ ...updates, updatedAt: updates.updatedAt ?? new Date() })
      .where(eq(adminUsers.id, id))
      .returning();
    return row;
  }

  async createNotificationLog(data: InsertNotificationLog): Promise<NotificationLog> {
    const [row] = await db.insert(notificationLogs).values(data).returning();
    return row;
  }

  async listNotificationLogs(limit = 100): Promise<NotificationLog[]> {
    return db
      .select()
      .from(notificationLogs)
      .orderBy(desc(notificationLogs.sentAt))
      .limit(limit);
  }

  async listSponsoredRequests(status?: string): Promise<SponsoredRequest[]> {
    const q = db.select().from(sponsoredRequests).orderBy(desc(sponsoredRequests.createdAt));
    if (status) return q.where(eq(sponsoredRequests.status, status));
    return q;
  }

  async getSponsoredRequestById(id: number): Promise<SponsoredRequest | undefined> {
    const [row] = await db.select().from(sponsoredRequests).where(eq(sponsoredRequests.id, id)).limit(1);
    return row;
  }

  async createSponsoredRequest(data: InsertSponsoredRequest): Promise<SponsoredRequest> {
    const [row] = await db.insert(sponsoredRequests).values(data).returning();
    return row;
  }

  async updateSponsoredRequest(id: number, updates: Partial<SponsoredRequest>): Promise<SponsoredRequest | undefined> {
    const [row] = await db
      .update(sponsoredRequests)
      .set(updates)
      .where(eq(sponsoredRequests.id, id))
      .returning();
    return row;
  }

  async createPartnerInvite(data: { token: string; initiatorLineUserId: string; expiresAt: Date }): Promise<PartnerInvite> {
    const [row] = await db.insert(partnerInvites).values(data).returning();
    return row;
  }

  async getPartnerInviteByToken(token: string): Promise<PartnerInvite | undefined> {
    const [row] = await db
      .select()
      .from(partnerInvites)
      .where(and(eq(partnerInvites.token, token), gte(partnerInvites.expiresAt, new Date())))
      .limit(1);
    return row;
  }

  async getPartnerInviteByTokenAny(token: string): Promise<PartnerInvite | undefined> {
    const [row] = await db
      .select()
      .from(partnerInvites)
      .where(eq(partnerInvites.token, token))
      .limit(1);
    return row;
  }

  async updatePartnerInvite(token: string, updates: Partial<{ status: string; acceptedAt: Date }>): Promise<PartnerInvite | undefined> {
    const [row] = await db
      .update(partnerInvites)
      .set(updates)
      .where(eq(partnerInvites.token, token))
      .returning();
    return row;
  }

  async unlinkPartner(lineUserId: string): Promise<void> {
    await db
      .update(userProfiles)
      .set({ partnerLineUserId: null, partnerDisplayName: null, partnerPictureUrl: null })
      .where(eq(userProfiles.lineUserId, lineUserId));
  }
}

export const storage = new DatabaseStorage();
