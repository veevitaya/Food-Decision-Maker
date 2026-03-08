import { useQuery } from "@tanstack/react-query";

type UIConfig = {
  accentColor: string;
  bottomNavLabels: { explore: string; swipe: string; profile: string };
  heroTitle: string;
  heroSubtitle: string;
  mascotGreeting: string;
};

type BrandingData = {
  uiConfig: UIConfig;
  imageUrls: Record<string, string>;
};

const DEFAULTS: BrandingData = {
  uiConfig: {
    accentColor: "#FFCC02",
    bottomNavLabels: { explore: "Explore", swipe: "Swipe", profile: "Profile" },
    heroTitle: "What are you craving?",
    heroSubtitle: "Discover the best food in Bangkok",
    mascotGreeting: "Let Toast decide!",
  },
  imageUrls: {},
};

export function useBranding() {
  const { data = DEFAULTS } = useQuery<BrandingData>({
    queryKey: ["/api/config/branding"],
    staleTime: 5 * 60 * 1000,
  });

  return {
    accentColor: data.uiConfig?.accentColor || DEFAULTS.uiConfig.accentColor,
    bottomNavLabels: data.uiConfig?.bottomNavLabels || DEFAULTS.uiConfig.bottomNavLabels,
    heroTitle: data.uiConfig?.heroTitle || DEFAULTS.uiConfig.heroTitle,
    heroSubtitle: data.uiConfig?.heroSubtitle || DEFAULTS.uiConfig.heroSubtitle,
    mascotGreeting: data.uiConfig?.mascotGreeting || DEFAULTS.uiConfig.mascotGreeting,
    logoUrl: data.imageUrls?.logo || "",
    mascotUrl: data.imageUrls?.mascot || "",
    imageUrls: data.imageUrls || {},
  };
}
