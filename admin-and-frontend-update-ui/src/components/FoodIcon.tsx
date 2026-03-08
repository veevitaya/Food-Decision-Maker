import { memo, useId } from "react";

type IconName =
  | "fire" | "chili" | "cocktail" | "money" | "salad" | "umbrella"
  | "hearts" | "scooter" | "moon" | "cake" | "pancakes" | "noodles"
  | "city" | "family" | "coffee" | "sushi" | "burger" | "pizza"
  | "dumpling" | "egg" | "boba" | "croissant" | "plate" | "grid"
  | "sparkle" | "flag-th";

interface FoodIconProps {
  name: IconName;
  size?: number;
  className?: string;
}

const icons: Record<IconName, (s: number, u: string) => JSX.Element> = {
  fire: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id={`${u}-bg`} cx="0.5" cy="0.9" r="0.6">
          <stop offset="0" stopColor="#FF6B35" />
          <stop offset="0.6" stopColor="#FF4500" />
          <stop offset="1" stopColor="#CC2200" />
        </radialGradient>
        <radialGradient id={`${u}-core`} cx="0.5" cy="0.7" r="0.4">
          <stop offset="0" stopColor="#FFE066" />
          <stop offset="0.7" stopColor="#FFAA00" />
          <stop offset="1" stopColor="#FF6600" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="56" rx="14" ry="3" fill="#2A1A0A" opacity="0.15" />
      <path d="M32 8c-2 4-14 16-14 30c0 9 6.3 16 14 16s14-7 14-16C46 24 34 12 32 8z" fill={`url(#${u}-bg)`} />
      <path d="M32 22c-1 3-8 10-8 20c0 5 3.6 9 8 9s8-4 8-9C40 32 33 25 32 22z" fill={`url(#${u}-core)`} />
      <ellipse cx="32" cy="46" rx="4" ry="5" fill="#FFF3B0" opacity="0.6" />
      <ellipse cx="26" cy="30" rx="3" ry="5" fill="white" opacity="0.12" />
      <path d="M24 18c1-2 3-3 4-2" stroke="white" strokeWidth="1" opacity="0.2" fill="none" />
    </svg>
  ),
  chili: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`${u}-bd`} x1="8" y1="56" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C4956A" />
          <stop offset="0.5" stopColor="#D4A574" />
          <stop offset="1" stopColor="#B8895E" />
        </linearGradient>
        <radialGradient id={`${u}-pep`} cx="0.4" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#FF3D00" />
          <stop offset="0.5" stopColor="#E53935" />
          <stop offset="1" stopColor="#B71C1C" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="22" ry="3" fill="#1A1A0A" opacity="0.12" />
      <rect x="8" y="44" width="48" height="10" rx="2" fill={`url(#${u}-bd)`} />
      <rect x="8" y="44" width="48" height="3" rx="1" fill="#E0C09A" opacity="0.4" />
      <rect x="10" y="54" width="44" height="2" rx="1" fill="#A07850" opacity="0.3" />
      <path d="M18 44c4-20 8-30 14-32c2-0.5 4 1 3 4c-2 6-4 14-5 28" fill={`url(#${u}-pep)`} />
      <path d="M22 44c3-16 5-24 10-26" stroke="#FF6E40" strokeWidth="1.5" fill="none" opacity="0.4" />
      <ellipse cx="24" cy="28" rx="2" ry="4" fill="white" opacity="0.15" />
      <path d="M32 12c-1-2 0-4 2-5c1-0.5 3 0 4 2" fill="#4CAF50" />
      <path d="M34 9c1-3 3-5 5-5" stroke="#66BB6A" strokeWidth="1.5" fill="none" />
      <path d="M36 7l3-3" stroke="#81C784" strokeWidth="1.2" fill="none" />
      <rect x="42" y="46" width="8" height="6" rx="1" fill="#DBA86A" opacity="0.3" />
    </svg>
  ),
  cocktail: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`${u}-gl`} x1="20" y1="12" x2="44" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8EAF6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#C5CAE9" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={`${u}-lq`} x1="24" y1="20" x2="40" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F48FB1" />
          <stop offset="1" stopColor="#E91E63" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="12" ry="2.5" fill="#1A1A0A" opacity="0.12" />
      <ellipse cx="32" cy="56" rx="8" ry="2" fill="#BDBDBD" />
      <rect x="30" y="38" width="4" height="18" fill="#E0E0E0" />
      <rect x="30" y="38" width="2" height="18" fill="#EEEEEE" opacity="0.5" />
      <path d="M16 12h32L34 36h-4L16 12z" fill={`url(#${u}-gl)`} />
      <path d="M20 18h24l-8 16h-8L20 18z" fill={`url(#${u}-lq)`} />
      <path d="M20 18h24" stroke="#F8BBD0" strokeWidth="1" opacity="0.6" />
      <ellipse cx="28" cy="22" rx="2" ry="1.5" fill="white" opacity="0.2" />
      <circle cx="40" cy="10" r="4" fill="#FF7043" />
      <circle cx="40" cy="10" r="2.5" fill="#FF8A65" opacity="0.6" />
      <path d="M40 6v-3" stroke="#2E7D32" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="41" cy="3" rx="3" ry="2" fill="#4CAF50" />
      <ellipse cx="41" cy="3" rx="2" ry="1.2" fill="#66BB6A" opacity="0.5" />
    </svg>
  ),
  money: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`${u}-c1`} x1="16" y1="48" x2="48" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C9A030" />
          <stop offset="0.5" stopColor="#F0D060" />
          <stop offset="1" stopColor="#E8C840" />
        </linearGradient>
        <linearGradient id={`${u}-c2`} x1="20" y1="44" x2="44" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D4AA30" />
          <stop offset="0.5" stopColor="#F5DD70" />
          <stop offset="1" stopColor="#ECD050" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="56" rx="16" ry="3" fill="#1A1A0A" opacity="0.12" />
      <ellipse cx="30" cy="42" rx="14" ry="10" fill={`url(#${u}-c1)`} />
      <ellipse cx="30" cy="39" rx="14" ry="10" fill="#D4A830" />
      <ellipse cx="30" cy="39" rx="12" ry="8" fill="none" stroke="#B8901A" strokeWidth="1.5" opacity="0.4" />
      <text x="30" y="44" textAnchor="middle" fill="#8B6914" fontSize="14" fontWeight="bold" fontFamily="sans-serif">$</text>
      <ellipse cx="36" cy="36" rx="14" ry="10" fill={`url(#${u}-c2)`} />
      <ellipse cx="36" cy="33" rx="14" ry="10" fill="#DDB840" />
      <ellipse cx="36" cy="33" rx="12" ry="8" fill="none" stroke="#C49A20" strokeWidth="1.5" opacity="0.4" />
      <text x="36" y="38" textAnchor="middle" fill="#8B6914" fontSize="14" fontWeight="bold" fontFamily="sans-serif">$</text>
      <ellipse cx="28" cy="28" rx="3" ry="4" fill="white" opacity="0.15" />
    </svg>
  ),
  salad: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id={`${u}-bw`} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#F5F0EA" />
          <stop offset="1" stopColor="#D7CFC5" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="20" ry="3" fill="#1A1A0A" opacity="0.12" />
      <ellipse cx="32" cy="44" rx="20" ry="12" fill={`url(#${u}-bw)`} />
      <ellipse cx="32" cy="42" rx="20" ry="12" fill="#EDE7E0" />
      <ellipse cx="32" cy="38" rx="16" ry="8" fill="#E8E0D8" />
      <ellipse cx="28" cy="34" rx="7" ry="5" fill="#4CAF50" />
      <ellipse cx="28" cy="33" rx="6" ry="4" fill="#66BB6A" opacity="0.7" />
      <ellipse cx="36" cy="32" rx="6" ry="5" fill="#388E3C" />
      <ellipse cx="36" cy="31" rx="5" ry="4" fill="#43A047" opacity="0.6" />
      <ellipse cx="32" cy="30" rx="5" ry="3.5" fill="#8BC34A" />
      <circle cx="26" cy="28" r="3" fill="#F44336" />
      <circle cx="26" cy="27" r="2" fill="#EF5350" opacity="0.6" />
      <circle cx="34" cy="30" r="2.5" fill="#FF9800" />
      <circle cx="38" cy="28" r="2" fill="#FFC107" />
      <ellipse cx="22" cy="36" rx="4" ry="2.5" fill="#2E7D32" />
      <ellipse cx="30" cy="28" rx="1.5" ry="2" fill="white" opacity="0.15" />
    </svg>
  ),
  umbrella: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id={`${u}-top`} cx="0.5" cy="0.6" r="0.6">
          <stop offset="0" stopColor="#FF8A65" />
          <stop offset="1" stopColor="#E64A19" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="14" ry="3" fill="#1A1A0A" opacity="0.12" />
      <path d="M10 30c0-13 9.8-22 22-22s22 9 22 22H10z" fill={`url(#${u}-top)`} />
      <path d="M10 30c0-13 9.8-22 22-22" stroke="#FFAB91" strokeWidth="1.5" fill="none" opacity="0.3" />
      <path d="M20 30c0-8 5.4-16 12-16" stroke="#FFE0B2" strokeWidth="2" fill="none" opacity="0.3" />
      <path d="M32 30c0-8 5.4-16 12-16" stroke="#FFE0B2" strokeWidth="2" fill="none" opacity="0.3" />
      <rect x="31" y="30" width="2.5" height="22" rx="1.2" fill="#6D4C41" />
      <rect x="31" y="30" width="1.2" height="22" rx="0.6" fill="#8D6E63" opacity="0.5" />
      <path d="M29 52c0-1.7 1.3-3 3-3s3 1.3 3 3" fill="none" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="16" cy="18" rx="2" ry="3" fill="white" opacity="0.15" />
    </svg>
  ),
  hearts: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id={`${u}-hg`} cx="0.4" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#F48FB1" />
          <stop offset="0.5" stopColor="#E91E63" />
          <stop offset="1" stopColor="#C2185B" />
        </radialGradient>
        <radialGradient id={`${u}-hs`} cx="0.4" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#F8BBD0" />
          <stop offset="0.5" stopColor="#F06292" />
          <stop offset="1" stopColor="#E91E63" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="16" ry="3" fill="#1A1A0A" opacity="0.1" />
      <path d="M32 54l-2.5-2.5C14 38 6 30 6 22c0-7.2 5.8-13 13-13 4 0 8 2 10.5 5h5C36.8 11 40.8 9 45 9c7.2 0 13 5.8 13 13 0 8-8 16-23.5 29.5L32 54z" fill={`url(#${u}-hg)`} />
      <ellipse cx="20" cy="20" rx="4" ry="6" fill="white" opacity="0.15" />
      <path d="M44 50l-1-1C34 42 30 38 30 34c0-3.3 2.7-6 6-6 2 0 3.8 1 5 2.5C42.2 29 44 28 46 28c3.3 0 6 2.7 6 6 0 4-4 8-8 16z" fill={`url(#${u}-hs)`} />
      <ellipse cx="39" cy="32" rx="2" ry="3" fill="white" opacity="0.15" />
    </svg>
  ),
  scooter: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`${u}-sb`} x1="16" y1="24" x2="48" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF7043" />
          <stop offset="1" stopColor="#E64A19" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="24" ry="3" fill="#1A1A0A" opacity="0.12" />
      <circle cx="16" cy="50" r="7" fill="#424242" />
      <circle cx="16" cy="50" r="5" fill="#616161" />
      <circle cx="16" cy="50" r="2.5" fill="#9E9E9E" />
      <circle cx="50" cy="50" r="7" fill="#424242" />
      <circle cx="50" cy="50" r="5" fill="#616161" />
      <circle cx="50" cy="50" r="2.5" fill="#9E9E9E" />
      <path d="M16 43h14l8-16h10l3 8" stroke={`url(#${u}-sb)`} strokeWidth="4" strokeLinecap="round" fill="none" />
      <rect x="36" y="24" width="14" height="10" rx="4" fill={`url(#${u}-sb)`} />
      <rect x="36" y="24" width="14" height="4" rx="2" fill="#FF8A65" opacity="0.5" />
      <rect x="24" y="36" width="10" height="8" rx="3" fill="#D84315" />
      <rect x="24" y="36" width="10" height="3" rx="1.5" fill="#FF5722" opacity="0.4" />
      <rect x="38" y="18" width="5" height="10" rx="2.5" fill="#FFAB91" />
      <ellipse cx="40" cy="20" rx="1.5" ry="2" fill="white" opacity="0.15" />
    </svg>
  ),
  moon: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id={`${u}-mg`} cx="0.3" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFE082" />
          <stop offset="0.5" stopColor="#FFC107" />
          <stop offset="1" stopColor="#FF8F00" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="14" ry="3" fill="#1A1A0A" opacity="0.1" />
      <path d="M42 10c-16 2-24 14-22 28s14 20 26 18c-4 2-10 0-16-4c-8-6-12-18-8-28c2-6 8-12 16-14z" fill={`url(#${u}-mg)`} />
      <ellipse cx="30" cy="28" rx="3" ry="4" fill="white" opacity="0.12" />
      <circle cx="36" cy="22" r="2.5" fill="#FFE082" opacity="0.4" />
      <circle cx="28" cy="38" r="2" fill="#FFE082" opacity="0.3" />
      <circle cx="38" cy="36" r="1.5" fill="#FFD54F" opacity="0.4" />
      <circle cx="14" cy="20" r="1.5" fill="#FFF9C4" opacity="0.5" />
      <circle cx="12" cy="38" r="1" fill="#FFF9C4" opacity="0.4" />
      <circle cx="50" cy="16" r="1" fill="#FFF9C4" opacity="0.3" />
    </svg>
  ),
  cake: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`${u}-cb`} x1="12" y1="56" x2="52" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E91E63" />
          <stop offset="1" stopColor="#F06292" />
        </linearGradient>
        <linearGradient id={`${u}-cm`} x1="14" y1="38" x2="50" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFCC02" />
          <stop offset="1" stopColor="#FFE066" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="18" ry="3" fill="#1A1A0A" opacity="0.12" />
      <rect x="10" y="36" width="44" height="18" rx="4" fill={`url(#${u}-cb)`} />
      <rect x="10" y="36" width="44" height="6" rx="3" fill="#F48FB1" opacity="0.4" />
      <path d="M12 36c5-3 10 2 16-1s10 3 14-1c2-1 4 0 4 0" stroke="white" strokeWidth="2.5" fill="none" opacity="0.4" />
      <rect x="14" y="24" width="36" height="14" rx="3" fill={`url(#${u}-cm)`} />
      <rect x="14" y="24" width="36" height="5" rx="2" fill="#FFE082" opacity="0.4" />
      <rect x="28" y="12" width="5" height="14" rx="2.5" fill="#FFF9C4" />
      <ellipse cx="30.5" cy="10" rx="4" ry="4" fill="#FF7043" />
      <ellipse cx="30.5" cy="9" rx="2.5" ry="2.5" fill="#FFAB91" opacity="0.5" />
      <ellipse cx="30" cy="7" rx="1" ry="2" fill="#FFCC02" opacity="0.8" />
      <ellipse cx="18" cy="30" rx="2" ry="3" fill="white" opacity="0.12" />
    </svg>
  ),
  pancakes: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`${u}-pp`} x1="16" y1="44" x2="48" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A1887F" />
          <stop offset="1" stopColor="#D7CCC8" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="20" ry="3" fill="#1A1A0A" opacity="0.12" />
      <ellipse cx="32" cy="50" rx="20" ry="7" fill="#EFEBE9" />
      <ellipse cx="32" cy="48" rx="20" ry="7" fill="#F5F0ED" />
      <ellipse cx="32" cy="46" rx="16" ry="5.5" fill={`url(#${u}-pp)`} />
      <ellipse cx="32" cy="44" rx="16" ry="5.5" fill="#BCAAA4" />
      <ellipse cx="32" cy="44" rx="14" ry="4.5" fill="#D7CCC8" />
      <ellipse cx="32" cy="40" rx="14" ry="5" fill="#A1887F" />
      <ellipse cx="32" cy="38" rx="14" ry="5" fill="#BCAAA4" />
      <ellipse cx="32" cy="38" rx="12" ry="4" fill="#D7CCC8" />
      <ellipse cx="32" cy="34" rx="12" ry="4.5" fill="#A1887F" />
      <ellipse cx="32" cy="32" rx="12" ry="4.5" fill="#BCAAA4" />
      <ellipse cx="32" cy="32" rx="10" ry="3.5" fill="#D7CCC8" />
      <ellipse cx="32" cy="30" rx="7" ry="2.5" fill="#FFB74D" opacity="0.6" />
      <ellipse cx="28" cy="28" rx="4" ry="5" fill="#FFB74D" opacity="0.4" />
      <rect x="36" y="22" width="4" height="12" rx="2" fill="#FFCC02" opacity="0.7" />
      <rect x="36" y="22" width="2" height="12" rx="1" fill="#FFE082" opacity="0.4" />
      <ellipse cx="22" cy="36" rx="2" ry="3" fill="white" opacity="0.12" />
    </svg>
  ),
  noodles: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id={`${u}-nb`} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E0E0E0" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="20" ry="3" fill="#1A1A0A" opacity="0.12" />
      <ellipse cx="32" cy="44" rx="22" ry="12" fill={`url(#${u}-nb)`} />
      <ellipse cx="32" cy="42" rx="22" ry="12" fill="#F5F5F5" />
      <ellipse cx="32" cy="38" rx="16" ry="7" fill="#FFF8E1" />
      <path d="M18 34c3 5 5-2 8 3s5-3 8 2 5-2 7 2" stroke="#FFB300" strokeWidth="2.5" fill="none" />
      <path d="M20 38c2 4 4-2 6 2s4-2 6 1.5 3-1 5 1" stroke="#FF8F00" strokeWidth="2" fill="none" opacity="0.6" />
      <circle cx="24" cy="32" r="3" fill="#F44336" />
      <circle cx="24" cy="31" r="2" fill="#EF5350" opacity="0.5" />
      <circle cx="36" cy="30" r="2.5" fill="#4CAF50" />
      <circle cx="30" cy="28" r="2" fill="#81C784" />
      <path d="M40 26l3-14" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M44 26l3-14" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="22" cy="34" rx="2" ry="3" fill="white" opacity="0.12" />
    </svg>
  ),
  city: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`${u}-b1`} x1="8" y1="52" x2="8" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#78909C" />
          <stop offset="1" stopColor="#90A4AE" />
        </linearGradient>
        <linearGradient id={`${u}-b2`} x1="24" y1="52" x2="24" y2="10" gradientUnits="userSpaceOnUse">
          <stop stopColor="#546E7A" />
          <stop offset="1" stopColor="#78909C" />
        </linearGradient>
        <linearGradient id={`${u}-b3`} x1="44" y1="52" x2="44" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#90A4AE" />
          <stop offset="1" stopColor="#B0BEC5" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="56" rx="24" ry="3" fill="#1A1A0A" opacity="0.12" />
      <rect x="4" y="26" width="14" height="28" rx="1" fill={`url(#${u}-b1)`} />
      <rect x="4" y="26" width="4" height="28" fill="#90A4AE" opacity="0.3" />
      <rect x="20" y="10" width="16" height="44" rx="1" fill={`url(#${u}-b2)`} />
      <rect x="20" y="10" width="5" height="44" fill="#607D8B" opacity="0.2" />
      <rect x="40" y="20" width="14" height="34" rx="1" fill={`url(#${u}-b3)`} />
      <rect x="40" y="20" width="4" height="34" fill="#B0BEC5" opacity="0.3" />
      <rect x="7" y="30" width="3" height="3" rx="0.5" fill="#FFF9C4" opacity="0.9" />
      <rect x="12" y="30" width="3" height="3" rx="0.5" fill="#FFF9C4" opacity="0.6" />
      <rect x="7" y="36" width="3" height="3" rx="0.5" fill="#FFF9C4" opacity="0.5" />
      <rect x="23" y="14" width="3" height="3" rx="0.5" fill="#FFF9C4" opacity="0.9" />
      <rect x="29" y="14" width="3" height="3" rx="0.5" fill="#FFF9C4" opacity="0.6" />
      <rect x="23" y="20" width="3" height="3" rx="0.5" fill="#FFF9C4" opacity="0.7" />
      <rect x="29" y="20" width="3" height="3" rx="0.5" fill="#FFF9C4" opacity="0.5" />
      <rect x="23" y="26" width="3" height="3" rx="0.5" fill="#FFF9C4" opacity="0.8" />
      <rect x="43" y="24" width="3" height="3" rx="0.5" fill="#FFF9C4" opacity="0.9" />
      <rect x="49" y="24" width="3" height="3" rx="0.5" fill="#FFF9C4" opacity="0.5" />
      <rect x="43" y="30" width="3" height="3" rx="0.5" fill="#FFF9C4" opacity="0.6" />
    </svg>
  ),
  family: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id={`${u}-sk`} cx="0.4" cy="0.3" r="0.6">
          <stop offset="0" stopColor="#FFD9B3" />
          <stop offset="1" stopColor="#FFBB80" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="22" ry="3" fill="#1A1A0A" opacity="0.1" />
      <circle cx="18" cy="18" r="7" fill={`url(#${u}-sk)`} />
      <ellipse cx="16" cy="16" rx="2" ry="3" fill="white" opacity="0.12" />
      <ellipse cx="18" cy="40" rx="9" ry="14" fill="#42A5F5" />
      <ellipse cx="18" cy="38" rx="8" ry="12" fill="#64B5F6" opacity="0.4" />
      <circle cx="46" cy="18" r="7" fill={`url(#${u}-sk)`} />
      <ellipse cx="44" cy="16" rx="2" ry="3" fill="white" opacity="0.12" />
      <ellipse cx="46" cy="40" rx="9" ry="14" fill="#EF5350" />
      <ellipse cx="46" cy="38" rx="8" ry="12" fill="#E57373" opacity="0.4" />
      <circle cx="32" cy="24" r="5" fill={`url(#${u}-sk)`} />
      <ellipse cx="31" cy="22" rx="1.5" ry="2" fill="white" opacity="0.12" />
      <ellipse cx="32" cy="44" rx="7" ry="10" fill="#66BB6A" />
      <ellipse cx="32" cy="42" rx="6" ry="8" fill="#81C784" opacity="0.4" />
    </svg>
  ),
  coffee: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`${u}-cfb`} x1="12" y1="56" x2="40" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4E342E" />
          <stop offset="0.5" stopColor="#6D4C41" />
          <stop offset="1" stopColor="#795548" />
        </linearGradient>
        <radialGradient id={`${u}-cft`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#5D4037" />
          <stop offset="1" stopColor="#3E2723" />
        </radialGradient>
      </defs>
      <ellipse cx="28" cy="58" rx="18" ry="3" fill="#1A1A0A" opacity="0.12" />
      <rect x="10" y="22" width="28" height="30" rx="5" fill={`url(#${u}-cfb)`} />
      <rect x="10" y="22" width="8" height="30" rx="3" fill="#8D6E63" opacity="0.2" />
      <ellipse cx="24" cy="22" rx="14" ry="5" fill={`url(#${u}-cft)`} />
      <ellipse cx="24" cy="22" rx="10" ry="3.5" fill="#4E342E" />
      <path d="M38 30h5c3 0 5.5 2.5 5.5 5.5S46 41 43 41h-5" fill="none" stroke="#8D6E63" strokeWidth="4" strokeLinecap="round" />
      <rect x="8" y="18" width="32" height="6" rx="3" fill="#8D6E63" />
      <rect x="8" y="18" width="32" height="3" rx="1.5" fill="#A1887F" opacity="0.4" />
      <path d="M20 12c0-3 1.5-5 1.5-7" stroke="#BDBDBD" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M25 10c0-3 1.5-5 1.5-7" stroke="#BDBDBD" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M30 12c0-3 1.5-5 1.5-7" stroke="#BDBDBD" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <ellipse cx="16" cy="28" rx="2" ry="4" fill="white" opacity="0.1" />
    </svg>
  ),
  sushi: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`${u}-sw`} x1="12" y1="44" x2="52" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1B2631" />
          <stop offset="1" stopColor="#2C3E50" />
        </linearGradient>
        <linearGradient id={`${u}-sbd`} x1="6" y1="54" x2="58" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A67C52" />
          <stop offset="0.5" stopColor="#C4956A" />
          <stop offset="1" stopColor="#B08860" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="24" ry="3" fill="#1A1A0A" opacity="0.12" />
      <rect x="4" y="46" width="56" height="8" rx="3" fill={`url(#${u}-sbd)`} />
      <rect x="4" y="46" width="56" height="3" rx="1.5" fill="#D4A574" opacity="0.3" />
      <ellipse cx="20" cy="42" rx="10" ry="8" fill={`url(#${u}-sw)`} />
      <rect x="10" y="30" width="20" height="12" rx="6" fill={`url(#${u}-sw)`} />
      <ellipse cx="20" cy="30" rx="10" ry="8" fill="#34495E" />
      <ellipse cx="20" cy="30" rx="8" ry="6" fill="white" />
      <ellipse cx="20" cy="29" rx="6.5" ry="4.5" fill="#FF8A65" />
      <ellipse cx="20" cy="28" rx="5" ry="3" fill="#EF5350" />
      <ellipse cx="18" cy="27" rx="1.5" ry="2" fill="white" opacity="0.2" />
      <ellipse cx="44" cy="40" rx="8" ry="6" fill={`url(#${u}-sw)`} />
      <rect x="36" y="32" width="16" height="8" rx="5" fill={`url(#${u}-sw)`} />
      <ellipse cx="44" cy="32" rx="8" ry="6" fill="#34495E" />
      <ellipse cx="44" cy="32" rx="6" ry="4.5" fill="white" />
      <ellipse cx="44" cy="31" rx="5" ry="3.5" fill="#FF8A65" />
      <ellipse cx="44" cy="30" rx="3.5" ry="2.5" fill="#EF5350" />
      <ellipse cx="42" cy="29" rx="1" ry="1.5" fill="white" opacity="0.2" />
    </svg>
  ),
  burger: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id={`${u}-bbn`} cx="0.5" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#E8B960" />
          <stop offset="0.6" stopColor="#D4A040" />
          <stop offset="1" stopColor="#B8863A" />
        </radialGradient>
        <linearGradient id={`${u}-bmt`} x1="10" y1="38" x2="54" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5D4037" />
          <stop offset="0.5" stopColor="#795548" />
          <stop offset="1" stopColor="#6D4C41" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="20" ry="3" fill="#1A1A0A" opacity="0.12" />
      <path d="M10 32c0-10 9.8-18 22-18s22 8 22 18H10z" fill={`url(#${u}-bbn)`} />
      <ellipse cx="20" cy="22" rx="1.5" ry="1" fill="#F5E6C8" opacity="0.6" />
      <ellipse cx="28" cy="19" rx="1" ry="0.8" fill="#F5E6C8" opacity="0.5" />
      <ellipse cx="38" cy="22" rx="1.2" ry="0.8" fill="#F5E6C8" opacity="0.5" />
      <ellipse cx="32" cy="16" rx="0.8" ry="0.6" fill="#F5E6C8" opacity="0.4" />
      <ellipse cx="16" cy="24" rx="3" ry="4" fill="white" opacity="0.1" />
      <path d="M10 32h44c0 0-2 3-6 3c-2 0-2-2-5-2s-3 2-5 2-2-2-5-2-3 2-5 2-2-2-5-2c-4 0-6 3-6 3" fill="#66BB6A" />
      <rect x="10" y="35" width="44" height="5" fill="#FFCC02" />
      <rect x="10" y="35" width="44" height="2" fill="#FFE082" opacity="0.4" />
      <rect x="10" y="40" width="44" height="6" rx="1" fill={`url(#${u}-bmt)`} />
      <rect x="10" y="40" width="44" height="2" fill="#8D6E63" opacity="0.3" />
      <rect x="12" y="43" width="5" height="2" rx="1" fill="#EF5350" opacity="0.7" />
      <rect x="22" y="43" width="5" height="2" rx="1" fill="#EF5350" opacity="0.5" />
      <ellipse cx="32" cy="50" rx="22" ry="5" fill="#C49040" />
      <ellipse cx="32" cy="48" rx="22" ry="5" fill="#D4A040" />
      <rect x="10" y="46" width="44" height="4" fill="#D4A040" />
    </svg>
  ),
  pizza: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`${u}-pc`} x1="32" y1="8" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8B960" />
          <stop offset="1" stopColor="#C49040" />
        </linearGradient>
        <linearGradient id={`${u}-pch`} x1="32" y1="12" x2="32" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE082" />
          <stop offset="1" stopColor="#FFCC02" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="18" ry="3" fill="#1A1A0A" opacity="0.12" />
      <path d="M32 6L8 52c0 2.5 10.7 4.5 24 4.5S56 54.5 56 52L32 6z" fill={`url(#${u}-pc)`} />
      <path d="M32 10L12 48c0 0 8.7 3 20 3s20-3 20-3L32 10z" fill={`url(#${u}-pch)`} />
      <path d="M12 48c0 0 8.7 4 20 4s20-4 20-4" fill="#D4A040" />
      <circle cx="26" cy="28" r="4" fill="#E53935" />
      <circle cx="26" cy="27" r="2.5" fill="#EF5350" opacity="0.5" />
      <circle cx="36" cy="24" r="3.5" fill="#E53935" />
      <circle cx="36" cy="23" r="2" fill="#EF5350" opacity="0.5" />
      <circle cx="28" cy="40" r="3.5" fill="#E53935" />
      <circle cx="28" cy="39" r="2" fill="#EF5350" opacity="0.5" />
      <circle cx="38" cy="36" r="3" fill="#E53935" />
      <ellipse cx="20" cy="36" rx="2.5" ry="2" fill="#388E3C" />
      <ellipse cx="34" cy="32" rx="2" ry="1.5" fill="#388E3C" />
      <ellipse cx="42" cy="42" rx="2" ry="1.5" fill="#2E7D32" />
      <ellipse cx="18" cy="24" rx="2" ry="3" fill="white" opacity="0.1" />
    </svg>
  ),
  dumpling: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id={`${u}-db`} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#D4A574" />
          <stop offset="1" stopColor="#A67C52" />
        </radialGradient>
        <radialGradient id={`${u}-dd`} cx="0.4" cy="0.3" r="0.6">
          <stop offset="0" stopColor="#FFF3E0" />
          <stop offset="0.7" stopColor="#FFE0B2" />
          <stop offset="1" stopColor="#FFCC80" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="20" ry="3" fill="#1A1A0A" opacity="0.12" />
      <ellipse cx="32" cy="48" rx="20" ry="8" fill={`url(#${u}-db)`} />
      <rect x="12" y="32" width="40" height="16" rx="2" fill="#B8895E" />
      <ellipse cx="32" cy="32" rx="20" ry="8" fill={`url(#${u}-db)`} />
      <path d="M14 36h36" stroke="#A07850" strokeWidth="1" opacity="0.3" />
      <path d="M14 40h36" stroke="#A07850" strokeWidth="1" opacity="0.3" />
      <path d="M14 44h36" stroke="#A07850" strokeWidth="1" opacity="0.3" />
      <ellipse cx="24" cy="30" rx="8" ry="6" fill={`url(#${u}-dd)`} />
      <path d="M16 30c2-1.5 4 0.5 6-1s4 1 6-0.5" stroke="#FFB74D" strokeWidth="1.5" fill="none" opacity="0.4" />
      <ellipse cx="22" cy="27" rx="2" ry="3" fill="white" opacity="0.15" />
      <ellipse cx="38" cy="28" rx="7" ry="5.5" fill={`url(#${u}-dd)`} />
      <path d="M31 28c2-1 3 0.5 5-0.5s3 1 5-0.5" stroke="#FFB74D" strokeWidth="1.5" fill="none" opacity="0.4" />
      <ellipse cx="36" cy="25" rx="1.5" ry="2.5" fill="white" opacity="0.15" />
      <path d="M28 16c0-3 1-4 1-6" stroke="#BDBDBD" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      <path d="M34 14c0-3 1-4 1-6" stroke="#BDBDBD" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
    </svg>
  ),
  egg: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id={`${u}-ep`} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#424242" />
          <stop offset="1" stopColor="#212121" />
        </radialGradient>
        <radialGradient id={`${u}-ey`} cx="0.4" cy="0.35" r="0.5">
          <stop offset="0" stopColor="#FFE082" />
          <stop offset="0.6" stopColor="#FFCC02" />
          <stop offset="1" stopColor="#FFB300" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="20" ry="3" fill="#1A1A0A" opacity="0.12" />
      <ellipse cx="32" cy="40" rx="22" ry="14" fill={`url(#${u}-ep)`} />
      <ellipse cx="32" cy="38" rx="22" ry="14" fill="#333333" />
      <ellipse cx="32" cy="38" rx="18" ry="10" fill="#2A2A2A" />
      <rect x="2" y="36" width="8" height="3" rx="1.5" fill="#424242" />
      <ellipse cx="32" cy="36" rx="14" ry="9" fill="white" />
      <ellipse cx="32" cy="35" rx="13" ry="8" fill="#FAFAFA" />
      <circle cx="32" cy="34" r="7" fill={`url(#${u}-ey)`} />
      <circle cx="32" cy="32" r="5" fill="#FFD54F" />
      <ellipse cx="30" cy="30" rx="2" ry="2.5" fill="#FFE082" opacity="0.5" />
      <ellipse cx="24" cy="30" rx="2" ry="3" fill="white" opacity="0.15" />
    </svg>
  ),
  boba: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`${u}-bc`} x1="18" y1="20" x2="46" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F3E5F5" stopOpacity="0.9" />
          <stop offset="1" stopColor="#CE93D8" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id={`${u}-bt`} x1="20" y1="24" x2="44" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E1BEE7" />
          <stop offset="1" stopColor="#BA68C8" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="14" ry="3" fill="#1A1A0A" opacity="0.12" />
      <path d="M18 18h28l-3 34c0 2.5-5 4.5-11 4.5S19 54.5 19 52l-3-34z" fill={`url(#${u}-bc)`} />
      <path d="M20 24h24l-2.5 26c0 2-4 4-9.5 4s-9.5-2-9.5-4L20 24z" fill={`url(#${u}-bt)`} />
      <rect x="16" y="14" width="32" height="7" rx="3.5" fill="#9C27B0" />
      <rect x="16" y="14" width="32" height="3" rx="1.5" fill="#AB47BC" opacity="0.5" />
      <path d="M32 6v10" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="26" cy="46" r="3" fill="#3E2723" />
      <circle cx="34" cy="48" r="2.5" fill="#3E2723" />
      <circle cx="28" cy="50" r="2.5" fill="#4E342E" />
      <circle cx="36" cy="44" r="3" fill="#3E2723" />
      <circle cx="30" cy="42" r="2" fill="#4E342E" />
      <circle cx="38" cy="50" r="2" fill="#3E2723" />
      <ellipse cx="24" cy="28" rx="2" ry="4" fill="white" opacity="0.15" />
    </svg>
  ),
  croissant: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id={`${u}-cg`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#E8C860" />
          <stop offset="0.5" stopColor="#D4A040" />
          <stop offset="1" stopColor="#A67C30" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="56" rx="20" ry="3" fill="#1A1A0A" opacity="0.12" />
      <path d="M10 38c0-10 8-22 22-22s22 12 22 22c0 5-8 10-22 10S10 43 10 38z" fill={`url(#${u}-cg)`} />
      <path d="M14 36c6-8 10-14 18-14s12 6 18 14" fill="#E8B960" opacity="0.5" />
      <path d="M16 40c3-1.5 6 1 9-0.5s6 1.5 9-0.5 6 1.5 8 1" stroke="#B8863A" strokeWidth="2" fill="none" opacity="0.4" />
      <path d="M18 44c3-1 5 0.5 8-0.5s5 1 8-0.5 5 1 6 0.5" stroke="#C49040" strokeWidth="1.5" fill="none" opacity="0.3" />
      <ellipse cx="20" cy="30" rx="3" ry="5" fill="white" opacity="0.12" />
      <ellipse cx="16" cy="36" rx="2" ry="3" fill="#FFE082" opacity="0.2" />
    </svg>
  ),
  plate: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id={`${u}-pg`} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#FAFAFA" />
          <stop offset="0.7" stopColor="#EEEEEE" />
          <stop offset="1" stopColor="#E0E0E0" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="56" rx="22" ry="3" fill="#1A1A0A" opacity="0.12" />
      <ellipse cx="32" cy="42" rx="24" ry="12" fill="#D5D5D5" />
      <ellipse cx="32" cy="40" rx="24" ry="12" fill={`url(#${u}-pg)`} />
      <ellipse cx="32" cy="40" rx="16" ry="8" fill="#F5F5F5" />
      <ellipse cx="32" cy="40" rx="12" ry="5" fill="#FAFAFA" />
      <ellipse cx="26" cy="36" rx="3" ry="4" fill="white" opacity="0.2" />
      <path d="M20 22l-3-14" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 8c0-1 2-2 4-1s2 2 2 3" stroke="#BDBDBD" strokeWidth="2" fill="none" />
      <path d="M44 22v-16" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 6h4" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 10h4" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  grid: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`${u}-g1`} x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#90CAF9" />
          <stop offset="1" stopColor="#64B5F6" />
        </linearGradient>
        <linearGradient id={`${u}-g2`} x1="36" y1="6" x2="56" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A5D6A7" />
          <stop offset="1" stopColor="#81C784" />
        </linearGradient>
        <linearGradient id={`${u}-g3`} x1="6" y1="36" x2="26" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFCC80" />
          <stop offset="1" stopColor="#FFB74D" />
        </linearGradient>
        <linearGradient id={`${u}-g4`} x1="36" y1="36" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EF9A9A" />
          <stop offset="1" stopColor="#E57373" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="22" height="22" rx="5" fill={`url(#${u}-g1)`} />
      <rect x="8" y="8" width="6" height="8" rx="2" fill="white" opacity="0.15" />
      <rect x="36" y="6" width="22" height="22" rx="5" fill={`url(#${u}-g2)`} />
      <rect x="38" y="8" width="6" height="8" rx="2" fill="white" opacity="0.15" />
      <rect x="6" y="36" width="22" height="22" rx="5" fill={`url(#${u}-g3)`} />
      <rect x="8" y="38" width="6" height="8" rx="2" fill="white" opacity="0.15" />
      <rect x="36" y="36" width="22" height="22" rx="5" fill={`url(#${u}-g4)`} />
      <rect x="38" y="38" width="6" height="8" rx="2" fill="white" opacity="0.15" />
    </svg>
  ),
  sparkle: (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id={`${u}-sg`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF9C4" />
          <stop offset="0.5" stopColor="#FFCC02" />
          <stop offset="1" stopColor="#FFB300" />
        </radialGradient>
      </defs>
      <path d="M32 4l4 18h18l-14 10 5 18-13-10-13 10 5-18L10 22h18l4-18z" fill={`url(#${u}-sg)`} />
      <path d="M32 14l2 9h9l-7 5 2.5 9-6.5-5-6.5 5 2.5-9-7-5h9l2-9z" fill="#FFE082" opacity="0.5" />
      <ellipse cx="24" cy="22" rx="2" ry="3" fill="white" opacity="0.2" />
    </svg>
  ),
  "flag-th": (s, u) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`${u}-fp`} x1="10" y1="6" x2="10" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9E9E9E" />
          <stop offset="1" stopColor="#757575" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="16" ry="3" fill="#1A1A0A" opacity="0.12" />
      <rect x="8" y="6" width="3" height="50" rx="1.5" fill={`url(#${u}-fp)`} />
      <rect x="8" y="6" width="1.5" height="50" rx="0.75" fill="#BDBDBD" opacity="0.3" />
      <circle cx="9.5" cy="6" r="2.5" fill="#FFD700" />
      <rect x="11" y="10" width="42" height="32" rx="3" fill="#ED1C24" />
      <rect x="11" y="15.3" width="42" height="5.3" fill="white" />
      <rect x="11" y="20.6" width="42" height="10.8" fill="#241D4F" />
      <rect x="11" y="31.4" width="42" height="5.3" fill="white" />
      <rect x="13" y="12" width="6" height="8" rx="1" fill="white" opacity="0.1" />
    </svg>
  ),
};

const EMOJI_TO_ICON: Record<string, IconName> = {
  "\uD83D\uDD25": "fire",
  "\uD83C\uDF36\uFE0F": "chili",
  "\uD83C\uDF36": "chili",
  "\uD83C\uDF78": "cocktail",
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
};

export function emojiToIconName(emoji: string): IconName | null {
  return EMOJI_TO_ICON[emoji] || null;
}

export const FoodIcon = memo(function FoodIcon({ name, size = 32, className = "" }: FoodIconProps) {
  const uid = useId().replace(/:/g, "");
  const renderIcon = icons[name];
  if (!renderIcon) return null;
  return (
    <span
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
        filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15)) drop-shadow(0px 1px 2px rgba(0,0,0,0.08))",
      }}
    >
      {renderIcon(size, uid)}
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
