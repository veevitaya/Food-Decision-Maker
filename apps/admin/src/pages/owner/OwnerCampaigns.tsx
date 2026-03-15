import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Megaphone, Eye, MousePointerClick, TrendingUp, Trash2, CheckCircle2, Clock, PauseCircle, ImagePlus } from "lucide-react";
import { getAdminSession } from "../admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      if (!base64) { reject(new Error("Failed to read file")); return; }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

type Campaign = {
  id: number;
  title: string;
  status: string;
  dealType: string | null;
  dealValue: string | null;
  startDate: string | null;
  endDate: string | null;
  impressions: number;
  clicks: number;
  restaurantOwnerKey: string;
};

const dealTypeOptions = [
  { value: "discount", label: "Discount" },
  { value: "bundle", label: "Bundle" },
  { value: "freeItem", label: "Free Item" },
  { value: "happyHour", label: "Happy Hour" },
  { value: "specialMenu", label: "Special Menu" },
];

function statusBadge(status: string) {
  switch (status) {
    case "active": return "bg-green-100 text-green-700";
    case "draft": return "bg-gray-100 text-gray-600";
    case "paused": return "bg-amber-100 text-amber-700";
    case "ended": return "bg-red-100 text-red-600";
    default: return "bg-gray-100 text-gray-600";
  }
}

export default function OwnerCampaigns() {
  const session = getAdminSession();
  const ownerEmail = session?.email;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/owner/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, type: file.type, data: base64 }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setForm((p) => ({ ...p, imageUrl: url }));
      toast({ title: "Image uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const [form, setForm] = useState({
    title: "",
    dealType: "discount",
    dealValue: "",
    imageUrl: "",
    startDate: "",
    endDate: "",
  });

  const { data: allCampaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load campaigns");
      return res.json();
    },
    enabled: Boolean(ownerEmail),
  });

  // Only show campaigns belonging to this owner
  const campaigns = allCampaigns.filter((c) => c.restaurantOwnerKey === ownerEmail);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title,
          dealType: form.dealType,
          dealValue: form.dealValue || null,
          imageUrl: form.imageUrl || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          restaurantOwnerKey: ownerEmail!,
          status: "draft",
          targetGroups: [],
        }),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      return res.json();
    },
    onSuccess: () => {
      setForm({ title: "", dealType: "discount", dealValue: "", imageUrl: "", startDate: "", endDate: "" });
      qc.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign created", description: "Admin will review and approve your campaign." });
    },
    onError: () => toast({ title: "Error", description: "Failed to create campaign.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign deleted" });
    },
  });

  if (!session || session.sessionType !== "owner") {
    return <p className="text-sm text-muted-foreground">Owner access required.</p>;
  }

  return (
    <div className="space-y-6" data-testid="owner-campaigns-page">
      <div className="flex items-center gap-3">
        <Megaphone className="w-5 h-5 text-[var(--admin-blue)]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Campaigns</h2>
          <p className="text-xs text-muted-foreground">Create deals that appear on the app's home page and swipe deck</p>
        </div>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3" data-testid="owner-campaign-form">
        <h3 className="text-sm font-semibold text-gray-800">Create New Campaign</h3>

        <input
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/20"
          placeholder="Campaign title (e.g. Weekend Special)"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          data-testid="input-campaign-title"
        />

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Deal Type</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
              value={form.dealType}
              onChange={(e) => setForm((p) => ({ ...p, dealType: e.target.value }))}
            >
              {dealTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Deal Value</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/20"
              placeholder="e.g. 20% off, Buy 1 Get 1"
              value={form.dealValue}
              onChange={(e) => setForm((p) => ({ ...p, dealValue: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500">Campaign Image <span className="text-muted-foreground">(optional — uses your restaurant photo by default)</span></label>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/20"
              placeholder="Paste URL or upload →"
              value={form.imageUrl}
              onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
            />
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploadingImage}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
          {form.imageUrl && (
            <img src={form.imageUrl} alt="preview" className="h-20 w-auto rounded-xl object-cover border border-gray-100 mt-1" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Start Date</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">End Date</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
            />
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Campaigns start as <span className="font-medium">Draft</span> and go live after admin approves them.
        </p>

        <button
          onClick={() => createMutation.mutate()}
          disabled={!form.title.trim() || createMutation.isPending}
          className="px-4 py-2 rounded-xl bg-[var(--admin-blue)] hover:bg-[var(--admin-blue-90)] text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors"
          data-testid="create-owner-campaign"
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create Campaign
        </button>
      </div>

      {/* Campaign list */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5" data-testid="owner-campaigns-list">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">My Campaigns</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No campaigns yet. Create your first one above.</p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "0.0";
              return (
                <div key={c.id} className="border border-gray-100 rounded-xl p-4" data-testid={`owner-campaign-${c.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">{c.title}</span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadge(c.status)}`}>
                          {c.status === "active" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {c.status === "draft" && <Clock className="w-3 h-3 mr-1" />}
                          {c.status === "paused" && <PauseCircle className="w-3 h-3 mr-1" />}
                          {c.status}
                        </span>
                      </div>
                      {c.dealValue && (
                        <p className="text-xs text-muted-foreground">Deal: {c.dealValue}</p>
                      )}
                      {(c.startDate || c.endDate) && (
                        <p className="text-xs text-muted-foreground">
                          {c.startDate ?? "—"} → {c.endDate ?? "ongoing"}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {c.impressions} impressions</span>
                        <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {c.clicks} clicks</span>
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {ctr}% CTR</span>
                      </div>
                    </div>
                    {c.status === "draft" && (
                      <button
                        onClick={() => { if (confirm("Delete this campaign?")) deleteMutation.mutate(c.id); }}
                        className="text-red-400 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                        data-testid={`delete-campaign-${c.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
