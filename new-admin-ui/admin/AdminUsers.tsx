import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Activity,
  BarChart3,
  Clock,
  TrendingUp,
  Zap,
  Smartphone,
  Brain,
  Calendar,
} from "lucide-react";
import type { UserProfile } from "@shared/schema";

const genderData = [
  { label: "Female", pct: 51, color: "hsl(350, 95%, 73%)" },
  { label: "Male", pct: 42, color: "hsl(235, 90%, 75%)" },
  { label: "Other", pct: 7, color: "hsl(260, 90%, 77%)" },
];

const userTypeSegments = [
  { label: "Solo Diners", pct: 35, count: 1_247, topCuisine: "Japanese", avgBudget: "฿฿", peakTime: "12-1pm", color: "hsl(239, 84%, 67%)" },
  { label: "Couples", pct: 22, count: 784, topCuisine: "Italian", avgBudget: "฿฿฿", peakTime: "7-8pm", color: "hsl(189, 95%, 43%)" },
  { label: "Friends Group", pct: 18, count: 641, topCuisine: "Korean BBQ", avgBudget: "฿฿", peakTime: "6-8pm", color: "hsl(258, 90%, 66%)" },
  { label: "Families", pct: 15, count: 534, topCuisine: "Thai", avgBudget: "฿฿฿", peakTime: "11am-1pm", color: "hsl(160, 84%, 39%)" },
  { label: "Coworkers", pct: 10, count: 356, topCuisine: "Buffet", avgBudget: "฿฿", peakTime: "12-1pm", color: "hsl(38, 92%, 50%)" },
];

const ageData = [
  { label: "18-24", pct: 18 },
  { label: "25-34", pct: 38 },
  { label: "35-44", pct: 25 },
  { label: "45-54", pct: 12 },
  { label: "55+", pct: 7 },
];

const behavioralCohorts = [
  { label: "Power Users", freq: "10+/week", pct: 8, sessions: 14.2, swipes: 48, color: "hsl(239, 84%, 67%)" },
  { label: "Regular", freq: "3-9/week", pct: 32, sessions: 5.4, swipes: 22, color: "hsl(189, 95%, 43%)" },
  { label: "Casual", freq: "1-2/week", pct: 42, sessions: 1.6, swipes: 8, color: "hsl(258, 90%, 66%)" },
  { label: "Dormant", freq: "<1/week", pct: 18, sessions: 0.3, swipes: 2, color: "hsl(215, 16%, 47%)" },
];

const dayOfWeekActivity = [
  { day: "Mon", pct: 62 },
  { day: "Tue", pct: 55 },
  { day: "Wed", pct: 58 },
  { day: "Thu", pct: 65 },
  { day: "Fri", pct: 88 },
  { day: "Sat", pct: 95 },
  { day: "Sun", pct: 78 },
];

const peakHours = [
  { hour: "11am-12pm", pct: 45 },
  { hour: "12-1pm", pct: 82 },
  { hour: "1-2pm", pct: 60 },
  { hour: "5-6pm", pct: 55 },
  { hour: "6-7pm", pct: 78 },
  { hour: "7-8pm", pct: 90 },
  { hour: "8-9pm", pct: 68 },
];

const cuisineBySegment = [
  { cuisine: "Japanese", solo: 42, couples: 38, friends: 22, families: 15, coworkers: 18 },
  { cuisine: "Thai", solo: 28, couples: 20, friends: 30, families: 45, coworkers: 25 },
  { cuisine: "Korean BBQ", solo: 12, couples: 18, friends: 35, families: 12, coworkers: 22 },
  { cuisine: "Italian", solo: 15, couples: 35, friends: 10, families: 18, coworkers: 12 },
  { cuisine: "Buffet", solo: 8, couples: 10, friends: 28, families: 22, coworkers: 35 },
  { cuisine: "Cafe/Dessert", solo: 35, couples: 30, friends: 15, families: 8, coworkers: 10 },
];

const deliveryBySegment = [
  { segment: "Solo Diners", grab: 52, lineman: 35, foodpanda: 13, topPlatform: "Grab" },
  { segment: "Couples", grab: 44, lineman: 40, foodpanda: 16, topPlatform: "Grab" },
  { segment: "Friends Group", grab: 38, lineman: 42, foodpanda: 20, topPlatform: "LINE MAN" },
  { segment: "Families", grab: 48, lineman: 32, foodpanda: 20, topPlatform: "Grab" },
  { segment: "Coworkers", grab: 55, lineman: 30, foodpanda: 15, topPlatform: "Grab" },
];

const aiInsights = [
  "Couples prefer Japanese restaurants 2.3x more than average",
  "Power users order via Grab 67% of the time",
  "Friday-Saturday dinner sessions are 40% longer than weekday average",
  "Solo diners in the 25-34 age group have the highest retention rate at 82%",
];

