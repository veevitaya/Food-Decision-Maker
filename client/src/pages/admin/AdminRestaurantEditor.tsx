import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import AdminLayout from "./AdminLayout";
import { getAuthHeaders } from "@/lib/auth";

const emptyForm = {
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
};

export default function AdminRestaurantEditor() {
  const [location, navigate] = useLocation();
  const qc = useQueryClient();
  const idPart = location.split("/").pop() ?? "new";
  const isCreate = idPart === "new";
  const restaurantId = isCreate ? null : Number(idPart);
  const [form, setForm] = useState(emptyForm);

  const { data } = useQuery({
    queryKey: ["admin-restaurant", restaurantId],
    enabled: !isCreate && Number.isFinite(restaurantId),
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load restaurant");
      return res.json();
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.name ?? "",
      description: data.description ?? "",
      imageUrl: data.imageUrl ?? "",
      lat: data.lat ?? "",
      lng: data.lng ?? "",
      category: data.category ?? "",
      priceLevel: Number(data.priceLevel ?? 2),
      rating: data.rating ?? "4.0",
      address: data.address ?? "",
      isNew: Boolean(data.isNew),
      trendingScore: Number(data.trendingScore ?? 0),
    });
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const method = isCreate ? "POST" : "PATCH";
      const url = isCreate ? "/api/admin/restaurants" : `/api/admin/restaurants/${restaurantId}`;
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(true),
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      return isCreate ? res.json() : null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
      navigate("/admin/restaurants");
    },
  });

  return (
    <AdminLayout title={isCreate ? "New Restaurant" : "Edit Restaurant"}>
      <div className="bg-white border rounded-xl p-4 space-y-3">
        {(
          [
            ["name", "Name"],
            ["description", "Description"],
            ["imageUrl", "Image URL"],
            ["lat", "Latitude"],
            ["lng", "Longitude"],
            ["category", "Category"],
            ["rating", "Rating"],
            ["address", "Address"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className="text-xs text-muted-foreground">{label}</span>
            <input
              className="mt-1 w-full px-3 py-2 border rounded-lg"
              value={String(form[key])}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
            />
          </label>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="text-xs text-muted-foreground">Price Level</span>
            <input
              type="number"
              min={1}
              max={4}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
              value={form.priceLevel}
              onChange={(e) => setForm((prev) => ({ ...prev, priceLevel: Number(e.target.value) }))}
            />
          </label>
          <label>
            <span className="text-xs text-muted-foreground">Trending Score</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
              value={form.trendingScore}
              onChange={(e) => setForm((prev) => ({ ...prev, trendingScore: Number(e.target.value) }))}
            />
          </label>
        </div>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isNew}
            onChange={(e) => setForm((prev) => ({ ...prev, isNew: e.target.checked }))}
          />
          <span className="text-sm">Mark as New</span>
        </label>
        <div className="flex gap-2">
          <button className="px-3 py-2 border rounded-lg" onClick={() => navigate("/admin/restaurants")}>
            Cancel
          </button>
          <button
            className="px-3 py-2 rounded-lg bg-foreground text-white"
            onClick={() => mutation.mutate()}
          >
            Save
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
