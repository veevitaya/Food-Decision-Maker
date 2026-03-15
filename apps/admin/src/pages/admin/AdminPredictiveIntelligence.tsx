import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, TrendingUp, Clock, Zap, Users, AlertCircle, Lightbulb } from "lucide-react";

type ImpactLevel = "high" | "medium" | "low";
type PredictionType = "demand" | "trend" | "retention";

type PredictiveOverview = {
  generatedAt: string;
  windowDays: number;
  modelMetrics: Array<{ label: string; value: string; desc: string }>;
  activePredictions: Array<{
    title: string;
    area: string;
    timeframe: string;
    confidence: number;
    impact: ImpactLevel;
    type: PredictionType;
  }>;
  restaurantForecasts: Array<{
    name: string;
    prediction: "Outperform" | "Steady" | "Underperform";
    confidence: number;
    reason: string;
  }>;
  segmentForecasts: Array<{
    segment: string;
    growth: string;
    nextMonth: number;
  }>;
};

const FALLBACK: PredictiveOverview = {
  generatedAt: new Date().toISOString(),
  windowDays: 30,
  modelMetrics: [],
  activePredictions: [],
  restaurantForecasts: [],
  segmentForecasts: [],
};

const DAY_OPTIONS = [7, 30, 90] as const;
type DayOption = (typeof DAY_OPTIONS)[number];

function getInitialDaysFromUrl(): DayOption {
  if (typeof window === "undefined") return 30;
  const raw = Number.parseInt(new URLSearchParams(window.location.search).get("days") ?? "", 10);
  return DAY_OPTIONS.includes(raw as DayOption) ? (raw as DayOption) : 30;
}

function updateDaysInUrl(days: DayOption) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("days", String(days));
  const search = url.searchParams.toString();
  const nextUrl = `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}

export default function AdminPredictiveIntelligence() {
  const [days, setDays] = useState<DayOption>(() => getInitialDaysFromUrl());
  const { data = FALLBACK, isLoading, isError } = useQuery<PredictiveOverview>({
    queryKey: ["/api/admin/predictive-intelligence/overview", days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/predictive-intelligence/overview?days=${days}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load predictive intelligence");
      return res.json();
    },
    staleTime: 30_000,
  });

  return (
    <div className="space-y-8" data-testid="admin-predictive-intelligence-page">
      <div className="flex items-center gap-3">
        <Brain className="w-5 h-5" style={{ color: "var(--admin-deep-purple)" }} />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Predictive Intelligence</h2>
          <p className="text-xs text-muted-foreground">
            AI-powered demand forecasting, user behavior prediction, and prescriptive recommendations
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            Window {data.windowDays} days | Updated {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {DAY_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setDays(option);
              updateDaysInUrl(option);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              days === option
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {option}d
          </button>
        ))}
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Failed to load predictive intelligence data.
        </div>
      )}

      {isLoading && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-500">Loading predictive intelligence...</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {data.modelMetrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{m.label}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground mb-1">{m.value}</p>
            <p className="text-[10px] text-gray-400">{m.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-predictions">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-deep-purple)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Active Predictions</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">What is likely to happen next</p>
          </div>
          <div className="space-y-3">
            {data.activePredictions.map((p, i) => (
              <div key={`${p.title}-${i}`} className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor:
                        p.type === "demand"
                          ? "rgba(139, 92, 246, 0.1)"
                          : p.type === "trend"
                            ? "rgba(16, 185, 129, 0.1)"
                            : "rgba(59, 130, 246, 0.1)",
                    }}
                  >
                    {p.type === "demand" ? (
                      <Zap className="w-4 h-4" style={{ color: "var(--admin-deep-purple)" }} />
                    ) : p.type === "trend" ? (
                      <TrendingUp className="w-4 h-4" style={{ color: "var(--admin-cyan)" }} />
                    ) : (
                      <Users className="w-4 h-4" style={{ color: "var(--admin-blue)" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                      <span>{p.area}</span>
                      <span>•</span>
                      <span>{p.timeframe}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${p.confidence}%`,
                            backgroundColor:
                              p.confidence > 80
                                ? "var(--admin-cyan)"
                                : p.confidence > 70
                                  ? "var(--admin-teal)"
                                  : "var(--admin-pink)",
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-600">{p.confidence}%</span>
                    </div>
                    <span className={`text-[10px] font-medium ${p.impact === "high" ? "text-red-500" : p.impact === "medium" ? "text-amber-500" : "text-gray-400"}`}>
                      {p.impact} impact
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-restaurant-forecasts">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-cyan)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Restaurant Forecasts</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Expected performance</p>
            </div>
            <div className="space-y-2.5">
              {data.restaurantForecasts.map((r) => (
                <div key={r.name} className="p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-800">{r.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        r.prediction === "Outperform"
                          ? "bg-emerald-50 text-emerald-700"
                          : r.prediction === "Steady"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {r.prediction}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{r.reason}</span>
                    <span className="text-[10px] font-medium text-gray-500 flex-shrink-0">{r.confidence}% conf</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-segment-forecasts">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-blue)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Segment Growth Forecast</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Next 30 days</p>
            </div>
            <div className="space-y-2">
              {data.segmentForecasts.map((s) => (
                <div key={s.segment} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="flex-1 text-xs text-gray-700 font-medium">{s.segment}</span>
                  <span className={`text-xs font-semibold ${s.growth.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>{s.growth}</span>
                  <span className="w-16 text-right text-xs text-gray-500">{s.nextMonth} est.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-100/50 p-6" data-testid="card-ai-assistant">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-6 h-6" style={{ color: "var(--admin-deep-purple)" }} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-gray-800 mb-1">AI Assistant</h3>
            <p className="text-sm text-gray-600 mb-3">Ask questions about your data, get instant insights, and receive actionable recommendations.</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-purple-600 bg-white rounded-full px-3 py-1.5 border border-purple-100">
                <Clock className="w-3 h-3" />
                Phase 2 - Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
