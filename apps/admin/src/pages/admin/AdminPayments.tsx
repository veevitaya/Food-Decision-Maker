import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Settings2,
  Activity,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PaymentSummary {
  mrr: number;
  activeSubscriptions: number;
  pendingSlips: number;
  failedPayments: number;
}

interface PaymentTransaction {
  id: number;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  restaurantId: number | null;
  amountThb: number;
  currency: string;
  provider: string;
  method: string;
  status: string;
  tier: string;
  slipUrl: string | null;
  notes: string | null;
  createdAt: string;
}

interface GatewayConfig {
  activeGateway: "stripe" | "omise";
  stripeConfigured: boolean;
  omiseConfigured: boolean;
  stripePublishableKeyMasked: string | null;
  omisePublicKeyMasked: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  succeeded: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-600",
  requires_action: "bg-blue-50 text-blue-700",
};

const METHOD_LABEL: Record<string, string> = {
  card: "Card",
  promptpay: "PromptPay",
  mobile_banking: "Mobile Banking",
  bank_transfer: "Bank Transfer",
};

export default function AdminPayments() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expandedSlip, setExpandedSlip] = useState<number | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<number, string>>({});
  const [selectedGateway, setSelectedGateway] = useState<"stripe" | "omise" | null>(null);

  const { data: summary, isLoading: summaryLoading } = useQuery<PaymentSummary>({
    queryKey: ["/api/admin/payments/summary"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payments/summary", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load summary");
      return res.json();
    },
  });

  const { data: txData, isLoading: txLoading } = useQuery<{ transactions: PaymentTransaction[] }>({
    queryKey: ["/api/admin/payments/transactions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payments/transactions?limit=100", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load transactions");
      return res.json();
    },
  });

  const { data: gatewayConfig, isLoading: gatewayLoading } = useQuery<GatewayConfig>({
    queryKey: ["/api/admin/payments/gateway-config"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payments/gateway-config", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load gateway config");
      const data = await res.json();
      if (selectedGateway === null) setSelectedGateway(data.activeGateway);
      return data;
    },
  });

  const approveSlipMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/admin/payments/transactions/${id}/approve-slip`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/payments/transactions"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/payments/summary"] });
      toast({ title: "Slip approved", description: "Subscription activated for owner." });
    },
    onError: () => toast({ title: "Error", description: "Failed to approve slip.", variant: "destructive" }),
  });

  const rejectSlipMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      apiRequest("POST", `/api/admin/payments/transactions/${id}/reject-slip`, { notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/payments/transactions"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/payments/summary"] });
      toast({ title: "Slip rejected" });
    },
    onError: () => toast({ title: "Error", description: "Failed to reject slip.", variant: "destructive" }),
  });

  const saveGatewayMutation = useMutation({
    mutationFn: (gw: "stripe" | "omise") =>
      apiRequest("PUT", "/api/admin/payments/gateway-config", { activeGateway: gw }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/payments/gateway-config"] });
      toast({ title: "Gateway updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save gateway config.", variant: "destructive" }),
  });

  const transactions = txData?.transactions ?? [];
  const pendingSlips = transactions.filter((t) => t.method === "bank_transfer" && t.status === "pending");
  const activeGateway = selectedGateway ?? gatewayConfig?.activeGateway ?? "stripe";

  const kpis = [
    { label: "Monthly Revenue", value: summary ? `฿${summary.mrr.toLocaleString()}` : "—", icon: DollarSign, color: "var(--admin-blue)" },
    { label: "Active Subscriptions", value: summary ? String(summary.activeSubscriptions) : "—", icon: Users, color: "var(--admin-pink)" },
    { label: "Pending Slips", value: summary ? String(summary.pendingSlips) : "—", icon: Clock, color: "#FFCC02", alert: (summary?.pendingSlips ?? 0) > 0 },
    { label: "Failed Payments", value: summary ? String(summary.failedPayments) : "—", icon: AlertCircle, color: "var(--admin-cyan)" },
  ];

  return (
    <div className="space-y-8" data-testid="admin-payments-page">
      <div className="flex items-center gap-3">
        <CreditCard className="w-5 h-5" style={{ color: "var(--admin-blue)" }} />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Payments</h2>
          <p className="text-xs text-muted-foreground">Revenue, subscriptions, and payment gateway management</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5 relative overflow-hidden">
            {(kpi as any).alert && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${kpi.color}20` }}>
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
            </div>
            {summaryLoading
              ? <div className="h-6 w-20 bg-gray-100 rounded animate-pulse mb-1" />
              : <p className="text-xl font-bold text-gray-800">{kpi.value}</p>}
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-blue)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Transactions</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">All payment activity</p>
          </div>
          {txLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />)}</div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 gap-2 text-gray-400">
              <Activity className="w-6 h-6 opacity-30" />
              <p className="text-xs">No transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Owner", "Tier", "Amount", "Method", "Provider", "Status", "Date"].map((h) => (
                      <th key={h} className="text-left py-2 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2">
                        <p className="font-medium text-gray-800 truncate max-w-[100px]">{tx.ownerName}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[100px]">{tx.ownerEmail}</p>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 capitalize">{tx.tier}</span>
                      </td>
                      <td className="py-2.5 px-2 font-semibold text-gray-800">฿{tx.amountThb?.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-gray-500">{METHOD_LABEL[tx.method] ?? tx.method}</td>
                      <td className="py-2.5 px-2 capitalize text-gray-500">{tx.provider}</td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[tx.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-gray-400 whitespace-nowrap">{tx.createdAt?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Pending Slip Approvals */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "#FFCC02" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Slip Approvals</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Bank transfer verification</p>
            </div>
            {txLoading ? (
              <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-16 rounded bg-gray-100 animate-pulse" />)}</div>
            ) : pendingSlips.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-16 gap-2 text-gray-400">
                <CheckCircle2 className="w-5 h-5 opacity-30" />
                <p className="text-xs">No pending slips</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSlips.map((tx) => (
                  <div key={tx.id} className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{tx.ownerName}</p>
                        <p className="text-[10px] text-gray-400">฿{tx.amountThb?.toLocaleString()} · {tx.tier}</p>
                      </div>
                      <button
                        onClick={() => setExpandedSlip(expandedSlip === tx.id ? null : tx.id)}
                        className="flex-shrink-0 p-1 rounded hover:bg-amber-100 transition-colors"
                      >
                        {expandedSlip === tx.id
                          ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                          : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                      </button>
                    </div>
                    {expandedSlip === tx.id && tx.slipUrl && (
                      <div className="mb-2">
                        <img src={tx.slipUrl} alt="Slip" className="w-full rounded-lg border border-amber-200 max-h-48 object-contain bg-white" />
                        <a href={tx.slipUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-blue-500 mt-1 hover:underline">
                          <ExternalLink className="w-3 h-3" /> View full size
                        </a>
                      </div>
                    )}
                    {expandedSlip === tx.id && (
                      <input
                        type="text"
                        placeholder="Rejection notes (optional)"
                        value={rejectNotes[tx.id] ?? ""}
                        onChange={(e) => setRejectNotes({ ...rejectNotes, [tx.id]: e.target.value })}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-300 mb-2"
                      />
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveSlipMutation.mutate(tx.id)}
                        disabled={approveSlipMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => rejectSlipMutation.mutate({ id: tx.id, notes: rejectNotes[tx.id] ?? "" })}
                        disabled={rejectSlipMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 disabled:opacity-60 transition-colors border border-red-100"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gateway Config */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-pink)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Payment Gateway</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Active provider config</p>
            </div>
            {gatewayLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-8 rounded bg-gray-100 animate-pulse" />)}</div>
            ) : (
              <div className="space-y-3">
                {(["stripe", "omise"] as const).map((gw) => {
                  const configured = gw === "stripe" ? gatewayConfig?.stripeConfigured : gatewayConfig?.omiseConfigured;
                  const keyMasked = gw === "stripe" ? gatewayConfig?.stripePublishableKeyMasked : gatewayConfig?.omisePublicKeyMasked;
                  const selected = activeGateway === gw;
                  return (
                    <button
                      key={gw}
                      onClick={() => setSelectedGateway(gw)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        selected ? "border-[var(--admin-pink)] bg-pink-50/30" : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selected ? "border-[var(--admin-pink)]" : "border-gray-300"
                      }`}>
                        {selected && <div className="w-2 h-2 rounded-full bg-[var(--admin-pink)]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 capitalize">{gw}</p>
                        {keyMasked && <p className="text-[10px] text-gray-400 font-mono truncate">{keyMasked}</p>}
                        {!configured && <p className="text-[10px] text-red-400">Not configured — add env key</p>}
                      </div>
                      {configured && (
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">Ready</span>
                      )}
                    </button>
                  );
                })}
                <button
                  onClick={() => saveGatewayMutation.mutate(activeGateway)}
                  disabled={saveGatewayMutation.isPending || activeGateway === gatewayConfig?.activeGateway}
                  className="w-full mt-2 py-2 rounded-xl text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: "var(--admin-pink)" }}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Save Gateway
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
