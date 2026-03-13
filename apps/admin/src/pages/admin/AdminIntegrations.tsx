import { useState } from "react";
import { Plug, CheckCircle, AlertCircle, Clock, RefreshCw, ExternalLink, Zap, Shield, Key, Loader2, X, ToggleRight, ToggleLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INTEGRATIONS_INIT = [
  { name: "LINE LIFF", status: "connected" as const, lastSync: "Real-time", description: "User auth, profile data, rich menus", appId: "2009293021-mFgkOhqd", health: 99.8, canDisable: true },
  { name: "LINE Official Account", status: "connected" as const, lastSync: "Real-time", description: "Messaging, push notifications, friend tracking", appId: "2009335625-Pyd3rjhr", health: 99.5, canDisable: true },
  { name: "Grab", status: "connected" as const, lastSync: "4h ago", description: "Deep links for food delivery", appId: "Partner deeplink", health: 98.2, canDisable: true },
  { name: "LINE MAN", status: "connected" as const, lastSync: "4h ago", description: "Deep links for food delivery", appId: "Partner deeplink", health: 97.8, canDisable: true },
  { name: "Robinhood", status: "connected" as const, lastSync: "4h ago", description: "Deep links for food delivery", appId: "Partner deeplink", health: 96.1, canDisable: true },
  { name: "Google Places API", status: "connected" as const, lastSync: "2h ago", description: "Restaurant data, ratings, photos", appId: "API Key", health: 99.9, canDisable: true },
  { name: "Leaflet / OpenStreetMap", status: "connected" as const, lastSync: "Real-time", description: "Map tiles and geocoding", appId: "Public API", health: 99.7, canDisable: false },
  { name: "Stripe", status: "planned" as const, lastSync: "—", description: "Owner subscription payments", appId: "—", health: 0, canDisable: false },
  { name: "Google Analytics", status: "planned" as const, lastSync: "—", description: "Web analytics and event tracking", appId: "—", health: 0, canDisable: false },
];

const WEBHOOK_LOGS = [
  { event: "LINE LIFF login", timestamp: "2 min ago", status: "success" as const, payload: "user_profile" },
  { event: "Grab deeplink click", timestamp: "8 min ago", status: "success" as const, payload: "clickout_event" },
  { event: "LINE MAN deeplink click", timestamp: "12 min ago", status: "success" as const, payload: "clickout_event" },
  { event: "Google Places sync", timestamp: "2h ago", status: "success" as const, payload: "batch_412_records" },
  { event: "Image CDN upload", timestamp: "3h ago", status: "warning" as const, payload: "timeout_retry" },
  { event: "Menu scraper run", timestamp: "12h ago", status: "success" as const, payload: "2847_items" },
];

const API_USAGE = [
  { api: "Google Places", used: 8420, limit: 10000, unit: "calls/day" },
  { api: "LINE Messaging", used: 1240, limit: 5000, unit: "messages/mo" },
  { api: "Leaflet Tiles", used: 24800, limit: 50000, unit: "tiles/day" },
];

export default function AdminIntegrations() {
  const [tab, setTab] = useState<"services" | "webhooks" | "api">("services");
  const [integrations, setIntegrations] = useState(INTEGRATIONS_INIT);
  const [syncingName, setSyncingName] = useState<string | null>(null);
  const [detailIntegration, setDetailIntegration] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSync = (name: string) => {
    setSyncingName(name);
    setTimeout(() => {
      toast({ title: "Sync Complete", description: `${name} has been synced successfully` });
      setSyncingName(null);
    }, 2000);
  };

  const toggleIntegration = (name: string) => {
    setIntegrations(prev => prev.map(i => {
      if (i.name !== name) return i;
      const newStatus = i.status === "connected" ? "planned" as const : "connected" as const;
      toast({
        title: newStatus === "connected" ? "Integration Enabled" : "Integration Disabled",
        description: `${name} has been ${newStatus === "connected" ? "enabled" : "disabled"}`
      });
      return { ...i, status: newStatus, health: newStatus === "connected" ? 99.0 : 0 };
    }));
  };

  const detail = integrations.find(i => i.name === detailIntegration);

  return (
    <div className="space-y-8" data-testid="admin-integrations-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Plug className="w-5 h-5" style={{ color: "var(--admin-cyan)" }} />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Integrations</h2>
            <p className="text-xs text-muted-foreground">Connected services, API usage, and webhook activity</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["services", "webhooks", "api"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all capitalize ${tab === t ? "bg-white text-gray-800 shadow-sm" : "text-muted-foreground hover:text-foreground"}`} data-testid={`tab-${t}`}>
              {t === "services" ? "Services" : t === "webhooks" ? "Webhook Logs" : "API Usage"}
            </button>
          ))}
        </div>
      </div>

      {tab === "services" && (
        <div className="space-y-3">
          {integrations.map(integration => (
            <div key={integration.name} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-colors" data-testid={`integration-${integration.name.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  integration.status === "connected" ? "bg-emerald-50" : "bg-gray-100"
                }`}>
                  {integration.status === "connected" ?
                    <Zap className="w-5 h-5 text-emerald-500" /> :
                    <Clock className="w-5 h-5 text-gray-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{integration.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      integration.status === "connected" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}>{integration.status}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{integration.description}</p>
                </div>
                {integration.status === "connected" && (
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${integration.health}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-600">{integration.health}%</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Last: {integration.lastSync}</span>
                  </div>
                )}
                <div className="flex gap-1.5">
                  {integration.canDisable && (
                    <button
                      onClick={() => toggleIntegration(integration.name)}
                      className="flex-shrink-0"
                      data-testid={`btn-toggle-${integration.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {integration.status === "connected" ? (
                        <ToggleRight className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-300" />
                      )}
                    </button>
                  )}
                  {integration.status === "connected" && (
                    <button
                      onClick={() => handleSync(integration.name)}
                      disabled={syncingName === integration.name}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                      data-testid={`btn-sync-${integration.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {syncingName === integration.name ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Syncing...</>
                      ) : (
                        <><RefreshCw className="w-3 h-3" /> Sync</>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setDetailIntegration(integration.name)}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors"
                    data-testid={`btn-detail-${integration.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "webhooks" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-webhook-logs">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-blue)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Recent Activity</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Inbound & outbound events</p>
          </div>
          <div className="space-y-2">
            {WEBHOOK_LOGS.map((log, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === "success" ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span className="flex-1 text-sm text-gray-700">{log.event}</span>
                <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{log.payload}</span>
                <span className="text-xs text-gray-400 w-20 text-right">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "api" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-api-usage">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-teal)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">API Usage</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Current billing period</p>
          </div>
          <div className="space-y-4">
            {API_USAGE.map(api => {
              const usagePct = (api.used / api.limit) * 100;
              return (
                <div key={api.api} className="p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800">{api.api}</span>
                    <span className="text-xs text-gray-500">{api.used.toLocaleString()} / {api.limit.toLocaleString()} {api.unit}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${usagePct}%`,
                      backgroundColor: usagePct > 90 ? "#F43F5E" : usagePct > 70 ? "#F59E0B" : "#10B981",
                    }} />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className={`text-[10px] font-medium ${usagePct > 90 ? "text-red-500" : usagePct > 70 ? "text-amber-600" : "text-emerald-600"}`}>
                      {usagePct.toFixed(1)}% used
                    </span>
                    <span className="text-[10px] text-gray-400">{(api.limit - api.used).toLocaleString()} remaining</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {detailIntegration && detail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" data-testid="integration-detail-modal">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${detail.status === "connected" ? "bg-emerald-50" : "bg-gray-100"}`}>
                  {detail.status === "connected" ? <Zap className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-gray-400" />}
                </div>
                <h3 className="text-sm font-semibold text-gray-800">{detail.name}</h3>
              </div>
              <button onClick={() => setDetailIntegration(null)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200" data-testid="btn-close-detail">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Description</p>
                <p className="text-sm text-gray-700">{detail.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                  <span className={`text-sm font-medium ${detail.status === "connected" ? "text-emerald-600" : "text-gray-500"}`}>{detail.status}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Health</p>
                  <span className="text-sm font-medium text-gray-700">{detail.health > 0 ? `${detail.health}%` : "N/A"}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">App ID</p>
                  <span className="text-xs font-mono text-gray-600 break-all">{detail.appId}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Sync</p>
                  <span className="text-sm font-medium text-gray-700">{detail.lastSync}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setDetailIntegration(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors rounded-lg" data-testid="btn-close-detail-bottom">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
