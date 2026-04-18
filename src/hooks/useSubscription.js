import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getSubscriptionStatus', {});
      return res.data;
    },
    staleTime: 30_000,
  });
}