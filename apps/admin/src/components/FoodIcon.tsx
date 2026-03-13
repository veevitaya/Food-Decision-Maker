import { memo, useEffect } from "react";

type IconName =
  | "fire" | "chili" | "cocktail" | "money" | "salad" | "umbrella"
  | "hearts" | "scooter" | "moon" | "cake" | "pancakes" | "noodles"
  | "city" | "family" | "coffee" | "sushi" | "burger" | "pizza"
  | "dumpling" | "egg" | "boba" | "croissant" | "plate" | "grid"
  | "sparkle" | "flag-th" | "more";

interface FoodIconProps {
  name: IconName;
  size?: number;
  className?: string;
}

type AnimType = "flicker" | "pulse" | "wobble" | "sway" | "float" | "bounce" | "wave" | "twinkle" | "jiggle";

const ANIM_MAP: Record<IconName, AnimType> = {
  fire: "flicker",
  chili: "sway",
  cocktail: "wobble",
  money: "jiggle",
  salad: "sway",
  umbrella: "wobble",
  hearts: "pulse",
  scooter: "bounce",
  moon: "float",
  cake: "wobble",
  pancakes: "jiggle",
  noodles: "sway",
  city: "twinkle",
  family: "sway",
  coffee: "float",
  sushi: "wobble",
  burger: "bounce",
  pizza: "wobble",
  dumpling: "float",
  egg: "jiggle",
  boba: "bounce",
  croissant: "sway",
  plate: "wobble",
  grid: "twinkle",
  sparkle: "flicker",
  "flag-th": "wave",
  more: "pulse",
};

