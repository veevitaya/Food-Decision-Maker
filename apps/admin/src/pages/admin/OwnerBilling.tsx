import { useState } from "react";
import { getAdminSession } from "./AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  Crown,
  ShieldCheck,
  CheckCircle2,
  ArrowUp,
  Receipt,
  Download,
  Calendar,
  Zap,
  Lock,
  TrendingUp,
  BarChart3,
  Users,
  Brain,
  Target,
  Star,
  ChevronRight,
} from "lucide-react";

function getOwnerHeaders() {
  const session = getAdminSession();
  if (!session || session.sessionType !== "owner") return {};
  return { "x-owner-token": btoa(`${session.email}:`) };
}

const PLANS = [
  {
    tier: "free",
    name: "Free",
    price: "฿0",
    period: "forever",
    features: ["Basic listing on Toast", "View analytics summary", "Reply to reviews", "1 restaurant"],
    highlighted: false,
  },
  {
    tier: "growth",
    name: "Growth",
    price: "฿990",
    period: "/month",
    features: ["Everything in Free", "Run promotions & campaigns", "Verified owner badge", "Priority listing placement", "Email support"],
    highlighted: false,
  },
  {
    tier: "premium",
    name: "Pro",
    price: "฿2,490",
    period: "/month",
    features: ["Everything in Growth", "Decision Intelligence analytics", "Competitor comparison matrix", "Advanced recommendations", "Dish-level analytics", "Priority support"],
    highlighted: true,
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["Everything in Pro", "Multi-branch analytics", "Dedicated success manager", "API access", "Custom reporting", "White-label options"],
    highlighted: false,
  },
];

const INVOICES = [
  { id: "INV-2026-006", date: "Mar 1, 2026", amount: "฿2,490", plan: "Pro", status: "paid" as const },
  { id: "INV-2026-005", date: "Feb 1, 2026", amount: "฿2,490", plan: "Pro", status: "paid" as const },
  { id: "INV-2026-004", date: "Jan 1, 2026", amount: "฿2,490", plan: "Pro", status: "paid" as const },
  { id: "INV-2025-003", date: "Dec 1, 2025", amount: "฿990", plan: "Growth", status: "paid" as const },
  { id: "INV-2025-002", date: "Nov 1, 2025", amount: "฿990", plan: "Growth", status: "paid" as const },
  { id: "INV-2025-001", date: "Oct 1, 2025", amount: "฿990", plan: "Growth", status: "failed" as const },
];

const USAGE_STATS = [
  { label: "Active Campaigns", value: "2 / 5", pct: 40 },
  { label: "Menu Items Listed", value: "12 / 50", pct: 24 },
  { label: "Photos Uploaded", value: "8 / 20", pct: 40 },
  { label: "Team Members", value: "1 / 3", pct: 33 },
];

const UPSELL_CARDS = [
  {
    title: "Unlock Competitor Analytics",
    desc: "See exactly which restaurants you lose to and why. Know your competitive position in real-time.",
    metric: "Decision Intelligence",
    icon: Brain,
    requiredPlan: "Pro",
  },
  {
    title: "Advanced AI Recommendations",
    desc: "Get personalized, data-driven recommendations with confidence scores and expected impact.",
    metric: "AI Insights",
    icon: Target,
    requiredPlan: "Pro",
  },
  {
    title: "Multi-Branch Analytics",
    desc: "Compare performance across all your locations with unified reporting and branch benchmarks.",
    metric: "Branch Compare",
    icon: BarChart3,
    requiredPlan: "Enterprise",
  },
];

