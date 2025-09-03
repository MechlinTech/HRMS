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
      queryClient.invalidateQueries({ queryKey: ['employees-on-leave'] });
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

export function useEmployeesOnLeave(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['employees-on-leave', startDate, endDate],
    queryFn: () => leaveApi.getEmployeesOnLeave(startDate, endDate),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

export function useUserLeaveSummary() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-leave-summary', user?.id],
    queryFn: () => leaveApi.getUserLeaveSummary(user!.id),
    enabled: !!user?.id,
  });
}

export function useRecalculateUserBalance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: (userId?: string) => leaveApi.recalculateUserBalance(userId || user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balance', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-leave-summary', user?.id] });
      toast.success('Leave balance recalculated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to recalculate leave balance');
      console.error('Leave balance recalculation error:', error);
    },
  });
}

export function useTriggerLeaveMaintenence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: leaveApi.triggerLeaveMaintenence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      queryClient.invalidateQueries({ queryKey: ['user-leave-summary'] });
      toast.success('Leave maintenance completed successfully!');
    },
    onError: (error) => {
      toast.error('Failed to run leave maintenance');
      console.error('Leave maintenance error:', error);
    },
  });
}