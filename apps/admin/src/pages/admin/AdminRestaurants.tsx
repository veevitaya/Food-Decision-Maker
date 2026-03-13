import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Pencil,
  Trash2,
  X,
  Star,
  Plus,
  Utensils,
  ChevronDown,
  ChevronRight,
  User,
  CreditCard,
  ShieldCheck,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  Building2,
  SquareCheck,
  Square,
  ExternalLink,
  Sparkles,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Restaurant, RestaurantOwner, RestaurantClaim } from "@shared/schema";
import { VIBE_TAGS, VIBE_LABELS, VIBE_EMOJI, BANGKOK_DISTRICTS } from "@shared/vibeConfig";

type VerificationChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

type EnrichedClaim = RestaurantClaim & {
  restaurantName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  restaurantAddress: string;
  restaurantCategory: string;
  restaurantImageUrl: string;
};

type TabMode = "restaurants" | "claims";

export default function AdminRestaurants() {
  const [search, setSearch] = useState("");
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [isNewMode, setIsNewMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabMode>("restaurants");

  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/admin/restaurants"],
  });

  const { data: owners = [] } = useQuery<RestaurantOwner[]>({
    queryKey: ["/api/admin/owners"],
  });

  const { data: claims = [] } = useQuery<EnrichedClaim[]>({
    queryKey: ["/api/admin/claims"],
  });

  const filtered = restaurants.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const pendingClaims = claims.filter((c) => c.status === "pending");

  const bulkAutoAssignMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/restaurants/auto-assign-vibes"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/restaurants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
      setDeleteTarget(null);
    },
  });

  const reviewClaimMutation = useMutation({
    mutationFn: ({ id, status, reviewNotes, verificationChecklist }: ReviewMutationArgs) =>
      apiRequest("PATCH", `/api/admin/claims/${id}`, { status, reviewNotes, verificationChecklist }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/owners"] });
    },
  });

  const getOwnerForRestaurant = (restaurantId: number): RestaurantOwner | undefined => {
    return owners.find((o) => o.restaurantId === restaurantId);
  };

  const openNew = () => {
    setIsNewMode(true);
    setEditingRestaurant({
      id: 0,
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
      ownerId: null,
      ownerClaimStatus: "unclaimed",
      paymentConnected: false,
      googlePlaceId: null,
      vibes: [],
      district: null,
      operatingHours: null,
    });
  };

  return (
    <div data-testid="admin-restaurants-page" className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Utensils className="w-5 h-5 text-orange-500" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("restaurants")}
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "restaurants"
                  ? "bg-foreground text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-restaurants"
            >
              Restaurants
              <span className="ml-1.5 inline-flex items-center justify-center bg-white/20 text-[10px] font-medium rounded-full px-1.5 py-0.5">
                {restaurants.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("claims")}
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "claims"
                  ? "bg-foreground text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-claims"
            >
              Claims Queue
              {pendingClaims.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center bg-amber-500 text-white text-[10px] font-medium rounded-full px-1.5 py-0.5">
                  {pendingClaims.length}
                </span>
              )}
            </button>
          </div>
        </div>
        {activeTab === "restaurants" && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl border-gray-100 focus-visible:ring-foreground/20"
                data-testid="input-search-restaurants"
              />
            </div>
            <button
              onClick={openNew}
              data-testid="button-add-restaurant"
              className="inline-flex items-center gap-1.5 bg-foreground hover:bg-foreground/90 text-white rounded-xl px-5 py-2 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
            <button
              onClick={() => bulkAutoAssignMutation.mutate()}
              disabled={bulkAutoAssignMutation.isPending}
              data-testid="button-auto-assign-all"
              className="inline-flex items-center gap-1.5 bg-[#FFCC02]/20 border border-[#FFCC02]/40 text-gray-800 rounded-xl px-5 py-2 text-sm font-medium transition-colors hover:bg-[#FFCC02]/30 disabled:opacity-50"
            >
              {bulkAutoAssignMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {bulkAutoAssignMutation.isPending ? "Assigning..." : "Auto-Assign All"}
            </button>
          </div>
        )}
      </div>

      {activeTab === "restaurants" ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" data-testid="table-restaurants">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="w-8"></th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Image</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Name</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Category</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Price</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Rating</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Vibes</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">District</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Owner</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Claim</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Payment</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-muted-foreground">
                      Loading restaurants...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-muted-foreground">
                      No restaurants found
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const owner = getOwnerForRestaurant(r.id);
                    const isExpanded = expandedRow === r.id;
                    return (
                      <>
                        <tr
                          key={r.id}
                          className="border-b border-gray-100 transition-colors hover:bg-gray-50 cursor-pointer"
                          data-testid={`row-restaurant-${r.id}`}
                          onClick={() => setExpandedRow(isExpanded ? null : r.id)}
                        >
                          <td className="pl-3 py-3">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <img
                              src={r.imageUrl}
                              alt={r.name}
                              className="w-12 h-12 rounded-xl object-cover"
                              data-testid={`img-restaurant-${r.id}`}
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground" data-testid={`text-restaurant-name-${r.id}`}>
                            {r.name}
                            {r.isNew && (
                              <span className="ml-2 inline-flex items-center bg-[#FFCC02] text-foreground text-[10px] font-semibold rounded-full px-2 py-0.5">NEW</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground" data-testid={`text-restaurant-category-${r.id}`}>
                            {r.category}
                          </td>
                          <td className="px-4 py-3 text-foreground" data-testid={`text-restaurant-price-${r.id}`}>
                            {"฿".repeat(r.priceLevel)}
                          </td>
                          <td className="px-4 py-3" data-testid={`text-restaurant-rating-${r.id}`}>
                            <span className="flex items-center gap-1 text-foreground">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              {r.rating}
                            </span>
                          </td>
                          <td className="px-4 py-3" data-testid={`text-restaurant-vibes-${r.id}`}>
                            {(r.vibes && r.vibes.length > 0) ? (
                              <Badge variant="secondary" className="bg-[#FFCC02]/20 border border-[#FFCC02]/40 text-gray-800 text-[10px]">
                                {r.vibes.length} vibes
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/50 text-xs">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-sm" data-testid={`text-restaurant-district-${r.id}`}>
                            {r.district || <span className="text-muted-foreground/50 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3" data-testid={`text-restaurant-owner-${r.id}`}>
                            {owner ? (
                              <span className="flex items-center gap-1.5 text-sm text-foreground">
                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="truncate max-w-[100px]">{owner.displayName}</span>
                                {owner.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50 text-xs">No owner</span>
                            )}
                          </td>
                          <td className="px-4 py-3" data-testid={`text-restaurant-claim-${r.id}`}>
                            <ClaimStatusBadge status={r.ownerClaimStatus || "unclaimed"} />
                          </td>
                          <td className="px-4 py-3" data-testid={`text-restaurant-payment-${r.id}`}>
                            {r.paymentConnected ? (
                              <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                                <CreditCard className="w-3.5 h-3.5" />
                                Connected
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50 text-xs">Not connected</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setIsNewMode(false);
                                  setEditingRestaurant({ ...r });
                                }}
                                data-testid={`button-edit-restaurant-${r.id}`}
                              >
                                <Pencil className="w-4 h-4 text-muted-foreground" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteTarget(r)}
                                data-testid={`button-delete-restaurant-${r.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`expanded-${r.id}`} className="border-b border-gray-100">
                            <td colSpan={12} className="px-6 py-4 bg-gray-50/50">
                              <ExpandedRowDetails restaurant={r} owner={owner} claims={claims} />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <ClaimsQueue claims={claims} onReview={reviewClaimMutation} />
      )}

      {editingRestaurant && (
        <EditPanel
          restaurant={editingRestaurant}
          isNew={isNewMode}
          owners={owners}
          claims={claims}
          onClose={() => {
            setEditingRestaurant(null);
            setIsNewMode(false);
          }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-title" className="text-foreground">Delete Restaurant</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-description" className="text-muted-foreground">
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete" className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              data-testid="button-confirm-delete"
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClaimStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px]">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px]">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-700 text-[10px]">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return (
        <span className="text-muted-foreground/50 text-xs">Unclaimed</span>
      );
  }
}

function ExpandedRowDetails({
  restaurant,
  owner,
  claims,
}: {
  restaurant: Restaurant;
  owner?: RestaurantOwner;
  claims: EnrichedClaim[];
}) {
  const restaurantClaims = claims.filter((c) => c.restaurantId === restaurant.id);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid={`expanded-details-${restaurant.id}`}>
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <User className="w-4 h-4 text-muted-foreground" />
          Owner Info
        </div>
        {owner ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{owner.displayName}</span>
              {owner.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5" />
              <span data-testid={`text-owner-email-${restaurant.id}`}>{owner.email}</span>
            </div>
            {owner.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span data-testid={`text-owner-phone-${restaurant.id}`}>{owner.phone}</span>
              </div>
            )}
            {owner.lineUserId && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="w-3.5 h-3.5" />
                <span data-testid={`text-owner-line-${restaurant.id}`}>{owner.lineUserId}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/60">No owner linked</p>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Claim Status
        </div>
        <div className="space-y-2">
          <ClaimStatusBadge status={restaurant.ownerClaimStatus || "unclaimed"} />
          {restaurantClaims.length > 0 ? (
            <div className="space-y-1.5 mt-2">
              {restaurantClaims.map((c) => (
                <div key={c.id} className="text-xs text-muted-foreground border border-gray-100 rounded-lg p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span>Claim #{c.id} by {c.ownerName}</span>
                    <ClaimStatusBadge status={c.status || "pending"} />
                  </div>
                  {c.proofDocuments && c.proofDocuments.length > 0 && (
                    <div className="mt-1 text-muted-foreground/60">
                      {c.proofDocuments.length} document(s) attached
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/60 mt-1">No claims submitted</p>
          )}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          Payment Info
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Payment Connected</span>
            {restaurant.paymentConnected ? (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px]">
                Yes
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">No</Badge>
            )}
          </div>
          {owner && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subscription</span>
                <Badge variant="secondary" className={`text-[10px] capitalize ${
                  owner.subscriptionTier === "premium"
                    ? "bg-amber-100 text-amber-700"
                    : owner.subscriptionTier === "pro"
                    ? "bg-blue-100 text-blue-700"
                    : ""
                }`}>
                  {owner.subscriptionTier || "free"}
                </Badge>
              </div>
              {owner.subscriptionExpiry && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Expiry</span>
                  <span className="text-foreground text-xs">{new Date(owner.subscriptionExpiry).toLocaleDateString()}</span>
                </div>
              )}
              {owner.paymentMethod && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="text-foreground text-xs capitalize">{owner.paymentMethod}</span>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

type ReviewMutationArgs = { id: number; status: string; reviewNotes?: string; verificationChecklist?: VerificationChecklistItem[] };

function OwnershipTypeBadge({ type }: { type: string | null | undefined }) {
  const labels: Record<string, string> = {
    single_location: "Single Location",
    franchise_owner: "Franchise Owner (All)",
    franchisee: "Franchisee (Single)",
  };
  return (
    <Badge variant="secondary" className="text-[10px]">
      <Building2 className="w-3 h-3 mr-1" />
      {labels[type || ""] || "Single Location"}
    </Badge>
  );
}

function ClaimsQueue({
  claims,
  onReview,
}: {
  claims: EnrichedClaim[];
  onReview: { mutate: (args: ReviewMutationArgs) => void; isPending: boolean };
}) {
  const [expandedClaim, setExpandedClaim] = useState<number | null>(null);

  const sortedClaims = [...claims].sort((a, b) => {
    const order: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
    return (order[a.status || "pending"] || 0) - (order[b.status || "pending"] || 0);
  });

  return (
    <div className="space-y-4" data-testid="claims-queue">
      {sortedClaims.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No claims submitted yet</p>
        </Card>
      ) : (
        sortedClaims.map((claim) => (
          <ClaimReviewCard
            key={claim.id}
            claim={claim}
            isExpanded={expandedClaim === claim.id}
            onToggle={() => setExpandedClaim(expandedClaim === claim.id ? null : claim.id)}
            onReview={onReview}
          />
        ))
      )}
    </div>
  );
}

function EditPanel({
  restaurant,
  isNew,
  owners,
  claims,
  onClose,
}: {
  restaurant: Restaurant;
  isNew: boolean;
  owners: RestaurantOwner[];
  claims: EnrichedClaim[];
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...restaurant });
  const [activeSection, setActiveSection] = useState<"details" | "owner" | "claim" | "payment">("details");

  const owner = owners.find((o) => o.restaurantId === restaurant.id);
  const restaurantClaims = claims.filter((c) => c.restaurantId === restaurant.id);

  const reviewClaimMutation = useMutation({
    mutationFn: ({ id, status, reviewNotes, verificationChecklist }: ReviewMutationArgs) =>
      apiRequest("PATCH", `/api/admin/claims/${id}`, { status, reviewNotes, verificationChecklist }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/owners"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Restaurant>) =>
      apiRequest("PATCH", `/api/admin/restaurants/${restaurant.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
      onClose();
    },
  });

  const autoAssignVibesMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/restaurants/${restaurant.id}/auto-assign-vibes`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
      const updatedRestaurants = queryClient.getQueryData<Restaurant[]>(["/api/admin/restaurants"]);
      const updated = updatedRestaurants?.find((r) => r.id === restaurant.id);
      if (updated) {
        setForm((prev) => ({ ...prev, vibes: updated.vibes || [], district: updated.district, operatingHours: updated.operatingHours }));
      }
    },
  });

  const update = (field: keyof Restaurant, value: string | number | boolean | null | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleVibe = (vibe: string) => {
    setForm((prev) => {
      const current = prev.vibes || [];
      const next = current.includes(vibe)
        ? current.filter((v) => v !== vibe)
        : [...current, vibe];
      return { ...prev, vibes: next };
    });
  };

  const handleSave = () => {
    const { id, ...rest } = form;
    saveMutation.mutate(rest);
  };

  const sections = [
    { key: "details" as const, label: "Details" },
    ...(!isNew ? [
      { key: "owner" as const, label: "Owner" },
      { key: "claim" as const, label: "Claims" },
      { key: "payment" as const, label: "Payment" },
    ] : []),
  ];

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex"
      data-testid="panel-edit-restaurant"
    >
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      <div className="relative ml-auto w-[460px] h-full bg-white rounded-l-2xl shadow-xl overflow-y-auto">
        <div className="h-1 rounded-tl-2xl" style={{ backgroundColor: "var(--admin-blue)" }} />
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <h2 className="font-semibold text-foreground text-[15px]" data-testid="text-panel-title">
              {isNew ? "Add Restaurant" : "Edit Restaurant"}
            </h2>
            <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-panel">
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
          {sections.length > 1 && (
            <div className="flex px-6 gap-1 pb-3">
              {sections.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    activeSection === s.key
                      ? "bg-foreground text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-gray-50"
                  }`}
                  data-testid={`button-section-${s.key}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          {activeSection === "details" && (
            <>
              <Field label="Name">
                <Input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="rounded-xl border-gray-100 focus-visible:ring-foreground/20"
                  data-testid="input-edit-name"
                />
              </Field>
              <Field label="Description">
                <Input
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className="rounded-xl border-gray-100 focus-visible:ring-foreground/20"
                  data-testid="input-edit-description"
                />
              </Field>
              <Field label="Image URL">
                <Input
                  value={form.imageUrl}
                  onChange={(e) => update("imageUrl", e.target.value)}
                  className="rounded-xl border-gray-100 focus-visible:ring-foreground/20"
                  data-testid="input-edit-imageUrl"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude">
                  <Input
                    value={form.lat}
                    onChange={(e) => update("lat", e.target.value)}
                    className="rounded-xl border-gray-100 focus-visible:ring-foreground/20"
                    data-testid="input-edit-lat"
                  />
                </Field>
                <Field label="Longitude">
                  <Input
                    value={form.lng}
                    onChange={(e) => update("lng", e.target.value)}
                    className="rounded-xl border-gray-100 focus-visible:ring-foreground/20"
                    data-testid="input-edit-lng"
                  />
                </Field>
              </div>
              <Field label="Category">
                <Input
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  className="rounded-xl border-gray-100 focus-visible:ring-foreground/20"
                  data-testid="input-edit-category"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price Level (1-4)">
                  <Input
                    type="number"
                    min={1}
                    max={4}
                    value={form.priceLevel}
                    onChange={(e) => update("priceLevel", parseInt(e.target.value) || 1)}
                    className="rounded-xl border-gray-100 focus-visible:ring-foreground/20"
                    data-testid="input-edit-priceLevel"
                  />
                </Field>
                <Field label="Rating">
                  <Input
                    value={form.rating}
                    onChange={(e) => update("rating", e.target.value)}
                    className="rounded-xl border-gray-100 focus-visible:ring-foreground/20"
                    data-testid="input-edit-rating"
                  />
                </Field>
              </div>
              <Field label="Address">
                <Input
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  className="rounded-xl border-gray-100 focus-visible:ring-foreground/20"
                  data-testid="input-edit-address"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Trending Score">
                  <Input
                    type="number"
                    value={form.trendingScore ?? 0}
                    onChange={(e) => update("trendingScore", parseInt(e.target.value) || 0)}
                    className="rounded-xl border-gray-100 focus-visible:ring-foreground/20"
                    data-testid="input-edit-trendingScore"
                  />
                </Field>
                <Field label="Is New">
                  <div className="flex items-center h-9 gap-2">
                    <input
                      type="checkbox"
                      checked={!!form.isNew}
                      onChange={(e) => update("isNew", e.target.checked)}
                      className="w-4 h-4 rounded border-gray-100 text-foreground focus:ring-foreground/20"
                      data-testid="input-edit-isNew"
                    />
                    <span className="text-sm text-foreground">{form.isNew ? "Yes" : "No"}</span>
                  </div>
                </Field>
              </div>

              <Field label="District">
                <select
                  value={form.district || ""}
                  onChange={(e) => update("district", e.target.value || null)}
                  className="w-full rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  data-testid="select-edit-district"
                >
                  <option value="">Select district...</option>
                  {BANGKOK_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Field>

              <Field label="Operating Hours">
                <Input
                  value={form.operatingHours || ""}
                  onChange={(e) => update("operatingHours", e.target.value || null)}
                  placeholder="e.g. 09:00-22:00"
                  className="rounded-xl border-gray-100 focus-visible:ring-foreground/20"
                  data-testid="input-edit-operatingHours"
                />
              </Field>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Vibes</Label>
                  {!isNew && (
                    <button
                      onClick={() => autoAssignVibesMutation.mutate()}
                      disabled={autoAssignVibesMutation.isPending}
                      className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 transition-colors hover:bg-gray-100 disabled:opacity-50"
                      data-testid="button-auto-assign-vibes"
                    >
                      {autoAssignVibesMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      Auto-Assign
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5" data-testid="vibes-picker">
                  {VIBE_TAGS.map((vibe) => {
                    const isActive = (form.vibes || []).includes(vibe);
                    return (
                      <button
                        key={vibe}
                        type="button"
                        onClick={() => toggleVibe(vibe)}
                        className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                          isActive
                            ? "bg-[#FFCC02]/20 border-[#FFCC02]/40 text-gray-800"
                            : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100"
                        }`}
                        data-testid={`button-vibe-${vibe}`}
                      >
                        <span>{VIBE_EMOJI[vibe]}</span>
                        <span>{VIBE_LABELS[vibe]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3">
                <button
                  className="w-full bg-foreground hover:bg-foreground/90 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-restaurant"
                >
                  {saveMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </>
          )}

          {activeSection === "owner" && (
            <div className="space-y-4" data-testid="section-owner-info">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Owner Information
              </div>
              {owner ? (
                <Card className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-foreground">
                      {owner.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground" data-testid="text-panel-owner-name">{owner.displayName}</span>
                        {owner.isVerified && (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px]">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">{owner.verificationStatus}</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <span data-testid="text-panel-owner-email">{owner.email}</span>
                    </div>
                    {owner.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span data-testid="text-panel-owner-phone">{owner.phone}</span>
                      </div>
                    )}
                    {owner.lineUserId && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span data-testid="text-panel-owner-line">LINE: {owner.lineUserId}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="p-6 text-center">
                  <User className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No owner linked to this restaurant</p>
                </Card>
              )}
            </div>
          )}

          {activeSection === "claim" && (
            <div className="space-y-4" data-testid="section-claim-status">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Claim Status
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-muted-foreground">Current status:</span>
                <ClaimStatusBadge status={restaurant.ownerClaimStatus || "unclaimed"} />
              </div>
              {restaurantClaims.length > 0 ? (
                restaurantClaims.map((claim) => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    onReview={reviewClaimMutation}
                  />
                ))
              ) : (
                <Card className="p-6 text-center">
                  <FileText className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No claims submitted for this restaurant</p>
                </Card>
              )}
            </div>
          )}

          {activeSection === "payment" && (
            <div className="space-y-4" data-testid="section-payment-info">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                Payment Information
              </div>
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Payment Connected</span>
                  {restaurant.paymentConnected ? (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px]">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </div>
                {owner && (
                  <>
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Subscription Tier</span>
                        <Badge variant="secondary" className={`text-[10px] capitalize ${
                          owner.subscriptionTier === "premium"
                            ? "bg-amber-100 text-amber-700"
                            : owner.subscriptionTier === "pro"
                            ? "bg-blue-100 text-blue-700"
                            : ""
                        }`} data-testid="text-subscription-tier">
                          {owner.subscriptionTier || "free"}
                        </Badge>
                      </div>
                      {owner.subscriptionExpiry && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Expiry Date</span>
                          <span className="text-sm text-foreground" data-testid="text-subscription-expiry">
                            {new Date(owner.subscriptionExpiry).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {owner.paymentMethod && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Payment Method</span>
                          <span className="text-sm text-foreground capitalize" data-testid="text-payment-method">
                            {owner.paymentMethod}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClaimReviewCard({
  claim,
  isExpanded,
  onToggle,
  onReview,
}: {
  claim: EnrichedClaim;
  isExpanded: boolean;
  onToggle: () => void;
  onReview: { mutate: (args: ReviewMutationArgs) => void; isPending: boolean };
}) {
  const [reviewNotes, setReviewNotes] = useState("");
  const existingChecklist = (claim.verificationChecklist as VerificationChecklistItem[] | null) || [];
  const [checklist, setChecklist] = useState<VerificationChecklistItem[]>(
    existingChecklist.length > 0 ? existingChecklist : []
  );

  const checkedCount = checklist.filter((item) => item.checked).length;
  const totalCount = checklist.length;
  const verificationScore = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleReview = (status: string) => {
    onReview.mutate({
      id: claim.id,
      status,
      reviewNotes: reviewNotes || undefined,
      verificationChecklist: checklist.length > 0 ? checklist : undefined,
    });
  };

  return (
    <Card className="overflow-visible" data-testid={`card-claim-${claim.id}`}>
      <div
        className="flex items-center justify-between gap-4 p-5 cursor-pointer flex-wrap"
        onClick={onToggle}
        data-testid={`button-toggle-claim-${claim.id}`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
          {claim.restaurantImageUrl && (
            <img
              src={claim.restaurantImageUrl}
              alt={claim.restaurantName}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              data-testid={`img-claim-restaurant-${claim.id}`}
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground text-sm" data-testid={`text-claim-restaurant-${claim.id}`}>
                {claim.restaurantName}
              </span>
              <ClaimStatusBadge status={claim.status || "pending"} />
              <OwnershipTypeBadge type={claim.ownershipType} />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {claim.ownerName}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(claim.submittedAt).toLocaleDateString()}
              </span>
              {totalCount > 0 && (
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {verificationScore}% verified
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 p-5 space-y-5" data-testid={`expanded-claim-${claim.id}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Utensils className="w-4 h-4 text-muted-foreground" />
                Restaurant Details
              </div>
              <div className="space-y-2 text-sm">
                <div className="font-medium text-foreground" data-testid={`text-claim-detail-name-${claim.id}`}>
                  {claim.restaurantName}
                </div>
                {claim.restaurantAddress && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span data-testid={`text-claim-detail-address-${claim.id}`}>{claim.restaurantAddress}</span>
                  </div>
                )}
                {claim.restaurantCategory && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Utensils className="w-3.5 h-3.5 flex-shrink-0" />
                    <span data-testid={`text-claim-detail-category-${claim.id}`}>{claim.restaurantCategory}</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <User className="w-4 h-4 text-muted-foreground" />
                Owner Details
              </div>
              <div className="space-y-2 text-sm">
                <div className="font-medium text-foreground" data-testid={`text-claim-owner-name-${claim.id}`}>
                  {claim.ownerName}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span data-testid={`text-claim-owner-email-${claim.id}`}>{claim.ownerEmail}</span>
                </div>
                {claim.ownerPhone && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span data-testid={`text-claim-owner-phone-${claim.id}`}>{claim.ownerPhone}</span>
                  </div>
                )}
                <div className="mt-1">
                  <OwnershipTypeBadge type={claim.ownershipType} />
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Submitted Documents
              </div>
              {claim.proofDocuments && claim.proofDocuments.length > 0 ? (
                <div className="space-y-1.5">
                  {claim.proofDocuments.map((doc, i) => (
                    <a
                      key={i}
                      href={doc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                      data-testid={`link-claim-doc-${claim.id}-${i}`}
                    >
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate flex-1">Document {i + 1}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60">No documents attached</p>
              )}
            </Card>
          </div>

          {totalCount > 0 && (
            <Card className="p-4 space-y-3" data-testid={`checklist-claim-${claim.id}`}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                  Verification Checklist
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold ${
                    verificationScore >= 80 ? "text-emerald-600" :
                    verificationScore >= 50 ? "text-amber-600" :
                    "text-red-600"
                  }`} data-testid={`text-verification-score-${claim.id}`}>
                    {verificationScore}% Complete
                  </span>
                  <div className="w-24">
                    <Progress
                      value={verificationScore}
                      className="h-1.5"
                      data-testid={`progress-verification-${claim.id}`}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {checklist.map((item) => (
                  <button
                    key={item.id}
                    className="flex items-center gap-3 w-full text-left py-1.5 px-2 rounded-lg transition-colors hover:bg-gray-50"
                    onClick={() => toggleChecklistItem(item.id)}
                    disabled={claim.status !== "pending"}
                    data-testid={`checklist-item-${claim.id}-${item.id}`}
                  >
                    {item.checked ? (
                      <SquareCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${item.checked ? "text-foreground" : "text-muted-foreground"}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {claim.reviewNotes && claim.status !== "pending" && (
            <div className="text-sm text-muted-foreground bg-gray-50 rounded-lg p-3" data-testid={`text-existing-review-notes-${claim.id}`}>
              <span className="font-medium text-foreground">Review Notes:</span> {claim.reviewNotes}
            </div>
          )}

          {claim.status === "pending" && (
            <Card className="p-4 space-y-3" data-testid={`review-actions-${claim.id}`}>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Review Decision
              </div>
              <Textarea
                placeholder="Add review notes or reason for decision..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="rounded-xl border-gray-100 text-sm resize-none"
                rows={3}
                data-testid={`input-review-notes-${claim.id}`}
              />
              <div className="flex items-center gap-3">
                <Button
                  variant="default"
                  className="flex-1 bg-emerald-600 text-white rounded-xl"
                  onClick={() => handleReview("approved")}
                  disabled={onReview.isPending}
                  data-testid={`button-approve-claim-${claim.id}`}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Approve Claim
                </Button>
                <Button
                  variant="default"
                  className="flex-1 bg-red-500 text-white rounded-xl"
                  onClick={() => handleReview("rejected")}
                  disabled={onReview.isPending}
                  data-testid={`button-reject-claim-${claim.id}`}
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Reject Claim
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </Card>
  );
}

function ClaimCard({
  claim,
  onReview,
}: {
  claim: EnrichedClaim;
  onReview: { mutate: (args: ReviewMutationArgs) => void; isPending: boolean };
}) {
  const [notes, setNotes] = useState("");

  return (
    <Card className="p-4 space-y-3" data-testid={`panel-claim-${claim.id}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-sm font-medium text-foreground">Claim #{claim.id}</span>
          <span className="text-xs text-muted-foreground ml-2">by {claim.ownerName}</span>
        </div>
        <ClaimStatusBadge status={claim.status || "pending"} />
      </div>
      <div className="text-xs text-muted-foreground">
        Submitted {new Date(claim.submittedAt).toLocaleDateString()}
      </div>
      {claim.ownershipType && (
        <div className="mt-1">
          <OwnershipTypeBadge type={claim.ownershipType} />
        </div>
      )}
      {claim.proofDocuments && claim.proofDocuments.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Proof Documents:</span>
          <div className="flex flex-wrap gap-1.5">
            {claim.proofDocuments.map((doc, i) => (
              <a
                key={i}
                href={doc}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 underline bg-blue-50 px-2 py-1 rounded-lg"
                data-testid={`link-panel-claim-doc-${claim.id}-${i}`}
              >
                Document {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}
      {claim.reviewNotes && (
        <div className="text-xs text-muted-foreground bg-gray-50 rounded-lg p-2">
          Review notes: {claim.reviewNotes}
        </div>
      )}
      {claim.status === "pending" && (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <Input
            placeholder="Review notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl border-gray-100 text-sm"
            data-testid={`input-panel-review-notes-${claim.id}`}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              className="flex-1 bg-emerald-600 text-white rounded-xl text-xs"
              onClick={() => onReview.mutate({ id: claim.id, status: "approved", reviewNotes: notes })}
              disabled={onReview.isPending}
              data-testid={`button-panel-approve-${claim.id}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Approve
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-red-500 text-white rounded-xl text-xs"
              onClick={() => onReview.mutate({ id: claim.id, status: "rejected", reviewNotes: notes })}
              disabled={onReview.isPending}
              data-testid={`button-panel-reject-${claim.id}`}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{label}</Label>
      {children}
    </div>
  );
}
