import { useState } from "react";
import { HelpCircle, MessageCircle, Book, Search, ExternalLink, Clock, CheckCircle, AlertCircle, ChevronRight, X, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SUPPORT_TICKETS_INIT = [
  { id: "TK-124", subject: "Menu images not updating", status: "open" as const, priority: "medium" as const, created: "Mar 10, 2026", lastReply: "1h ago", messages: [
    { from: "you", text: "I uploaded new photos for my Pad Thai but they're not showing on the listing.", time: "Mar 10, 14:30" },
    { from: "support", text: "We're looking into this. It may be a CDN caching issue. Can you try clearing your browser cache?", time: "Mar 10, 15:45" },
    { from: "you", text: "Still not working after clearing cache.", time: "Mar 10, 16:00" },
  ] },
  { id: "TK-118", subject: "Delivery link not working for LINE MAN", status: "resolved" as const, priority: "high" as const, created: "Mar 5, 2026", lastReply: "2d ago", messages: [
    { from: "you", text: "My LINE MAN deep link is returning a 404 error when customers click it.", time: "Mar 5, 10:00" },
    { from: "support", text: "The URL format has changed. We've updated your link to the new format. Please test it now.", time: "Mar 5, 12:30" },
    { from: "you", text: "Working now, thank you!", time: "Mar 5, 13:00" },
  ] },
  { id: "TK-112", subject: "How to set up promotions?", status: "resolved" as const, priority: "low" as const, created: "Feb 28, 2026", lastReply: "1w ago", messages: [
    { from: "you", text: "I'd like to run a weekend promotion. How do I set it up?", time: "Feb 28, 09:00" },
    { from: "support", text: "Go to Promotions in the sidebar, click 'New Campaign', fill in the details and set your date range. Let me know if you need help!", time: "Feb 28, 11:00" },
  ] },
];

const FAQ_ITEMS = [
  { q: "How do I update my restaurant hours?", a: "Go to Menu & Hours → Operating Hours and click Edit. Changes are reflected within 5 minutes." },
  { q: "How do delivery links work?", a: "We generate deep links to Grab, LINE MAN, and Robinhood. Add your restaurant URL from each platform in Settings." },
  { q: "What is the Opportunity Score?", a: "It measures how well your listing is optimized. Complete recommendations in Insights to improve your score." },
  { q: "How do I respond to reviews?", a: "Go to Reviews → click any review → type your response. Responses appear publicly within 24 hours." },
  { q: "What are vibe tags?", a: "Tags like 'date night', 'street food', 'instagrammable' help users discover your restaurant. You can edit them in Settings." },
];

const ONBOARDING_STEPS = [
  { label: "Create account", done: true },
  { label: "Verify ownership", done: true },
  { label: "Add restaurant photos", done: true },
  { label: "Set operating hours", done: true },
  { label: "Add delivery links", done: false },
  { label: "Create first promotion", done: false },
  { label: "Set vibe tags", done: false },
];

export default function OwnerSupport() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [tickets, setTickets] = useState(SUPPORT_TICKETS_INIT);
  const [selectedTicket, setSelectedTicket] = useState<typeof SUPPORT_TICKETS_INIT[0] | null>(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({ subject: "", message: "", priority: "medium" as const });
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const completedSteps = ONBOARDING_STEPS.filter(s => s.done).length;
  const totalSteps = ONBOARDING_STEPS.length;

  const handleNewTicket = () => {
    if (!newTicketForm.subject.trim() || !newTicketForm.message.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const newId = `TK-${125 + tickets.length}`;
      const newTicket = {
        id: newId,
        subject: newTicketForm.subject,
        status: "open" as const,
        priority: newTicketForm.priority,
        created: "Just now",
        lastReply: "Just now",
        messages: [{ from: "you", text: newTicketForm.message, time: new Date().toLocaleString() }],
      };
      setTickets(prev => [newTicket, ...prev]);
      toast({ title: "Ticket Created", description: `${newId}: ${newTicketForm.subject}` });
      setNewTicketOpen(false);
      setNewTicketForm({ subject: "", message: "", priority: "medium" });
      setSubmitting(false);
    }, 1000);
  };

  const handleReply = () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSubmitting(true);
    setTimeout(() => {
      const updatedTickets = tickets.map(t => {
        if (t.id === selectedTicket.id) {
          return {
            ...t,
            lastReply: "Just now",
            messages: [...t.messages, { from: "you", text: replyText, time: new Date().toLocaleString() }],
          };
        }
        return t;
      });
      setTickets(updatedTickets);
      const updated = updatedTickets.find(t => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      setReplyText("");
      setSubmitting(false);
      toast({ title: "Reply Sent" });
    }, 800);
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

          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-tickets">
            <div className="flex items-center justify-between mb-5">
              <div className="border-l-[3px] pl-3" style={{ borderColor: "#00B14F" }}>
                <h3 className="text-[15px] font-semibold text-gray-800">Support Tickets</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Your requests</p>
              </div>
              <button
                onClick={() => setNewTicketOpen(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#00B14F] text-white hover:bg-[#00A046] transition-colors"
                data-testid="btn-new-ticket"
              >
                New Ticket
              </button>
            </div>
            <div className="space-y-2">
              {tickets.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
                  data-testid={`ticket-${ticket.id}`}
                >
                  {ticket.status === "open" ?
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" /> :
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">{ticket.id}</span>
                      <span className="text-sm font-medium text-gray-800 truncate">{ticket.subject}</span>
                    </div>
                    <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5">
                      <span>Created: {ticket.created}</span>
                      <span>Last reply: {ticket.lastReply}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    ticket.status === "open" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                  }`}>{ticket.status}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-onboarding">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "#00B14F" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Onboarding</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{completedSteps}/{totalSteps} complete</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-4">
              <div className="h-full rounded-full bg-[#00B14F] transition-all" style={{ width: `${(completedSteps / totalSteps) * 100}%` }} />
            </div>
            <div className="space-y-2">
              {ONBOARDING_STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-[#00B14F]" : "border-2 border-gray-200"}`}>
                    {step.done && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className={`text-sm ${step.done ? "text-gray-400 line-through" : "text-gray-800 font-medium"}`}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-contact">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "#00B14F" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Contact Us</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Direct support</p>
            </div>
            <div className="space-y-3">
              <a href="https://line.me/ti/p/@toastbkk" target="_blank" rel="noopener" className="flex items-center gap-3 p-3 rounded-xl bg-[#06C755]/10 hover:bg-[#06C755]/20 transition-colors" data-testid="link-line-support">
                <MessageCircle className="w-4 h-4 text-[#06C755]" />
                <span className="text-sm font-medium text-gray-800">LINE Chat</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 ml-auto" />
              </a>
              <a href="mailto:support@toastbkk.com" className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors" data-testid="link-email-support">
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
                <input type="text" value={newTicketForm.subject} onChange={e => setNewTicketForm({ ...newTicketForm, subject: e.target.value })} placeholder="Brief description of your issue" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-100" data-testid="input-ticket-subject" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Priority</label>
                <select value={newTicketForm.priority} onChange={e => setNewTicketForm({ ...newTicketForm, priority: e.target.value as any })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" data-testid="select-ticket-priority">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Message</label>
                <textarea value={newTicketForm.message} onChange={e => setNewTicketForm({ ...newTicketForm, message: e.target.value })} placeholder="Describe your issue in detail..." rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-100 resize-none" data-testid="textarea-ticket-message" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setNewTicketOpen(false)} className="px-4 py-2 text-sm text-gray-500 rounded-lg" data-testid="btn-cancel-ticket">Cancel</button>
              <button onClick={handleNewTicket} disabled={submitting} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[#00B14F] text-white rounded-lg hover:bg-[#00A046] disabled:opacity-50" data-testid="btn-submit-ticket">
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" data-testid="ticket-detail-dialog">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">{selectedTicket.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${selectedTicket.status === "open" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{selectedTicket.status}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mt-0.5">{selectedTicket.subject}</h3>
              </div>
              <button onClick={() => { setSelectedTicket(null); setReplyText(""); }} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200" data-testid="btn-close-ticket-detail">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 max-h-[50vh] overflow-y-auto space-y-3">
              {selectedTicket.messages.map((msg, i) => (
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
                  <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..."
                    onKeyDown={e => e.key === "Enter" && handleReply()}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-100" data-testid="input-ticket-reply" />
                  <button onClick={handleReply} disabled={!replyText.trim() || submitting} className="px-3 py-2 bg-[#00B14F] text-white rounded-lg hover:bg-[#00A046] disabled:opacity-50" data-testid="btn-send-reply">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
