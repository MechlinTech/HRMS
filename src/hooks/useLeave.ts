import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave-types'],
    queryFn: leaveApi.getLeaveTypes,
  });
}

export function useLeaveBalance() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['leave-balance', user?.id],
    queryFn: () => leaveApi.getLeaveBalance(user!.id),
    enabled: !!user?.id,
  });
}

export function useLeaveApplications() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['leave-applications', user?.id],
    queryFn: () => leaveApi.getLeaveApplications(user!.id),
    enabled: !!user?.id,
  });
}

export function useCreateLeaveApplication() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: leaveApi.createLeaveApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-applications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
      toast.success('Leave application submitted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to submit leave application');
      console.error('Leave application error:', error);
    },
  });
}