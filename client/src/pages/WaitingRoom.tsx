import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { getProfile, initLiff, isLiffAvailable } from "@/lib/liff";
import mascotImg from "@assets/toast_mascot_nobg.png";

type Member = {
  id: number;
  name: string;
  avatarUrl?: string | null;
  joined: boolean;
};

export default function WaitingRoom() {
  const [, navigate] = useLocation();
  const [members, setMembers] = useState<Member[]>([]);
  const [nudgedMembers, setNudgedMembers] = useState<Set<string>>(new Set());
  const [sessionCode, setSessionCode] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = (params.get("session") || params.get("room") || "").trim().toUpperCase();
    if (!code) return;
    setSessionCode(code);

    const join = async () => {
      let memberName = "";
      let avatarUrl = "";

      if (isLiffAvailable()) {
        await initLiff({ autoLogin: false });
        const profile = await getProfile();
        console.log("[waiting-room-debug] liff profile", profile);
        if (profile?.displayName) memberName = profile.displayName;
        if (profile?.pictureUrl) avatarUrl = profile.pictureUrl;
      }

      if (!memberName) {
        const memberKey = `group_member_name_${code}`;
        memberName = localStorage.getItem(memberKey) || "You";
        localStorage.setItem(memberKey, memberName);
      }

      const joinPayload = {
        name: memberName,
        avatarUrl: avatarUrl || undefined,
      };
      console.log("[waiting-room-debug] join payload", joinPayload);
      const joinRes = await fetch(`/api/group/sessions/${encodeURIComponent(code)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(joinPayload),
      });
      const joinJson = await joinRes.json().catch(() => null);
      console.log("[waiting-room-debug] join response", { status: joinRes.status, body: joinJson });
    };

    const load = async () => {
      const res = await fetch(`/api/group/sessions/${encodeURIComponent(code)}`, { credentials: "include" });
      if (!res.ok) return;
      const payload = await res.json();
      console.log("[waiting-room-debug] session payload members", payload?.members);
      setMembers((payload.members || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        avatarUrl: m.avatarUrl,
        joined: !!m.joined,
      })));
    };

    void join().then(load);
    const timer = setInterval(load, 2500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    console.log(
      "[waiting-room-debug] render members avatar state",
      members.map((m) => ({
        id: m.id,
        name: m.name,
        avatarUrl: m.avatarUrl ?? null,
        renderMode: m.avatarUrl ? "image" : "fallback-initial",
      })),
    );
  }, [members]);

  const allJoined = members.length > 0 && members.every((m) => m.joined);
  const joinedCount = members.filter((m) => m.joined).length;

  const handleNudgeMember = (memberName: string) => {
    setNudgedMembers((prev) => new Set(prev).add(memberName));
    const text = `Hey ${memberName}! We're waiting for you on Toast. Join our food session!`;
    window.open(`https://line.me/R/share?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="w-full h-[100dvh] bg-white flex flex-col items-center justify-center px-6 relative overflow-hidden" data-testid="waiting-room-page">
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
        Waiting for friends...
      </motion.h1>
      <p className="text-xs text-muted-foreground mb-2">Session: {sessionCode || "-"}</p>
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="flex items-center gap-2 mb-10"
      >
        <div className="flex gap-1">
          {members.map((m) => (
            <div
              key={m.id}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${m.joined ? "bg-[hsl(160,60%,45%)]" : "bg-gray-200"}`}
            />
          ))}
        </div>
        <span className="text-muted-foreground text-sm font-medium">{joinedCount}/{members.length} joined</span>
      </motion.div>

      <div className="flex gap-8 mb-12">
        {members.map((m, idx) => (
          <motion.div
            key={m.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + idx * 0.08, type: "spring", damping: 18, stiffness: 200 }}
            className="flex flex-col items-center gap-2"
            data-testid={`member-${m.name.toLowerCase()}`}
          >
            <div className="relative">
              <div
                className={`w-[72px] h-[72px] rounded-full overflow-hidden transition-all duration-500 ${
                  m.joined
                    ? "border-[3px] border-[hsl(160,60%,45%)]"
                    : "border-[3px] border-dashed border-gray-200"
                }`}
                style={m.joined ? { boxShadow: "0 6px 20px -4px rgba(0,200,100,0.15)" } : {}}
              >
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">{m.name.slice(0, 1)}</div>
                )}
              </div>
            </div>
            <span className="text-sm font-bold">{m.name}</span>
            <span className={`text-[11px] font-semibold transition-colors duration-500 ${m.joined ? "text-[hsl(160,60%,45%)]" : "text-muted-foreground"}`}>
              {m.joined ? "Ready" : "Waiting..."}
            </span>

            <AnimatePresence>
              {!m.joined && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  onClick={() => handleNudgeMember(m.name)}
                  data-testid={`button-nudge-${m.name.toLowerCase()}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-gray-200 text-[11px] font-bold mt-1 active:scale-[0.9] transition-transform duration-200"
                  style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
                >
                  <span className={`text-sm inline-block ${!nudgedMembers.has(m.name) ? "animate-icon-wiggle" : ""}`}>
                    nudge
                  </span>
                  {nudgedMembers.has(m.name) ? "Sent!" : "Nudge"}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <motion.button
        onClick={() => allJoined && navigate(`/group/swipe?session=${encodeURIComponent(sessionCode)}`)}
        data-testid="button-start-swiping"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={`w-full max-w-xs py-4 rounded-full font-bold text-[15px] transition-all duration-500 active:scale-[0.96] gpu-accelerated ${
          allJoined
            ? "bg-[#FFCC02] text-[#2d2000]"
            : "bg-gray-100 text-muted-foreground"
        }`}
        style={allJoined ? { boxShadow: "var(--shadow-glow-primary)" } : {}}
        disabled={!allJoined}
      >
        {allJoined ? "Start Swiping" : members.length === 0 ? "Loading session..." : `Waiting for ${members.length - joinedCount} more...`}
      </motion.button>

      <BottomNav />
    </div>
  );
}
