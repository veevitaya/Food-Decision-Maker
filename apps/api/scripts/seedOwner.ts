import { db } from "../db";
import { restaurants, restaurantOwners } from "@shared/schema";
import bcrypt from "bcryptjs";

async function seedOwner() {
  const email = process.env.OWNER_EMAIL || "owner@gmail.com";
  const password = process.env.OWNER_PASSWORD || "owner123";
  const displayName = process.env.OWNER_DISPLAY_NAME || "Restaurant Owner";
  const subscriptionTier = process.env.OWNER_SUBSCRIPTION_TIER || "pro";

  // Check if owner already exists
  const existing = await db.query.restaurantOwners.findFirst({
    where: (owners, { eq }) => eq(owners.email, email),
  });

  if (existing) {
    console.log(`[seed] Owner ${email} already exists (id=${existing.id})`);
    return;
  }

  // Pick the first available restaurant
  const [restaurant] = await db.select({ id: restaurants.id }).from(restaurants).limit(1);
  if (!restaurant) {
    console.error("[seed] ❌ No restaurants found — run db:seed first");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [created] = await db
    .insert(restaurantOwners)
    .values({
      restaurantId: restaurant.id,
      displayName,
      email,
      passwordHash,
      isVerified: true,
      verificationStatus: "approved",
      subscriptionTier,
      paymentConnected: false,
    })
    .returning();

  console.log(`[seed] ✅ Owner created: ${email} / ${password} (id=${created.id}, restaurantId=${created.restaurantId})`);
}

seedOwner()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] ❌ Failed:", err);
    process.exit(1);
  });
