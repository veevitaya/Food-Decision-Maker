import { useState } from "react";
import { FileText, Download, Calendar, Clock, TrendingUp, Users, ExternalLink, BarChart3, Eye, X, Loader2, Check } from "lucide-react";
import { getTintVar } from "./adminUtils";
import { useToast } from "@/hooks/use-toast";

const AVAILABLE_REPORTS = [
  { name: "Weekly Performance Summary", description: "KPIs, top restaurants, session metrics, clickout breakdown", frequency: "Weekly", lastGenerated: "Mar 8, 2026", format: "PDF", icon: BarChart3, color: "var(--admin-blue)" },
  { name: "Monthly Investor Report", description: "Growth metrics, user acquisition, revenue indicators, market penetration", frequency: "Monthly", lastGenerated: "Mar 1, 2026", format: "PDF", icon: TrendingUp, color: "var(--admin-deep-purple)" },
  { name: "Partner Attribution Report", description: "Clickouts by partner, restaurant performance, conversion rates", frequency: "Monthly", lastGenerated: "Mar 1, 2026", format: "CSV", icon: ExternalLink, color: "var(--admin-cyan)" },
  { name: "User Cohort Analysis", description: "Retention curves, engagement segments, churn risk indicators", frequency: "Monthly", lastGenerated: "Mar 1, 2026", format: "PDF", icon: Users, color: "var(--admin-pink)" },
  { name: "Owner Activity Report", description: "Portal logins, menu updates, claim status, tier usage", frequency: "Weekly", lastGenerated: "Mar 8, 2026", format: "CSV", icon: FileText, color: "var(--admin-teal)" },
  { name: "Data Quality Report", description: "Missing images, invalid links, stale data, completeness scores", frequency: "Daily", lastGenerated: "Today", format: "CSV", icon: BarChart3, color: "var(--admin-pink)" },
];

const REPORT_PREVIEW_DATA: Record<string, string[][]> = {
  "Weekly Performance Summary": [
    ["Metric", "This Week", "Last Week", "Change"],
    ["Active Users", "4,820", "4,210", "+14.5%"],
    ["Swipe Sessions", "11,150", "9,800", "+13.8%"],
    ["Clickouts", "420", "385", "+9.1%"],
    ["Avg Session Length", "3m 42s", "3m 18s", "+12.1%"],
    ["Top Restaurant", "Jay Fai", "Som Tam Nua", "—"],
  ],
  "Partner Attribution Report": [
    ["Partner", "Clickouts", "Revenue Share", "Conversion"],
    ["Grab", "186", "฿18,600", "34%"],
    ["LINE MAN", "148", "฿14,800", "28%"],
    ["Robinhood", "86", "฿8,600", "22%"],
  ],
  "Owner Activity Report": [
    ["Owner", "Logins", "Menu Updates", "Tier"],
    ["Jay Fai", "12", "3", "Premium"],
    ["Chen W.", "18", "5", "Enterprise"],
    ["Marcus W.", "8", "2", "Premium"],
    ["Somchai K.", "4", "1", "Basic"],
  ],
  "Data Quality Report": [
    ["Issue", "Count", "Severity", "Trend"],
    ["Missing Images", "342", "High", "+12"],
    ["Missing Tags", "267", "Medium", "-8"],
    ["No Price Listed", "189", "High", "+4"],
    ["Invalid Links", "84", "High", "-15"],
  ],
};

