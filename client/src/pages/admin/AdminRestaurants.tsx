import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import AdminLayout from "./AdminLayout";
import { getAuthHeaders } from "@/lib/auth";

type Restaurant = {
  id: number;
  name: string;
  category: string;
  address: string;
  rating: string;
  trendingScore?: number | null;
};

export default function AdminRestaurants() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["admin-restaurants", search],
    queryFn: async () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/admin/restaurants${qs}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load restaurants");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/restaurants/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-restaurants"] }),
  });

  return (
    <AdminLayout title="Restaurants">
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 px-3 py-2 border rounded-lg bg-white"
          placeholder="Search name/category/address"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="px-3 py-2 rounded-lg bg-foreground text-white" onClick={() => navigate("/admin/restaurants/new")}>
          New
        </button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading restaurants...</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Rating</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.category}</td>
                  <td className="px-3 py-2">{r.rating}</td>
                  <td className="px-3 py-2 flex gap-2">
                    <button className="px-2 py-1 border rounded" onClick={() => navigate(`/admin/restaurants/${r.id}`)}>
                      Edit
                    </button>
                    <button
                      className="px-2 py-1 border rounded text-red-600"
                      onClick={() => deleteMutation.mutate(r.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
