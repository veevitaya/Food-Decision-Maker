import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Campaign } from "@shared/schema";
import {
  Play,
  Pause,
  StopCircle,
  Trash2,
  CheckCircle,
  Search,
  Calendar,
  User,
  Eye,
  MousePointerClick,
  TrendingUp,
  DollarSign,
  MapPin,
  Target,
  Plus,
  X,
  Send,
  Star,
  Clock,
} from "lucide-react";

type SponsoredRequest = {
  id: number;
  restaurantId: number;
  ownerId: number;
  status: string;
  requestedStartDate: string | null;
  requestedEndDate: string | null;
  notes: string | null;
  reviewNotes: string | null;
  createdAt: string;
};

const statusTabs = ["All", "Draft", "Active", "Paused", "Ended"] as const;

function statusPill(status: string | null) {
  switch (status) {
    case "active":
      return "bg-[#00B14F]/10 text-[#00B14F]";
    case "draft":
      return "bg-gray-100 text-muted-foreground";
    case "paused":
      return "bg-amber-100 text-amber-700";
    case "ended":
      return "bg-red-100 text-red-600";
    default:
      return "bg-gray-100 text-muted-foreground";
  }
}

function getAdType(dealType: string | null): { label: string; className: string } {
  switch (dealType) {
    case "discount":
      return { label: "Swipe Card", className: "bg-gray-100 text-indigo-600" };
    case "bundle":
      return { label: "Banner", className: "bg-gray-100 text-cyan-600" };
    case "freeItem":
      return { label: "Sponsored", className: "bg-gray-100 text-violet-600" };
    case "specialMenu":
      return { label: "Push", className: "bg-gray-100 text-orange-600" };
    default:
      return { label: "Swipe Card", className: "bg-gray-100 text-indigo-600" };
  }
}

function getPlacement(dealType: string | null): string {
  switch (dealType) {
    case "discount":
      return "Swipe Stack";
    case "bundle":
      return "Home Feed";
    case "freeItem":
      return "Detail Page";
    case "specialMenu":
      return "Push Notification";
    default:
      return "Home Feed";
  }
}

function getMockMetrics(id: number) {
  const seed = ((id * 7 + 13) % 100) / 100;
  const impressions = Math.floor(8000 + seed * 52000);
  const clicks = Math.floor(impressions * (0.03 + seed * 0.05));
  const ctr = ((clicks / impressions) * 100).toFixed(1);
  const dailyBudget = Math.floor(500 + seed * 4500);
  const totalBudget = dailyBudget * 30;
  const spent = Math.floor(totalBudget * (0.2 + seed * 0.6));
  const remaining = totalBudget - spent;
  const spentPct = Math.min(100, Math.round((spent / totalBudget) * 100));
  return { impressions, clicks, ctr, dailyBudget, totalBudget, spent, remaining, spentPct };
}

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

const kpiCards = [
  { label: "Total Impressions", value: "248K", icon: Eye, iconColor: "text-[var(--admin-blue)]", iconBg: "bg-[var(--admin-blue-10)]" },
  { label: "Total Clicks", value: "12.4K", icon: MousePointerClick, iconColor: "text-teal-500", iconBg: "bg-teal-50" },
  { label: "Avg CTR", value: "5.0%", icon: TrendingUp, iconColor: "text-[var(--admin-blue)]", iconBg: "bg-[var(--admin-blue-10)]" },
  { label: "Revenue Generated", value: "฿847K", icon: DollarSign, iconColor: "text-emerald-500", iconBg: "bg-emerald-50" },
];

const dealTypeOptions = [
  { value: "discount", label: "Discount" },
  { value: "bundle", label: "Bundle" },
  { value: "freeItem", label: "Free Item" },
  { value: "happyHour", label: "Happy Hour" },
  { value: "specialMenu", label: "Special Menu" },
];

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
];

const targetGroupOptions = ["students", "families", "couples", "tourists", "office_workers", "foodies"];

