import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface KRACategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface KRAEvaluationLevel {
  id: string;
  level_number: number;
  level_name: string;
  description?: string;
}

export interface KRATemplate {
  id: string;
  template_name: string;
  description?: string;
  evaluation_period_start: string;
  evaluation_period_end: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_by: string;
  department_id?: string;
  total_weight: number;
  created_at: string;
  updated_at: string;
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  department?: {
    id: string;
    name: string;
  };
  goals?: KRAGoal[];
}

export interface KRAGoal {
  id: string;
  template_id: string;
  goal_id: string;
  strategic_goal_title: string;
  category_id?: string;
  smart_goal: string;
  weight: number;
  max_score: number;
  target: string;
  dependencies?: string;
  level_1_marks: string;
  level_2_marks: string;
  level_3_marks: string;
  level_4_marks: string;
  level_5_marks: string;
  level_1_points: number;
  level_2_points: number;
  level_3_points: number;
  level_4_points: number;
  level_5_points: number;
  level_1_rating: string;
  level_2_rating: string;
  level_3_rating: string;
  level_4_rating: string;
  level_5_rating: string;
  manager_comments?: string;
  display_order: number;
  category?: KRACategory;
}

export interface KRAAssignment {
  id: string;
  template_id: string;
  employee_id: string;
  assigned_by: string;
  assigned_date: string;
  due_date?: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'evaluated' | 'approved';
  total_score: number;
  total_possible_score: number;
  overall_percentage: number;
  overall_rating?: string;
  submitted_at?: string;
  submitted_by?: string;
  evaluated_at?: string;
  evaluated_by?: string;
  template?: KRATemplate;
  employee?: {
    id: string;
    full_name: string;
    email: string;
    employee_id?: string;
  };
  assigned_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  evaluations?: KRAEvaluation[];
}

export interface KRAEvaluation {
  id: string;
  assignment_id: string;
  goal_id: string;
  employee_comments?: string;
  employee_submitted_at?: string;
  selected_level?: number;
  awarded_marks: string;
  awarded_points: number;
  final_rating?: string;
  manager_evaluation_comments?: string;
  manager_evaluated_at?: string;
  manager_evaluated_by?: string;
  weighted_score: number;
  goal?: KRAGoal;
}

// Hooks for KRA Categories
export function useKRACategories() {
  return useQuery({
    queryKey: ['kra-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kra_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as KRACategory[];
    },
  });
}

// Hooks for KRA Evaluation Levels
export function useKRAEvaluationLevels() {
  return useQuery({
    queryKey: ['kra-evaluation-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kra_evaluation_levels')
        .select('*')
        .order('level_number');

      if (error) throw error;
      return data as KRAEvaluationLevel[];
    },
  });
}

// Hooks for KRA Templates
export function useKRATemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['kra-templates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kra_templates')
        .select(`
          *,
          created_by_user:users!kra_templates_created_by_fkey (
            id, full_name, email
          ),
          department:departments (
            id, name
          ),
          goals:kra_goals (
            *,
            category:kra_categories (
              id, name, description
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KRATemplate[];
    },
  });
}

export function useKRATemplate(templateId: string) {
  return useQuery({
    queryKey: ['kra-template', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kra_templates')
        .select(`
          *,
          created_by_user:users!kra_templates_created_by_fkey (
            id, full_name, email
          ),
          department:departments (
            id, name
          ),
          goals:kra_goals (
            *,
            category:kra_categories (
              id, name, description
            )
          )
        `)
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data as KRATemplate;
    },
    enabled: !!templateId,
  });
}

// Hook for creating KRA template
export function useCreateKRATemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateData: Partial<KRATemplate>) => {
      const { data, error } = await supabase
        .from('kra_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kra-templates'] });
      toast.success('KRA template created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create KRA template: ' + error.message);
    },
  });
}

// Hook for updating KRA template
export function useUpdateKRATemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...templateData }: Partial<KRATemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('kra_templates')
        .update(templateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kra-templates'] });
      queryClient.invalidateQueries({ queryKey: ['kra-template'] });
      toast.success('KRA template updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update KRA template: ' + error.message);
    },
  });
}

// Hook for creating KRA goals
export function useCreateKRAGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalData: Partial<KRAGoal>) => {
      const { data, error } = await supabase
        .from('kra_goals')
        .insert(goalData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kra-template', variables.template_id] });
      queryClient.invalidateQueries({ queryKey: ['kra-templates'] });
      toast.success('KRA goal added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add KRA goal: ' + error.message);
    },
  });
}

// Hook for updating KRA goals
export function useUpdateKRAGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...goalData }: Partial<KRAGoal> & { id: string }) => {
      const { data, error } = await supabase
        .from('kra_goals')
        .update(goalData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kra-template', data.template_id] });
      queryClient.invalidateQueries({ queryKey: ['kra-templates'] });
      toast.success('KRA goal updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update KRA goal: ' + error.message);
    },
  });
}

// Hook for KRA assignments (for managers)
export function useKRAAssignments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['kra-assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kra_assignments')
        .select(`
          *,
          template:kra_templates (
            id, template_name, evaluation_period_start, evaluation_period_end
          ),
          employee:users!kra_assignments_employee_id_fkey (
            id, full_name, email, employee_id
          ),
          assigned_by_user:users!kra_assignments_assigned_by_fkey (
            id, full_name, email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KRAAssignment[];
    },
  });
}

