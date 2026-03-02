import { useQuery } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { getAuthHeaders } from "@/lib/auth";

type Overview = {
  restaurantCount: number;
  profileCount: number;
  adminCount: number;
  topTrending: Array<{ id: number; name: string; trendingScore?: number | null }>;
};

export default function AdminDashboard() {
  const { data, isLoading } = useQuery<Overview>({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/overview", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load admin overview");
      return res.json();
    },
  });

  return (
    <AdminLayout title="Dashboard">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card label="Restaurants" value={String(data?.restaurantCount ?? 0)} />
            <Card label="Profiles" value={String(data?.profileCount ?? 0)} />
            <Card label="Admins" value={String(data?.adminCount ?? 0)} />
          </div>
          <section className="bg-white border rounded-xl p-4">
            <h2 className="font-semibold mb-3">Top Trending</h2>
            <div className="space-y-2">
              {(data?.topTrending ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">{item.trendingScore ?? 0}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
