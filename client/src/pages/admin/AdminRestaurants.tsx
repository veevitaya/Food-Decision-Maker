import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Pencil,
  Trash2,
  X,
  Star,
  TrendingUp,
  Plus,
  Utensils,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Restaurant } from "@shared/schema";

type AdminRestaurantsResponse = Restaurant[] | { items: Restaurant[] };

export default function AdminRestaurants() {
  const [search, setSearch] = useState("");
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [isNewMode, setIsNewMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);

  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/admin/restaurants"],
    queryFn: async () => {
      const res = await fetch("/api/admin/restaurants", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load restaurants");
      const data = (await res.json()) as AdminRestaurantsResponse;
      return Array.isArray(data) ? data : data.items ?? [];
    },
  });

  const filtered = restaurants.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/restaurants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
      setDeleteTarget(null);
    },
  });

  const openNew = () => {
    setIsNewMode(true);
    setEditingRestaurant({
      id: 0,
      name: "",
      description: "",
      imageUrl: "",
      lat: "",
      lng: "",
      category: "",
      priceLevel: 2,
      rating: "4.0",
      address: "",
      isNew: false,
      trendingScore: 0,
      phone: null,
      openingHours: null,
      reviews: null,
    });
  };

  return (
    <div data-testid="admin-restaurants-page" className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-muted flex items-center justify-center">
            <Utensils className="w-4 h-4 text-foreground" />
          </div>
          <span className="text-sm text-muted-foreground" data-testid="text-restaurant-count">
            <span className="inline-flex items-center justify-center bg-foreground text-white text-xs font-medium rounded-full px-2.5 py-0.5 mr-2">
              {restaurants.length}
            </span>
            total restaurants
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20"
              data-testid="input-search-restaurants"
            />
          </div>
          <button
            onClick={openNew}
            data-testid="button-add-restaurant"
            className="inline-flex items-center gap-1.5 bg-foreground hover:bg-foreground/90 text-white rounded-xl px-5 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border overflow-hidden" data-testid="table-restaurants">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-border bg-gray-50 dark:bg-muted">
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Image</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Name</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Category</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Price</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Rating</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Address</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Trending</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading restaurants...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    No restaurants found
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-100 dark:border-border transition-colors hover:bg-gray-50 dark:hover:bg-muted"
                    data-testid={`row-restaurant-${r.id}`}
                  >
                    <td className="px-4 py-3">
                      <img
                        src={r.imageUrl}
                        alt={r.name}
                        className="w-12 h-12 rounded-xl object-cover"
                        data-testid={`img-restaurant-${r.id}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground" data-testid={`text-restaurant-name-${r.id}`}>
                      {r.name}
                      {r.isNew && (
                        <span className="ml-2 inline-flex items-center bg-[#FFCC02] text-foreground text-[10px] font-semibold rounded-full px-2 py-0.5">NEW</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground" data-testid={`text-restaurant-category-${r.id}`}>
                      {r.category}
                    </td>
                    <td className="px-4 py-3 text-foreground" data-testid={`text-restaurant-price-${r.id}`}>
                      {"฿".repeat(r.priceLevel)}
                    </td>
                    <td className="px-4 py-3" data-testid={`text-restaurant-rating-${r.id}`}>
                      <span className="flex items-center gap-1 text-foreground">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {r.rating}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate" data-testid={`text-restaurant-address-${r.id}`}>
                      {r.address}
                    </td>
                    <td className="px-4 py-3" data-testid={`text-restaurant-trending-${r.id}`}>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min((r.trendingScore ?? 0) * 10, 100)}%`,
                              background: "linear-gradient(90deg, hsl(222, 47%, 20%), hsl(222, 47%, 35%))",
                            }}
                          />
                        </div>
                        <span className="text-xs">{r.trendingScore ?? 0}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setIsNewMode(false);
                            setEditingRestaurant({ ...r });
                          }}
                          data-testid={`button-edit-restaurant-${r.id}`}
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTarget(r)}
                          data-testid={`button-delete-restaurant-${r.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingRestaurant && (
        <EditPanel
          restaurant={editingRestaurant}
          isNew={isNewMode}
          onClose={() => {
            setEditingRestaurant(null);
            setIsNewMode(false);
          }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-title" className="text-foreground">Delete Restaurant</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-description" className="text-muted-foreground">
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete" className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              data-testid="button-confirm-delete"
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditPanel({
  restaurant,
  isNew,
  onClose,
}: {
  restaurant: Restaurant;
  isNew: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...restaurant });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Restaurant>) => {
      if (isNew) {
        return apiRequest("POST", "/api/admin/restaurants", data);
      }
      return apiRequest("PATCH", `/api/admin/restaurants/${restaurant.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
      onClose();
    },
  });

  const update = (field: keyof Restaurant, value: string | number | boolean | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const { id, ...rest } = form;
    saveMutation.mutate(rest);
  };

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex"
      data-testid="panel-edit-restaurant"
    >
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      <div className="relative ml-auto w-[420px] h-full bg-white dark:bg-card rounded-l-2xl shadow-xl overflow-y-auto">
        <div className="h-1 rounded-tl-2xl" style={{ background: "linear-gradient(90deg, hsl(222, 47%, 20%), hsl(222, 47%, 35%))" }} />
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 dark:border-border bg-white dark:bg-card">
          <h2 className="font-semibold text-foreground text-[15px]" data-testid="text-panel-title">
            {isNew ? "Add Restaurant" : "Edit Restaurant"}
          </h2>
          <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-panel">
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20"
              data-testid="input-edit-name"
            />
          </Field>
          <Field label="Description">
            <Input
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20"
              data-testid="input-edit-description"
            />
          </Field>
          <Field label="Image URL">
            <Input
              value={form.imageUrl}
              onChange={(e) => update("imageUrl", e.target.value)}
              className="rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20"
              data-testid="input-edit-imageUrl"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <Input
                value={form.lat}
                onChange={(e) => update("lat", e.target.value)}
                className="rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20"
                data-testid="input-edit-lat"
              />
            </Field>
            <Field label="Longitude">
              <Input
                value={form.lng}
                onChange={(e) => update("lng", e.target.value)}
                className="rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20"
                data-testid="input-edit-lng"
              />
            </Field>
          </div>
          <Field label="Category">
            <Input
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20"
              data-testid="input-edit-category"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price Level (1-4)">
              <Input
                type="number"
                min={1}
                max={4}
                value={form.priceLevel}
                onChange={(e) => update("priceLevel", parseInt(e.target.value) || 1)}
                className="rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20"
                data-testid="input-edit-priceLevel"
              />
            </Field>
            <Field label="Rating">
              <Input
                value={form.rating}
                onChange={(e) => update("rating", e.target.value)}
                className="rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20"
                data-testid="input-edit-rating"
              />
            </Field>
          </div>
          <Field label="Address">
            <Input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className="rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20"
              data-testid="input-edit-address"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trending Score">
              <Input
                type="number"
                value={form.trendingScore ?? 0}
                onChange={(e) => update("trendingScore", parseInt(e.target.value) || 0)}
                className="rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20"
                data-testid="input-edit-trendingScore"
              />
            </Field>
            <Field label="Is New">
              <div className="flex items-center h-9 gap-2">
                <input
                  type="checkbox"
                  checked={!!form.isNew}
                  onChange={(e) => update("isNew", e.target.checked)}
                  className="w-4 h-4 rounded border-gray-200 text-foreground focus:ring-foreground/20"
                  data-testid="input-edit-isNew"
                />
                <span className="text-sm text-foreground">{form.isNew ? "Yes" : "No"}</span>
              </div>
            </Field>
          </div>

          <div className="pt-3">
            <button
              className="w-full bg-foreground hover:bg-foreground/90 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="button-save-restaurant"
            >
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{label}</Label>
      {children}
    </div>
  );
}
