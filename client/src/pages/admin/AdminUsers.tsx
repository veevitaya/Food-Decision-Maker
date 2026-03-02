import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { getAuthHeaders } from "@/lib/auth";

export default function AdminUsers() {
  const [lineUserId, setLineUserId] = useState("");
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ["admin-user-profile", lineUserId],
    enabled: false,
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(lineUserId)}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("User not found");
      return res.json();
    },
  });

  return (
    <AdminLayout title="User Lookup">
      <div className="bg-white border rounded-xl p-4">
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 px-3 py-2 border rounded-lg"
            placeholder="LINE user id"
            value={lineUserId}
            onChange={(e) => setLineUserId(e.target.value)}
          />
          <button className="px-3 py-2 rounded-lg bg-foreground text-white" onClick={() => refetch()}>
            Search
          </button>
        </div>
        {isFetching && <p className="text-sm text-muted-foreground">Searching...</p>}
        {error && <p className="text-sm text-red-600">User not found or request failed.</p>}
        {data && (
          <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </AdminLayout>
  );
}
