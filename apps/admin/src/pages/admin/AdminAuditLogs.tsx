import { useState } from "react";
import { ScrollText, Search, Filter, User, Settings, Database, Shield, Clock, ChevronDown, Download, X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LogLevel = "all" | "info" | "warning" | "critical";

const AUDIT_ENTRIES = [
  { id: "AL-1842", actor: "admin", action: "Updated restaurant", target: "Jay Fai (ID: 40)", level: "info" as const, timestamp: "2026-03-11 14:23", ip: "203.113.xx.xx", details: "Changed operating hours" },
  { id: "AL-1841", actor: "admin", action: "Verified owner", target: "Somchai K. (ID: 2)", level: "info" as const, timestamp: "2026-03-11 13:45", ip: "203.113.xx.xx", details: "Approved claim for Som Tam Nua" },
  { id: "AL-1840", actor: "system", action: "Data sync completed", target: "Google Places API", level: "info" as const, timestamp: "2026-03-11 12:00", ip: "system", details: "412 records synced" },
  { id: "AL-1839", actor: "admin", action: "Deleted duplicate", target: "Restaurant ID: 187", level: "warning" as const, timestamp: "2026-03-11 10:15", ip: "203.113.xx.xx", details: "Merged into ID: 42" },
  { id: "AL-1838", actor: "system", action: "Failed API call", target: "Menu Scraper", level: "warning" as const, timestamp: "2026-03-11 06:00", ip: "system", details: "Timeout after 30s, retried" },
  { id: "AL-1837", actor: "admin", action: "Changed admin password", target: "admin account", level: "critical" as const, timestamp: "2026-03-10 22:30", ip: "203.113.xx.xx", details: "Password updated" },
  { id: "AL-1836", actor: "owner", action: "Updated menu", target: "Jay Fai → Pad Thai Goong", level: "info" as const, timestamp: "2026-03-10 18:45", ip: "118.174.xx.xx", details: "Price changed ฿350 → ฿380" },
  { id: "AL-1835", actor: "system", action: "Database backup", target: "PostgreSQL", level: "info" as const, timestamp: "2026-03-10 04:00", ip: "system", details: "Full backup completed (2.4GB)" },
  { id: "AL-1834", actor: "admin", action: "Rejected owner claim", target: "Pim T. (ID: 7)", level: "warning" as const, timestamp: "2026-03-09 16:20", ip: "203.113.xx.xx", details: "Insufficient documentation" },
  { id: "AL-1833", actor: "system", action: "Rate limit triggered", target: "Google Places API", level: "critical" as const, timestamp: "2026-03-09 14:10", ip: "system", details: "8,500/10,000 daily limit reached" },
];

const SUMMARY_STATS = [
  { label: "Total Events", value: "1,842", period: "All time" },
  { label: "Today", value: "6", period: "Since midnight" },
  { label: "Warnings", value: "12", period: "Last 7 days" },
  { label: "Critical", value: "3", period: "Last 7 days" },
];

export default function AdminAuditLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel>("all");
  const [detailEntry, setDetailEntry] = useState<typeof AUDIT_ENTRIES[0] | null>(null);
  const { toast } = useToast();

  const filtered = AUDIT_ENTRIES.filter(e => {
    const matchSearch = !searchQuery || e.action.toLowerCase().includes(searchQuery.toLowerCase()) || e.target.toLowerCase().includes(searchQuery.toLowerCase()) || e.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLevel = levelFilter === "all" || e.level === levelFilter;
    return matchSearch && matchLevel;
  });

  const handleExport = () => {
    const csv = [
      "ID,Timestamp,Actor,Action,Target,Level,Details,IP",
      ...filtered.map(e => `${e.id},${e.timestamp},${e.actor},${e.action},"${e.target}",${e.level},"${e.details}",${e.ip}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Audit Logs Exported", description: `${filtered.length} entries saved as CSV` });
  };

  return (
    <div className="space-y-8" data-testid="admin-audit-logs-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ScrollText className="w-5 h-5" style={{ color: "var(--admin-deep-purple)" }} />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Audit Logs</h2>
            <p className="text-xs text-muted-foreground">Complete activity trail for admin actions, system events, and data changes</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          data-testid="btn-export-logs"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SUMMARY_STATS.map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
            <p className="text-[10px] text-gray-400">{stat.period}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-audit-log-list">
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="border-l-[3px] pl-3" style={{ borderColor: "var(--admin-deep-purple)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Activity Log</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Chronological event feed</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Search logs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-56 focus:outline-none focus:ring-2 focus:ring-purple-100" data-testid="input-search-audit" />
            </div>
            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value as LogLevel)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none" data-testid="select-level-filter">
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          {filtered.map(entry => (
            <div
              key={entry.id}
              onClick={() => setDetailEntry(entry)}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border-l-2 cursor-pointer"
              style={{
                borderColor: entry.level === "critical" ? "#F43F5E" : entry.level === "warning" ? "#F59E0B" : "transparent",
              }}
              data-testid={`audit-entry-${entry.id}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                entry.actor === "admin" ? "bg-blue-50" : entry.actor === "owner" ? "bg-purple-50" : "bg-gray-100"
              }`}>
                {entry.actor === "admin" ? <Shield className="w-3.5 h-3.5 text-blue-500" /> :
                 entry.actor === "owner" ? <User className="w-3.5 h-3.5 text-purple-500" /> :
                 <Settings className="w-3.5 h-3.5 text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">{entry.action}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    entry.level === "critical" ? "bg-red-50 text-red-600" : entry.level === "warning" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"
                  }`}>{entry.level}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{entry.target}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{entry.details}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-gray-400 font-mono">{entry.timestamp}</p>
                <p className="text-[10px] text-gray-300">{entry.ip}</p>
                <span className="text-[10px] font-mono text-gray-300">{entry.id}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {detailEntry && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" data-testid="audit-detail-modal">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  detailEntry.actor === "admin" ? "bg-blue-50" : detailEntry.actor === "owner" ? "bg-purple-50" : "bg-gray-100"
                }`}>
                  {detailEntry.actor === "admin" ? <Shield className="w-4 h-4 text-blue-500" /> :
                   detailEntry.actor === "owner" ? <User className="w-4 h-4 text-purple-500" /> :
                   <Settings className="w-4 h-4 text-gray-400" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{detailEntry.action}</h3>
                  <p className="text-[10px] text-gray-400">{detailEntry.id}</p>
                </div>
              </div>
              <button onClick={() => setDetailEntry(null)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200" data-testid="btn-close-audit-detail">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Actor</p><p className="text-xs text-gray-700 capitalize">{detailEntry.actor}</p></div>
                <div className="p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Level</p><span className={`text-xs font-medium ${detailEntry.level === "critical" ? "text-red-500" : detailEntry.level === "warning" ? "text-amber-600" : "text-gray-500"}`}>{detailEntry.level}</span></div>
                <div className="p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Timestamp</p><p className="text-xs text-gray-700 font-mono">{detailEntry.timestamp}</p></div>
                <div className="p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">IP Address</p><p className="text-xs text-gray-700 font-mono">{detailEntry.ip}</p></div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Target</p><p className="text-sm text-gray-700">{detailEntry.target}</p></div>
              <div className="p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Details</p><p className="text-sm text-gray-700">{detailEntry.details}</p></div>
            </div>
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setDetailEntry(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
