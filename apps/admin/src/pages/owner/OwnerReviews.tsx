import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSession } from "../admin/AdminLayout";
import {
  MessageSquare,
  Star,
  Reply,
  Filter,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface ReviewItem {
  key: string;
  restaurantId: number;
  restaurantName: string;
  author: string;
  rating: number;
  text: string;
  originalText?: string | null;
  translatedText?: string | null;
  originalLanguageCode?: string | null;
  translatedLanguageCode?: string | null;
  timeAgo: string;
  ownerReply: string | null;
  repliedAt: string | null;
}

interface ReviewsData {
  stats: {
    avgRating: number;
    total: number;
    unreplied: number;
    responseRate: number;
  };
  reviews: ReviewItem[];
}

export default function OwnerReviews() {
  const session = getAdminSession();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "replied" | "unreplied">("all");
  const [textModeByReview, setTextModeByReview] = useState<Record<string, "default" | "original" | "translated">>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data, isLoading, isError } = useQuery<ReviewsData>({
    queryKey: ["owner-reviews"],
    queryFn: () =>
      fetch("/api/owner/reviews", { credentials: "include" }).then((r) => {
        if (!r.ok) throw new Error("Failed to load reviews");
        return r.json();
      }),
    enabled: !!session && session.sessionType === "owner",
  });

  const replyMutation = useMutation({
    mutationFn: ({ key, text }: { key: string; text: string }) =>
      fetch("/api/owner/reviews/reply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, text }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to save reply");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-reviews"] });
      setReplyingTo(null);
      setReplyText("");
    },
  });

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400" data-testid="text-access-denied">
          This page is only accessible to restaurant owners.
        </p>
      </div>
    );
  }

  const stats = data?.stats ?? { avgRating: 0, total: 0, unreplied: 0, responseRate: 0 };
  const allReviews = data?.reviews ?? [];

  const reviews = allReviews.filter((r) => {
    if (filter === "replied") return r.ownerReply !== null;
    if (filter === "unreplied") return r.ownerReply === null;
    return true;
  });

  const getDisplayedReviewText = (review: ReviewItem): string => {
    const mode = textModeByReview[review.key] ?? "default";
    if (mode === "original" && review.originalText?.trim()) return review.originalText.trim();
    if (mode === "translated" && review.translatedText?.trim()) return review.translatedText.trim();
    return review.text;
  };

  return (
    <div className="space-y-6" data-testid="owner-reviews-page">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-5 h-5 text-[#FFCC02]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800" data-testid="text-reviews-title">Reviews</h2>
          <p className="text-xs text-gray-400">Manage and respond to customer feedback</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="stat-avg-rating">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFCC02]/15 flex items-center justify-center">
              <Star className="w-4 h-4 text-[#FFCC02]" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Rating</span>
          </div>
          {isLoading ? (
            <div className="h-8 w-12 bg-gray-100 rounded animate-pulse" />
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-800">{stats.avgRating || "—"}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.total} total reviews</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="stat-response-rate">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#00B14F]/10 flex items-center justify-center">
              <Reply className="w-4 h-4 text-[#00B14F]" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Response Rate</span>
          </div>
          {isLoading ? (
            <div className="h-8 w-12 bg-gray-100 rounded animate-pulse" />
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-800">{stats.responseRate}%</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.total - stats.unreplied} of {stats.total} replied
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="stat-needs-reply">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Needs Reply</span>
          </div>
          {isLoading ? (
            <div className="h-8 w-12 bg-gray-100 rounded animate-pulse" />
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-800">{stats.unreplied}</p>
              <p className="text-xs text-gray-400 mt-1">Pending responses</p>
            </>
          )}
        </div>
      </div>

      {/* Reviews list */}
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
                {f === "unreplied" && stats.unreplied > 0 && (
                  <span className="ml-1 bg-red-400 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                    {stats.unreplied}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading reviews…</span>
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-16 text-sm text-red-400">
            Failed to load reviews. Please refresh.
          </div>
        )}

        {!isLoading && !isError && reviews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
            <MessageSquare className="w-8 h-8 text-gray-200" />
            <p className="text-sm">
              {filter === "all" ? "No reviews yet" : filter === "unreplied" ? "All reviews have been replied to" : "No replied reviews yet"}
            </p>
          </div>
        )}

        <div className="divide-y divide-gray-50">
          {reviews.map((review) => (
            <div key={review.key} className="p-5" data-testid={`review-${review.key}`}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 shrink-0">
                  {review.author.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{review.author}</span>
                      <span className="text-[10px] text-gray-300 bg-gray-50 rounded px-1.5 py-0.5">
                        {review.restaurantName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{review.timeAgo}</span>
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

                  {review.originalText?.trim() && review.translatedText?.trim() && review.originalText.trim() !== review.translatedText.trim() && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                      <button
                        type="button"
                        onClick={() => setTextModeByReview((prev) => ({ ...prev, [review.key]: "original" }))}
                        className={`text-[11px] px-2 py-1 rounded-md transition-all ${
                          (textModeByReview[review.key] ?? "default") === "original"
                            ? "bg-white text-gray-800 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                        data-testid={`review-original-${review.key}`}
                      >
                        Original {review.originalLanguageCode ? `(${review.originalLanguageCode})` : ""}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTextModeByReview((prev) => ({ ...prev, [review.key]: "translated" }))}
                        className={`text-[11px] px-2 py-1 rounded-md transition-all ${
                          (textModeByReview[review.key] ?? "default") === "translated"
                            ? "bg-white text-gray-800 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                        data-testid={`review-translated-${review.key}`}
                      >
                        Translated {review.translatedLanguageCode ? `(${review.translatedLanguageCode})` : ""}
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{getDisplayedReviewText(review)}</p>

                  {/* Existing owner reply */}
                  {review.ownerReply && (
                    <div className="mt-3 bg-[#FFCC02]/8 border border-[#FFCC02]/20 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] font-bold text-[#b89000] uppercase tracking-widest mb-1">Your reply</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{review.ownerReply}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-3">
                    {review.ownerReply ? (
                      <button
                        onClick={() => { setReplyingTo(review.key); setReplyText(review.ownerReply ?? ""); }}
                        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                        data-testid={`button-edit-reply-${review.key}`}
                      >
                        <Reply className="w-3 h-3" /> Edit reply
                      </button>
                    ) : (
                      <button
                        onClick={() => { setReplyingTo(review.key); setReplyText(""); }}
                        className="text-xs text-[#FFCC02] font-medium hover:text-[#FFCC02]/80 flex items-center gap-1 transition-colors"
                        data-testid={`button-reply-${review.key}`}
                      >
                        <Reply className="w-3 h-3" /> Reply
                      </button>
                    )}
                  </div>

                  {replyingTo === review.key && (
                    <div className="mt-3 bg-gray-50 rounded-xl p-3 space-y-2" data-testid={`reply-form-${review.key}`}>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your response…"
                        rows={3}
                        className="w-full text-sm border border-gray-100 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#FFCC02]/30 bg-white"
                        data-testid={`textarea-reply-${review.key}`}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setReplyingTo(null); setReplyText(""); }}
                          className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 transition-colors"
                          data-testid={`button-cancel-reply-${review.key}`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => replyMutation.mutate({ key: review.key, text: replyText })}
                          disabled={!replyText.trim() || replyMutation.isPending}
                          className="text-xs font-medium bg-[#FFCC02] text-gray-900 px-4 py-1.5 rounded-lg hover:bg-[#FFCC02]/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                          data-testid={`button-send-reply-${review.key}`}
                        >
                          {replyMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
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
