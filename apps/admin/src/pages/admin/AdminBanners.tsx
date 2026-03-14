import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdBanner } from "@shared/schema";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Eye,
  MousePointer,
  Layers,
  Calendar,
  Link as LinkIcon,
} from "lucide-react";

type BannerFormData = {
  title: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

const emptyForm: BannerFormData = {
  title: "",
  imageUrl: "",
  linkUrl: "",
  position: "",
  isActive: true,
  startDate: "",
  endDate: "",
};

function toPayload(form: BannerFormData): BannerFormData {
  return {
    title: form.title.trim(),
    imageUrl: form.imageUrl.trim(),
    linkUrl: form.linkUrl.trim(),
    position: form.position.trim(),
    isActive: form.isActive,
    startDate: form.startDate,
    endDate: form.endDate,
  };
}

export default function AdminBanners() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BannerFormData>(emptyForm);

  const { data: banners = [], isLoading } = useQuery<AdBanner[]>({
    queryKey: ["/api/banners"],
  });

  const createMutation = useMutation({
    mutationFn: (data: BannerFormData) => apiRequest("POST", "/api/admin/banners", toPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: number; data: BannerFormData }) =>
      apiRequest("PATCH", `/api/admin/banners/${args.id}`, toPayload(args.data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/banners/${id}`),
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
      linkUrl: banner.linkUrl ?? "",
      position: banner.position ?? "",
      isActive: banner.isActive ?? true,
      startDate: banner.startDate ?? "",
      endDate: banner.endDate ?? "",
    });
    setShowForm(true);
  }

  function handleSubmit() {
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: form });
      return;
    }
    createMutation.mutate(form);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div data-testid="admin-banners-page" className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-blue-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800" data-testid="text-banners-title">
              Banner Manager
            </h2>
            <p className="text-sm text-muted-foreground">{banners.length} total banners</p>
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
          Create Banner
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4" data-testid="banner-form-panel">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-[15px] font-semibold text-gray-800">
              {editingId !== null ? "Edit Banner" : "New Banner"}
            </h3>
            <Button size="icon" variant="ghost" onClick={resetForm} data-testid="button-close-form">
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-gray-800 text-sm font-medium">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Banner title"
                className="rounded-xl border-gray-100"
                data-testid="input-banner-title"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-800 text-sm font-medium">Image URL</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="rounded-xl border-gray-100"
                data-testid="input-banner-image"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-800 text-sm font-medium">Link URL</Label>
              <Input
                value={form.linkUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
                placeholder="https://..."
                className="rounded-xl border-gray-100"
                data-testid="input-banner-link"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-800 text-sm font-medium">Position</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
                placeholder="home_top"
                className="rounded-xl border-gray-100"
                data-testid="input-banner-position"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-800 text-sm font-medium">Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                className="rounded-xl border-gray-100"
                data-testid="input-banner-start"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-800 text-sm font-medium">End Date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                className="rounded-xl border-gray-100"
                data-testid="input-banner-end"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
              data-testid="switch-banner-active"
            />
            <Label className="text-sm text-foreground">Active</Label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isPending || !form.title.trim() || !form.imageUrl.trim()}
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
            No banners yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => {
            const impressions = banner.impressions ?? 0;
            const clicks = banner.clicks ?? 0;
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : "0.0";

            return (
              <div
                key={banner.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                data-testid={`card-banner-${banner.id}`}
              >
                {banner.imageUrl ? (
                  <div className="aspect-video bg-gray-50">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      data-testid={`img-banner-${banner.id}`}
                    />
                  </div>
                ) : null}

                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="font-semibold text-foreground" data-testid={`text-banner-title-${banner.id}`}>
                        {banner.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {banner.position || "no-position"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        banner.isActive ? "bg-[#00B14F]/10 text-[#00B14F]" : "bg-gray-100 text-gray-500"
                      }`}
                      data-testid={`badge-banner-status-${banner.id}`}
                    >
                      {banner.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center" data-testid={`stats-row-${banner.id}`}>
                    <div className="bg-gray-50 rounded-xl py-2 px-1">
                      <Eye className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
                      <p className="text-xs font-semibold text-foreground">{impressions.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Impressions</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl py-2 px-1">
                      <MousePointer className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
                      <p className="text-xs font-semibold text-foreground">{clicks.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Clicks</p>
                    </div>
                    <div className="bg-[#FFCC02]/15 rounded-xl py-2 px-1">
                      <Calendar className="w-3.5 h-3.5 text-foreground mx-auto mb-0.5" />
                      <p className="text-xs font-semibold text-foreground">{ctr}%</p>
                      <p className="text-[10px] text-muted-foreground">CTR</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{banner.startDate || "No start"} - {banner.endDate || "No end"}</span>
                    </div>
                    {banner.linkUrl ? (
                      <div className="flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5" />
                        <a href={banner.linkUrl} target="_blank" rel="noreferrer" className="truncate underline">
                          {banner.linkUrl}
                        </a>
                      </div>
                    ) : null}
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
