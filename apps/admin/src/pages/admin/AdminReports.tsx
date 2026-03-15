import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Download, Calendar, Clock, TrendingUp, Users,
  ExternalLink, BarChart3, Eye, X, Loader2,
} from "lucide-react";
import { getTintVar } from "./adminUtils";
import { useToast } from "@/hooks/use-toast";

type ReportType = "weekly-performance" | "partner-attribution" | "owner-activity" | "data-quality";

interface ReportData {
  title: string;
  rows: string[][];
  generatedAt: string;
}

const REPORT_DEFS = [
  {
    id: "weekly-performance" as ReportType,
    name: "Weekly Performance Summary",
    description: "KPIs, top restaurants, session metrics, clickout breakdown",
    frequency: "Weekly",
    format: "CSV",
    icon: BarChart3,
    color: "var(--admin-blue)",
  },
  {
    id: "partner-attribution" as ReportType,
    name: "Partner Attribution Report",
    description: "Clickouts by partner (Grab, LINE MAN, Robinhood) with share %",
    frequency: "Monthly",
    format: "CSV",
    icon: ExternalLink,
    color: "var(--admin-cyan)",
  },
  {
    id: "owner-activity" as ReportType,
    name: "Owner Activity Report",
    description: "Portal logins, menu updates per restaurant owner",
    frequency: "Weekly",
    format: "CSV",
    icon: FileText,
    color: "var(--admin-teal)",
  },
  {
    id: "data-quality" as ReportType,
    name: "Data Quality Report",
    description: "Missing images, phone, opening hours, categories per restaurant",
    frequency: "Daily",
    format: "CSV",
    icon: BarChart3,
    color: "var(--admin-pink)",
  },
  {
    id: null,
    name: "Monthly Investor Report",
    description: "Growth metrics, user acquisition, revenue indicators — requires partner API integration",
    frequency: "Monthly",
    format: "PDF",
    icon: TrendingUp,
    color: "var(--admin-deep-purple)",
  },
  {
    id: null,
    name: "User Cohort Analysis",
    description: "Retention curves, engagement segments — requires longitudinal tracking",
    frequency: "Monthly",
    format: "PDF",
    icon: Users,
    color: "var(--admin-pink)",
  },
] as const;

export default function AdminReports() {
  const [previewType, setPreviewType] = useState<ReportType | null>(null);
  const [downloadingId, setDownloadingId] = useState<ReportType | null>(null);
  const { toast } = useToast();

  const { data: previewData, isLoading: loadingPreview } = useQuery<ReportData>({
    queryKey: ["/api/admin/reports/generate", previewType],
    queryFn: async () => {
      const res = await fetch(`/api/admin/reports/generate?type=${previewType}&days=7`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!previewType,
  });

  const handleDownload = async (id: ReportType, format: string) => {
    setDownloadingId(id);
    try {
      const res = await fetch(`/api/admin/reports/generate?type=${id}&days=30`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const data: ReportData = await res.json();
      const content = data.rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
      const filename = `${id}_${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`;
      const blob = new Blob([content], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast({ title: "Report Downloaded", description: `${filename} saved` });
    } catch {
      toast({ title: "Download Failed", description: "Could not generate report", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-8" data-testid="admin-reports-page">
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5" style={{ color: "var(--admin-teal)" }} />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Reports</h2>
          <p className="text-xs text-muted-foreground">Generate and download reports from live data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Available Reports */}
        <div className="space-y-3" data-testid="card-available-reports">
          <div className="border-l-[3px] pl-3" style={{ borderColor: "var(--admin-teal)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Available Reports</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Live data — download or preview</p>
          </div>
          {REPORT_DEFS.map(report => {
            const isLive = report.id !== null;
            return (
              <div key={report.name} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: getTintVar(report.color) }}>
                    <report.icon className="w-5 h-5" style={{ color: report.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{report.name}</span>
                      {!isLive && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">Needs Integration</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{report.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{report.frequency}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />On demand</span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 font-medium">{report.format}</span>
                    </div>
                  </div>
                  {isLive && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setPreviewType(report.id as ReportType)}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                        data-testid={`btn-preview-${report.id}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownload(report.id as ReportType, report.format)}
                        disabled={downloadingId === report.id}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                        data-testid={`btn-download-${report.id}`}
                      >
                        {downloadingId === report.id
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                          : <><Download className="w-3.5 h-3.5" /> Download</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          {/* Scheduled Reports — config-only UI until email service is wired */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-scheduled-reports">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-blue)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Scheduled Reports</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Auto-generated & emailed</p>
            </div>
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
              <Clock className="w-6 h-6 opacity-30" />
              <span className="text-sm">Email scheduling not yet configured</span>
              <span className="text-xs text-gray-400">Connect an email service to enable auto-delivery of reports</span>
            </div>
          </div>

          {/* Custom Report Builder */}
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

      {/* Preview Modal */}
      {previewType && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" data-testid="preview-modal">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
                  <Eye className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Report Preview</h3>
                  <p className="text-[10px] text-gray-400">{previewData?.title ?? "Loading…"}</p>
                </div>
              </div>
              <button onClick={() => setPreviewType(null)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200" data-testid="btn-close-preview">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-x-auto min-h-[140px]">
              {loadingPreview ? (
                <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : previewData ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {previewData.rows[0]?.map((header, i) => (
                        <th key={i} className="text-left py-2 px-3 text-xs uppercase tracking-wider text-gray-400 font-medium">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.slice(1).map((row, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        {row.map((cell, j) => (
                          <td key={j} className="py-2.5 px-3 text-sm text-gray-700">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
              <p className="text-[10px] text-gray-400">
                {previewData ? `Generated ${new Date(previewData.generatedAt).toLocaleString()} · live data` : ""}
              </p>
              <button
                onClick={() => { handleDownload(previewType, "CSV"); setPreviewType(null); }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition-colors"
                style={{ backgroundColor: "var(--admin-blue)" }}
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
