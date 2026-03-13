import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lightbulb, TrendingUp, Eye, Heart, ExternalLink, Users, Target, Clock, Zap, ArrowUp, ArrowDown, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OwnerInsightsData {
  overview: {
    impressions: { value: number; trend: number };
    swipes: { value: number; trend: number };
    saves: { value: number; trend: number };
    deliveryTaps: { value: number; trend: number };
  };
  competitorBenchmark: {
    yourRank: number;
    totalInCategory: number;
    avgCategorySwipes: number;
    yourSwipes: number;
    percentile: number;
  };
  repeatVisitors: {
    firstTime: number;
    returning: number;
    avgVisitsPerUser: number;
    loyaltyScore: number;
  };
  conversionRate: string;
  audienceBreakdown: { segment: string; pct: number; trend: string }[];
  recommendationsData: { title: string; impact: "high" | "medium" | "low"; reason: string; action: string }[];
  opportunityScore: number;
}

const AUDIENCE_BREAKDOWN = [
  { segment: "Foodies", pct: 32, trend: "+5%" },
  { segment: "Budget Diners", pct: 28, trend: "+8%" },
  { segment: "Date Night", pct: 18, trend: "+3%" },
  { segment: "Groups", pct: 14, trend: "-2%" },
  { segment: "Health-conscious", pct: 8, trend: "+12%" },
];

const PERFORMANCE_METRICS = [
  { label: "Impressions", value: "4,820", trend: "+18%", up: true, icon: Eye, desc: "Times your restaurant was shown" },
  { label: "Swipe Right Rate", value: "68%", trend: "+3.2%", up: true, icon: Heart, desc: "Users who liked your listing" },
  { label: "Clickout Rate", value: "34%", trend: "+2.1%", up: true, icon: ExternalLink, desc: "Users who tapped to order" },
  { label: "Unique Viewers", value: "2,140", trend: "+12%", up: true, icon: Users, desc: "Individual users who saw you" },
];

const RECOMMENDATIONS_INIT = [
  { title: "Add Late Night hours", impact: "high" as const, reason: "28% of your viewers search after 10pm, but you're listed as closed", action: "Update hours", completed: false },
  { title: "Add 2 more menu photos", impact: "high" as const, reason: "Listings with 5+ photos get 42% more clickouts", action: "Upload images", completed: false },
  { title: "Create a weekend promotion", impact: "medium" as const, reason: "Your competitors run 2.3 promotions on average", action: "Create promo", completed: false },
  { title: "Add delivery via LINE MAN", impact: "medium" as const, reason: "32% of clickouts go to LINE MAN but you only have Grab", action: "Add link", completed: false },
  { title: "Update vibe tags", impact: "low" as const, reason: "Adding 'instagrammable' tag increases discovery by 18%", action: "Edit tags", completed: false },
];

const COMPETITOR_COMPARISON = [
  { metric: "Impressions", you: 4820, avg: 3200, better: true },
  { metric: "Like Rate", you: 68, avg: 62, better: true },
  { metric: "Clickout Rate", you: 34, avg: 38, better: false },
  { metric: "Menu Photos", you: 3, avg: 5, better: false },
  { metric: "Review Score", you: 4.6, avg: 4.3, better: true },
];

const OPPORTUNITY_SCORE = 72;

