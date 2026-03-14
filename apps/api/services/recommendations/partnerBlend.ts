import { blendSnapshots, computePerMemberScores, type MemberSnapshotEntry } from "./groupBlend";
import type { UserFeatureSnapshot } from "@shared/schema";
import type { RecommendationContext } from "@algorithms";
import type { Restaurant } from "@shared/schema";

export interface PartnerBlendInput {
  userSnapshot: UserFeatureSnapshot | null;
  partnerSnapshot: UserFeatureSnapshot | null;
  userLineUserId: string;
  partnerLineUserId: string;
  userDisplayName: string;
  partnerDisplayName: string;
  userAvatarUrl?: string | null;
  partnerAvatarUrl?: string | null;
}

export interface CompatibilityScore {
  overall: number;
  cuisineOverlap: number;
  priceAlignment: number;
  explanation: string[];
}

function toAlgSnapshot(s: UserFeatureSnapshot | null): MemberSnapshotEntry["snapshot"] {
  if (!s) return null;
  return {
    cuisineAffinity: s.cuisineAffinity ?? {},
    preferredPriceLevel: s.preferredPriceLevel ?? 2,
    dislikedItemIds: s.dislikedItemIds ?? [],
    activeHours: s.activeHours ?? [],
  };
}

/**
 * Blends two partner snapshots. Delegates to blendSnapshots() which already
 * handles 2-user blending correctly.
 */
export function blendPartnerSnapshots(input: PartnerBlendInput): ReturnType<typeof blendSnapshots> {
  return blendSnapshots([toAlgSnapshot(input.userSnapshot), toAlgSnapshot(input.partnerSnapshot)]);
}

/**
 * Computes a 0–100 compatibility score between two users' taste profiles.
 */
export function computeCompatibilityScore(
  a: UserFeatureSnapshot | null,
  b: UserFeatureSnapshot | null,
): CompatibilityScore {
  if (!a || !b) {
    return { overall: 0, cuisineOverlap: 0, priceAlignment: 0, explanation: ["Not enough data yet"] };
  }

  // Cuisine overlap: Jaccard on cuisines where both have affinity > 0.2
  const aKeys = new Set(
    Object.entries(a.cuisineAffinity ?? {})
      .filter(([, v]) => v > 0.2)
      .map(([k]) => k),
  );
  const bKeys = new Set(
    Object.entries(b.cuisineAffinity ?? {})
      .filter(([, v]) => v > 0.2)
      .map(([k]) => k),
  );
  const intersection = [...aKeys].filter((k) => bKeys.has(k)).length;
  const union = new Set([...aKeys, ...bKeys]).size;
  const cuisineOverlap = union === 0 ? 50 : Math.round((intersection / union) * 100);

  // Price alignment: 100 if identical, decreasing by 25 per level apart
  const priceGap = Math.abs((a.preferredPriceLevel ?? 2) - (b.preferredPriceLevel ?? 2));
  const priceAlignment = Math.max(0, 100 - priceGap * 25);

  const overall = Math.round(cuisineOverlap * 0.6 + priceAlignment * 0.4);

  const explanation: string[] = [];
  if (cuisineOverlap >= 70) explanation.push("You share many cuisine tastes");
  else if (cuisineOverlap >= 40) explanation.push("Some cuisine overlap — good variety");
  else explanation.push("Different cuisine tastes — great for discovery");

  if (priceAlignment >= 75) explanation.push("Aligned on budget");
  else explanation.push("Different budget preferences — a middle ground awaits");

  return { overall, cuisineOverlap, priceAlignment, explanation };
}

/**
 * Builds the two-element MemberSnapshotEntry array needed by computePerMemberScores().
 * memberId 0 = requesting user, memberId 1 = partner.
 */
export function buildPartnerMemberEntries(input: PartnerBlendInput): MemberSnapshotEntry[] {
  return [
    {
      memberId: 0,
      name: input.userDisplayName,
      avatarUrl: input.userAvatarUrl ?? null,
      snapshot: toAlgSnapshot(input.userSnapshot),
    },
    {
      memberId: 1,
      name: input.partnerDisplayName,
      avatarUrl: input.partnerAvatarUrl ?? null,
      snapshot: toAlgSnapshot(input.partnerSnapshot),
    },
  ];
}

export { computePerMemberScores };
export type { RecommendationContext, MemberSnapshotEntry };
export type PartnerScoredRestaurant = Restaurant & { score: number };
