import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useLineProfile } from "@/hooks/use-line-profile";
import { sendPartnerInvite, getAccessToken } from "@/lib/liff";
import { BottomNav } from "@/components/BottomNav";
import { useSavedRestaurants } from "@/hooks/use-saved-restaurants";
import { ChevronRight, UserPlus, Unlink, LogIn, LogOut, X, Store, User, Star, TrendingUp, Image, Sparkles, Plus, Check, Crown, Eye, ExternalLink, MapPin, Clock, BarChart3, ArrowUpRight, ArrowDownRight, Utensils, Zap, Calendar, Megaphone, Tag, Percent, Trash2, Send, Users, Target, Search } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RestaurantResponse } from "@shared/routes";

const DIETARY_OPTIONS = [
  { value: "halal", label: "Halal", emoji: "🕌" },
  { value: "vegetarian", label: "Vegetarian", emoji: "🥬" },
  { value: "vegan", label: "Vegan", emoji: "🌱" },
  { value: "gluten_free", label: "Gluten Free", emoji: "🌾" },
  { value: "dairy_free", label: "Dairy Free", emoji: "🥛" },
  { value: "nut_free", label: "Nut Free", emoji: "🥜" },
  { value: "shellfish_free", label: "No Shellfish", emoji: "🦐" },
  { value: "pescatarian", label: "Pescatarian", emoji: "🐟" },
];

const CUISINE_OPTIONS = [
  { value: "thai", label: "Thai", emoji: "🇹🇭" },
  { value: "japanese", label: "Japanese", emoji: "🇯🇵" },
  { value: "korean", label: "Korean", emoji: "🇰🇷" },
  { value: "italian", label: "Italian", emoji: "🇮🇹" },
  { value: "mexican", label: "Mexican", emoji: "🇲🇽" },
  { value: "indian", label: "Indian", emoji: "🇮🇳" },
  { value: "chinese", label: "Chinese", emoji: "🇨🇳" },
  { value: "american", label: "American", emoji: "🇺🇸" },
  { value: "french", label: "French", emoji: "🇫🇷" },
  { value: "vietnamese", label: "Vietnamese", emoji: "🇻🇳" },
  { value: "middle_eastern", label: "Middle Eastern", emoji: "🧆" },
  { value: "street_food", label: "Street Food", emoji: "🛒" },
];

const BUDGET_OPTIONS = [
  { value: 1, label: "฿", description: "Budget" },
  { value: 2, label: "฿฿", description: "Moderate" },
  { value: 3, label: "฿฿฿", description: "Upscale" },
  { value: 4, label: "฿฿฿฿", description: "Fine dining" },
];

const DISTANCE_OPTIONS = [
  { value: "1km", label: "1 km" },
  { value: "3km", label: "3 km" },
  { value: "5km", label: "5 km" },
  { value: "10km", label: "10 km" },
  { value: "any", label: "Anywhere" },
];

const PROFILE_STORAGE_KEY = "toast_user_profile";
const OWNER_STORAGE_KEY = "toast_owner_profile";

interface LocalProfile {
  displayName: string;
  pictureUrl: string;
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  defaultBudget: number;
  defaultDistance: string;
  partnerName: string;
  partnerPictureUrl: string;
  partnerLinked: boolean;
}

interface Campaign {
  id: string;
  serverId?: number;
  title: string;
  dealType: "percentage" | "bogo" | "freeItem" | "fixedAmount";
  dealValue: string;
  description: string;
  startDate: string;
  endDate: string;
  conditions: string[];
  minSpend: string;
  maxRedemptions: string;
  targetGroups: string[];
  status: "draft" | "active" | "scheduled" | "paused" | "ended";
}

interface UserSegment {
  id: string;
  name: string;
  description: string;
  estimatedCount: number;
}

const RESTAURANT_CATEGORIES = [
  { value: "thai", label: "Thai", emoji: "🇹🇭" },
  { value: "japanese", label: "Japanese", emoji: "🇯🇵" },
  { value: "korean", label: "Korean", emoji: "🇰🇷" },
  { value: "italian", label: "Italian", emoji: "🇮🇹" },
  { value: "chinese", label: "Chinese", emoji: "🇨🇳" },
  { value: "indian", label: "Indian", emoji: "🇮🇳" },
  { value: "french", label: "French", emoji: "🇫🇷" },
  { value: "mexican", label: "Mexican", emoji: "🇲🇽" },
  { value: "vietnamese", label: "Vietnamese", emoji: "🇻🇳" },
  { value: "american", label: "American", emoji: "🇺🇸" },
  { value: "middle_eastern", label: "Middle Eastern", emoji: "🧆" },
  { value: "seafood", label: "Seafood", emoji: "🦐" },
  { value: "steakhouse", label: "Steakhouse", emoji: "🥩" },
  { value: "pizza", label: "Pizza", emoji: "🍕" },
  { value: "sushi", label: "Sushi", emoji: "🍣" },
  { value: "bbq", label: "BBQ & Grill", emoji: "🔥" },
  { value: "cafe", label: "Café", emoji: "☕" },
  { value: "bakery", label: "Bakery", emoji: "🥐" },
  { value: "dessert", label: "Dessert", emoji: "🍰" },
  { value: "bar", label: "Bar & Drinks", emoji: "🍸" },
  { value: "fusion", label: "Fusion", emoji: "🍜" },
  { value: "buffet", label: "Buffet", emoji: "🍱" },
  { value: "fast_food", label: "Fast Food", emoji: "🍔" },
  { value: "fine_dining", label: "Fine Dining", emoji: "🍷" },
];

const RESTAURANT_TAGS = [
  { value: "street_food", label: "Street Food", emoji: "🛒" },
  { value: "family_friendly", label: "Family Friendly", emoji: "👨‍👩‍👧" },
  { value: "date_night", label: "Date Night", emoji: "💕" },
  { value: "late_night", label: "Late Night", emoji: "🌙" },
  { value: "brunch", label: "Brunch", emoji: "🥞" },
  { value: "healthy", label: "Healthy", emoji: "🥗" },
  { value: "spicy", label: "Spicy", emoji: "🌶️" },
  { value: "vegetarian_options", label: "Vegetarian Options", emoji: "🥬" },
  { value: "vegan_options", label: "Vegan Options", emoji: "🌱" },
  { value: "halal", label: "Halal", emoji: "🕌" },
  { value: "rooftop", label: "Rooftop", emoji: "🏙️" },
  { value: "outdoor_seating", label: "Outdoor Seating", emoji: "🌿" },
  { value: "live_music", label: "Live Music", emoji: "🎵" },
  { value: "pet_friendly", label: "Pet Friendly", emoji: "🐶" },
  { value: "instagrammable", label: "Instagrammable", emoji: "📸" },
  { value: "michelin", label: "Michelin Guide", emoji: "⭐" },
  { value: "delivery", label: "Delivery", emoji: "🛵" },
  { value: "takeaway", label: "Takeaway", emoji: "📦" },
  { value: "reservations", label: "Reservations", emoji: "📋" },
  { value: "group_dining", label: "Group Dining", emoji: "👥" },
  { value: "local_favorite", label: "Local Favorite", emoji: "❤️" },
  { value: "new_opening", label: "New Opening", emoji: "🆕" },
  { value: "organic", label: "Organic", emoji: "🌾" },
  { value: "craft_cocktails", label: "Craft Cocktails", emoji: "🍹" },
];

interface OwnerProfile {
  restaurantName: string;
  category: string;
  tags: string[];
  address: string;
  activePackages: string[];
  campaigns: Campaign[];
}

function getStoredProfile(): LocalProfile {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    displayName: "",
    pictureUrl: "",
    dietaryRestrictions: [],
    cuisinePreferences: [],
    defaultBudget: 2,
    defaultDistance: "5km",
    partnerName: "",
    partnerPictureUrl: "",
    partnerLinked: false,
  };
}

function getStoredOwnerProfile(): OwnerProfile {
  try {
    const stored = localStorage.getItem(OWNER_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    restaurantName: "",
    category: "",
    tags: [],
    address: "",
    activePackages: [],
    campaigns: [],
  };
}

function saveOwnerProfile(profile: OwnerProfile) {
  localStorage.setItem(OWNER_STORAGE_KEY, JSON.stringify(profile));
}

function saveProfile(profile: LocalProfile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

async function syncToServer(lineUserId: string, profile: LocalProfile) {
  try {
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        lineUserId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl || null,
        dietaryRestrictions: profile.dietaryRestrictions,
        cuisinePreferences: profile.cuisinePreferences,
        defaultBudget: profile.defaultBudget,
        defaultDistance: profile.defaultDistance,
        partnerDisplayName: profile.partnerLinked ? profile.partnerName : null,
        partnerPictureUrl: profile.partnerLinked ? profile.partnerPictureUrl : null,
      }),
    });
  } catch {}
}

async function fetchFromServer(lineUserId: string): Promise<Partial<LocalProfile> | null> {
  try {
    const res = await fetch(`/api/profile/${lineUserId}`, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      displayName: data.displayName,
      pictureUrl: data.pictureUrl || "",
      dietaryRestrictions: data.dietaryRestrictions || [],
      cuisinePreferences: data.cuisinePreferences || [],
      defaultBudget: data.defaultBudget || 2,
      defaultDistance: data.defaultDistance || "5km",
      partnerName: data.partnerDisplayName || "",
      partnerPictureUrl: data.partnerPictureUrl || "",
      partnerLinked: !!data.partnerDisplayName,
    };
  } catch { return null; }
}

