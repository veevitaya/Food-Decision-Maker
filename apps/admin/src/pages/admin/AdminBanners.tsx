import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdBanner } from "@shared/schema";
import {
  Plus, Pencil, Trash2, X, Eye, MousePointer, Image,
  DollarSign, Target, BarChart3, Layers, Calendar, Zap,
  ShoppingCart, TrendingUp,
} from "lucide-react";

const positions = [
  { value: "home_top", label: "Home Top" },
  { value: "home_bottom", label: "Home Bottom" },
  { value: "swipe_between", label: "Swipe Between" },
  { value: "detail_bottom", label: "Detail Bottom" },
  { value: "search_results", label: "Search Results" },
  { value: "map_overlay", label: "Map Overlay" },
  { value: "notification_tray", label: "Notification Tray" },
];

const adFormats = [
  { value: "display_banner", label: "Display Banner" },
  { value: "swipe_card", label: "Swipe Card" },
  { value: "interstitial", label: "Interstitial" },
  { value: "native_feed", label: "Native Feed" },
];

const ctaTypes = [
  { value: "order_now", label: "Order Now" },
  { value: "learn_more", label: "Learn More" },
  { value: "visit_restaurant", label: "Visit Restaurant" },
  { value: "get_deal", label: "Get Deal" },
];

const bidTypes = [
  { value: "cpc", label: "CPC (Cost per Click)" },
  { value: "cpm", label: "CPM (Cost per 1K Impressions)" },
];

const ageRanges = [
  { value: "18-24", label: "18-24" },
  { value: "25-34", label: "25-34" },
  { value: "35-44", label: "35-44" },
  { value: "45-54", label: "45-54" },
  { value: "55+", label: "55+" },
  { value: "all", label: "All Ages" },
];

const genderOptions = ["Male", "Female", "Other"];
const userTypeOptions = ["Solo Diners", "Couples", "Friends Group", "Families", "Coworkers"];
const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface BannerFormData {
  title: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  adFormat: string;
  ctaType: string;
  ageRange: string;
  genderTargeting: string[];
  userTypeTargeting: string[];
  frequencyCap: string;
  scheduleDays: string[];
  dailyBudget: string;
  totalBudget: string;
  bidType: string;
  variantName: string;
  abVariant: "A" | "B";
}

const emptyForm: BannerFormData = {
  title: "",
  imageUrl: "",
  linkUrl: "",
  position: "home_top",
  isActive: true,
  startDate: "",
  endDate: "",
  adFormat: "display_banner",
  ctaType: "order_now",
  ageRange: "all",
  genderTargeting: [],
  userTypeTargeting: [],
  frequencyCap: "3",
  scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  dailyBudget: "",
  totalBudget: "",
  bidType: "cpc",
  variantName: "",
  abVariant: "A",
};

function getMockPerformance(bannerId: number) {
  const seed = bannerId * 7 + 3;
  const impressions = 2000 + (seed * 137) % 15000;
  const clicks = Math.round(impressions * (0.02 + (seed % 8) * 0.005));
  const conversions = Math.round(clicks * (0.08 + (seed % 5) * 0.03));
  const revenue = conversions * (120 + (seed % 10) * 35);
  const dailyBudget = 500 + (seed % 5) * 200;
  const totalBudget = dailyBudget * 30;
  const spent = Math.round(totalBudget * (0.3 + (seed % 6) * 0.1));
  const format = adFormats[seed % adFormats.length].value;
  const variant = seed % 3 === 0 ? "B" : "A";
  const targeting = {
    age: ageRanges[seed % (ageRanges.length - 1)].label,
    gender: seed % 2 === 0 ? "All" : "Female",
    userType: userTypeOptions[seed % userTypeOptions.length],
  };
  return { impressions, clicks, conversions, revenue, dailyBudget, totalBudget, spent, format, variant, targeting };
}

const formatBadgeColors: Record<string, { bg: string; text: string }> = {
  display_banner: { bg: "bg-gray-100", text: "text-indigo-600" },
  swipe_card: { bg: "bg-gray-100", text: "text-cyan-600" },
  interstitial: { bg: "bg-gray-100", text: "text-violet-600" },
  native_feed: { bg: "bg-gray-100", text: "text-muted-foreground" },
};

