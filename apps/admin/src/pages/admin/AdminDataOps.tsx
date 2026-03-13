import { useState } from "react";
import { Database, AlertTriangle, CheckCircle, Search, RefreshCw, Trash2, Image, Tag, DollarSign, Link2, Clock, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DATA_ISSUES = [
  { category: "Missing Images", count: 342, severity: "high" as const, icon: Image, action: "Review & add images" },
  { category: "Missing Tags", count: 267, severity: "medium" as const, icon: Tag, action: "Auto-assign tags" },
  { category: "No Price Listed", count: 189, severity: "high" as const, icon: DollarSign, action: "Request from owners" },
  { category: "Invalid Links", count: 84, severity: "high" as const, icon: Link2, action: "Validate & fix URLs" },
  { category: "Duplicate Restaurants", count: 23, severity: "medium" as const, icon: Trash2, action: "Merge duplicates" },
  { category: "Stale Data (>90d)", count: 78, severity: "low" as const, icon: Clock, action: "Trigger sync" },
];

const SYNC_STATUS = [
  { source: "Google Places API", lastSync: "2h ago", records: 412, status: "healthy" as const, nextSync: "In 4h" },
  { source: "Owner Submissions", lastSync: "Live", records: 48, status: "healthy" as const, nextSync: "Real-time" },
  { source: "Menu Scraper", lastSync: "12h ago", records: 2847, status: "warning" as const, nextSync: "In 12h" },
  { source: "Image CDN", lastSync: "1d ago", records: 8420, status: "healthy" as const, nextSync: "Daily" },
];

const VALIDATION_RULES = [
  { rule: "Restaurant has at least 1 image", passing: 358, failing: 54, total: 412 },
  { rule: "Menu items have prices", passing: 2658, failing: 189, total: 2847 },
  { rule: "Operating hours are set", passing: 380, failing: 32, total: 412 },
  { rule: "Delivery links are valid", passing: 328, failing: 84, total: 412 },
  { rule: "Category tags assigned", passing: 345, failing: 67, total: 412 },
];

const BULK_ACTIONS = [
  { label: "Auto-assign missing vibe tags", desc: "Uses keyword + price + hours logic", icon: Tag, confirmMsg: "This will auto-assign vibe tags to 267 restaurants with missing tags based on keywords, price levels, and operating hours.", successMsg: "Auto-assigned vibe tags to 267 restaurants" },
  { label: "Validate all delivery URLs", desc: "Check Grab/LINE MAN/Robinhood links", icon: Link2, confirmMsg: "This will validate all 412 restaurant delivery URLs across Grab, LINE MAN, and Robinhood platforms.", successMsg: "Validated 328 URLs — 84 flagged as invalid" },
  { label: "Flag stale restaurants", desc: "Mark records not updated in 90+ days", icon: Clock, confirmMsg: "This will scan all restaurants and flag those not updated in the last 90 days.", successMsg: "Flagged 78 restaurants as stale (>90 days without update)" },
  { label: "Merge duplicate entries", desc: "Find & merge by name + location proximity", icon: Trash2, confirmMsg: "This will identify potential duplicate restaurants based on name similarity and location proximity within 100m. Found duplicates will be queued for manual review.", successMsg: "Found 23 potential duplicates — queued for review" },
  { label: "Re-sync Google Places data", desc: "Pull latest info for all restaurants", icon: RefreshCw, confirmMsg: "This will re-sync data from Google Places API for all 412 restaurants. This may take a few minutes.", successMsg: "Re-synced 412 restaurants from Google Places" },
];

export default function AdminDataOps() {
  const [activeTab, setActiveTab] = useState<"issues" | "sync" | "validation">("issues");
  const [confirmDialog, setConfirmDialog] = useState<{ label: string; message: string; successMsg: string } | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [syncingSource, setSyncingSource] = useState<string | null>(null);
  const { toast } = useToast();

  const handleBulkAction = (action: typeof BULK_ACTIONS[0]) => {
    setConfirmDialog({ label: action.label, message: action.confirmMsg, successMsg: action.successMsg });
  };

  const executeAction = () => {
    if (!confirmDialog) return;
    setRunningAction(confirmDialog.label);
    setConfirmDialog(null);
    setTimeout(() => {
      toast({ title: "Action Complete", description: confirmDialog.successMsg });
      setRunningAction(null);
    }, 2000);
  };

  const handleSyncNow = (source: string) => {
    setSyncingSource(source);
    setTimeout(() => {
      toast({ title: "Sync Complete", description: `${source} data has been synced successfully` });
      setSyncingSource(null);
    }, 2500);
  };

  const handleRunValidation = (rule: string) => {
    toast({ title: "Validation Running", description: `Re-running validation: "${rule}"` });
  };

  return (
    <div className="space-y-8" data-testid="admin-data-ops-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5" style={{ color: "var(--admin-blue)" }} />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Data Ops</h2>
            <p className="text-xs text-muted-foreground">Data quality, sync management, and validation tools</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["issues", "sync", "validation"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all capitalize ${activeTab === t ? "bg-white text-gray-800 shadow-sm" : "text-muted-foreground hover:text-foreground"}`} data-testid={`tab-${t}`}>
              {t === "issues" ? "Issues" : t === "sync" ? "Sync Status" : "Validation"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "issues" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-data-issues">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-pink)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Data Quality Issues</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{DATA_ISSUES.reduce((s, i) => s + i.count, 0)} total issues</p>
            </div>
            <div className="space-y-2.5">
              {DATA_ISSUES.map(issue => (
                <div key={issue.category} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                    backgroundColor: issue.severity === "high" ? "rgba(244, 63, 94, 0.1)" : issue.severity === "medium" ? "rgba(245, 158, 11, 0.1)" : "rgba(139, 92, 246, 0.1)",
                  }}>
                    <issue.icon className="w-4 h-4" style={{
                      color: issue.severity === "high" ? "#F43F5E" : issue.severity === "medium" ? "#F59E0B" : "#8B5CF6",
                    }} />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-800">{issue.category}</span>
                    <p className="text-[10px] text-gray-400">{issue.action}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{issue.count}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    issue.severity === "high" ? "bg-red-50 text-red-600" : issue.severity === "medium" ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-600"
                  }`}>{issue.severity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-quick-actions">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-blue)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Bulk Actions</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Quick fixes</p>
            </div>
            <div className="space-y-3">
              {BULK_ACTIONS.map(action => (
                <button
                  key={action.label}
                  onClick={() => handleBulkAction(action)}
                  disabled={runningAction === action.label}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left disabled:opacity-60"
                  data-testid={`btn-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {runningAction === action.label ? (
                    <Loader2 className="w-4 h-4 text-blue-500 flex-shrink-0 animate-spin" />
                  ) : (
                    <action.icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-800">{action.label}</span>
                    <p className="text-[10px] text-gray-400">{action.desc}</p>
                  </div>
                  {runningAction === action.label && (
                    <span className="text-[10px] font-medium text-blue-500">Running...</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "sync" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-sync-status">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-cyan)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Sync Status</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Data source health</p>
          </div>
          <div className="space-y-3">
            {SYNC_STATUS.map(s => (
              <div key={s.source} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.status === "healthy" ? "bg-emerald-400" : s.status === "warning" ? "bg-amber-400" : "bg-red-400"}`} />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">{s.source}</span>
                  <div className="flex gap-3 mt-0.5 text-[10px] text-gray-400">
                    <span>Last sync: {s.lastSync}</span>
                    <span>Records: {s.records.toLocaleString()}</span>
                    <span>Next: {s.nextSync}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSyncNow(s.source)}
                  disabled={syncingSource === s.source}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  data-testid={`btn-sync-${s.source.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {syncingSource === s.source ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Syncing...</>
                  ) : (
                    <><RefreshCw className="w-3 h-3" /> Sync Now</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "validation" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-validation">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-teal)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Validation Rules</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Data completeness checks</p>
          </div>
          <div className="space-y-3">
            {VALIDATION_RULES.map(r => {
              const passRate = Math.round((r.passing / r.total) * 100);
              return (
                <div key={r.rule} className="p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-800">{r.rule}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${passRate >= 90 ? "text-emerald-600" : passRate >= 70 ? "text-amber-600" : "text-red-500"}`}>{passRate}%</span>
                      <button
                        onClick={() => handleRunValidation(r.rule)}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                        data-testid={`btn-revalidate-${r.rule.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        Re-run
                      </button>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${passRate}%`,
                      backgroundColor: passRate >= 90 ? "#10B981" : passRate >= 70 ? "#F59E0B" : "#F43F5E",
                    }} />
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[10px] text-gray-400">
                    <span className="text-emerald-600">{r.passing} passing</span>
                    <span className="text-red-500">{r.failing} failing</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" data-testid="confirm-dialog">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">Confirm Action</h3>
              </div>
              <button onClick={() => setConfirmDialog(null)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200" data-testid="btn-close-confirm">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm font-medium text-gray-800 mb-2">{confirmDialog.label}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors rounded-lg" data-testid="btn-cancel-action">Cancel</button>
              <button onClick={executeAction} className="px-4 py-2 text-sm font-semibold bg-[var(--admin-blue)] text-white rounded-lg hover:opacity-90 transition-colors" data-testid="btn-confirm-action">Run Action</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
