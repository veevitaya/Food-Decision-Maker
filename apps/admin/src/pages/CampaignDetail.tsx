import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useRoute } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, Clock, MapPin, ChevronRight, X, Copy, Check, Shield } from "lucide-react";
import { MOCK_HOME_CAMPAIGNS, MOCK_RESTAURANT_CAMPAIGNS, getDealLabel } from "@/components/CampaignBanner";

function getAllCampaigns() {
  const all = [...MOCK_HOME_CAMPAIGNS];
  const restaurantIds = Object.keys(MOCK_RESTAURANT_CAMPAIGNS).map(Number);
  for (const rid of restaurantIds) {
    for (const c of MOCK_RESTAURANT_CAMPAIGNS[rid]) {
      if (!all.some(existing => existing.id === c.id)) {
        all.push(c);
      }
    }
  }
  return all;
}

function getDaysLeft(endDate: string) {
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "Ends today";
  if (diff === 1) return "1 day left";
  if (diff <= 7) return `${diff} days left`;
  return `${Math.ceil(diff / 7)} weeks left`;
}

function getConditions(dealType: string): string[] {
  const base = ["Valid for dine-in only", "Cannot be combined with other promotions", "Subject to availability"];
  if (dealType === "bogo") return ["Both items must be of equal or lesser value", ...base];
  if (dealType === "percentage") return ["Applies to food items only (excludes beverages)", ...base];
  if (dealType === "fixedAmount") return ["Minimum spend may apply", ...base];
  return ["While supplies last", ...base];
}

function generateRedemptionCode(campaignId: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let hash = 0;
  for (let i = 0; i < campaignId.length; i++) {
    hash = ((hash << 5) - hash) + campaignId.charCodeAt(i);
    hash |= 0;
  }
  const dateSeed = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const combined = `${Math.abs(hash)}${dateSeed}`;
  let code = "TST-";
  for (let i = 0; i < 8; i++) {
    const idx = (parseInt(combined[i % combined.length]) + i * 7) % chars.length;
    code += chars[idx];
    if (i === 3) code += "-";
  }
  return code;
}

function BarcodeDisplay({ code }: { code: string }) {
  const bars = useMemo(() => {
    const result: Array<{ width: number; filled: boolean }> = [];
    const clean = code.replace(/-/g, "");
    for (let i = 0; i < clean.length; i++) {
      const charCode = clean.charCodeAt(i);
      const pattern = [
        charCode % 3 === 0 ? 3 : 1,
        1,
        charCode % 2 === 0 ? 2 : 1,
        1,
        charCode % 5 === 0 ? 3 : 2,
        1,
      ];
      pattern.forEach((w, j) => {
        result.push({ width: w, filled: j % 2 === 0 });
      });
    }
    return result;
  }, [code]);

  return (
    <div className="flex items-end justify-center h-16 gap-[0.5px]" data-testid="barcode-display">
      {bars.map((bar, i) => (
        <div
          key={i}
          className={bar.filled ? "bg-foreground" : "bg-transparent"}
          style={{
            width: bar.width,
            height: `${60 + (i % 3) * 4}%`,
            minHeight: 24,
          }}
        />
      ))}
    </div>
  );
}

