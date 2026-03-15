import Stripe from "stripe";

// ── Subscription tiers ─────────────────────────────────────────────────────
export const SUBSCRIPTION_TIERS = {
  free: { label: "Free", priceThb: 0, priceSatang: 0 },
  growth: { label: "Growth", priceThb: 990, priceSatang: 99000 },
  pro: { label: "Pro", priceThb: 2490, priceSatang: 249000 },
  enterprise: { label: "Enterprise", priceThb: null as null | number, priceSatang: null as null | number },
} as const;

export type TierKey = keyof typeof SUBSCRIPTION_TIERS;

// ── Stripe ─────────────────────────────────────────────────────────────────
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

export async function createStripeCustomer(email: string, name: string) {
  const stripe = getStripe();
  return stripe.customers.create({ email, name });
}

export async function createStripeSetupIntent(customerId: string) {
  const stripe = getStripe();
  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
  });
}

export async function createStripeSubscription(customerId: string, paymentMethodId: string, tier: TierKey) {
  const stripe = getStripe();
  const tierData = SUBSCRIPTION_TIERS[tier];
  if (!tierData.priceSatang) throw new Error("Invalid tier for subscription");

  // Create or retrieve price — use metadata to find existing price by tier
  const prices = await stripe.prices.list({ active: true, limit: 100 });
  let price = prices.data.find((p) => p.metadata?.tier === tier && p.recurring?.interval === "month");

  if (!price) {
    const product = await stripe.products.create({
      name: `Toast ${tierData.label} Plan`,
      metadata: { tier },
    });
    price = await stripe.prices.create({
      unit_amount: tierData.priceSatang,
      currency: "thb",
      recurring: { interval: "month" },
      product: product.id,
      metadata: { tier },
    });
  }

  // Attach payment method and set as default
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: price.id }],
    expand: ["latest_invoice.payment_intent"],
  });
}

export async function createStripePromptPayIntent(amountSatang: number, metadata: Record<string, string> = {}) {
  const stripe = getStripe();
  return stripe.paymentIntents.create({
    amount: amountSatang,
    currency: "thb",
    payment_method_types: ["promptpay"],
    metadata,
  });
}

export async function cancelStripeSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return stripe.subscriptions.cancel(subscriptionId);
}

export function verifyStripeWebhook(payload: Buffer, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  return getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
}

// ── Omise ──────────────────────────────────────────────────────────────────
function getOmise() {
  const secretKey = process.env.OMISE_SECRET_KEY;
  if (!secretKey) throw new Error("OMISE_SECRET_KEY not configured");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Omise = require("omise");
  return Omise({ secretKey, omiseVersion: "2019-05-29" });
}

export async function createOmiseCustomer(email: string, cardToken: string): Promise<any> {
  const omise = getOmise();
  return new Promise((resolve, reject) => {
    omise.customers.create({ email, card: cardToken }, (err: any, resp: any) => {
      if (err) return reject(new Error(err.message ?? "Omise customer creation failed"));
      resolve(resp);
    });
  });
}

export async function createOmiseCharge(customerId: string, amountSatang: number, description: string): Promise<any> {
  const omise = getOmise();
  return new Promise((resolve, reject) => {
    omise.charges.create({
      amount: amountSatang,
      currency: "thb",
      customer: customerId,
      description,
      capture: true,
    }, (err: any, resp: any) => {
      if (err) return reject(new Error(err.message ?? "Omise charge failed"));
      resolve(resp);
    });
  });
}

export async function createOmiseTokenCharge(token: string, amountSatang: number, description: string): Promise<any> {
  const omise = getOmise();
  return new Promise((resolve, reject) => {
    omise.charges.create({
      amount: amountSatang,
      currency: "thb",
      card: token,
      description,
      capture: true,
    }, (err: any, resp: any) => {
      if (err) return reject(new Error(err.message ?? "Omise token charge failed"));
      resolve(resp);
    });
  });
}

export async function createOmiseSource(
  type: "promptpay" | "mobile_banking_scb" | "mobile_banking_kbank" | "mobile_banking_bay" | "mobile_banking_bbl" | "internet_banking_scb" | "internet_banking_bay",
  amountSatang: number,
): Promise<any> {
  const omise = getOmise();
  return new Promise((resolve, reject) => {
    omise.sources.create({
      type,
      amount: amountSatang,
      currency: "thb",
    }, (err: any, resp: any) => {
      if (err) return reject(new Error(err.message ?? "Omise source creation failed"));
      resolve(resp);
    });
  });
}

export async function createOmiseSourceCharge(sourceId: string, amountSatang: number, returnUri: string, description: string): Promise<any> {
  const omise = getOmise();
  return new Promise((resolve, reject) => {
    omise.charges.create({
      amount: amountSatang,
      currency: "thb",
      source: sourceId,
      return_uri: returnUri,
      description,
    }, (err: any, resp: any) => {
      if (err) return reject(new Error(err.message ?? "Omise source charge failed"));
      resolve(resp);
    });
  });
}
