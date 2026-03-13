import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminSession } from "./AdminLayout";
import {
  MessageSquare,
  Star,
  ThumbsUp,
  Reply,
  Filter,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

function getOwnerHeaders() {
  const session = getAdminSession();
  if (!session || session.sessionType !== "owner") return {};
  return { "x-owner-token": btoa(`${session.email}:`) };
}

interface Review {
  id: number;
  userName: string;
  avatarUrl: string;
  rating: number;
  text: string;
  date: string;
  helpful: number;
  replied: boolean;
  source: string;
}

const MOCK_REVIEWS: Review[] = [
  {
    id: 1,
    userName: "Somchai K.",
    avatarUrl: "",
    rating: 5,
    text: "Best pad thai in Bangkok! The prawns were fresh and perfectly cooked. Will definitely come back.",
    date: "2 days ago",
    helpful: 12,
    replied: true,
    source: "Toast",
  },
  {
    id: 2,
    userName: "Sarah M.",
    avatarUrl: "",
    rating: 4,
    text: "Great food and atmosphere. A bit pricey but worth it for a special occasion. The green curry was amazing.",
    date: "5 days ago",
    helpful: 8,
    replied: false,
    source: "Google",
  },
  {
    id: 3,
    userName: "Tanaka H.",
    avatarUrl: "",
    rating: 3,
    text: "Food was good but service was slow during peak hours. The mango sticky rice dessert was excellent though.",
    date: "1 week ago",
    helpful: 3,
    replied: false,
    source: "Toast",
  },
  {
    id: 4,
    userName: "Lisa W.",
    avatarUrl: "",
    rating: 5,
    text: "Absolutely loved everything! The atmosphere is cozy and the staff is super friendly. 10/10 recommend.",
    date: "2 weeks ago",
    helpful: 15,
    replied: true,
    source: "Google",
  },
  {
    id: 5,
    userName: "Mike R.",
    avatarUrl: "",
    rating: 2,
    text: "Waited 45 minutes for our order. Food was mediocre when it finally arrived. Disappointing experience.",
    date: "3 weeks ago",
    helpful: 6,
    replied: true,
    source: "Toast",
  },
];

export default function OwnerReviews() {
  const session = getAdminSession();
  const [filter, setFilter] = useState<"all" | "replied" | "unreplied">("all");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const reviews = MOCK_REVIEWS.filter((r) => {
    if (filter === "replied") return r.replied;
    if (filter === "unreplied") return !r.replied;
    return true;
  });

  const avgRating = (MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / MOCK_REVIEWS.length).toFixed(1);
  const unrepliedCount = MOCK_REVIEWS.filter((r) => !r.replied).length;

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400" data-testid="text-access-denied">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="owner-reviews-page">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-5 h-5 text-[#FFCC02]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800" data-testid="text-reviews-title">Reviews</h2>
          <p className="text-xs text-gray-400">Manage and respond to customer feedback</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="stat-avg-rating">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFCC02]/15 flex items-center justify-center">
              <Star className="w-4 h-4 text-[#FFCC02]" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Rating</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{avgRating}</p>
          <p className="text-xs text-gray-400 mt-1">{MOCK_REVIEWS.length} total reviews</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="stat-response-rate">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#00B14F]/10 flex items-center justify-center">
              <Reply className="w-4 h-4 text-[#00B14F]" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Response Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {Math.round(((MOCK_REVIEWS.length - unrepliedCount) / MOCK_REVIEWS.length) * 100)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">{MOCK_REVIEWS.length - unrepliedCount} of {MOCK_REVIEWS.length} replied</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="stat-needs-reply">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Needs Reply</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{unrepliedCount}</p>
          <p className="text-xs text-gray-400 mt-1">Pending responses</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm" data-testid="section-reviews-list">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-[15px] font-semibold text-gray-800">Customer Reviews</h3>
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5">
            {(["all", "unreplied", "replied"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                  filter === f
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                data-testid={`filter-${f}`}
              >
                {f === "all" ? "All" : f === "unreplied" ? "Needs Reply" : "Replied"}
                {f === "unreplied" && unrepliedCount > 0 && (
                  <span className="ml-1 bg-red-400 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{unrepliedCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {reviews.map((review) => (
            <div key={review.id} className="p-5" data-testid={`review-${review.id}`}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 shrink-0">
                  {review.userName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{review.userName}</span>
                      <span className="text-[10px] text-gray-300 bg-gray-50 rounded px-1.5 py-0.5">{review.source}</span>
                    </div>
                    <span className="text-xs text-gray-400">{review.date}</span>
                  </div>

                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-100 text-gray-100"
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{review.text}</p>

                  <div className="flex items-center gap-4 mt-3">
                    <button className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors" data-testid={`button-helpful-${review.id}`}>
                      <ThumbsUp className="w-3 h-3" /> {review.helpful} helpful
                    </button>
                    {review.replied ? (
                      <span className="text-xs text-[#00B14F] flex items-center gap-1">
                        <Reply className="w-3 h-3" /> Replied
                      </span>
                    ) : (
                      <button
                        onClick={() => { setReplyingTo(review.id); setReplyText(""); }}
                        className="text-xs text-[#FFCC02] font-medium hover:text-[#FFCC02]/80 flex items-center gap-1 transition-colors"
                        data-testid={`button-reply-${review.id}`}
                      >
                        <Reply className="w-3 h-3" /> Reply
                      </button>
                    )}
                  </div>

                  {replyingTo === review.id && (
                    <div className="mt-3 bg-gray-50 rounded-xl p-3 space-y-2" data-testid={`reply-form-${review.id}`}>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your response..."
                        rows={3}
                        className="w-full text-sm border border-gray-100 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#FFCC02]/30 bg-white"
                        data-testid={`textarea-reply-${review.id}`}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 transition-colors"
                          data-testid={`button-cancel-reply-${review.id}`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => { setReplyingTo(null); }}
                          className="text-xs font-medium bg-[#FFCC02] text-gray-900 px-4 py-1.5 rounded-lg hover:bg-[#FFCC02]/90 transition-colors"
                          data-testid={`button-send-reply-${review.id}`}
                        >
                          Send Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