export default function AdminReports() {
  const [previewReport, setPreviewReport] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  const [scheduledReports, setScheduledReports] = useState([
    { name: "Weekly Summary", nextRun: "Mar 15, 2026", recipients: "team@toastbkk.com", enabled: true },
    { name: "Monthly Investor Report", nextRun: "Apr 1, 2026", recipients: "investors@toastbkk.com", enabled: true },
    { name: "Daily Data Quality", nextRun: "Tomorrow 6:00 AM", recipients: "ops@toastbkk.com", enabled: true },
    { name: "Partner Attribution", nextRun: "Apr 1, 2026", recipients: "partnerships@toastbkk.com", enabled: false },
  ]);
  const { toast } = useToast();

  const handleDownload = (reportName: string, format: string) => {
    setDownloadingReport(reportName);
    setTimeout(() => {
      const filename = `${reportName.toLowerCase().replace(/\s+/g, "-")}_${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`;
      let content = "";
      const preview = REPORT_PREVIEW_DATA[reportName];
      if (preview && format === "CSV") {
        content = preview.map(row => row.join(",")).join("\n");
      } else {
        content = `${reportName}\nGenerated: ${new Date().toLocaleString()}\n\nThis is a sample report file.\n`;
        if (preview) {
          content += "\n" + preview.map(row => row.join("\t")).join("\n");
        }
      }
      const blob = new Blob([content], { type: format === "CSV" ? "text/csv" : "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Report Downloaded", description: `${filename} has been saved` });
      setDownloadingReport(null);
    }, 1500);
  };

  const toggleScheduled = (name: string) => {
    setScheduledReports(prev => prev.map(s =>
      s.name === name ? { ...s, enabled: !s.enabled } : s
    ));
    const report = scheduledReports.find(s => s.name === name);
    toast({
      title: report?.enabled ? "Report Paused" : "Report Activated",
      description: `${name} schedule has been ${report?.enabled ? "paused" : "activated"}`
    });
  };

  const previewData = previewReport ? REPORT_PREVIEW_DATA[previewReport] : null;

  return (
    <div className="space-y-8" data-testid="admin-reports-page">
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5" style={{ color: "var(--admin-teal)" }} />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Reports</h2>
          <p className="text-xs text-muted-foreground">Generate, schedule, and download reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3" data-testid="card-available-reports">
          <div className="border-l-[3px] pl-3" style={{ borderColor: "var(--admin-teal)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Available Reports</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Download or regenerate</p>
          </div>
          {AVAILABLE_REPORTS.map(report => (
            <div key={report.name} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: getTintVar(report.color) }}>
                  <report.icon className="w-5 h-5" style={{ color: report.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-800">{report.name}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{report.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{report.frequency}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{report.lastGenerated}</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 font-medium">{report.format}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {REPORT_PREVIEW_DATA[report.name] && (
                    <button
                      onClick={() => setPreviewReport(report.name)}
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                      data-testid={`btn-preview-${report.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(report.name, report.format)}
                    disabled={downloadingReport === report.name}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    data-testid={`btn-download-${report.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {downloadingReport === report.name ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                    ) : (
                      <><Download className="w-3.5 h-3.5" /> Download</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-scheduled-reports">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-blue)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Scheduled Reports</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Auto-generated & emailed</p>
            </div>
            <div className="space-y-2.5">
              {scheduledReports.map(s => (
                <div key={s.name} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.enabled ? "bg-emerald-400" : "bg-gray-300"}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                    <div className="flex gap-2 mt-0.5 text-[10px] text-gray-400">
                      <span>Next: {s.nextRun}</span>
                      <span>To: {s.recipients}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleScheduled(s.name)}
                    className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border transition-colors ${s.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"}`}
                    data-testid={`btn-toggle-schedule-${s.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {s.enabled ? "Active" : "Paused"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-custom-report">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-deep-purple)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Custom Report Builder</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Build your own</p>
            </div>
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Drag-and-drop report builder</p>
              <p className="text-xs text-gray-400 mb-4">Select metrics, date ranges, and segments to build custom reports</p>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-purple-600 bg-purple-50 rounded-full px-3 py-1.5">
                <Clock className="w-3 h-3" />
                Phase 2 — Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>

      {previewReport && previewData && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" data-testid="preview-modal">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--admin-teal-10)] flex items-center justify-center" style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}>
                  <Eye className="w-4 h-4" style={{ color: "var(--admin-teal)" }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Report Preview</h3>
                  <p className="text-[10px] text-gray-400">{previewReport}</p>
                </div>
              </div>
              <button onClick={() => setPreviewReport(null)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200" data-testid="btn-close-preview">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {previewData[0].map((header, i) => (
                      <th key={i} className="text-left py-2 px-3 text-xs uppercase tracking-wider text-gray-400 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(1).map((row, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {row.map((cell, j) => (
                        <td key={j} className="py-2.5 px-3 text-sm text-gray-700">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
              <p className="text-[10px] text-gray-400">Showing sample data — full report contains complete dataset</p>
              <button
                onClick={() => {
                  const report = AVAILABLE_REPORTS.find(r => r.name === previewReport);
                  if (report) handleDownload(report.name, report.format);
                  setPreviewReport(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[var(--admin-blue)] text-white rounded-lg hover:opacity-90 transition-colors"
                data-testid="btn-preview-download"
              >
                <Download className="w-3.5 h-3.5" /> Download Full Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
