import { Link } from "wouter";
import { Lock, Crown } from "lucide-react";

export type OwnerTier = "free" | "growth" | "pro" | "enterprise";

const TIER_ORDER: OwnerTier[] = ["free", "growth", "pro", "enterprise"];

const TIER_LABELS: Record<OwnerTier, string> = {
  free: "Free",
  growth: "Growth",
  pro: "Pro",
  enterprise: "Enterprise",
};

const TIER_COLORS: Record<OwnerTier, string> = {
  free: "text-gray-500",
  growth: "text-emerald-600",
  pro: "text-[var(--admin-blue)]",
  enterprise: "text-[#FFCC02]",
};

export function tierAtLeast(current: string | undefined, required: OwnerTier): boolean {
  const ci = TIER_ORDER.indexOf((current ?? "free") as OwnerTier);
  const ri = TIER_ORDER.indexOf(required);
  return ci >= ri;
}

interface TierGateProps {
  requiredTier: OwnerTier;
  currentTier?: string;
  featureName: string;
  children: React.ReactNode;
}

export default function TierGate({ requiredTier, currentTier, featureName, children }: TierGateProps) {
  if (tierAtLeast(currentTier, requiredTier)) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6 space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
        <Lock className="w-7 h-7 text-gray-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">{featureName} is locked</h2>
        <p className="text-sm text-gray-400 max-w-sm">
          This feature requires the{" "}
          <span className={`font-semibold ${TIER_COLORS[requiredTier]}`}>
            {TIER_LABELS[requiredTier]}
          </span>{" "}
          plan or higher. You're currently on the{" "}
          <span className="font-medium text-gray-600">
            {TIER_LABELS[(currentTier as OwnerTier) ?? "free"] ?? "Free"}
          </span>{" "}
          plan.
        </p>
      </div>
      <Link href="/admin/owner/billing">
        <button className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity" style={{ backgroundColor: "#00B14F" }}>
          <Crown className="w-4 h-4" />
          Upgrade Plan
        </button>
      </Link>
    </div>
  );
}
