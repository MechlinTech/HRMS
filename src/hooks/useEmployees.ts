import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi, assetApi, hrReferralsApi, hrExitApi } from '@/services/api';
import { authApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useAllEmployees() {
  return useQuery({
    queryKey: ['all-employees'],
    queryFn: employeeApi.getAllEmployees,
  });
}

export function useEmployeeById(id: string) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeApi.getEmployeeById(id),
    enabled: !!id,
  });
}

export function useEmployeeAttendance(userId: string, year?: number) {
  return useQuery({
    queryKey: ['employee-attendance', userId, year],
    queryFn: () => employeeApi.getEmployeeAttendance(userId, year),
    enabled: !!userId,
  });
}

export function useAllEmployeesAttendance(year?: number, month?: number) {
  return useQuery({
    queryKey: ['all-employees-attendance', year, month],
    queryFn: () => employeeApi.getAllEmployeesAttendance(year, month),
    enabled: false, // Disable by default to prevent automatic loading
  });
}

export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuth();
  
  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: any }) =>
      authApi.updateProfile(userId, updates),
    onSuccess: async (updatedUser, { userId, updates }) => {
      queryClient.invalidateQueries({ queryKey: ['all-employees'] });
      
      // If the current user's permissions are being updated, update their session
      if (user && user.id === userId) {
        try {
          // Update the current user's session using the AuthContext
          await updateUser(updates);
          
          // For permission changes, we need a page refresh to ensure all components 
          // re-evaluate permissions and update the dashboard switcher
          if (updates.extra_permissions) {
            toast.success('Dashboard access updated successfully! Refreshing page to apply changes...');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            toast.success('Profile updated successfully!');
          }
        } catch (error) {
          console.error('Failed to update current user session:', error);
          if (updates.extra_permissions) {
            toast.success('Dashboard access updated successfully! Please refresh the page to see changes.');
          } else {
            toast.success('Profile updated successfully! Please refresh the page to see changes.');
          }
        }
      } else {
        // When updating another user's permissions
        if (updates.extra_permissions) {
          toast.success('Dashboard access updated successfully!');
        } else {
          toast.success('Employee updated successfully!');
        }
      }
    },
    onError: (error) => {
      toast.error('Failed to update dashboard access');
      console.error('Dashboard access update error:', error);
    },
  });
}

// Asset Management Hooks
export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: assetApi.getAllAssets,
  });
}

export function useAssetAssignments() {
  return useQuery({
    queryKey: ['asset-assignments'],
    queryFn: assetApi.getAssetAssignments,
  });
}

export function useAssetCategories() {
  return useQuery({
    queryKey: ['asset-categories'],
    queryFn: assetApi.getAssetCategories,
  });
}

export function useAvailableAssets() {
  return useQuery({
    queryKey: ['available-assets'],
    queryFn: assetApi.getAvailableAssets,
  });
}

export function useCreateAssetAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: assetApi.createAssetAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['available-assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset assigned successfully!');
    },
    onError: (error) => {
      toast.error('Failed to assign asset');
      console.error('Asset assignment error:', error);
    },
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: assetApi.createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['available-assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-metrics'] });
      toast.success('Asset created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create asset');
      console.error('Asset creation error:', error);
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      assetApi.updateAsset(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['available-assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['asset-metrics'] });
      toast.success('Asset updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update asset');
      console.error('Asset update error:', error);
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: assetApi.deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['available-assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-metrics'] });
      toast.success('Asset deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete asset');
      console.error('Asset deletion error:', error);
    },
  });
}

export function useUpdateAssetAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      assetApi.updateAssetAssignment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-metrics'] });
      toast.success('Asset assignment updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update asset assignment');
      console.error('Asset assignment update error:', error);
    },
  });
}

export function useDeleteAssetAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: assetApi.deleteAssetAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-metrics'] });
      toast.success('Asset assignment deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete asset assignment');
      console.error('Asset assignment deletion error:', error);
    },
  });
}

export function useAssetMetrics() {
  return useQuery({
    queryKey: ['asset-metrics'],
    queryFn: assetApi.getAssetMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      authApi.updateProfile(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-employees'] });
      toast.success('Employee updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update employee');
      console.error('Employee update error:', error);
    },
  });
}

export function useDeleteExitProcess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: hrExitApi.deleteExitProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-exit-processes'] });
      toast.success('Exit process deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete exit process');
      console.error('Exit process deletion error:', error);
    },
  });
}

// HR Referrals Hooks
export function useAllReferrals() {
  return useQuery({
    queryKey: ['all-referrals'],
    queryFn: hrReferralsApi.getAllReferrals,
  });
}

export function useUpdateReferralStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status, hrNotes }: { id: string; status: string; hrNotes?: string }) =>
      hrReferralsApi.updateReferralStatus(id, status, hrNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-referrals'] });
      toast.success('Referral status updated!');
    },
    onError: (error) => {
      toast.error('Failed to update referral status');
      console.error('Referral update error:', error);
    },
  });
}

// Exit Process Hooks
export function useAllExitProcesses() {
  return useQuery({
    queryKey: ['all-exit-processes'],
    queryFn: hrExitApi.getAllExitProcesses,
  });
}

export function useExitProcessById(id: string) {
  return useQuery({
    queryKey: ['exit-process', id],
    queryFn: () => hrExitApi.getExitProcessById(id),
    enabled: !!id,
  });
}

export function useUpdateExitProcess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      hrExitApi.updateExitProcess(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-exit-processes'] });
      toast.success('Exit process updated!');
    },
    onError: (error) => {
      toast.error('Failed to update exit process');
      console.error('Exit process update error:', error);
    },
  });
}