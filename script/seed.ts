import { db } from "../server/db";
import { restaurants, type InsertRestaurant } from "../shared/schema";
import { sql } from "drizzle-orm";

const SEED_RESTAURANTS: InsertRestaurant[] = [
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
];

async function main() {
  const replace = process.argv.includes("--replace");

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(restaurants);

  const existingCount = Number(count || 0);
  if (existingCount > 0 && !replace) {
    console.log(`Seed skipped: restaurants table already has ${existingCount} rows. Use --replace to overwrite.`);
    return;
  }

  if (replace) {
    await db.delete(restaurants);
    console.log("Existing restaurants deleted.");
  }

  await db.insert(restaurants).values(SEED_RESTAURANTS);
  console.log(`Seed complete: inserted ${SEED_RESTAURANTS.length} restaurants.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