// Hook for employee's KRA assignments
export function useMyKRAAssignments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-kra-assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kra_assignments')
        .select(`
          *,
          template:kra_templates (
            id, template_name, evaluation_period_start, evaluation_period_end, description
          ),
          assigned_by_user:users!kra_assignments_assigned_by_fkey (
            id, full_name, email
          )
        `)
        .eq('employee_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KRAAssignment[];
    },
    enabled: !!user?.id,
  });
}

// Hook for getting KRA assignment details with evaluations
export function useKRAAssignmentDetails(assignmentId: string) {
  return useQuery({
    queryKey: ['kra-assignment-details', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kra_assignments')
        .select(`
          *,
          template:kra_templates (
            *,
            goals:kra_goals (
              *,
              category:kra_categories (
                id, name, description
              )
            )
          ),
          employee:users!kra_assignments_employee_id_fkey (
            id, full_name, email, employee_id
          ),
          assigned_by_user:users!kra_assignments_assigned_by_fkey (
            id, full_name, email
          ),
          evaluations:kra_evaluations (
            *,
            goal:kra_goals (
              id, goal_id, strategic_goal_title, weight
            )
          )
        `)
        .eq('id', assignmentId)
        .single();

      if (error) throw error;
      return data as KRAAssignment;
    },
    enabled: !!assignmentId,
  });
}

// Hook for creating KRA assignments
export function useCreateKRAAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentData: Partial<KRAAssignment>) => {
      const { data, error } = await supabase
        .from('kra_assignments')
        .insert(assignmentData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kra-assignments'] });
      toast.success('KRA assigned successfully');
    },
    onError: (error) => {
      toast.error('Failed to assign KRA: ' + error.message);
    },
  });
}

// Hook for bulk creating KRA assignments
export function useBulkCreateKRAAssignments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentsData: Partial<KRAAssignment>[]) => {
      const { data, error } = await supabase
        .from('kra_assignments')
        .insert(assignmentsData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kra-assignments'] });
      toast.success('KRA assigned to team members successfully');
    },
    onError: (error) => {
      toast.error('Failed to assign KRA: ' + error.message);
    },
  });
}

// Hook for creating/updating KRA evaluations
export function useUpdateKRAEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...evaluationData }: Partial<KRAEvaluation> & { id?: string }) => {
      if (id) {
        // Update existing evaluation
        const { data, error } = await supabase
          .from('kra_evaluations')
          .update(evaluationData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new evaluation
        const { data, error } = await supabase
          .from('kra_evaluations')
          .insert(evaluationData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kra-assignment-details', data.assignment_id] });
      queryClient.invalidateQueries({ queryKey: ['my-kra-assignments'] });
      toast.success('Evaluation updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update evaluation: ' + error.message);
    },
  });
}

// Hook for getting team members (for managers)
export function useTeamMembers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-members', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, employee_id, position, department_id')
        .eq('manager_id', user?.id)
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

// Hook for creating KRA category
export function useCreateKRACategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryData: Partial<KRACategory>) => {
      const { data, error } = await supabase
        .from('kra_categories')
        .insert(categoryData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kra-categories'] });
      toast.success('Category created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create category: ' + error.message);
    },
  });
}
