import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSession } from "../admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  Crown,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "wouter";

interface BillingPlan {
  tier: string;
  label: string;
  priceThb: number | null;
  expiry: string | null;
  features: string[];
  isVerified: boolean;
  paymentConnected: boolean;
}

interface Invoice {
  id: string;
  date: string;
  tier: string;
  amountThb: number;
  method: string;
  provider: string;
  status: string;
  slipUrl: string | null;
}

const TIER_COLORS: Record<string, string> = {
  free: "#9CA3AF",
  growth: "#FFCC02",
  pro: "#7C3AED",
  enterprise: "#0EA5E9",
};

const STATUS_STYLES: Record<string, string> = {
  succeeded: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-600",
};

const METHOD_LABEL: Record<string, string> = {
  card: "Card",
  promptpay: "PromptPay",
  mobile_banking: "Mobile Banking",
  bank_transfer: "Bank Transfer",
};

function getOwnerFetchHeaders() {
  const session = getAdminSession();
  if (!session || session.sessionType !== "owner") return {};
  return { credentials: "include" as const };
}

export default function OwnerBilling() {
  const session = getAdminSession();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: plan, isLoading: planLoading } = useQuery<BillingPlan>({
    queryKey: ["/api/owner/billing/plan"],
    queryFn: async () => {
      const res = await fetch("/api/owner/billing/plan", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load plan");
      return res.json();
    },
    enabled: session?.sessionType === "owner",
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ["/api/owner/billing/invoices"],
    queryFn: async () => {
      const res = await fetch("/api/owner/billing/invoices", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load invoices");
      return res.json();
    },
    enabled: session?.sessionType === "owner",
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/owner/billing/cancel", { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to cancel");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/owner/billing/plan"] });
      toast({ title: "Subscription cancelled", description: "Your plan has been downgraded to Free." });
    },
    onError: () => toast({ title: "Error", description: "Failed to cancel subscription.", variant: "destructive" }),
  });

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  const invoices = invoicesData?.invoices ?? [];
  const tierColor = TIER_COLORS[plan?.tier ?? "free"] ?? "#9CA3AF";

  const allTiers = [
    { key: "free", label: "Free", priceThb: 0, features: ["Basic listing", "View analytics", "Reply to reviews"] },
    { key: "growth", label: "Growth", priceThb: 990, features: ["Everything in Free", "Run promotions", "Priority support", "Verified badge"] },
    { key: "pro", label: "Pro", priceThb: 2490, features: ["Everything in Growth", "Featured placement", "Advanced analytics", "Custom branding"] },
    { key: "enterprise", label: "Enterprise", priceThb: null, features: ["Everything in Pro", "Multi-location", "Dedicated manager", "API access"] },
  ];

  return (
    <div className="space-y-6" data-testid="owner-billing-page">
      <div className="flex items-center gap-3">
        <CreditCard className="w-5 h-5 text-[#FFCC02]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Billing</h2>
          <p className="text-xs text-gray-400">Manage your subscription and payment history</p>
        </div>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-current-plan">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-[3px] h-4 rounded-full" style={{ backgroundColor: tierColor }} />
          <h3 className="text-[15px] font-semibold text-gray-800">Current Plan</h3>
        </div>

        {planLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-8 rounded bg-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 p-4 rounded-xl border mb-4" style={{ borderColor: `${tierColor}30`, backgroundColor: `${tierColor}08` }}>
                <Crown className="w-5 h-5 flex-shrink-0" style={{ color: tierColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{plan?.label ?? "Free"}</p>
                  <p className="text-xs text-gray-500">
                    {plan?.priceThb != null ? `฿${plan.priceThb.toLocaleString()}/mo` : "Custom pricing"}
                    {plan?.expiry && <span className="ml-2 text-gray-400">· Expires {plan.expiry}</span>}
                  </p>
                </div>
                {plan?.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 bg-[#00B14F]/10 text-[#00B14F]">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>

              {plan?.features && (
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00B14F] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => setLocation("/admin/owner/settings")}
                className="px-4 py-2 text-xs font-medium bg-[#FFCC02] text-gray-900 rounded-xl hover:bg-[#FFCC02]/90 transition-colors"
                data-testid="button-upgrade"
              >
                {plan?.tier === "free" ? "Upgrade Plan" : "Change Plan"}
              </button>
              {plan?.tier !== "free" && (
                <button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="px-4 py-2 text-xs font-medium text-red-500 border border-red-100 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-60"
                  data-testid="button-cancel"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Plan Comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="section-plans">
        {allTiers.map((tier) => {
          const isCurrent = tier.key === (plan?.tier ?? "free");
          return (
            <div
              key={tier.key}
              className={`rounded-2xl border p-5 transition-all ${isCurrent ? "shadow-sm" : "bg-white border-gray-100 hover:border-gray-200"}`}
              style={isCurrent ? { borderColor: TIER_COLORS[tier.key], backgroundColor: `${TIER_COLORS[tier.key]}06` } : {}}
              data-testid={`plan-card-${tier.key}`}
            >
              <p className="text-sm font-semibold text-gray-800">{tier.label}</p>
              <p className="text-lg font-bold text-gray-800 mt-1">
                {tier.priceThb != null ? `฿${tier.priceThb.toLocaleString()}/mo` : "Custom"}
              </p>
              <ul className="mt-3 space-y-1.5">
                {tier.features.map((f) => (
                  <li key={f} className="text-[11px] text-gray-500 flex items-start gap-1.5">
                    <span className="text-[#00B14F] mt-0.5"><CheckCircle2 className="w-3 h-3" /></span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent}
                onClick={() => !isCurrent && setLocation("/admin/owner/settings")}
                className={`w-full mt-4 text-xs font-medium rounded-lg py-2 transition-colors ${
                  isCurrent
                    ? "bg-gray-100 text-gray-400 cursor-default"
                    : "bg-[#FFCC02] text-gray-900 hover:bg-[#FFCC02]/90"
                }`}
                data-testid={`button-select-${tier.key}`}
              >
                {isCurrent ? "Current" : "Select"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Invoice History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-invoices">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">Payment History</h3>
        </div>
        {invoicesLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />)}</div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2 text-gray-400">
            <Activity className="w-6 h-6 opacity-30" />
            <p className="text-xs">No payment history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-invoices">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 py-2 pr-4">Invoice</th>
                  <th className="text-left text-xs font-medium text-gray-400 py-2 pr-4">Date</th>
                  <th className="text-left text-xs font-medium text-gray-400 py-2 pr-4">Plan</th>
                  <th className="text-left text-xs font-medium text-gray-400 py-2 pr-4">Amount</th>
                  <th className="text-left text-xs font-medium text-gray-400 py-2 pr-4">Method</th>
                  <th className="text-left text-xs font-medium text-gray-400 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 last:border-0" data-testid={`row-invoice-${inv.id}`}>
                    <td className="py-3 pr-4 text-gray-700 font-mono text-xs">{inv.id}</td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">{inv.date}</td>
                    <td className="py-3 pr-4 text-gray-700 text-xs capitalize">{inv.tier}</td>
                    <td className="py-3 pr-4 text-gray-800 font-medium text-xs">฿{inv.amountThb?.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">{METHOD_LABEL[inv.method] ?? inv.method}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_STYLES[inv.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {inv.status === "succeeded" && <CheckCircle2 className="w-3 h-3" />}
                          {inv.status === "failed" && <XCircle className="w-3 h-3" />}
                          {inv.status === "pending" && <Clock className="w-3 h-3" />}
                          {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                        </span>
                        {inv.slipUrl && (
                          <a href={inv.slipUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
