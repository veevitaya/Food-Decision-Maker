import { db } from "./db";
import {
  restaurants,
  userPreferences,
  userProfiles,
  groupSessions,
  groupMembers,
  placesRequestLogs,
  campaigns,
  adBanners,
  adminConfigs,
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
  type PlacesRequestLog,
  type InsertPlacesRequestLog,
  type Campaign,
  type InsertCampaign,
  type AdBanner,
  type InsertAdBanner,
  type AdminConfig,
} from "@shared/schema";
import { eq, desc, ilike, or, and, lte, SQL } from "drizzle-orm";
import type { NormalizedPlace } from "./services/places/types";

type GroupSessionSettings = {
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
  findGroupMemberByName(sessionId: number, name: string): Promise<GroupMember | undefined>;
  listGroupMembers(sessionId: number): Promise<GroupMember[]>;
  createPlacesRequestLog(data: InsertPlacesRequestLog): Promise<PlacesRequestLog>;
  listPlacesRequestLogs(limit?: number): Promise<PlacesRequestLog[]>;
  findOrCreateFromPlace(place: NormalizedPlace): Promise<number>;
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

  async createGroupMember(data: InsertGroupMember): Promise<GroupMember> {
    const [created] = await db.insert(groupMembers).values(data).returning();
    return created;
  }

  async updateGroupMember(id: number, updates: Partial<InsertGroupMember>): Promise<GroupMember | undefined> {
    const [updated] = await db.update(groupMembers).set(updates).where(eq(groupMembers.id, id)).returning();
    return updated;
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

  async findOrCreateFromPlace(place: NormalizedPlace): Promise<number> {
    // Try to find by name (case-insensitive) first, then check proximity in JS
    const candidates = await db
      .select({ id: restaurants.id, lat: restaurants.lat, lng: restaurants.lng })
      .from(restaurants)
      .where(ilike(restaurants.name, place.name))
      .limit(10);

    // Check if any candidate is within ~100m
    for (const c of candidates) {
      const dLat = Number(c.lat) - place.lat;
      const dLng = Number(c.lng) - place.lng;
      if (Math.sqrt(dLat * dLat + dLng * dLng) < 0.001) {
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
}

export const storage = new DatabaseStorage();
