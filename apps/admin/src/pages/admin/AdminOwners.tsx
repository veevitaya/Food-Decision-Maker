import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2, Users, ClipboardCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Owner = {
  id: number;
  displayName: string;
  email: string;
  phone: string | null;
  restaurantId: number;
  isVerified: boolean;
  verificationStatus: string;
  subscriptionTier: string;
  createdAt: string;
};

type Claim = {
  id: number;
  ownerId: number;
  restaurantId: number;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  ownershipType: string;
  reviewNotes: string | null;
  restaurantName?: string;
  ownerName?: string;
  ownerEmail?: string;
};

export default function AdminOwners() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: owners = [], isLoading: ownersLoading } = useQuery<Owner[]>({
    queryKey: ["/api/admin/owners"],
    queryFn: async () => {
      const res = await fetch("/api/admin/owners", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load owners");
      return res.json();
    },
  });

  const { data: claims = [], isLoading: claimsLoading } = useQuery<Claim[]>({
    queryKey: ["/api/admin/claims"],
    queryFn: async () => {
      const res = await fetch("/api/admin/claims", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load claims");
      return res.json();
    },
  });

  const pendingClaims = useMemo(() => claims.filter((claim) => claim.status === "pending"), [claims]);

  const reviewMutation = useMutation({
    mutationFn: async ({ claimId, status }: { claimId: number; status: "approved" | "rejected" }) => {
      const res = await fetch(`/api/admin/claims/${claimId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update claim");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/claims"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/owners"] });
    },
  });

  const onReview = async (claimId: number, status: "approved" | "rejected") => {
    try {
      await reviewMutation.mutateAsync({ claimId, status });
      toast({ title: status === "approved" ? "Claim approved" : "Claim rejected" });
    } catch (err) {
      toast({ title: "Failed to update claim", description: String(err), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-owners-page">
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-[var(--admin-deep-purple)]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Owners</h2>
          <p className="text-xs text-muted-foreground">DB-backed owners and restaurant claim approvals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="owners-list-card">
          <h3 className="text-sm font-semibold mb-4">Registered Owners</h3>
          {ownersLoading ? (
            <p className="text-sm text-muted-foreground">Loading owners...</p>
          ) : owners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No owners yet.</p>
          ) : (
            <div className="space-y-2">
              {owners.map((owner) => (
                <div key={owner.id} className="rounded-xl border border-gray-100 p-3" data-testid={`owner-row-${owner.id}`}>
                  <p className="font-medium text-sm">{owner.displayName}</p>
                  <p className="text-xs text-muted-foreground">{owner.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Restaurant #{owner.restaurantId} · {owner.verificationStatus}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="claims-queue-card">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck className="w-4 h-4 text-[var(--admin-teal)]" />
            <h3 className="text-sm font-semibold">Pending Claims</h3>
          </div>
          {claimsLoading ? (
            <p className="text-sm text-muted-foreground">Loading claims...</p>
          ) : pendingClaims.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending claims.</p>
          ) : (
            <div className="space-y-3">
              {pendingClaims.map((claim) => (
                <div key={claim.id} className="rounded-xl border border-gray-100 p-3" data-testid={`claim-row-${claim.id}`}>
                  <p className="text-sm font-medium">{claim.ownerName ?? `Owner #${claim.ownerId}`}</p>
                  <p className="text-xs text-muted-foreground">{claim.ownerEmail ?? ""}</p>
                  <p className="text-xs text-muted-foreground mt-1">{claim.restaurantName ?? `Restaurant #${claim.restaurantId}`}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => onReview(claim.id, "approved")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 flex items-center gap-1"
                      data-testid={`approve-claim-${claim.id}`}
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Approve
                    </button>
                    <button
                      onClick={() => onReview(claim.id, "rejected")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 flex items-center gap-1"
                      data-testid={`reject-claim-${claim.id}`}
                      disabled={reviewMutation.isPending}
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
