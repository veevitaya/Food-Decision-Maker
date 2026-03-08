import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Campaign } from "@shared/schema";
import {
  Calendar,
  CheckCircle,
  DollarSign,
  Eye,
  MapPin,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  Search,
  StopCircle,
  Target,
  Trash2,
  TrendingUp,
  User,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const statusTabs = ["All", "Draft", "Active", "Paused", "Ended"] as const;
const pageSizes = [10, 25, 50] as const;

type CampaignStatus = "draft" | "active" | "paused" | "ended";
type CampaignQueryStatus = CampaignStatus | "All";

type CampaignListResponse = {
  items: Campaign[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    impressions: number;
    clicks: number;
    ctrPct: number;
    spent: number;
  };
};

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

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
}

export default function AdminCampaigns() {
  const [activeTab, setActiveTab] = useState<CampaignQueryStatus>("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newOwnerKey, setNewOwnerKey] = useState("owner_default");
  const [newDailyBudget, setNewDailyBudget] = useState("1000");

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, pageSize]);

  const campaignsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (activeTab !== "All") params.set("status", activeTab.toLowerCase());
    if (search.trim()) params.set("search", search.trim());
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return `/api/admin/campaigns?${params.toString()}`;
  }, [activeTab, search, page, pageSize]);

  const { data, isLoading } = useQuery<CampaignListResponse>({ queryKey: [campaignsUrl] });
  const campaigns = data?.items ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/campaigns", {
        title: newTitle.trim(),
        restaurantOwnerKey: newOwnerKey.trim(),
        status: "draft",
        dailyBudget: Math.max(0, Number(newDailyBudget) || 0),
        totalBudget: Math.max(0, (Number(newDailyBudget) || 0) * 30),
        spent: 0,
        impressions: 0,
        clicks: 0,
        targetGroups: [],
      });
    },
    onSuccess: () => {
      setNewTitle("");
      setNewOwnerKey("owner_default");
      setNewDailyBudget("1000");
      setShowCreate(false);
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (args: { id: number; updates: Partial<Campaign> }) => {
      await apiRequest("PATCH", `/api/admin/campaigns/${args.id}`, args.updates);
    },
    onSuccess: invalidate,
  });

  const publishMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/campaigns/${id}/publish`);
    },
    onSuccess: invalidate,
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/campaigns/${id}/archive`);
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/campaigns/${id}`);
    },
    onSuccess: invalidate,
  });

  const kpis = useMemo(() => {
    const impressions = data?.summary.impressions ?? 0;
    const clicks = data?.summary.clicks ?? 0;
    const ctrPct = data?.summary.ctrPct ?? 0;
    const spent = data?.summary.spent ?? 0;
    return [
      { label: "Total Impressions", value: formatNum(impressions), icon: Eye, iconColor: "text-purple-500" },
      { label: "Total Clicks", value: formatNum(clicks), icon: MousePointerClick, iconColor: "text-teal-500" },
      { label: "Avg CTR", value: `${ctrPct.toFixed(1)}%`, icon: TrendingUp, iconColor: "text-blue-500" },
      { label: "Spend", value: `THB ${formatNum(spent)}`, icon: DollarSign, iconColor: "text-emerald-500" },
    ];
  }, [data]);

  const isBusy = updateMutation.isPending || publishMutation.isPending || archiveMutation.isPending || deleteMutation.isPending || createMutation.isPending;
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? page;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

  return (
    <div data-testid="admin-campaigns-page" className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-semibold text-foreground" data-testid="text-campaigns-title">Ad Platform Manager</h2>
          <span className="bg-foreground text-white text-xs font-medium rounded-full px-3 py-0.5">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64 rounded-xl border-gray-200 dark:border-border" data-testid="input-search-campaigns" />
          </div>
          <Button onClick={() => setShowCreate((v) => !v)} data-testid="button-toggle-create-campaign">
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Campaign title" data-testid="input-create-campaign-title" />
          <Input value={newOwnerKey} onChange={(e) => setNewOwnerKey(e.target.value)} placeholder="Owner key" data-testid="input-create-campaign-owner" />
          <Input value={newDailyBudget} onChange={(e) => setNewDailyBudget(e.target.value)} type="number" min={0} placeholder="Daily budget" data-testid="input-create-campaign-budget" />
          <Button disabled={!newTitle.trim() || !newOwnerKey.trim() || createMutation.isPending} onClick={() => createMutation.mutate()} data-testid="button-create-campaign">Create Draft</Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-campaign-kpis">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="flex items-center gap-3">
              <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="bg-gray-100 dark:bg-muted rounded-xl p-1 inline-flex gap-1 flex-wrap">
          {statusTabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === tab ? "bg-white dark:bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} data-testid={`tab-${tab.toLowerCase()}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Rows</span>
          {pageSizes.map((size) => (
            <button key={size} onClick={() => setPageSize(size)} className={`px-2 py-1 rounded-md ${pageSize === size ? "bg-foreground text-white" : "bg-gray-100 dark:bg-muted"}`} data-testid={`button-page-size-${size}`}>
              {size}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-8 text-center">
          <p className="text-muted-foreground" data-testid="text-no-campaigns">No campaigns found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const adType = getAdType(campaign.dealType);
            const placement = getPlacement(campaign.dealType);
            const impressions = campaign.impressions ?? 0;
            const clicks = campaign.clicks ?? 0;
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : "0.0";
            const dailyBudget = campaign.dailyBudget ?? 0;
            const totalBudget = campaign.totalBudget ?? 0;
            const spent = campaign.spent ?? 0;
            const spentPct = totalBudget > 0 ? Math.min(100, Math.round((spent / totalBudget) * 100)) : 0;

            return (
              <div key={campaign.id} className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid={`card-campaign-${campaign.id}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base text-foreground" data-testid={`text-campaign-title-${campaign.id}`}>{campaign.title}</span>
                      <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${statusPill(campaign.status)}`} data-testid={`badge-status-${campaign.id}`}>{campaign.status}</span>
                      <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${adType.className}`} data-testid={`badge-adtype-${campaign.id}`}>{adType.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid={`text-placement-${campaign.id}`}>
                      <MapPin className="w-3 h-3" />
                      Placement: {placement}
                    </div>

                    <div className="flex items-center gap-5 text-xs flex-wrap" data-testid={`metrics-row-${campaign.id}`}>
                      <div className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-indigo-500" /><span className="text-muted-foreground">Impressions</span><span className="font-semibold text-foreground">{formatNum(impressions)}</span></div>
                      <div className="flex items-center gap-1.5"><MousePointerClick className="w-3.5 h-3.5 text-cyan-500" /><span className="text-muted-foreground">Clicks</span><span className="font-semibold text-foreground">{formatNum(clicks)}</span></div>
                      <div className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /><span className="text-muted-foreground">CTR</span><span className="font-semibold text-foreground">{ctr}%</span></div>
                    </div>

                    <div className="space-y-1" data-testid={`budget-info-${campaign.id}`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Budget: THB {formatNum(spent)} / THB {formatNum(totalBudget)} <span className="ml-2 text-muted-foreground/60">(THB {formatNum(dailyBudget)}/day)</span></span>
                        <span className="text-muted-foreground">{spentPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${spentPct}%`, background: spentPct > 80 ? "hsl(350, 89%, 60%)" : "linear-gradient(90deg, hsl(222, 47%, 20%), hsl(222, 47%, 35%))" }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground/60 flex-wrap">
                      <span className="flex items-center gap-1" data-testid={`text-owner-${campaign.id}`}><User className="w-3 h-3" />{campaign.restaurantOwnerKey}</span>
                      {campaign.startDate && <span className="flex items-center gap-1" data-testid={`text-dates-${campaign.id}`}><Calendar className="w-3 h-3" />{campaign.startDate}{campaign.endDate ? ` - ${campaign.endDate}` : ""}</span>}
                    </div>

                    <div className="flex gap-1.5 flex-wrap" data-testid={`pills-targets-${campaign.id}`}>
                      {(campaign.targetGroups || []).map((group, idx) => <span key={idx} className="bg-gray-100 dark:bg-muted text-foreground rounded-full text-xs px-3 py-1 font-medium" data-testid={`pill-target-${campaign.id}-${idx}`}>{group}</span>)}
                      <span className="bg-gray-100 dark:bg-muted text-foreground rounded-full text-xs px-3 py-1 font-medium flex items-center gap-1" data-testid={`pill-age-${campaign.id}`}><Target className="w-3 h-3" />Age 25-44</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {campaign.status === "draft" && <button className="inline-flex items-center gap-1 bg-foreground hover:bg-foreground/90 text-white text-sm font-medium rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50" onClick={() => publishMutation.mutate(campaign.id)} disabled={isBusy} data-testid={`button-approve-${campaign.id}`}><CheckCircle className="w-4 h-4" />Approve</button>}
                    {campaign.status === "active" && <button className="inline-flex items-center gap-1 border border-gray-200 dark:border-border text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-muted text-sm font-medium rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50" onClick={() => updateMutation.mutate({ id: campaign.id, updates: { status: "paused" as CampaignStatus } })} disabled={isBusy} data-testid={`button-pause-${campaign.id}`}><Pause className="w-4 h-4" />Pause</button>}
                    {campaign.status === "paused" && <button className="inline-flex items-center gap-1 border border-gray-200 dark:border-border text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-muted text-sm font-medium rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50" onClick={() => updateMutation.mutate({ id: campaign.id, updates: { status: "active" as CampaignStatus } })} disabled={isBusy} data-testid={`button-resume-${campaign.id}`}><Play className="w-4 h-4" />Resume</button>}
                    {(campaign.status === "active" || campaign.status === "paused") && <button className="inline-flex items-center gap-1 border border-gray-200 dark:border-border text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-muted text-sm font-medium rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50" onClick={() => archiveMutation.mutate(campaign.id)} disabled={isBusy} data-testid={`button-end-${campaign.id}`}><StopCircle className="w-4 h-4" />End</button>}
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this campaign?")) deleteMutation.mutate(campaign.id); }} disabled={isBusy} data-testid={`button-delete-${campaign.id}`} className="text-red-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span data-testid="text-pagination-range">Showing {rangeStart}-{rangeEnd} of {total}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))} data-testid="button-page-prev">Previous</Button>
          <span data-testid="text-pagination-page">Page {currentPage} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages || isLoading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} data-testid="button-page-next">Next</Button>
        </div>
      </div>
    </div>
  );
}
