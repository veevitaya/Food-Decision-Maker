import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";

const CUISINES = [
  { emoji: "🍜", label: "Thai" },
  { emoji: "🍣", label: "Japanese" },
  { emoji: "🥟", label: "Chinese" },
  { emoji: "🍲", label: "Korean" },
  { emoji: "🍝", label: "Italian" },
  { emoji: "🦐", label: "Seafood" },
  { emoji: "🍛", label: "Indian" },
  { emoji: "🌮", label: "Mexican" },
  { emoji: "🥩", label: "Western" },
];

const DIET_RESTRICTIONS = [
  { emoji: "🥬", label: "Vegan" },
  { emoji: "🕌", label: "Halal" },
  { emoji: "🌾", label: "Gluten-Free" },
  { emoji: "🥛", label: "Dairy-Free" },
  { emoji: "🥓", label: "Keto" },
  { emoji: "🐷", label: "No Pork" },
];

const LOCATIONS = [
  { emoji: "🍢", label: "Street food" },
  { emoji: "🍽️", label: "Restaurants" },
  { emoji: "🚇", label: "Near BTS" },
  { emoji: "🏬", label: "At the mall" },
  { emoji: "🌙", label: "Late night" },
  { emoji: "🌊", label: "By the river" },
  { emoji: "📈", label: "Trendy spots" },
  { emoji: "🏙️", label: "Rooftops" },
];

const BUDGETS = [
  { emoji: "฿", label: "Cheap" },
  { emoji: "฿฿", label: "Moderate" },
  { emoji: "฿฿฿", label: "Fancy" },
  { emoji: "฿฿฿฿", label: "Expensive" },
];

const INTERESTS = [
  { emoji: "⭐", label: "Popular spots" },
  { emoji: "💰", label: "Budget-friendly" },
  { emoji: "☀️", label: "Outdoor dining" },
  { emoji: "🍰", label: "Dessert" },
  { emoji: "☕", label: "Coffee" },
  { emoji: "🥗", label: "Vegetarian" },
  { emoji: "🌶️", label: "Hot & spicy" },
  { emoji: "🍲", label: "Comfort food" },
  { emoji: "🥂", label: "Fine dining" },
];

const STEP_CONFIG = [
  { title: "What are you craving?", subtitle: "Pick up to 3 cuisines or diet options", icon: "🍽️" },
  { title: "Where sounds good?", subtitle: "Pick a setting and budget range", icon: "📍" },
  { title: "Any preferences?", subtitle: "Pick up to 3 things you love", icon: "✨" },
];

