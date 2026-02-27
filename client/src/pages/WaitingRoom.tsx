import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import mascotImg from "@assets/toast_mascot_nobg.png";

const MOCK_MEMBERS = [
  { name: "You", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", joined: true },
  { name: "Nook", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", joined: false },
  { name: "Beam", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face", joined: false },
];

export default function WaitingRoom() {
  const [, navigate] = useLocation();
  const [members, setMembers] = useState(MOCK_MEMBERS);
  const [nudgedMembers, setNudgedMembers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t1 = setTimeout(() => {
      setMembers((prev) => prev.map((m) => m.name === "Nook" ? { ...m, joined: true } : m));
    }, 3000);
    const t2 = setTimeout(() => {
      setMembers((prev) => prev.map((m) => m.name === "Beam" ? { ...m, joined: true } : m));
    }, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const allJoined = members.every((m) => m.joined);
  const joinedCount = members.filter((m) => m.joined).length;

  const handleNudgeMember = (memberName: string) => {
    setNudgedMembers((prev) => new Set(prev).add(memberName));
    const text = `Hey ${memberName}! We're waiting for you on Toast 🍞 Join our food session!`;
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
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="flex items-center gap-2 mb-10"
      >
        <div className="flex gap-1">
          {members.map((m) => (
            <div
              key={m.name}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${m.joined ? "bg-[hsl(160,60%,45%)]" : "bg-gray-200"}`}
            />
          ))}
        </div>
        <span className="text-muted-foreground text-sm font-medium">{joinedCount}/{members.length} joined</span>
      </motion.div>

      <div className="flex gap-8 mb-12">
        {members.map((m, idx) => (
          <motion.div
            key={m.name}
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
                {m.joined ? (
                  <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center relative">
                    <img src={m.avatar} alt={m.name} className="w-full h-full object-cover opacity-30 grayscale" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" style={{ animationDuration: "1s" }} />
                    </div>
                  </div>
                )}
              </div>
              {m.joined && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, stiffness: 300, delay: 0.15 }}
                  className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[hsl(160,60%,45%)] flex items-center justify-center border-2 border-white"
                >
                  <span className="text-white text-[10px] font-bold">✓</span>
                </motion.div>
              )}
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
                    👋
                  </span>
                  {nudgedMembers.has(m.name) ? "Sent!" : "Nudge"}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <motion.button
        onClick={() => allJoined && navigate("/group/swipe")}
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
        {allJoined ? "Start Swiping! 🍽️" : `Waiting for ${members.length - joinedCount} more...`}
      </motion.button>

      <BottomNav />
    </div>
  );
}
