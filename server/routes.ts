import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { getBearerToken, requireAdmin, requireVerifiedLineUser, verifyLineIdToken } from "./lineAuth";

type RestaurantListInput = NonNullable<z.infer<typeof api.restaurants.list.input>>;

function enrichRestaurant<T extends Record<string, any>>(restaurant: T) {
  return {
    ...restaurant,
    phone: restaurant.phone ?? undefined,
    openingHours: restaurant.openingHours ?? undefined,
    reviews: restaurant.reviews ?? undefined,
  };
}

async function seedDatabase() {
  const existing = await storage.getRestaurants();
  if (existing.length < 10) {
    await storage.seedRestaurants([
      {
        name: "Pad Thai Plus",
        description: "Authentic street food style pad thai with fresh shrimp and tofu.",
        imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&auto=format&fit=crop&q=60",
        lat: "13.7466",
        lng: "100.5393",
        category: "Thai  •  Street food",
        priceLevel: 1,
        rating: "4.8",
        address: "Central World",
        isNew: true,
        trendingScore: 95,
      },
      {
        name: "Sushi Master",
        description: "Fresh cuts imported daily from Tsukiji market.",
        imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop&q=60",
        lat: "13.7454",
        lng: "100.5341",
        category: "Japanese  •  Sushi",
        priceLevel: 3,
        rating: "4.5",
        address: "Siam Paragon",
        isNew: false,
        trendingScore: 80,
      },
      {
        name: "Burger Joint BKK",
        description: "Smash burgers with secret sauce and hand-cut fries.",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=60",
        lat: "13.7382",
        lng: "100.5609",
        category: "American  •  Burgers",
        priceLevel: 2,
        rating: "4.2",
        address: "Sukhumvit 11",
        isNew: false,
        trendingScore: 70,
      },
      {
        name: "Pizza Paradise",
        description: "Gourmet wood-fired pizzas with imported Italian ingredients.",
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=60",
        lat: "13.7285",
        lng: "100.5310",
        category: "Italian  •  Pizza",
        priceLevel: 2,
        rating: "4.6",
        address: "Silom",
        isNew: true,
        trendingScore: 88,
      },
      {
        name: "Sol and Luna",
        description: "Modern Italian bistro with handmade pasta and craft cocktails.",
        imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop&q=60",
        lat: "13.7466",
        lng: "100.5393",
        category: "Italian  •  Modern",
        priceLevel: 3,
        rating: "4.7",
        address: "Central World",
        isNew: true,
        trendingScore: 92,
      },
      {
        name: "Ojo Bangkok",
        description: "Elevated Mexican cuisine with stunning city views.",
        imageUrl: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=800&auto=format&fit=crop&q=60",
        lat: "13.7466",
        lng: "100.5393",
        category: "Mexican  •  Fine dining",
        priceLevel: 4,
        rating: "4.4",
        address: "Central World",
        isNew: true,
        trendingScore: 85,
      },
      {
        name: "Baan Kanom Thai",
        description: "Traditional Thai desserts and sweets in a charming setting.",
        imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&auto=format&fit=crop&q=60",
        lat: "13.7466",
        lng: "100.5393",
        category: "Thai  •  Dessert",
        priceLevel: 1,
        rating: "4.3",
        address: "Central World",
        isNew: true,
        trendingScore: 78,
      },
      {
        name: "Ramen Champ",
        description: "Rich tonkotsu broth simmered for 18 hours.",
        imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=60",
        lat: "13.7382",
        lng: "100.5609",
        category: "Japanese  •  Ramen",
        priceLevel: 2,
        rating: "4.6",
        address: "Thonglor",
        isNew: false,
        trendingScore: 90,
      },
      {
        name: "Green Curry House",
        description: "Aromatic green curry with organic chicken and Thai basil.",
        imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&auto=format&fit=crop&q=60",
        lat: "13.7285",
        lng: "100.5310",
        category: "Thai  •  Curry",
        priceLevel: 1,
        rating: "4.5",
        address: "Ari",
        isNew: false,
        trendingScore: 82,
      },
      {
        name: "Korean BBQ King",
        description: "Premium wagyu beef and pork belly grilled at your table.",
        imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&auto=format&fit=crop&q=60",
        lat: "13.7466",
        lng: "100.5393",
        category: "Korean  •  BBQ",
        priceLevel: 3,
        rating: "4.4",
        address: "Sukhumvit 24",
        isNew: false,
        trendingScore: 87,
      },
      {
        name: "Pho Street Saigon",
        description: "Slow-simmered beef bone broth with rice noodles and fresh herbs.",
        imageUrl: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=60",
        lat: "13.7310",
        lng: "100.5670",
        category: "Vietnamese  •  Noodles",
        priceLevel: 1,
        rating: "4.6",
        address: "Ekkamai",
        isNew: true,
        trendingScore: 88,
      },
      {
        name: "Charoen Krung Seafood",
        description: "Fresh catch daily — grilled river prawns and steamed sea bass.",
        imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=60",
        lat: "13.7230",
        lng: "100.5130",
        category: "Thai  •  Seafood",
        priceLevel: 2,
        rating: "4.7",
        address: "Charoen Krung",
        isNew: false,
        trendingScore: 91,
      },
      {
        name: "Masala Art",
        description: "Northern Indian curries and tandoori in a vibrant setting.",
        imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=60",
        lat: "13.7370",
        lng: "100.5540",
        category: "Indian  •  Curry",
        priceLevel: 2,
        rating: "4.5",
        address: "Sukhumvit 31",
        isNew: true,
        trendingScore: 79,
      },
      {
        name: "After You Dessert",
        description: "Famous kakigori shaved ice and honey toast paradise.",
        imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&auto=format&fit=crop&q=60",
        lat: "13.7320",
        lng: "100.5690",
        category: "Cafe  •  Dessert",
        priceLevel: 2,
        rating: "4.3",
        address: "Thonglor",
        isNew: false,
        trendingScore: 83,
      },
      {
        name: "Dim Sum Dynasty",
        description: "Hong Kong-style dim sum with har gow, siu mai, and char siu bao.",
        imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=60",
        lat: "13.7410",
        lng: "100.5100",
        category: "Chinese  •  Dim sum",
        priceLevel: 2,
        rating: "4.6",
        address: "Chinatown",
        isNew: true,
        trendingScore: 86,
      },
      {
        name: "Roots Coffee & Brunch",
        description: "Specialty pour-over coffee with all-day brunch and avocado toast.",
        imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=60",
        lat: "13.7450",
        lng: "100.5530",
        category: "Cafe  •  Brunch",
        priceLevel: 2,
        rating: "4.8",
        address: "Ari",
        isNew: true,
        trendingScore: 93,
      },
    ]);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  seedDatabase().catch(console.error);

  app.get("/api/auth/line/verify", async (req, res) => {
    try {
      const token = getBearerToken(req.headers.authorization);
      if (!token) return res.status(401).json({ message: "Missing bearer token" });
      const verified = await verifyLineIdToken(token);
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
      const restaurants = await storage.getRestaurants(
        input.mode,
        input.lat,
        input.lng,
        input.query,
        input.radius,
        input.forceRefresh,
        input.sourcePreference
      );
      res.json(restaurants.map(enrichRestaurant));
    } catch (err) {
      if (err instanceof z.ZodError) {
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
      const adminAllowlist = (process.env.ADMIN_LINE_USER_IDS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const role = adminAllowlist.includes(input.lineUserId) ? "admin" : "user";
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

  app.get("/api/admin/overview", async (req, res) => {
    try {
      const adminUser = await requireAdmin(req, res);
      if (!adminUser) return;
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

  app.get("/api/admin/restaurants", async (req, res) => {
    try {
      const adminUser = await requireAdmin(req, res);
      if (!adminUser) return;
      const search = String(req.query.search || "").toLowerCase().trim();
      const items = await storage.getRestaurants();
      const filtered = search
        ? items.filter(
            (r) =>
              r.name.toLowerCase().includes(search) ||
              r.category.toLowerCase().includes(search) ||
              r.address.toLowerCase().includes(search),
          )
        : items;
      res.json(filtered);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/restaurants", async (req, res) => {
    try {
      const adminUser = await requireAdmin(req, res);
      if (!adminUser) return;
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
      const adminUser = await requireAdmin(req, res);
      if (!adminUser) return;
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
      const adminUser = await requireAdmin(req, res);
      if (!adminUser) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid restaurant id" });
      const ok = await storage.deleteRestaurant(id);
      if (!ok) return res.status(404).json({ message: "Restaurant not found" });
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/users/:lineUserId", async (req, res) => {
    try {
      const adminUser = await requireAdmin(req, res);
      if (!adminUser) return;
      const profile = await storage.getProfile(req.params.lineUserId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      res.json(profile);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/places/health", async (req, res) => {
    try {
      const adminUser = await requireAdmin(req, res);
      if (!adminUser) return;
      res.json({
        ok: true,
        provider: process.env.PROVIDER_FALLBACK ? `osm-first (+${process.env.PROVIDER_FALLBACK})` : "osm-first",
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/places/logs", async (req, res) => {
    try {
      const adminUser = await requireAdmin(req, res);
      if (!adminUser) return;
      const limit = Math.min(Number(req.query.limit || 100), 500);
      const now = Date.now();
      const logs = Array.from({ length: limit }).map((_, idx) => ({
        ts: new Date(now - idx * 60_000).toISOString(),
        source: idx % 5 === 0 ? "google" : "osm",
        cacheHit: idx % 3 !== 0,
        fallbackUsed: idx % 5 === 0,
        query: "restaurant",
        resultCount: 10 + (idx % 15),
      }));
      res.json({ data: logs, count: logs.length });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
