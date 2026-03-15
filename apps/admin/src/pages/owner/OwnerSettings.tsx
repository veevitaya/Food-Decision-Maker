import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSession } from "../admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Settings2,
  User,
  Mail,
  Phone,
  Building,
  ShieldCheck,
  Crown,
  Save,
  Key,
  Bell,
  Globe,
  CreditCard,
  ChevronRight,
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
  Landmark,
  Upload,
  Loader2,
  QrCode,
  Smartphone,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string)
  : null;

declare global {
  interface Window {
    OmiseCard: any;
  }
}

function getOwnerHeaders(): Record<string, string> {
  const session = getAdminSession();
  if (!session || session.sessionType !== "owner") return {};
  return { "x-owner-token": btoa(`${session.email}:`) };
}

// ── Payment sub-components ────────────────────────────────────────────────────

function StripeCardForm({ selectedTier }: { selectedTier: "growth" | "pro" }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const siRes = await fetch("/api/owner/billing/stripe/setup-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getOwnerHeaders() },
      });
      const { clientSecret } = await siRes.json();
      const cardEl = elements.getElement(CardElement);
      if (!cardEl) throw new Error("Card element not found");
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardEl },
      });
      if (error) throw new Error(error.message);
      const subRes = await fetch("/api/owner/billing/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getOwnerHeaders() },
        body: JSON.stringify({ tier: selectedTier, paymentMethodId: setupIntent?.payment_method }),
      });
      if (!subRes.ok) throw new Error("Subscription failed");
      toast({ title: "Subscribed!", description: `You are now on the ${selectedTier} plan.` });
    } catch (e: any) {
      toast({ title: "Payment failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 border border-gray-100 rounded-lg">
        <CardElement options={{ style: { base: { fontSize: "14px", color: "#374151" } } }} />
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading || !stripe}
        className="w-full bg-[#635bff] text-white font-medium rounded-xl py-2.5 text-sm hover:bg-[#635bff]/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Subscribe with Card
      </button>
    </div>
  );
}

