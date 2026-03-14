import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UtensilsCrossed, Image, AlertTriangle, Star,
  Search, Clock, CheckCircle, XCircle, Tag, Plus, X, Wand2, Loader2
} from "lucide-react";
import { getTintVar } from "./adminUtils";
import { useToast } from "@/hooks/use-toast";

interface MenuItem {
  id: number;
  restaurantId: number;
  restaurantName: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceApprox: number | null;
  tags: string[];
  dietFlags: string[];
  isActive: boolean;
  isSponsored: boolean;
  createdAt: string;
}

interface MenuStats {
  total: number;
  active: number;
  qualityFlags: {
    missingImages: number;
    noPrice: number;
    missingTags: number;
    noDescription: number;
    staleData: number;
  };
  items: MenuItem[];
}

interface Restaurant {
  id: number;
  name: string;
}

interface MenuGenerateResult {
  restaurantId: number;
  restaurantName: string;
  status: "generated" | "skipped" | "failed";
  reason?: string;
  existingRealCount: number;
  createdCount: number;
  createdItemNames: string[];
  missingImages: number;
}

interface MenuGenerateJob {
  jobId: string;
  status: "running" | "completed" | "failed";
  summary: {
    selected: number;
    processed: number;
    generatedRestaurants: number;
    generatedItems: number;
    skippedRestaurants: number;
    failedRestaurants: number;
  };
  results: MenuGenerateResult[];
  startedAt: string;
  finishedAt?: string;
}

const EMPTY_FORM = {
  restaurantId: "",
  name: "",
  description: "",
  imageUrl: "",
  priceApprox: "",
  tags: "",
  dietFlags: "",
  isActive: true,
  isSponsored: false,
};

