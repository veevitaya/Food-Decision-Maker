import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdBanner } from "@shared/schema";

type PublicBannerSlotProps = {
  position: string;
  className?: string;
};

function getImpressionKey(bannerId: number): string {
  return `toast_banner_impression_${bannerId}`;
}

async function postBannerEvent(bannerId: number, eventType: "impression" | "click"): Promise<void> {
  try {
    await fetch(`/api/public/banners/${bannerId}/${eventType}`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
    });
  } catch {
    // Fire-and-forget tracking should not block UI rendering or navigation.
  }
}

export function PublicBannerSlot({ position, className = "" }: PublicBannerSlotProps) {
  const trackedBannerIdRef = useRef<number | null>(null);

  const { data: banners = [] } = useQuery<AdBanner[]>({
    queryKey: ["/api/public/banners", position],
    queryFn: async () => {
      const params = new URLSearchParams({ position, limit: "1" });
      const res = await fetch(`/api/public/banners?${params.toString()}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  const banner = useMemo(() => banners[0], [banners]);

  useEffect(() => {
    if (!banner) return;
    if (trackedBannerIdRef.current === banner.id) return;
    trackedBannerIdRef.current = banner.id;

    let shouldTrack = true;
    try {
      const key = getImpressionKey(banner.id);
      if (sessionStorage.getItem(key) === "1") {
        shouldTrack = false;
      } else {
        sessionStorage.setItem(key, "1");
      }
    } catch {
      // Continue with tracking even if sessionStorage is unavailable.
    }

    if (!shouldTrack) return;
    void postBannerEvent(banner.id, "impression");
  }, [banner]);

  if (!banner) return null;

  const image = (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-50" data-testid={`public-banner-${position}`}>
      <img src={banner.imageUrl} alt={banner.title} className="h-36 w-full object-cover" loading="lazy" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <p className="line-clamp-2 text-sm font-semibold text-white">{banner.title}</p>
      </div>
    </div>
  );

  const linkUrl = banner.linkUrl?.trim();

  return (
    <div className={className}>
      {linkUrl ? (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            void postBannerEvent(banner.id, "click");
          }}
          className="block active:scale-[0.99] transition-transform"
          data-testid={`public-banner-link-${banner.id}`}
        >
          {image}
        </a>
      ) : (
        image
      )}
    </div>
  );
}
