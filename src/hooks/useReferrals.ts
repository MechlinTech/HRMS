import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referralsApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useJobPositions() {
  return useQuery({
    queryKey: ['job-positions'],
    queryFn: referralsApi.getJobPositions,
  });
}

export function useReferrals() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: () => referralsApi.getReferrals(user!.id),
    enabled: !!user?.id,
  });
}

export function useCreateReferral() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: referralsApi.createReferral,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals', user?.id] });
      toast.success('Referral submitted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to submit referral');
      console.error('Referral error:', error);
    },
  });
}