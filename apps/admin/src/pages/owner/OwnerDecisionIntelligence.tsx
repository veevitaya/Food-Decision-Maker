import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminSession } from "../admin/AdminLayout";
import {
  Brain, Trophy, Heart, Clock, Target, ArrowUp, ArrowDown,
  ChevronRight, Zap, AlertTriangle, Lightbulb, Info, User, Users, Loader2,
} from "lucide-react";

interface DecisionIntelligenceData {
  decisionMetrics: {
    winRate: number;
    attractionRate: number;
    conversionRate: number;
    dropOff: { seen: number; liked: number; detailed: number; saved: number; clicked: number };
    soloWinRate: number;
    groupWinRate: number;
  };
  timeHeatmap: { hour: string; mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number }[];
  competitorMatrix: { name: string; category: string; comparisons: number; winRate: number; lossRate: number; trend: "up" | "down" }[];
  opportunityGaps: { title: string; insight: string; whyItMatters: string; action: string; impact: "high" | "medium" | "low"; expectedLift: string }[];
}

function MetricTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-lg w-52 z-50 leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </span>
  );
}

export default function OwnerDecisionIntelligence() {
  const session = getAdminSession();

  const { data, isLoading } = useQuery<DecisionIntelligenceData>({
    queryKey: ["/api/owner/decision-intelligence"],
    staleTime: 5 * 60 * 1000,
    enabled: !!session && session.sessionType === "owner",
  });

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400" data-testid="text-access-denied">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-400">No data available yet. Check back after more activity.</p>
      </div>
    );
  }

  const { decisionMetrics, timeHeatmap, competitorMatrix, opportunityGaps } = data;
  const { dropOff } = decisionMetrics;

  const funnelSteps = [
    { label: "Seen", value: dropOff.seen, color: "#94A3B8" },
    { label: "Liked", value: dropOff.liked, color: "#3B82F6" },
    { label: "Detail View", value: dropOff.detailed, color: "#FFCC02" },
    { label: "Saved", value: dropOff.saved, color: "#00B14F" },
    { label: "Clicked Out", value: dropOff.clicked, color: "#F43F5E" },
  ];

  const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxHeat = Math.max(...timeHeatmap.flatMap(r => dayKeys.map(d => (r as any)[d] as number)), 1);

  return (
    <div className="space-y-6" data-testid="owner-decision-intelligence-page">
      <div className="flex items-center gap-3">
        <Brain className="w-5 h-5 text-[#FFCC02]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800" data-testid="text-page-title">Decision Intelligence</h2>
          <p className="text-xs text-gray-400">Understand how customers decide — insights delivery apps can't provide</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-decision-kpis">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFCC02]/15 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-[#FFCC02]" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Decision Win Rate</span>
            <MetricTooltip text="How often your restaurant wins when shown alongside competitors in decision moments." />
          </div>
          <p className="text-2xl font-bold text-gray-800">{decisionMetrics.winRate}%</p>
          <p className="text-[10px] text-gray-400 mt-1">Won {dropOff.liked} of {dropOff.seen > 0 ? Math.round(dropOff.liked / (decisionMetrics.winRate / 100)) : 0} comparisons</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <Heart className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attraction Rate</span>
            <MetricTooltip text="How often users swipe right when your restaurant appears. Measures first-impression appeal." />
          </div>
          <p className="text-2xl font-bold text-gray-800">{decisionMetrics.attractionRate}%</p>
          <p className="text-[10px] text-gray-400 mt-1">{dropOff.liked} swipe rights from {dropOff.seen} views</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detail Views</span>
            <MetricTooltip text="How many users clicked to see your full restaurant detail page." />
          </div>
          <p className="text-2xl font-bold text-gray-800">{dropOff.detailed.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 mt-1">{dropOff.seen > 0 ? ((dropOff.detailed / dropOff.seen) * 100).toFixed(0) : 0}% of impressions</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#00B14F]/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-[#00B14F]" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conversion</span>
            <MetricTooltip text="End-to-end conversion from being seen to delivery click-out." />
          </div>
          <p className="text-2xl font-bold text-gray-800">{decisionMetrics.conversionRate}%</p>
          <p className="text-[10px] text-gray-400 mt-1">{dropOff.clicked} delivery clicks from {dropOff.seen} views</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Decision Funnel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-decision-funnel">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Decision Drop-Off Funnel</h3>
            <MetricTooltip text="Shows where users drop off in the decision process." />
          </div>
          {dropOff.seen === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No funnel data yet.</p>
          ) : (
            <>
              <div className="space-y-3">
                {funnelSteps.map((step, i) => {
                  const pct = (step.value / funnelSteps[0].value) * 100;
                  const prevPct = i > 0 ? ((step.value / funnelSteps[i - 1].value) * 100).toFixed(0) : "100";
                  return (
                    <div key={step.label} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 shrink-0 font-medium">{step.label}</span>
                      <div className="flex-1 relative">
                        <div className="h-7 bg-gray-50 rounded-lg overflow-hidden">
                          <div
                            className="h-full rounded-lg flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: step.color + "30" }}
                          >
                            <span className="text-[11px] font-semibold" style={{ color: step.color }}>{step.value.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 w-10 text-right">{i > 0 ? `${prevPct}%` : ""}</span>
                    </div>
                  );
                })}
              </div>
              {dropOff.liked > 0 && dropOff.detailed < dropOff.liked && (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-gray-600">
                      <span className="font-medium text-gray-800">Biggest drop: Liked → Detail View ({((1 - dropOff.detailed / Math.max(dropOff.liked, 1)) * 100).toFixed(0)}% loss)</span>
                      {" "}— Improve your description and photos to convert more swipes into detail views.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Solo vs Group */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-solo-vs-group">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[var(--admin-blue)] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Solo vs Group Performance</h3>
            <MetricTooltip text="How your restaurant performs in solo decisions vs group sessions." />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
              <User className="w-5 h-5 text-blue-500 mx-auto mb-2" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Solo Win Rate</p>
              <p className="text-2xl font-bold text-gray-800">{decisionMetrics.soloWinRate}%</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 text-center">
              <Users className="w-5 h-5 text-purple-500 mx-auto mb-2" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Group Win Rate</p>
              <p className="text-2xl font-bold text-gray-800">{decisionMetrics.groupWinRate}%</p>
            </div>
          </div>
          {decisionMetrics.groupWinRate < decisionMetrics.soloWinRate - 5 ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-800">Group sessions underperforming</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Add shareable/group-friendly dishes and "group-friendly" tag to improve.</p>
                  <button className="text-[11px] font-medium text-[#00B14F] mt-2 hover:text-[#00B14F]/80 transition-colors flex items-center gap-1" data-testid="btn-add-group-tag">
                    Add Group Tag <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center">Performance is balanced across solo and group sessions.</p>
          )}
        </div>
      </div>

      {/* Competitor Matrix */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-competitor-matrix">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-[3px] h-4 bg-[#F43F5E] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">Competitor Decision Matrix</h3>
          <MetricTooltip text="Restaurants that appear alongside yours in group/session comparisons." />
        </div>
        {competitorMatrix.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No competitor comparison data yet. Requires group session activity.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-competitors">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3">Competitor</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3">Category</th>
                  <th className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3">Comparisons</th>
                  <th className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3">You Win</th>
                  <th className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3">They Win</th>
                  <th className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3">Trend</th>
                </tr>
              </thead>
              <tbody>
                {competitorMatrix.map((c) => (
                  <tr key={c.name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="py-3 text-gray-500">{c.category}</td>
                    <td className="py-3 text-center text-gray-600">{c.comparisons}</td>
                    <td className="py-3 text-center">
                      <span className={`font-semibold ${c.winRate >= 50 ? "text-[#00B14F]" : "text-gray-600"}`}>{c.winRate}%</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`font-semibold ${c.lossRate >= 60 ? "text-red-400" : "text-gray-600"}`}>{c.lossRate}%</span>
                    </td>
                    <td className="py-3 text-center">
                      {c.trend === "up"
                        ? <ArrowUp className="w-4 h-4 text-[#00B14F] mx-auto" />
                        : <ArrowDown className="w-4 h-4 text-red-400 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Demand Heatmap */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-demand-heatmap">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">Demand Heatmap</h3>
          <MetricTooltip text="When users are most actively engaging with your restaurant. Darker = more activity." />
        </div>
        {timeHeatmap.every(row => dayKeys.every(d => (row as any)[d] === 0)) ? (
          <p className="text-sm text-gray-400 text-center py-6">No heatmap data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-8 gap-1.5 min-w-[400px]">
              <div />
              {dayLabels.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-1">{d}</div>
              ))}
              {timeHeatmap.map(row => (
                <React.Fragment key={row.hour}>
                  <div className="text-xs text-gray-400 font-medium flex items-center">{row.hour}</div>
                  {dayKeys.map(day => {
                    const val = (row as any)[day] as number;
                    const intensity = val / maxHeat;
                    return (
                      <div
                        key={`${row.hour}-${day}`}
                        className="h-8 rounded-md flex items-center justify-center text-[10px] font-medium transition-colors"
                        style={{
                          backgroundColor: `rgba(0, 177, 79, ${Math.max(intensity * 0.8, 0.05)})`,
                          color: intensity > 0.5 ? "white" : "#6B7280",
                        }}
                      >
                        {val}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Opportunity Gaps */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-opportunity-gaps">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">Opportunity Gaps</h3>
          <p className="text-xs text-gray-400 ml-2">Where you're losing decisions — and how to fix it</p>
        </div>
        {opportunityGaps.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No gaps detected. Keep up the good work!</p>
        ) : (
          <div className="space-y-3">
            {opportunityGaps.map((gap, i) => (
              <div key={i} className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors" data-testid={`opportunity-gap-${i}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-800">{gap.title}</h4>
                      <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                        gap.impact === "high" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                      }`}>{gap.impact} impact</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{gap.insight}</p>
                    <div className="mt-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <p className="text-[11px] text-gray-500"><span className="font-medium text-gray-700">Why it matters:</span> {gap.whyItMatters}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <button className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#00B14F]/10 text-[#00B14F] hover:bg-[#00B14F]/20 transition-colors" data-testid={`btn-gap-action-${i}`}>
                        {gap.action}
                      </button>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" /> Expected: {gap.expectedLift}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
