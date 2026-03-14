import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
  useRoute: () => [false, {}],
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  Route: ({ children }: any) => children,
  Switch: ({ children }: any) => children,
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    img: (props: any) => <img {...props} />,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: (initial: number) => ({ get: () => initial, set: vi.fn() }),
  useTransform: (_mv: any, _from: any, to: any) => ({ get: () => to[0], set: vi.fn() }),
  useAnimate: () => [{ current: null }, vi.fn()],
  useDragControls: () => ({}),
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useSpring: (v: any) => v,
}));

// Mock @use-gesture/react
vi.mock("@use-gesture/react", () => ({
  useDrag: () => () => ({}),
}));

// Mock LIFF
vi.mock("@/lib/liff", () => ({
  sendInvite: vi.fn(),
  sendGroupInvite: vi.fn(),
  sendPartnerInvite: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue("mock-token"),
  isLoggedIn: vi.fn().mockReturnValue(false),
  login: vi.fn(),
  logout: vi.fn(),
  liffUrl: vi.fn().mockReturnValue("https://liff.line.me/mock"),
  isLiffAvailable: vi.fn().mockReturnValue(false),
  initLiff: vi.fn().mockResolvedValue(false),
  getProfile: vi.fn().mockResolvedValue(null),
}));

// Mock analytics
vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

// Mock useLineProfile (different import paths)
const mockLineProfile = {
  profile: { displayName: "Test User", pictureUrl: "", userId: "user-1" },
  isLoading: false,
  isLiff: false,
};
vi.mock("@/lib/useLineProfile", () => ({
  useLineProfile: () => mockLineProfile,
}));
vi.mock("@/hooks/use-line-profile", () => ({
  useLineProfile: () => mockLineProfile,
}));

// Mock API hooks
vi.mock("@/hooks/use-restaurants", () => ({
  useRestaurants: () => ({ data: [], isLoading: false }),
  useSuggestions: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/hooks/use-taste-profile", () => ({
  useTasteProfile: () => ({
    data: null,
    isLoading: false,
    profile: null,
    getSuggestionTitle: () => "Recommendations for you",
    topPreference: { key: "thai", label: "Thai", emoji: "🇹🇭" },
    getMoodSignal: () => null,
    recordSwipe: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-saved-restaurants", () => ({
  useSavedRestaurants: () => ({
    data: { mine: [], partner: [] },
    isLoading: false,
    isSaved: (_id: number) => false,
    getBucket: (_id: number) => null,
    save: vi.fn(),
    unsave: vi.fn(),
    mineCount: 0,
    partnerCount: 0,
  }),
}));
vi.mock("@/hooks/use-vibe-frequency", () => ({
  useVibeFrequency: () => ({ data: {}, isLoading: false }),
}));
vi.mock("@/hooks/use-feature-flags", () => ({
  useFeatureFlags: () => ({
    data: {},
    isLoading: false,
    flags: {},
    isEnabled: (_flag: string) => true,
  }),
}));
vi.mock("@/hooks/use-branding", () => ({
  useBranding: () => ({
    data: null,
    accentColor: "#00B14F",
    bottomNavLabels: { explore: "Explore", swipe: "Swipe", profile: "Profile" },
    appName: "Toast",
    logoUrl: null,
    mascotUrl: null,
    heroTitle: "What are you eating today?",
    heroSubtitle: "Let Toast help you decide",
    mascotGreeting: "Hi!",
  }),
}));
vi.mock("@/hooks/use-vibes-config", () => ({
  useVibesConfig: () => ({
    data: [],
    isVibeEnabled: (_mode: string) => true,
  }),
}));
vi.mock("@/hooks/use-partner-status", () => ({
  usePartnerStatus: () => ({ data: null }),
}));

// Mock session store
vi.mock("@/lib/sessionStore", () => ({
  useSessions: () => [],
  addSession: vi.fn(),
  removeSession: vi.fn(),
  updateSession: vi.fn(),
}));

// Mock queryClient
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn().mockResolvedValue({}),
  queryClient: {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  },
}));

// Mock @tanstack/react-query
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: vi.fn().mockReturnValue({ data: undefined, isLoading: false, error: null }),
    useMutation: vi.fn().mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    }),
    useQueryClient: vi.fn().mockReturnValue({
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
    }),
  };
});

// Mock image assets
vi.mock("@assets/toast_logo_nobg.png", () => ({ default: "toast_logo.png" }));
vi.mock("@assets/toast_mascot_nobg.png", () => ({ default: "toast_mascot.png" }));
vi.mock("@assets/drunk_toast_nobg.png", () => ({ default: "drunk_toast.png" }));
vi.mock("@assets/IMG_9279_1772025468067.jpeg", () => ({ default: "photo1.jpg" }));
vi.mock("@assets/IMG_9280_1772025468067.jpeg", () => ({ default: "photo2.jpg" }));
vi.mock("@assets/IMG_9281_1772025468067.jpeg", () => ({ default: "photo3.jpg" }));

// Mock leaflet / InteractiveMap
vi.mock("@/components/InteractiveMap", () => ({
  InteractiveMap: () => <div data-testid="interactive-map" />,
}));

// Mock LoadingMascot
vi.mock("@/components/LoadingMascot", () => ({
  LoadingMascot: ({ text }: any) => <div data-testid="loading-mascot">{text || "Loading..."}</div>,
}));

// Mock SaveBucketPicker
vi.mock("@/components/SaveBucketPicker", () => ({
  SaveBucketPicker: ({ children }: any) => <div data-testid="save-bucket-picker">{children}</div>,
}));

// Mock navigator.geolocation
Object.defineProperty(global.navigator, "geolocation", {
  value: {
    getCurrentPosition: vi.fn((success) =>
      success({ coords: { latitude: 13.7563, longitude: 100.5018 } })
    ),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },
  writable: true,
});

// Suppress console errors for cleaner test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning:") || args[0].includes("act("))
    ) {
      return;
    }
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});
