import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowLeft, Users, MapPin, Calendar as CalendarIcon,
  Clock, Utensils, Heart, Baby, Briefcase,
  ChevronRight, ChevronDown, Sparkles, UserPlus,
} from "lucide-react";
import { sendGroupInvite } from "@/lib/liff";
import { useLineProfile } from "@/lib/useLineProfile";
import { useLanguage } from "@/i18n/LanguageProvider";

const LOCATIONS = [
  { id: "bts", icon: "🚇", label: "Near BTS", sub: "Easy access" },
  { id: "mall", icon: "🏬", label: "At the mall", sub: "Indoor vibes" },
  { id: "street", icon: "🍢", label: "Street food", sub: "Local flavor" },
  { id: "rooftop", icon: "🏙️", label: "Rooftop", sub: "Sky high" },
  { id: "riverside", icon: "🌊", label: "Riverside", sub: "Scenic views" },
  { id: "latenight", icon: "🌙", label: "Late night", sub: "After hours" },
];

const BUDGETS = [
  { id: "1", icon: "฿", label: "Cheap eats", color: "#00B14F" },
  { id: "2", icon: "฿฿", label: "Mid range", color: "#FFCC02" },
  { id: "3", icon: "฿฿฿", label: "Fancy", color: "#6C2BD9" },
  { id: "4", icon: "฿฿฿฿", label: "Splurge", color: "#E11D48" },
];

const GROUP_TYPES = [
  { id: "friends", icon: Users, label: "Friends", color: "#00B14F" },
  { id: "partner", icon: Heart, label: "Partner", color: "#E11D48" },
  { id: "family", icon: Baby, label: "Family", color: "#FFCC02" },
  { id: "coworkers", icon: Briefcase, label: "Coworkers", color: "#6C2BD9" },
];

const SWIPE_MODES = [
  { id: "restaurant", label: "Swipe Restaurants", sub: "Pick places directly" },
  { id: "menu", label: "Swipe Dishes", sub: "Match on food first" },
];

const RESTRICTIONS = [
  { id: "halal", icon: "🕌", label: "Halal" },
  { id: "vegan", icon: "🥬", label: "Vegan" },
  { id: "vegetarian", icon: "🥗", label: "Vegetarian" },
  { id: "gluten-free", icon: "🌾", label: "Gluten-Free" },
  { id: "no-pork", icon: "🐷", label: "No Pork" },
  { id: "keto", icon: "🥓", label: "Keto" },
  { id: "dairy-free", icon: "🥛", label: "Dairy-Free" },
  { id: "nut-free", icon: "🥜", label: "Nut-Free" },
];

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MINUTES = [0, 15, 30, 45];

