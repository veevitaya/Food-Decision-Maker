import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, MessageCircle, Book, Search, ExternalLink, Clock, CheckCircle, AlertCircle, ChevronRight, X, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FAQ_ITEMS = [
  { q: "How do I update my restaurant hours?", a: "Go to Menu & Hours → Operating Hours and click Edit. Changes are reflected within 5 minutes." },
  { q: "How do delivery links work?", a: "We generate deep links to Grab, LINE MAN, and Robinhood. Add your restaurant URL from each platform in Settings." },
  { q: "What is the Opportunity Score?", a: "It measures how well your listing is optimized. Complete recommendations in Insights to improve your score." },
  { q: "How do I respond to reviews?", a: "Go to Reviews → click any review → type your response. Responses appear publicly within 24 hours." },
  { q: "What are vibe tags?", a: "Tags like 'date night', 'street food', 'instagrammable' help users discover your restaurant. You can edit them in Settings." },
];

type Ticket = {
  id: number;
  subject: string;
  status: "open" | "resolved";
  priority: "low" | "medium" | "high";
  messages: { from: string; text: string; time: string }[];
  createdAt: string;
  updatedAt: string;
};

type OnboardingStep = { label: string; done: boolean };

export default function OwnerSupport() {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({ subject: "", message: "", priority: "medium" as const });
  const [replyText, setReplyText] = useState("");
  const { toast } = useToast();

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/owner/support/tickets"],
    staleTime: 60 * 1000,
  });

  const { data: onboardingData } = useQuery<{ steps: OnboardingStep[] }>({
    queryKey: ["/api/owner/onboarding"],
    staleTime: 5 * 60 * 1000,
  });

  const steps: OnboardingStep[] = onboardingData?.steps ?? [];
  const completedSteps = steps.filter(s => s.done).length;
  const totalSteps = steps.length;

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/owner/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: newTicketForm.subject, priority: newTicketForm.priority, message: newTicketForm.message }),
      });
      if (!res.ok) throw new Error("Failed to create ticket");
      return res.json();
    },
    onSuccess: (ticket: Ticket) => {
      qc.invalidateQueries({ queryKey: ["/api/owner/support/tickets"] });
      toast({ title: "Ticket Created", description: `${ticket.id}: ${ticket.subject}` });
      setNewTicketOpen(false);
      setNewTicketForm({ subject: "", message: "", priority: "medium" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create ticket.", variant: "destructive" }),
  });

  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, text }: { ticketId: number; text: string }) => {
      const res = await fetch(`/api/owner/support/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      return res.json();
    },
    onSuccess: (updated: Ticket) => {
      qc.invalidateQueries({ queryKey: ["/api/owner/support/tickets"] });
      setSelectedTicket(updated);
      setReplyText("");
      toast({ title: "Reply Sent" });
    },
    onError: () => toast({ title: "Error", description: "Failed to send reply.", variant: "destructive" }),
  });

  const handleNewTicket = () => {
    if (!newTicketForm.subject.trim() || !newTicketForm.message.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  const handleReply = () => {
    if (!replyText.trim() || !selectedTicket) return;
    replyMutation.mutate({ ticketId: selectedTicket.id, text: replyText });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-8" data-testid="owner-support-page">
      <div className="flex items-center gap-3">
        <HelpCircle className="w-5 h-5" style={{ color: "#00B14F" }} />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Support</h2>
          <p className="text-xs text-muted-foreground">Help center, support tickets, and onboarding progress</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* FAQ */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-faq">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "#00B14F" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Help Center</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Frequently asked questions</p>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search help articles..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300" data-testid="input-search-faq" />
            </div>
            <div className="space-y-1.5">
              {FAQ_ITEMS.filter(f => !searchQuery || f.q.toLowerCase().includes(searchQuery.toLowerCase())).map((faq, i) => (
                <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors" data-testid={`faq-item-${i}`}>
                    <Book className="w-4 h-4 text-[#00B14F] flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium text-gray-800">{faq.q}</span>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedFaq === i ? "rotate-90" : ""}`} />
                  </button>
                  {expandedFaq === i && (
                    <div className="px-4 pb-3 pt-0 ml-7">
                      <p className="text-sm text-gray-600">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tickets */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-tickets">
            <div className="flex items-center justify-between mb-5">
              <div className="border-l-[3px] pl-3" style={{ borderColor: "#00B14F" }}>
                <h3 className="text-[15px] font-semibold text-gray-800">Support Tickets</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Your requests</p>
              </div>
              <button onClick={() => setNewTicketOpen(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#00B14F] text-white hover:bg-[#00A046] transition-colors"
                data-testid="btn-new-ticket">
                New Ticket
              </button>
            </div>
            {ticketsLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No tickets yet. Click "New Ticket" to get help.</p>
            ) : (
              <div className="space-y-2">
                {tickets.map(ticket => (
                  <div key={ticket.id} onClick={() => setSelectedTicket(ticket)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
                    data-testid={`ticket-${ticket.id}`}>
                    {ticket.status === "open"
                      ? <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      : <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">#{ticket.id}</span>
                        <span className="text-sm font-medium text-gray-800 truncate">{ticket.subject}</span>
                      </div>
                      <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span>Created: {formatDate(ticket.createdAt)}</span>
                        <span>Updated: {formatDate(ticket.updatedAt)}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      ticket.status === "open" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                    }`}>{ticket.status}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Onboarding */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-onboarding">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "#00B14F" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Onboarding</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                {totalSteps > 0 ? `${completedSteps}/${totalSteps} complete` : "Loading..."}
              </p>
            </div>
            {totalSteps > 0 && (
              <>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-4">
                  <div className="h-full rounded-full bg-[#00B14F] transition-all" style={{ width: `${(completedSteps / totalSteps) * 100}%` }} />
                </div>
                <div className="space-y-2">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-[#00B14F]" : "border-2 border-gray-200"}`}>
                        {step.done && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className={`text-sm ${step.done ? "text-gray-400 line-through" : "text-gray-800 font-medium"}`}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-contact">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "#00B14F" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Contact Us</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Direct support</p>
            </div>
            <div className="space-y-3">
              <a href="https://line.me/ti/p/@toastbkk" target="_blank" rel="noopener"
                className="flex items-center gap-3 p-3 rounded-xl bg-[#06C755]/10 hover:bg-[#06C755]/20 transition-colors" data-testid="link-line-support">
                <MessageCircle className="w-4 h-4 text-[#06C755]" />
                <span className="text-sm font-medium text-gray-800">LINE Chat</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 ml-auto" />
              </a>
              <a href="mailto:support@toastbkk.com"
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors" data-testid="link-email-support">
                <MessageCircle className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-800">Email Support</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 ml-auto" />
              </a>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Response time: within 24 hours
            </p>
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      {newTicketOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" data-testid="new-ticket-dialog">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">New Support Ticket</h3>
              <button onClick={() => setNewTicketOpen(false)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200" data-testid="btn-close-new-ticket">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Subject</label>
                <input type="text" value={newTicketForm.subject} onChange={e => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-100" data-testid="input-ticket-subject" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Priority</label>
                <select value={newTicketForm.priority} onChange={e => setNewTicketForm({ ...newTicketForm, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" data-testid="select-ticket-priority">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Message</label>
                <textarea value={newTicketForm.message} onChange={e => setNewTicketForm({ ...newTicketForm, message: e.target.value })}
                  placeholder="Describe your issue in detail..." rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-100 resize-none" data-testid="textarea-ticket-message" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setNewTicketOpen(false)} className="px-4 py-2 text-sm text-gray-500 rounded-lg" data-testid="btn-cancel-ticket">Cancel</button>
              <button onClick={handleNewTicket} disabled={createMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[#00B14F] text-white rounded-lg hover:bg-[#00A046] disabled:opacity-50" data-testid="btn-submit-ticket">
                {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" data-testid="ticket-detail-dialog">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">#{selectedTicket.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${selectedTicket.status === "open" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{selectedTicket.status}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mt-0.5">{selectedTicket.subject}</h3>
              </div>
              <button onClick={() => { setSelectedTicket(null); setReplyText(""); }}
                className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200" data-testid="btn-close-ticket-detail">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 max-h-[50vh] overflow-y-auto space-y-3">
              {(selectedTicket.messages as any[]).map((msg, i) => (
                <div key={i} className={`flex ${msg.from === "you" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${msg.from === "you" ? "bg-[#00B14F]/10 text-gray-800 rounded-br-sm" : "bg-gray-100 text-gray-700 rounded-bl-sm"}`}>
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>
            {selectedTicket.status === "open" && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <div className="flex gap-2">
                  <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    onKeyDown={e => e.key === "Enter" && handleReply()}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-100" data-testid="input-ticket-reply" />
                  <button onClick={handleReply} disabled={!replyText.trim() || replyMutation.isPending}
                    className="px-3 py-2 bg-[#00B14F] text-white rounded-lg hover:bg-[#00A046] disabled:opacity-50" data-testid="btn-send-reply">
                    {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
