import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";

const LOCATIONS_GROUP = [
  { emoji: "🍢", label: "Street food" },
  { emoji: "🍽️", label: "Restaurants" },
  { emoji: "🚇", label: "Near BTS" },
  { emoji: "🏬", label: "At the mall" },
  { emoji: "🌙", label: "Late night" },
  { emoji: "🏙️", label: "Rooftops" },
];

const BUDGETS_GROUP = [
  { label: "฿ Cheap" },
  { label: "฿฿ Moderate" },
  { label: "฿฿฿ Fancy" },
  { label: "฿฿฿฿ Expensive" },
];

const DIET_GROUP = [
  { emoji: "🥬", label: "Vegan" },
  { emoji: "🕌", label: "Halal" },
  { emoji: "🌾", label: "Gluten-Free" },
  { emoji: "🐷", label: "No Pork" },
  { emoji: "🥓", label: "Keto" },
  { emoji: "🥛", label: "Dairy-Free" },
];

const staggerIn = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.3, ease: [0.4, 0, 0.2, 1] as number[] },
});

export default function GroupSetup() {
  const [, navigate] = useLocation();
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string>("");
  const [selectedDiet, setSelectedDiet] = useState<string[]>([]);
  const [inviteSent, setInviteSent] = useState(false);

  const toggleList = (list: string[], item: string, setter: (v: string[]) => void) => {
    if (list.includes(item)) setter(list.filter((i) => i !== item));
    else if (list.length < 3) setter([...list, item]);
  };

  const handleInvite = () => {
    setInviteSent(true);
    const text = encodeURIComponent("Join my Toast session! Let's decide what to eat together 🍞✨");
    window.open(`https://line.me/R/share?text=${text}`, "_blank");
    setTimeout(() => navigate("/group/waiting"), 1500);
  };

  return (
    <div className="w-full min-h-[100dvh] bg-white flex flex-col" data-testid="group-setup-page">
      <div className="flex items-center gap-3 px-6 pt-14 pb-4">
        <h1 className="text-xl font-semibold flex-1">Group Session</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32">
        <motion.div {...staggerIn(0.05)}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-2">Area</h2>
          <div className="w-full h-40 rounded-2xl overflow-hidden mb-5 border border-gray-100"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <iframe
              title="Location map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=100.50%2C13.73%2C100.56%2C13.76&layer=mapnik&marker=13.7466%2C100.5393"
              className="w-full h-full border-0"
              style={{ filter: "saturate(0.9) contrast(0.92) brightness(1.05)" }}
            />
          </div>
        </motion.div>

        <motion.div {...staggerIn(0.1)}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Setting</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {LOCATIONS_GROUP.map((l) => (
              <button
                key={l.label}
                onClick={() => toggleList(selectedLocations, l.label, setSelectedLocations)}
                data-testid={`chip-group-location-${l.label.toLowerCase().replace(/\s/g, '-')}`}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-250 active:scale-[0.94] gpu-accelerated ${
                  selectedLocations.includes(l.label)
                    ? "bg-foreground text-white"
                    : "bg-white border border-gray-200/80 hover:border-gray-300"
                }`}
                style={selectedLocations.includes(l.label) ? { boxShadow: "0 6px 20px -4px rgba(0,0,0,0.15)" } : {}}
              >
                <span className={`text-lg inline-block transition-transform duration-300 ${selectedLocations.includes(l.label) ? "scale-110" : ""}`}>{l.emoji}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div {...staggerIn(0.15)}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Budget</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {BUDGETS_GROUP.map((b) => (
              <button
                key={b.label}
                onClick={() => setSelectedBudget(b.label)}
                data-testid={`chip-group-budget-${b.label.split(' ')[1]?.toLowerCase()}`}
                className={`px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-250 active:scale-[0.94] gpu-accelerated ${
                  selectedBudget === b.label
                    ? "bg-foreground text-white"
                    : "bg-white border border-gray-200/80 hover:border-gray-300"
                }`}
                style={selectedBudget === b.label ? { boxShadow: "0 6px 20px -4px rgba(0,0,0,0.15)" } : {}}
              >
                {b.label}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div {...staggerIn(0.2)}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Diet</h2>
          <div className="flex flex-wrap gap-2 mb-8">
            {DIET_GROUP.map((d) => (
              <button
                key={d.label}
                onClick={() => toggleList(selectedDiet, d.label, setSelectedDiet)}
                data-testid={`chip-group-diet-${d.label.toLowerCase().replace(/\s/g, '-')}`}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-250 active:scale-[0.94] gpu-accelerated ${
                  selectedDiet.includes(d.label)
                    ? "bg-foreground text-white"
                    : "bg-white border border-gray-200/80 hover:border-gray-300"
                }`}
                style={selectedDiet.includes(d.label) ? { boxShadow: "0 6px 20px -4px rgba(0,0,0,0.15)" } : {}}
              >
                <span className={`text-lg inline-block transition-transform duration-300 ${selectedDiet.includes(d.label) ? "scale-110" : ""}`}>{d.emoji}</span>
                <span>{d.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div {...staggerIn(0.25)}>
          <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/60 border border-green-200/50 rounded-[24px] p-7 text-center"
            style={{ boxShadow: "0 8px 30px -8px rgba(6,199,85,0.1)" }}
          >
            <div
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-4"
              style={{ boxShadow: "0 4px 15px rgba(6,199,85,0.12)" }}
            >
              <span className="text-3xl inline-block animate-soft-bob gpu-accelerated">💬</span>
            </div>
            <h3 className="font-semibold text-lg mb-1">Invite via LINE</h3>
            <p className="text-sm text-muted-foreground mb-5">Share the session with your group</p>
            <button
              onClick={handleInvite}
              data-testid="button-invite-line"
              className="bg-[#06C755] text-white font-bold px-8 py-3.5 rounded-full text-sm inline-flex items-center gap-2 active:scale-[0.95] transition-transform duration-200"
              style={{ boxShadow: "0 6px 20px -4px rgba(6,199,85,0.35)" }}
            >
              {inviteSent ? (
                <>Invite Sent! <span className="text-base">✓</span></>
              ) : (
                <>Send LINE Invite</>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
        <div className="bg-white/95 backdrop-blur-md border-t border-gray-100/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-lg active:scale-90 transition-all duration-200 flex-shrink-0"
              data-testid="button-home"
            >
              🏠
            </button>
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-sm font-semibold active:scale-90 transition-all duration-200 flex-shrink-0"
              data-testid="button-back"
            >
              ←
            </button>
            <button
              onClick={() => navigate("/group/waiting")}
              data-testid="button-start-session"
              className="flex-1 py-4 rounded-full bg-foreground text-white font-bold text-[15px] active:scale-[0.97] transition-transform duration-200"
              style={{ boxShadow: "0 8px 25px -5px rgba(0,0,0,0.25)" }}
            >
              Start Session →
            </button>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
