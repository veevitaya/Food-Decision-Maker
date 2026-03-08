import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getAdminSession } from "./AdminLayout";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Store,
  Eye,
  Heart,
  Bookmark,
  ExternalLink,
  ShieldCheck,
  Clock,
  AlertCircle,
  Crown,
  MapPin,
  Star,
  Megaphone,
  CreditCard,
  Search,
  FileText,
  Send,
  X,
  ChevronRight,
} from "lucide-react";

interface OwnerDashboardData {
  owner: {
    id: number;
    email: string;
    displayName: string;
    phone: string | null;
    restaurantId: number | null;
    isVerified: boolean;
    verificationStatus: string;
    subscriptionTier: string;
    subscriptionExpiry: string | null;
  };
  restaurant: {
    id: number;
    name: string;
    category: string;
    address: string;
    imageUrl: string;
    rating: string;
    priceLevel: number;
    ownerClaimStatus: string | null;
  } | null;
  campaigns: any[];
  claims: any[];
  stats: {
    views: number;
    likes: number;
    saves: number;
    deliveryTaps: number;
  };
}

interface SearchRestaurant {
  id: number;
  name: string;
  category: string;
  address: string;
  imageUrl: string;
  rating: string;
  priceLevel: number;
}

function getOwnerHeaders() {
  const session = getAdminSession();
  if (!session || session.sessionType !== "owner") return {};
  return { "x-owner-token": btoa(`${session.email}:`) };
}

