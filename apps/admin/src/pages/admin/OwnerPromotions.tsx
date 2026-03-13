import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAdminSession } from "./AdminLayout";
import {
  Megaphone,
  Plus,
  Calendar,
  Target,
  TrendingUp,
  Eye,
  MousePointer,
  Percent,
  Gift,
  Zap,
  Clock,
  X,
  Loader2,
} from "lucide-react";

function getOwnerHeaders() {
  const session = getAdminSession();
  if (!session || session.sessionType !== "owner") return {};
  return { "x-owner-token": btoa(`${session.email}:`) };
}

interface Promotion {
  id: number;
  title: string;
  type: "discount" | "bundle" | "freeItem" | "happyHour";
  status: "active" | "draft" | "ended" | "scheduled";
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  redemptions: number;
  budget: number;
  spent: number;
}

const MOCK_PROMOTIONS: Promotion[] = [
  {
    id: 1,
    title: "20% Off All Mains",
    type: "discount",
    status: "active",
    startDate: "Mar 1, 2026",
    endDate: "Mar 31, 2026",
    impressions: 3420,
    clicks: 287,
    redemptions: 45,
    budget: 5000,
    spent: 2340,
  },
  {
    id: 2,
    title: "Free Dessert with ฿500+",
    type: "freeItem",
    status: "active",
    startDate: "Mar 5, 2026",
    endDate: "Mar 20, 2026",
    impressions: 1890,
    clicks: 156,
    redemptions: 28,
    budget: 3000,
    spent: 1680,
  },
  {
    id: 3,
    title: "Happy Hour 4-6PM",
    type: "happyHour",
    status: "scheduled",
    startDate: "Mar 15, 2026",
    endDate: "Apr 15, 2026",
    impressions: 0,
    clicks: 0,
    redemptions: 0,
    budget: 2000,
    spent: 0,
  },
  {
    id: 4,
    title: "Lunch Set Menu ฿199",
    type: "bundle",
    status: "ended",
    startDate: "Feb 1, 2026",
    endDate: "Feb 28, 2026",
    impressions: 5200,
    clicks: 430,
    redemptions: 89,
    budget: 4000,
    spent: 4000,
  },
];

const typeIcons: Record<string, typeof Percent> = {
  discount: Percent,
  bundle: Gift,
  freeItem: Gift,
  happyHour: Clock,
};

const typeColors: Record<string, string> = {
  discount: "bg-[#3B82F6]/10 text-[#3B82F6]",
  bundle: "bg-[#FFCC02]/15 text-gray-700",
  freeItem: "bg-[#00B14F]/10 text-[#00B14F]",
  happyHour: "bg-blue-50 text-blue-600",
};

const statusColors: Record<string, string> = {
  active: "bg-[#00B14F]/10 text-[#00B14F]",
  draft: "bg-gray-100 text-gray-500",
  ended: "bg-gray-100 text-gray-400",
  scheduled: "bg-[#FFCC02]/15 text-gray-700",
};

