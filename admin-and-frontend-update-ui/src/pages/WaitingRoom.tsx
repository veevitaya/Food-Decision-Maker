import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import mascotImg from "@assets/toast_mascot_nobg.png";
import { shareMessage, sendGroupInvite } from "@/lib/liff";
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

export default function WaitingRoom() {
  const [, navigate] = useLocation();
  const { profile, loading: profileLoading } = useLineProfile();
  const [members, setMembers] = useState<SessionMember[]>([]);
  const [nudgedMembers, setNudgedMembers] = useState<Set<string>>(new Set());
  const [sessionCreated, setSessionCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionId = new URLSearchParams(window.location.search).get("session") || "";

  const createOrJoinSession = useCallback(async () => {
    if (!profile || !sessionId) return;

    try {
      const createRes = await fetch("/api/group/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionCode: sessionId,
          hostLineUserId: profile.userId,
          hostDisplayName: profile.displayName,
          hostPictureUrl: profile.pictureUrl || "",
        }),
      });

      if (createRes.ok) {
        setSessionCreated(true);
      } else if (createRes.status === 409) {
        const joinRes = await fetch(`/api/group/sessions/${sessionId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineUserId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl || "",
          }),
        });
        if (joinRes.ok) {
          setSessionCreated(true);
        }
      }
    } catch (err) {
      console.error("Session create/join failed:", err);
      setError("Failed to connect to session");
    }
  }, [profile, sessionId]);

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

  const handleNudgeMember = async (memberName: string) => {
    setNudgedMembers((prev) => new Set(prev).add(memberName));
    const appUrl = window.location.origin;
    const text = `Hey ${memberName}! We're waiting for you on Toast. Join our food session!\n\n${appUrl}/group/waiting?session=${sessionId}`;
    await shareMessage(text);
  };

  const memberCount = members.length;
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

  if (profileLoading) {
    return (
      <div className="w-full h-[100dvh] bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-foreground animate-spin" />
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="w-full h-[100dvh] bg-white flex flex-col items-center justify-center px-6">
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

  return (
    <div className="w-full h-[100dvh] bg-white flex flex-col items-center justify-center px-6 pb-20 relative overflow-hidden" data-testid="waiting-room-page">
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

      <motion.h1
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="text-[26px] font-semibold mb-2 text-center"
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
          {memberCount < 2 && (
            <div className="w-2 h-2 rounded-full bg-gray-200" />
          )}
        </div>
        <span className="text-muted-foreground text-sm font-medium">{memberCount} joined</span>
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
          {canStart ? "Start Swiping!" : "Waiting for more friends..."}
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