function QRCodeDisplay({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QRCode = await import("qrcode");
        if (cancelled || !canvasRef.current) return;
        await QRCode.toCanvas(canvasRef.current, value, {
          width: 200,
          margin: 2,
          color: { dark: "#1A1A1A", light: "#FFFFFF" },
          errorCorrectionLevel: "M",
        });
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [value]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="rounded-xl"
        style={{ width: 180, height: 180, opacity: loaded ? 1 : 0, transition: "opacity 0.3s" }}
        data-testid="qr-code-canvas"
      />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-foreground rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function RedemptionOverlay({
  campaign,
  onClose,
}: {
  campaign: { id: string; restaurantName: string; title: string; dealType: string; dealValue: string; endDate: string };
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"qr" | "barcode" | "code">("qr");
  const [copied, setCopied] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const code = useMemo(() => generateRedemptionCode(campaign.id), [campaign.id]);
  const dealLabel = getDealLabel(campaign.dealType, campaign.dealValue);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRedeem = () => {
    setRedeemed(true);
  };

  const tabs = [
    { key: "qr" as const, label: "QR Code" },
    { key: "barcode" as const, label: "Barcode" },
    { key: "code" as const, label: "Code" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80] flex items-end justify-center"
      onClick={onClose}
      data-testid="redemption-overlay"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full max-w-md bg-white rounded-t-[28px] overflow-hidden"
        style={{ maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
        data-testid="redemption-sheet"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between px-6 pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Redeem Deal</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{campaign.restaurantName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
            data-testid="button-close-redemption"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-6 pb-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100/60" style={{ boxShadow: "0 2px 12px -4px rgba(251,191,36,0.15)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[22px] font-bold text-foreground">{dealLabel}</span>
              <span className="text-[10px] font-medium text-amber-600 bg-amber-100 rounded-full px-2.5 py-0.5">{getDaysLeft(campaign.endDate)}</span>
            </div>
            <p className="text-[13px] text-foreground/60">{campaign.title}</p>
          </div>
        </div>

        <div className="px-6 pb-3">
          <div className="flex bg-gray-100 rounded-full p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 rounded-full text-[12px] font-semibold transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
                data-testid={`tab-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 pb-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center"
              style={{ boxShadow: "0 1px 8px -2px rgba(0,0,0,0.06)" }}
            >
              {activeTab === "qr" && (
                <>
                  <div className="mb-4 p-3 bg-white rounded-2xl border-2 border-gray-100" style={{ boxShadow: "0 4px 20px -6px rgba(0,0,0,0.08)" }}>
                    <QRCodeDisplay value={`toast://redeem/${code}`} />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">Scan at the restaurant to redeem</p>
                </>
              )}

              {activeTab === "barcode" && (
                <>
                  <div className="w-full mb-4 p-4 bg-white rounded-2xl border-2 border-gray-100" style={{ boxShadow: "0 4px 20px -6px rgba(0,0,0,0.08)" }}>
                    <BarcodeDisplay code={code} />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">Show barcode to your server</p>
                </>
              )}

              {activeTab === "code" && (
                <>
                  <div className="w-full mb-4 p-5 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                    <p className="text-[11px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">Redemption Code</p>
                    <p className="text-[28px] font-mono font-bold tracking-[0.15em] text-foreground" data-testid="text-redemption-code">{code}</p>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground active:scale-95 transition-transform"
                    data-testid="button-copy-code"
                  >
                    {copied ? (
                      <><Check className="w-3.5 h-3.5 text-green-500" /> Copied!</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copy code</>
                    )}
                  </button>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-6 pb-6">
          {redeemed ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full py-4 rounded-full bg-green-500 text-white font-bold text-[15px] flex items-center justify-center gap-2"
              style={{ boxShadow: "0 4px 20px -4px rgba(34,197,94,0.35)" }}
              data-testid="status-redeemed"
            >
              <Check className="w-5 h-5" />
              Redeemed Successfully
            </motion.div>
          ) : (
            <button
              onClick={handleRedeem}
              className="w-full py-4 rounded-full bg-foreground text-white font-bold text-[15px] active:scale-[0.97] transition-transform duration-200 flex items-center justify-center gap-2"
              style={{ boxShadow: "0 8px 30px -6px rgba(0,0,0,0.3)" }}
              data-testid="button-redeem"
            >
              <span className="text-lg">🏷️</span>
              Redeem Now
            </button>
          )}

          <div className="flex items-center justify-center gap-1.5 mt-3">
            <Shield className="w-3 h-3 text-muted-foreground/40" />
            <p className="text-[10px] text-muted-foreground/50 text-center">Single use · Valid at {campaign.restaurantName} only</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CampaignDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/campaign/:id");
  const campaignId = params?.id;
  const [showRedemption, setShowRedemption] = useState(false);

  const allCampaigns = useMemo(() => getAllCampaigns(), []);
  const campaign = allCampaigns.find(c => c.id === campaignId);

  if (!campaign) {
    return (
      <div className="w-full min-h-[100dvh] bg-[#FCFCFC] flex items-center justify-center" data-testid="campaign-not-found">
        <div className="text-center px-8">
          <p className="text-6xl mb-4">🏷️</p>
          <h2 className="text-xl font-bold mb-2">Deal not found</h2>
          <p className="text-sm text-muted-foreground mb-6">This campaign may have ended or been removed.</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 bg-foreground text-white rounded-full text-sm font-semibold active:scale-95 transition-transform"
            data-testid="button-go-home"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const dealLabel = getDealLabel(campaign.dealType, campaign.dealValue);
  const daysLeft = getDaysLeft(campaign.endDate);
  const conditions = getConditions(campaign.dealType);

  return (
    <div className="w-full min-h-[100dvh] bg-[#FCFCFC] pb-40" data-testid="campaign-detail-page">
      <div className="relative w-full h-64 overflow-hidden">
        <img
          src={campaign.restaurantImage}
          alt={campaign.restaurantName}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />

        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center z-10 active:scale-[0.90] transition-transform duration-150"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
          data-testid="button-back-campaign"
        >
          <ArrowLeft className="w-[18px] h-[18px]" />
        </button>

        <div className="absolute bottom-5 left-5 right-5 z-10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1 block">
            {campaign.restaurantName}
          </span>
          <h1 className="text-2xl font-bold text-white leading-tight" data-testid="text-campaign-title">
            {campaign.title}
          </h1>
        </div>
      </div>

      <div className="px-6 pt-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <span
              className="inline-flex items-center px-4 py-1.5 rounded-full text-[14px] font-bold text-white"
              style={{ backgroundColor: campaign.accentColor || "#1A1A1A" }}
              data-testid="text-deal-badge"
            >
              {dealLabel}
            </span>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[12px] font-medium">{daysLeft}</span>
            </div>
          </div>

          <div className="mb-6" data-testid="text-campaign-description">
            <p className="text-[15px] text-foreground/80 leading-relaxed">
              {campaign.description}
            </p>
          </div>

          <button
            onClick={() => navigate(`/restaurant/${campaign.restaurantId}`)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100/80 mb-6 active:scale-[0.98] transition-transform duration-200"
            style={{ boxShadow: "0 2px 10px -4px rgba(0,0,0,0.06)" }}
            data-testid="link-restaurant-detail"
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
              <img
                src={campaign.restaurantImage}
                alt={campaign.restaurantName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px] text-foreground">{campaign.restaurantName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="text-[12px] text-muted-foreground">View restaurant details</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
          </button>

          <div className="border-t border-gray-100/80 pt-5 mb-6">
            <h2 className="font-bold text-[15px] mb-3">How to redeem</h2>
            <div className="space-y-3">
              {[
                { step: "1", text: "Tap 'Redeem Now' below to generate your unique code" },
                { step: "2", text: "Show the QR code, barcode, or code to your server" },
                { step: "3", text: "The discount will be applied to your bill" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-foreground text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.step}
                  </span>
                  <p className="text-[13px] text-foreground/70 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100/80 pt-5 mb-6">
            <h2 className="font-bold text-[15px] mb-3">Terms & Conditions</h2>
            <ul className="space-y-2">
              {conditions.map((condition, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mt-1.5 flex-shrink-0" />
                  <span className="text-[13px] text-muted-foreground leading-relaxed">{condition}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-gray-100/80 pt-5 mb-6">
            <h2 className="font-bold text-[15px] mb-3">Validity</h2>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  Valid until {new Date(campaign.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{daysLeft}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div
        className="fixed left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100/80 px-6 py-3 z-50 flex gap-3"
        style={{ bottom: "calc(52px + max(env(safe-area-inset-bottom, 0px), 16px))" }}
      >
        <button
          onClick={() => setShowRedemption(true)}
          data-testid="button-redeem-deal"
          className="flex-1 py-3.5 rounded-full bg-foreground text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-200"
          style={{ boxShadow: "0 4px 15px -3px rgba(0,0,0,0.2)" }}
        >
          <span>🏷️</span>
          Redeem Deal
        </button>
      </div>

      <AnimatePresence>
        {showRedemption && (
          <RedemptionOverlay
            campaign={campaign}
            onClose={() => setShowRedemption(false)}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
