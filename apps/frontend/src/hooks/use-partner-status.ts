import { useQuery } from "@tanstack/react-query";

export interface PartnerStatus {
  linked: boolean;
  partnerLineUserId: string | null;
  partnerDisplayName: string | null;
  partnerPictureUrl: string | null;
}

export function usePartnerStatus(lineUserId: string | undefined): {
  partnerStatus: PartnerStatus;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/profile", lineUserId],
    enabled: !!lineUserId,
    queryFn: async () => {
      const res = await fetch(`/api/profile/${lineUserId}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30_000,
  });

  return {
    partnerStatus: {
      linked: !!data?.partnerLineUserId,
      partnerLineUserId: data?.partnerLineUserId ?? null,
      partnerDisplayName: data?.partnerDisplayName ?? null,
      partnerPictureUrl: data?.partnerPictureUrl ?? null,
    },
    isLoading,
  };
}
