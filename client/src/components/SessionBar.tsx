import { useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useSessions, removeSession, type ActiveSession } from "@/lib/sessionStore";

function SessionCard({ session, onNavigate }: { session: ActiveSession; onNavigate: (route: string) => void }) {
  const elapsed = Math.floor((Date.now() - session.startedAt) / 60000);
  const timeLabel = elapsed < 1 ? "Just started" : `${elapsed}m ago`;

  const memberNames = useMemo(() => {
    if (session.type !== "group") return ["You"];
    const count = Math.max(1, Math.min(8, session.memberCount || 1));
    return Array.from({ length: count }).map((_, i) => (i === 0 ? "You" : `Member ${i + 1}`));
  }, [session.memberCount, session.type]);

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
              <div
                key={name}
                title={name}
                className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 text-[10px] font-semibold text-gray-700 flex items-center justify-center"
              >
                {name.slice(0, 1).toUpperCase()}
              </div>
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
