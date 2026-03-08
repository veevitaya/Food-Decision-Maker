import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useSessions, removeSession, type ActiveSession } from "@/lib/sessionStore";

const MEMBER_AVATARS: Record<string, string> = {
  You: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  Nook: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  Beam: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face",
};

function SessionCard({ session, onNavigate }: { session: ActiveSession; onNavigate: (route: string) => void }) {
  const elapsed = Math.floor((Date.now() - session.startedAt) / 60000);
  const timeLabel = elapsed < 1 ? "Just started" : `${elapsed}m ago`;

  const memberNames = session.type === "group" ? ["You", "Nook", "Beam"] : ["You"];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, x: 40 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.85, x: -40 }}
      transition={{ type: "spring", damping: 22, stiffness: 200 }}
      className="flex-shrink-0 w-[280px] snap-center"
    >
      <motion.div
        className="bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between cursor-pointer relative overflow-hidden border border-gray-200/60"
        style={{ boxShadow: "0 8px 30px -6px rgba(0,0,0,0.12), 0 2px 8px -2px rgba(0,0,0,0.06)" }}
        onClick={() => onNavigate(session.route)}
        whileTap={{ scale: 0.97 }}
        data-testid={`session-card-${session.id}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex -space-x-1.5 flex-shrink-0">
            {memberNames.map((name) => (
              <img
                key={name}
                src={MEMBER_AVATARS[name] || MEMBER_AVATARS.You}
                alt={name}
                className="w-7 h-7 rounded-full border-2 border-white object-cover"
              />
            ))}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-foreground truncate">{session.label}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {session.type === "group"
                ? `${session.memberCount || 0} members · ${session.matchCount || 0} matches`
                : timeLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-medium text-muted-foreground">Live</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            removeSession(session.id);
          }}
          className="absolute top-1 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-foreground/80 hover:bg-gray-100 transition-colors"
          data-testid={`button-close-session-${session.id}`}
        >
          <span className="text-[10px] leading-none">✕</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

export function SessionBar() {
  const sessions = useSessions();
  const [, navigate] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (sessions.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed bottom-5 left-0 right-0 z-[100]"
      data-testid="session-bar"
    >
      {sessions.length > 1 && (
        <div className="flex justify-center mb-1.5 gap-1">
          {sessions.map((s, i) => (
            <div
              key={s.id}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === 0 ? "bg-foreground/60" : "bg-foreground/20"}`}
            />
          ))}
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex gap-3 px-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        <AnimatePresence mode="popLayout">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onNavigate={navigate}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
