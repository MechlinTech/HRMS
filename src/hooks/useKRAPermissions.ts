import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export interface KRAPermissions {
  // View permissions
  canViewOwnKRA: boolean;
  canViewTeamKRA: boolean;
  canViewAllKRA: boolean;
  
  // Template permissions
  canCreateTemplates: boolean;
  canEditTemplates: boolean;
  canDeleteTemplates: boolean;
  
  // Assignment permissions
  canAssignKRA: boolean;
  canViewAssignments: boolean;
  canEditAssignments: boolean;
  
  // Evaluation permissions
  canEvaluateOwn: boolean;
  canEvaluateTeam: boolean;
  canEvaluateAll: boolean;
  canEditEvaluations: boolean;
  
  // Manager actions
  canAddManagerComments: boolean;
  canApproveEvaluations: boolean;
  
  // Data access level
  accessLevel: 'none' | 'own' | 'team' | 'all';
  isReadOnly: boolean;
}

export function useKRAPermissions(): KRAPermissions {
  const { user } = useAuth();
  
  return useMemo(() => {
    // Simplified permissions - everyone gets full access for now
    const permissions: KRAPermissions = {
      canViewOwnKRA: true,
      canViewTeamKRA: true,
      canViewAllKRA: true,
      canCreateTemplates: true,
      canEditTemplates: true,
      canDeleteTemplates: true,
      canAssignKRA: true,
      canViewAssignments: true,
      canEditAssignments: true,
      canEvaluateOwn: true,
      canEvaluateTeam: true,
      canEvaluateAll: true,
      canEditEvaluations: true,
      canAddManagerComments: true,
      canApproveEvaluations: true,
      accessLevel: 'all',
      isReadOnly: false,
    };
    
    return permissions;
  }, [user?.role_id]);
}

export function useCanAccessKRADashboard(): boolean {
  const permissions = useKRAPermissions();
  return permissions.accessLevel !== 'none';
}

export function useCanEditKRA(): boolean {
  const permissions = useKRAPermissions();
  return !permissions.isReadOnly;
}

export function useKRAAccessLevel(): 'none' | 'own' | 'team' | 'all' {
  const permissions = useKRAPermissions();
  return permissions.accessLevel;
}
