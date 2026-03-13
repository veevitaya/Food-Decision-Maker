import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getAdminToken, getAdminSession } from "@/pages/admin/AdminLayout";
import { useLocation } from "wouter";
import {
  Sparkles, X, Check, XCircle, ChevronDown, ChevronUp, Clock, FileText,
  Store, Send, BarChart3, Users, Utensils, Zap, Brain, TrendingUp,
  Target, ExternalLink, Megaphone, Heart, CreditCard, MessageSquare,
  ArrowRight, Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnrichedClaim {
  id: number;
  restaurantId: number;
  ownerId: number;
  status: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantCategory: string;
  restaurantImageUrl: string;
  proofDocuments: string[];
  submittedAt: string;
  reviewNotes: string | null;
}

interface ChatMessage {
  id: string;
  type: "bot" | "action" | "user";
  text: string;
  timestamp: Date;
  cards?: MessageCard[];
}

interface MessageCard {
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
}

interface QuickAction {
  label: string;
  query: string;
  icon: typeof BarChart3;
}

const ADMIN_QUICK_ACTIONS: QuickAction[] = [
  { label: "Pending claims", query: "pending claims", icon: Store },
  { label: "Restaurant stats", query: "restaurant stats", icon: Utensils },
  { label: "User overview", query: "user stats", icon: Users },
  { label: "Platform summary", query: "summary", icon: BarChart3 },
  { label: "Top trending", query: "top restaurants", icon: TrendingUp },
];

const OWNER_QUICK_ACTIONS: QuickAction[] = [
  { label: "My performance", query: "my performance", icon: TrendingUp },
  { label: "Decision stats", query: "decision stats", icon: Brain },
  { label: "Delivery overview", query: "delivery stats", icon: ExternalLink },
  { label: "Menu tips", query: "menu tips", icon: Utensils },
  { label: "Campaign ideas", query: "campaign ideas", icon: Megaphone },
];

function getPageContext(path: string, isOwner: boolean): string {
  if (isOwner) {
    if (path.includes("decision-intelligence")) return "decision_intelligence";
    if (path.includes("performance")) return "performance";
    if (path.includes("insights") && !path.includes("customer")) return "ai_recommendations";
    if (path.includes("menu")) return "menu";
    if (path.includes("promotions")) return "promotions";
    if (path.includes("reviews")) return "reviews";
    if (path.includes("delivery")) return "delivery_conversions";
    if (path.includes("customer")) return "customer_insights";
    if (path.includes("billing")) return "billing";
    if (path.includes("settings")) return "settings";
    if (path.includes("my-restaurant")) return "dashboard";
    return "owner_general";
  }
  if (path.includes("dashboard")) return "admin_dashboard";
  if (path.includes("analytics")) return "admin_analytics";
  if (path.includes("restaurants")) return "admin_restaurants";
  if (path.includes("users")) return "admin_users";
  if (path.includes("owners")) return "admin_owners";
  if (path.includes("campaigns")) return "admin_campaigns";
  if (path.includes("swipe")) return "admin_swipe";
  if (path.includes("food-trends")) return "admin_trends";
  return "admin_general";
}

function getPageSuggestions(context: string, isOwner: boolean): QuickAction[] {
  if (isOwner) {
    const map: Record<string, QuickAction[]> = {
      dashboard: [
        { label: "How am I doing?", query: "my performance", icon: TrendingUp },
        { label: "What should I improve?", query: "improvement tips", icon: Target },
      ],
      decision_intelligence: [
        { label: "Explain win rate", query: "what is decision win rate", icon: Brain },
        { label: "Improve attraction", query: "how to improve attraction rate", icon: Target },
      ],
      performance: [
        { label: "My snapshot", query: "my performance", icon: TrendingUp },
        { label: "Improvement tips", query: "improvement tips", icon: Target },
      ],
      ai_recommendations: [
        { label: "Menu tips", query: "menu tips", icon: Utensils },
        { label: "Campaign ideas", query: "campaign ideas", icon: Megaphone },
      ],
      menu: [
        { label: "Best dishes", query: "best performing dishes", icon: Utensils },
        { label: "Menu gaps", query: "menu opportunity gaps", icon: Target },
      ],
      delivery_conversions: [
        { label: "Platform comparison", query: "compare delivery platforms", icon: ExternalLink },
        { label: "Boost clicks", query: "how to boost delivery clicks", icon: TrendingUp },
      ],
      promotions: [
        { label: "Campaign ideas", query: "campaign ideas", icon: Megaphone },
        { label: "Best timing", query: "best time for promotions", icon: Clock },
      ],
      billing: [
        { label: "Plan comparison", query: "compare plans", icon: CreditCard },
        { label: "ROI estimate", query: "estimate roi upgrade", icon: TrendingUp },
      ],
      customer_insights: [
        { label: "Who visits me?", query: "customer demographics", icon: Heart },
        { label: "Solo vs group", query: "solo vs group insights", icon: Users },
      ],
      reviews: [
        { label: "Review summary", query: "review summary", icon: MessageSquare },
        { label: "Response tips", query: "how to respond to reviews", icon: Target },
      ],
      settings: [
        { label: "My performance", query: "my performance", icon: TrendingUp },
        { label: "Compare plans", query: "compare plans", icon: CreditCard },
      ],
    };
    return map[context] || [];
  }
  const map: Record<string, QuickAction[]> = {
    admin_dashboard: [
      { label: "Key alerts", query: "any alerts today", icon: Zap },
      { label: "Growth summary", query: "growth summary", icon: TrendingUp },
    ],
    admin_owners: [
      { label: "Pending claims", query: "pending claims", icon: Store },
      { label: "Approve all", query: "approve all", icon: Check },
    ],
    admin_restaurants: [
      { label: "Unclaimed list", query: "unclaimed restaurants", icon: Store },
      { label: "Top rated", query: "top restaurants", icon: TrendingUp },
    ],
  };
  return map[context] || [];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function ButtersAssistant() {
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [location] = useLocation();

  const session = getAdminSession();
  const isOwner = session?.sessionType === "owner";
  const pageContext = getPageContext(location, isOwner);
  const pageSuggestions = getPageSuggestions(pageContext, isOwner);

  const ownerName = isOwner
    ? (session?.displayName || session?.email?.split("@")[0] || "there")
    : (session?.username || "Admin");

  const welcomeText = isOwner
    ? `Hey ${ownerName}! I'm Butters, your restaurant growth assistant. I can help with performance insights, menu tips, delivery optimization, and more.`
    : `Hey ${ownerName}! I'm Butters, your admin assistant. Ask me anything about the platform or use the quick actions below.`;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      type: "bot",
      text: welcomeText,
      timestamp: new Date(),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = getAdminToken();

  const { data: pendingClaims = [], isLoading: claimsLoading } = useQuery<EnrichedClaim[]>({
    queryKey: ["/api/admin/claims", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/admin/claims?status=pending", {
        headers: { Authorization: `Basic ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token && !isOwner,
    refetchInterval: 30000,
  });

  const { data: restaurants = [] } = useQuery<any[]>({
    queryKey: ["/api/restaurants"],
    enabled: !!token || isOwner,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, restaurantName }: { id: number; restaurantName: string }) => {
      const res = await fetch(`/api/admin/claims/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${token}`,
        },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      return { restaurantName };
    },
    onSuccess: (data) => {
      addMessage("bot", `Approved ${data.restaurantName}'s claim.`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/claims"] });
    },
    onError: () => {
      addMessage("bot", "Something went wrong. Please try again.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, restaurantName }: { id: number; restaurantName: string }) => {
      const res = await fetch(`/api/admin/claims/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${token}`,
        },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      return { restaurantName };
    },
    onSuccess: (data) => {
      addMessage("bot", `Rejected ${data.restaurantName}'s claim. The owner will be notified.`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/claims"] });
    },
    onError: () => {
      addMessage("bot", "Something went wrong. Please try again.");
    },
  });

  function addMessage(type: "bot" | "action" | "user", text: string, cards?: MessageCard[]) {
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, text, timestamp: new Date(), cards },
    ]);
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  function simulateTyping(callback: () => void) {
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      callback();
    }, 400 + Math.random() * 400);
  }

  function handleApprove(claim: EnrichedClaim) {
    addMessage("action", `Approving ${claim.restaurantName}...`);
    approveMutation.mutate({ id: claim.id, restaurantName: claim.restaurantName });
  }

  function handleReject(claim: EnrichedClaim) {
    addMessage("action", `Rejecting ${claim.restaurantName}...`);
    rejectMutation.mutate({ id: claim.id, restaurantName: claim.restaurantName });
  }

  function handleApproveAll() {
    if (pendingClaims.length === 0) {
      addMessage("bot", "No pending claims to approve right now.");
      return;
    }
    addMessage("action", `Approving all ${pendingClaims.length} pending claims...`);
    pendingClaims.forEach((claim) => {
      approveMutation.mutate({ id: claim.id, restaurantName: claim.restaurantName });
    });
  }

  function processOwnerQuery(q: string) {
    if (q.includes("decision") && (q.includes("win") || q.includes("rate") || q.includes("what is"))) {
      simulateTyping(() => {
        addMessage("bot", "Decision Win Rate measures how often users choose your restaurant after seeing it in their swipe feed.\n\nYour current rate is 34.2%, which is above average for your category (Thai Street Food avg: 28%).\n\nTip: Restaurants with updated photos and complete menu listings see a 15-20% higher win rate.");
      });
    } else if (q.includes("decision") && q.includes("stat")) {
      simulateTyping(() => {
        addMessage("bot", "Here's your decision intelligence snapshot:", [
          { label: "Decision Win Rate", value: "34.2%", trend: "up", color: "#00B14F" },
          { label: "Swipe Attraction", value: "67.8%", trend: "up", color: "#3B82F6" },
          { label: "Drop-Off Rate", value: "12.4%", trend: "down", color: "#EF4444" },
          { label: "Decision Speed", value: "2.4s", trend: "neutral", color: "#8B5CF6" },
        ]);
      });
    } else if (q.includes("attraction") || q.includes("improve attraction")) {
      simulateTyping(() => {
        addMessage("bot", "Your Swipe Attraction Rate is 67.8% - that's the percentage of users who swipe right when they see your card.\n\nTo improve it:\n1. Update your cover photo (high-quality food shots perform 40% better)\n2. Add 3+ menu items with photos\n3. Keep your description under 100 characters\n4. Highlight your unique selling point (e.g., Michelin star)");
      });
    } else if (q.includes("performance") || q.includes("how am i doing") || q.includes("my stats") || q.includes("my performance")) {
      simulateTyping(() => {
        addMessage("bot", "Here's your restaurant performance snapshot:", [
          { label: "Decision Win Rate", value: "34.2%", trend: "up", color: "#00B14F" },
          { label: "Swipe Attraction", value: "67.8%", trend: "up", color: "#3B82F6" },
          { label: "Delivery Clicks (7d)", value: "142", trend: "up", color: "#F59E0B" },
          { label: "Avg Decision Speed", value: "2.4s", trend: "neutral", color: "#8B5CF6" },
        ]);
      });
    } else if (q.includes("delivery") || q.includes("platform") || q.includes("compare")) {
      simulateTyping(() => {
        addMessage("bot", "Here's your delivery platform breakdown:", [
          { label: "Grab Food", value: "52 clicks", trend: "up", color: "#00B14F" },
          { label: "LINE MAN", value: "61 clicks", trend: "up", color: "#06C755" },
          { label: "Robinhood", value: "29 clicks", trend: "down", color: "#6C2BD9" },
        ]);
        setTimeout(() => addMessage("bot", "LINE MAN is your strongest channel. Consider running a LINE-exclusive promo to double down on this audience."), 600);
      });
    } else if (q.includes("menu") && (q.includes("tip") || q.includes("best") || q.includes("performing"))) {
      simulateTyping(() => {
        addMessage("bot", "Your top performing dishes by swipe-to-order conversion:\n\n1. Crab Omelette - 42% conversion\n2. Drunken Noodles - 38% conversion\n3. Tom Yum Goong - 31% conversion\n\nOpportunity: Add a \"Chef's Special\" or seasonal item. Restaurants with rotating specials see 25% more repeat visits.");
      });
    } else if (q.includes("menu") && (q.includes("gap") || q.includes("opportunity"))) {
      simulateTyping(() => {
        addMessage("bot", "Based on trending searches in your area, here are menu gaps you could fill:\n\n- Vegan/Plant-based options (searches up 45%)\n- Lunch sets under 200 THB (high demand, low supply)\n- Dessert items (users often search dessert after viewing your page)\n\nAdding any of these could increase your Menu Opportunity Score from 72 to 85+.");
      });
    } else if (q.includes("campaign") || q.includes("promo")) {
      simulateTyping(() => {
        addMessage("bot", "Here are campaign ideas based on your data:\n\n1. \"Lunch Rush\" (11am-1pm) - Your busiest delivery window. Offer 10% off to boost volume.\n\n2. \"Weekend Date Night\" - You index high for date_night vibes. Bundle 2 mains + dessert.\n\n3. \"New Customer Welcome\" - 38% of your delivery clicks come from first-time viewers. A first-order discount could convert them.\n\nWant me to help set one up?");
      });
    } else if (q.includes("improvement") || q.includes("improve") || q.includes("should i")) {
      simulateTyping(() => {
        addMessage("bot", "Top 3 things to improve right now:\n\n1. Add photos for 3 menu items that don't have them yet - this alone could boost your win rate by 12%\n\n2. Respond to your 2 pending reviews - restaurants that respond within 24h see 18% higher return visits\n\n3. Your Robinhood clicks dropped 15% this week - consider a platform-specific promo to re-engage that channel");
      });
    } else if (q.includes("customer") || q.includes("demographic") || q.includes("who visit")) {
      simulateTyping(() => {
        addMessage("bot", "Your customer profile based on Toast data:", [
          { label: "Solo Diners", value: "62%", color: "#3B82F6" },
          { label: "Group Sessions", value: "38%", color: "#8B5CF6" },
          { label: "Repeat Rate", value: "28%", color: "#00B14F" },
          { label: "Avg Session Time", value: "2.4s", color: "#F59E0B" },
        ]);
        setTimeout(() => addMessage("bot", "Most of your visitors are solo diners searching during lunch (11am-1pm) and late evening (8-10pm). Groups tend to discover you on weekends. Consider different pricing strategies for each segment."), 600);
      });
    } else if (q.includes("solo") && q.includes("group")) {
      simulateTyping(() => {
        addMessage("bot", "Solo vs Group Decision Patterns:\n\n- Solo diners: 62% of your traffic, faster decisions (avg 2.1s), prefer lunch hours\n- Group sessions: 38% of traffic, longer deliberation (avg 4.8s), prefer weekends\n- Groups have a 45% higher average order value\n\nTip: Create a \"Group Feast\" bundle to capture the higher group spending.");
      });
    } else if (q.includes("plan") || q.includes("compare plan") || q.includes("upgrade")) {
      simulateTyping(() => {
        addMessage("bot", "Your current plan: Growth (1,490 THB/mo)\n\nUpgrade to Pro (2,990 THB/mo) to unlock:\n- Competitor Decision Matrix\n- Customer Journey Analytics\n- Priority placement in Toast Picks\n- Advanced campaign targeting\n\nBased on your current traffic, Pro could generate an estimated 15-25 additional delivery conversions per month.");
      });
    } else if (q.includes("roi") || q.includes("estimate")) {
      simulateTyping(() => {
        addMessage("bot", "Estimated ROI for Pro plan upgrade:\n\nCurrent: ~142 delivery clicks/week\nProjected with Pro: ~178 clicks/week (+25%)\nAt avg order value of 350 THB:\nAdditional monthly revenue: ~12,600 THB\nPro plan cost: 2,990 THB/mo\nNet ROI: +9,610 THB/mo\n\nPayback period: Immediate from month 1.");
      });
    } else if (q.includes("review") && (q.includes("summary") || q.includes("respond"))) {
      simulateTyping(() => {
        addMessage("bot", "Review summary (last 30 days):\n- Total reviews: 12\n- Average rating: 4.6/5\n- Sentiment: 83% positive, 10% neutral, 7% negative\n- Top praise: Food quality, unique dishes\n- Top complaint: Wait times during peak hours\n\nTip: Respond to negative reviews within 24h with empathy and a specific solution. This turns 40% of unhappy customers into return visitors.");
      });
    } else if (q.includes("time") && q.includes("promo")) {
      simulateTyping(() => {
        addMessage("bot", "Best times for promotions based on your traffic patterns:\n\n- Weekday lunch (11am-1pm): Highest volume, best for flash deals\n- Friday evening (6-8pm): Peak group sessions, ideal for group bundles\n- Saturday (12-3pm): Highest new user discovery rate\n- Sunday evening (5-7pm): Users planning ahead - good for advance orders\n\nAvoid: Monday-Tuesday evenings (lowest engagement).");
      });
    } else if (q.includes("help") || q === "?") {
      addMessage("bot", "Here's what I can help with:\n\n- \"my performance\" - Your restaurant metrics\n- \"decision stats\" - Win rate & attraction insights\n- \"delivery stats\" - Platform breakdown\n- \"menu tips\" - Dish performance & gaps\n- \"campaign ideas\" - Promotion suggestions\n- \"customer demographics\" - Who visits you\n- \"compare plans\" - Subscription options\n- \"improvement tips\" - What to focus on next\n\nOr just ask me a question!");
    } else {
      addMessage("bot", "I can help with performance insights, menu optimization, delivery analytics, campaign ideas, and more. Try asking:\n\n- \"How am I doing?\"\n- \"What should I improve?\"\n- \"Best performing dishes\"\n- \"Campaign ideas\"\n\nOr tap one of the suggestions above!");
    }
  }

  function processAdminQuery(q: string) {
    if (awaitingConfirmation === "approve_all") {
      setAwaitingConfirmation(null);
      if (q === "yes" || q === "confirm" || q === "y" || q === "do it") {
        addMessage("bot", `Approving all ${pendingClaims.length} pending claim${pendingClaims.length !== 1 ? "s" : ""}...`);
        handleApproveAll();
      } else {
        addMessage("bot", "Cancelled. No claims were approved.");
      }
      return;
    }

    if (q.includes("pending") && q.includes("claim")) {
      if (pendingClaims.length === 0) {
        simulateTyping(() => addMessage("bot", "No pending claims right now. All clear!"));
      } else {
        const names = pendingClaims.map(c => c.restaurantName).join(", ");
        simulateTyping(() => {
          addMessage("bot", `There ${pendingClaims.length === 1 ? "is" : "are"} ${pendingClaims.length} pending claim${pendingClaims.length !== 1 ? "s" : ""}: ${names}. Expand the claims section below to review.`);
          setExpandedSection("claims");
        });
      }
    } else if (q.includes("approve all")) {
      if (pendingClaims.length === 0) {
        addMessage("bot", "No pending claims to approve. Everything's up to date!");
      } else {
        addMessage("bot", `This will approve all ${pendingClaims.length} pending claim${pendingClaims.length !== 1 ? "s" : ""}:\n${pendingClaims.map(c => `  ${c.restaurantName}`).join("\n")}\n\nType "yes" to confirm or anything else to cancel.`);
        setAwaitingConfirmation("approve_all");
      }
    } else if (q.includes("restaurant") && (q.includes("stat") || q.includes("count") || q.includes("how many") || q.includes("total"))) {
      const total = restaurants.length;
      const claimed = restaurants.filter((r: any) => r.ownerClaimStatus === "verified").length;
      const unclaimed = total - claimed;
      const avgRating = total > 0 ? (restaurants.reduce((sum: number, r: any) => sum + (parseFloat(r.rating) || 0), 0) / total).toFixed(1) : "N/A";
      simulateTyping(() => {
        addMessage("bot", "Restaurant overview:", [
          { label: "Total Listed", value: String(total), color: "#3B82F6" },
          { label: "Claimed", value: `${claimed} (${total > 0 ? Math.round(claimed/total*100) : 0}%)`, color: "#00B14F" },
          { label: "Unclaimed", value: String(unclaimed), color: "#F59E0B" },
          { label: "Avg Rating", value: avgRating, color: "#8B5CF6" },
        ]);
      });
    } else if (q.includes("unclaimed")) {
      const unclaimed = restaurants.filter((r: any) => r.ownerClaimStatus !== "verified");
      const top5 = unclaimed.sort((a: any, b: any) => (b.trendingScore || 0) - (a.trendingScore || 0)).slice(0, 5);
      const list = top5.map((r: any) => `  ${r.name} (Score: ${r.trendingScore || 0})`).join("\n");
      simulateTyping(() => addMessage("bot", `Top 5 unclaimed restaurants by trending score:\n${list}\n\nThese high-traffic restaurants would benefit most from owner onboarding.`));
    } else if (q.includes("user") && (q.includes("stat") || q.includes("count") || q.includes("how many") || q.includes("total") || q.includes("overview"))) {
      simulateTyping(() => {
        addMessage("bot", "User overview (estimates):", [
          { label: "Total Registered", value: "~2,450", color: "#3B82F6" },
          { label: "Active This Week", value: "~890", trend: "up", color: "#00B14F" },
          { label: "New This Month", value: "~210", trend: "up", color: "#8B5CF6" },
          { label: "LINE Connected", value: "~1,820 (74%)", color: "#06C755" },
        ]);
      });
    } else if (q.includes("alert") || q.includes("issue") || q.includes("problem")) {
      simulateTyping(() => addMessage("bot", `Today's alerts:\n\n  ${pendingClaims.length} claim${pendingClaims.length !== 1 ? "s" : ""} pending review\n  3 restaurants with stale data (>30 days)\n  1 campaign expiring tomorrow\n\nNothing critical. Platform health is good.`));
    } else if (q.includes("growth") || (q.includes("summary") && !q.includes("user"))) {
      const total = restaurants.length;
      const claimed = restaurants.filter((r: any) => r.ownerClaimStatus === "verified").length;
      simulateTyping(() => {
        addMessage("bot", `Platform summary:\n\n  ${total} restaurants listed\n  ${claimed} verified owners\n  ${pendingClaims.length} pending claims\n  ~2,450 total users\n  ~890 active this week\n\nGrowth trend: +12% MAU vs last month. Owner adoption is the key growth lever.`);
      });
    } else if (q.includes("top") && (q.includes("restaurant") || q.includes("trending"))) {
      const sorted = [...restaurants].sort((a: any, b: any) => (b.trendingScore || 0) - (a.trendingScore || 0)).slice(0, 5);
      const list = sorted.map((r: any, i: number) => `${i+1}. ${r.name} - Score: ${r.trendingScore || 0}, Rating: ${r.rating || "N/A"}`).join("\n");
      simulateTyping(() => addMessage("bot", `Top 5 trending restaurants:\n${list}`));
    } else if (q.includes("help") || q === "?") {
      addMessage("bot", "Here's what I can help with:\n\n- \"pending claims\" - Review claim requests\n- \"restaurant stats\" - Restaurant metrics\n- \"user stats\" - User overview\n- \"summary\" - Platform summary\n- \"top restaurants\" - Trending leaders\n- \"unclaimed restaurants\" - Onboarding targets\n- \"approve all\" - Approve all claims\n\nOr just ask me a question!");
    } else if (q.includes("search") || q.includes("find")) {
      const searchTerm = q.replace(/search|find|for|restaurant/gi, "").trim();
      if (searchTerm) {
        const matches = restaurants.filter((r: any) =>
          r.name?.toLowerCase().includes(searchTerm) || r.category?.toLowerCase().includes(searchTerm) || r.district?.toLowerCase().includes(searchTerm)
        );
        if (matches.length > 0) {
          const list = matches.slice(0, 5).map((r: any) => `  ${r.name} (${r.category || "Unknown"}) - ${r.address || "N/A"}`).join("\n");
          simulateTyping(() => addMessage("bot", `Found ${matches.length} result${matches.length !== 1 ? "s" : ""} for "${searchTerm}":\n${list}${matches.length > 5 ? `\n...and ${matches.length - 5} more` : ""}`));
        } else {
          addMessage("bot", `No restaurants found matching "${searchTerm}". Try a different name or category.`);
        }
      } else {
        addMessage("bot", "What would you like to search for? Try: \"search Thai\" or \"find Sushi\"");
      }
    } else {
      addMessage("bot", "I'm not sure about that. Try:\n\n- \"pending claims\"\n- \"restaurant stats\"\n- \"summary\"\n- \"top restaurants\"\n- \"help\"\n\nOr tap one of the quick actions below!");
    }
  }

  function processQuery(query: string) {
    const q = query.toLowerCase().trim();
    addMessage("user", query);

    if (isOwner) {
      processOwnerQuery(q);
    } else {
      processAdminQuery(q);
    }
  }

  function handleSend() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setInputValue("");
    processQuery(trimmed);
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const totalPending = isOwner ? 0 : pendingClaims.length;
  const quickActions = isOwner ? OWNER_QUICK_ACTIONS : ADMIN_QUICK_ACTIONS;
  const accentColor = isOwner ? "#00B14F" : "#FFCC02";
  const accentBg = isOwner ? "rgba(0,177,79,0.08)" : "rgba(255,204,2,0.12)";

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 hover:shadow-xl"
        style={{
          backgroundColor: accentColor,
          boxShadow: `0 4px 20px ${isOwner ? "rgba(0,177,79,0.3)" : "rgba(255,204,2,0.35)"}`,
        }}
        data-testid="button-butters-toggle"
      >
        {open ? (
          <X className="w-5 h-5 text-gray-900" />
        ) : (
          <Bot className="w-5 h-5 text-gray-900" />
        )}
        {totalPending > 0 && !open && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
            data-testid="badge-butters-count"
          >
            {totalPending > 9 ? "9+" : totalPending}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 flex flex-col overflow-hidden"
          style={{
            width: 380,
            maxHeight: "min(600px, calc(100vh - 120px))",
            borderRadius: 20,
            boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.06)",
            backgroundColor: "#fff",
          }}
          data-testid="panel-butters"
        >
          <div
            className="flex items-center gap-3 px-5 py-3.5"
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, ${isOwner ? "#00C853" : "#FFD633"} 100%)`,
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
            >
              <Sparkles className="w-5 h-5 text-gray-900" />
            </div>
            <div className="flex-1">
              <h3 className="text-[14px] font-bold text-gray-900 leading-tight" data-testid="text-butters-title">
                Butters
              </h3>
              <p className="text-[11px] text-gray-800/70 leading-tight">
                {isOwner ? "Growth Assistant" : "Admin Assistant"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20"
              data-testid="button-butters-close"
            >
              <X className="w-4 h-4 text-gray-900" />
            </button>
          </div>

          {pageSuggestions.length > 0 && (
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-2">
                Suggestions for this page
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {pageSuggestions.map((s) => (
                  <button
                    key={s.query}
                    onClick={() => processQuery(s.query)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all active:scale-95"
                    style={{
                      backgroundColor: accentBg,
                      color: isOwner ? "#00864A" : "#7A6600",
                    }}
                    data-testid={`suggestion-${s.query.replace(/\s+/g, "-")}`}
                  >
                    <s.icon className="w-3 h-3" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0" data-testid="butters-content">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`chat-message-${msg.id}`}
              >
                <div className={`max-w-[88%] ${msg.type === "user" ? "" : "flex gap-2"}`}>
                  {msg.type === "bot" && (
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: accentBg }}
                      data-testid="butters-bot-avatar"
                      role="img"
                      aria-label="Bot"
                    >
                      <Bot className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                        msg.type === "user"
                          ? "bg-gray-900 text-white rounded-br-md"
                          : msg.type === "action"
                          ? "bg-gray-50 text-gray-500 italic text-[12px] rounded-bl-md"
                          : "bg-gray-50 text-gray-700 rounded-bl-md"
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.cards && msg.cards.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                        {msg.cards.map((card, i) => (
                          <div
                            key={i}
                            className="rounded-xl px-3 py-2.5 bg-white border border-gray-100"
                            style={{ borderLeftWidth: 3, borderLeftColor: card.color || "#e5e7eb" }}
                          >
                            <p className="text-[10px] text-gray-400 font-medium leading-tight">{card.label}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[14px] font-bold text-gray-800">{card.value}</span>
                              {card.trend === "up" && <TrendingUp className="w-3 h-3 text-green-500" />}
                              {card.trend === "down" && <TrendingUp className="w-3 h-3 text-red-400 rotate-180" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <span className="text-[10px] text-gray-300 px-1" data-testid={`butters-timestamp-${msg.id}`}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start" data-testid="butters-typing-indicator">
                <div className="flex gap-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: accentBg }}
                  >
                    <Bot className="w-3.5 h-3.5" style={{ color: accentColor }} />
                  </div>
                  <div className="bg-gray-50 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {!isOwner && claimsLoading ? (
              <div className="flex items-center gap-2 text-[12px] text-gray-400 px-2 py-2">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                Checking pending tasks...
              </div>
            ) : (
              <>
                {!isOwner && pendingClaims.length > 0 && (
                  <TaskSection
                    title={`${pendingClaims.length} claim${pendingClaims.length !== 1 ? "s" : ""} pending`}
                    icon={<Store className="w-3.5 h-3.5" />}
                    expanded={expandedSection === "claims"}
                    onToggle={() =>
                      setExpandedSection(expandedSection === "claims" ? null : "claims")
                    }
                    accentColor={accentColor}
                    testId="section-claims"
                  >
                    {pendingClaims.map((claim) => (
                      <ClaimCard
                        key={claim.id}
                        claim={claim}
                        onApprove={() => handleApprove(claim)}
                        onReject={() => handleReject(claim)}
                        isProcessing={approveMutation.isPending || rejectMutation.isPending}
                      />
                    ))}
                  </TaskSection>
                )}

                {!isOwner && pendingClaims.length === 0 && messages.length <= 1 && (
                  <div className="flex justify-start">
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-50">
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      </div>
                      <div className="bg-green-50 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[13px] text-green-700">
                        All clear! No pending tasks.
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-100 bg-white">
            <div className="px-3 pt-2.5 pb-1.5">
              <div className="flex gap-1.5 flex-wrap">
                {quickActions.map((action) => (
                  <button
                    key={action.query}
                    onClick={() => processQuery(action.query)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all active:scale-95"
                    data-testid={`quick-action-${action.query.replace(/\s+/g, "-")}`}
                  >
                    <action.icon className="w-3 h-3" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 pb-3 pt-1.5">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                placeholder={isOwner ? "Ask about your restaurant..." : "Ask Butters anything..."}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-[13px] outline-none focus:border-gray-300 focus:bg-white transition-all placeholder:text-gray-400"
                data-testid="input-butters-query"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-20"
                style={{
                  backgroundColor: inputValue.trim() ? accentColor : "#f3f4f6",
                }}
                data-testid="button-butters-send"
              >
                <ArrowRight className="w-4 h-4 text-gray-900" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TaskSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
  accentColor,
  testId,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  accentColor: string;
  testId: string;
}) {
  return (
    <div
      className="rounded-xl border border-gray-100 overflow-visible bg-white"
      data-testid={testId}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-semibold text-gray-600 hover:bg-gray-50/50 transition-colors"
        data-testid={`button-toggle-${testId}`}
      >
        <span style={{ color: accentColor }}>{icon}</span>
        <span className="flex-1">{title}</span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-gray-300" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-2 border-t border-gray-50">
          {children}
        </div>
      )}
    </div>
  );
}

function ClaimCard({
  claim,
  onApprove,
  onReject,
  isProcessing,
}: {
  claim: EnrichedClaim;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}) {
  const submittedDate = new Date(claim.submittedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className="rounded-xl border border-gray-100 p-3 flex flex-col gap-2"
      data-testid={`claim-card-${claim.id}`}
    >
      <div className="flex items-start gap-2.5">
        {claim.restaurantImageUrl && (
          <img
            src={claim.restaurantImageUrl}
            alt={claim.restaurantName}
            className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
            data-testid={`img-claim-restaurant-${claim.id}`}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-gray-800 truncate" data-testid={`text-claim-restaurant-${claim.id}`}>
            {claim.restaurantName}
          </p>
          <p className="text-[10px] text-gray-400 truncate">
            {claim.ownerName} &middot; {submittedDate}
          </p>
        </div>
      </div>

      {claim.proofDocuments && claim.proofDocuments.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <FileText className="w-3 h-3" />
          {claim.proofDocuments.length} doc{claim.proofDocuments.length !== 1 ? "s" : ""}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1 text-[11px] h-7 bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
          onClick={onApprove}
          disabled={isProcessing}
          data-testid={`button-approve-claim-${claim.id}`}
        >
          <Check className="w-3 h-3 mr-1" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-[11px] h-7 rounded-lg"
          onClick={onReject}
          disabled={isProcessing}
          data-testid={`button-reject-claim-${claim.id}`}
        >
          <XCircle className="w-3 h-3 mr-1" />
          Reject
        </Button>
      </div>
    </div>
  );
}
