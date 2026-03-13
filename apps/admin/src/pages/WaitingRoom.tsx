import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { TrendingUp, Shield, UserCheck, Bell } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import mascotImg from "@assets/toast_mascot_nobg.png";
import { shareMessage, sendGroupInvite, getAccessToken, isLineOAAvailable } from "@/lib/liff";
import { useLineProfile } from "@/lib/useLineProfile";
import { apiRequest } from "@/lib/queryClient";

interface SessionMember {
  id: number;
  sessionCode: string;
  lineUserId: string;
  displayName: string;
  pictureUrl: string | null;
  joinedAt: string;
}

interface SessionData {
  sessionCode: string;
  hostLineUserId: string;
  status: string;
  sessionType: string | null;
  sourceData: string | null;
  expectedMembers: number | null;
}

export default function WaitingRoom() {
  const [, navigate] = useLocation();
  const { profile, loading: profileLoading, isLineUser, authRequired, triggerLineLogin, continueAsGuest } = useLineProfile({ requireAuth: true });
  const [members, setMembers] = useState<SessionMember[]>([]);
  const [nudgedMembers, setNudgedMembers] = useState<Set<string>>(new Set());
  const [sessionCreated, setSessionCreated] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionId = new URLSearchParams(window.location.search).get("session") || "";

  const getUserLocation = useCallback(async (): Promise<{ latitude: string; longitude: string } | null> => {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 60000 });
      });
      return { latitude: pos.coords.latitude.toString(), longitude: pos.coords.longitude.toString() };
    } catch {
      return null;
    }
  }, []);

  const createOrJoinSession = useCallback(async () => {
    if (!profile || !sessionId) return;

    const loc = await getUserLocation();
    const accessToken = getAccessToken();

    try {
      const createRes = await fetch("/api/group/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { "X-Line-Access-Token": accessToken } : {}),
        },
        body: JSON.stringify({
          sessionCode: sessionId,
          hostLineUserId: profile.userId,
          hostDisplayName: profile.displayName,
          hostPictureUrl: profile.pictureUrl || "",
          latitude: loc?.latitude,
          longitude: loc?.longitude,
        }),
      });

      if (createRes.ok) {
        setSessionCreated(true);
      } else if (createRes.status === 409) {
        const joinRes = await fetch(`/api/group/sessions/${sessionId}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { "X-Line-Access-Token": accessToken } : {}),
          },
          body: JSON.stringify({
            lineUserId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl || "",
            latitude: loc?.latitude,
            longitude: loc?.longitude,
          }),
        });
        if (joinRes.ok) {
          setSessionCreated(true);
        }
      }

      if (loc && sessionId) {
        fetch(`/api/group/sessions/${sessionId}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineUserId: profile.userId,
            latitude: loc.latitude,
            longitude: loc.longitude,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Session create/join failed:", err);
      setError("Failed to connect to session");
    }
  }, [profile, sessionId, getUserLocation]);

  useEffect(() => {
    if (!profileLoading && profile && sessionId) {
      createOrJoinSession();
    }
  }, [profileLoading, profile, sessionId]);

  useEffect(() => {
    if (!sessionCreated || !sessionId) return;

    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/group/sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members);
          if (data.session) setSessionInfo(data.session);
          if (data.session?.status === "swiping") {
            navigate(`/group/swipe?session=${sessionId}`);
          }
        }
      } catch {}
    };

    fetchSession();
    const interval = setInterval(fetchSession, 2000);
    return () => clearInterval(interval);
  }, [sessionCreated, sessionId, navigate]);

  const handleInviteMore = async () => {
    await sendGroupInvite(sessionId);
  };

  const handleNudgeMember = async (nudgeKey: string = "general", memberName?: string) => {
    const oaLiffId = isLineOAAvailable() ? import.meta.env.VITE_LINE_OA_LIFF_ID : "";
    const joinUrl = oaLiffId
      ? `https://liff.line.me/${oaLiffId}/group/waiting?session=${sessionId}`
      : `${window.location.origin}/group/waiting?session=${sessionId}`;
    const greeting = memberName ? `Hey ${memberName}! ` : "";
    const text = `${greeting}🍞 Nudge! We're waiting for you on Toast!\n\nJoin our food swiping session now:\n${joinUrl}`;
    const result = await shareMessage(text);
    if (result.shared) {
      setNudgedMembers((prev) => new Set(prev).add(nudgeKey));
    }
  };

  const memberCount = members.length;
  const expectedCount = sessionInfo?.expectedMembers || null;
  const remainingCount = expectedCount ? Math.max(0, expectedCount - memberCount) : 0;
  const canStart = memberCount >= 2;

  const handleStartSwiping = async () => {
    if (profile) {
      try {
        await fetch(`/api/group/sessions/${sessionId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "swiping", lineUserId: profile.userId }),
        });
      } catch {}
    }
    navigate(`/group/swipe?session=${sessionId}`);
  };

  const handleContinueAsGuest = () => {
    continueAsGuest();
  };

  if (profileLoading) {
    return (
      <div className="w-full h-[100dvh] bg-[#FCFCFC] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-foreground animate-spin" />
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="w-full h-[100dvh] bg-[#FCFCFC] flex flex-col items-center justify-center px-6">
        <p className="text-muted-foreground text-center mb-4">No session ID found. Start a new group from the home page.</p>
        <button
          onClick={() => navigate("/group")}
          className="px-6 py-3 rounded-full bg-foreground text-white font-bold text-sm"
          data-testid="button-new-group"
        >
          Start New Group
        </button>
        <BottomNav />
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="w-full h-[100dvh] bg-[#FCFCFC] flex flex-col items-center justify-center px-6" data-testid="line-permission-gate">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[15%] left-[10%] w-32 h-32 bg-green-50/40 rounded-full blur-3xl" />
          <div className="absolute bottom-[20%] right-[15%] w-40 h-40 bg-green-50/40 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 18, stiffness: 200 }}
          className="mb-6"
        >
          <div
            className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00B900] to-[#00C300] flex items-center justify-center"
            style={{ boxShadow: "0 8px 30px -6px rgba(0,185,0,0.3)" }}
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-14 h-14">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-[24px] font-bold mb-2 text-center"
        >
          Connect with LINE
        </motion.h1>

        <motion.p
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-center text-sm mb-8 max-w-[280px]"
        >
          Sign in with LINE so your friends can see your name and picture in the group session.
        </motion.p>

        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="w-full max-w-xs space-y-4 mb-6"
        >
          <div className="flex items-start gap-3 px-4">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <UserCheck className="w-4 h-4 text-[#00B900]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Your profile photo & name</p>
              <p className="text-xs text-muted-foreground">Shown in the waiting room so friends know you've joined</p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-[#00B900]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Secure & private</p>
              <p className="text-xs text-muted-foreground">We only use your display name and profile picture</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-xs flex flex-col gap-3"
        >
          <button
            onClick={triggerLineLogin}
            className="w-full py-4 rounded-full font-bold text-[15px] text-white bg-[#00B900] active:scale-[0.96] transition-transform"
            style={{ boxShadow: "0 6px 20px -4px rgba(0,185,0,0.3)" }}
            data-testid="button-line-login"
          >
            Continue with LINE
          </button>
          <button
            onClick={handleContinueAsGuest}
            className="w-full py-3 rounded-full font-medium text-[13px] text-muted-foreground bg-gray-100 active:scale-[0.96] transition-transform"
            data-testid="button-continue-guest"
          >
            Continue as Guest
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[11px] text-muted-foreground text-center mt-4 max-w-[240px]"
        >
          Session code: <span className="font-mono font-bold">{sessionId}</span>
        </motion.p>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] bg-[#FCFCFC] flex flex-col items-center justify-center px-6 pb-20 relative overflow-hidden" data-testid="waiting-room-page">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[10%] w-32 h-32 bg-amber-50/40 rounded-full blur-3xl" />
        <div className="absolute bottom-[20%] right-[15%] w-40 h-40 bg-amber-50/40 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 18, stiffness: 200 }}
        className="mb-5"
      >
        <div
          className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center"
          style={{ boxShadow: "0 8px 30px -6px rgba(234,179,8,0.15)" }}
        >
          <img src={mascotImg} alt="Toast mascot" className="h-12 w-12 object-contain animate-soft-bob gpu-accelerated" draggable={false} />
        </div>
      </motion.div>

      {isLineUser && profile && (
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.3 }}
          className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full mb-3"
          data-testid="badge-line-connected"
        >
          <div className="w-4 h-4 rounded-full overflow-hidden">
            {profile.pictureUrl ? (
              <img src={profile.pictureUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-green-200 flex items-center justify-center">
                <span className="text-[8px] font-bold text-green-700">{profile.displayName.charAt(0)}</span>
              </div>
            )}
          </div>
          <span className="text-[12px] font-semibold">Connected as {profile.displayName}</span>
        </motion.div>
      )}

      {sessionInfo?.sessionType === "trending" && (
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-full mb-3"
          data-testid="badge-trending-session"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="text-[12px] font-semibold">Trending Swipe Session</span>
        </motion.div>
      )}

      <motion.h1
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="text-[26px] font-semibold mb-2 text-center"
        data-testid="text-waiting-title"
      >
        {memberCount < 2 ? "Waiting for friends..." : "Ready to go!"}
      </motion.h1>
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="flex items-center gap-2 mb-6"
      >
        <div className="flex gap-1">
          {members.map((m) => (
            <div
              key={m.lineUserId}
              className="w-2 h-2 rounded-full bg-[hsl(160,60%,45%)] transition-all duration-500"
            />
          ))}
          {expectedCount ? (
            Array.from({ length: remainingCount }).map((_, i) => (
              <div key={`pending-${i}`} className="w-2 h-2 rounded-full bg-gray-200" />
            ))
          ) : (
            memberCount < 2 && <div className="w-2 h-2 rounded-full bg-gray-200" />
          )}
        </div>
        <span className="text-muted-foreground text-sm font-medium" data-testid="text-member-count">
          {expectedCount ? `${memberCount} of ${expectedCount} joined` : `${memberCount} joined`}
        </span>
      </motion.div>

      <div className="flex flex-wrap justify-center gap-6 mb-8 max-w-sm">
        {members.map((m, idx) => (
          <motion.div
            key={m.lineUserId}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + idx * 0.08, type: "spring", damping: 18, stiffness: 200 }}
            className="flex flex-col items-center gap-2"
            data-testid={`member-${m.lineUserId}`}
          >
            <div className="relative">
              <div
                className="w-[72px] h-[72px] rounded-full overflow-hidden border-[3px] border-[hsl(160,60%,45%)] transition-all duration-500"
                style={{ boxShadow: "0 6px 20px -4px rgba(0,200,100,0.15)" }}
              >
                {m.pictureUrl ? (
                  <img src={m.pictureUrl} alt={m.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <span className="text-xl font-bold text-amber-600">{m.displayName.charAt(0)}</span>
                  </div>
                )}
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 300, delay: 0.15 }}
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[hsl(160,60%,45%)] flex items-center justify-center border-2 border-white"
              >
                <span className="text-white text-[10px] font-bold">✓</span>
              </motion.div>
            </div>
            <span className="text-sm font-bold">{m.lineUserId === profile?.userId ? "You" : m.displayName}</span>
            <span className="text-[11px] font-semibold text-[hsl(160,60%,45%)]">Ready</span>
          </motion.div>
        ))}

        {expectedCount && remainingCount > 0 && Array.from({ length: remainingCount }).map((_, i) => (
          <motion.div
            key={`placeholder-${i}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            transition={{ delay: 0.35 + (memberCount + i) * 0.08, type: "spring", damping: 18, stiffness: 200 }}
            className="flex flex-col items-center gap-1.5"
            data-testid={`member-placeholder-${i}`}
          >
            <div className="w-[72px] h-[72px] rounded-full border-[3px] border-dashed border-gray-200 flex items-center justify-center">
              <span className="text-gray-300 text-xl">?</span>
            </div>
            <span className="text-sm font-bold text-muted-foreground/40">Waiting...</span>
            <button
              onClick={() => handleNudgeMember()}
              disabled={nudgedMembers.has("general")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95 ${
                nudgedMembers.has("general")
                  ? "bg-gray-100 text-muted-foreground/40"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
              data-testid={`button-nudge-placeholder-${i}`}
            >
              <Bell className="w-3 h-3" />
              {nudgedMembers.has("general") ? "Sent!" : "Nudge"}
            </button>
          </motion.div>
        ))}

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", damping: 18, stiffness: 200 }}
          className="flex flex-col items-center gap-2"
        >
          <button
            onClick={handleInviteMore}
            className="w-[72px] h-[72px] rounded-full border-[3px] border-dashed border-gray-200 flex items-center justify-center active:scale-[0.95] transition-transform"
            data-testid="button-invite-more"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className="text-sm font-bold text-muted-foreground">Invite</span>
          <span className="text-[11px] font-semibold text-muted-foreground">via LINE</span>
        </motion.div>
      </div>

      {error && (
        <p className="text-red-500 text-sm mb-4" data-testid="text-error">{error}</p>
      )}

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <motion.button
          onClick={handleStartSwiping}
          data-testid="button-start-swiping"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className={`w-full py-4 rounded-full font-bold text-[15px] transition-all duration-500 active:scale-[0.96] gpu-accelerated ${
            canStart
              ? "bg-[#FFCC02] text-[#2d2000]"
              : "bg-gray-100 text-muted-foreground"
          }`}
          style={canStart ? { boxShadow: "var(--shadow-glow-primary)" } : {}}
          disabled={!canStart}
        >
          {canStart ? "Start Swiping!" : expectedCount && remainingCount > 0 ? `Waiting for ${remainingCount} more...` : "Waiting for more friends..."}
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-[11px] text-muted-foreground text-center"
        >
          Session code: <span className="font-mono font-bold">{sessionId}</span>
        </motion.p>
      </div>

      <BottomNav />
    </div>
  );
}
