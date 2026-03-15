import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Save, Pencil, ImagePlus } from "lucide-react";
import { getAdminSession } from "../admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";

type RestaurantOpeningHour = { day: string; hours: string };

type RestaurantProfile = {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  photos: string[];
  category: string;
  priceLevel: number;
  rating: string;
  address: string;
  phone: string | null;
  district: string | null;
  openingHours: RestaurantOpeningHour[] | null;
};

type MenuItem = {
  id: number;
  restaurantId: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceApprox: number | null;
  tags: string[];
  dietFlags: string[];
  isActive: boolean;
};

type OwnerRestaurantResponse = {
  restaurant: RestaurantProfile;
  menus: MenuItem[];
  allowedRestaurantIds: number[];
};

function getOwnerHeaders(): Record<string, string> {
  const session = getAdminSession();
  if (!session || session.sessionType !== "owner") return {};
  const email = session.email ?? "";
  if (!email) return {};
  return { "x-owner-token": btoa(`${email}:`) };
}

function openingHoursToText(openingHours: RestaurantOpeningHour[] | null | undefined): string {
  if (!openingHours || openingHours.length === 0) return "";
  return openingHours.map((slot) => `${slot.day}: ${slot.hours}`).join("\n");
}

function parseOpeningHours(text: string): RestaurantOpeningHour[] | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const parsed = lines
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return null;
      const day = line.slice(0, idx).trim();
      const hours = line.slice(idx + 1).trim();
      if (!day || !hours) return null;
      return { day, hours };
    })
    .filter((slot): slot is RestaurantOpeningHour => Boolean(slot));

  return parsed.length > 0 ? parsed : null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      if (!base64) {
        reject(new Error("Failed to read file"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function OwnerMenu() {
  const session = getAdminSession();
  const qc = useQueryClient();
  const { toast } = useToast();

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const menuImageInputRef = useRef<HTMLInputElement>(null);

  const [restaurantForm, setRestaurantForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    photos: [] as string[],
    category: "",
    priceLevel: 2,
    rating: "4.0",
    address: "",
    phone: "",
    district: "",
    openingHoursText: "",
  });

  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    priceApprox: "",
    tags: "",
    dietFlags: "",
    isActive: true,
  });
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingMenuImage, setUploadingMenuImage] = useState(false);

  const { data, isLoading, isError } = useQuery<OwnerRestaurantResponse>({
    queryKey: ["/api/owner/restaurant"],
    enabled: session?.sessionType === "owner",
    queryFn: async () => {
      const res = await fetch("/api/owner/restaurant", {
        headers: getOwnerHeaders() as Record<string, string>,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load owner restaurant");
      return res.json();
    },
  });

  useEffect(() => {
    if (!data?.restaurant) return;
    setRestaurantForm({
      name: data.restaurant.name ?? "",
      description: data.restaurant.description ?? "",
      imageUrl: data.restaurant.imageUrl ?? "",
      photos: data.restaurant.photos ?? [],
      category: data.restaurant.category ?? "",
      priceLevel: data.restaurant.priceLevel ?? 2,
      rating: data.restaurant.rating ?? "4.0",
      address: data.restaurant.address ?? "",
      phone: data.restaurant.phone ?? "",
      district: data.restaurant.district ?? "",
      openingHoursText: openingHoursToText(data.restaurant.openingHours),
    });
  }, [data?.restaurant]);

  const saveRestaurantMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: restaurantForm.name.trim(),
        description: restaurantForm.description.trim(),
        imageUrl: restaurantForm.imageUrl.trim(),
        photos: Array.from(new Set(restaurantForm.photos.map((url) => url.trim()).filter(Boolean))),
        category: restaurantForm.category.trim(),
        priceLevel: Number(restaurantForm.priceLevel) || 2,
        rating: restaurantForm.rating.trim() || "N/A",
        address: restaurantForm.address.trim(),
        phone: restaurantForm.phone.trim() || null,
        district: restaurantForm.district.trim() || null,
        openingHours: parseOpeningHours(restaurantForm.openingHoursText),
      };

      const res = await fetch("/api/owner/restaurant", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getOwnerHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save restaurant");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/owner/restaurant"] });
      toast({ title: "Restaurant updated" });
    },
    onError: () => {
      toast({ title: "Update failed", description: "Please check your inputs and try again.", variant: "destructive" });
    },
  });

  const saveMenuMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: menuForm.name.trim(),
        description: menuForm.description.trim() || null,
        imageUrl: menuForm.imageUrl.trim() || null,
        priceApprox: menuForm.priceApprox ? Number(menuForm.priceApprox) : null,
        tags: menuForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        dietFlags: menuForm.dietFlags
          .split(",")
          .map((flag) => flag.trim())
          .filter(Boolean),
        isActive: menuForm.isActive,
        isSponsored: false,
      };

      const url = editingMenuId ? `/api/owner/menus/${editingMenuId}` : "/api/owner/menus";
      const method = editingMenuId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getOwnerHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save menu item");
      }
      return res.json();
    },
    onSuccess: () => {
      setMenuForm({
        name: "",
        description: "",
        imageUrl: "",
        priceApprox: "",
        tags: "",
        dietFlags: "",
        isActive: true,
      });
      setEditingMenuId(null);
      qc.invalidateQueries({ queryKey: ["/api/owner/restaurant"] });
      toast({ title: "Menu saved" });
    },
    onError: () => {
      toast({ title: "Menu save failed", variant: "destructive" });
    },
  });

  const deleteMenuMutation = useMutation({
    mutationFn: async (menuId: number) => {
      const res = await fetch(`/api/owner/menus/${menuId}`, {
        method: "DELETE",
        headers: getOwnerHeaders() as Record<string, string>,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete menu item");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/owner/restaurant"] });
      toast({ title: "Menu item deleted" });
    },
    onError: () => {
      toast({ title: "Delete failed", variant: "destructive" });
    },
  });

  const uploadImage = async (file: File): Promise<string> => {
    const data = await fileToBase64(file);
    const res = await fetch("/api/owner/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getOwnerHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({
        name: file.name,
        type: file.type,
        data,
      }),
    });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json() as { url: string };
    return json.url;
  };

  const handleCoverUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadImage(file);
      setRestaurantForm((prev) => ({
        ...prev,
        imageUrl: url,
        photos: Array.from(new Set([url, ...prev.photos])),
      }));
      toast({ title: "Cover uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map((file) => uploadImage(file)));
      setRestaurantForm((prev) => ({
        ...prev,
        photos: Array.from(new Set([...prev.photos, ...uploaded])).slice(0, 20),
      }));
      toast({ title: "Gallery images uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const handleMenuImageUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingMenuImage(true);
    try {
      const url = await uploadImage(file);
      setMenuForm((prev) => ({ ...prev, imageUrl: url }));
      toast({ title: "Menu image uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingMenuImage(false);
      if (menuImageInputRef.current) menuImageInputRef.current.value = "";
    }
  };

  const menus = data?.menus ?? [];

  if (!session || session.sessionType !== "owner") {
    return <p className="text-sm text-muted-foreground">Owner access required.</p>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 rounded-2xl border border-gray-100 bg-white animate-pulse" />
        <div className="h-56 rounded-2xl border border-gray-100 bg-white animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="owner-menu-error">
        Unable to load owner restaurant. Make sure your restaurant claim is approved.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="owner-menu-page">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Restaurant Editor</h2>
        <p className="text-xs text-muted-foreground">Manage your cover, gallery, details, and menu items.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4" data-testid="owner-restaurant-editor">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Cover and Gallery</h3>
          <div className="flex items-center gap-2">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleCoverUpload(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => coverInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
              disabled={uploadingCover}
              data-testid="button-upload-cover"
            >
              {uploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
              Upload Cover
            </button>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handleGalleryUpload(e.target.files)}
            />
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
              disabled={uploadingGallery}
              data-testid="button-upload-gallery"
            >
              {uploadingGallery ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
              Upload Gallery
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
          <div className="rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
            {restaurantForm.imageUrl ? (
              <img src={restaurantForm.imageUrl} alt={restaurantForm.name || "cover"} className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 flex items-center justify-center text-xs text-muted-foreground">No cover image</div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Cover URL</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={restaurantForm.imageUrl}
              onChange={(e) => setRestaurantForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="/api/uploads/..."
            />
            <div className="flex flex-wrap gap-2">
              {restaurantForm.photos.length === 0 ? (
                <span className="text-xs text-muted-foreground">No gallery images yet.</span>
              ) : restaurantForm.photos.map((url, idx) => (
                <div key={`${url}-${idx}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-100">
                  <img src={url} alt={`gallery-${idx}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setRestaurantForm((prev) => ({ ...prev, photos: prev.photos.filter((u) => u !== url) }))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs"
                    data-testid={`button-remove-gallery-${idx}`}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Restaurant name"
            value={restaurantForm.name}
            onChange={(e) => setRestaurantForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Category"
            value={restaurantForm.category}
            onChange={(e) => setRestaurantForm((prev) => ({ ...prev, category: e.target.value }))}
          />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Address"
            value={restaurantForm.address}
            onChange={(e) => setRestaurantForm((prev) => ({ ...prev, address: e.target.value }))}
          />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="District"
            value={restaurantForm.district}
            onChange={(e) => setRestaurantForm((prev) => ({ ...prev, district: e.target.value }))}
          />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Phone"
            value={restaurantForm.phone}
            onChange={(e) => setRestaurantForm((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={1}
              max={4}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Price 1-4"
              value={restaurantForm.priceLevel}
              onChange={(e) => setRestaurantForm((prev) => ({ ...prev, priceLevel: Number(e.target.value) || 2 }))}
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Rating"
              value={restaurantForm.rating}
              onChange={(e) => setRestaurantForm((prev) => ({ ...prev, rating: e.target.value }))}
            />
          </div>
        </div>

        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
          placeholder="Description"
          value={restaurantForm.description}
          onChange={(e) => setRestaurantForm((prev) => ({ ...prev, description: e.target.value }))}
        />
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[90px]"
          placeholder={"Opening hours (one line per day)\nMon: 09:00-22:00\nTue: 09:00-22:00"}
          value={restaurantForm.openingHoursText}
          onChange={(e) => setRestaurantForm((prev) => ({ ...prev, openingHoursText: e.target.value }))}
        />

        <button
          onClick={() => saveRestaurantMutation.mutate()}
          disabled={saveRestaurantMutation.isPending || !restaurantForm.name.trim()}
          className="px-4 py-2 rounded-lg bg-[#00B14F] text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
          data-testid="button-save-restaurant-profile"
        >
          {saveRestaurantMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Restaurant Profile
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3" data-testid="owner-menu-create-form">
        <h3 className="text-sm font-semibold">{editingMenuId ? "Edit Menu Item" : "Add Menu Item"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Name"
            value={menuForm.name}
            onChange={(e) => setMenuForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <div className="flex gap-2">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Image URL"
              value={menuForm.imageUrl}
              onChange={(e) => setMenuForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
            />
            <input
              ref={menuImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleMenuImageUpload(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => menuImageInputRef.current?.click()}
              className="px-3 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
              disabled={uploadingMenuImage}
              data-testid="button-upload-menu-image"
            >
              {uploadingMenuImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Upload"}
            </button>
          </div>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Approx price"
            value={menuForm.priceApprox}
            onChange={(e) => setMenuForm((prev) => ({ ...prev, priceApprox: e.target.value }))}
          />
          <div className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={menuForm.isActive}
              onChange={(e) => setMenuForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            <span>Active</span>
          </div>
        </div>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Tags (comma separated)"
          value={menuForm.tags}
          onChange={(e) => setMenuForm((prev) => ({ ...prev, tags: e.target.value }))}
        />
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Diet flags (comma separated)"
          value={menuForm.dietFlags}
          onChange={(e) => setMenuForm((prev) => ({ ...prev, dietFlags: e.target.value }))}
        />
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[72px]"
          placeholder="Description"
          value={menuForm.description}
          onChange={(e) => setMenuForm((prev) => ({ ...prev, description: e.target.value }))}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveMenuMutation.mutate()}
            disabled={!menuForm.name.trim() || saveMenuMutation.isPending}
            className="px-4 py-2 rounded-lg bg-[#FFCC02] text-[#2d2000] text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1"
            data-testid="button-save-menu-item"
          >
            {saveMenuMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {editingMenuId ? "Update Item" : "Add Item"}
          </button>
          {editingMenuId && (
            <button
              onClick={() => {
                setEditingMenuId(null);
                setMenuForm({
                  name: "",
                  description: "",
                  imageUrl: "",
                  priceApprox: "",
                  tags: "",
                  dietFlags: "",
                  isActive: true,
                });
              }}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm"
              data-testid="button-cancel-edit-menu-item"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5" data-testid="owner-menu-list">
        <h3 className="text-sm font-semibold mb-3">Current Menu Items</h3>
        {menus.length === 0 ? (
          <p className="text-sm text-muted-foreground">No menu items yet.</p>
        ) : (
          <div className="space-y-2">
            {menus.map((menu) => (
              <div key={menu.id} className="border rounded-xl p-3 flex items-center justify-between gap-3" data-testid={`owner-menu-item-${menu.id}`}>
                <div className="min-w-0 flex items-center gap-3">
                  {menu.imageUrl ? (
                    <img src={menu.imageUrl} alt={menu.name} className="w-14 h-14 rounded-lg object-cover border border-gray-100" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-100" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{menu.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{menu.description || "No description"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {menu.priceApprox ? `THB ${menu.priceApprox}` : "No price"} · {menu.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingMenuId(menu.id);
                      setMenuForm({
                        name: menu.name,
                        description: menu.description || "",
                        imageUrl: menu.imageUrl || "",
                        priceApprox: menu.priceApprox?.toString() || "",
                        tags: (menu.tags || []).join(", "),
                        dietFlags: (menu.dietFlags || []).join(", "),
                        isActive: Boolean(menu.isActive),
                      });
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100"
                    data-testid={`button-edit-menu-${menu.id}`}
                  >
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => deleteMenuMutation.mutate(menu.id)}
                    className="p-2 rounded-lg hover:bg-red-50"
                    data-testid={`delete-menu-${menu.id}`}
                  >
                    {deleteMenuMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-500" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