function StripePromptPayForm({ selectedTier }: { selectedTier: "growth" | "pro" }) {
  const { toast } = useToast();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/billing/stripe/promptpay", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getOwnerHeaders() },
        body: JSON.stringify({ tier: selectedTier }),
      });
      const data = await res.json();
      setQrUrl(data.qrCodeUrl);
    } catch {
      toast({ title: "Failed to generate QR", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-center">
      {qrUrl ? (
        <>
          <img src={qrUrl} alt="PromptPay QR" className="mx-auto w-48 h-48 rounded-lg border border-gray-100" />
          <p className="text-xs text-gray-500">Scan with any banking app. Payment confirmed automatically.</p>
        </>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-[#FFCC02] text-gray-900 font-medium rounded-xl py-2.5 text-sm hover:bg-[#FFCC02]/90 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
          Generate PromptPay QR
        </button>
      )}
    </div>
  );
}

function OmiseCardForm({ selectedTier }: { selectedTier: "growth" | "pro" }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleCharge = () => {
    if (!window.OmiseCard) {
      toast({ title: "Omise not loaded", variant: "destructive" });
      return;
    }
    window.OmiseCard.open({
      publicKey: import.meta.env.VITE_OMISE_PUBLIC_KEY,
      frameLabel: "Toast",
      submitLabel: "Pay",
      currency: "THB",
      onCreateTokenSuccess: async (token: string) => {
        setLoading(true);
        try {
          const res = await fetch("/api/owner/billing/omise/charge", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getOwnerHeaders() },
            body: JSON.stringify({ token, tier: selectedTier }),
          });
          if (!res.ok) throw new Error("Charge failed");
          toast({ title: "Payment successful!", description: `Subscribed to ${selectedTier}.` });
        } catch (e: any) {
          toast({ title: "Payment failed", description: e.message, variant: "destructive" });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <button
      onClick={handleCharge}
      disabled={loading}
      className="w-full bg-[#1a56db] text-white font-medium rounded-xl py-2.5 text-sm hover:bg-[#1a56db]/90 flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
      Pay with Card (Omise)
    </button>
  );
}

function OmiseMobileForm({ selectedTier }: { selectedTier: "growth" | "pro" }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [instructions, setInstructions] = useState<any>(null);

  const handleInitiate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/billing/omise/source-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getOwnerHeaders() },
        body: JSON.stringify({ tier: selectedTier, sourceType: "mobile_banking" }),
      });
      const data = await res.json();
      setInstructions(data);
    } catch {
      toast({ title: "Failed to initiate", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {instructions ? (
        <div className="p-4 rounded-xl bg-[#1a56db]/[0.06] border border-[#1a56db]/20 text-sm">
          <p className="font-medium text-gray-800 mb-1">Mobile Banking Payment</p>
          <p className="text-xs text-gray-500">Follow the link in your banking app to complete payment.</p>
          {instructions.authorizeUri && (
            <a href={instructions.authorizeUri} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs text-[#1a56db] underline">
              Open Banking App →
            </a>
          )}
        </div>
      ) : (
        <button
          onClick={handleInitiate}
          disabled={loading}
          className="w-full bg-[#1a56db] text-white font-medium rounded-xl py-2.5 text-sm hover:bg-[#1a56db]/90 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
          Pay via Mobile Banking
        </button>
      )}
    </div>
  );
}

function OmiseBankTransferForm({
  selectedTier, slipFile, setSlipFile, slipInputRef,
}: {
  selectedTier: "growth" | "pro";
  slipFile: File | null;
  setSlipFile: (f: File | null) => void;
  slipInputRef: { current: HTMLInputElement | null };
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!slipFile) {
      toast({ title: "Please upload a slip", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(slipFile);
      });
      const uploadRes = await fetch("/api/owner/billing/slip/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getOwnerHeaders() },
        body: JSON.stringify({ file: base64, filename: slipFile.name, mimeType: slipFile.type }),
      });
      const { slipUrl } = await uploadRes.json();
      await fetch("/api/owner/billing/omise/source-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getOwnerHeaders() },
        body: JSON.stringify({ tier: selectedTier, sourceType: "bank_transfer", slipUrl }),
      });
      setSubmitted(true);
      toast({ title: "Slip submitted!", description: "Awaiting admin approval." });
    } catch (e: any) {
      toast({ title: "Failed to submit", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="w-10 h-10 text-[#00B14F] mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-800">Slip submitted successfully</p>
        <p className="text-xs text-gray-500 mt-1">Your subscription will be activated after admin approval.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm">
        <p className="font-medium text-gray-700 mb-2">Transfer to:</p>
        <div className="space-y-1 text-xs text-gray-600">
          <p>Bank: <span className="font-medium">Kasikorn Bank (KBank)</span></p>
          <p>Account: <span className="font-medium">xxx-x-xxxxx-x</span></p>
          <p>Name: <span className="font-medium">Toast Company Ltd.</span></p>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Upload Transfer Slip</p>
        <input
          ref={slipInputRef as any}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
        />
        <div
          onClick={() => slipInputRef.current?.click()}
          className="flex items-center gap-3 p-3 border border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition-colors"
        >
          <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500">
            {slipFile ? slipFile.name : "Click to upload slip image"}
          </span>
        </div>
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading || !slipFile}
        className="w-full bg-[#00B14F] text-white font-medium rounded-xl py-2.5 text-sm hover:bg-[#00B14F]/90 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Submit Slip for Approval
      </button>
    </div>
  );
}

export default function OwnerSettings() {
  const session = getAdminSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "subscription" | "payments" | "team">("profile");

  const { data: dashData, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/owner/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/owner/dashboard", {
        headers: getOwnerHeaders() as Record<string, string>,
      });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: session?.sessionType === "owner",
  });

  const owner = dashData?.owner;

  const [profile, setProfile] = useState({
    displayName: "",
    email: "",
    phone: "",
    language: "en",
  });

  const [notifSettings, setNotifSettings] = useState({
    newReviews: true,
    campaignUpdates: true,
    weeklyReport: true,
    milestones: true,
    tips: false,
    lineNotifications: true,
  });

  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "omise">("stripe");
  const [stripeSubTab, setStripeSubTab] = useState<"card" | "promptpay">("card");
  const [omiseSubTab, setOmiseSubTab] = useState<"card" | "mobile" | "bank_transfer">("card");
  const [selectedTier, setSelectedTier] = useState<"growth" | "pro">("growth");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const slipInputRef = useRef<HTMLInputElement>(null);

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400" data-testid="text-access-denied">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  const TIER_OPTIONS = [
    { key: "growth" as const, label: "Growth", priceThb: 990 },
    { key: "pro" as const, label: "Pro", priceThb: 2490 },
  ];

  const tabs = [
    { key: "profile" as const, label: "Profile", icon: User },
    { key: "notifications" as const, label: "Notifications", icon: Bell },
    { key: "subscription" as const, label: "Subscription", icon: CreditCard },
    { key: "payments" as const, label: "Payments", icon: Wallet },
    { key: "team" as const, label: "Team", icon: Building },
  ];

  const tierInfo: Record<string, { name: string; price: string; features: string[] }> = {
    free: {
      name: "Free",
      price: "฿0/mo",
      features: ["Basic listing", "View analytics", "Reply to reviews"],
    },
    basic: {
      name: "Basic",
      price: "฿990/mo",
      features: ["Everything in Free", "Run promotions", "Priority support", "Verified badge"],
    },
    premium: {
      name: "Premium",
      price: "฿2,490/mo",
      features: ["Everything in Basic", "Featured placement", "Advanced analytics", "Custom branding"],
    },
    enterprise: {
      name: "Enterprise",
      price: "Custom",
      features: ["Everything in Premium", "Multi-location", "Dedicated manager", "API access"],
    },
  };

  const currentTier = owner?.subscriptionTier || "free";

  return (
    <div className="space-y-6" data-testid="owner-settings-page">
      <div className="flex items-center gap-3">
        <Settings2 className="w-5 h-5 text-[#FFCC02]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800" data-testid="text-settings-title">Settings</h2>
          <p className="text-xs text-gray-400">Manage your account and preferences</p>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`text-xs font-medium px-4 py-2 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === key
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
            data-testid={`tab-${key}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-profile-info">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
              <h3 className="text-[15px] font-semibold text-gray-800">Profile Information</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block flex items-center gap-1">
                  <User className="w-3 h-3" /> Display Name
                </label>
                <input
                  type="text"
                  value={profile.displayName || owner?.displayName || ""}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  className="w-full text-sm border border-gray-100 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#FFCC02]/30"
                  data-testid="input-display-name"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </label>
                <input
                  type="email"
                  value={owner?.email || ""}
                  disabled
                  className="w-full text-sm border border-gray-100 rounded-lg px-3 py-2.5 bg-gray-50 text-gray-400"
                  data-testid="input-email"
                />
                <p className="text-[10px] text-gray-300 mt-1">Contact support to change your email</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone || owner?.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+66 XXX-XXX-XXXX"
                  className="w-full text-sm border border-gray-100 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#FFCC02]/30"
                  data-testid="input-phone"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Language
                </label>
                <select
                  value={profile.language}
                  onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                  className="w-full text-sm border border-gray-100 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#FFCC02]/30 bg-white"
                  data-testid="select-language"
                >
                  <option value="en">English</option>
                  <option value="th">ไทย (Thai)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={() => toast({ title: "Profile saved", description: "Your changes have been saved." })}
                className="bg-[#FFCC02] text-gray-900 font-medium rounded-xl px-5 py-2 hover:bg-[#FFCC02]/90 transition-colors flex items-center gap-1.5 text-sm shadow-sm"
                data-testid="button-save-profile"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-security">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-[3px] h-4 bg-[var(--admin-blue)] rounded-full" />
              <h3 className="text-[15px] font-semibold text-gray-800">Security</h3>
            </div>
            <button
              onClick={() => toast({ title: "Password reset email sent", description: "Check your email for the reset link." })}
              className="flex items-center justify-between w-full p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
              data-testid="button-change-password"
            >
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">Change Password</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-notification-settings">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Notification Preferences</h3>
          </div>

          <div className="space-y-1">
            {[
              { key: "newReviews" as const, label: "New Reviews", desc: "Get notified when someone reviews your restaurant" },
              { key: "campaignUpdates" as const, label: "Campaign Updates", desc: "Milestone and performance alerts for your promotions" },
              { key: "weeklyReport" as const, label: "Weekly Report", desc: "Receive a weekly summary of your restaurant's performance" },
              { key: "milestones" as const, label: "Milestones", desc: "Celebrate when you hit view, save, or like milestones" },
              { key: "tips" as const, label: "Tips & Suggestions", desc: "Get actionable tips to improve your listing" },
              { key: "lineNotifications" as const, label: "LINE Notifications", desc: "Receive notifications via LINE Official Account" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-700">{label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifSettings[key]}
                    onChange={(e) => setNotifSettings({ ...notifSettings, [key]: e.target.checked })}
                    className="sr-only peer"
                    data-testid={`toggle-${key}`}
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#FFCC02] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-5">
            <button
              onClick={() => toast({ title: "Preferences saved" })}
              className="bg-[#FFCC02] text-gray-900 font-medium rounded-xl px-5 py-2 hover:bg-[#FFCC02]/90 transition-colors flex items-center gap-1.5 text-sm shadow-sm"
              data-testid="button-save-notifications"
            >
              <Save className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>
      )}

      {activeTab === "subscription" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-current-plan">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
              <h3 className="text-[15px] font-semibold text-gray-800">Current Plan</h3>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FFCC02]/[0.06] border border-[#FFCC02]/20">
              <Crown className="w-5 h-5 text-[#FFCC02]" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{tierInfo[currentTier]?.name || "Free"}</p>
                <p className="text-xs text-gray-500">{tierInfo[currentTier]?.price || "฿0/mo"}</p>
              </div>
              {owner?.isVerified && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 bg-[#00B14F]/10 text-[#00B14F]">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="section-plans">
            {Object.entries(tierInfo).map(([tier, info]) => {
              const isCurrent = tier === currentTier;
              return (
                <div
                  key={tier}
                  className={`rounded-2xl border p-5 transition-all ${
                    isCurrent
                      ? "border-[#FFCC02] bg-[#FFCC02]/[0.04] shadow-sm"
                      : "border-gray-100 bg-white hover:border-gray-200"
                  }`}
                  data-testid={`plan-${tier}`}
                >
                  <p className="text-sm font-semibold text-gray-800">{info.name}</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">{info.price}</p>
                  <ul className="mt-3 space-y-1.5">
                    {info.features.map((f) => (
                      <li key={f} className="text-[11px] text-gray-500 flex items-start gap-1.5">
                        <span className="text-[#00B14F] mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`w-full mt-4 text-xs font-medium rounded-lg py-2 transition-colors ${
                      isCurrent
                        ? "bg-gray-100 text-gray-400 cursor-default"
                        : "bg-[#FFCC02] text-gray-900 hover:bg-[#FFCC02]/90"
                    }`}
                    disabled={isCurrent}
                    onClick={() => !isCurrent && toast({ title: "Upgrade requested", description: "Our team will contact you shortly." })}
                    data-testid={`button-select-${tier}`}
                  >
                    {isCurrent ? "Current Plan" : "Upgrade"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "payments" && (
        <div className="space-y-4" data-testid="section-payments">
          {/* Provider Toggle */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
              <h3 className="text-[15px] font-semibold text-gray-800">Payment Provider</h3>
            </div>
            <div className="flex gap-2">
              {(["stripe", "omise"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPaymentProvider(p)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    paymentProvider === p
                      ? "border-[#00B14F] bg-[#00B14F]/10 text-[#00B14F]"
                      : "border-gray-100 text-gray-400 hover:border-gray-200"
                  }`}
                >
                  {p === "stripe" ? "Stripe" : "Omise"}
                </button>
              ))}
            </div>
          </div>

          {/* Tier selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-[15px] font-semibold text-gray-800 mb-3">Select Plan</h3>
            <div className="flex gap-3">
              {TIER_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSelectedTier(t.key)}
                  className={`flex-1 p-4 rounded-xl border text-left transition-all ${
                    selectedTier === t.key
                      ? "border-[#FFCC02] bg-[#FFCC02]/[0.06]"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-800">{t.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">฿{t.priceThb.toLocaleString()}/mo</p>
                </button>
              ))}
            </div>
          </div>

          {/* Stripe payment */}
          {paymentProvider === "stripe" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-[3px] h-4 bg-[#635bff] rounded-full" />
                <h3 className="text-[15px] font-semibold text-gray-800">Pay with Stripe</h3>
              </div>
              <div className="flex gap-2 mb-5">
                {(["card", "promptpay"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setStripeSubTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      stripeSubTab === t
                        ? "border-[#635bff] bg-[#635bff]/10 text-[#635bff]"
                        : "border-gray-100 text-gray-400 hover:border-gray-200"
                    }`}
                  >
                    {t === "card" ? "Credit / Debit Card" : "PromptPay QR"}
                  </button>
                ))}
              </div>
              {stripeSubTab === "card" && stripePromise ? (
                <Elements stripe={stripePromise}>
                  <StripeCardForm selectedTier={selectedTier} />
                </Elements>
              ) : stripeSubTab === "card" ? (
                <p className="text-xs text-gray-400">Stripe not configured (missing VITE_STRIPE_PUBLISHABLE_KEY).</p>
              ) : (
                <StripePromptPayForm selectedTier={selectedTier} />
              )}
            </div>
          )}

          {/* Omise payment */}
          {paymentProvider === "omise" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-[3px] h-4 bg-[#1a56db] rounded-full" />
                <h3 className="text-[15px] font-semibold text-gray-800">Pay with Omise</h3>
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {(["card", "mobile", "bank_transfer"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOmiseSubTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      omiseSubTab === t
                        ? "border-[#1a56db] bg-[#1a56db]/10 text-[#1a56db]"
                        : "border-gray-100 text-gray-400 hover:border-gray-200"
                    }`}
                  >
                    {t === "card" ? "Card" : t === "mobile" ? "Mobile Banking" : "Bank Transfer"}
                  </button>
                ))}
              </div>
              {omiseSubTab === "card" && <OmiseCardForm selectedTier={selectedTier} />}
              {omiseSubTab === "mobile" && <OmiseMobileForm selectedTier={selectedTier} />}
              {omiseSubTab === "bank_transfer" && (
                <OmiseBankTransferForm
                  selectedTier={selectedTier}
                  slipFile={slipFile}
                  setSlipFile={setSlipFile}
                  slipInputRef={slipInputRef}
                />
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "team" && (
        <div className="space-y-4" data-testid="section-team">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
                <h3 className="text-[15px] font-semibold text-gray-800">Team Members</h3>
                <span className="bg-[#00B14F]/10 text-[#00B14F] text-[10px] font-bold rounded-full px-2 py-0.5">1</span>
              </div>
              <button
                onClick={() => toast({ title: "Coming Soon", description: "Team invitations will be available in your next update." })}
                className="text-xs font-medium bg-[#FFCC02] text-gray-900 rounded-lg px-3 py-1.5 hover:bg-[#FFCC02]/90 transition-colors"
                data-testid="button-invite-member"
              >
                Invite Member
              </button>
            </div>
            <div className="space-y-3">
              {owner && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100" data-testid="team-member-0">
                  <div className="w-10 h-10 rounded-full bg-[#00B14F]/10 flex items-center justify-center text-sm font-bold text-[#00B14F]">
                    {(owner.displayName || owner.email || "O").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{owner.displayName || owner.email}</p>
                    <p className="text-xs text-gray-400">{owner.email}</p>
                  </div>
                  <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-[#FFCC02]/15 text-gray-700">Owner</span>
                  <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-[#00B14F]/10 text-[#00B14F]">Active</span>
                </div>
              )}
              <p className="text-xs text-gray-400 text-center pt-2">Team invitations coming soon.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-[3px] h-4 bg-[var(--admin-blue)] rounded-full" />
              <h3 className="text-[15px] font-semibold text-gray-800">Roles & Permissions</h3>
            </div>
            <div className="space-y-2">
              {[
                { role: "Owner", desc: "Full access to all settings, billing, team management", perms: "All" },
                { role: "Manager", desc: "Menu, promotions, reviews, analytics access", perms: "Most" },
                { role: "Staff", desc: "View analytics and respond to reviews only", perms: "Limited" },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-50">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">{r.role}</p>
                    <p className="text-[11px] text-gray-400">{r.desc}</p>
                  </div>
                  <span className="text-[10px] text-gray-400">{r.perms}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
