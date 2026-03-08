import { useQuery } from "@tanstack/react-query";

type VibeFlags = Record<string, boolean>;

export function useVibesConfig() {
  const { data: flags = {} } = useQuery<VibeFlags>({
    queryKey: ["/api/config/vibes"],
    staleTime: 5 * 60 * 1000,
  });

  /** Returns true while loading or if the vibe is not in admin config (default-enabled) */
  const isVibeEnabled = (mode: string): boolean => flags[mode] ?? true;

  return { isVibeEnabled };
}
