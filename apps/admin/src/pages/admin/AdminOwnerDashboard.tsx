import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getAdminSession } from "./AdminLayout";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VIBE_LABELS, VIBE_EMOJI, type VibeTag } from "@shared/vibeConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  TrendingUp,
  ArrowUp,
  Sparkles,
  Utensils,
  Globe,
  Phone,
  Mail,
  CalendarDays,
  Zap,
  Users,
  BarChart3,
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
    createdAt: string;
  };
  restaurant: {
    id: number;
    name: string;
    description: string;
    category: string;
    address: string;
    imageUrl: string;
    rating: string;
    priceLevel: number;
    trendingScore: number;
    ownerClaimStatus: string | null;
    vibes: string[];
    district: string | null;
    operatingHours: string | null;
    isNew: boolean;
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
      proofDocuments: string[];
      ownershipType: string;
      notes: string;
    }) => {
      const res = await fetch("/api/admin/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getOwnerHeaders() as Record<string, string>,
        },
        body: JSON.stringify(claimData),
      });
      if (!res.ok) throw new Error("Failed to submit claim");
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
      proofDocuments: proofDocs,
      ownershipType,
      notes: claimNotes,
    });
  };

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400" data-testid="text-access-denied">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="owner-dashboard-loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  const owner = data?.owner;
  const restaurant = data?.restaurant;
  const stats = data?.stats || { views: 0, likes: 0, saves: 0, deliveryTaps: 0 };
  const campaigns = data?.campaigns || [];
  const claims = data?.claims || [];
  const vibes = restaurant?.vibes || [];
  const memberSince = owner?.createdAt ? new Date(owner.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

  return (
    <div data-testid="admin-owner-dashboard" className="space-y-6">
      {restaurant ? (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" data-testid="card-restaurant-hero">
            <div className="relative h-56 overflow-hidden">
              <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover" data-testid="img-restaurant-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              <div className="absolute top-4 right-4 flex gap-2">
                {owner?.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[#00B14F] shadow-sm">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 bg-white/90 backdrop-blur-sm shadow-sm ${
                  owner?.subscriptionTier === "premium" ? "text-[#6C2BD9]" :
                  owner?.subscriptionTier === "enterprise" ? "text-[#FFCC02]" :
                  "text-gray-600"
                }`}>
                  <Crown className="w-3 h-3" />
                  {(owner?.subscriptionTier || "free").charAt(0).toUpperCase() + (owner?.subscriptionTier || "free").slice(1)}
                </span>
              </div>

              {restaurant.trendingScore >= 90 && (
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-1 bg-[#FFCC02] text-gray-900 shadow-sm">
                    <TrendingUp className="w-3 h-3" /> Trending #{Math.max(1, 100 - restaurant.trendingScore)}
                  </span>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="text-2xl font-bold text-white mb-1" data-testid="text-restaurant-name">{restaurant.name}</h2>
                <p className="text-white/80 text-sm flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {restaurant.address}
                  {restaurant.district && <span className="text-white/60">· {restaurant.district}</span>}
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-6 flex-wrap mb-4">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold text-gray-800">{restaurant.rating}</span>
                  <span className="text-xs text-gray-400">rating</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{restaurant.category}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className={`text-sm ${i <= restaurant.priceLevel ? "text-[#00B14F] font-semibold" : "text-gray-200"}`}>฿</span>
                  ))}
                </div>
                {restaurant.isNew && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#00B14F]/10 text-[#00B14F] rounded-full px-2 py-0.5">New</span>
                )}
              </div>

              <p className="text-sm text-gray-500 leading-relaxed mb-4" data-testid="text-restaurant-description">
                {restaurant.description}
              </p>

              {vibes.length > 0 && (
                <div className="flex flex-wrap gap-1.5" data-testid="section-restaurant-vibes">
                  {vibes.map((v) => (
                    <span
                      key={v}
                      className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 bg-[#00B14F]/8 border border-[#00B14F]/15 text-gray-600"
                      data-testid={`vibe-${v}`}
                    >
                      {VIBE_EMOJI[v as VibeTag] || "🏷️"} {VIBE_LABELS[v as VibeTag] || v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-owner-stats">
            {[
              { icon: Eye, label: "Views", value: stats.views, color: "text-blue-500", bg: "bg-blue-50", trend: "+12%" },
              { icon: Heart, label: "Likes", value: stats.likes, color: "text-rose-500", bg: "bg-rose-50", trend: "+8%" },
              { icon: Bookmark, label: "Saves", value: stats.saves, color: "text-amber-500", bg: "bg-amber-50", trend: "+15%" },
              { icon: ExternalLink, label: "Delivery Taps", value: stats.deliveryTaps, color: "text-[#00B14F]", bg: "bg-[#00B14F]/10", trend: "+5%" },
            ].map(({ icon: Icon, label, value, color, bg, trend }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</p>
                <div className="flex items-center gap-0.5 mt-1 text-xs text-[#00B14F]">
                  <ArrowUp className="w-3 h-3" />
                  {trend} this week
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-quick-actions">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
                <h3 className="text-[15px] font-semibold text-gray-800">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Megaphone, label: "New Promotion", desc: "Create a deal", href: "/admin/owner/promotions", color: "text-[#6C2BD9]", bg: "bg-[#6C2BD9]/10" },
                  { icon: BarChart3, label: "View Analytics", desc: "Check performance", href: "/admin/owner/performance", color: "text-[#00B14F]", bg: "bg-[#00B14F]/10" },
                  { icon: Utensils, label: "Update Menu", desc: "Edit items & hours", href: "/admin/owner/menu", color: "text-[#FFCC02]", bg: "bg-[#FFCC02]/15" },
                  { icon: Star, label: "Read Reviews", desc: "Reply to feedback", href: "/admin/owner/reviews", color: "text-rose-500", bg: "bg-rose-50" },
                ].map(({ icon: Icon, label, desc, href, color, bg }) => (
                  <a
                    key={label}
                    href={href}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    data-testid={`action-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-[11px] text-gray-400">{desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-owner-profile">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-[3px] h-4 bg-[#6C2BD9] rounded-full" />
                <h3 className="text-[15px] font-semibold text-gray-800">Owner Profile</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#00B14F]/10 flex items-center justify-center text-lg font-bold text-[#00B14F]">
                    {(owner?.displayName || "O").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800" data-testid="text-owner-name">{owner?.displayName}</p>
                    <p className="text-xs text-gray-400">Restaurant Owner</p>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-gray-50">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-3.5 h-3.5 text-gray-300" />
                    <span className="text-gray-600" data-testid="text-owner-email">{owner?.email}</span>
                  </div>
                  {owner?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-3.5 h-3.5 text-gray-300" />
                      <span className="text-gray-600" data-testid="text-owner-phone">{owner.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-300" />
                    <span className="text-gray-400">Member since {memberSince}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                  <div className="flex items-center gap-2 flex-wrap">
                    {owner?.isVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 bg-[#00B14F]/10 text-[#00B14F]">
                        <ShieldCheck className="w-3 h-3" /> Verified Business
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 ${
                      owner?.subscriptionTier === "premium" ? "bg-[#6C2BD9]/10 text-[#6C2BD9]" :
                      owner?.subscriptionTier === "enterprise" ? "bg-[#FFCC02]/15 text-gray-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      <Crown className="w-3 h-3" />
                      {(owner?.subscriptionTier || "free").charAt(0).toUpperCase() + (owner?.subscriptionTier || "free").slice(1)} Plan
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-performance-snapshot">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
              <h3 className="text-[15px] font-semibold text-gray-800">This Week's Highlights</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#00B14F]/5 to-[#00B14F]/10 border border-[#00B14F]/10">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-[#00B14F]" />
                  <span className="text-xs font-medium text-gray-500">Engagement Rate</span>
                </div>
                <p className="text-xl font-bold text-gray-800">
                  {stats.views > 0 ? Math.round(((stats.likes + stats.saves) / stats.views) * 100) : 0}%
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Likes + Saves per View</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#6C2BD9]/5 to-[#6C2BD9]/10 border border-[#6C2BD9]/10">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-[#6C2BD9]" />
                  <span className="text-xs font-medium text-gray-500">Unique Visitors</span>
                </div>
                <p className="text-xl font-bold text-gray-800">{Math.max(stats.views, 1)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">People who viewed your page</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#FFCC02]/5 to-[#FFCC02]/10 border border-[#FFCC02]/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[#FFCC02]" />
                  <span className="text-xs font-medium text-gray-500">Trending Score</span>
                </div>
                <p className="text-xl font-bold text-gray-800">{restaurant.trendingScore}/100</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Your visibility rank</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-owner-campaigns">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-4 bg-[#6C2BD9] rounded-full" />
                <h3 className="text-[15px] font-semibold text-gray-800">Active Campaigns</h3>
                <span className="bg-[#FFCC02] text-gray-900 text-[10px] font-bold rounded-full px-2 py-0.5">{campaigns.length}</span>
              </div>
              <a href="/admin/owner/promotions" className="text-xs text-[#00B14F] font-medium hover:text-[#00B14F]/80 flex items-center gap-1 transition-colors" data-testid="link-all-campaigns">
                View All <ChevronRight className="w-3 h-3" />
              </a>
            </div>
            {campaigns.length === 0 ? (
              <div className="text-center py-8">
                <Megaphone className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400 mb-2">No campaigns yet</p>
                <a
                  href="/admin/owner/promotions"
                  className="inline-flex items-center gap-1 text-sm font-medium bg-[#FFCC02] text-gray-900 rounded-xl px-4 py-2 hover:bg-[#FFCC02]/90 transition-colors"
                  data-testid="button-create-first-campaign"
                >
                  <Megaphone className="w-3.5 h-3.5" /> Create Your First Promotion
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100" data-testid={`card-campaign-${c.id}`}>
                    <div>
                      <span className="text-sm font-medium text-gray-800">{c.title}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{c.dealType}</span>
                        <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                          c.status === "active" ? "bg-[#00B14F]/10 text-[#00B14F]" :
                          c.status === "draft" ? "bg-gray-100 text-gray-400" :
                          "bg-red-50 text-red-400"
                        }`}>{c.status}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-[#00B14F]" />
            <div>
              <h2 className="text-xl font-semibold text-gray-800" data-testid="text-owner-title">Welcome to Toast for Owners</h2>
              <p className="text-xs text-gray-400">Claim your restaurant to get started</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center" data-testid="card-no-restaurant">
            <div className="w-16 h-16 rounded-2xl bg-[#00B14F]/10 flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-[#00B14F]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">No restaurant linked yet</h3>
            <p className="text-sm text-gray-400 mb-4 max-w-md mx-auto">Search for your restaurant below and submit a verification claim to unlock your full owner dashboard.</p>
          </div>
        </>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-claim-restaurant">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">{restaurant ? "Claim Another Restaurant" : "Search & Claim Your Restaurant"}</h3>
        </div>

        {claimFormOpen && selectedRestaurant ? (
          <div className="space-y-4" data-testid="claim-form">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
              <img src={selectedRestaurant.imageUrl} alt={selectedRestaurant.name} className="w-14 h-14 rounded-lg object-cover" data-testid="img-claim-restaurant" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate" data-testid="text-claim-restaurant-name">{selectedRestaurant.name}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedRestaurant.address}</p>
                <p className="text-xs text-gray-400">{selectedRestaurant.category}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => { setClaimFormOpen(false); setSelectedRestaurant(null); }} data-testid="button-cancel-claim">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Ownership Type</label>
                <Select value={ownershipType} onValueChange={setOwnershipType}>
                  <SelectTrigger data-testid="select-ownership-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_location">Single Location Owner</SelectItem>
                    <SelectItem value="franchise_owner">Franchise Owner (All Locations)</SelectItem>
                    <SelectItem value="franchisee">Franchisee (Single Location)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block"><FileText className="w-3 h-3 inline mr-1" />Business Registration URL</label>
                <Input placeholder="https://example.com/business-registration.pdf" value={docUrls[0]} onChange={(e) => setDocUrls([e.target.value, docUrls[1], docUrls[2]])} data-testid="input-doc-registration" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block"><FileText className="w-3 h-3 inline mr-1" />Ownership Proof URL</label>
                <Input placeholder="https://example.com/ownership-proof.pdf" value={docUrls[1]} onChange={(e) => setDocUrls([docUrls[0], e.target.value, docUrls[2]])} data-testid="input-doc-ownership" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block"><FileText className="w-3 h-3 inline mr-1" />Photo ID URL</label>
                <Input placeholder="https://example.com/photo-id.pdf" value={docUrls[2]} onChange={(e) => setDocUrls([docUrls[0], docUrls[1], e.target.value])} data-testid="input-doc-id" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Additional Notes</label>
                <Input placeholder="Any additional information..." value={claimNotes} onChange={(e) => setClaimNotes(e.target.value)} data-testid="input-claim-notes" />
              </div>
              <Button className="w-full bg-[#00B14F] hover:bg-[#00B14F]/90 text-white" onClick={handleSubmitClaim} disabled={submitClaimMutation.isPending} data-testid="button-submit-claim">
                {submitClaimMutation.isPending ? "Submitting..." : <><Send className="w-4 h-4 mr-2" />Submit Claim</>}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <Input placeholder="Search restaurants by name, address, or cuisine..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} data-testid="input-search-restaurants" />
            </div>
            {isSearching && (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-[#00B14F]/20 border-t-[#00B14F] rounded-full animate-spin" />
              </div>
            )}
            {searchResults && searchResults.length > 0 && searchQuery.length >= 2 && (
              <div className="space-y-2 max-h-80 overflow-y-auto" data-testid="search-results">
                {searchResults.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { setSelectedRestaurant(r); setClaimFormOpen(true); }} data-testid={`search-result-${r.id}`}>
                    <img src={r.imageUrl} alt={r.name} className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{r.address}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{r.category}</span>
                        <span className="flex items-center gap-0.5 text-xs text-gray-400"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{r.rating}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </div>
                ))}
              </div>
            )}
            {searchResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
              <p className="text-sm text-gray-400 text-center py-4" data-testid="text-no-search-results">No restaurants found matching "{searchQuery}"</p>
            )}
            {searchQuery.length < 2 && (
              <p className="text-xs text-gray-300 text-center py-2">Type at least 2 characters to search</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-claim-status">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Claim Status</h3>
          </div>
          {claims.length === 0 ? (
            <p className="text-sm text-gray-400" data-testid="text-no-claims">No claims submitted.</p>
          ) : (
            <div className="space-y-2">
              {claims.map((cl: any) => (
                <div key={cl.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100" data-testid={`card-claim-${cl.id}`}>
                  <div className="text-sm">
                    <span className="text-gray-800 font-medium">Restaurant #{cl.restaurantId}</span>
                    <span className="text-xs text-gray-400 ml-2">Submitted {new Date(cl.submittedAt).toLocaleDateString()}</span>
                  </div>
                  <span className={`text-[10px] font-medium rounded-full px-2.5 py-0.5 ${
                    cl.status === "approved" ? "bg-[#00B14F]/10 text-[#00B14F]" :
                    cl.status === "pending" ? "bg-amber-50 text-amber-600" :
                    "bg-red-50 text-red-500"
                  }`}>{cl.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-subscription">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Subscription</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Current Plan</span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 ${
                owner?.subscriptionTier === "premium" ? "bg-[#6C2BD9]/10 text-[#6C2BD9]" :
                owner?.subscriptionTier === "enterprise" ? "bg-[#FFCC02]/15 text-gray-700" :
                owner?.subscriptionTier === "basic" ? "bg-blue-50 text-blue-600" :
                "bg-gray-100 text-gray-500"
              }`}>
                <Crown className="w-3 h-3" />
                {(owner?.subscriptionTier || "free").charAt(0).toUpperCase() + (owner?.subscriptionTier || "free").slice(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Verification</span>
              {owner?.isVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 bg-[#00B14F]/10 text-[#00B14F]">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 bg-amber-50 text-amber-600">
                  <Clock className="w-3 h-3" /> Pending
                </span>
              )}
            </div>
            {owner?.subscriptionExpiry && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Expires</span>
                <span className="text-sm text-gray-800">{new Date(owner.subscriptionExpiry).toLocaleDateString()}</span>
              </div>
            )}
            <a
              href="/admin/owner/settings"
              className="block text-center text-xs font-medium text-[#00B14F] hover:text-[#00B14F]/80 pt-2 border-t border-gray-50 transition-colors"
              data-testid="link-manage-subscription"
            >
              Manage Subscription →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
