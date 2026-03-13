import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { getAdminSession } from "./AdminLayout";
import { useToast } from "@/hooks/use-toast";

type Menu = {
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

export default function OwnerMenu() {
  const session = getAdminSession();
  const restaurantId = session?.restaurantId;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", description: "", imageUrl: "", priceApprox: "" });

  const { data: menus = [], isLoading } = useQuery<Menu[]>({
    queryKey: ["/api/restaurants", restaurantId, "menus"],
    enabled: Boolean(restaurantId),
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/menus`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load menus");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          restaurantId,
          name: form.name,
          description: form.description || null,
          imageUrl: form.imageUrl || null,
          priceApprox: form.priceApprox ? Number(form.priceApprox) : null,
          tags: [],
          dietFlags: [],
          isActive: true,
          isSponsored: false,
        }),
      });
      if (!res.ok) throw new Error("Failed to create menu");
      return res.json();
    },
    onSuccess: () => {
      setForm({ name: "", description: "", imageUrl: "", priceApprox: "" });
      qc.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "menus"] });
      toast({ title: "Menu item created" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/menus/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete menu");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "menus"] }),
  });

  if (!session || session.sessionType !== "owner") {
    return <p className="text-sm text-muted-foreground">Owner access required.</p>;
  }

  return (
    <div className="space-y-6" data-testid="owner-menu-page">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Menu & Hours</h2>
        <p className="text-xs text-muted-foreground">CRUD backed by /api/menus</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3" data-testid="owner-menu-create-form">
        <h3 className="text-sm font-semibold">Add Menu Item</h3>
        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} />
        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Price approx" value={form.priceApprox} onChange={(e) => setForm((p) => ({ ...p, priceApprox: e.target.value }))} />
        <button
          onClick={() => createMutation.mutate()}
          disabled={!form.name.trim() || createMutation.isPending}
          className="px-4 py-2 rounded-lg bg-[#FFCC02] text-[#2d2000] text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1"
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5" data-testid="owner-menu-list">
        <h3 className="text-sm font-semibold mb-3">Current Menu Items</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : menus.length === 0 ? (
          <p className="text-sm text-muted-foreground">No menu items yet.</p>
        ) : (
          <div className="space-y-2">
            {menus.map((menu) => (
              <div key={menu.id} className="border rounded-xl p-3 flex items-center justify-between gap-3" data-testid={`owner-menu-item-${menu.id}`}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{menu.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{menu.description || "No description"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{menu.priceApprox ? `?${menu.priceApprox}` : "No price"}</p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(menu.id)}
                  className="text-red-500 p-2"
                  data-testid={`delete-menu-${menu.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="hidden"><Save /></button>
    </div>
  );
}
