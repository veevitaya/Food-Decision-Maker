import type { Request, Response } from "express";
import { verifyStripeWebhook } from "./paymentService";
import { db } from "../../db";
import { paymentTransactions, restaurantOwners } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    return res.status(400).json({ message: "Missing stripe-signature header" });
  }

  const rawBody = req.rawBody as Buffer | undefined;
  if (!rawBody) {
    return res.status(400).json({ message: "Missing raw body for webhook verification" });
  }

  let event;
  try {
    event = verifyStripeWebhook(rawBody, sig);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return res.status(400).json({ message: "Webhook signature invalid" });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as any;
      const txId = pi.metadata?.transactionId;
      if (txId) {
        await db
          .update(paymentTransactions)
          .set({ status: "succeeded", providerChargeId: pi.id, updatedAt: new Date() })
          .where(eq(paymentTransactions.id, parseInt(txId, 10)));
      }
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as any;
      const customerId = sub.customer as string;
      const isActive = sub.status === "active";
      const expiryDate = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString().split("T")[0]
        : null;
      if (customerId && isActive && expiryDate) {
        const tierMeta = sub.items?.data?.[0]?.price?.metadata?.tier ?? "growth";
        await db
          .update(restaurantOwners)
          .set({
            subscriptionTier: tierMeta,
            subscriptionExpiry: expiryDate,
            paymentConnected: true,
          })
          .where(eq(restaurantOwners.stripeCustomerId, customerId));
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as any;
      const customerId = sub.customer as string;
      if (customerId) {
        await db
          .update(restaurantOwners)
          .set({ subscriptionTier: "free", subscriptionExpiry: null, paymentConnected: false })
          .where(eq(restaurantOwners.stripeCustomerId, customerId));
      }
    }
  } catch (err) {
    console.error("[stripe-webhook] Handler error:", err);
    // Still return 200 so Stripe doesn't retry endlessly for non-recoverable errors
  }

  return res.json({ received: true });
}
