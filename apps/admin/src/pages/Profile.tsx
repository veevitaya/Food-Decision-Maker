import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useLineProfile } from "@/hooks/use-line-profile";
import { sendGroupInvite } from "@/lib/liff";
import { BottomNav } from "@/components/BottomNav";
import { useSavedRestaurants } from "@/hooks/use-saved-restaurants";
import { ChevronRight, UserPlus, Unlink, LogIn, LogOut, X, Store, User, Star, TrendingUp, Image, Sparkles, Plus, Check, Crown, Eye, ExternalLink, MapPin, Clock, BarChart3, ArrowUpRight, ArrowDownRight, Utensils, Zap, Calendar, Megaphone, Tag, Percent, Trash2, Send, Users, Target, Search, Shield, AlertTriangle, Upload, FileText, Building2, Phone, Mail, ChevronDown, ShieldCheck, Globe } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RestaurantResponse } from "@shared/routes";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { LanguagePreference } from "@/i18n/index";

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
  { value: "street_food", label: "Street Food", emoji: "🍢" },
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
  { value: "street_food", label: "Street Food", emoji: "🍢" },
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
  photos?: string[];
  ownerName?: string;
  ownerContact?: string;
  phone?: string;
  documents?: { businessReg?: string; ownershipProof?: string; photoId?: string };
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

const LANGUAGE_OPTIONS: { value: LanguagePreference; labelKey: string; flag: string }[] = [
  { value: "auto", labelKey: "profile.language_auto", flag: "🌐" },
  { value: "en", labelKey: "profile.language_english", flag: "🇬🇧" },
  { value: "th", labelKey: "profile.language_thai", flag: "🇹🇭" },
];

