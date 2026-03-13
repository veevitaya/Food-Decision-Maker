import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Megaphone, Star, CheckCircle, Clock } from "lucide-react";
import { getAdminSession } from "./AdminLayout";
import { useToast } from "@/hooks/use-toast";

type Promotion = {
  id: number;
  restaurantId: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
};

export default function OwnerPromotions() {
  const session = getAdminSession();
  const restaurantId = session?.restaurantId;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ title: "", description: "", imageUrl: "", startDate: "", endDate: "" });
  const [sponsorForm, setSponsorForm] = useState({ startDate: "", endDate: "", notes: "" });

  const { data: promotions = [], isLoading } = useQuery<Promotion[]>({
    queryKey: ["/api/restaurants", restaurantId, "promotions"],
    enabled: Boolean(restaurantId),
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/promotions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load promotions");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          restaurantId,
          title: form.title,
          description: form.description || null,
          imageUrl: form.imageUrl || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          isActive: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to create promotion");
      return res.json();
    },
    onSuccess: () => {
      setForm({ title: "", description: "", imageUrl: "", startDate: "", endDate: "" });
      qc.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "promotions"] });
      toast({ title: "Promotion created" });
    },
  });

  const sponsorMutation = useMutation({
    mutationFn: async () => {
      const owner = await fetch("/api/owners/me", { credentials: "include" }).then(r => r.json()).catch(() => null);
      const res = await fetch("/api/sponsored-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          restaurantId: restaurantId!,
          ownerId: owner?.id ?? session?.restaurantId,
          requestedStartDate: sponsorForm.startDate || null,
          requestedEndDate: sponsorForm.endDate || null,
          notes: sponsorForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => {
      setSponsorForm({ startDate: "", endDate: "", notes: "" });
      toast({ title: "Sponsorship request submitted", description: "Admin will review your request." });
    },
    onError: () => toast({ title: "Error", description: "Failed to submit sponsorship request.", variant: "destructive" }),
  });

  if (!session || session.sessionType !== "owner") {
    return <p className="text-sm text-muted-foreground">Owner access required.</p>;
  }

  return (
    <div className="space-y-6" data-testid="owner-promotions-page">
      <div className="flex items-center gap-3">
        <Megaphone className="w-5 h-5 text-[#FFCC02]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Promotions</h2>
          <p className="text-xs text-muted-foreground">Backed by /api/promotions</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3" data-testid="owner-promotion-form">
        <h3 className="text-sm font-semibold">Create Promotion</h3>
        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} />
        <div className="grid grid-cols-2 gap-2">
          <input className="w-full border rounded-lg px-3 py-2 text-sm" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
          <input className="w-full border rounded-lg px-3 py-2 text-sm" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={!form.title.trim() || createMutation.isPending}
          className="px-4 py-2 rounded-lg bg-[#FFCC02] text-[#2d2000] text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1"
          data-testid="create-owner-promotion"
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5" data-testid="owner-promotions-list">
        <h3 className="text-sm font-semibold mb-3">Active Promotions</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : promotions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No promotions.</p>
        ) : (
          <div className="space-y-2">
            {promotions.map((promotion) => (
              <div key={promotion.id} className="border rounded-xl p-3" data-testid={`owner-promo-${promotion.id}`}>
                <p className="text-sm font-medium">{promotion.title}</p>
                <p className="text-xs text-muted-foreground">{promotion.description || "No description"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(promotion.startDate || "-") + " to " + (promotion.endDate || "-")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sponsored Placement Request */}
      <div className="bg-white rounded-2xl border border-amber-100 p-5 space-y-3" data-testid="owner-sponsored-request">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold">Request Sponsored Placement</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Get your restaurant featured as a "Sponsored" card in the swipe deck at max 1 per 5 organic cards. Requires admin approval.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Start date (optional)</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" type="date" value={sponsorForm.startDate} onChange={(e) => setSponsorForm(p => ({ ...p, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">End date (optional)</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" type="date" value={sponsorForm.endDate} onChange={(e) => setSponsorForm(p => ({ ...p, endDate: e.target.value }))} />
          </div>
        </div>
        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Notes for admin (optional)" value={sponsorForm.notes} onChange={(e) => setSponsorForm(p => ({ ...p, notes: e.target.value }))} />
        <button
          onClick={() => sponsorMutation.mutate()}
          disabled={sponsorMutation.isPending || sponsorMutation.isSuccess}
          className="px-4 py-2 rounded-lg bg-amber-400 text-[#2d2000] text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1"
          data-testid="request-sponsored-btn"
        >
          {sponsorMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : sponsorMutation.isSuccess ? <CheckCircle className="w-4 h-4" /> : <Star className="w-4 h-4" />}
          {sponsorMutation.isSuccess ? "Request Submitted" : "Request Sponsored Placement"}
        </button>
      </div>
    </div>
  );
}