export default function AdminOwnerDashboard() {
  const session = getAdminSession();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<SearchRestaurant | null>(null);
  const [claimFormOpen, setClaimFormOpen] = useState(false);
  const [docUrls, setDocUrls] = useState(["", "", ""]);
  const [ownershipType, setOwnershipType] = useState("single_location");
  const [claimNotes, setClaimNotes] = useState("");

  const { data, isLoading } = useQuery<OwnerDashboardData>({
    queryKey: ["/api/admin/owner/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/owner/dashboard", {
        headers: getOwnerHeaders() as Record<string, string>,
      });
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
    enabled: session?.sessionType === "owner",
  });

  const { data: searchResults, isFetching: isSearching } = useQuery<SearchRestaurant[]>({
    queryKey: ["/api/admin/owner/search-restaurants", searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/admin/owner/search-restaurants?q=${encodeURIComponent(searchQuery)}`, {
        headers: getOwnerHeaders() as Record<string, string>,
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: session?.sessionType === "owner" && searchQuery.length >= 2,
  });

  const submitClaimMutation = useMutation({
    mutationFn: async (claimData: {
      restaurantId: number;
      ownerId: number;
      proofDocuments: string[];
      ownershipType: string;
      notes: string;
    }) => {
      const res = await apiRequest("POST", "/api/admin/claims", claimData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Claim submitted", description: "Your claim has been submitted for review." });
      setClaimFormOpen(false);
      setSelectedRestaurant(null);
      setDocUrls(["", "", ""]);
      setOwnershipType("single_location");
      setClaimNotes("");
      setSearchQuery("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/owner/dashboard"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit claim. Please try again.", variant: "destructive" });
    },
  });

  const handleSubmitClaim = () => {
    if (!selectedRestaurant || !data?.owner) return;
    const proofDocs = docUrls.filter(u => u.trim().length > 0);
    submitClaimMutation.mutate({
      restaurantId: selectedRestaurant.id,
      ownerId: data.owner.id,
      proofDocuments: proofDocs,
      ownershipType,
      notes: claimNotes,
    });
  };

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground" data-testid="text-access-denied">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="owner-dashboard-loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  const owner = data?.owner;
  const restaurant = data?.restaurant;
  const stats = data?.stats || { views: 0, likes: 0, saves: 0, deliveryTaps: 0 };
  const campaigns = data?.campaigns || [];
  const claims = data?.claims || [];

  const verificationStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"><ShieldCheck className="w-3 h-3" />Verified</span>;
      case "pending":
        return <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600"><Clock className="w-3 h-3" />Pending</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 bg-red-50 dark:bg-red-500/10 text-red-500"><AlertCircle className="w-3 h-3" />Not Verified</span>;
    }
  };

  const tierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      free: "bg-gray-100 dark:bg-muted text-muted-foreground",
      basic: "bg-blue-50 dark:bg-blue-500/10 text-blue-600",
      premium: "bg-purple-50 dark:bg-purple-500/10 text-purple-600",
      enterprise: "bg-amber-50 dark:bg-amber-500/10 text-amber-600",
    };
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 ${colors[tier] || colors.free}`}>
        <Crown className="w-3 h-3" />
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </span>
    );
  };

  return (
    <div data-testid="admin-owner-dashboard" className="space-y-6">
      <div className="flex items-center gap-3">
        <Store className="w-5 h-5 text-emerald-500" />
        <div>
          <h2 className="text-xl font-semibold text-foreground" data-testid="text-owner-title">
            My Restaurant
          </h2>
          <p className="text-xs text-muted-foreground">Manage your restaurant profile and campaigns</p>
        </div>
      </div>

      {restaurant ? (
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border overflow-hidden" data-testid="card-restaurant-info">
          <div className="relative h-48 overflow-hidden">
            <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover" data-testid="img-restaurant-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-6 text-white">
              <h3 className="text-xl font-bold" data-testid="text-restaurant-name">{restaurant.name}</h3>
              <p className="text-sm opacity-90 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{restaurant.address}</p>
            </div>
            <div className="absolute top-4 right-4 flex gap-2">
              {verificationStatusBadge(owner?.verificationStatus || "pending")}
              {tierBadge(owner?.subscriptionTier || "free")}
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-muted-foreground">{restaurant.category}</span>
              <span className="flex items-center gap-1 text-sm"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{restaurant.rating}</span>
              <span className="text-sm text-muted-foreground">{"฿".repeat(restaurant.priceLevel)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-8 text-center" data-testid="card-no-restaurant">
          <Store className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground mb-1">No restaurant linked to your account yet</p>
          <p className="text-xs text-muted-foreground/60">Search and claim your restaurant below</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-owner-stats">
        <StatCard icon={<Eye className="w-4 h-4 text-blue-500" />} label="Views" value={stats.views} gradient="linear-gradient(135deg, hsl(200,50%,92%) 0%, hsl(210,45%,85%) 100%)" />
        <StatCard icon={<Heart className="w-4 h-4 text-rose-500" />} label="Likes" value={stats.likes} gradient="linear-gradient(135deg, hsl(350,50%,92%) 0%, hsl(340,45%,85%) 100%)" />
        <StatCard icon={<Bookmark className="w-4 h-4 text-amber-500" />} label="Saves" value={stats.saves} gradient="linear-gradient(135deg, hsl(35,80%,92%) 0%, hsl(40,70%,85%) 100%)" />
        <StatCard icon={<ExternalLink className="w-4 h-4 text-emerald-500" />} label="Delivery Taps" value={stats.deliveryTaps} gradient="linear-gradient(135deg, hsl(160,50%,90%) 0%, hsl(170,45%,83%) 100%)" />
      </div>

      <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="section-claim-restaurant">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-foreground" />
          <h3 className="text-[15px] font-semibold text-foreground">Claim a Restaurant</h3>
        </div>

        {claimFormOpen && selectedRestaurant ? (
          <div className="space-y-4" data-testid="claim-form">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-border bg-gray-50 dark:bg-muted">
              <img
                src={selectedRestaurant.imageUrl}
                alt={selectedRestaurant.name}
                className="w-14 h-14 rounded-lg object-cover"
                data-testid="img-claim-restaurant"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate" data-testid="text-claim-restaurant-name">{selectedRestaurant.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedRestaurant.address}</p>
                <p className="text-xs text-muted-foreground">{selectedRestaurant.category}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { setClaimFormOpen(false); setSelectedRestaurant(null); }}
                data-testid="button-cancel-claim"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ownership Type</label>
                <Select value={ownershipType} onValueChange={setOwnershipType}>
                  <SelectTrigger data-testid="select-ownership-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_location">Single Location Owner</SelectItem>
                    <SelectItem value="franchise_owner">Franchise Owner (All Locations)</SelectItem>
                    <SelectItem value="franchisee">Franchisee (Single Location)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  <FileText className="w-3 h-3 inline mr-1" />
                  Business Registration Document URL
                </label>
                <Input
                  placeholder="https://example.com/business-registration.pdf"
                  value={docUrls[0]}
                  onChange={(e) => setDocUrls([e.target.value, docUrls[1], docUrls[2]])}
                  data-testid="input-doc-registration"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  <FileText className="w-3 h-3 inline mr-1" />
                  Ownership Proof URL
                </label>
                <Input
                  placeholder="https://example.com/ownership-proof.pdf"
                  value={docUrls[1]}
                  onChange={(e) => setDocUrls([docUrls[0], e.target.value, docUrls[2]])}
                  data-testid="input-doc-ownership"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  <FileText className="w-3 h-3 inline mr-1" />
                  Photo ID URL
                </label>
                <Input
                  placeholder="https://example.com/photo-id.pdf"
                  value={docUrls[2]}
                  onChange={(e) => setDocUrls([docUrls[0], docUrls[1], e.target.value])}
                  data-testid="input-doc-id"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Additional Notes</label>
                <Input
                  placeholder="Any additional information..."
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  data-testid="input-claim-notes"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmitClaim}
                disabled={submitClaimMutation.isPending}
                data-testid="button-submit-claim"
              >
                {submitClaimMutation.isPending ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Claim
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search restaurants by name, address, or cuisine..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-restaurants"
              />
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
              </div>
            )}

            {searchResults && searchResults.length > 0 && searchQuery.length >= 2 && (
              <div className="space-y-2 max-h-80 overflow-y-auto" data-testid="search-results">
                {searchResults.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-border cursor-pointer hover-elevate"
                    onClick={() => { setSelectedRestaurant(r); setClaimFormOpen(true); }}
                    data-testid={`search-result-${r.id}`}
                  >
                    <img
                      src={r.imageUrl}
                      alt={r.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{r.address}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{r.category}</span>
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{r.rating}
                        </span>
                        <span className="text-xs text-muted-foreground">{"฿".repeat(r.priceLevel)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}

            {searchResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
              <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-search-results">
                No restaurants found matching "{searchQuery}"
              </p>
            )}

            {searchQuery.length < 2 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Type at least 2 characters to search
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="section-owner-campaigns">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="w-4 h-4 text-foreground" />
          <h3 className="text-[15px] font-semibold text-foreground">My Campaigns</h3>
          <span className="bg-foreground text-white text-xs font-medium rounded-full px-2.5 py-0.5">{campaigns.length}</span>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="text-no-campaigns">No campaigns yet. Create one to promote your restaurant.</p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-border" data-testid={`card-campaign-${c.id}`}>
                <div>
                  <span className="text-sm font-medium text-foreground">{c.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{c.dealType}</span>
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                      c.status === "active" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" :
                      c.status === "draft" ? "bg-gray-100 dark:bg-muted text-muted-foreground" :
                      "bg-red-50 dark:bg-red-500/10 text-red-500"
                    }`}>{c.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="section-claim-status">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-foreground" />
            <h3 className="text-[15px] font-semibold text-foreground">Claim Status</h3>
          </div>
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-claims">No claims submitted.</p>
          ) : (
            <div className="space-y-2">
              {claims.map((cl: any) => (
                <div key={cl.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-border" data-testid={`card-claim-${cl.id}`}>
                  <div className="text-sm">
                    <span className="text-foreground font-medium">Restaurant #{cl.restaurantId}</span>
                    <span className="text-xs text-muted-foreground ml-2">Submitted {new Date(cl.submittedAt).toLocaleDateString()}</span>
                    {cl.ownershipType && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({cl.ownershipType.replace(/_/g, " ")})
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${
                    cl.status === "approved" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" :
                    cl.status === "pending" ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600" :
                    "bg-red-50 dark:bg-red-500/10 text-red-500"
                  }`}>{cl.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="section-subscription">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-foreground" />
            <h3 className="text-[15px] font-semibold text-foreground">Subscription</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Plan</span>
              {tierBadge(owner?.subscriptionTier || "free")}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Verification</span>
              {verificationStatusBadge(owner?.verificationStatus || "pending")}
            </div>
            {owner?.subscriptionExpiry && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expires</span>
                <span className="text-sm text-foreground">{new Date(owner.subscriptionExpiry).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: number; gradient: string }) {
  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-5" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: gradient }}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}
