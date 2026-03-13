import { db } from "../db";
import { adminUsers } from "@shared/schema";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || "admin@gmail.com";
  const password = process.env.ADMIN_PASSWORD || "adminpassword";
  const username = process.env.ADMIN_USERNAME || "admin";

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 10);

  // Check if admin already exists
  const existing = await db.query.adminUsers.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });

  if (existing) {
    console.log(`[seed] Admin user ${email} already exists`);
    return;
  }

  // Insert admin user
  await db.insert(adminUsers).values({
    username,
    email,
    passwordHash,
    role: "superadmin",
    permissions: [
      "manage_restaurants",
      "manage_users",
      "manage_campaigns",
      "manage_banners",
      "view_analytics",
      "manage_claims",
      "manage_config",
    ],
    isActive: true,
  });

  console.log(`[seed] ✅ Admin user created: ${email} / ${password}`);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] ❌ Failed:", err);
    process.exit(1);
  });
