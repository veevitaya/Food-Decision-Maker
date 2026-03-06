import { useState, useCallback } from "react";

const STORAGE_KEY = "toast_vibe_freq";

export interface VibeOption {
  mode: string;
  emoji: string;
  label: string;
  description?: string;
  variant: "square" | "wide";
}

export const ALL_VIBES: VibeOption[] = [
  { mode: "cheap", emoji: "💰", label: "Budget", variant: "square" },
  { mode: "nearby", emoji: "🚇", label: "Near BTS", variant: "square" },
  { mode: "trending", emoji: "📈", label: "Trendy", variant: "square" },
  { mode: "hot", emoji: "🔥", label: "Hot now", variant: "square" },
  { mode: "late", emoji: "🌙", label: "Late night", description: "Open late", variant: "wide" },
  { mode: "outdoor", emoji: "⛱️", label: "Outdoor", description: "Al fresco", variant: "wide" },
  { mode: "saved", emoji: "❤️", label: "Saved", description: "Your picks", variant: "wide" },
  { mode: "partner", emoji: "💕", label: "With partner", description: "Saved together", variant: "wide" },
  { mode: "healthy", emoji: "🥗", label: "Healthy", description: "Clean eats", variant: "wide" },
  { mode: "spicy", emoji: "🌶️", label: "Spicy", variant: "square" },
  { mode: "sweets", emoji: "🍰", label: "Sweets", variant: "square" },
  { mode: "coffee", emoji: "☕", label: "Café", variant: "square" },
  { mode: "fancy", emoji: "✨", label: "Fine dining", description: "Treat yourself", variant: "wide" },
  { mode: "delivery", emoji: "🛵", label: "Delivery", description: "Stay in", variant: "wide" },
];

const MAIN_SLOTS = 8;

function getFrequencies(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFrequencies(freq: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(freq));
}

function sortVibesByFrequency(vibes: VibeOption[], freq: Record<string, number>): VibeOption[] {
  return [...vibes].sort((a, b) => {
    const fa = freq[a.mode] || 0;
    const fb = freq[b.mode] || 0;
    if (fb !== fa) return fb - fa;
    const idxA = ALL_VIBES.findIndex(v => v.mode === a.mode);
    const idxB = ALL_VIBES.findIndex(v => v.mode === b.mode);
    return idxA - idxB;
  });
}

export function useVibeFrequency() {
  const [freq, setFreq] = useState<Record<string, number>>(getFrequencies);

  const recordVibe = useCallback((mode: string) => {
    setFreq(prev => {
      const next = { ...prev, [mode]: (prev[mode] || 0) + 1 };
      saveFrequencies(next);
      return next;
    });
  }, []);

  const sorted = sortVibesByFrequency(ALL_VIBES, freq);
  const mainVibes = sorted.slice(0, MAIN_SLOTS);
  const moreVibes = sorted.slice(MAIN_SLOTS);

  return { mainVibes, moreVibes, recordVibe, freq };
}
