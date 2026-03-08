import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AdminLayout from "./AdminLayout";

type OH = { day: string; hours: string };
type Review = { author: string; rating: number; text: string; timeAgo?: string };

const emptyForm = {
  name: "", description: "", imageUrl: "", lat: "", lng: "",
  category: "", priceLevel: 2, rating: "4.0", address: "",
  phone: "", isNew: false, trendingScore: 0,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

const inp = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-foreground";

export default function AdminRestaurantEditor() {
  const [location, navigate] = useLocation();
  const qc = useQueryClient();
  const idPart = location.split("/").pop() ?? "new";
  const isCreate = idPart === "new";
  const restaurantId = isCreate ? null : Number(idPart);

  const [form, setForm] = useState(emptyForm);
  const [openingHours, setOpeningHours] = useState<OH[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-restaurant", restaurantId],
    enabled: !isCreate && Number.isFinite(restaurantId),
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load restaurant");
      return res.json();
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.name ?? "", description: data.description ?? "",
      imageUrl: data.imageUrl ?? "", lat: data.lat ?? "", lng: data.lng ?? "",
      category: data.category ?? "", priceLevel: Number(data.priceLevel ?? 2),
      rating: data.rating ?? "4.0", address: data.address ?? "",
      phone: data.phone ?? "", isNew: Boolean(data.isNew),
      trendingScore: Number(data.trendingScore ?? 0),
    });
    setOpeningHours(Array.isArray(data.openingHours) ? data.openingHours : []);
    setReviews(Array.isArray(data.reviews) ? data.reviews : []);
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      setError("");
      const method = isCreate ? "POST" : "PATCH";
      const url = isCreate ? "/api/admin/restaurants" : `/api/admin/restaurants/${restaurantId}`;
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          openingHours: openingHours.filter((h) => h.day.trim() && h.hours.trim()),
          reviews: reviews.filter((r) => r.author.trim() && r.text.trim()),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? "Save failed");
      }
      return isCreate ? res.json() : null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
      navigate("/admin/restaurants");
    },
    onError: (e: Error) => setError(e.message),
  });

  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <AdminLayout title={isCreate ? "New Restaurant" : "Edit Restaurant"}>
      <div className="space-y-5 max-w-2xl">
        {/* Core fields */}
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm">Basic Info</h2>
          <Field label="Name"><input className={inp} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Description"><textarea className={inp} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label="Image URL"><input className={inp} value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" /></Field>
          <Field label="Address"><input className={inp} value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
          <Field label="Phone"><input className={inp} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+66…" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude"><input className={inp} value={form.lat} onChange={(e) => set("lat", e.target.value)} /></Field>
            <Field label="Longitude"><input className={inp} value={form.lng} onChange={(e) => set("lng", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Category"><input className={inp} value={form.category} onChange={(e) => set("category", e.target.value)} /></Field>
            <Field label="Rating"><input className={inp} value={form.rating} onChange={(e) => set("rating", e.target.value)} /></Field>
            <Field label="Price Level (1–4)"><input type="number" min={1} max={4} className={inp} value={form.priceLevel} onChange={(e) => set("priceLevel", Number(e.target.value))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trending Score"><input type="number" min={0} className={inp} value={form.trendingScore} onChange={(e) => set("trendingScore", Number(e.target.value))} /></Field>
            <div className="flex items-center gap-2 mt-5">
              <input type="checkbox" id="isNew" checked={form.isNew} onChange={(e) => set("isNew", e.target.checked)} />
              <label htmlFor="isNew" className="text-sm">Mark as New</label>
            </div>
          </div>
        </div>

        {/* Opening Hours */}
        <div className="bg-white border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Opening Hours</h2>
            <button className="text-xs px-2 py-1 border rounded" onClick={() => setOpeningHours((p) => [...p, { day: "", hours: "" }])}>+ Add</button>
          </div>
          {openingHours.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input className={inp + " flex-1"} placeholder="Monday" value={row.day} onChange={(e) => setOpeningHours((p) => p.map((r, j) => j === i ? { ...r, day: e.target.value } : r))} />
              <input className={inp + " flex-[2]"} placeholder="09:00 – 22:00" value={row.hours} onChange={(e) => setOpeningHours((p) => p.map((r, j) => j === i ? { ...r, hours: e.target.value } : r))} />
              <button className="text-red-500 px-1 text-lg leading-none" onClick={() => setOpeningHours((p) => p.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          {openingHours.length === 0 && <p className="text-xs text-muted-foreground">No hours added.</p>}
        </div>

        {/* Reviews */}
        <div className="bg-white border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Reviews</h2>
            <button className="text-xs px-2 py-1 border rounded" onClick={() => setReviews((p) => [...p, { author: "", rating: 5, text: "", timeAgo: "" }])}>+ Add</button>
          </div>
          {reviews.map((rv, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <input className={inp + " flex-1"} placeholder="Author" value={rv.author} onChange={(e) => setReviews((p) => p.map((r, j) => j === i ? { ...r, author: e.target.value } : r))} />
                <input type="number" min={1} max={5} step={0.5} className={inp + " w-20"} value={rv.rating} onChange={(e) => setReviews((p) => p.map((r, j) => j === i ? { ...r, rating: Number(e.target.value) } : r))} />
                <input className={inp + " w-24"} placeholder="2 days ago" value={rv.timeAgo ?? ""} onChange={(e) => setReviews((p) => p.map((r, j) => j === i ? { ...r, timeAgo: e.target.value } : r))} />
                <button className="text-red-500 px-1 text-lg leading-none" onClick={() => setReviews((p) => p.filter((_, j) => j !== i))}>×</button>
              </div>
              <textarea className={inp} rows={2} placeholder="Review text…" value={rv.text} onChange={(e) => setReviews((p) => p.map((r, j) => j === i ? { ...r, text: e.target.value } : r))} />
            </div>
          ))}
          {reviews.length === 0 && <p className="text-xs text-muted-foreground">No reviews added.</p>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button className="px-4 py-2 border rounded-lg text-sm" onClick={() => navigate("/admin/restaurants")}>Cancel</button>
          <button className="px-4 py-2 bg-foreground text-white rounded-lg text-sm disabled:opacity-50" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
