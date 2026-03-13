import React, { useState } from "react";
import { getAdminSession } from "./AdminLayout";
import {
  Brain,
  Trophy,
  Heart,
  TrendingUp,
  TrendingDown,
  Users,
  User,
  Clock,
  Target,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Zap,
  AlertTriangle,
  Lightbulb,
  Eye,
  Info,
} from "lucide-react";

const DECISION_METRICS = {
  winRate: { value: 32.2, change: +4.1, compared: 1280, won: 412, benchmark: 28.5 },
  attractionRate: { value: 68, change: +3.2, benchmark: 62 },
  dropOff: { seen: 4820, liked: 3278, compared: 1280, matched: 412, clicked: 184 },
  speedScore: { value: 4.2, avg: 6.8, label: "seconds", faster: true },
  soloWinRate: { value: 38.4, change: +2.1 },
  groupWinRate: { value: 24.8, change: -1.3 },
};

const COMPETITOR_MATRIX = [
  { name: "Pad Thai Palace", category: "Thai", comparisons: 342, winRate: 45, lossRate: 55, trend: "up" as const },
  { name: "Soi Ramen", category: "Japanese", comparisons: 218, winRate: 52, lossRate: 48, trend: "up" as const },
  { name: "BKK Burger Joint", category: "Burgers", comparisons: 156, winRate: 28, lossRate: 72, trend: "down" as const },
  { name: "Green Bowl", category: "Healthy", comparisons: 134, winRate: 61, lossRate: 39, trend: "up" as const },
  { name: "Spice Market", category: "Thai", comparisons: 98, winRate: 35, lossRate: 65, trend: "down" as const },
];

const OPPORTUNITY_GAPS = [
  {
    title: "Late-night decisions",
    insight: "Users compare your fried chicken 180 times after 9PM, but you lose 78% of those decisions.",
    whyItMatters: "Late-night traffic is growing 22% week-over-week in your area. Competitors are winning these moments.",
    action: "Add late-night tag & extend hours",
    impact: "high" as const,
    expectedLift: "+15% match rate after 9PM",
  },
  {
    title: "Group meal comparisons",
    insight: "Your restaurant wins 38% of solo decisions but only 24% of group sessions.",
    whyItMatters: "Group sessions have 2.4x higher delivery conversion. Missing group-friendly positioning costs clicks.",
    action: "Add group-friendly dishes & tag",
    impact: "high" as const,
    expectedLift: "+28% group win rate",
  },
  {
    title: "Missing loaded fries pairing",
    insight: "42% of users who compare your burger also search for loaded fries, which you don't highlight.",
    whyItMatters: "Cross-category demand signals show untapped menu opportunities worth ฿12K+ monthly.",
    action: "Add loaded fries to menu",
    impact: "medium" as const,
    expectedLift: "+8% overall match rate",
  },
  {
    title: "Photo quality gap",
    insight: "Your dishes lose 3.2x more often when shown next to competitors with professional photos.",
    whyItMatters: "Decision speed drops 40% when your photo quality is below the category average, causing users to skip.",
    action: "Upgrade dish photography",
    impact: "high" as const,
    expectedLift: "+22% attraction rate",
  },
];

