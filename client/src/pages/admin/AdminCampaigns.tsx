import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";

type CampaignRecord = {
  id: number;
  title: string;
  status: "draft" | "active" | "paused" | "ended";
  dealType: string | null;
  dealValue: string | null;
  restaurantOwnerKey: string;
  startDate: string | null;
  endDate: string | null;
  targetGroups?: string[];
  impressions?: number;
  clicks?: number;
  dailyBudget?: number;
  totalBudget?: number;
  spent?: number;
};

const statusTabs = ["All", "Draft", "Active", "Paused", "Ended"] as const;

function statusPill(status: string | null) {
  switch (status) {
    case "active":
      return "bg-foreground text-white";
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
      return { label: "Swipe Card", className: "bg-gray-100 dark:bg-muted text-indigo-600 dark:text-indigo-400" };
    case "bundle":
      return { label: "Banner", className: "bg-gray-100 dark:bg-muted text-cyan-600 dark:text-cyan-400" };
    case "freeItem":
      return { label: "Sponsored", className: "bg-gray-100 dark:bg-muted text-violet-600 dark:text-violet-400" };
    case "specialMenu":
      return { label: "Push", className: "bg-gray-100 dark:bg-muted text-orange-600 dark:text-orange-400" };
    default:
      return { label: "Swipe Card", className: "bg-gray-100 dark:bg-muted text-indigo-600 dark:text-indigo-400" };
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

function getCampaignMetrics(campaign: CampaignRecord) {
  const impressions = Math.max(0, campaign.impressions ?? 0);
  const clicks = Math.max(0, campaign.clicks ?? 0);
  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : "0.0";
  const dailyBudget = Math.max(0, campaign.dailyBudget ?? 0);
  const totalBudget = Math.max(dailyBudget, campaign.totalBudget ?? 0);
  const spent = Math.max(0, Math.min(totalBudget, campaign.spent ?? 0));
  const remaining = totalBudget - spent;
  const spentPct = totalBudget > 0 ? Math.min(100, Math.round((spent / totalBudget) * 100)) : 0;
  return { impressions, clicks, ctr, dailyBudget, totalBudget, spent, remaining, spentPct };
}

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

const kpiCards = [
  {
    label: "Total Impressions",
    value: "248K",
    icon: Eye,
    iconColor: "text-indigo-500",
    gradient: "linear-gradient(135deg, hsl(230,50%,92%) 0%, hsl(240,45%,85%) 100%)",
  },
  {
    label: "Total Clicks",
    value: "12.4K",
    icon: MousePointerClick,
    iconColor: "text-cyan-500",
    gradient: "linear-gradient(135deg, hsl(185,50%,92%) 0%, hsl(195,45%,85%) 100%)",
  },
  {
    label: "Avg CTR",
    value: "5.0%",
    icon: TrendingUp,
    iconColor: "text-violet-500",
    gradient: "linear-gradient(135deg, hsl(260,50%,92%) 0%, hsl(270,45%,85%) 100%)",
  },
  {
    label: "Revenue Generated",
    value: "฿847K",
    icon: DollarSign,
    iconColor: "text-emerald-500",
    gradient: "linear-gradient(135deg, hsl(155,50%,92%) 0%, hsl(165,45%,85%) 100%)",
  },
];

export default function AdminCampaigns() {
  const [activeTab, setActiveTab] = useState<string>("All");
  const [search, setSearch] = useState("");

  const { data: campaigns = [], isLoading } = useQuery<CampaignRecord[]>({
    queryKey: ["/api/campaigns"],
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: number; updates: Partial<CampaignRecord> }) =>
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-semibold text-foreground" data-testid="text-campaigns-title">
            Ad Platform Manager
          </h2>
          <span className="bg-foreground text-white text-xs font-medium rounded-full px-3 py-0.5">
            {campaigns.length}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64 rounded-xl border-gray-200 dark:border-border focus:ring-foreground/20 focus:border-foreground"
            data-testid="input-search-campaigns"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-campaign-kpis">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6"
            data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-muted"
                style={{ background: kpi.gradient }}
              >
                <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-100 dark:bg-muted rounded-xl p-1 inline-flex gap-1 flex-wrap">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab
                ? "bg-white dark:bg-card text-foreground shadow-sm"
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
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-8 text-center">
          <p className="text-muted-foreground" data-testid="text-no-campaigns">
            No campaigns found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((campaign) => {
            const adType = getAdType(campaign.dealType);
            const placement = getPlacement(campaign.dealType);
            const metrics = getCampaignMetrics(campaign);

            return (
              <div
                key={campaign.id}
                className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6"
                data-testid={`card-campaign-${campaign.id}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-semibold text-base text-foreground"
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
                        className="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium border border-gray-200 dark:border-border text-muted-foreground"
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
                        <span className="font-semibold text-foreground">{formatNum(metrics.impressions)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MousePointerClick className="w-3.5 h-3.5 text-cyan-500" />
                        <span className="text-muted-foreground">Clicks</span>
                        <span className="font-semibold text-foreground">{formatNum(metrics.clicks)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-muted-foreground">CTR</span>
                        <span className="font-semibold text-foreground">{metrics.ctr}%</span>
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
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${metrics.spentPct}%`,
                            background: metrics.spentPct > 80 ? "hsl(350, 89%, 60%)" : "linear-gradient(90deg, hsl(222, 47%, 20%), hsl(222, 47%, 35%))",
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
                            className="bg-gray-100 dark:bg-muted text-foreground rounded-full text-xs px-3 py-1 font-medium"
                            data-testid={`pill-target-${campaign.id}-${idx}`}
                          >
                            {group}
                          </span>
                        ))
                      }
                      <span
                        className="bg-gray-100 dark:bg-muted text-foreground rounded-full text-xs px-3 py-1 font-medium flex items-center gap-1"
                        data-testid={`pill-age-${campaign.id}`}
                      >
                        <Target className="w-3 h-3" />
                        Age 25-44
                      </span>
                      <span
                        className="bg-gray-100 dark:bg-muted text-foreground rounded-full text-xs px-3 py-1 font-medium flex items-center gap-1"
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
                        className="inline-flex items-center gap-1 bg-foreground hover:bg-foreground/90 text-white text-sm font-medium rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50"
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
                        className="inline-flex items-center gap-1 border border-gray-200 dark:border-border text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-muted text-sm font-medium rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50"
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
                        className="inline-flex items-center gap-1 border border-gray-200 dark:border-border text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-muted text-sm font-medium rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50"
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
                        className="inline-flex items-center gap-1 border border-gray-200 dark:border-border text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-muted text-sm font-medium rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50"
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
    </div>
  );
}