export default function OwnerInsights() {
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: insightsData } = useQuery<OwnerInsightsData>({
    queryKey: ["/api/owner/insights"],
    staleTime: 5 * 60 * 1000,
  });

  const liveMetrics = useMemo(() => {
    if (!insightsData?.overview) return PERFORMANCE_METRICS;
    const { impressions, swipes, saves, deliveryTaps } = insightsData.overview;
    const swipeRate = impressions.value > 0
      ? ((swipes.value / impressions.value) * 100).toFixed(1)
      : "0.0";
    const clickoutRate = impressions.value > 0
      ? ((deliveryTaps.value / impressions.value) * 100).toFixed(1)
      : "0.0";
    return [
      { label: "Impressions", value: impressions.value.toLocaleString(), trend: impressions.trend ? `+${impressions.trend}%` : "–", up: true, icon: Eye, desc: "Times your restaurant was shown" },
      { label: "Swipe Right Rate", value: `${swipeRate}%`, trend: "–", up: true, icon: Heart, desc: "Users who liked your listing" },
      { label: "Clickout Rate", value: `${clickoutRate}%`, trend: "–", up: true, icon: ExternalLink, desc: "Users who tapped to order" },
      { label: "Unique Viewers", value: saves.value.toLocaleString(), trend: saves.trend ? `+${saves.trend}%` : "–", up: true, icon: Users, desc: "Saves / engaged users" },
    ];
  }, [insightsData]);

  const liveCompetitor = useMemo(() => {
    if (!insightsData?.competitorBenchmark) return COMPETITOR_COMPARISON;
    const { yourSwipes, avgCategorySwipes, percentile, yourRank, totalInCategory } = insightsData.competitorBenchmark;
    const convRate = insightsData?.conversionRate ? parseFloat(insightsData.conversionRate) : 0;
    return [
      { metric: "Swipe Rights", you: yourSwipes, avg: avgCategorySwipes, better: yourSwipes >= avgCategorySwipes },
      { metric: "Rank", you: yourRank, avg: Math.round(totalInCategory / 2), better: yourRank <= Math.round(totalInCategory / 2) },
      { metric: "Percentile", you: percentile, avg: 50, better: percentile >= 50 },
      { metric: "Conv. Rate", you: convRate, avg: 3.8, better: convRate >= 3.8 },
      { metric: "Return Rate", you: insightsData.repeatVisitors?.returning ?? 0, avg: 30, better: (insightsData.repeatVisitors?.returning ?? 0) >= 30 },
    ];
  }, [insightsData]);

  const [recommendations, setRecommendations] = useState(RECOMMENDATIONS_INIT);

  useEffect(() => {
    if (insightsData?.recommendationsData?.length) {
      setRecommendations(insightsData.recommendationsData.map(r => ({ ...r, completed: false })));
    }
  }, [insightsData]);

  const liveAudience = insightsData?.audienceBreakdown?.length
    ? insightsData.audienceBreakdown
    : AUDIENCE_BREAKDOWN;

  const baseScore = insightsData?.opportunityScore ?? OPPORTUNITY_SCORE;
  const completedCount = recommendations.filter(r => r.completed).length;
  const currentScore = Math.min(100, baseScore + completedCount * 3);

  const handleAction = (index: number) => {
    setActionLoading(index);
    setTimeout(() => {
      setRecommendations(prev => prev.map((r, i) =>
        i === index ? { ...r, completed: true } : r
      ));
      toast({
        title: "Action Completed",
        description: `"${recommendations[index].title}" has been marked as done. Your Opportunity Score improved!`
      });
      setActionLoading(null);
    }, 1500);
  };

  return (
    <div className="space-y-8" data-testid="owner-insights-page">
      <div className="flex items-center gap-3">
        <Lightbulb className="w-5 h-5" style={{ color: "#00B14F" }} />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">AI Recommendations</h2>
          <p className="text-xs text-muted-foreground">Personalized growth actions powered by Toast intelligence</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {liveMetrics.map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className="w-4 h-4 text-[#00B14F]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{m.label}</span>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{m.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {m.up ? <ArrowUp className="w-3 h-3 text-emerald-500" /> : <ArrowDown className="w-3 h-3 text-red-400" />}
              <span className={`text-[11px] font-medium ${m.up ? "text-emerald-600" : "text-red-500"}`}>{m.trend}</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{m.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-recommendations">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "#00B14F" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Recommendations</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Actions to boost your performance ({completedCount}/{recommendations.length} done)</p>
          </div>
          <div className="space-y-2.5">
            {recommendations.map((r, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${r.completed ? "border-emerald-100 bg-emerald-50/30" : "border-gray-100 hover:border-gray-200"}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  r.completed ? "bg-emerald-100" : r.impact === "high" ? "bg-emerald-50" : r.impact === "medium" ? "bg-blue-50" : "bg-gray-100"
                }`}>
                  {r.completed ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Target className={`w-3.5 h-3.5 ${
                      r.impact === "high" ? "text-emerald-500" : r.impact === "medium" ? "text-blue-500" : "text-gray-400"
                    }`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${r.completed ? "text-gray-400 line-through" : "text-gray-800"}`}>{r.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      r.impact === "high" ? "bg-emerald-50 text-emerald-700" : r.impact === "medium" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
                    }`}>{r.impact}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{r.reason}</p>
                </div>
                {r.completed ? (
                  <span className="text-[10px] font-medium text-emerald-600 flex-shrink-0 px-3 py-1.5">Done</span>
                ) : (
                  <button
                    onClick={() => handleAction(i)}
                    disabled={actionLoading === i}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#00B14F]/10 text-[#00B14F] hover:bg-[#00B14F]/20 transition-colors flex-shrink-0 disabled:opacity-50 flex items-center gap-1"
                    data-testid={`btn-action-${i}`}
                  >
                    {actionLoading === i ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {r.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-opportunity-score">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "#00B14F" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Opportunity Score</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Growth potential</p>
            </div>
            <div className="flex flex-col items-center py-4">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#00B14F" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${Math.min(currentScore, 100) * 2.64} 264`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800">{currentScore}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {completedCount === recommendations.length
                  ? "All recommendations completed!"
                  : `Complete ${recommendations.filter(r => !r.completed && r.impact === "high").length} more high-impact actions`
                }
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-audience">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "#00B14F" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Your Audience</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Who discovers you</p>
            </div>
            <div className="space-y-2.5">
              {liveAudience.map(a => (
                <div key={a.segment} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-gray-600 font-medium">{a.segment}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full bg-[#00B14F]" style={{ width: `${a.pct * 3}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-gray-700">{a.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-competitor-comparison">
        <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "#00B14F" }}>
          <h3 className="text-[15px] font-semibold text-gray-800">vs. Similar Restaurants</h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">How you compare to your area average</p>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {liveCompetitor.map(c => (
            <div key={c.metric} className="text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">{c.metric}</p>
              <p className={`text-lg font-bold ${c.better ? "text-emerald-600" : "text-amber-600"}`}>{c.you}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Avg: {c.avg}</p>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto mt-1.5 ${c.better ? "bg-emerald-50" : "bg-amber-50"}`}>
                {c.better ? <ArrowUp className="w-3 h-3 text-emerald-500" /> : <ArrowDown className="w-3 h-3 text-amber-500" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