const TIME_HEATMAP = [
  { hour: "11:00", mon: 3, tue: 4, wed: 5, thu: 4, fri: 6, sat: 8, sun: 7 },
  { hour: "12:00", mon: 8, tue: 9, wed: 7, thu: 8, fri: 10, sat: 12, sun: 11 },
  { hour: "13:00", mon: 6, tue: 7, wed: 8, thu: 6, fri: 9, sat: 10, sun: 9 },
  { hour: "18:00", mon: 7, tue: 8, wed: 9, thu: 10, fri: 12, sat: 14, sun: 11 },
  { hour: "19:00", mon: 10, tue: 11, wed: 12, thu: 13, fri: 15, sat: 16, sun: 13 },
  { hour: "20:00", mon: 9, tue: 10, wed: 11, thu: 12, fri: 14, sat: 15, sun: 12 },
  { hour: "21:00", mon: 5, tue: 6, wed: 7, thu: 8, fri: 10, sat: 12, sun: 8 },
];

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

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400" data-testid="text-access-denied">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  const { dropOff } = DECISION_METRICS;
  const funnelSteps = [
    { label: "Seen", value: dropOff.seen, color: "#94A3B8" },
    { label: "Liked", value: dropOff.liked, color: "#3B82F6" },
    { label: "Compared", value: dropOff.compared, color: "#FFCC02" },
    { label: "Matched", value: dropOff.matched, color: "#00B14F" },
    { label: "Clicked Out", value: dropOff.clicked, color: "#F43F5E" },
  ];

  const maxHeat = Math.max(...TIME_HEATMAP.flatMap(r => [r.mon, r.tue, r.wed, r.thu, r.fri, r.sat, r.sun]));
  const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-6" data-testid="owner-decision-intelligence-page">
      <div className="flex items-center gap-3">
        <Brain className="w-5 h-5 text-[#FFCC02]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800" data-testid="text-page-title">Decision Intelligence</h2>
          <p className="text-xs text-gray-400">Understand how customers decide — insights delivery apps can't provide</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-decision-kpis">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFCC02]/15 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-[#FFCC02]" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Decision Win Rate</span>
            <MetricTooltip text="How often your restaurant wins when shown alongside competitors in decision moments. Higher = users choose you more often." />
          </div>
          <p className="text-2xl font-bold text-gray-800">{DECISION_METRICS.winRate.value}%</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-0.5 text-xs text-[#00B14F]">
              <ArrowUp className="w-3 h-3" /> +{DECISION_METRICS.winRate.change}%
            </div>
            <span className="text-[10px] text-gray-400">Avg: {DECISION_METRICS.winRate.benchmark}%</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Won {DECISION_METRICS.winRate.won} of {DECISION_METRICS.winRate.compared} comparisons</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <Heart className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attraction Rate</span>
            <MetricTooltip text="How often users swipe right or engage positively when your dishes appear. Measures first-impression appeal." />
          </div>
          <p className="text-2xl font-bold text-gray-800">{DECISION_METRICS.attractionRate.value}%</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-0.5 text-xs text-[#00B14F]">
              <ArrowUp className="w-3 h-3" /> +{DECISION_METRICS.attractionRate.change}%
            </div>
            <span className="text-[10px] text-gray-400">Avg: {DECISION_METRICS.attractionRate.benchmark}%</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Decision Speed</span>
            <MetricTooltip text="Average time users take to choose your restaurant vs. category average. Faster = stronger preference signal." />
          </div>
          <p className="text-2xl font-bold text-gray-800">{DECISION_METRICS.speedScore.value}s</p>
          <p className="text-[10px] text-gray-400 mt-1">
            <span className="text-[#00B14F] font-medium">{(DECISION_METRICS.speedScore.avg - DECISION_METRICS.speedScore.value).toFixed(1)}s faster</span> than avg ({DECISION_METRICS.speedScore.avg}s)
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#00B14F]/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-[#00B14F]" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conversion</span>
            <MetricTooltip text="End-to-end conversion from being seen to delivery click-out. Measures full funnel effectiveness." />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {((dropOff.clicked / dropOff.seen) * 100).toFixed(1)}%
          </p>
          <p className="text-[10px] text-gray-400 mt-1">{dropOff.clicked} delivery clicks from {dropOff.seen} views</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-decision-funnel">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Decision Drop-Off Funnel</h3>
            <MetricTooltip text="Shows where users drop off in the decision process. Identify your biggest conversion gaps." />
          </div>
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
                        style={{ width: `${pct}%`, backgroundColor: step.color + "30" }}
                      >
                        <span className="text-[11px] font-semibold" style={{ color: step.color }}>{step.value.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 w-10 text-right">
                    {i > 0 ? `${prevPct}%` : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-800">Biggest drop: Compared → Matched ({((1 - dropOff.matched / dropOff.compared) * 100).toFixed(0)}% loss)</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Your dishes attract interest but lose in final comparisons. Improve photos and descriptions to win more head-to-heads.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-solo-vs-group">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[var(--admin-blue)] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Solo vs Group Performance</h3>
            <MetricTooltip text="How your restaurant performs in solo decisions vs group sessions where multiple users vote." />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
              <User className="w-5 h-5 text-blue-500 mx-auto mb-2" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Solo Win Rate</p>
              <p className="text-2xl font-bold text-gray-800">{DECISION_METRICS.soloWinRate.value}%</p>
              <div className="flex items-center justify-center gap-0.5 mt-1 text-xs text-[#00B14F]">
                <ArrowUp className="w-3 h-3" /> +{DECISION_METRICS.soloWinRate.change}%
              </div>
            </div>
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 text-center">
              <Users className="w-5 h-5 text-purple-500 mx-auto mb-2" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Group Win Rate</p>
              <p className="text-2xl font-bold text-gray-800">{DECISION_METRICS.groupWinRate.value}%</p>
              <div className="flex items-center justify-center gap-0.5 mt-1 text-xs text-red-400">
                <ArrowDown className="w-3 h-3" /> {DECISION_METRICS.groupWinRate.change}%
              </div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-800">Group sessions underperforming</p>
                <p className="text-[11px] text-gray-500 mt-0.5">You win 38.4% of solo decisions but only 24.8% in groups. Add shareable/group-friendly dishes and "group-friendly" tag to improve.</p>
                <button className="text-[11px] font-medium text-[#00B14F] mt-2 hover:text-[#00B14F]/80 transition-colors flex items-center gap-1" data-testid="btn-add-group-tag">
                  Add Group Tag <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-competitor-matrix">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-[3px] h-4 bg-[#F43F5E] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">Competitor Decision Matrix</h3>
          <MetricTooltip text="Shows which restaurants you lose to and beat in head-to-head decision moments. Focus on your weakest matchups." />
        </div>
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
              {COMPETITOR_MATRIX.map((c) => (
                <tr key={c.name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors" data-testid={`competitor-row-${c.name.replace(/\s+/g, "-").toLowerCase()}`}>
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
                    {c.trend === "up" ? (
                      <ArrowUp className="w-4 h-4 text-[#00B14F] mx-auto" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-400 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-demand-heatmap">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">Demand Heatmap</h3>
          <MetricTooltip text="When users are most actively comparing your restaurant. Darker = more decision activity." />
        </div>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-8 gap-1.5 min-w-[400px]">
            <div />
            {dayLabels.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-1">{d}</div>
            ))}
            {TIME_HEATMAP.map(row => (
              <React.Fragment key={row.hour}>
                <div className="text-xs text-gray-400 font-medium flex items-center">{row.hour}</div>
                {dayKeys.map(day => {
                  const val = row[day];
                  const intensity = val / maxHeat;
                  return (
                    <div
                      key={`${row.hour}-${day}`}
                      className="h-8 rounded-md flex items-center justify-center text-[10px] font-medium transition-colors"
                      style={{
                        backgroundColor: `rgba(0, 177, 79, ${Math.max(intensity * 0.8, 0.05)})`,
                        color: intensity > 0.5 ? "white" : "#6B7280",
                      }}
                      data-testid={`heat-${row.hour}-${day}`}
                    >
                      {val}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-opportunity-gaps">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">Opportunity Gaps</h3>
          <p className="text-xs text-gray-400 ml-2">Where you're losing decisions — and how to fix it</p>
        </div>
        <div className="space-y-3">
          {OPPORTUNITY_GAPS.map((gap, i) => (
            <div key={i} className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors" data-testid={`opportunity-gap-${i}`}>
              <div className="flex items-start justify-between gap-3">
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
      </div>
    </div>
  );
}