export default function OwnerPromotions() {
  const session = getAdminSession();
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    dealType: "discount" as "discount" | "bundle" | "freeItem" | "happyHour",
    dealValue: "",
    startDate: "",
    endDate: "",
    targetGroups: [] as string[],
    budget: "",
  });
  const qc = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const ownerKey = session?.email || "";
      const res = await apiRequest("POST", "/api/campaigns", {
        restaurantOwnerKey: ownerKey,
        title: data.title,
        dealType: data.dealType,
        dealValue: data.dealValue,
        startDate: data.startDate,
        endDate: data.endDate,
        targetGroups: data.targetGroups,
        description: `Budget: ${data.budget}`,
        status: "draft",
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setShowCreate(false);
      setFormData({
        title: "",
        dealType: "discount",
        dealValue: "",
        startDate: "",
        endDate: "",
        targetGroups: [],
        budget: "",
      });
      toast({ title: "Promotion created", description: "Your new promotion has been saved as a draft." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.dealType) return;
    createMutation.mutate(formData);
  };

  const toggleTargetGroup = (group: string) => {
    setFormData((prev) => ({
      ...prev,
      targetGroups: prev.targetGroups.includes(group)
        ? prev.targetGroups.filter((g) => g !== group)
        : [...prev.targetGroups, group],
    }));
  };

  const activePromos = MOCK_PROMOTIONS.filter((p) => p.status === "active");
  const totalImpressions = MOCK_PROMOTIONS.reduce((s, p) => s + p.impressions, 0);
  const totalRedemptions = MOCK_PROMOTIONS.reduce((s, p) => s + p.redemptions, 0);

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400" data-testid="text-access-denied">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="owner-promotions-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-5 h-5 text-[#FFCC02]" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800" data-testid="text-promotions-title">Promotions</h2>
            <p className="text-xs text-gray-400">Create deals to attract more diners</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-[#FFCC02] text-gray-900 text-sm font-medium rounded-xl px-4 py-2.5 hover:bg-[#FFCC02]/90 transition-colors flex items-center gap-1.5 shadow-sm"
          data-testid="button-create-promotion"
        >
          <Plus className="w-4 h-4" /> New Promotion
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5"
          data-testid="form-create-promotion"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Create New Promotion</h3>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              data-testid="button-close-create-form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. 20% Off All Mains"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00B14F]/30 focus:border-[#00B14F]"
                required
                data-testid="input-promo-title"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Deal Type</label>
              <select
                value={formData.dealType}
                onChange={(e) => setFormData((p) => ({ ...p, dealType: e.target.value as typeof formData.dealType }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00B14F]/30 focus:border-[#00B14F] bg-white"
                data-testid="select-deal-type"
              >
                <option value="discount">Discount</option>
                <option value="bundle">Bundle</option>
                <option value="freeItem">Free Item</option>
                <option value="happyHour">Happy Hour</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Deal Value</label>
              <input
                type="text"
                value={formData.dealValue}
                onChange={(e) => setFormData((p) => ({ ...p, dealValue: e.target.value }))}
                placeholder="e.g. 20% or ฿100 off"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00B14F]/30 focus:border-[#00B14F]"
                data-testid="input-deal-value"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00B14F]/30 focus:border-[#00B14F]"
                data-testid="input-start-date"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00B14F]/30 focus:border-[#00B14F]"
                data-testid="input-end-date"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Budget (฿)</label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData((p) => ({ ...p, budget: e.target.value }))}
                placeholder="e.g. 5000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00B14F]/30 focus:border-[#00B14F]"
                data-testid="input-budget"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Target Groups</label>
              <div className="flex flex-wrap gap-2">
                {["couples", "families", "students", "office_workers", "tourists", "foodies"].map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => toggleTargetGroup(group)}
                    className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                      formData.targetGroups.includes(group)
                        ? "bg-[#00B14F]/10 text-[#00B14F] border-[#00B14F]/30"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                    data-testid={`button-target-${group}`}
                  >
                    {group.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4 py-2"
              data-testid="button-cancel-promotion"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-[#00B14F] text-white text-sm font-medium rounded-xl px-5 py-2.5 hover:bg-[#00B14F]/90 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              data-testid="button-submit-promotion"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Promotion
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="stat-active-promos">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#00B14F]/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#00B14F]" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{activePromos.length}</p>
          <p className="text-xs text-gray-400 mt-1">Running promotions</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="stat-total-impressions">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
              <Eye className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Impressions</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{totalImpressions.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Total reach</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="stat-total-redemptions">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFCC02]/15 flex items-center justify-center">
              <Target className="w-4 h-4 text-[#FFCC02]" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Redemptions</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{totalRedemptions}</p>
          <p className="text-xs text-gray-400 mt-1">Deals redeemed</p>
        </div>
      </div>

      <div className="space-y-4" data-testid="section-promotions-list">
        {MOCK_PROMOTIONS.map((promo) => {
          const TypeIcon = typeIcons[promo.type] || Megaphone;
          const budgetPct = promo.budget > 0 ? Math.round((promo.spent / promo.budget) * 100) : 0;
          const ctr = promo.impressions > 0 ? ((promo.clicks / promo.impressions) * 100).toFixed(1) : "0.0";

          return (
            <div
              key={promo.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
              data-testid={`promo-card-${promo.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeColors[promo.type]}`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-gray-800">{promo.title}</h4>
                      <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${statusColors[promo.status]}`}>
                        {promo.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{promo.startDate} – {promo.endDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Impressions</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{promo.impressions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Clicks</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{promo.clicks.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">CTR</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{ctr}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Redeemed</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{promo.redemptions}</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">Budget: ฿{promo.spent.toLocaleString()} / ฿{promo.budget.toLocaleString()}</span>
                  <span className="text-gray-500 font-medium">{budgetPct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all bg-[#FFCC02]"
                    style={{ width: `${Math.min(budgetPct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