function ChipButton({ emoji, label, selected, onClick, testId }: { emoji: string; label: string; selected: boolean; onClick: () => void; testId: string }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`
        flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-250 active:scale-[0.94] gpu-accelerated border
        ${selected
          ? "bg-foreground text-white border-foreground"
          : "bg-white border-gray-200/80 text-foreground hover:border-gray-300"
        }
      `}
      style={selected ? { boxShadow: "0 6px 20px -4px rgba(0,0,0,0.15)" } : {}}
    >
      <span className="text-lg inline-block w-6 text-center flex-shrink-0">
        {emoji}
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function SoloQuiz() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<{ cuisines: string[]; diet: string[]; locations: string[]; budget: string[]; interests: string[] }>({
    cuisines: [],
    diet: [],
    locations: [],
    budget: [],
    interests: [],
  });

  const toggleSelection = (category: keyof typeof selections, item: string) => {
    setSelections((prev) => {
      const current = prev[category];
      if (current.includes(item)) {
        return { ...prev, [category]: current.filter((i) => i !== item) };
      }
      if (current.length >= 3) return prev;
      return { ...prev, [category]: [...current, item] };
    });
  };

  const totalSelected = () => {
    if (step === 0) return selections.cuisines.length + selections.diet.length;
    if (step === 1) return selections.locations.length + selections.budget.length;
    return selections.interests.length;
  };

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
    else {
      const params = new URLSearchParams();
      if (selections.cuisines.length) params.set("cuisines", selections.cuisines.join(","));
      if (selections.diet.length) params.set("diet", selections.diet.join(","));
      if (selections.locations.length) params.set("locations", selections.locations.join(","));
      if (selections.budget.length) params.set("budget", selections.budget.join(","));
      if (selections.interests.length) params.set("interests", selections.interests.join(","));
      const qs = params.toString();
      navigate(`/solo/results${qs ? `?${qs}` : ""}`);
    }
  };

  const slideVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const config = STEP_CONFIG[step];

  return (
    <div className="w-full h-[100dvh] bg-white flex flex-col" data-testid="solo-quiz-page">
      <div className="flex items-center justify-end px-6 pt-14 pb-3">
        <button onClick={handleNext} className="text-muted-foreground font-medium text-sm px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors active:scale-95" data-testid="button-quiz-skip">
          Skip
        </button>
      </div>

      <div className="px-6 mb-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 rounded-full flex-1 transition-all duration-500"
              style={{
                backgroundColor: i <= step ? "#FFCC02" : "#e8e5e0",
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`step-${step}`}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 px-6 overflow-y-auto pb-32 gpu-accelerated"
          >
            <div className="flex items-center gap-2.5 mb-1.5 mt-1">
              <span className={`text-2xl inline-block ${step === 0 ? "animate-icon-wiggle" : step === 1 ? "animate-gentle-float" : "animate-soft-bob"}`}>
                {config.icon}
              </span>
              <h1 className="text-[26px] font-semibold" data-testid="text-quiz-title">{config.title}</h1>
            </div>
            <p className="text-muted-foreground text-sm mb-7">{config.subtitle}</p>

            {step === 0 && (
              <>
                <h3 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Cuisines</h3>
                <div className="flex flex-wrap gap-2.5 mb-7">
                  {CUISINES.map((c) => (
                    <ChipButton
                      key={c.label}
                      emoji={c.emoji}
                      label={c.label}
                      selected={selections.cuisines.includes(c.label)}
                      onClick={() => toggleSelection("cuisines", c.label)}
                      testId={`chip-cuisine-${c.label.toLowerCase()}`}
                    />
                  ))}
                </div>

                <h3 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Diet</h3>
                <div className="flex flex-wrap gap-2.5">
                  {DIET_RESTRICTIONS.map((d) => (
                    <ChipButton
                      key={d.label}
                      emoji={d.emoji}
                      label={d.label}
                      selected={selections.diet.includes(d.label)}
                      onClick={() => toggleSelection("diet", d.label)}
                      testId={`chip-diet-${d.label.toLowerCase()}`}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h3 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Setting</h3>
                <div className="flex flex-wrap gap-2.5 mb-7">
                  {LOCATIONS.map((l) => (
                    <ChipButton
                      key={l.label}
                      emoji={l.emoji}
                      label={l.label}
                      selected={selections.locations.includes(l.label)}
                      onClick={() => toggleSelection("locations", l.label)}
                      testId={`chip-location-${l.label.toLowerCase().replace(/\s/g, '-')}`}
                    />
                  ))}
                </div>

                <h3 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Budget</h3>
                <div className="flex flex-wrap gap-2.5">
                  {BUDGETS.map((b) => (
                    <ChipButton
                      key={b.label}
                      emoji={b.emoji}
                      label={`${b.emoji} | ${b.label}`}
                      selected={selections.budget.includes(b.label)}
                      onClick={() => toggleSelection("budget", b.label)}
                      testId={`chip-budget-${b.label.toLowerCase()}`}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <div className="flex flex-wrap gap-2.5">
                {INTERESTS.map((i) => (
                  <ChipButton
                    key={i.label}
                    emoji={i.emoji}
                    label={i.label}
                    selected={selections.interests.includes(i.label)}
                    onClick={() => toggleSelection("interests", i.label)}
                    testId={`chip-interest-${i.label.toLowerCase().replace(/\s/g, '-')}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
        <div className="bg-white/95 backdrop-blur-md border-t border-gray-100/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-lg active:scale-90 transition-all duration-200"
              data-testid="button-home"
            >
              🏠
            </button>
            <button
              onClick={() => step > 0 ? setStep(step - 1) : navigate("/")}
              className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-sm font-semibold active:scale-90 transition-all duration-200"
              data-testid="button-quiz-back"
            >
              ←
            </button>
            <div className="flex items-center gap-1.5 ml-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i <= step ? "bg-[#FFCC02] scale-100" : "bg-gray-200 scale-75"}`} />
              ))}
            </div>
          </div>

          <button
            onClick={handleNext}
            data-testid="button-quiz-next"
            className={`px-8 py-3.5 rounded-full font-bold text-sm transition-all duration-300 active:scale-[0.96] gpu-accelerated ${
              step === 2
                ? "bg-[#FFCC02] text-[#2d2000]"
                : "bg-foreground text-white"
            }`}
            style={{ boxShadow: step === 2 ? "var(--shadow-glow-primary)" : "0 4px 15px -3px rgba(0,0,0,0.2)" }}
          >
            {step === 2 ? "Let's go! 🍽️" : "Next →"}
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
