import { memo } from "react";
import type { LucideIcon } from "lucide-react";

export type ColorTheme =
  | "yellow" | "green" | "blue" | "red" | "purple" | "orange"
  | "pink" | "teal" | "indigo" | "amber" | "emerald" | "rose"
  | "cyan" | "lime" | "slate";

interface Icon3DProps {
  icon: LucideIcon;
  theme?: ColorTheme;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  iconClassName?: string;
}

const SIZES = {
  xs: { container: 24, icon: 12, radius: 6, shadow: "0 2px 6px" },
  sm: { container: 32, icon: 16, radius: 8, shadow: "0 3px 8px" },
  md: { container: 40, icon: 20, radius: 10, shadow: "0 4px 12px" },
  lg: { container: 48, icon: 24, radius: 12, shadow: "0 5px 16px" },
  xl: { container: 56, icon: 28, radius: 14, shadow: "0 6px 20px" },
};

const THEMES: Record<ColorTheme, {
  bg: string;
  bgLight: string;
  shadow: string;
  icon: string;
  highlight: string;
}> = {
  yellow: {
    bg: "linear-gradient(135deg, #FFCC02 0%, #FFB300 50%, #FF9800 100%)",
    bgLight: "rgba(255, 204, 2, 0.15)",
    shadow: "rgba(255, 179, 0, 0.35)",
    icon: "#FFFFFF",
    highlight: "rgba(255, 255, 255, 0.35)",
  },
  green: {
    bg: "linear-gradient(135deg, #00C853 0%, #00B14F 50%, #009624 100%)",
    bgLight: "rgba(0, 177, 79, 0.12)",
    shadow: "rgba(0, 150, 36, 0.3)",
    icon: "#FFFFFF",
    highlight: "rgba(255, 255, 255, 0.3)",
  },
  blue: {
    bg: "linear-gradient(135deg, #42A5F5 0%, #2196F3 50%, #1976D2 100%)",
    bgLight: "rgba(33, 150, 243, 0.12)",
    shadow: "rgba(25, 118, 210, 0.3)",
    icon: "#FFFFFF",
    highlight: "rgba(255, 255, 255, 0.3)",
  },
  red: {
    bg: "linear-gradient(135deg, #EF5350 0%, #E53935 50%, #C62828 100%)",
    bgLight: "rgba(229, 57, 53, 0.12)",
    shadow: "rgba(198, 40, 40, 0.3)",
    icon: "#FFFFFF",
    highlight: "rgba(255, 255, 255, 0.3)",
  },
  purple: {
    bg: "linear-gradient(135deg, #AB47BC 0%, #9C27B0 50%, #7B1FA2 100%)",
    bgLight: "rgba(156, 39, 176, 0.12)",
    shadow: "rgba(123, 31, 162, 0.3)",
    icon: "#FFFFFF",
    highlight: "rgba(255, 255, 255, 0.3)",
  },
  orange: {
    bg: "linear-gradient(135deg, #FF7043 0%, #F4511E 50%, #D84315 100%)",
    bgLight: "rgba(244, 81, 30, 0.12)",
    shadow: "rgba(216, 67, 21, 0.3)",
    icon: "#FFFFFF",
    highlight: "rgba(255, 255, 255, 0.3)",
  },
  pink: {
    bg: "linear-gradient(135deg, #F48FB1 0%, #EC407A 50%, #D81B60 100%)",
    bgLight: "rgba(236, 64, 122, 0.12)",
    shadow: "rgba(216, 27, 96, 0.3)",
    icon: "#FFFFFF",
    highlight: "rgba(255, 255, 255, 0.3)",
  },
  teal: {
    bg: "linear-gradient(135deg, #26C6DA 0%, #00ACC1 50%, #00838F 100%)",
    bgLight: "rgba(0, 172, 193, 0.12)",
    shadow: "rgba(0, 131, 143, 0.3)",
    icon: "#FFFFFF",
    highlight: "rgba(255, 255, 255, 0.3)",
  },
  indigo: {
    bg: "linear-gradient(135deg, #7986CB 0%, #5C6BC0 50%, #3F51B5 100%)",
    bgLight: "rgba(92, 107, 192, 0.12)",
    shadow: "rgba(63, 81, 181, 0.3)",
    icon: "#FFFFFF",
    highlight: "rgba(255, 255, 255, 0.3)",
  },
  amber: {
    bg: "linear-gradient(135deg, #FFD54F 0%, #FFC107 50%, #FFA000 100%)",
    bgLight: "rgba(255, 193, 7, 0.12)",
    shadow: "rgba(255, 160, 0, 0.3)",
    icon: "#5D4037",
    highlight: "rgba(255, 255, 255, 0.4)",
  },
  emerald: {
    bg: "linear-gradient(135deg, #69F0AE 0%, #00E676 50%, #00C853 100%)",
    bgLight: "rgba(0, 230, 118, 0.12)",
    shadow: "rgba(0, 200, 83, 0.3)",
    icon: "#1B5E20",
    highlight: "rgba(255, 255, 255, 0.35)",
  },
  rose: {
    bg: "linear-gradient(135deg, #FF8A80 0%, #FF5252 50%, #FF1744 100%)",
    bgLight: "rgba(255, 82, 82, 0.12)",
    shadow: "rgba(255, 23, 68, 0.3)",
    icon: "#FFFFFF",
    highlight: "rgba(255, 255, 255, 0.3)",
  },
  cyan: {
    bg: "linear-gradient(135deg, #4DD0E1 0%, #00BCD4 50%, #0097A7 100%)",
    bgLight: "rgba(0, 188, 212, 0.12)",
    shadow: "rgba(0, 151, 167, 0.3)",
    icon: "#FFFFFF",
    highlight: "rgba(255, 255, 255, 0.3)",
  },
  lime: {
    bg: "linear-gradient(135deg, #C0CA33 0%, #9E9D24 50%, #827717 100%)",
    bgLight: "rgba(158, 157, 36, 0.12)",
    shadow: "rgba(130, 119, 23, 0.3)",
    icon: "#FFFFFF",
    highlight: "rgba(255, 255, 255, 0.3)",
  },
  slate: {
    bg: "linear-gradient(135deg, #90A4AE 0%, #78909C 50%, #546E7A 100%)",
    bgLight: "rgba(120, 144, 156, 0.12)",
    shadow: "rgba(84, 110, 122, 0.3)",
    icon: "#FFFFFF",
    highlight: "rgba(255, 255, 255, 0.3)",
  },
};

