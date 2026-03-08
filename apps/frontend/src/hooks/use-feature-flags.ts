import { useQuery } from "@tanstack/react-query";

type FeatureFlags = Record<string, boolean>;

export function useFeatureFlags() {
  const { data: flags = {} } = useQuery<FeatureFlags>({
    queryKey: ["/api/config/features"],
    staleTime: 5 * 60 * 1000, // cache 5 minutes
  });

  /** Returns true while loading (so UI shows by default) */
  const isEnabled = (featureId: string): boolean => flags[featureId] ?? true;

  return { flags, isEnabled };
}