export default function AdminMenus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateScope, setGenerateScope] = useState<"all" | "single">("all");
  const [generateRestaurantId, setGenerateRestaurantId] = useState("");
  const [generateForce, setGenerateForce] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateJobId, setGenerateJobId] = useState<string | null>(null);
  const [lastCompletedJobId, setLastCompletedJobId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<MenuStats>({
    queryKey: ["/api/admin/menus/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/menus/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load menu stats");
      return res.json();
    },
  });

  const { data: restaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/admin/restaurants-simple"],
    queryFn: async () => {
      const res = await fetch("/api/admin/restaurants?pageSize=200", { credentials: "include" });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.items ?? json ?? []).map((r: Restaurant) => ({ id: r.id, name: r.name }));
    },
  });

  const createMenu = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to create menu" }));
        throw new Error(err.message ?? "Failed to create menu");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/menus/stats"] });
      setShowModal(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const startGenerateMenus = useMutation({
    mutationFn: async (payload: { restaurantId?: number; force?: boolean }) => {
      const res = await fetch("/api/admin/menus/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to start generation" }));
        throw new Error(err.message ?? "Failed to start generation");
      }
      return res.json() as Promise<{ jobId: string }>;
    },
    onSuccess: (data) => {
      setGenerateError(null);
      setGenerateJobId(data.jobId);
      setLastCompletedJobId(null);
    },
    onError: (err: Error) => {
      setGenerateError(err.message);
      toast({ title: "Generate failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: generateJobData, isFetching: isGenerateJobFetching } = useQuery<MenuGenerateJob>({
    queryKey: ["/api/admin/menus/generate", generateJobId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/menus/generate/${generateJobId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load generation job");
      return res.json();
    },
    enabled: Boolean(generateJobId && showGenerateModal),
    staleTime: 0,
    refetchInterval: (query) => {
      const status = (query.state.data as MenuGenerateJob | undefined)?.status;
      return status === "running" ? 1500 : false;
    },
  });

  useEffect(() => {
    if (!generateJobId || !generateJobData) return;
    if (generateJobData.status === "running") return;
    if (lastCompletedJobId === generateJobId) return;

    setLastCompletedJobId(generateJobId);
    void qc.invalidateQueries({ queryKey: ["/api/admin/menus/stats"] });
    toast({
      title: generateJobData.status === "completed" ? "Menu generation completed" : "Menu generation failed",
      description: `Generated ${generateJobData.summary.generatedItems} items for ${generateJobData.summary.generatedRestaurants} restaurants, skipped ${generateJobData.summary.skippedRestaurants}.`,
      variant: generateJobData.status === "completed" ? "default" : "destructive",
    });
  }, [generateJobData, generateJobId, lastCompletedJobId, qc, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.restaurantId) return setFormError("Please select a restaurant");
    if (!form.name.trim()) return setFormError("Menu item name is required");

    createMenu.mutate({
      restaurantId: Number(form.restaurantId),
      name: form.name.trim(),
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      priceApprox: form.priceApprox ? Number(form.priceApprox) : null,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      dietFlags: form.dietFlags ? form.dietFlags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      isActive: form.isActive,
      isSponsored: form.isSponsored,
    });
  };

  const handleStartGenerate = () => {
    setGenerateError(null);
    if (generateScope === "single") {
      if (!generateRestaurantId) {
        setGenerateError("Please select a restaurant for single generation.");
        return;
      }
      startGenerateMenus.mutate({
        restaurantId: Number(generateRestaurantId),
        force: generateForce,
      });
      return;
    }
    startGenerateMenus.mutate({ force: generateForce });
  };

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.items;
    return data.items.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.restaurantName.toLowerCase().includes(q) ||
        (m.description ?? "").toLowerCase().includes(q) ||
        (m.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  }, [data?.items, searchQuery]);

  const kpis = useMemo(() => {
    if (!data) return [];
    const withImages = data.items.filter((m) => m.imageUrl).length;
    const withPrice = data.items.filter((m) => m.priceApprox != null).length;
    const pctImages = data.total > 0 ? Math.round((withImages / data.total) * 100) : 0;
    const pctActive = data.total > 0 ? Math.round((data.active / data.total) * 100) : 0;
    const avgPrice =
      withPrice > 0
        ? Math.round(data.items.filter((m) => m.priceApprox != null).reduce((s, m) => s + (m.priceApprox ?? 0), 0) / withPrice)
        : 0;
    const sponsored = data.items.filter((m) => m.isSponsored).length;
    return [
      { label: "Total Menus", value: data.total.toLocaleString(), sub: `${pctActive}% active`, icon: UtensilsCrossed, color: "var(--admin-blue)" },
      { label: "With Images", value: `${pctImages}%`, sub: `${withImages} of ${data.total}`, icon: Image, color: "var(--admin-cyan)" },
      { label: "Avg Price", value: avgPrice > 0 ? `฿${avgPrice}` : "—", sub: `${withPrice} priced`, icon: Tag, color: "var(--admin-teal)" },
      { label: "Sponsored", value: sponsored.toLocaleString(), sub: "promoted items", icon: Star, color: "var(--admin-pink)" },
    ];
  }, [data]);

  const qualityRows = useMemo(() => {
    if (!data) return [];
    return [
      { issue: "Missing Images", count: data.qualityFlags.missingImages, color: "#F43F5E" },
      { issue: "No Price Listed", count: data.qualityFlags.noPrice, color: "#F43F5E" },
      { issue: "Missing Tags", count: data.qualityFlags.missingTags, color: "#F59E0B" },
      { issue: "No Description", count: data.qualityFlags.noDescription, color: "#F59E0B" },
      { issue: "Stale Data (>90d)", count: data.qualityFlags.staleData, color: "#8B5CF6" },
    ];
  }, [data]);

  const generateProgressPct = useMemo(() => {
    if (!generateJobData?.summary.selected) return 0;
    return Math.min(100, Math.round((generateJobData.summary.processed / generateJobData.summary.selected) * 100));
  }, [generateJobData]);

  if (isLoading) {
    return (
      <div className="space-y-8" data-testid="admin-menus-page">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="w-5 h-5 text-gray-400 animate-pulse" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Menus</h2>
            <p className="text-xs text-muted-foreground">Loading menu data…</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="admin-menus-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="w-5 h-5" style={{ color: "var(--admin-blue)" }} />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Menus</h2>
            <p className="text-xs text-muted-foreground">Menu quality checks and item explorer</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search menus…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              data-testid="input-search-menus"
            />
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            data-testid="button-generate-menus"
          >
            <Wand2 className="w-4 h-4" />
            Generate Menus
          </button>
          <button
            onClick={() => { setShowModal(true); setFormError(null); setForm(EMPTY_FORM); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--admin-blue)" }}
            data-testid="button-add-menu"
          >
            <Plus className="w-4 h-4" />
            Add Menu
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="h-[3px]" style={{ backgroundColor: kpi.color }} />
            <div className="p-4 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: getTintVar(kpi.color) }}>
                  <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</p>
              <p className="text-[11px] text-gray-400 mt-1">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quality Flags + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-quality-flags">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-pink)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Quality Flags</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Items needing attention</p>
          </div>
          <div className="space-y-3">
            {qualityRows.map((f) => (
              <div key={f.issue} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.color }} />
                <span className="flex-1 text-sm text-gray-700">{f.issue}</span>
                <span className="text-sm font-semibold text-gray-800">{f.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <span className="text-xs text-gray-400">
              Total flagged: {qualityRows.reduce((s, f) => s + f.count, 0).toLocaleString()} items
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-active-breakdown">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-teal)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Status Breakdown</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Active vs inactive items</p>
          </div>
          {data && (
            <div className="space-y-4">
              {[
                { label: "Active", count: data.active, color: "#10B981", icon: CheckCircle },
                { label: "Inactive", count: data.total - data.active, color: "#94A3B8", icon: XCircle },
                { label: "Sponsored", count: data.items.filter((m) => m.isSponsored).length, color: "var(--admin-pink)", icon: Star },
                { label: "Has Image", count: data.items.filter((m) => m.imageUrl).length, color: "var(--admin-cyan)", icon: Image },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <row.icon className="w-4 h-4 flex-shrink-0" style={{ color: row.color }} />
                  <span className="w-20 text-xs text-gray-600 font-medium">{row.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: data.total > 0 ? `${(row.count / data.total) * 100}%` : "0%",
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold text-gray-700">{row.count}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 justify-center">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-[11px] text-gray-400">
              {data ? `${data.total} total menu items across all restaurants` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-menu-items">
        <div className="flex items-center justify-between mb-5">
          <div className="border-l-[3px] pl-3" style={{ borderColor: "var(--admin-blue)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">All Menu Items</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              {searchQuery ? `${filteredItems.length} results` : `${data?.total ?? 0} total`}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                {["Menu Item", "Restaurant", "Price", "Tags", "Status", "Added"].map((h) => (
                  <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.slice(0, 100).map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      {m.imageUrl ? (
                        <img src={m.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Image className="w-3.5 h-3.5 text-gray-300" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{m.name}</p>
                        {m.description && (
                          <p className="text-[10px] text-gray-400 line-clamp-1 max-w-[160px]">{m.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-gray-500">{m.restaurantName}</td>
                  <td className="py-2.5 px-3 text-gray-700">
                    {m.priceApprox != null ? `฿${m.priceApprox}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {(m.tags ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-blue-50 text-blue-600">{tag}</span>
                      ))}
                      {(m.tags ?? []).length === 0 && <span className="text-gray-300 text-[10px]">no tags</span>}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${m.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                        {m.isActive ? "Active" : "Inactive"}
                      </span>
                      {m.isSponsored && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-pink-50 text-pink-600">Sponsored</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-gray-400">
                    {new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    {searchQuery ? `No menus matching "${searchQuery}"` : "No menu items found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredItems.length > 100 && (
            <p className="text-center text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
              Showing first 100 of {filteredItems.length} results — use search to filter
            </p>
          )}
        </div>
      </div>

      {/* Generate Menus Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4" style={{ color: "var(--admin-blue)" }} />
                <h3 className="text-[15px] font-semibold text-gray-800">Generate Menus</h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                data-testid="button-close-generate-modal"
              >
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>

            {!generateJobId ? (
              <div className="px-6 py-5 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Scope</p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        checked={generateScope === "all"}
                        onChange={() => setGenerateScope("all")}
                        data-testid="radio-generate-all"
                      />
                      All restaurants
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        checked={generateScope === "single"}
                        onChange={() => setGenerateScope("single")}
                        data-testid="radio-generate-single"
                      />
                      Single restaurant
                    </label>
                  </div>
                </div>

                {generateScope === "single" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Restaurant</label>
                    <select
                      value={generateRestaurantId}
                      onChange={(e) => setGenerateRestaurantId(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      data-testid="select-generate-restaurant"
                    >
                      <option value="">Select restaurant...</option>
                      {restaurants.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={generateForce}
                    onChange={(e) => setGenerateForce(e.target.checked)}
                    data-testid="checkbox-generate-force"
                  />
                  Force regenerate even if restaurant has 3+ real active menu items
                </label>

                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
                  Default behavior skips restaurants that already have enough real menu coverage.
                </div>

                {generateError && (
                  <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{generateError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartGenerate}
                    disabled={startGenerateMenus.isPending}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
                    style={{ backgroundColor: "var(--admin-blue)" }}
                    data-testid="button-start-generate"
                  >
                    {startGenerateMenus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {startGenerateMenus.isPending ? "Starting..." : "Start Generation"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-gray-700">
                    Job <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{generateJobId}</span>
                  </p>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      generateJobData?.status === "running"
                        ? "bg-blue-50 text-blue-700"
                        : generateJobData?.status === "completed"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {generateJobData?.status ?? "loading"}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Progress</span>
                    <span>
                      {generateJobData?.summary.processed ?? 0} / {generateJobData?.summary.selected ?? 0}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${generateProgressPct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="rounded-xl border border-gray-100 px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Generated Items</p>
                    <p className="text-lg font-semibold text-gray-800">{generateJobData?.summary.generatedItems ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Restaurants</p>
                    <p className="text-lg font-semibold text-gray-800">{generateJobData?.summary.generatedRestaurants ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Skipped</p>
                    <p className="text-lg font-semibold text-gray-800">{generateJobData?.summary.skippedRestaurants ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Failed</p>
                    <p className="text-lg font-semibold text-gray-800">{generateJobData?.summary.failedRestaurants ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Status</p>
                    <p className="text-sm font-semibold text-gray-800">{generateJobData?.status ?? "loading"}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="max-h-[280px] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2">Restaurant</th>
                          <th className="text-left px-3 py-2">Status</th>
                          <th className="text-left px-3 py-2">Created</th>
                          <th className="text-left px-3 py-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(generateJobData?.results ?? []).map((row) => (
                          <tr key={`${row.restaurantId}-${row.status}-${row.createdCount}`} className="border-t border-gray-100">
                            <td className="px-3 py-2">{row.restaurantName}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  row.status === "generated"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : row.status === "skipped"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-red-50 text-red-700"
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="px-3 py-2">{row.createdCount}</td>
                            <td className="px-3 py-2 text-gray-500">{row.reason ?? "—"}</td>
                          </tr>
                        ))}
                        {!generateJobData?.results?.length && (
                          <tr>
                            <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                              {isGenerateJobFetching ? "Loading job..." : "No restaurant results yet"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGenerateJobId(null);
                      setGenerateError(null);
                      setLastCompletedJobId(null);
                    }}
                    disabled={generateJobData?.status === "running"}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: "var(--admin-blue)" }}
                    data-testid="button-generate-run-again"
                  >
                    {generateJobData?.status === "running" ? "Generation in progress..." : "Run Again"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Menu Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4" style={{ color: "var(--admin-blue)" }} />
                <h3 className="text-[15px] font-semibold text-gray-800">Add Menu Item</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                data-testid="button-close-modal"
              >
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Restaurant */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Restaurant *</label>
                <select
                  value={form.restaurantId}
                  onChange={(e) => setForm((f) => ({ ...f, restaurantId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  data-testid="select-restaurant"
                >
                  <option value="">Select a restaurant…</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Pad Thai Goong Sod"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  data-testid="input-menu-name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                <textarea
                  placeholder="Short description of the dish…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 resize-none"
                  data-testid="input-menu-description"
                />
              </div>

              {/* Image URL + Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Image URL</label>
                  <input
                    type="url"
                    placeholder="https://…"
                    value={form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    data-testid="input-menu-image"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Price (฿)</label>
                  <input
                    type="number"
                    placeholder="e.g. 150"
                    value={form.priceApprox}
                    onChange={(e) => setForm((f) => ({ ...f, priceApprox: e.target.value }))}
                    min={0}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    data-testid="input-menu-price"
                  />
                </div>
              </div>

              {/* Tags + Diet Flags */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tags</label>
                  <input
                    type="text"
                    placeholder="spicy, noodles, popular"
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    data-testid="input-menu-tags"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Comma-separated</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Diet Flags</label>
                  <input
                    type="text"
                    placeholder="vegan, halal, gluten-free"
                    value={form.dietFlags}
                    onChange={(e) => setForm((f) => ({ ...f, dietFlags: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    data-testid="input-menu-diet-flags"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Comma-separated</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded"
                    data-testid="checkbox-is-active"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isSponsored}
                    onChange={(e) => setForm((f) => ({ ...f, isSponsored: e.target.checked }))}
                    className="w-4 h-4 rounded"
                    data-testid="checkbox-is-sponsored"
                  />
                  <span className="text-sm text-gray-700">Sponsored</span>
                </label>
              </div>

              {formError && (
                <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMenu.isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: "var(--admin-blue)" }}
                  data-testid="button-submit-menu"
                >
                  {createMenu.isPending ? "Saving…" : "Add Menu Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