export const Icon3D = memo(function Icon3D({
  icon: IconComponent,
  theme = "yellow",
  size = "md",
  className = "",
  iconClassName = "",
}: Icon3DProps) {
  const s = SIZES[size];
  const t = THEMES[theme];

  return (
    <span
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: s.container,
        height: s.container,
        borderRadius: s.radius,
        background: t.bg,
        boxShadow: `${s.shadow} ${t.shadow}, inset 0 1px 1px ${t.highlight}`,
        transform: "translateZ(0)",
      }}
      data-testid="icon-3d"
    >
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: s.radius,
          background: `linear-gradient(135deg, ${t.highlight} 0%, transparent 50%)`,
        }}
      />
      <IconComponent
        className={iconClassName}
        style={{
          width: s.icon,
          height: s.icon,
          color: t.icon,
          filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))",
          position: "relative",
          zIndex: 1,
        }}
        strokeWidth={2}
      />
    </span>
  );
});

export function Icon3DLight({
  icon: IconComponent,
  theme = "yellow",
  size = "md",
  className = "",
}: Icon3DProps) {
  const s = SIZES[size];
  const t = THEMES[theme];
  const iconColors: Record<ColorTheme, string> = {
    yellow: "#F59E0B",
    green: "#16A34A",
    blue: "#2563EB",
    red: "#DC2626",
    purple: "#9333EA",
    orange: "#EA580C",
    pink: "#DB2777",
    teal: "#0D9488",
    indigo: "#4F46E5",
    amber: "#D97706",
    emerald: "#059669",
    rose: "#E11D48",
    cyan: "#0891B2",
    lime: "#65A30D",
    slate: "#475569",
  };

  return (
    <span
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: s.container,
        height: s.container,
        borderRadius: s.radius,
        background: t.bgLight,
      }}
    >
      <IconComponent
        style={{
          width: s.icon,
          height: s.icon,
          color: iconColors[theme],
        }}
        strokeWidth={2}
      />
    </span>
  );
}

export default Icon3D;