export default function AdminUsers() {
  const { data: users = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ["/api/admin/users"],
  });

  const totalUsers = users.length || 3_562;

  return (
    <div data-testid="admin-users-page" className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Users className="w-5 h-5 text-foreground" />
        <span className="text-[15px] font-semibold text-foreground">User Insights Intelligence</span>
        <span
          className="bg-foreground text-white text-xs font-medium rounded-full px-3 py-0.5"
          data-testid="text-user-count"
        >
          {totalUsers.toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-demographics-kpis">
        <KpiCard icon={<Users className="w-4 h-4 text-indigo-500" />} label="Total Users" value={totalUsers.toLocaleString()} loading={isLoading} iconGradient="linear-gradient(135deg, hsl(230,50%,92%) 0%, hsl(240,45%,85%) 100%)" />
        <KpiCard icon={<Activity className="w-4 h-4 text-cyan-500" />} label="Active This Week" value="68%" sub="2,422 users" iconGradient="linear-gradient(135deg, hsl(185,50%,92%) 0%, hsl(195,45%,85%) 100%)" />
        <KpiCard icon={<BarChart3 className="w-4 h-4 text-violet-500" />} label="Avg Sessions/User" value="3.2" sub="per week" iconGradient="linear-gradient(135deg, hsl(260,50%,92%) 0%, hsl(270,45%,85%) 100%)" />
        <KpiCard icon={<TrendingUp className="w-4 h-4 text-green-500" />} label="Retention Rate" value="74%" sub="+3% vs last month" iconGradient="linear-gradient(135deg, hsl(145,50%,92%) 0%, hsl(155,45%,85%) 100%)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="section-gender-distribution">
          <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-4">Gender Distribution</h3>
          <div className="space-y-3">
            {genderData.map((g) => (
              <div key={g.label} className="flex items-center gap-3">
                <span className="w-16 text-sm text-muted-foreground">{g.label}</span>
                <div className="flex-1 bg-gray-100 dark:bg-muted rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center pl-3 text-xs font-medium text-white transition-all"
                    style={{ width: `${g.pct}%`, backgroundColor: g.color }}
                    data-testid={`bar-gender-${g.label.toLowerCase()}`}
                  >
                    {g.pct}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="section-age-demographics">
          <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-4">Age Demographics</h3>
          <div className="space-y-3">
            {ageData.map((a) => (
              <div key={a.label} className="flex items-center gap-3">
                <span className="w-16 text-sm text-muted-foreground">{a.label}</span>
                <div className="flex-1 bg-gray-100 dark:bg-muted rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center pl-3 text-xs font-medium text-white transition-all"
                    style={{ width: `${a.pct}%`, background: "linear-gradient(90deg, hsl(222, 47%, 20%), hsl(222, 47%, 35%))" }}
                    data-testid={`bar-age-${a.label}`}
                  >
                    {a.pct}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="section-user-type-segments">
        <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-4">User Type Segments</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {userTypeSegments.map((seg) => (
            <div
              key={seg.label}
              className="rounded-xl border border-gray-100 dark:border-border p-4 bg-white dark:bg-card"
              data-testid={`card-segment-${seg.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                <span className="text-sm font-medium text-foreground">{seg.label}</span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground mb-1">{seg.count.toLocaleString()}</div>
              <div className="w-full bg-gray-100 dark:bg-muted rounded-full h-2 mb-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${seg.pct}%`, backgroundColor: seg.color }} />
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between gap-1"><span>Top Cuisine</span><span className="font-medium text-foreground">{seg.topCuisine}</span></div>
                <div className="flex justify-between gap-1"><span>Avg Budget</span><span className="font-medium text-foreground">{seg.avgBudget}</span></div>
                <div className="flex justify-between gap-1"><span>Peak Time</span><span className="font-medium text-foreground">{seg.peakTime}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="section-behavioral-cohorts">
        <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-4">Behavioral Cohorts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {behavioralCohorts.map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-100 dark:border-border p-4 bg-white dark:bg-card" data-testid={`card-cohort-${c.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium text-foreground">{c.label}</span>
                <span className="text-xs font-medium rounded-full px-2 py-0.5" style={{ backgroundColor: c.color + "18", color: c.color }}>{c.freq}</span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground mb-1">{c.pct}%</div>
              <div className="w-full bg-gray-100 dark:bg-muted rounded-full h-2 mb-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${c.pct * 2}%`, backgroundColor: c.color }} />
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-1"><span>Avg Sessions</span><span className="font-medium text-foreground">{c.sessions}/wk</span></div>
                <div className="flex justify-between gap-1"><span>Avg Swipes</span><span className="font-medium text-foreground">{c.swipes}/wk</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="section-day-of-week">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Day-of-Week Activity</h3>
          </div>
          <div className="flex items-end gap-2 h-32">
            {dayOfWeekActivity.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-foreground">{d.pct}%</span>
                <div className="w-full bg-gray-100 dark:bg-muted rounded-md overflow-hidden" style={{ height: "100px" }}>
                  <div
                    className="w-full rounded-md mt-auto"
                    style={{
                      height: `${d.pct}%`,
                      background: "linear-gradient(180deg, hsl(222, 47%, 20%), hsl(222, 47%, 35%))",
                      marginTop: `${100 - d.pct}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="section-peak-hours">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-cyan-500" />
            <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Peak Hours</h3>
          </div>
          <div className="space-y-2">
            {peakHours.map((h) => (
              <div key={h.hour} className="flex items-center gap-3">
                <span className="w-24 text-xs text-muted-foreground">{h.hour}</span>
                <div className="flex-1 bg-gray-100 dark:bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${h.pct}%`, background: "linear-gradient(90deg, hsl(185, 90%, 45%), hsl(185, 80%, 55%))" }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-medium text-foreground">{h.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="section-cuisine-by-segment">
        <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-4">Cuisine Preferences by Segment</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-border">
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium bg-gray-50 dark:bg-muted">Cuisine</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium bg-gray-50 dark:bg-muted">Solo</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium bg-gray-50 dark:bg-muted">Couples</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium bg-gray-50 dark:bg-muted">Friends</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium bg-gray-50 dark:bg-muted">Families</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium bg-gray-50 dark:bg-muted">Coworkers</th>
              </tr>
            </thead>
            <tbody>
              {cuisineBySegment.map((row) => (
                <tr key={row.cuisine} className="border-b border-gray-100 dark:border-border" data-testid={`row-cuisine-${row.cuisine.toLowerCase().replace(/[/\s]+/g, "-")}`}>
                  <td className="py-2.5 px-3 font-medium text-foreground">{row.cuisine}</td>
                  {[row.solo, row.couples, row.friends, row.families, row.coworkers].map((val, i) => (
                    <td key={i} className="py-2.5 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-medium text-foreground">{val}%</span>
                        <div className="w-full max-w-[60px] bg-gray-100 dark:bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: userTypeSegments[i].color }} />
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="section-delivery-engagement">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-4 h-4 text-cyan-500" />
          <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Delivery App Engagement by Segment</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-border">
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium bg-gray-50 dark:bg-muted">Segment</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium bg-gray-50 dark:bg-muted">Grab</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium bg-gray-50 dark:bg-muted">LINE MAN</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium bg-gray-50 dark:bg-muted">Foodpanda</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium bg-gray-50 dark:bg-muted">Top Platform</th>
              </tr>
            </thead>
            <tbody>
              {deliveryBySegment.map((row) => (
                <tr key={row.segment} className="border-b border-gray-100 dark:border-border" data-testid={`row-delivery-${row.segment.toLowerCase().replace(/\s+/g, "-")}`}>
                  <td className="py-2.5 px-3 font-medium text-foreground">{row.segment}</td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-foreground">{row.grab}%</span>
                      <div className="w-full max-w-[60px] bg-gray-100 dark:bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.grab}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-foreground">{row.lineman}%</span>
                      <div className="w-full max-w-[60px] bg-gray-100 dark:bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${row.lineman}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-foreground">{row.foodpanda}%</span>
                      <div className="w-full max-w-[60px] bg-gray-100 dark:bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-rose-400" style={{ width: `${row.foodpanda}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center text-xs font-medium rounded-full px-2.5 py-0.5 bg-green-50 dark:bg-green-500/10 text-green-500">
                      {row.topPlatform}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-muted dark:to-muted rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="section-ai-insights">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-[#FFCC02]" />
          <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">AI-Generated Insights</h3>
          <span className="inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 bg-[#FFCC02]/15 text-foreground">
            <Zap className="w-3 h-3 mr-1 text-[#FFCC02]" />Auto
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {aiInsights.map((insight, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-xl p-3 bg-white dark:bg-card border border-gray-100 dark:border-border"
              data-testid={`text-ai-insight-${idx}`}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, hsl(222, 47%, 20%), hsl(222, 47%, 35%))" }}>
                <span className="text-white text-xs font-bold">{idx + 1}</span>
              </div>
              <span className="text-sm text-muted-foreground">{insight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  loading,
  iconGradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
  iconGradient?: string;
}) {
  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-muted" style={iconGradient ? { background: iconGradient } : undefined}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-gray-100 dark:bg-muted rounded animate-pulse" />
      ) : (
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
      )}
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