let stylesInjected = false;
function injectAnimStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fi-flicker {
      0% { transform: scaleX(1) scaleY(1) rotate(0deg); }
      15% { transform: scaleX(0.88) scaleY(1.08) rotate(-3deg); }
      30% { transform: scaleX(1.08) scaleY(0.92) rotate(2deg); }
      45% { transform: scaleX(0.92) scaleY(1.06) rotate(-2deg); }
      60% { transform: scaleX(1.05) scaleY(0.95) rotate(3deg); }
      75% { transform: scaleX(0.94) scaleY(1.04) rotate(-1.5deg); }
      90% { transform: scaleX(1.02) scaleY(0.98) rotate(1deg); }
      100% { transform: scaleX(1) scaleY(1) rotate(0deg); }
    }
    @keyframes fi-pulse {
      0% { transform: scale(1); }
      30% { transform: scale(1.18); }
      60% { transform: scale(0.95); }
      100% { transform: scale(1); }
    }
    @keyframes fi-wobble {
      0% { transform: rotate(0deg); }
      20% { transform: rotate(-6deg); }
      40% { transform: rotate(5deg); }
      60% { transform: rotate(-4deg); }
      80% { transform: rotate(3deg); }
      100% { transform: rotate(0deg); }
    }
    @keyframes fi-sway {
      0% { transform: rotate(0deg) translateX(0); }
      25% { transform: rotate(-5deg) translateX(-2px); }
      50% { transform: rotate(4deg) translateX(2px); }
      75% { transform: rotate(-3deg) translateX(-1px); }
      100% { transform: rotate(0deg) translateX(0); }
    }
    @keyframes fi-float {
      0% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
      60% { transform: translateY(1px); }
      100% { transform: translateY(0); }
    }
    @keyframes fi-bounce {
      0% { transform: translateY(0) scaleY(1); }
      25% { transform: translateY(-5px) scaleY(1.04); }
      50% { transform: translateY(0) scaleY(0.94); }
      75% { transform: translateY(-2px) scaleY(1.02); }
      100% { transform: translateY(0) scaleY(1); }
    }
    @keyframes fi-wave {
      0% { transform: rotate(0deg); }
      15% { transform: rotate(5deg); }
      30% { transform: rotate(-4deg); }
      50% { transform: rotate(5deg); }
      70% { transform: rotate(-3deg); }
      100% { transform: rotate(0deg); }
    }
    @keyframes fi-twinkle {
      0% { opacity: 1; transform: scale(1); }
      40% { opacity: 0.7; transform: scale(0.92); }
      70% { opacity: 1; transform: scale(1.05); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes fi-jiggle {
      0% { transform: rotate(0deg); }
      15% { transform: rotate(-4deg); }
      30% { transform: rotate(5deg); }
      45% { transform: rotate(-5deg); }
      60% { transform: rotate(4deg); }
      75% { transform: rotate(-2deg); }
      100% { transform: rotate(0deg); }
    }
    .fi-tap-flicker { animation: fi-flicker 0.5s ease-in-out forwards; transform-origin: center bottom; }
    .fi-tap-pulse { animation: fi-pulse 0.45s ease-in-out forwards; transform-origin: center center; }
    .fi-tap-wobble { animation: fi-wobble 0.5s ease-in-out forwards; transform-origin: center bottom; }
    .fi-tap-sway { animation: fi-sway 0.5s ease-in-out forwards; transform-origin: center bottom; }
    .fi-tap-float { animation: fi-float 0.5s ease-in-out forwards; transform-origin: center center; }
    .fi-tap-bounce { animation: fi-bounce 0.45s ease-in-out forwards; transform-origin: center bottom; }
    .fi-tap-wave { animation: fi-wave 0.5s ease-in-out forwards; transform-origin: left center; }
    .fi-tap-twinkle { animation: fi-twinkle 0.45s ease-in-out forwards; transform-origin: center center; }
    .fi-tap-jiggle { animation: fi-jiggle 0.4s ease-in-out forwards; transform-origin: center center; }
  `;
  document.head.appendChild(style);
}

const ICON_EMOJI: Record<IconName, string> = {
  fire: "🔥",
  chili: "🌶️",
  cocktail: "🍸",
  money: "💰",
  salad: "🥗",
  umbrella: "⛱️",
  hearts: "💕",
  scooter: "🛵",
  moon: "🌙",
  cake: "🍰",
  pancakes: "🥞",
  noodles: "🍜",
  city: "🏙️",
  family: "🤗",
  coffee: "☕",
  sushi: "🍣",
  burger: "🍔",
  pizza: "🍕",
  dumpling: "🥟",
  egg: "🍳",
  boba: "🧋",
  croissant: "🥐",
  plate: "🍽️",
  grid: "🔲",
  sparkle: "✨",
  "flag-th": "🇹🇭",
  more: "➕",
};

const EMOJI_TO_ICON: Record<string, IconName> = {
  "\uD83D\uDD25": "fire",
  "\uD83C\uDF36\uFE0F": "chili",
  "\uD83C\uDF36": "chili",
  "\uD83C\uDF78": "cocktail",
  "\uD83C\uDF79": "cocktail",
  "\uD83D\uDCB0": "money",
  "\uD83E\uDD57": "salad",
  "\u26F1\uFE0F": "umbrella",
  "\u26F1": "umbrella",
  "\uD83D\uDC95": "hearts",
  "\uD83D\uDEF5": "scooter",
  "\uD83C\uDF19": "moon",
  "\uD83C\uDF70": "cake",
  "\uD83E\uDD5E": "pancakes",
  "\uD83C\uDF5C": "noodles",
  "\uD83C\uDFD9\uFE0F": "city",
  "\uD83C\uDFD9": "city",
  "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67": "family",
  "\u2615": "coffee",
  "\u2615\uFE0F": "coffee",
  "\uD83C\uDF63": "sushi",
  "\uD83C\uDF54": "burger",
  "\uD83C\uDF55": "pizza",
  "\uD83E\uDD5F": "dumpling",
  "\uD83C\uDF73": "egg",
  "\uD83E\uDDCB": "boba",
  "\uD83E\uDD50": "croissant",
  "\uD83C\uDF7D\uFE0F": "plate",
  "\uD83C\uDF7D": "plate",
  "\uD83C\uDDF9\uD83C\uDDED": "flag-th",
  "\uD83C\uDF3E": "salad",
  "\uD83E\uDD6C": "salad",
  "\uD83C\uDF5D": "noodles",
  "\uD83C\uDF58": "pizza",
  "\uD83D\uDD1C": "sparkle",
  "\u2728": "sparkle",
  "\uD83C\uDF5B": "noodles",
  "\uD83C\uDF5E": "croissant",
  "\uD83C\uDF4E": "salad",
  "\uD83E\uDDC1": "cake",
};

export function emojiToIconName(emoji: string): IconName | null {
  return EMOJI_TO_ICON[emoji] || null;
}

export function getAnimClass(name: IconName): string {
  return `fi-tap-${ANIM_MAP[name]}`;
}

export const FoodIcon = memo(function FoodIcon({ name, size = 32, className = "" }: FoodIconProps) {
  const emoji = ICON_EMOJI[name];

  useEffect(() => {
    injectAnimStyles();
  }, []);

  if (!emoji) return null;

  const fontSize = Math.round(size * 0.75);

  return (
    <span
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size, fontSize: `${fontSize}px`, lineHeight: 1 }}
      data-anim-class={`fi-tap-${ANIM_MAP[name]}`}
      role="img"
    >
      {emoji}
    </span>
  );
});

export function FoodIconFromEmoji({ emoji, size = 32, className = "" }: { emoji: string; size?: number; className?: string }) {
  const iconName = emojiToIconName(emoji);
  if (iconName) {
    return <FoodIcon name={iconName} size={size} className={className} />;
  }
  return <span className={`text-[${size * 0.7}px] select-none ${className}`}>{emoji}</span>;
}

export default FoodIcon;
