import { useState, memo } from "react";

interface EmojiFilterProps {
  emoji: string;
  label: string;
  description?: string;
  active?: boolean;
  onClick: () => void;
  variant?: "default" | "pill" | "wide";
}

function AnimatedEmoji({ emoji, size = "text-3xl", active = false }: { emoji: string; size?: string; active?: boolean }) {
  const [tapped, setTapped] = useState(false);

  return (
    <span
      className={`${size} inline-block select-none gpu-accelerated transition-transform duration-300 ${
        tapped || active ? "scale-110" : "scale-100"
      }`}
      onPointerDown={() => setTapped(true)}
      onAnimationEnd={() => setTapped(false)}
      onPointerUp={() => setTimeout(() => setTapped(false), 300)}
    >
      {emoji}
    </span>
  );
}

const cardBase = "bg-white dark:bg-card border border-gray-100/80 dark:border-border";
const cardShadow = "0 3px 12px -4px rgba(0,0,0,0.06), 0 1px 4px -1px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)";
const cardActiveShadow = "0 6px 24px -6px rgba(0,0,0,0.10), 0 2px 6px -2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)";

export const EmojiFilter = memo(function EmojiFilter({ emoji, label, description, active = false, onClick, variant = "default" }: EmojiFilterProps) {
  if (variant === "pill") {
    return (
      <button
        onClick={onClick}
        data-testid={`filter-${label.toLowerCase().replace(/\s/g, '-')}`}
        className={`flex-1 flex items-center gap-3 px-5 py-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.97] gpu-accelerated ${cardBase}`}
        style={{ boxShadow: active ? cardActiveShadow : cardShadow }}
      >
        <AnimatedEmoji emoji={emoji} size="text-3xl" active={active} />
        <div>
          <span className={`font-semibold text-sm block ${active ? "text-foreground" : ""}`}>{label}</span>
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </div>
      </button>
    );
  }

  if (variant === "wide") {
    return (
      <button
        onClick={onClick}
        data-testid={`filter-${label.toLowerCase().replace(/\s/g, '-')}`}
        className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.97] gpu-accelerated ${cardBase}`}
        style={{ boxShadow: active ? cardActiveShadow : cardShadow }}
      >
        <AnimatedEmoji emoji={emoji} size="text-3xl" active={active} />
        <div>
          <span className={`font-semibold text-sm ${active ? "text-foreground" : ""}`}>{label}</span>
          {description && <span className="text-xs text-muted-foreground ml-2">{description}</span>}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      data-testid={`filter-${label.toLowerCase().replace(/\s/g, '-')}`}
      className={`flex flex-col items-center justify-center px-3 py-4 rounded-2xl text-center transition-all duration-200 min-w-0 active:scale-[0.95] gpu-accelerated ${cardBase}`}
      style={{ boxShadow: active ? cardActiveShadow : cardShadow }}
    >
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 transition-colors duration-300 ${
        active ? "bg-amber-50 dark:bg-amber-900/20" : "bg-gray-50 dark:bg-muted"
      }`}>
        <AnimatedEmoji emoji={emoji} size="text-3xl" active={active} />
      </div>
      <span className={`font-semibold text-xs leading-tight ${active ? "text-foreground" : ""}`}>{label}</span>
    </button>
  );
});