const springConfig = { type: "spring" as const, damping: 26, stiffness: 260, mass: 0.8 };

export default function Profile() {
  const [, navigate] = useLocation();
  const { profile: lineProfile, liffAvailable, login: lineLogin, logout: lineLogout } = useLineProfile();
  const [localProfile, setLocalProfile] = useState<LocalProfile>(getStoredProfile);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerInput, setPartnerInput] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isOwnerMode, setIsOwnerMode] = useState(false);

  useEffect(() => {
    if (lineProfile) {
      setLocalProfile(prev => ({
        ...prev,
        displayName: prev.displayName || lineProfile.displayName,
        pictureUrl: prev.pictureUrl || lineProfile.pictureUrl || "",
      }));
      fetchFromServer(lineProfile.userId).then(serverData => {
        if (serverData) {
          const merged = { ...getStoredProfile(), ...serverData };
          setLocalProfile(merged);
          saveProfile(merged);
        }
      });
    }
  }, [lineProfile]);

  const updateProfile = (updates: Partial<LocalProfile>) => {
    const updated = { ...localProfile, ...updates };
    setLocalProfile(updated);
    saveProfile(updated);
    if (lineProfile?.userId) {
      syncToServer(lineProfile.userId, updated);
    }
  };

  const toggleDietary = (value: string) => {
    const current = localProfile.dietaryRestrictions;
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    updateProfile({ dietaryRestrictions: next });
  };

  const toggleCuisine = (value: string) => {
    const current = localProfile.cuisinePreferences;
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    updateProfile({ cuisinePreferences: next });
  };

  const linkPartner = () => {
    if (!partnerInput.trim()) return;
    updateProfile({ partnerName: partnerInput.trim(), partnerPictureUrl: "", partnerLinked: true });
    setShowPartnerModal(false);
    setPartnerInput("");
  };

  const unlinkPartner = () => {
    updateProfile({ partnerName: "", partnerPictureUrl: "", partnerLinked: false });
  };

  const invitePartnerViaLine = async () => {
    try {
      const bearerToken = getAccessToken();
      const res = await fetch("/api/partner/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        },
      });
      if (!res.ok) return;
      const { token } = await res.json();
      await sendPartnerInvite(token);
    } catch {
      // Silently fail — user can retry
    }
  };

  const displayName = localProfile.displayName || lineProfile?.displayName || "Toast Lover";
  const pictureUrl = localProfile.pictureUrl || lineProfile?.pictureUrl || "";

  return (
    <div className="w-full min-h-[100dvh] bg-white dark:bg-background" data-testid="profile-page">
      <div className="px-6 pt-14 pb-6">
        <div className="flex items-center justify-between mb-8">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40"
            data-testid="text-profile-label"
          >
            {isOwnerMode ? "Business" : "Profile"}
          </p>
          <div className="flex items-center gap-2">
            {!isOwnerMode && !lineProfile && liffAvailable && (
              <button
                onClick={lineLogin}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#06C755] text-white text-xs font-semibold active:scale-95 transition-transform"
                style={{ boxShadow: "0 3px 12px rgba(6,199,85,0.3)" }}
                data-testid="button-line-login"
              >
                <LogIn className="w-3.5 h-3.5" />
                LINE
              </button>
            )}
            {!isOwnerMode && lineProfile && (
              <button
                onClick={lineLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-muted text-muted-foreground text-xs font-medium active:scale-95 transition-transform"
                data-testid="button-line-logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-4">
            <div
              className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-4xl"
              style={{
                background: isOwnerMode
                  ? "linear-gradient(135deg, hsl(222,47%,16%) 0%, hsl(222,47%,25%) 100%)"
                  : pictureUrl ? undefined : "linear-gradient(135deg, #FFCC02 0%, hsl(40,90%,55%) 100%)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              }}
              data-testid="avatar-profile"
            >
              {isOwnerMode ? (
                <Store className="w-10 h-10 text-white" />
              ) : pictureUrl ? (
                <img src={pictureUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="drop-shadow-sm">🍞</span>
              )}
            </div>
            {!isOwnerMode && lineProfile && (
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#06C755] flex items-center justify-center border-[2.5px] border-white dark:border-background" style={{ boxShadow: "0 2px 8px rgba(6,199,85,0.3)" }}>
                <span className="text-white text-[9px] font-bold">LINE</span>
              </div>
            )}
            {isOwnerMode && (
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#FFCC02] flex items-center justify-center border-[2.5px] border-white dark:border-background" style={{ boxShadow: "0 2px 8px rgba(255,204,2,0.4)" }}>
                <Crown className="w-3.5 h-3.5 text-[#2d2000]" />
              </div>
            )}
          </div>
          {isOwnerMode ? (
            <p className="text-[22px] font-bold tracking-tight">Business Dashboard</p>
          ) : (
            <>
              <input
                type="text"
                value={localProfile.displayName}
                onChange={(e) => updateProfile({ displayName: e.target.value })}
                placeholder="Your name"
                className="text-[22px] font-bold bg-transparent border-none outline-none text-center w-full placeholder:text-muted-foreground/30 tracking-tight"
                data-testid="input-display-name"
              />
              {!liffAvailable && !lineProfile && (
                <p className="text-[11px] text-muted-foreground/50 mt-1">Open in LINE for full features</p>
              )}
              {lineProfile && (
                <p className="text-[11px] text-[#06C755] font-medium mt-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#06C755] inline-block" />
                  Connected via LINE
                </p>
              )}
            </>
          )}
        </div>

        <ProfileToggle isOwnerMode={isOwnerMode} onToggle={setIsOwnerMode} />
      </div>

      <div className="px-5 pb-32">
        <AnimatePresence mode="wait" initial={false}>
          {isOwnerMode ? (
            <motion.div
              key="owner"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springConfig}
            >
              <OwnerDashboard />
            </motion.div>
          ) : (
            <motion.div
              key="user"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={springConfig}
            >
              <StatsRow />

              <div className="mb-3">
                <div
                  className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-gray-100 dark:border-border"
                >
                  <PartnerRow
                    profile={localProfile}
                    onInvite={invitePartnerViaLine}
                    onManualAdd={() => setShowPartnerModal(true)}
                    onUnlink={unlinkPartner}
                  />
                </div>
              </div>

              <div className="mb-3">
                <SavedSection />
              </div>

              <div className="mb-3">
                <div
                  className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-gray-100 dark:border-border"
                >
                  <button
                    onClick={() => setActiveSection(activeSection === "dietary" ? null : "dietary")}
                    className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 dark:active:bg-muted/50 transition-colors"
                    data-testid="button-dietary-section"
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(130,45%,92%) 0%, hsl(140,40%,85%) 100%)" }}>
                      🥗
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[15px]">Dietary</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {localProfile.dietaryRestrictions.length > 0
                          ? localProfile.dietaryRestrictions.map(v => DIETARY_OPTIONS.find(o => o.value === v)?.label).filter(Boolean).join(", ")
                          : "No restrictions"}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-300 ${activeSection === "dietary" ? "rotate-90" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {activeSection === "dietary" && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={springConfig}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1">
                          <div className="flex flex-wrap gap-2">
                            {DIETARY_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => toggleDietary(opt.value)}
                                data-testid={`toggle-dietary-${opt.value}`}
                                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all duration-200 active:scale-95 border ${
                                  localProfile.dietaryRestrictions.includes(opt.value)
                                    ? "bg-foreground text-white border-foreground"
                                    : "bg-white dark:bg-muted text-foreground/60 border-gray-100 dark:border-border"
                                }`}
                                style={localProfile.dietaryRestrictions.includes(opt.value) ? { boxShadow: "0 2px 8px rgba(0,0,0,0.15)" } : {}}
                              >
                                <span className="text-sm">{opt.emoji}</span>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mx-5 h-px bg-gray-100 dark:bg-border" />

                  <button
                    onClick={() => setActiveSection(activeSection === "cuisines" ? null : "cuisines")}
                    className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 dark:active:bg-muted/50 transition-colors"
                    data-testid="button-cuisines-section"
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(25,50%,92%) 0%, hsl(15,45%,85%) 100%)" }}>
                      🍜
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[15px]">Cuisines</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {localProfile.cuisinePreferences.length > 0
                          ? localProfile.cuisinePreferences.map(v => CUISINE_OPTIONS.find(o => o.value === v)?.emoji).filter(Boolean).join("  ")
                          : "All cuisines"}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-300 ${activeSection === "cuisines" ? "rotate-90" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {activeSection === "cuisines" && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={springConfig}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1">
                          <div className="grid grid-cols-3 gap-2">
                            {CUISINE_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => toggleCuisine(opt.value)}
                                data-testid={`toggle-cuisine-${opt.value}`}
                                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl text-[11px] font-medium transition-all duration-200 active:scale-95 border ${
                                  localProfile.cuisinePreferences.includes(opt.value)
                                    ? "bg-foreground text-white border-foreground"
                                    : "bg-white dark:bg-muted text-foreground/60 border-gray-100 dark:border-border"
                                }`}
                                style={localProfile.cuisinePreferences.includes(opt.value) ? { boxShadow: "0 2px 8px rgba(0,0,0,0.15)" } : {}}
                              >
                                <span className="text-lg">{opt.emoji}</span>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mb-3">
                <div
                  className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-gray-100 dark:border-border"
                >
                  <button
                    onClick={() => setActiveSection(activeSection === "defaults" ? null : "defaults")}
                    className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 dark:active:bg-muted/50 transition-colors"
                    data-testid="button-defaults-section"
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(45,55%,92%) 0%, hsl(40,50%,85%) 100%)" }}>
                      ⚙️
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[15px]">Settings</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {"฿".repeat(localProfile.defaultBudget)} · {localProfile.defaultDistance}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-300 ${activeSection === "defaults" ? "rotate-90" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {activeSection === "defaults" && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={springConfig}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 space-y-5">
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Budget Level</p>
                            <div className="grid grid-cols-4 gap-2">
                              {BUDGET_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => updateProfile({ defaultBudget: opt.value })}
                                  data-testid={`button-budget-${opt.value}`}
                                  className={`relative py-3.5 rounded-2xl text-center transition-all duration-200 active:scale-95 border overflow-hidden ${
                                    localProfile.defaultBudget === opt.value
                                      ? "bg-foreground text-white border-foreground font-bold"
                                      : "bg-white dark:bg-muted text-foreground/50 border-gray-100 dark:border-border"
                                  }`}
                                  style={localProfile.defaultBudget === opt.value ? { boxShadow: "0 4px 12px rgba(0,0,0,0.15)" } : {}}
                                >
                                  <p className="text-sm font-semibold">{opt.label}</p>
                                  <p className={`text-[8px] mt-0.5 ${localProfile.defaultBudget === opt.value ? "text-white/60" : "text-muted-foreground/50"}`}>{opt.description}</p>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Search Radius</p>
                            <div className="flex gap-2">
                              {DISTANCE_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => updateProfile({ defaultDistance: opt.value })}
                                  data-testid={`button-distance-${opt.value}`}
                                  className={`flex-1 py-2.5 rounded-xl text-[11px] font-medium transition-all duration-200 active:scale-95 border ${
                                    localProfile.defaultDistance === opt.value
                                      ? "bg-foreground text-white border-foreground"
                                      : "bg-white dark:bg-muted text-foreground/50 border-gray-100 dark:border-border"
                                  }`}
                                  style={localProfile.defaultDistance === opt.value ? { boxShadow: "0 2px 8px rgba(0,0,0,0.15)" } : {}}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPartnerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowPartnerModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 22, stiffness: 200, mass: 1 }}
              className="w-full max-w-md bg-white dark:bg-card rounded-t-[28px] p-6 pb-10"
              style={{ boxShadow: "0 -10px 40px rgba(0,0,0,0.12)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-200 dark:bg-border rounded-full mx-auto mb-6" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "linear-gradient(135deg, hsl(340,50%,92%) 0%, hsl(330,45%,85%) 100%)" }}>
                  💕
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">Link Partner</h3>
                  <p className="text-xs text-muted-foreground">Enter their display name</p>
                </div>
              </div>

              <input
                type="text"
                value={partnerInput}
                onChange={(e) => setPartnerInput(e.target.value)}
                placeholder="Partner's name"
                className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 dark:bg-muted border border-transparent focus:border-gray-200 dark:focus:border-border outline-none text-foreground font-medium placeholder:text-muted-foreground/40 mb-5 transition-colors"
                data-testid="input-partner-name"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPartnerModal(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-gray-100 dark:bg-muted text-foreground font-semibold text-sm active:scale-[0.97] transition-transform"
                  data-testid="button-cancel-partner"
                >
                  Cancel
                </button>
                <button
                  onClick={linkPartner}
                  disabled={!partnerInput.trim()}
                  className="flex-1 py-3.5 rounded-2xl bg-foreground text-white font-semibold text-sm active:scale-[0.97] transition-transform disabled:opacity-30"
                  style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}
                  data-testid="button-confirm-partner"
                >
                  Link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav showBack={false} />
    </div>
  );
}

function ProfileToggle({ isOwnerMode, onToggle }: { isOwnerMode: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div
      className="relative flex items-center bg-gray-100 dark:bg-muted rounded-2xl p-1 mb-2"
      data-testid="toggle-profile-mode"
    >
      <motion.div
        className="absolute top-1 bottom-1 rounded-xl bg-white dark:bg-card"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 2px 12px rgba(0,0,0,0.04)", width: "calc(50% - 4px)" }}
        animate={{ left: isOwnerMode ? "calc(50% + 2px)" : "4px" }}
        transition={springConfig}
      />
      <button
        onClick={() => onToggle(false)}
        className="relative z-10 flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors duration-200"
        style={{ color: !isOwnerMode ? "hsl(var(--foreground))" : "#9ca3af" }}
        data-testid="button-user-mode"
      >
        <User className="w-4 h-4" />
        Diner
      </button>
      <button
        onClick={() => onToggle(true)}
        className="relative z-10 flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors duration-200"
        style={{ color: isOwnerMode ? "hsl(var(--foreground))" : "#9ca3af" }}
        data-testid="button-owner-mode"
      >
        <Store className="w-4 h-4" />
        Owner
      </button>
    </div>
  );
}


function MiniBarChart({ data, maxVal, color = "bg-foreground" }: { data: number[]; maxVal: number; color?: string }) {
  return (
    <div className="flex items-end gap-[3px] h-10">
      {data.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${color} transition-all duration-300`}
          style={{ height: `${Math.max(4, (v / maxVal) * 100)}%`, opacity: 0.3 + (v / maxVal) * 0.7 }}
        />
      ))}
    </div>
  );
}

function OwnerDashboard() {
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile>(getStoredOwnerProfile);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const [analyticsTab, setAnalyticsTab] = useState<"overview" | "menu" | "timing">("overview");
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [previewCampaignId, setPreviewCampaignId] = useState<string | null>(null);
  const [customGroupInput, setCustomGroupInput] = useState("");
  const [campaignForm, setCampaignForm] = useState<Omit<Campaign, "id" | "status" | "serverId">>({
    title: "",
    dealType: "percentage",
    dealValue: "",
    description: "",
    startDate: "",
    endDate: "",
    conditions: [],
    minSpend: "",
    maxRedemptions: "",
    targetGroups: [],
  });

  const { data: segments = [] } = useQuery<UserSegment[]>({
    queryKey: ["/api/analytics/user-segments"],
  });

  const ownerKey = useMemo(() => {
    try {
      const stored = localStorage.getItem(OWNER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.restaurantName || "owner_" + Date.now();
      }
    } catch {}
    return "owner_" + Date.now();
  }, []);

  const { data: insights, isLoading: insightsLoading, isError: insightsError, error: insightsErrorObj } = useQuery<any>({
    queryKey: ["/api/owner/insights"],
  });

  console.log("[OwnerDashboard] insights state", { insightsLoading, insightsError, insightsErrorObj, insights });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return RESTAURANT_CATEGORIES;
    const q = categorySearch.toLowerCase();
    return RESTAURANT_CATEGORIES.filter(c => c.label.toLowerCase().includes(q) || c.value.includes(q));
  }, [categorySearch]);

  const filteredTags = useMemo(() => {
    const selectedTags = ownerProfile.tags || [];
    const available = RESTAURANT_TAGS.filter(t => !selectedTags.includes(t.value));
    if (!tagSearch.trim()) return available;
    const q = tagSearch.toLowerCase();
    return available.filter(t => t.label.toLowerCase().includes(q) || t.value.includes(q));
  }, [tagSearch, ownerProfile.tags]);

  const selectedCategoryObj = RESTAURANT_CATEGORIES.find(c => c.value === ownerProfile.category);

  const updateOwner = (updates: Partial<OwnerProfile>) => {
    const updated = { ...ownerProfile, ...updates };
    setOwnerProfile(updated);
    saveOwnerProfile(updated);
  };

  const PROMO_PACKAGES = [
    {
      id: "menu_spotlight",
      name: "Menu Spotlight",
      icon: Sparkles,
      price: "฿299/week",
      description: "Feature a specific menu item in swipe cards",
      details: "Your selected dish appears as a promoted card in users' swipe feeds. Includes impression stats and click tracking.",
      color: "hsl(35, 90%, 55%)",
      bgGradient: "linear-gradient(135deg, hsl(40,85%,95%) 0%, hsl(35,80%,88%) 100%)",
    },
    {
      id: "restaurant_boost",
      name: "Restaurant Boost",
      icon: TrendingUp,
      price: "฿599/week",
      description: "Priority placement in restaurant lists",
      details: "Your restaurant appears at the top of search results and category lists. Includes a 'Promoted' badge and analytics dashboard.",
      color: "hsl(222, 47%, 25%)",
      bgGradient: "linear-gradient(135deg, hsl(222,40%,95%) 0%, hsl(222,35%,88%) 100%)",
    },
  ];

  if (insightsLoading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 rounded-full border-2 border-gray-300 border-t-foreground animate-spin" /></div>;
  if (insightsError || !insights) {
    console.error("[OwnerDashboard] failed to load insights", insightsErrorObj);
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 gap-3">
        <p className="text-sm font-semibold text-red-500">Failed to load analytics</p>
        <pre className="text-[10px] text-muted-foreground bg-gray-50 rounded-xl p-3 max-w-full overflow-x-auto whitespace-pre-wrap break-all">
          {insightsErrorObj ? String(insightsErrorObj) : "insights is undefined"}
        </pre>
      </div>
    );
  }
  const overviewStats = Object.values(insights.overview) as Array<{ label: string; value: number; trend: number }>;
  const hourlyValues = insights.hourlyData.map((d: any) => d.value);
  const maxHourly = Math.max(...hourlyValues, 1);

  return (
    <div>
      <div className="mb-4">
        <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-gray-100 dark:border-border">
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Restaurant Setup</p>

            <input
              type="text"
              value={ownerProfile.restaurantName}
              onChange={(e) => updateOwner({ restaurantName: e.target.value })}
              placeholder="Restaurant name"
              className="w-full text-[17px] font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/30 tracking-tight mb-4"
              data-testid="input-restaurant-name"
            />

            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">Category</p>
            <div ref={categoryRef} className="relative mb-4" data-testid="input-restaurant-category">
              {selectedCategoryObj ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-muted flex-1">
                    <span className="text-sm">{selectedCategoryObj.emoji}</span>
                    <span className="text-sm font-medium">{selectedCategoryObj.label}</span>
                  </div>
                  <button
                    onClick={() => updateOwner({ category: "" })}
                    className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-muted flex items-center justify-center text-muted-foreground/60 active:scale-90 transition-transform"
                    data-testid="button-clear-category"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-muted">
                    <Search className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={(e) => { setCategorySearch(e.target.value); setCategoryDropdownOpen(true); }}
                      onFocus={() => setCategoryDropdownOpen(true)}
                      placeholder="Search category..."
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
                      data-testid="input-category-search"
                    />
                  </div>
                  <AnimatePresence>
                    {categoryDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-20 left-0 right-0 mt-1.5 bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border overflow-hidden"
                        style={{ boxShadow: "0 8px 32px -8px rgba(0,0,0,0.12)" }}
                      >
                        <div className="max-h-48 overflow-y-auto py-1">
                          {filteredCategories.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-muted-foreground text-center">No matches</p>
                          ) : (
                            filteredCategories.map((cat) => (
                              <button
                                key={cat.value}
                                onClick={() => {
                                  updateOwner({ category: cat.value });
                                  setCategorySearch("");
                                  setCategoryDropdownOpen(false);
                                }}
                                className="w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-muted active:bg-gray-100"
                                data-testid={`category-${cat.value}`}
                              >
                                <span className="text-base">{cat.emoji}</span>
                                <span className="text-[13px] font-medium">{cat.label}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>

            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">Tags</p>
            <div ref={tagRef} className="relative mb-4" data-testid="input-restaurant-tags">
              {(ownerProfile.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(ownerProfile.tags || []).map((tagVal) => {
                    const tagObj = RESTAURANT_TAGS.find(t => t.value === tagVal);
                    if (!tagObj) return null;
                    return (
                      <span
                        key={tagVal}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-foreground text-white text-[11px] font-medium"
                      >
                        {tagObj.emoji} {tagObj.label}
                        <button
                          onClick={() => updateOwner({ tags: (ownerProfile.tags || []).filter(t => t !== tagVal) })}
                          className="ml-0.5 opacity-70 hover:opacity-100"
                          data-testid={`remove-tag-${tagVal}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-muted">
                <Search className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                <input
                  type="text"
                  value={tagSearch}
                  onChange={(e) => { setTagSearch(e.target.value); setTagDropdownOpen(true); }}
                  onFocus={() => setTagDropdownOpen(true)}
                  placeholder="Search tags..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
                  data-testid="input-tag-search"
                />
              </div>
              <AnimatePresence>
                {tagDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-20 left-0 right-0 mt-1.5 bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border overflow-hidden"
                    style={{ boxShadow: "0 8px 32px -8px rgba(0,0,0,0.12)" }}
                  >
                    <div className="max-h-48 overflow-y-auto py-1">
                      {filteredTags.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted-foreground text-center">No more tags</p>
                      ) : (
                        filteredTags.map((tag) => (
                          <button
                            key={tag.value}
                            onClick={() => {
                              const current = ownerProfile.tags || [];
                              updateOwner({ tags: [...current, tag.value] });
                              setTagSearch("");
                            }}
                            className="w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-muted active:bg-gray-100"
                            data-testid={`tag-${tag.value}`}
                          >
                            <span className="text-base">{tag.emoji}</span>
                            <span className="text-[13px] font-medium">{tag.label}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">Address</p>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
              <input
                type="text"
                value={ownerProfile.address}
                onChange={(e) => updateOwner({ address: e.target.value })}
                placeholder="e.g. 123 Sukhumvit Rd, Bangkok"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-muted text-sm outline-none placeholder:text-muted-foreground/40"
                data-testid="input-restaurant-address"
              />
            </div>
          </div>

          <div className="mx-5 h-px bg-gray-100 dark:bg-border" />

          <button
            onClick={() => setActiveSection(activeSection === "photos" ? null : "photos")}
            className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 transition-colors"
            data-testid="button-photos-section"
          >
            <Image className="w-5 h-5 text-blue-500" />
            <div className="flex-1 text-left">
              <p className="font-bold text-[15px]">Photos</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Manage your restaurant photos</p>
            </div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-300 ${activeSection === "photos" ? "rotate-90" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {activeSection === "photos" && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={springConfig}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 pt-1">
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className="aspect-square rounded-xl bg-gray-50 dark:bg-muted border-2 border-dashed border-gray-200 dark:border-border flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
                        data-testid={`button-upload-photo-${i}`}
                      >
                        <Plus className="w-5 h-5 text-muted-foreground/40" />
                        <span className="text-[9px] text-muted-foreground/40 font-medium">Upload</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3">Add up to 10 photos of your restaurant, food, and ambiance</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mx-5 h-px bg-gray-100 dark:bg-border" />

          <button
            onClick={() => setActiveSection(activeSection === "menus" ? null : "menus")}
            className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 transition-colors"
            data-testid="button-menus-section"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(25,50%,92%) 0%, hsl(15,45%,85%) 100%)" }}>
              🍽️
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-[15px]">Menus</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Add and manage your dishes</p>
            </div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-300 ${activeSection === "menus" ? "rotate-90" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {activeSection === "menus" && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={springConfig}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 pt-1">
                  <button
                    className="w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-border text-sm font-medium text-muted-foreground flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                    data-testid="button-add-menu-item"
                  >
                    <Plus className="w-4 h-4" />
                    Add menu item
                  </button>
                  <p className="text-[11px] text-muted-foreground mt-3">Add dishes with photos and prices to appear in swipe cards</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Performance Snapshot</p>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-[#FFCC02]" />
            <span className="text-[10px] font-semibold text-[#FFCC02]">{insights.currentPeakHour}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {overviewStats.map((stat: { label: string; value: number; trend: number }) => {
            const isPositive = stat.trend >= 0;
            return (
              <div
                key={stat.label}
                className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-4"
                data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                <p className="text-[10px] text-muted-foreground font-medium mb-1">{stat.label}</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold tracking-tight leading-none">{stat.value.toLocaleString()}</p>
                  <div className={`flex items-center gap-0.5 ${isPositive ? "text-green-500" : "text-red-400"}`}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    <span className="text-[10px] font-bold">{Math.abs(stat.trend)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Today's Activity</p>
            <p className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
          </div>
          <MiniBarChart data={hourlyValues} maxVal={maxHourly} />
          <div className="flex justify-between mt-1.5">
            <span className="text-[8px] text-muted-foreground/50">12am</span>
            <span className="text-[8px] text-muted-foreground/50">6am</span>
            <span className="text-[8px] text-muted-foreground/50">12pm</span>
            <span className="text-[8px] text-muted-foreground/50">6pm</span>
            <span className="text-[8px] text-muted-foreground/50">11pm</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Quick Stats</p>
          </div>
          <div className="grid grid-cols-3 gap-0">
            <div className="text-center py-3 border-r border-gray-100 dark:border-border">
              <p className="text-lg font-bold tracking-tight">{insights.conversionRate}%</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Conversion</p>
            </div>
            <div className="text-center py-3 border-r border-gray-100 dark:border-border">
              <p className="text-lg font-bold tracking-tight">{insights.avgTimeOnPage ?? "—"}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Avg. Time</p>
            </div>
            <div className="text-center py-3">
              <p className="text-lg font-bold tracking-tight">{insights.returnVisitors}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Returning</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-4">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Engagement Funnel</p>
          <div className="space-y-2.5">
            {insights.engagementFunnel.map((step: any, i: number) => (
              <div key={step.stage} data-testid={`funnel-${i}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium">{step.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tabular-nums">{step.count.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{step.percentage}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${step.percentage}%`,
                      background: i === 0 ? "hsl(222, 47%, 30%)" : i === 1 ? "hsl(222, 47%, 40%)" : i === 2 ? "hsl(210, 50%, 50%)" : i === 3 ? "hsl(35, 80%, 55%)" : "hsl(142, 71%, 45%)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20">
            <p className="text-[11px] text-green-700 dark:text-green-400 font-medium">
              {insights.engagementFunnel[4].percentage}% of viewers convert to delivery taps — {insights.engagementFunnel[4].percentage >= 7 ? "above" : "below"} the 5% category average
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-4">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Delivery Platform Breakdown</p>
          <div className="space-y-3">
            {[
              { name: "Grab", emoji: "🟢", color: "#00B14F", pct: 52 },
              { name: "LINE MAN", emoji: "🟩", color: "#00C300", pct: 33 },
              { name: "Robinhood", emoji: "🟣", color: "#6C2BD9", pct: 15 },
            ].map((platform) => {
              const count = Math.round((insights.overview.deliveryTaps.value * platform.pct) / 100);
              return (
                <div key={platform.name} data-testid={`delivery-platform-${platform.name.toLowerCase().replace(/\s/g, '-')}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{platform.emoji}</span>
                      <span className="text-[12px] font-medium">{platform.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tabular-nums">{count.toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{platform.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${platform.pct}%`, background: platform.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 p-2.5 rounded-xl bg-gray-50 dark:bg-muted">
            <p className="text-[11px] text-muted-foreground font-medium">
              Grab leads with 52% of delivery taps — consider boosting visibility on LINE MAN and Robinhood
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-4">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Revenue Insights</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-3.5">
              <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold mb-1">Est. Weekly Revenue</p>
              <p className="text-xl font-bold tracking-tight text-green-700 dark:text-green-300" data-testid="text-est-revenue">฿{insights.revenueEstimate.estimatedRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-3.5">
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mb-1">Projected Monthly</p>
              <p className="text-xl font-bold tracking-tight text-blue-700 dark:text-blue-300" data-testid="text-proj-monthly">฿{insights.revenueEstimate.projectedMonthly.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-muted flex items-center justify-center">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Avg Order</p>
                <p className="text-[13px] font-bold">฿{insights.revenueEstimate.avgOrderValue}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-muted flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Growth</p>
                <p className="text-[13px] font-bold text-green-500">+{insights.revenueEstimate.revenueGrowth}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {insights.audienceDemographics?.length > 0 && (
        <div className="mb-4">
          <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-4">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Audience Demographics</p>
            <div className="flex items-center gap-1 h-5 rounded-full overflow-hidden mb-3">
              {insights.audienceDemographics.map((demo: any) => (
                <div
                  key={demo.label}
                  className={`h-full ${demo.color} transition-all`}
                  style={{ width: `${demo.percentage}%` }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {insights.audienceDemographics.map((demo: any) => (
                <div key={demo.label} className="flex items-center gap-1.5" data-testid={`demo-${demo.label}`}>
                  <div className={`w-2 h-2 rounded-full ${demo.color}`} />
                  <span className="text-[11px] text-muted-foreground font-medium">{demo.label}</span>
                  <span className="text-[11px] font-bold tabular-nums">{demo.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-4">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">Visitor Loyalty</p>
            <div className="flex items-center gap-3 mb-2.5">
              <div className="relative w-14 h-14">
                <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-muted" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-500" strokeDasharray={`${insights.repeatVisitors.returning} ${100 - insights.repeatVisitors.returning}`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">{insights.repeatVisitors.returning}%</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold">Returning</p>
                <p className="text-[10px] text-muted-foreground">{insights.repeatVisitors.avgVisitsPerUser} avg visits</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-3 h-3 text-amber-400" />
              <p className="text-[10px] text-muted-foreground">Loyalty: <span className="font-bold text-foreground">{insights.repeatVisitors.loyaltyScore}/100</span></p>
            </div>
          </div>
          <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-4">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">Category Rank</p>
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(40,85%,95%) 0%, hsl(35,80%,85%) 100%)" }}>
                <span className="text-2xl font-black text-amber-700" data-testid="text-category-rank">#{insights.competitorBenchmark.yourRank}</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold">of {insights.competitorBenchmark.totalInCategory}</p>
                <p className="text-[10px] text-muted-foreground">restaurants</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <p className="text-[10px] text-muted-foreground">Top <span className="font-bold text-foreground">{100 - insights.competitorBenchmark.percentile}%</span> percentile</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">User Interactions</p>
          </div>
          {insights.userActions.map((action: any, i: number) => {
            const Icon = action.icon;
            return (
              <div key={action.action}>
                <div className="px-4 py-3 flex items-center gap-3" data-testid={`action-${i}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-muted ${action.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="flex-1 text-[13px] font-medium">{action.action}</p>
                  <p className="text-[15px] font-bold tabular-nums">{action.count}</p>
                </div>
                {i < insights.userActions.length - 1 && (
                  <div className="mx-4 h-px bg-gray-100 dark:bg-border" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-gray-100 dark:border-border">
          <button
            onClick={() => setActiveSection(activeSection === "analytics" ? null : "analytics")}
            className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 transition-colors"
            data-testid="button-analytics-section"
          >
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <div className="flex-1 text-left">
              <p className="font-bold text-[15px]">Full Analytics</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Detailed insights, menu stats, and peak hours</p>
            </div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-300 ${activeSection === "analytics" ? "rotate-90" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {activeSection === "analytics" && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={springConfig}
                className="overflow-hidden"
              >
                <div className="px-4 pb-5 pt-1">
                  <div className="flex gap-1 bg-gray-100 dark:bg-muted rounded-xl p-1 mb-4">
                    {(["overview", "menu", "timing"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setAnalyticsTab(tab)}
                        className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                          analyticsTab === tab
                            ? "bg-white dark:bg-card text-foreground shadow-sm"
                            : "text-muted-foreground"
                        }`}
                        data-testid={`tab-analytics-${tab}`}
                      >
                        {tab === "overview" ? "Overview" : tab === "menu" ? "Menu Cards" : "Peak Times"}
                      </button>
                    ))}
                  </div>

                  {analyticsTab === "overview" && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Weekly Performance</p>
                      <div className="space-y-2">
                        {insights.weeklyData.map((day: any) => (
                          <div key={day.day} className="flex items-center gap-3" data-testid={`weekly-${day.day.toLowerCase()}`}>
                            <span className="text-[11px] font-semibold text-muted-foreground w-7">{day.day}</span>
                            <div className="flex-1 h-5 bg-gray-50 dark:bg-muted rounded-full overflow-hidden relative">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${(day.views / 140) * 100}%`,
                                  background: "linear-gradient(90deg, hsl(222,47%,20%) 0%, hsl(222,47%,35%) 100%)",
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-bold tabular-nums w-8 text-right">{day.views}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-muted">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-3.5 h-3.5 text-[#FFCC02]" />
                          <p className="text-[11px] font-bold">Best performing day</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{insights.bestDay} has the highest engagement with {Math.max(...insights.weeklyData.map((d: any) => d.views))} total interactions</p>
                      </div>
                    </div>
                  )}

                  {analyticsTab === "menu" && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Top Menu Items by Swipe Performance</p>
                      <div className="space-y-2.5">
                        {insights.topMenuItems.map((item: any, i: number) => (
                          <div key={item.name} className="flex items-center gap-3" data-testid={`menu-stat-${i}`}>
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                                i === 0 ? "bg-[#FFCC02] text-[#2d2000]" : "bg-gray-100 dark:bg-muted text-muted-foreground"
                              }`}
                            >
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold truncate">{item.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground">{item.swipes} swipes</span>
                                <span className="text-[10px] text-muted-foreground/40">·</span>
                                <span className="text-[10px] text-green-500 font-medium">{item.likes} liked</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-sm font-bold ${item.conversionRate >= 80 ? "text-green-500" : item.conversionRate >= 70 ? "text-foreground" : "text-orange-400"}`}>
                                {item.conversionRate}%
                              </p>
                              <p className="text-[9px] text-muted-foreground">like rate</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-muted">
                        <div className="flex items-center gap-2 mb-2">
                          <Utensils className="w-3.5 h-3.5 text-foreground/60" />
                          <p className="text-[11px] font-bold">Insight</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Mango Sticky Rice has the highest like rate at 88.3%. Consider featuring it with Menu Spotlight to maximize orders.</p>
                      </div>
                    </div>
                  )}

                  {analyticsTab === "timing" && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Peak Engagement Hours</p>
                      <div className="space-y-2">
                        {insights.peakHours.map((peak: any, i: number) => (
                          <div key={peak.time} className="flex items-center gap-3" data-testid={`peak-${i}`}>
                            <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-muted flex items-center justify-center">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold">{peak.time}</p>
                              <p className="text-[10px] text-muted-foreground">{peak.label}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-100 dark:bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${peak.activity}%`,
                                    background: peak.activity >= 85 ? "hsl(142, 71%, 45%)" : peak.activity >= 70 ? "hsl(35, 90%, 55%)" : "hsl(220, 15%, 65%)",
                                  }}
                                />
                              </div>
                              <span className="text-[11px] font-bold tabular-nums w-7 text-right">{peak.activity}%</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4">
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Weekly Heatmap</p>
                        <div className="grid grid-cols-7 gap-1.5">
                          {insights.weeklyData.map((day: any) => {
                            const intensity = day.views / 140;
                            return (
                              <div key={day.day} className="flex flex-col items-center gap-1">
                                <span className="text-[8px] text-muted-foreground/60 font-medium">{day.day}</span>
                                <div
                                  className="w-full aspect-square rounded-lg"
                                  style={{
                                    background: `hsl(222, 47%, ${90 - intensity * 60}%)`,
                                    opacity: 0.4 + intensity * 0.6,
                                  }}
                                />
                                <span className="text-[8px] font-medium text-muted-foreground/60">{day.orders}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-2">
                          <span className="text-[8px] text-muted-foreground/40">Low</span>
                          {[0.2, 0.4, 0.6, 0.8, 1].map(v => (
                            <div key={v} className="w-2.5 h-2.5 rounded-sm" style={{ background: `hsl(222, 47%, ${90 - v * 60}%)`, opacity: 0.4 + v * 0.6 }} />
                          ))}
                          <span className="text-[8px] text-muted-foreground/40">High</span>
                        </div>
                      </div>

                      <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-muted">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-3.5 h-3.5 text-foreground/60" />
                          <p className="text-[11px] font-bold">Timing Insight</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Your lunch peak (12-1pm) drives 95% activity. Consider running Menu Spotlight promotions during 11am to capture pre-lunch browsers.</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3 px-1">Promote Your Business</p>
        <div className="space-y-3">
          {PROMO_PACKAGES.map((pkg) => {
            const Icon = pkg.icon;
            const isActive = ownerProfile.activePackages.includes(pkg.id);
            const isExpanded = selectedPackage === pkg.id;

            return (
              <div
                key={pkg.id}
                className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-gray-100 dark:border-border"
              >
                <button
                  onClick={() => setSelectedPackage(isExpanded ? null : pkg.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 transition-colors"
                  data-testid={`button-package-${pkg.id}`}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: pkg.bgGradient }}
                  >
                    <Icon className="w-5 h-5" style={{ color: pkg.color }} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[15px]">{pkg.name}</p>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[9px] font-bold uppercase tracking-wider">Active</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{pkg.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-foreground/70">{pkg.price}</span>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`} />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={springConfig}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1">
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{pkg.details}</p>

                        {pkg.id === "menu_spotlight" && (
                          <div className="mb-4 p-3.5 rounded-xl bg-gray-50 dark:bg-muted">
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">Preview</p>
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-border flex items-center justify-center text-xl">🍜</div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold">Your Featured Dish</p>
                                <p className="text-[11px] text-muted-foreground">Appears in swipe cards with a <span className="text-[#FFCC02] font-semibold">Promoted</span> badge</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {pkg.id === "restaurant_boost" && (
                          <div className="mb-4 p-3.5 rounded-xl bg-gray-50 dark:bg-muted">
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">What you get</p>
                            <div className="space-y-2">
                              {["Top position in search results", "Promoted badge on your listing", "Weekly performance analytics"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-foreground/5 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-foreground/60" />
                                  </div>
                                  <p className="text-xs text-foreground/80">{item}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            const newPkgs = isActive
                              ? ownerProfile.activePackages.filter(p => p !== pkg.id)
                              : [...ownerProfile.activePackages, pkg.id];
                            updateOwner({ activePackages: newPkgs });
                          }}
                          className={`w-full py-3.5 rounded-2xl font-semibold text-sm active:scale-[0.97] transition-transform ${
                            isActive
                              ? "bg-gray-100 dark:bg-muted text-foreground"
                              : "bg-foreground text-white"
                          }`}
                          style={!isActive ? { boxShadow: "0 4px 14px rgba(0,0,0,0.15)" } : {}}
                          data-testid={`button-activate-${pkg.id}`}
                        >
                          {isActive ? "Deactivate" : "Activate Package"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Campaigns</p>
          <button
            onClick={() => {
              const now = new Date();
              const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
              setCampaignForm({
                title: "", dealType: "percentage", dealValue: "", description: "",
                startDate: today, endDate: "", conditions: [], minSpend: "", maxRedemptions: "",
                targetGroups: [],
              });
              setEditingCampaignId(null);
              setShowCampaignForm(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-white text-[11px] font-semibold active:scale-[0.97] transition-transform"
            data-testid="button-create-campaign"
          >
            <Plus className="w-3.5 h-3.5" />
            New Campaign
          </button>
        </div>

        {(ownerProfile.campaigns || []).length === 0 && !showCampaignForm && (
          <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-muted flex items-center justify-center mx-auto mb-3">
              <Megaphone className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-[13px] font-semibold text-foreground/70 mb-1">No campaigns yet</p>
            <p className="text-[11px] text-muted-foreground">Create your first campaign to attract more diners with special deals</p>
          </div>
        )}

        {(ownerProfile.campaigns || []).map((campaign) => {
          const isActive = campaign.status === "active";
          const isScheduled = campaign.status === "scheduled";
          const isPaused = campaign.status === "paused";
          const isEnded = campaign.status === "ended";
          const isDraft = campaign.status === "draft";
          const dealLabel = campaign.dealType === "percentage" ? `${campaign.dealValue}% off`
            : campaign.dealType === "bogo" ? "Buy 1 Get 1"
            : campaign.dealType === "freeItem" ? `Free ${campaign.dealValue}`
            : `฿${campaign.dealValue} off`;
          const showPreview = previewCampaignId === campaign.id;

          const handleStatusChange = async (newStatus: Campaign["status"]) => {
            const updated = (ownerProfile.campaigns || []).map(c =>
              c.id === campaign.id ? { ...c, status: newStatus } : c
            );
            updateOwner({ campaigns: updated });
            if (campaign.serverId) {
              try {
                await apiRequest("PATCH", `/api/campaigns/${campaign.serverId}`, { status: newStatus });
              } catch {}
            }
          };

          const handleDelete = async () => {
            const updated = (ownerProfile.campaigns || []).filter(c => c.id !== campaign.id);
            updateOwner({ campaigns: updated });
            if (campaign.serverId) {
              try {
                await apiRequest("DELETE", `/api/campaigns/${campaign.serverId}`);
              } catch {}
            }
          };

          return (
            <div key={campaign.id} className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border overflow-hidden mb-2.5">
              <div className="px-5 py-4 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                  isActive ? "bg-green-50" : isScheduled ? "bg-indigo-50" : isPaused ? "bg-amber-50" : isEnded ? "bg-gray-50" : "bg-blue-50"
                }`}>
                  <Tag className={`w-5 h-5 ${
                    isActive ? "text-green-500" : isScheduled ? "text-indigo-500" : isPaused ? "text-amber-500" : isEnded ? "text-gray-400" : "text-blue-500"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[15px] truncate">{campaign.title || "Untitled Campaign"}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${
                      isActive ? "bg-green-50 text-green-600"
                      : isScheduled ? "bg-indigo-50 text-indigo-600"
                      : isPaused ? "bg-amber-50 text-amber-600"
                      : isEnded ? "bg-gray-100 text-gray-500"
                      : "bg-blue-50 text-blue-600"
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{dealLabel}</p>
                  {campaign.startDate && campaign.endDate && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {campaign.startDate} → {campaign.endDate}
                    </p>
                  )}
                  {campaign.targetGroups && campaign.targetGroups.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <Target className="w-3 h-3 text-muted-foreground/50" />
                      {campaign.targetGroups.slice(0, 3).map((g, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-[9px] font-medium text-indigo-600 dark:text-indigo-400">
                          {g}
                        </span>
                      ))}
                      {campaign.targetGroups.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{campaign.targetGroups.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isDraft && (
                    <button
                      onClick={() => setPreviewCampaignId(showPreview ? null : campaign.id)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform ${showPreview ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-50 dark:bg-muted"}`}
                      data-testid={`button-preview-campaign-${campaign.id}`}
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                    </button>
                  )}
                  {isDraft && (
                    <button
                      onClick={() => {
                        const startDate = campaign.startDate ? new Date(campaign.startDate) : null;
                        const now = new Date();
                        const newStatus = startDate && startDate > now ? "scheduled" : "active";
                        handleStatusChange(newStatus);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-green-500 text-white text-[10px] font-bold active:scale-90 transition-transform"
                      data-testid={`button-publish-campaign-${campaign.id}`}
                    >
                      <Send className="w-3 h-3" />
                      Publish
                    </button>
                  )}
                  {(isActive || isScheduled) && !isEnded && (
                    <button
                      onClick={() => handleStatusChange("paused")}
                      className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-muted active:scale-90 transition-transform"
                      data-testid={`button-pause-campaign-${campaign.id}`}
                    >
                      <span className="text-[11px]">⏸</span>
                    </button>
                  )}
                  {isPaused && (
                    <button
                      onClick={() => handleStatusChange("active")}
                      className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-muted active:scale-90 transition-transform"
                      data-testid={`button-resume-campaign-${campaign.id}`}
                    >
                      <span className="text-[11px]">▶️</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setCampaignForm({
                        title: campaign.title,
                        dealType: campaign.dealType,
                        dealValue: campaign.dealValue,
                        description: campaign.description,
                        startDate: campaign.startDate,
                        endDate: campaign.endDate,
                        conditions: campaign.conditions,
                        minSpend: campaign.minSpend,
                        maxRedemptions: campaign.maxRedemptions,
                        targetGroups: campaign.targetGroups || [],
                      });
                      setEditingCampaignId(campaign.id);
                      setShowCampaignForm(true);
                    }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-muted active:scale-90 transition-transform"
                    data-testid={`button-edit-campaign-${campaign.id}`}
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-muted active:scale-90 transition-transform"
                    data-testid={`button-delete-campaign-${campaign.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
              {campaign.conditions.length > 0 && (
                <div className="px-5 pb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {campaign.conditions.map((cond, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-muted text-[10px] font-medium text-muted-foreground">
                        {cond}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence initial={false}>
                {isDraft && showPreview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 22, stiffness: 200, mass: 1 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 pt-1">
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">Diner Preview</p>
                      <div className="rounded-xl border border-dashed border-gray-200 dark:border-border p-4 bg-gray-50/50 dark:bg-muted/50">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center flex-shrink-0">
                            <Tag className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full bg-green-500 text-white text-[9px] font-bold uppercase">
                                {dealLabel}
                              </span>
                            </div>
                            <p className="text-[14px] font-bold mt-1.5">{ownerProfile.restaurantName || "Your Restaurant"}</p>
                            {campaign.description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{campaign.description}</p>
                            )}
                            {campaign.startDate && campaign.endDate && (
                              <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {campaign.startDate} - {campaign.endDate}
                              </p>
                            )}
                            {campaign.conditions.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {campaign.conditions.map((cond, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-full bg-white dark:bg-card text-[9px] font-medium text-muted-foreground border border-gray-100 dark:border-border">
                                    {cond}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <AnimatePresence>
          {showCampaignForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-end justify-center"
              onClick={() => setShowCampaignForm(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 22, stiffness: 200, mass: 1 }}
                className="w-full max-w-md bg-white dark:bg-card rounded-t-[28px] p-6 pb-12 max-h-[90vh] overflow-y-auto"
                style={{ boxShadow: "0 -10px 40px rgba(0,0,0,0.12)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[17px] font-bold text-foreground">
                    {editingCampaignId ? "Edit Campaign" : "Create Campaign"}
                  </h3>
                  <button
                    onClick={() => setShowCampaignForm(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-muted flex items-center justify-center"
                    data-testid="button-close-campaign-form"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">Campaign Name</label>
                    <input
                      type="text"
                      value={campaignForm.title}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Lunch Hour Happy Deal"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-muted text-sm outline-none placeholder:text-muted-foreground/40"
                      data-testid="input-campaign-title"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">Deal Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: "percentage", label: "% Off", icon: Percent },
                        { value: "bogo", label: "Buy 1 Get 1", icon: Tag },
                        { value: "freeItem", label: "Free Item", icon: Sparkles },
                        { value: "fixedAmount", label: "฿ Off", icon: Tag },
                      ] as const).map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.value}
                            onClick={() => setCampaignForm(prev => ({ ...prev, dealType: type.value }))}
                            className={`flex items-center gap-2 px-3.5 py-3 rounded-xl text-[12px] font-semibold transition-all ${
                              campaignForm.dealType === type.value
                                ? "bg-foreground text-white"
                                : "bg-gray-50 dark:bg-muted text-foreground/70"
                            }`}
                            data-testid={`button-deal-type-${type.value}`}
                          >
                            <Icon className="w-4 h-4" />
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">
                      {campaignForm.dealType === "percentage" ? "Discount %" :
                       campaignForm.dealType === "fixedAmount" ? "Amount (฿)" :
                       campaignForm.dealType === "freeItem" ? "Free Item Name" : "Details"}
                    </label>
                    <input
                      type="text"
                      value={campaignForm.dealValue}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, dealValue: e.target.value }))}
                      placeholder={
                        campaignForm.dealType === "percentage" ? "e.g. 20" :
                        campaignForm.dealType === "fixedAmount" ? "e.g. 100" :
                        campaignForm.dealType === "freeItem" ? "e.g. Thai Iced Tea" : "Details"
                      }
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-muted text-sm outline-none placeholder:text-muted-foreground/40"
                      data-testid="input-campaign-deal-value"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">Description</label>
                    <textarea
                      value={campaignForm.description}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your deal to diners..."
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-muted text-sm outline-none placeholder:text-muted-foreground/40 resize-none"
                      data-testid="input-campaign-description"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2.5 block">Campaign Duration</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-muted rounded-2xl p-3 border border-gray-100 dark:border-border flex flex-col">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Calendar className="w-3 h-3 text-green-500" />
                          <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Start Date</p>
                        </div>
                        <input
                          type="date"
                          value={campaignForm.startDate}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-card text-[13px] outline-none border border-gray-100 dark:border-border font-medium appearance-none"
                          style={{ minHeight: 40 }}
                          data-testid="input-campaign-start-date"
                        />
                      </div>
                      <div className="bg-gray-50 dark:bg-muted rounded-2xl p-3 border border-gray-100 dark:border-border flex flex-col">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Calendar className="w-3 h-3 text-red-400" />
                          <p className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider">End Date</p>
                        </div>
                        <input
                          type="date"
                          value={campaignForm.endDate}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, endDate: e.target.value }))}
                          min={campaignForm.startDate || undefined}
                          className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-card text-[13px] outline-none border border-gray-100 dark:border-border font-medium appearance-none"
                          style={{ minHeight: 40 }}
                          data-testid="input-campaign-end-date"
                        />
                      </div>
                    </div>
                    {campaignForm.startDate && campaignForm.endDate && (
                      <div className="mt-2.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center gap-2">
                        <Clock className="w-3 h-3 text-blue-500" />
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          {Math.max(1, Math.ceil((new Date(campaignForm.endDate).getTime() - new Date(campaignForm.startDate).getTime()) / 86400000))} day campaign
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">Conditions</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[
                        "Dine-in only",
                        "Takeaway only",
                        "First-time customers",
                        "Weekdays only",
                        "Weekends only",
                        "Lunch hours (11am-2pm)",
                        "Dinner hours (5pm-9pm)",
                        "Minimum 2 pax",
                      ].map((cond) => (
                        <button
                          key={cond}
                          onClick={() => {
                            setCampaignForm(prev => ({
                              ...prev,
                              conditions: prev.conditions.includes(cond)
                                ? prev.conditions.filter(c => c !== cond)
                                : [...prev.conditions, cond],
                            }));
                          }}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                            campaignForm.conditions.includes(cond)
                              ? "bg-foreground text-white"
                              : "bg-gray-50 dark:bg-muted text-foreground/60"
                          }`}
                          data-testid={`button-condition-${cond.toLowerCase().replace(/\s/g, '-')}`}
                        >
                          {cond}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">Min. Spend (฿)</label>
                      <input
                        type="text"
                        value={campaignForm.minSpend}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, minSpend: e.target.value }))}
                        placeholder="e.g. 300"
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-muted text-sm outline-none placeholder:text-muted-foreground/40"
                        data-testid="input-campaign-min-spend"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">Max Redemptions</label>
                      <input
                        type="text"
                        value={campaignForm.maxRedemptions}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, maxRedemptions: e.target.value }))}
                        placeholder="e.g. 100"
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-muted text-sm outline-none placeholder:text-muted-foreground/40"
                        data-testid="input-campaign-max-redemptions"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">Target Audience</label>
                    <p className="text-[11px] text-muted-foreground mb-2">Select customer segments to target with this campaign</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {segments.map((seg) => {
                        const isSelected = campaignForm.targetGroups.includes(seg.name);
                        return (
                          <button
                            key={seg.id}
                            onClick={() => {
                              setCampaignForm(prev => ({
                                ...prev,
                                targetGroups: isSelected
                                  ? prev.targetGroups.filter(g => g !== seg.name)
                                  : [...prev.targetGroups, seg.name],
                              }));
                            }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium transition-all ${
                              isSelected
                                ? "bg-indigo-500 text-white"
                                : "bg-gray-50 dark:bg-muted text-foreground/60"
                            }`}
                            data-testid={`button-segment-${seg.id}`}
                          >
                            <Users className="w-3 h-3" />
                            <span>{seg.name}</span>
                            <span className={`text-[9px] ${isSelected ? "text-white/70" : "text-muted-foreground/50"}`}>
                              {seg.estimatedCount.toLocaleString()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customGroupInput}
                        onChange={(e) => setCustomGroupInput(e.target.value)}
                        placeholder="Add custom group..."
                        className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-muted text-sm outline-none placeholder:text-muted-foreground/40"
                        data-testid="input-custom-target-group"
                      />
                      <button
                        onClick={() => {
                          const val = customGroupInput.trim();
                          if (val && !campaignForm.targetGroups.includes(val)) {
                            setCampaignForm(prev => ({
                              ...prev,
                              targetGroups: [...prev.targetGroups, val],
                            }));
                            setCustomGroupInput("");
                          }
                        }}
                        className="px-3 py-2.5 rounded-xl bg-foreground text-white text-sm font-semibold active:scale-95 transition-transform"
                        data-testid="button-add-custom-group"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {campaignForm.targetGroups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {campaignForm.targetGroups.map((g, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-[10px] font-medium text-indigo-600 dark:text-indigo-400"
                          >
                            {g}
                            <button
                              onClick={() => setCampaignForm(prev => ({ ...prev, targetGroups: prev.targetGroups.filter((_, idx) => idx !== i) }))}
                              className="ml-0.5"
                              data-testid={`button-remove-group-${i}`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2.5 block">Preview</label>
                    <div
                      className="rounded-2xl border border-gray-100 dark:border-border overflow-hidden"
                      style={{ boxShadow: "0 4px 20px -4px rgba(0,0,0,0.08)" }}
                      data-testid="campaign-preview-card"
                    >
                      <div className="relative bg-gradient-to-br from-[#1E293B] to-[#334155] p-5 pb-4">
                        <div className="absolute top-3 right-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#FFCC02] text-[#1A1A1A]">
                            {campaignForm.dealType === "percentage" ? `${campaignForm.dealValue || "?"}% Off` :
                             campaignForm.dealType === "bogo" ? "Buy 1 Get 1" :
                             campaignForm.dealType === "freeItem" ? "Free Item" :
                             campaignForm.dealType === "fixedAmount" ? `฿${campaignForm.dealValue || "?"} Off` : "Deal"}
                          </span>
                        </div>
                        <p className={`font-bold text-[15px] leading-snug pr-20 ${campaignForm.title ? "text-white" : "text-white/30"}`}>{campaignForm.title || "Campaign title"}</p>
                        <p className={`text-[11px] mt-1.5 leading-relaxed line-clamp-2 ${campaignForm.description ? "text-white/60" : "text-white/20"}`}>{campaignForm.description || "Add a description for diners..."}</p>
                      </div>
                      <div className="bg-white dark:bg-card px-5 py-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {campaignForm.startDate && (
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                <span className="font-medium">
                                  {new Date(campaignForm.startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  {campaignForm.endDate && (
                                    <> - {new Date(campaignForm.endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                                  )}
                                </span>
                              </div>
                            )}
                            {campaignForm.conditions.length > 0 && (
                              <span className="text-[9px] text-muted-foreground/60 truncate">{campaignForm.conditions[0]}{campaignForm.conditions.length > 1 && ` +${campaignForm.conditions.length - 1}`}</span>
                            )}
                          </div>
                          {campaignForm.targetGroups.length > 0 && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Target className="w-2.5 h-2.5 text-indigo-400" />
                              <span className="text-[9px] text-indigo-500 font-medium">{campaignForm.targetGroups.length} segment{campaignForm.targetGroups.length > 1 ? "s" : ""}</span>
                            </div>
                          )}
                        </div>
                        {(campaignForm.minSpend || campaignForm.maxRedemptions) && (
                          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-50 dark:border-border">
                            {campaignForm.minSpend && (
                              <span className="text-[9px] text-muted-foreground">Min. ฿{campaignForm.minSpend}</span>
                            )}
                            {campaignForm.maxRedemptions && (
                              <span className="text-[9px] text-muted-foreground">{campaignForm.maxRedemptions} redemptions max</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">This is how diners will see your campaign</p>
                  </div>

                  <button
                    onClick={async () => {
                      if (!campaignForm.title.trim()) return;
                      if (editingCampaignId) {
                        const existingCampaign = (ownerProfile.campaigns || []).find(c => c.id === editingCampaignId);
                        const updated = (ownerProfile.campaigns || []).map(c =>
                          c.id === editingCampaignId ? { ...c, ...campaignForm } : c
                        );
                        updateOwner({ campaigns: updated });
                        if (existingCampaign?.serverId) {
                          try {
                            await apiRequest("PATCH", `/api/campaigns/${existingCampaign.serverId}`, {
                              ...campaignForm,
                            });
                          } catch {}
                        }
                      } else {
                        const localId = Date.now().toString();
                        const newCampaign: Campaign = {
                          ...campaignForm,
                          id: localId,
                          status: "draft",
                        };
                        try {
                          const res = await apiRequest("POST", "/api/campaigns", {
                            restaurantOwnerKey: ownerKey,
                            title: campaignForm.title,
                            dealType: campaignForm.dealType,
                            dealValue: campaignForm.dealValue || null,
                            description: campaignForm.description || null,
                            startDate: campaignForm.startDate || null,
                            endDate: campaignForm.endDate || null,
                            conditions: campaignForm.conditions,
                            minSpend: campaignForm.minSpend || null,
                            maxRedemptions: campaignForm.maxRedemptions || null,
                            targetGroups: campaignForm.targetGroups,
                            status: "draft",
                            createdAt: new Date().toISOString(),
                          });
                          const serverCampaign = await res.json();
                          newCampaign.serverId = serverCampaign.id;
                        } catch {}
                        updateOwner({ campaigns: [...(ownerProfile.campaigns || []), newCampaign] });
                      }
                      setShowCampaignForm(false);
                    }}
                    className="w-full py-3.5 rounded-2xl bg-foreground text-white font-semibold text-sm active:scale-[0.97] transition-transform"
                    style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}
                    data-testid="button-save-campaign"
                  >
                    {editingCampaignId ? "Save Changes" : "Create Campaign"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatsRow() {
  const { mineCount, partnerCount } = useSavedRestaurants();
  const [stats, setStats] = useState({ totalSwipes: 0, likes: 0 });

  useEffect(() => {
    try {
      const tasteData = localStorage.getItem("toast_taste_profile");
      if (tasteData) {
        const parsed = JSON.parse(tasteData);
        let totalLikes = 0;
        let totalSwipes = 0;

        for (const [, data] of Object.entries(parsed)) {
          const d = data as { likes: number; dislikes: number; superlikes: number };
          const likes = (d.likes || 0) + (d.superlikes || 0);
          const total = likes + (d.dislikes || 0);
          totalLikes += likes;
          totalSwipes += total;
        }
        setStats({ totalSwipes, likes: totalLikes });
      }
    } catch {}
  }, []);

  const items = [
    { label: "Swipes", value: stats.totalSwipes, testId: "text-total-swipes" },
    { label: "Liked", value: stats.likes, testId: "text-total-likes" },
    { label: "Saved", value: mineCount, testId: "text-saved-count" },
    { label: "Shared", value: partnerCount, testId: "text-partner-saves" },
  ];

  return (
    <div className="flex items-center justify-around py-4 mb-4 border-b border-gray-100 dark:border-border">
      {items.map((item, idx) => (
        <div key={item.label} className="flex flex-col items-center">
          <p className="text-xl font-bold tracking-tight leading-none" data-testid={item.testId}>{item.value}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function PartnerRow({ profile, onInvite, onManualAdd, onUnlink }: {
  profile: LocalProfile;
  onInvite: () => void;
  onManualAdd: () => void;
  onUnlink: () => void;
}) {
  const [, navigate] = useLocation();
  const { partnerCount } = useSavedRestaurants();

  return (
    <div data-testid="button-partner-section">
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(340,50%,92%) 0%, hsl(330,45%,85%) 100%)" }}>
          💕
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px]">Partner</p>
          {profile.partnerLinked ? (
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-muted overflow-hidden flex items-center justify-center text-[10px]">
                {profile.partnerPictureUrl ? (
                  <img src={profile.partnerPictureUrl} alt={profile.partnerName} className="w-full h-full object-cover" />
                ) : "👤"}
              </div>
              <p className="text-[11px] text-muted-foreground truncate" data-testid="text-partner-name">{profile.partnerName}</p>
              {partnerCount > 0 && (
                <span className="text-[10px] text-pink-500 font-medium ml-1">{partnerCount} shared</span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-0.5">Invite or add a partner</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {profile.partnerLinked ? (
            <>
              {partnerCount > 0 && (
                <button
                  onClick={() => navigate("/restaurants?bucket=partner")}
                  className="text-[11px] text-pink-500 font-semibold active:scale-95 transition-transform"
                  data-testid="button-view-partner-saves"
                >
                  View
                </button>
              )}
              <button
                onClick={onUnlink}
                className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform text-red-400"
                data-testid="button-unlink-partner"
              >
                <Unlink className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onInvite}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#06C755] text-white text-[11px] font-semibold active:scale-95 transition-transform"
                data-testid="button-invite-partner-line"
              >
                <UserPlus className="w-3 h-3" />
                Invite
              </button>
              <button
                onClick={onManualAdd}
                className="text-[11px] text-muted-foreground font-medium active:scale-95 transition-transform"
                data-testid="button-add-partner-manual"
              >
                Add
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SavedSection() {
  const [, navigate] = useLocation();
  const { data, isSaved, getBucket, unsave, mineCount, partnerCount } = useSavedRestaurants();
  const [expanded, setExpanded] = useState(false);
  const totalSaved = mineCount + partnerCount;

  const allSavedIds = useMemo(() => [...data.mine, ...data.partner], [data]);

  const { data: allRestaurants = [] } = useQuery<RestaurantResponse[]>({
    queryKey: ["/api/restaurants"],
    enabled: allSavedIds.length > 0,
  });

  const savedRestaurants = useMemo(() => {
    return allRestaurants.filter(r => allSavedIds.includes(r.id));
  }, [allRestaurants, allSavedIds]);

  return (
    <div
      className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-gray-100 dark:border-border"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 dark:active:bg-muted/50 transition-colors"
        data-testid="button-saved-section"
      >
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(0,55%,92%) 0%, hsl(350,50%,85%) 100%)" }}>
          ❤️
        </div>
        <div className="flex-1 text-left">
          <p className="font-bold text-[15px]">Saved</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {totalSaved === 0 ? "No saved restaurants" : `${mineCount} saved · ${partnerCount} shared`}
          </p>
        </div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-300 ${expanded ? "rotate-90" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={springConfig}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1">
              {savedRestaurants.length === 0 ? (
                <div className="text-center py-6">
                  <span className="text-3xl block mb-2">🍽️</span>
                  <p className="text-sm text-muted-foreground">No restaurants saved yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Tap the heart on any restaurant to save it</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedRestaurants.map((r) => {
                    const bucket = getBucket(r.id);
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-gray-50 dark:bg-muted active:bg-gray-100 dark:active:bg-muted/80 transition-colors"
                        data-testid={`saved-restaurant-${r.id}`}
                      >
                        <button
                          onClick={() => navigate(`/restaurant/${r.id}`)}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                            <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-semibold truncate">{r.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              ★ {r.rating} · {r.category}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs">
                            {bucket === "partner" ? "💕" : "❤️"}
                          </span>
                          <button
                            onClick={() => unsave(r.id)}
                            className="w-7 h-7 rounded-full bg-white dark:bg-background flex items-center justify-center active:scale-90 transition-transform border border-gray-100 dark:border-border"
                            data-testid={`button-unsave-${r.id}`}
                          >
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
