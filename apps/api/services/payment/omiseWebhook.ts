import type { Request, Response } from "express";
import crypto from "crypto";
import { db } from "../../db";
import { paymentTransactions, restaurantOwners } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function omiseWebhookHandler(req: Request, res: Response) {
  // Verify HMAC-SHA256 signature if webhook secret is configured
  const webhookSecret = process.env.OMISE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers["x-omise-signature"] as string | undefined;
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!signature || !rawBody) {
      return res.status(400).json({ message: "Missing signature or body" });
    }
    const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return res.status(401).json({ message: "Invalid signature" });
    }
  }

  try {
    const event = req.body as any;

    if (event.key === "charge.complete") {
      const charge = event.data as any;
      if (charge?.id) {
        const [tx] = await db
          .select()
          .from(paymentTransactions)
          .where(eq(paymentTransactions.providerChargeId, charge.id))
          .limit(1);

        if (tx) {
          const succeeded = charge.status === "successful";
          await db
            .update(paymentTransactions)
            .set({ status: succeeded ? "succeeded" : "failed", updatedAt: new Date() })
            .where(eq(paymentTransactions.id, tx.id));

          // If charge succeeded, activate subscription
          if (succeeded) {
            const expiry = new Date();
            expiry.setMonth(expiry.getMonth() + 1);
            await db
              .update(restaurantOwners)
              .set({
                subscriptionTier: tx.tier,
                subscriptionExpiry: expiry.toISOString().split("T")[0],
                paymentConnected: true,
              })
              .where(eq(restaurantOwners.id, tx.ownerId));
          }
        }
      }
    }
  } catch (err) {
    console.error("[omise-webhook] Handler error:", err);
  }

  return res.json({ received: true });
}