const formatLabels: Record<string, string> = {
  display_banner: "Display",
  swipe_card: "Swipe Card",
  interstitial: "Interstitial",
  native_feed: "Native Feed",
};

export default function AdminBanners() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BannerFormData>(emptyForm);

  const { data: banners = [], isLoading } = useQuery<AdBanner[]>({
    queryKey: ["/api/banners"],
  });

  const createMutation = useMutation({
    mutationFn: (data: BannerFormData) =>
      apiRequest("POST", "/api/admin/banners", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: number; data: Partial<BannerFormData> }) =>
      apiRequest("PATCH", `/api/admin/banners/${args.id}`, args.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
    },
  });

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function openEdit(banner: AdBanner) {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || "",
      position: banner.position || "home_top",
      isActive: banner.isActive ?? true,
      startDate: banner.startDate || "",
      endDate: banner.endDate || "",
      adFormat: "display_banner",
      ctaType: "order_now",
      ageRange: "all",
      genderTargeting: [],
      userTypeTargeting: [],
      frequencyCap: "3",
      scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      dailyBudget: "",
      totalBudget: "",
      bidType: "cpc",
      variantName: "",
      abVariant: "A",
    });
    setShowForm(true);
  }

  function handleSubmit() {
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function toggleArrayItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div data-testid="admin-banners-page" className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-blue-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800" data-testid="text-banners-title">
              Ad Creative Manager
            </h2>
            <p className="text-sm text-muted-foreground">{banners.length} total creatives</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-1.5 bg-[#FFCC02] hover:bg-[#FFCC02]/90 text-gray-900 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
          data-testid="button-create-banner"
        >
          <Plus className="w-4 h-4" />
          Create Creative
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6" data-testid="banner-form-panel">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-[15px] font-semibold text-gray-800">
              {editingId !== null ? "Edit Creative" : "New Creative"}
            </h3>
            <Button
              size="icon"
              variant="ghost"
              onClick={resetForm}
              data-testid="button-close-form"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-gray-800 text-sm font-medium">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Banner title"
                className="rounded-xl border-gray-100 focus-visible:ring-[#FFCC02]/30"
                data-testid="input-banner-title"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-800 text-sm font-medium">Image URL</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://..."
                className="rounded-xl border-gray-100 focus-visible:ring-[#FFCC02]/30"
                data-testid="input-banner-image"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-800 text-sm font-medium">Link URL</Label>
              <Input
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="https://..."
                className="rounded-xl border-gray-100 focus-visible:ring-[#FFCC02]/30"
                data-testid="input-banner-link"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-800 text-sm font-medium">Position</Label>
              <Select
                value={form.position}
                onValueChange={(val) => setForm({ ...form, position: val })}
              >
                <SelectTrigger className="rounded-xl border-gray-100" data-testid="select-banner-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-800 text-sm font-medium">Ad Format</Label>
              <Select
                value={form.adFormat}
                onValueChange={(val) => setForm({ ...form, adFormat: val })}
              >
                <SelectTrigger className="rounded-xl border-gray-100" data-testid="select-ad-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adFormats.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-800 text-sm font-medium">CTA Type</Label>
              <Select
                value={form.ctaType}
                onValueChange={(val) => setForm({ ...form, ctaType: val })}
              >
                <SelectTrigger className="rounded-xl border-gray-100" data-testid="select-cta-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ctaTypes.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-800 text-sm font-medium">Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="rounded-xl border-gray-100 focus-visible:ring-[#FFCC02]/30"
                data-testid="input-banner-start"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-800 text-sm font-medium">End Date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="rounded-xl border-gray-100 focus-visible:ring-[#FFCC02]/30"
                data-testid="input-banner-end"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-gray-800">Targeting</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-medium">Age Range</Label>
                <Select
                  value={form.ageRange}
                  onValueChange={(val) => setForm({ ...form, ageRange: val })}
                >
                  <SelectTrigger className="rounded-xl border-gray-100" data-testid="select-age-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ageRanges.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-medium">Gender</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {genderOptions.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm({ ...form, genderTargeting: toggleArrayItem(form.genderTargeting, g) })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        form.genderTargeting.includes(g)
                          ? "bg-[#FFCC02] text-gray-900"
                          : "bg-gray-100 text-muted-foreground"
                      }`}
                      data-testid={`button-gender-${g.toLowerCase()}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-medium">User Type</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {userTypeOptions.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setForm({ ...form, userTypeTargeting: toggleArrayItem(form.userTypeTargeting, u) })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        form.userTypeTargeting.includes(u)
                          ? "bg-[#FFCC02] text-gray-900"
                          : "bg-gray-100 text-muted-foreground"
                      }`}
                      data-testid={`button-usertype-${u.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-gray-800">Scheduling</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-medium">Frequency Cap (impressions/user/day)</Label>
                <Input
                  type="number"
                  value={form.frequencyCap}
                  onChange={(e) => setForm({ ...form, frequencyCap: e.target.value })}
                  placeholder="3"
                  className="rounded-xl border-gray-100 focus-visible:ring-[#FFCC02]/30"
                  data-testid="input-frequency-cap"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-medium">Active Days</Label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {daysOfWeek.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm({ ...form, scheduleDays: toggleArrayItem(form.scheduleDays, d) })}
                      className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${
                        form.scheduleDays.includes(d)
                          ? "bg-[#FFCC02] text-gray-900"
                          : "bg-gray-100 text-muted-foreground"
                      }`}
                      data-testid={`button-day-${d.toLowerCase()}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-green-500" />
              <h4 className="text-sm font-semibold text-gray-800">Budget</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-medium">Daily Budget (THB)</Label>
                <Input
                  type="number"
                  value={form.dailyBudget}
                  onChange={(e) => setForm({ ...form, dailyBudget: e.target.value })}
                  placeholder="500"
                  className="rounded-xl border-gray-100 focus-visible:ring-[#FFCC02]/30"
                  data-testid="input-daily-budget"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-medium">Total Budget (THB)</Label>
                <Input
                  type="number"
                  value={form.totalBudget}
                  onChange={(e) => setForm({ ...form, totalBudget: e.target.value })}
                  placeholder="15000"
                  className="rounded-xl border-gray-100 focus-visible:ring-[#FFCC02]/30"
                  data-testid="input-total-budget"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-medium">Bid Type</Label>
                <Select
                  value={form.bidType}
                  onValueChange={(val) => setForm({ ...form, bidType: val })}
                >
                  <SelectTrigger className="rounded-xl border-gray-100" data-testid="select-bid-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bidTypes.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-[#FFCC02]" />
              <h4 className="text-sm font-semibold text-gray-800">A/B Testing</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-medium">Variant Name</Label>
                <Input
                  value={form.variantName}
                  onChange={(e) => setForm({ ...form, variantName: e.target.value })}
                  placeholder="e.g. Hero Image v2"
                  className="rounded-xl border-gray-100 focus-visible:ring-[#FFCC02]/30"
                  data-testid="input-variant-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-medium">Variant</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, abVariant: "A" })}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                      form.abVariant === "A"
                        ? "bg-[#FFCC02] text-gray-900"
                        : "bg-gray-100 text-muted-foreground"
                    }`}
                    data-testid="button-variant-a"
                  >
                    Variant A
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, abVariant: "B" })}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                      form.abVariant === "B"
                        ? "bg-[#FFCC02] text-gray-900"
                        : "bg-gray-100 text-muted-foreground"
                    }`}
                    data-testid="button-variant-b"
                  >
                    Variant B
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-gray-100 pt-5">
            <Switch
              checked={form.isActive}
              onCheckedChange={(val) => setForm({ ...form, isActive: val })}
              data-testid="switch-banner-active"
            />
            <Label className="text-sm text-foreground">Active</Label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isPending || !form.title || !form.imageUrl}
            className="inline-flex items-center bg-[#FFCC02] hover:bg-[#FFCC02]/90 text-gray-900 rounded-xl px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-save-banner"
          >
            {isPending ? "Saving..." : editingId !== null ? "Update" : "Create"}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <Layers className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground" data-testid="text-no-banners">
            No creatives yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => {
            const mock = getMockPerformance(banner.id);
            const ctr =
              banner.impressions && banner.impressions > 0
                ? ((banner.clicks || 0) / banner.impressions * 100).toFixed(1)
                : ((mock.clicks / mock.impressions) * 100).toFixed(1);
            const spentPct = Math.min(100, Math.round((mock.spent / mock.totalBudget) * 100));
            const fmtColors = formatBadgeColors[mock.format] || formatBadgeColors.display_banner;

            return (
              <div
                key={banner.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible"
                data-testid={`card-banner-${banner.id}`}
              >
                {banner.imageUrl && (
                  <div className="aspect-video rounded-t-2xl overflow-hidden bg-gray-50 relative">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      data-testid={`img-banner-${banner.id}`}
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${fmtColors.bg} ${fmtColors.text}`}
                        data-testid={`badge-format-${banner.id}`}
                      >
                        {formatLabels[mock.format] || "Display"}
                      </span>
                      {mock.variant === "B" && (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-gray-100 text-muted-foreground"
                          data-testid={`badge-variant-${banner.id}`}
                        >
                          A/B
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h3
                        className="font-semibold text-foreground"
                        data-testid={`text-banner-title-${banner.id}`}
                      >
                        {banner.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {positions.find((p) => p.value === banner.position)?.label ||
                          banner.position}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        banner.isActive
                          ? "bg-[#00B14F]/10 text-[#00B14F]"
                          : "bg-gray-100 text-gray-500"
                      }`}
                      data-testid={`badge-banner-status-${banner.id}`}
                    >
                      {banner.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center" data-testid={`stats-row-${banner.id}`}>
                    <div className="bg-gray-50 rounded-xl py-2 px-1">
                      <Eye className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
                      <p className="text-xs font-semibold text-foreground">
                        {mock.impressions.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Views</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl py-2 px-1">
                      <MousePointer className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
                      <p className="text-xs font-semibold text-foreground">
                        {mock.clicks.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Clicks</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl py-2 px-1">
                      <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
                      <p className="text-xs font-semibold text-foreground">
                        {mock.conversions}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Conv.</p>
                    </div>
                    <div className="bg-[#FFCC02]/15 rounded-xl py-2 px-1">
                      <TrendingUp className="w-3.5 h-3.5 text-foreground mx-auto mb-0.5" />
                      <p className="text-xs font-semibold text-foreground">
                        {ctr}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">CTR</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`revenue-${banner.id}`}>
                    <DollarSign className="w-3 h-3 text-green-500" />
                    <span>Revenue: </span>
                    <span className="font-semibold text-foreground">
                      {mock.revenue.toLocaleString()} THB
                    </span>
                  </div>

                  <div data-testid={`budget-bar-${banner.id}`}>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Budget: {mock.spent.toLocaleString()} / {mock.totalBudget.toLocaleString()} THB</span>
                      <span className="font-medium">{spentPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${spentPct}%`,
                          backgroundColor: spentPct > 80
                            ? "hsl(350, 89%, 60%)"
                            : "var(--admin-blue)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap" data-testid={`targeting-pills-${banner.id}`}>
                    <span className="inline-flex items-center rounded-full bg-gray-100 text-foreground px-2.5 py-0.5 text-[10px] font-medium">
                      Age {mock.targeting.age}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-gray-100 text-foreground px-2.5 py-0.5 text-[10px] font-medium">
                      {mock.targeting.gender}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-gray-100 text-foreground px-2.5 py-0.5 text-[10px] font-medium">
                      {mock.targeting.userType}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap border-t border-gray-100 pt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(banner)}
                      className="text-muted-foreground"
                      data-testid={`button-edit-banner-${banner.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Delete this banner?")) {
                          deleteMutation.mutate(banner.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-red-400"
                      data-testid={`button-delete-banner-${banner.id}`}
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