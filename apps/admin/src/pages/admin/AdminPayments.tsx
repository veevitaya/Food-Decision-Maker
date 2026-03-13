import { useState } from "react";
import {
  DollarSign,
  CreditCard,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Wallet,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";

const revenueKpis = [
  {
    label: "Total Revenue",
    value: "฿1,248,500",
    delta: "+18.2%",
    icon: DollarSign,
    iconBg: "#3B82F6",
  },
  {
    label: "Active Subscriptions",
    value: "342",
    delta: "+12",
    icon: Users,
    iconBg: "#EC4899",
  },
  {
    label: "MRR",
    value: "฿428,600",
    delta: "+8.4%",
    icon: TrendingUp,
    iconBg: "#FFCC02",
  },
  {
    label: "Churn Rate",
    value: "2.1%",
    delta: "-0.3%",
    icon: AlertCircle,
    iconBg: "#3B82F6",
  },
];

const transactions = [
  { date: "2025-01-15", owner: "Somchai K.", restaurant: "Pad Thai Palace", amount: "฿2,990", plan: "Premium", status: "paid", method: "Credit Card" },
  { date: "2025-01-15", owner: "Nattaya P.", restaurant: "Sushi Garden", amount: "฿1,490", plan: "Basic", status: "paid", method: "Bank Transfer" },
  { date: "2025-01-14", owner: "Wichai T.", restaurant: "Coffee Corner", amount: "฿4,990", plan: "Enterprise", status: "pending", method: "Credit Card" },
  { date: "2025-01-14", owner: "Pranee S.", restaurant: "Thai Street Eats", amount: "฿1,490", plan: "Basic", status: "paid", method: "Bank Transfer" },
  { date: "2025-01-13", owner: "Kittisak R.", restaurant: "Burger House", amount: "฿2,990", plan: "Premium", status: "failed", method: "Credit Card" },
  { date: "2025-01-13", owner: "Arunee M.", restaurant: "Noodle King", amount: "฿1,490", plan: "Basic", status: "paid", method: "Bank Transfer" },
  { date: "2025-01-12", owner: "Piyapong L.", restaurant: "Green Leaf Cafe", amount: "฿2,990", plan: "Premium", status: "paid", method: "Credit Card" },
  { date: "2025-01-12", owner: "Siriwan C.", restaurant: "Dim Sum House", amount: "฿4,990", plan: "Enterprise", status: "paid", method: "Bank Transfer" },
];

const subscriptionTiers = [
  { tier: "Free", count: 128, color: "#94A3B8", pct: 27 },
  { tier: "Basic", count: 156, color: "#3B82F6", pct: 33 },
  { tier: "Premium", count: 132, color: "#EC4899", pct: 28 },
  { tier: "Enterprise", count: 54, color: "#FFCC02", pct: 12 },
];

const statusIcon: Record<string, typeof CheckCircle2> = {
  paid: CheckCircle2,
  pending: Clock,
  failed: XCircle,
};

const statusColor: Record<string, string> = {
  paid: "text-emerald-500 bg-emerald-50",
  pending: "text-amber-500 bg-amber-50",
  failed: "text-red-500 bg-red-50",
};

export default function AdminPayments() {
  const [gatewayConnected] = useState(false);

  return (
    <div className="space-y-6" data-testid="admin-payments-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900" data-testid="text-payments-title">Payment Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage revenue, subscriptions, and payouts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="payments-kpi-grid">
        {revenueKpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</span>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${kpi.iconBg}18` }}
              >
                <kpi.icon className="w-4 h-4" style={{ color: kpi.iconBg }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900" data-testid={`text-kpi-value-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
              {kpi.value}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-500">{kpi.delta}</span>
              <span className="text-xs text-gray-400 ml-1">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="gateway-status-card">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4" style={{ color: "#3B82F6" }} />
            Payment Gateway
          </h3>
          <div className="space-y-3">
            {["Omise", "Stripe"].map((gw) => (
              <div key={gw} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-800">{gw}</span>
                    <p className="text-[11px] text-gray-400">{gatewayConnected ? "Connected" : "Not Connected"}</p>
                  </div>
                </div>
                <button
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                  data-testid={`button-connect-${gw.toLowerCase()}`}
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="subscription-breakdown-card">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: "#EC4899" }} />
            Subscription Breakdown
          </h3>
          <div className="flex items-end gap-1 h-32 mb-4">
            {subscriptionTiers.map((t) => (
              <div key={t.tier} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-gray-700">{t.count}</span>
                <div
                  className="w-full rounded-lg transition-all"
                  style={{
                    height: `${Math.max(t.pct * 3, 12)}px`,
                    backgroundColor: t.color,
                    opacity: 0.85,
                  }}
                />
                <span className="text-[10px] text-gray-500 font-medium mt-1">{t.tier}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
            {subscriptionTiers.map((t) => (
              <div key={t.tier} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-xs text-gray-500">{t.tier} ({t.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm" data-testid="transactions-table-card">
        <div className="flex items-center justify-between gap-3 flex-wrap p-5 pb-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <DollarSign className="w-4 h-4" style={{ color: "#3B82F6" }} />
            Recent Transactions
          </h3>
          <span className="text-xs text-gray-400">{transactions.length} transactions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" data-testid="transactions-table">
            <thead>
              <tr className="border-t border-b border-gray-100">
                <th className="px-5 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-400">Date</th>
                <th className="px-5 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-400">Owner</th>
                <th className="px-5 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-400">Restaurant</th>
                <th className="px-5 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-400">Amount</th>
                <th className="px-5 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-400">Plan</th>
                <th className="px-5 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-400">Status</th>
                <th className="px-5 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-400">Method</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => {
                const StatusIcon = statusIcon[tx.status] || Clock;
                const colorClass = statusColor[tx.status] || "text-gray-500 bg-gray-50";
                return (
                  <tr
                    key={i}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    data-testid={`row-transaction-${i}`}
                  >
                    <td className="px-5 py-3 text-sm text-gray-600">{tx.date}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{tx.owner}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{tx.restaurant}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{tx.amount}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {tx.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
                        <StatusIcon className="w-3 h-3" />
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{tx.method}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="payout-settings-card">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4" style={{ color: "#EC4899" }} />
          Payout Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Bank Account</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Bank</span>
                <span className="text-sm font-medium text-gray-800" data-testid="text-payout-bank">Bangkok Bank</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Account Number</span>
                <span className="text-sm font-medium text-gray-800" data-testid="text-payout-account">••••••7890</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Account Name</span>
                <span className="text-sm font-medium text-gray-800" data-testid="text-payout-name">Toast Co., Ltd.</span>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Payout Schedule</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Frequency</span>
                <span className="text-sm font-medium text-gray-800" data-testid="text-payout-frequency">Monthly</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Next Payout</span>
                <span className="text-sm font-medium text-gray-800" data-testid="text-payout-next">2025-02-01</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Pending Amount</span>
                <span className="text-sm font-semibold" style={{ color: "#3B82F6" }} data-testid="text-payout-pending">฿186,400</span>
              </div>
            </div>
          </div>
        </div>
        <button
          className="mt-4 text-sm font-medium px-4 py-2 rounded-xl text-white transition-colors"
          style={{ backgroundColor: "#3B82F6" }}
          data-testid="button-edit-payout"
        >
          Edit Payout Settings
        </button>
      </div>
    </div>
  );
}