const emptyForm = {
  title: "",
  restaurantOwnerKey: "",
  dealType: "discount",
  dealValue: "",
  startDate: "",
  endDate: "",
  targetGroups: [] as string[],
  status: "active",
};

export default function AdminCampaigns() {
  const [activeTab, setActiveTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [sendModal, setSendModal] = useState<{ campaign: Campaign } | null>(null);
  const [notifLineIds, setNotifLineIds] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const { toast } = useToast();

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) =>
      apiRequest("POST", "/api/campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setShowCreate(false);
      setForm({ ...emptyForm });
      toast({ title: "Campaign created", description: "The new campaign has been created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create campaign.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: number; updates: Partial<Campaign> }) =>
      apiRequest("PATCH", `/api/campaigns/${args.id}`, args.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
  });

  const { data: sponsoredRequests = [] } = useQuery<SponsoredRequest[]>({
    queryKey: ["/api/admin/sponsored-requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sponsored-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load sponsored requests");
      return res.json();
    },
  });

  const reviewSponsoredMutation = useMutation({
    mutationFn: (args: { id: number; status: "approved" | "rejected"; reviewNotes?: string }) =>
      apiRequest("PATCH", `/api/admin/sponsored-requests/${args.id}`, { status: args.status, reviewNotes: args.reviewNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sponsored-requests"] });
      toast({ title: "Sponsorship request reviewed" });
    },
    onError: () => toast({ title: "Error reviewing request", variant: "destructive" }),
  });

  const sendNotifMutation = useMutation({
    mutationFn: (args: { lineUserIds: string[]; message: string; campaignId: number }) =>
      apiRequest("POST", "/api/notifications/send", args),
    onSuccess: (data: any) => {
      setSendModal(null);
      setNotifLineIds("");
      setNotifMessage("");
      if (data?.lineConfigured === false) {
        toast({ title: "Notification logged (LINE not configured)", description: "LINE_CHANNEL_ACCESS_TOKEN is not set. Log saved, no message delivered.", variant: "default" });
      } else {
        toast({ title: "Notification sent", description: `Delivered to ${data?.recipientCount ?? "?"} recipient(s).` });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send notification.", variant: "destructive" });
    },
  });

  const filtered = campaigns.filter((c) => {
    const matchesTab =
      activeTab === "All" || c.status === activeTab.toLowerCase();
    const matchesSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.restaurantOwnerKey.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div data-testid="admin-campaigns-page" className="space-y-6">
      {/* Send Notification Modal */}
      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Send Notification</h3>
              <Button size="icon" variant="ghost" onClick={() => setSendModal(null)}><X className="w-4 h-4" /></Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Campaign: <span className="font-medium text-gray-800">{sendModal.campaign.title}</span>
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">LINE User IDs (comma-separated)</label>
              <textarea
                value={notifLineIds}
                onChange={(e) => setNotifLineIds(e.target.value)}
                placeholder="U1234abcd,U5678efgh"
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30"
              />
              <p className="text-[11px] text-muted-foreground">Enter LINE userIds of recipients. If LINE is not configured, the log will still be saved.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Message</label>
              <textarea
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                placeholder={`Check out our new deal: ${sendModal.campaign.dealValue || sendModal.campaign.title}!`}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" className="rounded-xl" onClick={() => setSendModal(null)}>Cancel</Button>
              <Button
                className="bg-[var(--admin-blue)] hover:bg-[var(--admin-blue-90)] text-white rounded-xl"
                disabled={sendNotifMutation.isPending || !notifMessage.trim() || !notifLineIds.trim()}
                onClick={() => {
                  const ids = notifLineIds.split(",").map((s) => s.trim()).filter(Boolean);
                  if (ids.length === 0) return;
                  sendNotifMutation.mutate({ lineUserIds: ids, message: notifMessage.trim(), campaignId: sendModal.campaign.id });
                }}
              >
                <Send className="w-4 h-4 mr-1" />
                {sendNotifMutation.isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-semibold text-gray-800" data-testid="text-campaigns-title">
            Ad Platform Manager
          </h2>
          <span className="bg-[#FFCC02] text-gray-900 text-xs font-medium rounded-full px-3 py-0.5">
            {campaigns.length}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64 rounded-xl border-gray-100 focus:ring-[#FFCC02]/30 focus:border-[#FFCC02]"
              data-testid="input-search-campaigns"
            />
          </div>
          <Button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-[var(--admin-blue)] hover:bg-[var(--admin-blue-90)] text-white rounded-xl"
            data-testid="button-create-campaign"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Campaign
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4" data-testid="form-create-campaign">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Create New Campaign</h3>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { setShowCreate(false); setForm({ ...emptyForm }); }}
              data-testid="button-close-create-form"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Campaign title"
                className="rounded-xl border-gray-200"
                data-testid="input-create-title"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Restaurant Owner Key</label>
              <Input
                value={form.restaurantOwnerKey}
                onChange={(e) => setForm({ ...form, restaurantOwnerKey: e.target.value })}
                placeholder="e.g. owner_email@example.com"
                className="rounded-xl border-gray-200"
                data-testid="input-create-owner-key"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Deal Type</label>
              <select
                value={form.dealType}
                onChange={(e) => setForm({ ...form, dealType: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                data-testid="select-create-deal-type"
              >
                {dealTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Deal Value</label>
              <Input
                value={form.dealValue}
                onChange={(e) => setForm({ ...form, dealValue: e.target.value })}
                placeholder="e.g. 20% off, Buy 1 Get 1"
                className="rounded-xl border-gray-200"
                data-testid="input-create-deal-value"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="rounded-xl border-gray-200"
                data-testid="input-create-start-date"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">End Date</label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="rounded-xl border-gray-200"
                data-testid="input-create-end-date"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                data-testid="select-create-status"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Target Groups</label>
              <div className="flex gap-2 flex-wrap">
                {targetGroupOptions.map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => {
                      const next = form.targetGroups.includes(group)
                        ? form.targetGroups.filter((g) => g !== group)
                        : [...form.targetGroups, group];
                      setForm({ ...form, targetGroups: next });
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      form.targetGroups.includes(group)
                        ? "bg-[var(--admin-blue)] text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                    data-testid={`toggle-target-${group}`}
                  >
                    {group.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => { setShowCreate(false); setForm({ ...emptyForm }); }}
              className="rounded-xl"
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!form.title || !form.restaurantOwnerKey) {
                  toast({ title: "Validation Error", description: "Title and Restaurant Owner Key are required.", variant: "destructive" });
                  return;
                }
                createMutation.mutate(form);
              }}
              disabled={createMutation.isPending}
              className="bg-[var(--admin-blue)] hover:bg-[var(--admin-blue-90)] text-white rounded-xl"
              data-testid="button-submit-create"
            >
              {createMutation.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-campaign-kpis">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
            data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
                </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-100 rounded-xl p-1 inline-flex gap-1 flex-wrap">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab
                ? "bg-white text-gray-800 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab.toLowerCase()}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-muted-foreground" data-testid="text-no-campaigns">
            No campaigns found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((campaign) => {
            const adType = getAdType(campaign.dealType);
            const placement = getPlacement(campaign.dealType);
            const metrics = getMockMetrics(campaign.id);

            return (
              <div
                key={campaign.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
                data-testid={`card-campaign-${campaign.id}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-semibold text-base text-gray-800"
                        data-testid={`text-campaign-title-${campaign.id}`}
                      >
                        {campaign.title}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${statusPill(campaign.status)}`}
                        data-testid={`badge-status-${campaign.id}`}
                      >
                        {campaign.status}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${adType.className}`}
                        data-testid={`badge-adtype-${campaign.id}`}
                      >
                        {adType.label}
                      </span>
                      <span
                        className="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium border border-gray-100 text-muted-foreground"
                        data-testid={`badge-deal-${campaign.id}`}
                      >
                        {campaign.dealType}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid={`text-placement-${campaign.id}`}>
                      <MapPin className="w-3 h-3" />
                      Placement: {placement}
                    </div>

                    {campaign.dealValue && (
                      <p
                        className="text-sm text-muted-foreground"
                        data-testid={`text-deal-value-${campaign.id}`}
                      >
                        Deal: {campaign.dealValue}
                      </p>
                    )}

                    <div className="flex items-center gap-5 text-xs flex-wrap" data-testid={`metrics-row-${campaign.id}`}>
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-muted-foreground">Impressions</span>
                        <span className="font-semibold text-gray-800">{formatNum(metrics.impressions)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MousePointerClick className="w-3.5 h-3.5 text-cyan-500" />
                        <span className="text-muted-foreground">Clicks</span>
                        <span className="font-semibold text-gray-800">{formatNum(metrics.clicks)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-muted-foreground">CTR</span>
                        <span className="font-semibold text-gray-800">{metrics.ctr}%</span>
                      </div>
                    </div>

                    <div className="space-y-1" data-testid={`budget-info-${campaign.id}`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Budget: ฿{formatNum(metrics.spent)} / ฿{formatNum(metrics.totalBudget)}
                          <span className="ml-2 text-muted-foreground/60">(฿{formatNum(metrics.dailyBudget)}/day)</span>
                        </span>
                        <span className="text-muted-foreground">{metrics.spentPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${metrics.spentPct}%`,
                            background: metrics.spentPct > 80 ? "hsl(350, 89%, 60%)" : "#FFCC02",
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground/60 flex-wrap">
                      <span className="flex items-center gap-1" data-testid={`text-owner-${campaign.id}`}>
                        <User className="w-3 h-3" />
                        {campaign.restaurantOwnerKey}
                      </span>
                      {campaign.startDate && (
                        <span className="flex items-center gap-1" data-testid={`text-dates-${campaign.id}`}>
                          <Calendar className="w-3 h-3" />
                          {campaign.startDate}
                          {campaign.endDate ? ` - ${campaign.endDate}` : ""}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1.5 flex-wrap" data-testid={`pills-targets-${campaign.id}`}>
                      {campaign.targetGroups && campaign.targetGroups.length > 0 &&
                        campaign.targetGroups.map((group, idx) => (
                          <span
                            key={idx}
                            className="bg-gray-100 text-foreground rounded-full text-xs px-3 py-1 font-medium"
                            data-testid={`pill-target-${campaign.id}-${idx}`}
                          >
                            {group}
                          </span>
                        ))
                      }
                      <span
                        className="bg-gray-100 text-foreground rounded-full text-xs px-3 py-1 font-medium flex items-center gap-1"
                        data-testid={`pill-age-${campaign.id}`}
                      >
                        <Target className="w-3 h-3" />
                        Age 25-44
                      </span>
                      <span
                        className="bg-gray-100 text-foreground rounded-full text-xs px-3 py-1 font-medium flex items-center gap-1"
                        data-testid={`pill-location-${campaign.id}`}
                      >
                        <MapPin className="w-3 h-3" />
                        Bangkok Central
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {campaign.status === "draft" && (
                      <button
                        className="inline-flex items-center gap-1 bg-[#00B14F] hover:bg-[#00B14F]/90 text-white text-sm font-medium rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50"
                        onClick={() =>
                          updateMutation.mutate({
                            id: campaign.id,
                            updates: { status: "active" },
                          })
                        }
                        disabled={updateMutation.isPending}
                        data-testid={`button-approve-${campaign.id}`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                    )}
                    {campaign.status === "active" && (
                      <button
                        className="inline-flex items-center gap-1 border border-gray-100 text-muted-foreground hover:text-foreground hover:bg-gray-50 text-sm font-medium rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50"
                        onClick={() =>
                          updateMutation.mutate({
                            id: campaign.id,
                            updates: { status: "paused" },
                          })
                        }
                        disabled={updateMutation.isPending}
                        data-testid={`button-pause-${campaign.id}`}
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </button>
                    )}
                    {campaign.status === "paused" && (
                      <button
                        className="inline-flex items-center gap-1 border border-gray-100 text-muted-foreground hover:text-foreground hover:bg-gray-50 text-sm font-medium rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50"
                        onClick={() =>
                          updateMutation.mutate({
                            id: campaign.id,
                            updates: { status: "active" },
                          })
                        }
                        disabled={updateMutation.isPending}
                        data-testid={`button-resume-${campaign.id}`}
                      >
                        <Play className="w-4 h-4" />
                        Resume
                      </button>
                    )}
                    {(campaign.status === "active" || campaign.status === "paused") && (
                      <button
                        className="inline-flex items-center gap-1 border border-gray-100 text-muted-foreground hover:text-foreground hover:bg-gray-50 text-sm font-medium rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50"
                        onClick={() =>
                          updateMutation.mutate({
                            id: campaign.id,
                            updates: { status: "ended" },
                          })
                        }
                        disabled={updateMutation.isPending}
                        data-testid={`button-end-${campaign.id}`}
                      >
                        <StopCircle className="w-4 h-4" />
                        End
                      </button>
                    )}
                    <button
                      className="inline-flex items-center gap-1 border border-gray-100 text-muted-foreground hover:text-[var(--admin-blue)] hover:bg-blue-50 text-sm font-medium rounded-xl px-4 py-1.5 transition-colors"
                      onClick={() => {
                        setNotifMessage(`Hey! Check out our deal: ${campaign.dealValue || campaign.title} 🎉`);
                        setNotifLineIds("");
                        setSendModal({ campaign });
                      }}
                      data-testid={`button-notify-${campaign.id}`}
                    >
                      <Send className="w-4 h-4" />
                      Notify
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Delete this campaign?")) {
                          deleteMutation.mutate(campaign.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${campaign.id}`}
                      className="text-red-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sponsored Requests Queue */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4" data-testid="section-sponsored-requests">
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-base font-semibold text-gray-800">Sponsored Placement Requests</h3>
            <p className="text-xs text-muted-foreground">Partner requests to feature their restaurant as sponsored in the swipe deck</p>
          </div>
          {sponsoredRequests.filter(r => r.status === "pending").length > 0 && (
            <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-semibold rounded-full px-2.5 py-0.5">
              {sponsoredRequests.filter(r => r.status === "pending").length} pending
            </span>
          )}
        </div>

        {sponsoredRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No sponsored requests yet.</p>
        ) : (
          <div className="space-y-3">
            {sponsoredRequests.map((req) => (
              <div key={req.id} className="border border-gray-100 rounded-xl p-4 flex items-start justify-between gap-4 flex-wrap" data-testid={`sponsored-req-${req.id}`}>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">Restaurant #{req.restaurantId}</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      req.status === "pending" ? "bg-amber-100 text-amber-700"
                      : req.status === "approved" ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  {(req.requestedStartDate || req.requestedEndDate) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {req.requestedStartDate ?? "—"} → {req.requestedEndDate ?? "ongoing"}
                    </p>
                  )}
                  {req.notes && <p className="text-xs text-muted-foreground">Note: {req.notes}</p>}
                  {req.reviewNotes && <p className="text-xs text-muted-foreground italic">Review: {req.reviewNotes}</p>}
                  <p className="text-[10px] text-muted-foreground/60">
                    Submitted: {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      className="inline-flex items-center gap-1 bg-[#00B14F] hover:bg-[#00B14F]/90 text-white text-sm font-medium rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50"
                      disabled={reviewSponsoredMutation.isPending}
                      onClick={() => reviewSponsoredMutation.mutate({ id: req.id, status: "approved" })}
                      data-testid={`approve-sponsored-${req.id}`}
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button
                      className="inline-flex items-center gap-1 border border-gray-100 text-muted-foreground hover:text-red-500 hover:bg-red-50 text-sm font-medium rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50"
                      disabled={reviewSponsoredMutation.isPending}
                      onClick={() => reviewSponsoredMutation.mutate({ id: req.id, status: "rejected" })}
                      data-testid={`reject-sponsored-${req.id}`}
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