function formatDisplayTime(hour: number, minute: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h}:${minute.toString().padStart(2, "0")} ${period}`;
}

function roundToNearest15(date: Date) {
  const m = date.getMinutes();
  const rounded = Math.ceil(m / 15) * 15;
  if (rounded === 60) return { hour: (date.getHours() + 1) % 24, minute: 0 };
  return { hour: date.getHours(), minute: rounded };
}

function getNext14Days() {
  const days: Date[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function isSameDay(a: Date | null, b: Date) {
  if (!a) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function GroupSetup() {
  const [, navigate] = useLocation();
  const { profile } = useLineProfile();
  const { t } = useLanguage();
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string>("");
  const [selectedGroupType, setSelectedGroupType] = useState<string>("");
  const [swipeMode, setSwipeMode] = useState<"restaurant" | "menu">("restaurant");
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const now = new Date();
  const defaultTime = roundToNearest15(now);
  const [selectedHour, setSelectedHour] = useState<number>(defaultTime.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(defaultTime.minute);
  const [hourPickerOpen, setHourPickerOpen] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const dateScrollRef = useRef<HTMLDivElement>(null);
  const hourPickerRef = useRef<HTMLDivElement>(null);
  const upcomingDays = getNext14Days();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (hourPickerRef.current && !hourPickerRef.current.contains(e.target as Node)) {
        setHourPickerOpen(false);
      }
    };
    if (hourPickerOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [hourPickerOpen]);

  const toggleList = (list: string[], item: string, setter: (v: string[]) => void) => {
    if (list.includes(item)) setter(list.filter((i) => i !== item));
    else setter([...list, item]);
  };

  const getOrCreateSessionId = async () => {
    if (pendingSessionId) return pendingSessionId;
    try {
      const res = await fetch("/api/group/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: swipeMode,
          creatorName: profile?.displayName ?? "You",
          creatorAvatarUrl: profile?.pictureUrl || undefined,
          creatorLineUserId: profile?.userId || undefined,
          locations: selectedLocations,
          budget: selectedBudget,
          diet: selectedRestrictions,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const code: string = data.session?.code ?? "";
        if (code) {
          setPendingSessionId(code);
          return code;
        }
      }
      const errorText = await res.text();
      throw new Error(errorText || `Failed to create session (${res.status})`);
    } catch (err) {
      console.error("Failed to create group session:", err);
      throw err;
    }
  };

  const handleInvite = async () => {
    setSessionError(null);
    setInviteStatus("sending");
    try {
      const sessionId = await getOrCreateSessionId();

      const result = await sendGroupInvite(sessionId);

      if (result.method === "line-app" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        setInviteStatus("sent");
        setTimeout(() => {
          navigate(`/group/waiting?session=${sessionId}`);
        }, 500);
        return;
      }

      setInviteStatus("sent");
      navigate(`/group/waiting?session=${sessionId}`);
    } catch {
      setInviteStatus("idle");
      setSessionError("Failed to create session. If the backend was just changed, run the database sync and try again.");
    }
  };

  const completedSteps = [
    selectedDate,
    selectedLocations.length > 0,
    selectedBudget,
    selectedGroupType,
  ].filter(Boolean).length;

  return (
    <div className="w-full h-[100dvh] bg-[#F7F7F7] flex flex-col overflow-hidden" data-testid="group-setup-page">
      <div className="flex-shrink-0 bg-white border-b border-gray-100/60 z-40">
        <div className="flex items-center gap-3 px-5 pt-12 pb-3">
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center active:scale-90 transition-all duration-200 flex-shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-[17px] font-bold text-foreground" data-testid="text-page-title">{t("group.setup_title")}</h1>
            <p className="text-[11px] text-muted-foreground">{t("group.setup_subtitle")}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-colors duration-300"
                style={{ background: i < completedSteps ? "#FFCC02" : "#e5e5e5" }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-6 hide-scrollbar">
        {sessionError && (
          <div className="px-5 pt-4">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600" data-testid="text-session-error">
              {sessionError}
            </div>
          </div>
        )}

        <div className="pt-4 pb-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="flex items-center gap-2 mb-3 px-5">
              <CalendarIcon className="w-4 h-4 text-[#FFCC02]" />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-foreground">{t("group.when")}</h2>
              {selectedDate && (
                <button
                  onClick={() => { setSelectedDate(null); const defaultT = roundToNearest15(new Date()); setSelectedHour(defaultT.hour); setSelectedMinute(defaultT.minute); }}
                  className="text-[10px] text-muted-foreground font-semibold ml-auto hover:text-foreground transition-colors"
                  data-testid="button-clear-datetime"
                >
                  {t("group.clear")}
                </button>
              )}
              {!selectedDate && (
                <span className="text-[10px] text-muted-foreground ml-auto">{t("group.optional")}</span>
              )}
            </div>

            <div
              ref={dateScrollRef}
              className="flex gap-2 overflow-x-auto hide-scrollbar pl-5 pr-5 pb-1"
            >
              {upcomingDays.map((day, idx) => {
                const isSelected = isSameDay(selectedDate, day);
                const isToday = idx === 0;
                return (
                  <motion.button
                    key={day.toISOString()}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    data-testid={`calendar-day-${day.getDate()}`}
                    className={`flex flex-col items-center flex-shrink-0 w-[52px] py-2.5 rounded-2xl transition-all duration-200 ${
                      isSelected
                        ? "bg-foreground text-white"
                        : "bg-white border border-gray-100"
                    }`}
                    style={{
                      boxShadow: isSelected
                        ? "0 4px 16px rgba(0,0,0,0.15)"
                        : "0 1px 3px rgba(0,0,0,0.03)",
                    }}
                  >
                    <span className={`text-[9px] font-semibold uppercase tracking-wider ${
                      isSelected ? "text-white/60" : "text-muted-foreground"
                    }`}>
                      {isToday ? t("group.today") : DAY_NAMES_SHORT[day.getDay()]}
                    </span>
                    <span className={`text-[18px] font-bold leading-tight mt-0.5 ${
                      isSelected ? "text-white" : "text-foreground"
                    }`}>
                      {day.getDate()}
                    </span>
                    <span className={`text-[9px] font-medium ${
                      isSelected ? "text-white/50" : "text-muted-foreground/60"
                    }`}>
                      {MONTH_NAMES_SHORT[day.getMonth()]}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-3 px-5">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Clock className="w-3 h-3 text-muted-foreground/40" />
                <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{t("group.time")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div ref={hourPickerRef} className="relative flex-1">
                  <button
                    onClick={() => setHourPickerOpen(prev => !prev)}
                    data-testid="button-hour-picker"
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white rounded-xl border border-gray-100 cursor-pointer transition-all duration-200"
                    style={{ boxShadow: hourPickerOpen ? "0 2px 10px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.03)" }}
                  >
                    <span className="text-[14px] font-semibold text-foreground">
                      {(() => { const h = selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour; return `${h} ${selectedHour >= 12 ? "PM" : "AM"}`; })()}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/40 transition-transform duration-200 ${hourPickerOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {hourPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ type: "spring", damping: 26, stiffness: 300 }}
                        className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl overflow-hidden border border-gray-100 z-[120]"
                        style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)" }}
                        data-testid="hour-picker-dropdown"
                      >
                        <div className="py-1.5 max-h-[240px] overflow-y-auto">
                          {Array.from({ length: 24 }, (_, i) => {
                            const label = i === 0 ? "12" : i > 12 ? String(i - 12) : String(i);
                            const period = i >= 12 ? "PM" : "AM";
                            const isActive = selectedHour === i;
                            return (
                              <button
                                key={i}
                                onClick={() => { setSelectedHour(i); setHourPickerOpen(false); }}
                                data-testid={`hour-option-${i}`}
                                className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                                  isActive ? "bg-gray-50" : "hover:bg-gray-50/50"
                                }`}
                              >
                                <span className={`text-[13px] font-semibold flex-1 ${isActive ? "text-foreground" : "text-foreground/70"}`}>
                                  {label} {period}
                                </span>
                                {isActive && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#FFCC02]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <span className="text-[18px] font-bold text-muted-foreground/30">:</span>
                <div className="flex gap-1.5">
                  {MINUTES.map((m) => {
                    const active = selectedMinute === m;
                    return (
                      <motion.button
                        key={m}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setSelectedMinute(m)}
                        data-testid={`minute-${m}`}
                        className={`w-[44px] py-2 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                          active
                            ? "bg-foreground text-white"
                            : "bg-white border border-gray-100 text-muted-foreground"
                        }`}
                        style={{
                          boxShadow: active ? "0 2px 8px rgba(0,0,0,0.1)" : "0 1px 2px rgba(0,0,0,0.02)",
                        }}
                      >
                        :{m.toString().padStart(2, "0")}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {selectedDate && (
              <div className="mt-2.5 mx-5 flex items-center gap-2 bg-white rounded-xl px-3.5 py-2.5 border border-gray-100"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
              >
                <div className="w-6 h-6 rounded-lg bg-[#FFCC02]/10 flex items-center justify-center flex-shrink-0">
                  <CalendarIcon className="w-3 h-3 text-[#FFCC02]" />
                </div>
                <span className="text-[12px] font-semibold text-foreground flex-1" data-testid="text-datetime-summary">
                  {`${DAY_NAMES_SHORT[selectedDate.getDay()]}, ${MONTH_NAMES_SHORT[selectedDate.getMonth()]} ${selectedDate.getDate()} · ${formatDisplayTime(selectedHour, selectedMinute)}`}
                </span>
              </div>
            )}
          </motion.div>
        </div>

        <div className="px-5 pb-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Utensils className="w-4 h-4 text-[#FFCC02]" />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-foreground">{t("group.mode")}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SWIPE_MODES.map((mode) => {
                const active = swipeMode === mode.id;
                return (
                  <motion.button
                    key={mode.id}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setSwipeMode(mode.id as "restaurant" | "menu")}
                    data-testid={`chip-group-mode-${mode.id}`}
                    className={`flex flex-col items-start gap-0.5 py-3 px-3 rounded-2xl text-left transition-all duration-200 ${
                      active ? "bg-foreground text-white" : "bg-white border border-gray-100"
                    }`}
                    style={{
                      boxShadow: active
                        ? "0 4px 16px rgba(0,0,0,0.15)"
                        : "0 1px 4px rgba(0,0,0,0.03)",
                    }}
                  >
                    <span className={`text-[12px] font-semibold ${active ? "text-white" : "text-foreground"}`}>{mode.label}</span>
                    <span className={`text-[10px] ${active ? "text-white/60" : "text-muted-foreground"}`}>{mode.sub}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>

        <div className="px-5 pb-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-[#E11D48]" />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-foreground">{t("group.where")}</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LOCATIONS.map((l) => {
                const active = selectedLocations.includes(l.id);
                return (
                  <motion.button
                    key={l.id}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => toggleList(selectedLocations, l.id, setSelectedLocations)}
                    data-testid={`chip-group-location-${l.id}`}
                    className={`flex items-center gap-2 py-3 px-3 rounded-2xl text-left transition-all duration-200 ${
                      active
                        ? "bg-foreground text-white"
                        : "bg-white border border-gray-100"
                    }`}
                    style={{
                      boxShadow: active
                        ? "0 4px 16px rgba(0,0,0,0.15)"
                        : "0 1px 4px rgba(0,0,0,0.03)",
                    }}
                  >
                    <span className="text-lg flex-shrink-0">{l.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-[11px] font-semibold truncate ${active ? "text-white" : "text-foreground"}`}>{l.label}</p>
                      <p className={`text-[9px] truncate ${active ? "text-white/60" : "text-muted-foreground"}`}>{l.sub}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>

        <div className="px-5 pb-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#FFCC02]" />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-foreground">{t("group.budget")}</h2>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {BUDGETS.map((b) => {
                const active = selectedBudget === b.id;
                return (
                  <motion.button
                    key={b.id}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setSelectedBudget(active ? "" : b.id)}
                    data-testid={`chip-group-budget-${b.id}`}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl transition-all duration-200 ${
                      active
                        ? "bg-white border-2 border-foreground"
                        : "bg-white border border-gray-100"
                    }`}
                    style={{
                      boxShadow: active
                        ? "0 4px 16px rgba(0,0,0,0.1)"
                        : "0 1px 4px rgba(0,0,0,0.03)",
                    }}
                  >
                    <span
                      className="text-[14px] font-bold"
                      style={{ color: active ? b.color : "#999" }}
                    >
                      {b.icon}
                    </span>
                    <span className={`text-[10px] font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>{b.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>

        <div className="px-5 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Utensils className="w-4 h-4 text-[#6C2BD9]" />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-foreground">{t("group.dietary")}</h2>
              <span className="text-[10px] text-muted-foreground ml-auto">{t("group.optional")}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {RESTRICTIONS.map((r) => {
                const active = selectedRestrictions.includes(r.id);
                return (
                  <motion.button
                    key={r.id}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => toggleList(selectedRestrictions, r.id, setSelectedRestrictions)}
                    data-testid={`chip-group-diet-${r.id}`}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium transition-all duration-200 ${
                      active
                        ? "bg-foreground text-white"
                        : "bg-white border border-gray-100"
                    }`}
                    style={{
                      boxShadow: active
                        ? "0 4px 12px rgba(0,0,0,0.12)"
                        : "0 1px 3px rgba(0,0,0,0.03)",
                    }}
                  >
                    <span className="text-sm">{r.icon}</span>
                    <span>{r.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>

        <div className="px-5 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-[#00B14F]" />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-foreground">{t("group.who")}</h2>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {GROUP_TYPES.map((g) => {
                const Icon = g.icon;
                const active = selectedGroupType === g.id;
                return (
                  <motion.button
                    key={g.id}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setSelectedGroupType(active ? "" : g.id)}
                    data-testid={`chip-group-type-${g.id}`}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all duration-200 ${
                      active
                        ? "bg-white border-2 border-foreground"
                        : "bg-white border border-gray-100"
                    }`}
                    style={{
                      boxShadow: active
                        ? "0 4px 16px rgba(0,0,0,0.1)"
                        : "0 1px 4px rgba(0,0,0,0.03)",
                    }}
                  >
                    <Icon className="w-5 h-5 transition-colors" style={{ color: active ? g.color : "#999" }} />
                    <span className={`text-[11px] font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>{g.label}</span>
                  </motion.button>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100" style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
              <button
                onClick={handleInvite}
                data-testid="button-invite-line"
                className="w-full flex items-center gap-3 px-4 py-4 active:bg-gray-50 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#00C300" }}
                >
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[14px] font-bold text-foreground">
                    {inviteStatus === "sending" ? t("group.invite_sending") : inviteStatus === "sent" ? t("group.invite_sent") : t("group.invite_line")}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {inviteStatus === "sending" ? t("group.invite_select") : t("group.invite_send")}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-white border-t border-gray-100/60 px-5 py-4 pb-5 safe-bottom">
        <button
          onClick={async () => {
            const sessionId = await getOrCreateSessionId();
            navigate(`/group/waiting?session=${sessionId}`);
          }}
          data-testid="button-start-session"
          className="w-full py-4 rounded-2xl bg-foreground text-white font-bold text-[15px] active:scale-[0.97] transition-transform duration-200 flex items-center justify-center gap-2"
          style={{ boxShadow: "0 8px 25px -5px rgba(0,0,0,0.25)" }}
        >
          <Sparkles className="w-4 h-4" />
          {t("group.start_session")}
        </button>
      </div>
    </div>
  );
}