export default function OwnerBilling() {
  const session = getAdminSession();
  const { toast } = useToast();

  const { data: dashData, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/owner/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/owner/dashboard", {
        headers: getOwnerHeaders() as Record<string, string>,
      });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: session?.sessionType === "owner",
  });

  const owner = dashData?.owner;

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400" data-testid="text-access-denied">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  const currentTier = owner?.subscriptionTier || "free";
  const currentPlan = PLANS.find(p => p.tier === currentTier) || PLANS[0];
  const renewalDate = owner?.subscriptionExpiry ? new Date(owner.subscriptionExpiry).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "N/A";
  const campaignSpend = 4020;

  return (
    <div className="space-y-6" data-testid="owner-billing-page">
      <div className="flex items-center gap-3">
        <CreditCard className="w-5 h-5 text-[#FFCC02]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800" data-testid="text-page-title">Billing & Subscription</h2>
          <p className="text-xs text-gray-400">Manage your plan, payments, and invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-current-plan">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Current Plan</h3>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FFCC02]/[0.06] border border-[#FFCC02]/20 mb-4">
            <Crown className="w-6 h-6 text-[#FFCC02]" />
            <div className="flex-1">
              <p className="text-lg font-bold text-gray-800">{currentPlan.name}</p>
              <p className="text-xs text-gray-500">{currentPlan.price}{currentPlan.period}</p>
            </div>
            {owner?.isVerified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 bg-[#00B14F]/10 text-[#00B14F]">
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
          <div className="space-y-2 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-gray-400" /> Renewal</span>
              <span className="font-medium text-gray-700">{renewalDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Receipt className="w-3 h-3 text-gray-400" /> Campaign Spend</span>
              <span className="font-medium text-gray-700">฿{campaignSpend.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-usage">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Usage Summary</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {USAGE_STATS.map(u => (
              <div key={u.label} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">{u.label}</span>
                  <span className="text-xs font-semibold text-gray-800">{u.value}</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#00B14F] transition-all" style={{ width: `${u.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-plans">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-[3px] h-4 bg-[var(--admin-blue)] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">Available Plans</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PLANS.map(plan => {
            const isCurrent = plan.tier === currentTier;
            return (
              <div
                key={plan.tier}
                className={`rounded-2xl border p-5 transition-all ${
                  isCurrent ? "border-[#FFCC02] bg-[#FFCC02]/[0.04] shadow-sm" :
                  plan.highlighted ? "border-[#00B14F] bg-[#00B14F]/[0.02]" :
                  "border-gray-100 bg-white hover:border-gray-200"
                }`}
                data-testid={`plan-${plan.tier}`}
              >
                {plan.highlighted && !isCurrent && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#00B14F] bg-[#00B14F]/10 rounded-full px-2 py-0.5 inline-block mb-2">Most Popular</span>
                )}
                <p className="text-sm font-semibold text-gray-800">{plan.name}</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{plan.price}<span className="text-xs font-normal text-gray-400">{plan.period}</span></p>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map(f => (
                    <li key={f} className="text-[11px] text-gray-500 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-[#00B14F] mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full mt-4 text-xs font-medium rounded-lg py-2.5 transition-colors ${
                    isCurrent ? "bg-gray-100 text-gray-400 cursor-default" :
                    plan.highlighted ? "bg-[#00B14F] text-white hover:bg-[#00B14F]/90" :
                    "bg-[#FFCC02] text-gray-900 hover:bg-[#FFCC02]/90"
                  }`}
                  disabled={isCurrent}
                  onClick={() => !isCurrent && toast({ title: "Upgrade requested", description: `We'll contact you about the ${plan.name} plan.` })}
                  data-testid={`btn-select-${plan.tier}`}
                >
                  {isCurrent ? "Current Plan" : plan.tier === "enterprise" ? "Contact Sales" : "Upgrade"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-upsell">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">Unlock More with an Upgrade</h3>
          <span className="text-[10px] text-gray-400 ml-1">Features tied to your performance</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {UPSELL_CARDS.map((card, i) => (
            <div key={i} className="p-4 rounded-xl border border-gray-100 hover:border-[#FFCC02]/30 transition-colors" data-testid={`upsell-card-${i}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFCC02]/15 flex items-center justify-center">
                  <card.icon className="w-4 h-4 text-[#FFCC02]" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{card.metric}</span>
              </div>
              <h4 className="text-sm font-semibold text-gray-800 mb-1">{card.title}</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed mb-3">{card.desc}</p>
              <div className="flex items-center gap-2">
                <Lock className="w-3 h-3 text-gray-300" />
                <span className="text-[10px] text-gray-400">Requires {card.requiredPlan} plan</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-invoices">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">Payment History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3">Invoice</th>
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3">Date</th>
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3">Plan</th>
                <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3">Amount</th>
                <th className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3">Status</th>
                <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {INVOICES.map(inv => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors" data-testid={`invoice-${inv.id}`}>
                  <td className="py-3 font-mono text-xs text-gray-600">{inv.id}</td>
                  <td className="py-3 text-gray-600">{inv.date}</td>
                  <td className="py-3 text-gray-600">{inv.plan}</td>
                  <td className="py-3 text-right font-semibold text-gray-800">{inv.amount}</td>
                  <td className="py-3 text-center">
                    <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                      inv.status === "paid" ? "bg-[#00B14F]/10 text-[#00B14F]" : "bg-red-50 text-red-500"
                    }`}>{inv.status}</span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => toast({ title: "Downloading invoice", description: `${inv.id}.pdf` })}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      data-testid={`btn-download-${inv.id}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
