import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLineProfile } from "@/hooks/use-line-profile";
import { getAccessToken, login, isLoggedIn } from "@/lib/liff";

interface InvitePreview {
  initiatorDisplayName: string;
  initiatorPictureUrl: string | null;
  expiresAt: string;
  status: string;
}

export default function PartnerAccept() {
  const [, navigate] = useLocation();
  const { profile, liffReady } = useLineProfile();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setPreviewError("Invalid invite link.");
      return;
    }
    fetch(`/api/partner/invite/${token}`)
      .then(async (res) => {
        if (res.status === 410) {
          setPreviewError("This invite link has expired. Ask your partner to send a new one.");
          return;
        }
        if (res.status === 409) {
          setPreviewError("This invite link has already been used.");
          return;
        }
        if (!res.ok) {
          setPreviewError("Invite link not found.");
          return;
        }
        setPreview(await res.json());
      })
      .catch(() => setPreviewError("Failed to load invite. Check your connection and try again."));
  }, [token]);

  const handleAccept = async () => {
    if (!isLoggedIn()) {
      login(window.location.href);
      return;
    }

    setAccepting(true);
    setAcceptError(null);
    try {
      const bearerToken = getAccessToken();
      const res = await fetch("/api/partner/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        },
        body: JSON.stringify({ token }),
      });

      if (res.status === 410) {
        setAcceptError("This invite link has expired.");
        return;
      }
      if (res.status === 409) {
        setAcceptError("This invite link has already been used.");
        return;
      }
      if (res.status === 400) {
        const { message } = await res.json();
        setAcceptError(message ?? "Cannot accept this invite.");
        return;
      }
      if (!res.ok) {
        setAcceptError("Something went wrong. Please try again.");
        return;
      }

      setAccepted(true);
      setTimeout(() => navigate("/profile"), 2000);
    } catch {
      setAcceptError("Network error. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  if (accepted) {
    return (
      <div className="w-full min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-5xl">💕</div>
        <h1 className="text-2xl font-bold text-foreground">You're now linked!</h1>
        <p className="text-muted-foreground text-sm">
          You and {preview?.initiatorDisplayName} will get shared food recommendations.
        </p>
        <p className="text-[11px] text-muted-foreground/60">Redirecting to your profile…</p>
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="w-full min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-4xl">🔗</div>
        <h1 className="text-xl font-semibold text-foreground">Invite unavailable</h1>
        <p className="text-muted-foreground text-sm max-w-xs">{previewError}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-2 px-6 py-2.5 rounded-2xl bg-foreground text-white text-sm font-semibold active:scale-95 transition-transform"
        >
          Go Home
        </button>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="w-full min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="flex flex-col items-center gap-3">
        {preview.initiatorPictureUrl ? (
          <img
            src={preview.initiatorPictureUrl}
            alt={preview.initiatorDisplayName}
            className="w-20 h-20 rounded-full object-cover"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-3xl"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
          >
            {preview.initiatorDisplayName.charAt(0)}
          </div>
        )}
        <div className="text-2xl">💕</div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">
          {preview.initiatorDisplayName} invited you
        </h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          Link as food partners to get blended recommendations and see how well your tastes match.
        </p>
      </div>

      {acceptError && (
        <p className="text-red-500 text-sm">{acceptError}</p>
      )}

      {!liffReady || !profile ? (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <p className="text-sm text-muted-foreground">Sign in with LINE to accept the invite.</p>
          <button
            onClick={() => login(window.location.href)}
            className="w-full py-3 rounded-2xl bg-[#06C755] text-white font-semibold text-sm active:scale-95 transition-transform"
            style={{ boxShadow: "0 4px 16px rgba(6,199,85,0.3)" }}
          >
            Sign in with LINE
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full py-3 rounded-2xl font-semibold text-sm active:scale-95 transition-transform disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, hsl(348,83%,55%) 0%, hsl(20,90%,60%) 100%)",
              color: "white",
              boxShadow: "0 4px 20px rgba(220,38,38,0.25)",
            }}
          >
            {accepting ? "Linking…" : "Accept & Link"}
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full py-2.5 rounded-2xl text-sm text-muted-foreground font-medium bg-gray-100 active:scale-95 transition-transform"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}
