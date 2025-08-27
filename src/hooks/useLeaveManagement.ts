import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Hook for HR/Managers to manage leave applications
export function useAllLeaveApplications() {
  return useQuery({
    queryKey: ['all-leave-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_applications')
        .select(`
          *,
          user:users!user_id(full_name, employee_id, email),
          leave_type:leave_types!leave_type_id(name, description),
          approved_by_user:users!approved_by(full_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateLeaveApplicationStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      applicationId, 
      status, 
      comments 
    }: { 
      applicationId: string; 
      status: 'approved' | 'rejected' | 'cancelled'; 
      comments?: string; 
    }) => {
      const { data, error } = await supabase
        .from('leave_applications')
        .update({
          status,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          comments: comments || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select(`
          *,
          user:users!user_id(full_name, employee_id, email),
          leave_type:leave_types!leave_type_id(name, description),
          approved_by_user:users!approved_by(full_name)
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-leave-applications'] });
      queryClient.invalidateQueries({ queryKey: ['leave-applications'] });
      
      // The database trigger will automatically create the notification
      // and send push notification via the edge function
      
      toast.success(`Leave application ${data.status} successfully!`);
    },
    onError: (error) => {
      toast.error('Failed to update leave application');
      console.error('Leave application update error:', error);
    },
  });
}