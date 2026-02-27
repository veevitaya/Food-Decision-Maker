import { db } from "./db";
import {
  restaurants,
  userPreferences,
  userProfiles,
  type Restaurant,
  type InsertRestaurant,
  type UserPreference,
  type InsertUserPreference,
  type UserProfile,
  type InsertUserProfile
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getRestaurants(mode?: string, lat?: number, lng?: number, query?: string): Promise<Restaurant[]>;
  getRestaurantById(id: number): Promise<Restaurant | undefined>;
  getSuggestions(): Promise<Restaurant[]>;
  createPreference(pref: InsertUserPreference): Promise<UserPreference>;
  seedRestaurants(data: InsertRestaurant[]): Promise<void>;
  getProfile(lineUserId: string): Promise<UserProfile | undefined>;
  upsertProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateProfile(lineUserId: string, updates: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getRestaurants(mode?: string, lat?: number, lng?: number, query?: string): Promise<Restaurant[]> {
    let queryBuilder = db.select().from(restaurants);
    return await queryBuilder.orderBy(desc(restaurants.id));
  }

  async getRestaurantById(id: number): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id)).limit(1);
    return restaurant;
  }

  async getSuggestions(): Promise<Restaurant[]> {
    return await db.select().from(restaurants).limit(5);
  }

  async createPreference(pref: InsertUserPreference): Promise<UserPreference> {
    const [preference] = await db.insert(userPreferences).values(pref).returning();
    return preference;
  }

  async seedRestaurants(data: InsertRestaurant[]): Promise<void> {
    await db.delete(restaurants);
    for (const restaurant of data) {
      await db.insert(restaurants).values(restaurant);
    }
  }

  async getProfile(lineUserId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.lineUserId, lineUserId)).limit(1);
    return profile;
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
}

export const storage = new DatabaseStorage();
