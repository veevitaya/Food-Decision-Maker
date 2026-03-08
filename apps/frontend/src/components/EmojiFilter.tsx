import { useState, useCallback, memo } from "react";
import { FoodIconFromEmoji, emojiToIconName } from "./FoodIcon";

const EMOJI_ANIMATIONS: Record<string, string> = {
  "💰": "emoji-bounce",
  "🚇": "emoji-slide",
  "📈": "emoji-rise",
  "🔥": "emoji-flicker",
  "🌙": "emoji-glow",
  "⛱️": "emoji-sway",
  "❤️": "emoji-heartbeat",
  "💕": "emoji-heartbeat",
  "🥗": "emoji-bounce",
  "🌶️": "emoji-wiggle",
  "🍰": "emoji-bounce",
  "☕": "emoji-steam",
  "✨": "emoji-sparkle",
  "🛵": "emoji-slide",
  "🏷️": "emoji-bounce",
  "🍜": "emoji-steam",
  "🍣": "emoji-wiggle",
  "🍕": "emoji-bounce",
  "🍔": "emoji-bounce",
  "🍳": "emoji-wiggle",
  "🧋": "emoji-bounce",
  "🍸": "emoji-sway",
  "🥐": "emoji-bounce",
  "👨‍🍳": "emoji-sparkle",
  "🤝": "emoji-bounce",
  "🎲": "emoji-wiggle",
  "🔍": "emoji-pulse",
  "📍": "emoji-bounce",
};

function AnimatedIcon({ emoji, size = 28, playing = false }: { emoji: string; size?: number; playing?: boolean }) {
  const animClass = playing ? (EMOJI_ANIMATIONS[emoji] || "emoji-bounce") : "";

  return (
    <span className={`inline-block select-none gpu-accelerated ${animClass}`}>
      <FoodIconFromEmoji emoji={emoji} size={size} />
    </span>
  );
}

interface EmojiFilterProps {
  emoji: string;
  label: string;
  description?: string;
  active?: boolean;
  onClick: () => void;
  variant?: "default" | "pill" | "wide";
}

const cardBase = "bg-white dark:bg-card border border-gray-100/80 dark:border-border";
const cardShadow = "0 3px 12px -4px rgba(0,0,0,0.06), 0 1px 4px -1px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)";
const cardActiveShadow = "0 6px 24px -6px rgba(0,0,0,0.10), 0 2px 6px -2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)";

export const EmojiFilter = memo(function EmojiFilter({ emoji, label, description, active = false, onClick, variant = "default" }: EmojiFilterProps) {
  const [animating, setAnimating] = useState(false);

  const handleClick = useCallback(() => {
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      onClick();
    }, 500);
  }, [onClick]);

  if (variant === "pill") {
    return (
      <button
        onClick={handleClick}
        data-testid={`filter-${label.toLowerCase().replace(/\s/g, '-')}`}
        className={`flex-1 flex items-center gap-3 px-5 py-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.97] gpu-accelerated ${cardBase}`}
        style={{ boxShadow: active ? cardActiveShadow : cardShadow }}
      >
        <AnimatedIcon emoji={emoji} size={32} playing={animating} />
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
        onClick={handleClick}
        data-testid={`filter-${label.toLowerCase().replace(/\s/g, '-')}`}
        className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.97] gpu-accelerated ${cardBase}`}
        style={{ boxShadow: active ? cardActiveShadow : cardShadow }}
      >
        <AnimatedIcon emoji={emoji} size={32} playing={animating} />
        <div>
          <span className={`font-semibold text-sm ${active ? "text-foreground" : ""}`}>{label}</span>
          {description && <span className="text-xs text-muted-foreground ml-2">{description}</span>}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      data-testid={`filter-${label.toLowerCase().replace(/\s/g, '-')}`}
      className={`flex flex-col items-center justify-center px-3 py-4 rounded-2xl text-center transition-all duration-200 min-w-0 active:scale-[0.95] gpu-accelerated ${cardBase}`}
      style={{ boxShadow: active ? cardActiveShadow : cardShadow }}
    >
      <AnimatedIcon emoji={emoji} size={28} playing={animating} />
      <span className={`font-semibold text-xs leading-tight mt-1.5 ${active ? "text-foreground" : ""}`}>{label}</span>
    </button>
  );
});

export function getEmojiAnimClass(emoji: string): string {
  return EMOJI_ANIMATIONS[emoji] || "";
}
