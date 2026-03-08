import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import AdminLayout from "./AdminLayout";

type Session = {
  id: number;
  code: string;
  status: string;
  memberCount: number;
  createdAt: string;
  settings?: { locations?: string[]; budget?: string; diet?: string[] } | null;
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  closed: "bg-muted text-muted-foreground",
  expired: "bg-red-100 text-red-700",
};

export default function AdminSessions() {
  const qc = useQueryClient();
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data = [], isLoading } = useQuery<Session[]>({
    queryKey: ["admin-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/sessions/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sessions"] });
      setConfirmId(null);
    },
  });

  const active = data.filter((s) => s.status === "active").length;
  const total = data.length;

  return (
    <AdminLayout title="Group Sessions">
      {confirmId !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl">
            <p className="font-semibold mb-1">Delete session?</p>
            <p className="text-sm text-muted-foreground mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-2 border rounded-lg text-sm" onClick={() => setConfirmId(null)}>Cancel</button>
              <button
                className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm"
                onClick={() => deleteMutation.mutate(confirmId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <div className="bg-white border rounded-xl px-4 py-3 text-center flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
          <p className="text-2xl font-semibold">{total}</p>
        </div>
        <div className="bg-white border rounded-xl px-4 py-3 text-center flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
          <p className="text-2xl font-semibold text-green-600">{active}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No group sessions yet.</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Code</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Members</th>
                <th className="text-left px-3 py-2 hidden sm:table-cell">Created</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((s) => (
                <>
                  <tr key={s.id} className="hover:bg-muted/10">
                    <td className="px-3 py-2 font-mono font-semibold tracking-widest">{s.code}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[s.status] ?? "bg-muted"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">{s.memberCount}</td>
                    <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground text-xs">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end">
                        {s.settings && (
                          <button
                            className="text-xs px-2 py-0.5 border rounded hover:bg-muted"
                            onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                          >
                            {expanded === s.id ? "Less" : "Info"}
                          </button>
                        )}
                        <button
                          className="text-xs px-2 py-0.5 border rounded text-red-600 hover:bg-red-50"
                          onClick={() => setConfirmId(s.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === s.id && s.settings && (
                    <tr key={`${s.id}-detail`} className="bg-muted/10">
                      <td colSpan={5} className="px-3 py-3 text-xs">
                        <div className="flex flex-wrap gap-4">
                          {s.settings.budget && <span>Budget: {s.settings.budget}</span>}
                          {s.settings.locations?.length && <span>Locations: {s.settings.locations.join(", ")}</span>}
                          {s.settings.diet?.length && <span>Diet: {s.settings.diet.join(", ")}</span>}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground px-3 py-2 border-t">{data.length} sessions</p>
        </div>
      )}
    </AdminLayout>
  );
}