export default function Profile() {
  const [, navigate] = useLocation();
  const { profile: lineProfile, liffAvailable, login: lineLogin, logout: lineLogout } = useLineProfile();
  const { locale, preference: languagePreference, setLanguage, t } = useLanguage();
  const [localProfile, setLocalProfile] = useState<LocalProfile>(getStoredProfile);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerInput, setPartnerInput] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isOwnerMode, setIsOwnerMode] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<"choice" | "profile" | "register" | "claim" | "claim-confirm" | "documents" | "submitted">("choice");
  const [ownerName, setOwnerName] = useState("");
  const [ownerContact, setOwnerContact] = useState("");
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [newRestaurantCategory, setNewRestaurantCategory] = useState("");
  const [newRestaurantAddress, setNewRestaurantAddress] = useState("");
  const [newRestaurantPhone, setNewRestaurantPhone] = useState("");
  const [claimSearchQuery, setClaimSearchQuery] = useState("");
  const [selectedClaimRestaurant, setSelectedClaimRestaurant] = useState<any>(null);
  const [claimConfirmText, setClaimConfirmText] = useState("");
  const [onboardingPath, setOnboardingPath] = useState<"register" | "claim">("register");
  const [docBusinessReg, setDocBusinessReg] = useState("");
  const [docOwnershipProof, setDocOwnershipProof] = useState("");
  const [docPhotoId, setDocPhotoId] = useState("");

  const ONBOARDING_STATUS_KEY = "toast_owner_onboarding_status";

  const ownerOnboardingStatus = (() => {
    try {
      const stored = localStorage.getItem(ONBOARDING_STATUS_KEY);
      if (stored) return JSON.parse(stored) as { status: "pending" | "approved" | "rejected"; restaurantName: string };
    } catch {}
    return null;
  })();

  const ownerOnboarded = (() => {
    const status = ownerOnboardingStatus?.status;
    if (status === "approved") return true;
    try {
      const stored = localStorage.getItem(OWNER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const hasName = !!(parsed.restaurantName && parsed.restaurantName.trim());
        return hasName && status === "approved";
      }
    } catch {}
    return false;
  })();

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
    await sendGroupInvite("partner-link");
  };

  const displayName = localProfile.displayName || lineProfile?.displayName || "Toast Lover";
  const pictureUrl = localProfile.pictureUrl || lineProfile?.pictureUrl || "";

  return (
    <div className="w-full min-h-[100dvh] bg-[#FCFCFC] dark:bg-background" data-testid="profile-page">
      <div className="px-6 pt-14 pb-6">
        <div className="flex items-center justify-between mb-8">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40"
            data-testid="text-profile-label"
          >
            {isOwnerMode ? t("profile.business") : t("profile.title")}
          </p>
          <div className="flex items-center gap-2" />
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
            <p className="text-[22px] font-bold tracking-tight">{t("profile.business_dashboard")}</p>
          ) : (
            <>
              <input
                type="text"
                value={localProfile.displayName}
                onChange={(e) => updateProfile({ displayName: e.target.value })}
                placeholder={t("profile.your_name")}
                className="text-[22px] font-bold bg-transparent border-none outline-none text-center w-full placeholder:text-muted-foreground/30 tracking-tight"
                data-testid="input-display-name"
              />
              {!liffAvailable && !lineProfile && (
                <p className="text-[11px] text-muted-foreground/50 mt-1">{t("profile.open_in_line")}</p>
              )}
              {lineProfile && (
                <p className="text-[11px] text-[#06C755] font-medium mt-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#06C755] inline-block" />
                  {t("profile.connected_via_line")}
                </p>
              )}
            </>
          )}
        </div>

        {ownerOnboarded && (
          <ProfileToggle isOwnerMode={isOwnerMode} onToggle={setIsOwnerMode} />
        )}
      </div>

      <div className="px-5 pb-32">
        <AnimatePresence mode="wait" initial={false}>
          {isOwnerMode && ownerOnboarded ? (
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
              <StatsRow t={t} />

              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40 mb-2 mt-2 px-1">{t("profile.section_food")}</p>
              <div className="mb-5">
                <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-gray-100 dark:border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <button
                    onClick={() => setActiveSection(activeSection === "dietary" ? null : "dietary")}
                    className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 dark:active:bg-muted/50 transition-colors"
                    data-testid="button-dietary-section"
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(130,45%,92%) 0%, hsl(140,40%,85%) 100%)" }}>
                      🥗
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[15px]">{t("profile.dietary_title")}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {localProfile.dietaryRestrictions.length > 0
                          ? localProfile.dietaryRestrictions.map(v => t(`profile.${v === "shellfish_free" ? "no_shellfish" : v}`)).filter(Boolean).join(", ")
                          : t("profile.no_restrictions")}
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
                                {t(`profile.${opt.value === "shellfish_free" ? "no_shellfish" : opt.value}`)}
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
                      <p className="font-bold text-[15px]">{t("profile.cuisine_title")}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {localProfile.cuisinePreferences.length > 0
                          ? localProfile.cuisinePreferences.map(v => CUISINE_OPTIONS.find(o => o.value === v)?.emoji).filter(Boolean).join("  ")
                          : t("profile.all_cuisines")}
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
                                {t(`cuisine.${opt.value}`)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mx-5 h-px bg-gray-100 dark:bg-border" />

                  <button
                    onClick={() => setActiveSection(activeSection === "defaults" ? null : "defaults")}
                    className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 dark:active:bg-muted/50 transition-colors"
                    data-testid="button-defaults-section"
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(220,50%,92%) 0%, hsl(230,45%,85%) 100%)" }}>
                      🎯
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[15px]">{t("profile.budget_level")} & {t("profile.search_radius")}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {"฿".repeat(localProfile.defaultBudget)} · {localProfile.defaultDistance === "any" ? t("profile.anywhere") : localProfile.defaultDistance}
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
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">{t("profile.budget_level")}</p>
                            <div className="grid grid-cols-4 gap-2">
                              {BUDGET_OPTIONS.map(opt => {
                                const descKey = `profile.budget_${opt.value === 1 ? "budget" : opt.value === 2 ? "moderate" : opt.value === 3 ? "upscale" : "fine"}`;
                                return (
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
                                    <p className={`text-[8px] mt-0.5 ${localProfile.defaultBudget === opt.value ? "text-white/60" : "text-muted-foreground/50"}`}>{t(descKey)}</p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">{t("profile.search_radius")}</p>
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
                                  {opt.value === "any" ? t("profile.anywhere") : opt.label}
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

              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40 mb-2 px-1">{t("profile.section_app")}</p>
              <div className="mb-5">
                <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-gray-100 dark:border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <button
                    onClick={() => setActiveSection(activeSection === "language" ? null : "language")}
                    className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 dark:active:bg-muted/50 transition-colors"
                    data-testid="button-language-section"
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(270,50%,92%) 0%, hsl(280,45%,85%) 100%)" }}>
                      🌐
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[15px]">{t("profile.language_title")}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {languagePreference === "auto" ? t("profile.language_auto") : languagePreference === "th" ? "ไทย" : "English"}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-300 ${activeSection === "language" ? "rotate-90" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {activeSection === "language" && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={springConfig}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5">
                          <div className="flex gap-2">
                            {LANGUAGE_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setLanguage(opt.value)}
                                data-testid={`button-language-${opt.value}`}
                                className={`flex-1 py-3 rounded-xl text-[12px] font-medium transition-all duration-200 active:scale-95 border ${
                                  languagePreference === opt.value
                                    ? "bg-foreground text-white border-foreground"
                                    : "bg-white dark:bg-muted text-foreground/50 border-gray-100 dark:border-border"
                                }`}
                                style={languagePreference === opt.value ? { boxShadow: "0 2px 8px rgba(0,0,0,0.15)" } : {}}
                              >
                                <span className="mr-1">{opt.flag}</span> {t(opt.labelKey)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mx-5 h-px bg-gray-100 dark:bg-border" />

                  <button
                    className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 dark:active:bg-muted/50 transition-colors"
                    data-testid="button-notifications-section"
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(40,60%,92%) 0%, hsl(35,50%,85%) 100%)" }}>
                      🔔
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[15px]">{t("profile.notifications")}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t("profile.notifications_desc")}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  </button>

                  <div className="mx-5 h-px bg-gray-100 dark:bg-border" />

                  <button
                    className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 dark:active:bg-muted/50 transition-colors"
                    data-testid="button-contact-support"
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(340,50%,92%) 0%, hsl(350,45%,85%) 100%)" }}>
                      💬
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[15px]">{t("profile.contact_support")}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  </button>

                  <div className="mx-5 h-px bg-gray-100 dark:bg-border" />

                  <button
                    onClick={() => {
                      if (window.confirm(t("profile.clear_data_confirm"))) {
                        localStorage.removeItem(PROFILE_STORAGE_KEY);
                        localStorage.removeItem("toast_taste_profile");
                        localStorage.removeItem("toast_saved_restaurants");
                        setLocalProfile(getStoredProfile());
                      }
                    }}
                    className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 dark:active:bg-muted/50 transition-colors"
                    data-testid="button-clear-data"
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(0,50%,92%) 0%, hsl(350,45%,85%) 100%)" }}>
                      🗑️
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[15px] text-red-500">{t("profile.clear_data")}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t("profile.clear_data_desc")}</p>
                    </div>
                  </button>
                </div>
              </div>

              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40 mb-2 px-1">{t("profile.section_account")}</p>
              <div className="mb-5">
                <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-gray-100 dark:border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  {lineProfile ? (
                    <div className="px-5 py-4 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "#06C755" }}>
                        <span className="text-white text-[11px] font-bold">LINE</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-[15px]">LINE</p>
                        <p className="text-[11px] text-[#06C755] font-medium mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#06C755] inline-block" />
                          {t("profile.connected_via_line")}
                        </p>
                      </div>
                      <button
                        onClick={lineLogout}
                        className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-muted text-muted-foreground text-xs font-medium active:scale-95 transition-transform"
                        data-testid="button-line-logout-section"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={liffAvailable ? lineLogin : undefined}
                      className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 transition-colors"
                      data-testid="button-line-connect"
                    >
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "#06C755" }}>
                        <span className="text-white text-[11px] font-bold">LINE</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-[15px]">{t("profile.login_line")}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{t("profile.open_in_line")}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                    </button>
                  )}

                  <div className="mx-5 h-px bg-gray-100 dark:bg-border" />

                  <PartnerRow
                    profile={localProfile}
                    onInvite={invitePartnerViaLine}
                    onManualAdd={() => setShowPartnerModal(true)}
                    onUnlink={unlinkPartner}
                    t={t}
                  />

                  <div className="mx-5 h-px bg-gray-100 dark:bg-border" />

                  <SavedSection t={t} />
                </div>
              </div>

              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40 mb-2 px-1">{t("profile.section_about")}</p>
              <div className="mb-5">
                <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-gray-100 dark:border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <button
                    className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 dark:active:bg-muted/50 transition-colors"
                    data-testid="button-privacy-policy"
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(200,50%,92%) 0%, hsl(210,45%,85%) 100%)" }}>
                      🔒
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[15px]">{t("profile.privacy_policy")}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  </button>

                  <div className="mx-5 h-px bg-gray-100 dark:bg-border" />

                  <button
                    className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 dark:active:bg-muted/50 transition-colors"
                    data-testid="button-terms-of-service"
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(160,50%,92%) 0%, hsl(170,45%,85%) 100%)" }}>
                      📄
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[15px]">{t("profile.terms_of_service")}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  </button>

                  <div className="mx-5 h-px bg-gray-100 dark:bg-border" />

                  <button
                    className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 dark:active:bg-muted/50 transition-colors"
                    data-testid="button-about-app"
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(45,60%,92%) 0%, hsl(40,55%,85%) 100%)" }}>
                      🍞
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[15px]">{t("profile.about_app")}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t("profile.about_app_desc")}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  </button>

                  <div className="mx-5 h-px bg-gray-100 dark:bg-border" />

                  <button
                    className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50/50 dark:active:bg-muted/50 transition-colors"
                    data-testid="button-rate-app"
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, hsl(50,65%,92%) 0%, hsl(45,55%,85%) 100%)" }}>
                      ⭐
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[15px]">{t("profile.rate_app")}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  </button>
                </div>
              </div>

              <div className="text-center py-4 mb-4">
                <p className="text-[10px] text-muted-foreground/40">Toast {t("profile.app_version")} 1.0.0</p>
                <p className="text-[10px] text-muted-foreground/30 mt-1">{t("profile.about_app_desc")}</p>
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
                  <h3 className="text-lg font-semibold tracking-tight">{t("profile.link_partner")}</h3>
                  <p className="text-xs text-muted-foreground">{t("profile.enter_display_name")}</p>
                </div>
              </div>

              <input
                type="text"
                value={partnerInput}
                onChange={(e) => setPartnerInput(e.target.value)}
                placeholder={t("profile.partner_name_placeholder")}
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
                  {t("common.cancel")}
                </button>
                <button
                  onClick={linkPartner}
                  disabled={!partnerInput.trim()}
                  className="flex-1 py-3.5 rounded-2xl bg-foreground text-white font-semibold text-sm active:scale-[0.97] transition-transform disabled:opacity-30"
                  style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}
                  data-testid="button-confirm-partner"
                >
                  {t("common.link")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!ownerOnboarded && !isOwnerMode && !ownerOnboardingStatus && (
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={() => { setShowOnboarding(true); setOnboardingStep("choice"); }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-gray-100 text-sm font-semibold text-foreground active:scale-[0.96] transition-transform"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
          data-testid="button-owner-onboarding"
        >
          <Store className="w-4 h-4 text-[#00B14F]" />
          {t("profile.become_owner")}
        </motion.button>
      )}

      {ownerOnboardingStatus?.status === "pending" && !isOwnerMode && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-3 rounded-full bg-amber-50 border border-amber-200 text-sm font-semibold text-amber-800"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
          data-testid="badge-pending-approval"
        >
          <Clock className="w-4 h-4 text-amber-500 animate-pulse-soft" />
          {t("profile.claim_pending")} — {ownerOnboardingStatus.restaurantName}
        </motion.div>
      )}

      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) setShowOnboarding(false); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-24 max-h-[85vh] overflow-y-auto"
              data-testid="modal-owner-onboarding"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {onboardingStep !== "choice" && onboardingStep !== "submitted" && (
                    <button
                      onClick={() => {
                        if (onboardingStep === "profile") setOnboardingStep("choice");
                        else if (onboardingStep === "register") setOnboardingStep("profile");
                        else if (onboardingStep === "claim") setOnboardingStep("profile");
                        else if (onboardingStep === "claim-confirm") setOnboardingStep("claim");
                        else if (onboardingStep === "documents") setOnboardingStep(onboardingPath === "claim" ? "claim-confirm" : "register");
                      }}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                      data-testid="button-back-onboarding"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>
                  )}
                  <h2 className="text-lg font-bold">
                    {onboardingStep === "choice" && t("profile.become_owner_title")}
                    {onboardingStep === "profile" && t("profile.your_info")}
                    {onboardingStep === "register" && t("profile.restaurant_details")}
                    {onboardingStep === "claim" && t("profile.find_restaurant")}
                    {onboardingStep === "claim-confirm" && t("profile.confirm_ownership")}
                    {onboardingStep === "documents" && t("profile.verification_docs")}
                    {onboardingStep === "submitted" && t("profile.submitted_review")}
                  </h2>
                </div>
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                  data-testid="button-close-onboarding"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {onboardingStep !== "choice" && onboardingStep !== "submitted" && (
                <div className="flex gap-1 mb-5">
                  {(onboardingPath === "register" ? ["profile", "register", "documents"] : ["profile", "claim", "claim-confirm", "documents"]).map((step, i, arr) => (
                    <div
                      key={step}
                      className="flex-1 h-1 rounded-full"
                      style={{
                        backgroundColor: arr.indexOf(onboardingStep) >= i ? "#00B14F" : "#e5e7eb"
                      }}
                    />
                  ))}
                </div>
              )}

              {onboardingStep === "choice" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    Get your restaurant on Toast and reach thousands of diners in Bangkok.
                  </p>
                  <button
                    onClick={() => { setOnboardingPath("register"); setOnboardingStep("profile"); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 active:scale-[0.98] transition-all"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                    data-testid="button-register-new"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#00B14F]/10 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-6 h-6 text-[#00B14F]" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm">Register New Restaurant</p>
                      <p className="text-xs text-muted-foreground">Add your restaurant to Toast</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  </button>
                  <button
                    onClick={() => { setOnboardingPath("claim"); setOnboardingStep("profile"); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 active:scale-[0.98] transition-all"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                    data-testid="button-claim-existing"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#FFCC02]/10 flex items-center justify-center flex-shrink-0">
                      <Search className="w-6 h-6 text-[#FFCC02]" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm">Claim Existing Restaurant</p>
                      <p className="text-xs text-muted-foreground">Already listed? Take ownership</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  </button>
                </div>
              )}

              {onboardingStep === "profile" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Tell us about yourself so we can verify your ownership.</p>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:border-gray-200 outline-none text-sm font-medium"
                        data-testid="input-owner-name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Contact Email or Phone</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                      <input
                        type="text"
                        value={ownerContact}
                        onChange={(e) => setOwnerContact(e.target.value)}
                        placeholder="email@example.com or +66..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:border-gray-200 outline-none text-sm font-medium"
                        data-testid="input-owner-contact"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setOnboardingStep(onboardingPath === "register" ? "register" : "claim")}
                    disabled={!ownerName.trim() || !ownerContact.trim()}
                    className="w-full py-3.5 rounded-xl bg-[#00B14F] text-white font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-40"
                    style={{ boxShadow: "0 4px 16px rgba(0,177,79,0.25)" }}
                    data-testid="button-continue-profile"
                  >
                    Continue
                  </button>
                </div>
              )}

              {onboardingStep === "register" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Enter your restaurant's details.</p>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Restaurant Name</label>
                    <input
                      type="text"
                      value={newRestaurantName}
                      onChange={(e) => setNewRestaurantName(e.target.value)}
                      placeholder="e.g. Jay Fai, Gaggan, Sorn"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:border-gray-200 outline-none text-sm font-medium"
                      data-testid="input-register-name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Category</label>
                    <select
                      value={newRestaurantCategory}
                      onChange={(e) => setNewRestaurantCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:border-gray-200 outline-none text-sm font-medium"
                      data-testid="select-register-category"
                    >
                      <option value="">Select category</option>
                      {RESTAURANT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                      <input
                        type="text"
                        value={newRestaurantAddress}
                        onChange={(e) => setNewRestaurantAddress(e.target.value)}
                        placeholder="Street address in Bangkok"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:border-gray-200 outline-none text-sm font-medium"
                        data-testid="input-register-address"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                      <input
                        type="text"
                        value={newRestaurantPhone}
                        onChange={(e) => setNewRestaurantPhone(e.target.value)}
                        placeholder="+66..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:border-gray-200 outline-none text-sm font-medium"
                        data-testid="input-register-phone"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setOnboardingStep("documents")}
                    disabled={!newRestaurantName.trim() || !newRestaurantAddress.trim()}
                    className="w-full py-3.5 rounded-xl bg-[#00B14F] text-white font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-40"
                    style={{ boxShadow: "0 4px 16px rgba(0,177,79,0.25)" }}
                    data-testid="button-continue-register"
                  >
                    Continue to Verification
                  </button>
                </div>
              )}

              {onboardingStep === "claim" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Search for the restaurant you own or manage.</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <input
                      type="text"
                      value={claimSearchQuery}
                      onChange={(e) => setClaimSearchQuery(e.target.value)}
                      placeholder="Search for your restaurant..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:border-gray-200 outline-none text-sm font-medium"
                      data-testid="input-claim-search"
                    />
                  </div>
                  <ClaimSearchResults
                    query={claimSearchQuery}
                    onSelect={(restaurant: any) => {
                      setSelectedClaimRestaurant(restaurant);
                      setClaimConfirmText("");
                      setOnboardingStep("claim-confirm");
                    }}
                  />
                </div>
              )}

              {onboardingStep === "claim-confirm" && selectedClaimRestaurant && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                    <div className="h-32 bg-gray-100 relative">
                      {selectedClaimRestaurant.imageUrl ? (
                        <img src={selectedClaimRestaurant.imageUrl} alt={selectedClaimRestaurant.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                      )}
                      {selectedClaimRestaurant.ownerClaimStatus === "verified" && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Already Claimed
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-base mb-1" data-testid="text-claim-restaurant-name">{selectedClaimRestaurant.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3" /> {selectedClaimRestaurant.address || "Bangkok"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <Utensils className="w-3 h-3" /> {selectedClaimRestaurant.category || "Restaurant"}
                      </p>
                      {selectedClaimRestaurant.rating && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {selectedClaimRestaurant.rating}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedClaimRestaurant.ownerClaimStatus === "verified" ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                      <Shield className="w-8 h-8 text-red-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-red-700 mb-1">This restaurant has already been claimed</p>
                      <p className="text-xs text-red-500">If you believe this is an error, please contact support.</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-amber-700">Is this your restaurant?</p>
                          <p className="text-[11px] text-amber-600 mt-0.5">Fraudulent claims may result in account suspension.</p>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                          Type "<span className="text-foreground">{selectedClaimRestaurant.name}</span>" to confirm
                        </label>
                        <input
                          type="text"
                          value={claimConfirmText}
                          onChange={(e) => setClaimConfirmText(e.target.value)}
                          placeholder={`Type: ${selectedClaimRestaurant.name}`}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:border-gray-200 outline-none text-sm font-medium"
                          data-testid="input-claim-confirm-name"
                        />
                      </div>

                      <button
                        onClick={() => setOnboardingStep("documents")}
                        disabled={claimConfirmText.trim().toLowerCase() !== selectedClaimRestaurant.name.trim().toLowerCase()}
                        className="w-full py-3.5 rounded-xl bg-[#00B14F] text-white font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-40"
                        style={{ boxShadow: "0 4px 16px rgba(0,177,79,0.25)" }}
                        data-testid="button-confirm-claim"
                      >
                        Yes, This is My Restaurant
                      </button>
                    </>
                  )}
                </div>
              )}

              {onboardingStep === "documents" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload documents to verify your ownership. This helps us keep the platform trustworthy.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        Business Registration / License
                      </label>
                      <div
                        className="w-full px-4 py-4 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 text-center cursor-pointer hover:border-[#00B14F]/40 transition-colors"
                        onClick={() => {
                          const url = prompt("Paste a link to your business registration document (Google Drive, Dropbox, etc.):");
                          if (url) setDocBusinessReg(url);
                        }}
                        data-testid="upload-business-reg"
                      >
                        {docBusinessReg ? (
                          <div className="flex items-center gap-2 justify-center text-[#00B14F]">
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">Document linked</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <Upload className="w-5 h-5" />
                            <span className="text-xs">Tap to add link</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        Proof of Ownership (lease, utility bill, etc.)
                      </label>
                      <div
                        className="w-full px-4 py-4 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 text-center cursor-pointer hover:border-[#00B14F]/40 transition-colors"
                        onClick={() => {
                          const url = prompt("Paste a link to your ownership proof document:");
                          if (url) setDocOwnershipProof(url);
                        }}
                        data-testid="upload-ownership-proof"
                      >
                        {docOwnershipProof ? (
                          <div className="flex items-center gap-2 justify-center text-[#00B14F]">
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">Document linked</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <Upload className="w-5 h-5" />
                            <span className="text-xs">Tap to add link</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        Photo ID (optional)
                      </label>
                      <div
                        className="w-full px-4 py-4 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 text-center cursor-pointer hover:border-[#00B14F]/40 transition-colors"
                        onClick={() => {
                          const url = prompt("Paste a link to your photo ID:");
                          if (url) setDocPhotoId(url);
                        }}
                        data-testid="upload-photo-id"
                      >
                        {docPhotoId ? (
                          <div className="flex items-center gap-2 justify-center text-[#00B14F]">
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">Document linked</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <Upload className="w-5 h-5" />
                            <span className="text-xs">Tap to add link (optional)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const restaurantName = onboardingPath === "claim"
                        ? selectedClaimRestaurant?.name || ""
                        : newRestaurantName.trim();

                      const ownerProfile = getStoredOwnerProfile();
                      const updated = {
                        ...ownerProfile,
                        restaurantName,
                        ownerName: ownerName.trim(),
                        ownerContact: ownerContact.trim(),
                        category: onboardingPath === "register" ? newRestaurantCategory : (selectedClaimRestaurant?.category || ""),
                        address: onboardingPath === "register" ? newRestaurantAddress.trim() : (selectedClaimRestaurant?.address || ""),
                        phone: newRestaurantPhone.trim(),
                        documents: {
                          businessReg: docBusinessReg,
                          ownershipProof: docOwnershipProof,
                          photoId: docPhotoId,
                        },
                      };
                      localStorage.setItem(OWNER_STORAGE_KEY, JSON.stringify(updated));

                      localStorage.setItem(ONBOARDING_STATUS_KEY, JSON.stringify({
                        status: "pending",
                        restaurantName,
                        path: onboardingPath,
                        restaurantId: onboardingPath === "claim" ? selectedClaimRestaurant?.id : null,
                        submittedAt: new Date().toISOString(),
                      }));

                      setOnboardingStep("submitted");
                    }}
                    disabled={!docBusinessReg && !docOwnershipProof}
                    className="w-full py-3.5 rounded-xl bg-[#00B14F] text-white font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-40"
                    style={{ boxShadow: "0 4px 16px rgba(0,177,79,0.25)" }}
                    data-testid="button-submit-documents"
                  >
                    Submit for Review
                  </button>

                  <p className="text-[11px] text-center text-muted-foreground">
                    At least one document is required. Reviews typically take 1-2 business days.
                  </p>
                </div>
              )}

              {onboardingStep === "submitted" && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-amber-500" />
                  </div>
                  <p className="font-bold text-lg mb-2">Submitted for Review</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {onboardingPath === "claim"
                      ? `Your claim for "${selectedClaimRestaurant?.name}" has been submitted.`
                      : `Your registration for "${newRestaurantName}" has been submitted.`}
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Our team will review your documents and notify you once approved. This usually takes 1-2 business days.
                  </p>
                  <button
                    onClick={() => setShowOnboarding(false)}
                    className="w-full py-3.5 rounded-xl bg-foreground text-white font-bold text-sm active:scale-[0.97] transition-transform"
                    style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
                    data-testid="button-close-submitted"
                  >
                    Got It
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav showBack={false} />
    </div>
  );
}

function ClaimSearchResults({ query, onSelect }: { query: string; onSelect: (restaurant: any) => void }) {
  const { data: restaurants } = useQuery<any[]>({
    queryKey: ["/api/restaurants"],
    enabled: true,
  });

  const filtered = useMemo(() => {
    if (!restaurants || !query.trim()) return [];
    const q = query.toLowerCase();
    return restaurants.filter((r: any) =>
      r.name?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q) || r.address?.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [restaurants, query]);

  if (!query.trim()) {
    return <p className="text-sm text-muted-foreground text-center py-4">Start typing to search for your restaurant</p>;
  }

  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No restaurants found matching "{query}"</p>;
  }

  return (
    <div className="space-y-2">
      {filtered.map((r: any) => (
        <button
          key={r.id}
          onClick={() => onSelect(r)}
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 active:scale-[0.98] transition-all text-left"
          data-testid={`claim-restaurant-${r.id}`}
        >
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {r.imageUrl ? (
              <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm truncate">{r.name}</p>
              {r.ownerClaimStatus === "verified" && (
                <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">Claimed</span>
              )}
              {r.ownerClaimStatus === "pending" && (
                <span className="text-[9px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">Pending</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{r.category || "Restaurant"}</p>
            <p className="text-[11px] text-muted-foreground/60 truncate flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> {r.address || "Bangkok"}
              {r.rating && <><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 ml-1" /> {r.rating}</>}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

function ProfileToggle({ isOwnerMode, onToggle }: { isOwnerMode: boolean; onToggle: (v: boolean) => void }) {
  const { t } = useLanguage();
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
        {t("profile.diner")}
      </button>
      <button
        onClick={() => onToggle(true)}
        className="relative z-10 flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors duration-200"
        style={{ color: isOwnerMode ? "hsl(var(--foreground))" : "#9ca3af" }}
        data-testid="button-owner-mode"
      >
        <Store className="w-4 h-4" />
        {t("profile.owner")}
      </button>
    </div>
  );
}

function generateMockInsights() {
  const now = new Date();
  const hour = now.getHours();

  const baseViews = 1247;
  const baseSwipes = 834;
  const baseTaps = 312;
  const baseOrders = 89;
  const baseMaps = 156;
  const baseDetailViews = 423;

  const viewsTrend = 12.3;
  const swipesTrend = 8.7;
  const tapsTrend = -2.1;
  const ordersTrend = 15.4;

  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    let base = 10;
    if (i >= 7 && i <= 9) base = 35;
    if (i >= 11 && i <= 13) base = 80;
    if (i >= 14 && i <= 16) base = 25;
    if (i >= 17 && i <= 20) base = 65;
    if (i >= 21 && i <= 23) base = 40;
    return { hour: i, value: base + Math.floor(Math.random() * 15) };
  });

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyData = dayLabels.map((day, i) => ({
    day,
    views: [45, 78, 82, 95, 88, 120, 110][i] + Math.floor(Math.random() * 20),
    orders: [8, 12, 14, 16, 13, 22, 19][i] + Math.floor(Math.random() * 5),
  }));

  const topMenuItems = [
    { name: "Pad Thai", swipes: 234, likes: 189, conversionRate: 80.8 },
    { name: "Tom Yum Soup", swipes: 198, likes: 156, conversionRate: 78.8 },
    { name: "Green Curry", swipes: 176, likes: 132, conversionRate: 75.0 },
    { name: "Mango Sticky Rice", swipes: 145, likes: 128, conversionRate: 88.3 },
    { name: "Som Tum", swipes: 112, likes: 78, conversionRate: 69.6 },
  ];

  const peakHours = [
    { time: "12:00 - 13:00", label: "Lunch peak", activity: 95 },
    { time: "18:00 - 19:00", label: "Dinner rush", activity: 88 },
    { time: "20:00 - 21:00", label: "Late dinner", activity: 72 },
    { time: "11:00 - 12:00", label: "Pre-lunch", activity: 65 },
  ];

  const userActions = [
    { action: "Swiped right (liked)", count: baseSwipes, icon: TrendingUp, color: "text-green-500" },
    { action: "Viewed details", count: baseDetailViews, icon: Eye, color: "text-blue-500" },
    { action: "Opened map directions", count: baseMaps, icon: MapPin, color: "text-orange-500" },
    { action: "Tapped 'Order on Grab'", count: baseOrders, icon: ExternalLink, color: "text-emerald-500" },
    { action: "Saved to favorites", count: baseTaps, icon: Star, color: "text-yellow-500" },
  ];

  const audienceDemographics = [
    { label: "18-24", percentage: 22, color: "bg-blue-400" },
    { label: "25-34", percentage: 38, color: "bg-green-500" },
    { label: "35-44", percentage: 24, color: "bg-amber-500" },
    { label: "45-54", percentage: 11, color: "bg-purple-500" },
    { label: "55+", percentage: 5, color: "bg-pink-400" },
  ];

  const engagementFunnel = [
    { stage: "Impressions", count: baseViews, percentage: 100 },
    { stage: "Swipe Views", count: baseSwipes, percentage: Math.round((baseSwipes / baseViews) * 100) },
    { stage: "Detail Views", count: baseDetailViews, percentage: Math.round((baseDetailViews / baseViews) * 100) },
    { stage: "Saves", count: baseTaps, percentage: Math.round((baseTaps / baseViews) * 100) },
    { stage: "Delivery Taps", count: baseOrders, percentage: Math.round((baseOrders / baseViews) * 100) },
  ];

  const revenueEstimate = {
    estimatedRevenue: Math.round(baseOrders * 245),
    avgOrderValue: 245,
    projectedMonthly: Math.round(baseOrders * 245 * 4.3),
    revenueGrowth: 18.5,
  };

  const competitorBenchmark = {
    yourRank: 12,
    totalInCategory: 87,
    avgCategorySwipes: 612,
    yourSwipes: baseSwipes,
    percentile: 86,
  };

  const repeatVisitors = {
    firstTime: 66,
    returning: 34,
    avgVisitsPerUser: 2.3,
    loyaltyScore: 72,
  };

  return {
    overview: {
      impressions: { value: baseViews, trend: viewsTrend, label: "Impressions" },
      swipes: { value: baseSwipes, trend: swipesTrend, label: "Swipe Views" },
      saves: { value: baseTaps, trend: tapsTrend, label: "Saves" },
      deliveryTaps: { value: baseOrders, trend: ordersTrend, label: "Delivery Taps" },
    },
    hourlyData,
    weeklyData,
    topMenuItems,
    peakHours,
    userActions,
    audienceDemographics,
    engagementFunnel,
    revenueEstimate,
    competitorBenchmark,
    repeatVisitors,
    conversionRate: ((baseOrders / baseViews) * 100).toFixed(1),
    avgTimeOnPage: "1m 42s",
    returnVisitors: "34%",
    currentPeakHour: hour >= 11 && hour <= 13 ? "Lunch" : hour >= 17 && hour <= 21 ? "Dinner" : hour >= 7 && hour <= 10 ? "Breakfast" : "Off-peak",
    bestDay: "Friday",
  };
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

  const FALLBACK_SEGMENTS: UserSegment[] = [
    { id: "power_users", name: "Power Users", description: "Highly active users", estimatedCount: 245 },
    { id: "new_users", name: "New Users", description: "Joined in the last 30 days", estimatedCount: 512 },
    { id: "thai_food_lovers", name: "Thai Food Lovers", description: "Frequently swipe right on Thai restaurants", estimatedCount: 389 },
    { id: "budget_diners", name: "Budget Diners", description: "Prefer budget-friendly options", estimatedCount: 623 },
    { id: "high_spenders", name: "High Spenders", description: "Prefer upscale dining", estimatedCount: 178 },
    { id: "weekend_browsers", name: "Weekend Browsers", description: "Most active on weekends", estimatedCount: 445 },
    { id: "lunch_crowd", name: "Lunch Crowd", description: "Active during lunch hours", estimatedCount: 367 },
  ];

  const { data: segmentsData } = useQuery<UserSegment[]>({
    queryKey: ["/api/analytics/user-segments"],
  });
  const segments = segmentsData || FALLBACK_SEGMENTS;

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

  const insights = useMemo(() => generateMockInsights(), []);

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

  const overviewStats = Object.values(insights.overview);
  const hourlyValues = insights.hourlyData.map(d => d.value);
  const maxHourly = Math.max(...hourlyValues);

  const onboardingStatus = (() => {
    try {
      const stored = localStorage.getItem("toast_owner_onboarding_status");
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  })();
  const isVerified = onboardingStatus?.status === "approved";
  const isPending = onboardingStatus?.status === "pending";

  const weeklyStats = useMemo(() => ({
    views: Math.floor(Math.random() * 2000) + 500,
    likes: Math.floor(Math.random() * 300) + 50,
    saves: Math.floor(Math.random() * 100) + 10,
  }), [ownerKey]);

  return (
    <div>
      <div className="mb-4">
        <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-gray-100 dark:border-border">
          <div className="relative h-36 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden" data-testid="owner-hero-banner">
            {ownerProfile.photos && ownerProfile.photos.length > 0 ? (
              <img src={ownerProfile.photos[0]} alt={ownerProfile.restaurantName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#00B14F]/10 to-[#FFCC02]/10">
                <Store className="w-12 h-12 text-[#00B14F]/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            <div className="absolute top-3 right-3 flex gap-1.5">
              {isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#00B14F] text-white text-[10px] font-bold" data-testid="badge-verified">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              )}
              {isPending && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold" data-testid="badge-pending">
                  <Clock className="w-3 h-3" /> Pending Approval
                </span>
              )}
              {!isVerified && !isPending && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-700/80 text-white text-[10px] font-bold" data-testid="badge-unverified">
                  <Store className="w-3 h-3" /> Setup Mode
                </span>
              )}
            </div>

            <div className="absolute bottom-3 left-4 right-4">
              <h2 className="text-white font-bold text-lg truncate drop-shadow-sm" data-testid="text-hero-restaurant-name">
                {ownerProfile.restaurantName || "Your Restaurant"}
              </h2>
              <div className="flex items-center gap-3 mt-0.5">
                {selectedCategoryObj && (
                  <span className="text-white/80 text-xs flex items-center gap-1">
                    {selectedCategoryObj.emoji} {selectedCategoryObj.label}
                  </span>
                )}
                {ownerProfile.address && (
                  <span className="text-white/70 text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {ownerProfile.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-border border-b border-gray-100 dark:border-border" data-testid="owner-quick-stats">
            <div className="py-3 text-center">
              <p className="text-lg font-bold text-foreground" data-testid="stat-views">{weeklyStats.views.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Views</p>
            </div>
            <div className="py-3 text-center">
              <p className="text-lg font-bold text-foreground" data-testid="stat-likes">{weeklyStats.likes.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Likes</p>
            </div>
            <div className="py-3 text-center">
              <p className="text-lg font-bold text-foreground" data-testid="stat-saves">{weeklyStats.saves.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Saves</p>
            </div>
          </div>

          <div className="px-5 py-4">
            <button
              onClick={() => setActiveSection(activeSection === "details" ? null : "details")}
              className="w-full flex items-center gap-3 active:opacity-70 transition-opacity"
              data-testid="button-edit-details"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">Restaurant Details</p>
                <p className="text-[11px] text-muted-foreground">Name, category, tags, address</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-300 ${activeSection === "details" ? "rotate-90" : ""}`} />
            </button>

            <AnimatePresence initial={false}>
              {activeSection === "details" && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  transition={springConfig}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-4">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">Restaurant Name</label>
                      <input
                        type="text"
                        value={ownerProfile.restaurantName}
                        onChange={(e) => updateOwner({ restaurantName: e.target.value })}
                        placeholder="Restaurant name"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-muted text-sm font-medium outline-none"
                        data-testid="input-restaurant-name"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">Category</label>
                      <div ref={categoryRef} className="relative" data-testid="input-restaurant-category">
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
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">Tags</label>
                      <div ref={tagRef} className="relative" data-testid="input-restaurant-tags">
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
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">Address</label>
                      <div className="flex items-center gap-2">
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
          {overviewStats.map((stat) => {
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
              <p className="text-lg font-bold tracking-tight">{insights.avgTimeOnPage}</p>
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
            {insights.engagementFunnel.map((step, i) => (
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

      <div className="mb-4">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-4">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Audience Demographics</p>
          <div className="flex items-center gap-1 h-5 rounded-full overflow-hidden mb-3">
            {insights.audienceDemographics.map((demo) => (
              <div
                key={demo.label}
                className={`h-full ${demo.color} transition-all`}
                style={{ width: `${demo.percentage}%` }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {insights.audienceDemographics.map((demo) => (
              <div key={demo.label} className="flex items-center gap-1.5" data-testid={`demo-${demo.label}`}>
                <div className={`w-2 h-2 rounded-full ${demo.color}`} />
                <span className="text-[11px] text-muted-foreground font-medium">{demo.label}</span>
                <span className="text-[11px] font-bold tabular-nums">{demo.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
          {insights.userActions.map((action, i) => {
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
                        {insights.weeklyData.map((day) => (
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
                        <p className="text-xs text-muted-foreground">{insights.bestDay} has the highest engagement with {Math.max(...insights.weeklyData.map(d => d.views))} total interactions</p>
                      </div>
                    </div>
                  )}

                  {analyticsTab === "menu" && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Top Menu Items by Swipe Performance</p>
                      <div className="space-y-2.5">
                        {insights.topMenuItems.map((item, i) => (
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
                        {insights.peakHours.map((peak, i) => (
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
                          {insights.weeklyData.map((day) => {
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

function StatsRow({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
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
    { labelKey: "profile.swipes", value: stats.totalSwipes, testId: "text-total-swipes" },
    { labelKey: "profile.liked", value: stats.likes, testId: "text-total-likes" },
    { labelKey: "profile.saved", value: mineCount, testId: "text-saved-count" },
    { labelKey: "profile.shared", value: partnerCount, testId: "text-partner-saves" },
  ];

  return (
    <div className="flex items-center justify-around py-4 mb-4 border-b border-gray-100 dark:border-border">
      {items.map((item) => (
        <div key={item.labelKey} className="flex flex-col items-center">
          <p className="text-xl font-bold tracking-tight leading-none" data-testid={item.testId}>{item.value}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{t(item.labelKey)}</p>
        </div>
      ))}
    </div>
  );
}

function PartnerRow({ profile, onInvite, onManualAdd, onUnlink, t }: {
  profile: LocalProfile;
  onInvite: () => void;
  onManualAdd: () => void;
  onUnlink: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
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
          <p className="font-bold text-[15px]">{t("profile.partner")}</p>
          {profile.partnerLinked ? (
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-muted overflow-hidden flex items-center justify-center text-[10px]">
                {profile.partnerPictureUrl ? (
                  <img src={profile.partnerPictureUrl} alt={profile.partnerName} className="w-full h-full object-cover" />
                ) : "👤"}
              </div>
              <p className="text-[11px] text-muted-foreground truncate" data-testid="text-partner-name">{profile.partnerName}</p>
              {partnerCount > 0 && (
                <span className="text-[10px] text-pink-500 font-medium ml-1">{partnerCount} {t("profile.shared")}</span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-0.5">{t("profile.invite_partner")}</p>
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
                  {t("common.view")}
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
                {t("common.invite")}
              </button>
              <button
                onClick={onManualAdd}
                className="text-[11px] text-muted-foreground font-medium active:scale-95 transition-transform"
                data-testid="button-add-partner-manual"
              >
                {t("common.add")}
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SavedSection({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
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
          <p className="font-bold text-[15px]">{t("profile.saved_restaurants")}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {totalSaved === 0 ? t("profile.no_saved") : `${mineCount} ${t("profile.saved")} · ${partnerCount} ${t("profile.shared")}`}
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
                  <p className="text-sm text-muted-foreground">{t("profile.no_saved_yet")}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{t("profile.tap_heart_to_save")}</p>
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
