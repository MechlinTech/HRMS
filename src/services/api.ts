import bcrypt from 'bcryptjs';
import { supabase } from './supabase';
import { financeApi } from './financeApi';
import { atsApi } from './atsApi';
import { notificationApi } from './notificationApi';
import { FileUploadService } from './fileUpload';
import type { 
  User, 
  LeaveApplication, 
  Complaint, 
  PerformanceGoal, 
  Referral,
  PerformanceEvaluation,
  PerformanceAppraisal,
  PerformanceFeedback
} from '@/types';

// Auth API
export const authApi = {
  async getCurrentUser(): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        role:roles(name, description),
        department:departments!users_department_id_fkey(name, description)
      `)
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    // Filter out relational data and only keep direct column updates
    const allowedFields = [
      // Existing fields
      'full_name', 'phone', 'address', 'date_of_birth', 'password_hash', 
      'avatar_url', 'extra_permissions', 'position', 'company_email',
      'employee_id', 'role_id', 'department_id', 'salary', 'status',
      // New profile fields from migration
      'personal_email', 'alternate_contact_no', 'level_grade', 'skill',
      'current_office_location', 'blood_group', 'religion', 'gender',
      'marital_status', 'date_of_marriage_anniversary', 'father_name',
      'father_dob', 'mother_name', 'mother_dob', 'designation_offer_letter',
      'permanent_address', 'aadhar_card_no', 'pan_no', 'bank_account_no',
      'ifsc_code', 'qualification', 'employment_terms', 'date_of_joining',
    ];
    
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key as keyof User];
        return obj;
      }, {} as any);

    // Coerce empty date strings to null to satisfy Postgres date type
    const dateFields = ['date_of_birth', 'date_of_joining', 'date_of_marriage_anniversary', 'father_dob', 'mother_dob'];
    dateFields.forEach(field => {
      if (filteredUpdates[field] === '') {
        filteredUpdates[field] = null;
      }
    });

    // Hash password if it's being updated
    if (filteredUpdates.password_hash && !filteredUpdates.password_hash.startsWith('$2')) {
      filteredUpdates.password_hash = await bcrypt.hash(filteredUpdates.password_hash, 10);
    }

    // Coerce empty UUID fields to null to satisfy Postgres uuid type
    if (filteredUpdates.role_id === '') {
      filteredUpdates.role_id = null;
    }
    if (filteredUpdates.department_id === '') {
      filteredUpdates.department_id = null;
    }

    // Coerce empty employee_id to null to satisfy unique constraint
    if (filteredUpdates.employee_id === '') {
      filteredUpdates.employee_id = null;
    }

    // Handle empty string fields that should be null
    const optionalTextFields = [
      'personal_email', 'alternate_contact_no', 'level_grade',
      'current_office_location', 'blood_group', 'religion', 'gender',
      'marital_status', 'father_name', 'mother_name', 'designation_offer_letter',
      'permanent_address', 'aadhar_card_no', 'pan_no', 'bank_account_no',
      'ifsc_code', 'qualification', 'employment_terms'
    ];
    optionalTextFields.forEach(field => {
      if (filteredUpdates[field] === '') {
        filteredUpdates[field] = null;
      }
    });

    const { data, error } = await supabase
      .from('users')
      .update({
        ...filteredUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Leave API
export const leaveApi = {
  async getLeaveTypes() {
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async getLeaveBalance(userId: string, year: number = new Date().getFullYear()) {
    const { data, error } = await supabase
      .from('leave_balances')
      .select(`
        *,
        leave_type:leave_types(name, description)
      `)
      .eq('user_id', userId)
      .eq('year', year);
    
    if (error) throw error;
    return data;
  },

  async getUserLeaveSummary(userId: string) {
    const { data, error } = await supabase
      .rpc('get_user_leave_summary', { p_user_id: userId });
    
    if (error) throw error;
    return data;
  },

  async recalculateUserBalance(userId: string) {
    const { data, error } = await supabase
      .rpc('recalculate_user_leave_balance', { p_user_id: userId });
    
    if (error) throw error;
    return data;
  },

  async triggerLeaveMaintenence() {
    const { data, error } = await supabase
      .rpc('manual_leave_maintenance');
    
    if (error) throw error;
    return data;
  },

  // New functions for HR leave balance management
  async getAllEmployeesLeaveBalances(year: number = new Date().getFullYear()) {
    // Use RPC function to get comprehensive leave balance data
    const { data, error } = await supabase
      .rpc('get_all_employees_leave_balances', { p_year: year });
    
    if (error) throw error;
    return data;
  },

  async updateLeaveBalance(balanceId: string, updates: {
    allocated_days?: number;
    used_days?: number;
    comments?: string;
  }) {
    const { data, error } = await supabase
      .from('leave_balances')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', balanceId)
      .select(`
        *,
        leave_type:leave_types(name, description),
        user:users(full_name, employee_id, email)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async adjustLeaveBalance(userId: string, adjustment: {
    type: 'add' | 'subtract';
    amount: number;
    reason: string;
    year?: number;
  }, currentUserId?: string) {
    const year = adjustment.year || new Date().getFullYear();
    
    // Use RPC function to handle the adjustment server-side
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('adjust_leave_balance', {
        p_user_id: userId,
        p_adjustment_type: adjustment.type,
        p_amount: adjustment.amount,
        p_reason: adjustment.reason,
        p_year: year,
        p_adjusted_by: currentUserId || null
      });
    
    if (rpcError) {
      console.error('RPC error:', rpcError);
      throw rpcError;
    }
    
    if (!rpcResult || rpcResult.length === 0) {
      throw new Error('No result returned from balance adjustment');
    }
    
    const result = rpcResult[0];
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to adjust leave balance');
    }
    
    // Get the updated balance record with full details
    const { data: balanceData, error: balanceError } = await supabase
      .from('leave_balances')
      .select(`
        *,
        leave_type:leave_types(name, description),
        user:users(full_name, employee_id, email)
      `)
      .eq('id', result.balance_id)
      .single();
    
    if (balanceError) {
      console.error('Failed to fetch updated balance:', balanceError);
      throw balanceError;
    }
    
    return balanceData;
  },

  async getLeaveBalanceAdjustments(userId?: string, limit: number = 50) {
    let query = supabase
      .from('leave_balance_adjustments')
      .select(`
        *,
        user:users!user_id(full_name, employee_id, email),
        adjusted_by_user:users!adjusted_by(full_name, email),
        leave_balance:leave_balances(
          leave_type:leave_types(name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  },

  async createLeaveBalanceForUser(userId: string, leaveTypeId: string, allocatedDays: number, year?: number) {
    const balanceYear = year || new Date().getFullYear();
    
    const { data, error } = await supabase
      .from('leave_balances')
      .insert({
        user_id: userId,
        leave_type_id: leaveTypeId,
        year: balanceYear,
        allocated_days: allocatedDays,
        used_days: 0,
        monthly_credit_rate: 0, // Will be updated by system
        carry_forward_from_previous_year: 0
      })
      .select(`
        *,
        leave_type:leave_types(name, description),
        user:users(full_name, employee_id, email)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getLeaveApplications(userId: string) {
    const { data, error } = await supabase
      .from('leave_applications')
      .select(`
        *,
        leave_type:leave_types!leave_type_id(name, description)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createLeaveApplication(leaveData: Omit<LeaveApplication, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('leave_applications')
      .insert(leaveData)
      .select(`
        *,
        leave_type:leave_types!leave_type_id(name, description)
      `)
      .single();
    
    if (error) throw error;
    
    // The database trigger will automatically create the notification
    // No need to manually create it here
    
    return data;
  },

  async getEmployeesOnLeave(startDate?: string, endDate?: string) {
    const today = new Date().toISOString().split('T')[0];
    const fromDate = startDate || today;
    const toDate = endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Next 7 days
    
    const { data, error } = await supabase
      .from('leave_applications')
      .select(`
        *,
        user:users!user_id(id, full_name, employee_id, avatar_url),
        leave_type:leave_types!leave_type_id(name, description)
      `)
      .eq('status', 'approved')
      .or(`and(start_date.lte.${toDate},end_date.gte.${fromDate})`) // Show overlapping leave periods
      .order('start_date', { ascending: true });
    
    if (error) throw error;
    return data;
  }
};

// Rest of the API functions remain the same...
// Complaints API
export const complaintsApi = {
  async getComplaintCategories() {
    const { data, error } = await supabase
      .from('complaint_categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async getComplaints(userId: string) {
    const { data, error } = await supabase
      .from('complaints')
      .select(`
        *,
        category:complaint_categories(name, description, priority_level),
        assigned_to_user:users!assigned_to(full_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createComplaint(complaintData: Omit<Complaint, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('complaints')
      .insert(complaintData)
      .select(`
        *,
        category:complaint_categories(name, description, priority_level),
        user:users!complaints_user_id_fkey(full_name, employee_id, email, manager_id),
        assigned_to_user:users!complaints_assigned_to_fkey(full_name, email)
      `)
      .single();
    
    if (error) throw error;
    
    // Send notification to user's manager for approval
    try {
      if (data.user.manager_id) {
        // Notify manager for approval
        await notificationApi.createNotification({
          user_id: data.user.manager_id,
          title: 'Complaint Requires Approval',
          message: `${data.user.full_name} has submitted a complaint "${data.title}" that requires your approval before assignment.`,
          type: 'complaint_submitted',
          data: { complaint_id: data.id, action: 'approve_or_reject', target: 'grievance/active' }
        });
      }
      
      // Also notify HR for visibility
      const { data: hrUsers } = await supabase
        .from('users')
        .select('id')
        .eq('role_id', (await supabase.from('roles').select('id').eq('name', 'hr').single()).data?.id);
      
      if (hrUsers && hrUsers.length > 0) {
        for (const hrUser of hrUsers) {
          await notificationApi.createNotification({
            user_id: hrUser.id,
            title: 'New Complaint Submitted',
            message: `${data.user.full_name} has submitted a complaint "${data.title}" for manager review.`,
            type: 'complaint_submitted',
            data: { complaint_id: data.id, action: 'monitor', target: 'grievance/active' }
          });
        }
      }
    } catch (notificationError) {
      console.error('Failed to send complaint notification:', notificationError);
    }
    
    return data;
  }
};

// Performance API
export const performanceApi = {
  async getPerformanceGoals(userId: string) {
    const { data, error } = await supabase
      .from('performance_goals')
      .select(`
        *,
        created_by_user:users!created_by(full_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async updateGoalProgress(goalId: string, progress: number) {
    const status = progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';
    
    const { data, error } = await supabase
      .from('performance_goals')
      .update({ 
        progress_percentage: progress,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', goalId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getPerformanceEvaluations(userId: string) {
    const { data, error } = await supabase
      .from('performance_evaluations')
      .select(`
        *,
        evaluator:users!evaluator_id(full_name)
      `)
      .eq('user_id', userId)
      .order('evaluation_period_end', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getPerformanceAppraisals(userId: string) {
    const { data, error } = await supabase
      .from('performance_appraisals')
      .select('*')
      .eq('user_id', userId)
      .order('appraisal_year', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getPerformanceFeedback(userId: string) {
    const { data, error } = await supabase
      .from('performance_feedback')
      .select(`
        *,
        feedback_giver:users!feedback_giver_id(full_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};

// Referrals API
export const referralsApi = {
  async getJobPositions() {
    const { data, error } = await supabase
      .from('job_positions')
      .select(`
        *,
        department:departments(name)
      `)
      .eq('status', 'open')
      .order('job_title');
    
    if (error) throw error;
    return data;
  },

  async getReferrals(userId: string) {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_by', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createReferral(referralData: Omit<Referral, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('referrals')
      .insert(referralData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async createReferralWithResume(referralData: Omit<Referral, 'id' | 'created_at' | 'updated_at'>, resumeFile?: File) {
    let finalReferralData = { ...referralData };
    
    // Upload resume if provided
    if (resumeFile) {
      const uploadResult = await FileUploadService.uploadResume(
        resumeFile, 
        referralData.candidate_name
      );
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload resume');
      }
      
      finalReferralData.resume_url = uploadResult.url;
    }
    
    const { data, error } = await supabase
      .from('referrals')
      .insert(finalReferralData)
      .select()
      .single();
    
    if (error) {
      // If database insert fails and we uploaded a file, try to clean up
      if (finalReferralData.resume_url) {
        try {
          await FileUploadService.deleteResume(finalReferralData.resume_url);
        } catch (deleteError) {
          console.error('Failed to cleanup uploaded file after database error:', deleteError);
        }
      }
      throw error;
    }
    
    return data;
  },

  async updateReferralResume(id: string, resumeFile: File, candidateName: string) {
    // Get current referral to check for existing resume
    const { data: currentReferral, error: fetchError } = await supabase
      .from('referrals')
      .select('resume_url')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Upload new resume
    const uploadResult = await FileUploadService.uploadResume(resumeFile, candidateName);
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Failed to upload resume');
    }
    
    // Update referral with new resume URL
    const { data, error } = await supabase
      .from('referrals')
      .update({ 
        resume_url: uploadResult.url,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      // If database update fails, cleanup the newly uploaded file
      try {
        await FileUploadService.deleteResume(uploadResult.url!);
      } catch (deleteError) {
        console.error('Failed to cleanup uploaded file after database error:', deleteError);
      }
      throw error;
    }
    
    // Delete old resume file if it exists
    if (currentReferral.resume_url) {
      try {
        await FileUploadService.deleteResume(currentReferral.resume_url);
      } catch (deleteError) {
        console.warn('Failed to delete old resume file:', deleteError);
        // Don't throw error here as the main operation succeeded
      }
    }
    
    return data;
  }
};

// Dashboard Stats API
export const dashboardApi = {
  async getDashboardStats(userId: string) {
    // Get leave balance
    const currentYear = new Date().getFullYear();
    const { data: leaveBalance } = await supabase
      .from('leave_balances')
      .select('remaining_days')
      .eq('user_id', userId)
      .eq('year', currentYear);

    // Get attendance summary for current month
    const currentMonth = new Date().getMonth() + 1;
    const { data: attendanceData } = await supabase
      .from('attendance_summary')
      .select('days_present, total_working_days')
      .eq('user_id', userId)
      .eq('month', currentMonth)
      .eq('year', currentYear);

    const attendance = attendanceData && attendanceData.length > 0 ? attendanceData[0] : null;

    // Get active goals
    const { data: goals } = await supabase
      .from('performance_goals')
      .select('id, status')
      .eq('user_id', userId);

    // Get active project assignments
    const { data: projects } = await supabase
      .from('project_assignments')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true);

    return {
      leaveBalance: leaveBalance?.reduce((sum: any, lb: any) => sum + lb.remaining_days, 0) || 0,
      attendance: attendance ? `${attendance.days_present}/${attendance.total_working_days}` : '0/0',
      activeGoals: goals?.filter((g: any) => g.status !== 'completed').length || 0,
      activeProjects: projects?.length || 0
    };
  },

  async getUpcomingHolidays() {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date')
      .limit(4);
    
    if (error) throw error;
    return data;
  }
};

// Time tracking API
export const timeTrackingApi = {
  async getTodayTimeEntries(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        project:new_projects(project_name)
      `)
      .eq('user_id', userId)
      .eq('entry_date', today);
    
    if (error) throw error;
    return data;
  },

  async createTimeEntry(timeData: any) {
    const { data, error } = await supabase
      .from('time_entries')
      .insert(timeData)
      .select(`
        *,
        project:new_projects(project_name)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Exit Process API
export const exitApi = {
  async createExitProcess(exitData: {
    user_id: string;
    resignation_date: string;
    last_working_day: string;
    notice_period_days: number;
    reason_for_leaving?: string;
    new_company?: string;
    new_position?: string;
    exit_type: string;
    initiated_by: string;
  }) {
    const { data, error } = await supabase
      .from('exit_processes')
      .insert(exitData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getExitProcess(userId: string) {
    const { data, error } = await supabase
      .from('exit_processes')
      .select(`
        *,
        initiated_by_user:users!initiated_by(full_name),
        hr_approved_by_user:users!hr_approved_by(full_name)
      `)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
};

// Employee Management API
export const employeeApi = {
  async getAllEmployees() {
    const { data, error } = await supabase
      .rpc('get_employees_with_manager_details');
    
    if (error) throw error;
    
    // Transform the data to match the expected structure
    return data?.map((row: any) => ({
      id: row.id,
      auth_provider: row.auth_provider,
      provider_user_id: row.provider_user_id,
      email: row.email,
      password_hash: row.password_hash,
      full_name: row.full_name,
      employee_id: row.employee_id,
      role_id: row.role_id,
      department_id: row.department_id,
      position: row.position,
      avatar_url: row.avatar_url,
      phone: row.phone,
      address: row.address,
      date_of_birth: row.date_of_birth,
      date_of_joining: row.date_of_joining,
      salary: row.salary,
      extra_permissions: row.extra_permissions,
      status: row.status,
      last_login: row.last_login,
      created_at: row.created_at,
      updated_at: row.updated_at,
      manager_id: row.manager_id,
      tenure_mechlin: row.tenure_mechlin,
      level_grade: row.level_grade,
      skill: row.skill,
      current_office_location: row.current_office_location,
      alternate_contact_no: row.alternate_contact_no,
      blood_group: row.blood_group,
      religion: row.religion,
      gender: row.gender,
      marital_status: row.marital_status,
      date_of_marriage_anniversary: row.date_of_marriage_anniversary,
      father_name: row.father_name,
      father_dob: row.father_dob,
      mother_name: row.mother_name,
      mother_dob: row.mother_dob,
      designation_offer_letter: row.designation_offer_letter,
      permanent_address: row.permanent_address,
      aadhar_card_no: row.aadhar_card_no,
      pan_no: row.pan_no,
      personal_email: row.personal_email,
      bank_account_no: row.bank_account_no,
      ifsc_code: row.ifsc_code,
      qualification: row.qualification,
      employment_terms: row.employment_terms,
      role: row.role_name ? {
        name: row.role_name,
        description: row.role_description
      } : null,
      department: row.department_name ? {
        name: row.department_name,
        description: row.department_description
      } : null,
      manager: row.manager_full_name ? {
        id: row.manager_id,
        full_name: row.manager_full_name,
        email: row.manager_email,
        position: row.manager_position
      } : null
    })) || [];
  },

  async getAllUsersDetails() {
    const { data, error } = await supabase
      .rpc('get_all_users_with_manager_details');
    
    if (error) throw error;
    
    // Transform the data to match the expected structure
    return data?.map((row: any) => ({
      id: row.id,
      auth_provider: row.auth_provider,
      provider_user_id: row.provider_user_id,
      email: row.email,
      password_hash: row.password_hash,
      full_name: row.full_name,
      employee_id: row.employee_id,
      role_id: row.role_id,
      department_id: row.department_id,
      position: row.position,
      avatar_url: row.avatar_url,
      phone: row.phone,
      address: row.address,
      date_of_birth: row.date_of_birth,
      date_of_joining: row.date_of_joining,
      salary: row.salary,
      extra_permissions: row.extra_permissions,
      status: row.status,
      last_login: row.last_login,
      created_at: row.created_at,
      updated_at: row.updated_at,
      manager_id: row.manager_id,
      tenure_mechlin: row.tenure_mechlin,
      level_grade: row.level_grade,
      skill: row.skill,
      current_office_location: row.current_office_location,
      alternate_contact_no: row.alternate_contact_no,
      blood_group: row.blood_group,
      religion: row.religion,
      gender: row.gender,
      marital_status: row.marital_status,
      date_of_marriage_anniversary: row.date_of_marriage_anniversary,
      father_name: row.father_name,
      father_dob: row.father_dob,
      mother_name: row.mother_name,
      mother_dob: row.mother_dob,
      designation_offer_letter: row.designation_offer_letter,
      permanent_address: row.permanent_address,
      aadhar_card_no: row.aadhar_card_no,
      pan_no: row.pan_no,
      personal_email: row.personal_email,
      bank_account_no: row.bank_account_no,
      ifsc_code: row.ifsc_code,
      qualification: row.qualification,
      employment_terms: row.employment_terms,
      role: row.role_name ? {
        name: row.role_name,
        description: row.role_description
      } : null,
      department: row.department_name ? {
        name: row.department_name,
        description: row.department_description
      } : null,
      manager: row.manager_full_name ? {
        id: row.manager_id,
        full_name: row.manager_full_name,
        email: row.manager_email,
        position: row.manager_position
      } : null
    })) || [];
  },

  async getEmployeeById(id: string) {
    const { data, error } = await supabase
      .rpc('get_all_users_with_manager_details');
    
    if (error) throw error;
    
    // Find the specific employee
    const employee = data?.find((row: any) => row.id === id);
    if (!employee) throw new Error('Employee not found');
    
    // Transform the data to match the expected structure
    return {
      id: employee.id,
      auth_provider: employee.auth_provider,
      provider_user_id: employee.provider_user_id,
      email: employee.email,
      password_hash: employee.password_hash,
      full_name: employee.full_name,
      employee_id: employee.employee_id,
      role_id: employee.role_id,
      department_id: employee.department_id,
      position: employee.position,
      avatar_url: employee.avatar_url,
      phone: employee.phone,
      address: employee.address,
      date_of_birth: employee.date_of_birth,
      date_of_joining: employee.date_of_joining,
      salary: employee.salary,
      extra_permissions: employee.extra_permissions,
      status: employee.status,
      last_login: employee.last_login,
      created_at: employee.created_at,
      updated_at: employee.updated_at,
      manager_id: employee.manager_id,
      tenure_mechlin: employee.tenure_mechlin,
      level_grade: employee.level_grade,
      skill: employee.skill,
      current_office_location: employee.current_office_location,
      alternate_contact_no: employee.alternate_contact_no,
      blood_group: employee.blood_group,
      religion: employee.religion,
      gender: employee.gender,
      marital_status: employee.marital_status,
      date_of_marriage_anniversary: employee.date_of_marriage_anniversary,
      father_name: employee.father_name,
      father_dob: employee.father_dob,
      mother_name: employee.mother_name,
      mother_dob: employee.mother_dob,
      designation_offer_letter: employee.designation_offer_letter,
      permanent_address: employee.permanent_address,
      aadhar_card_no: employee.aadhar_card_no,
      pan_no: employee.pan_no,
      personal_email: employee.personal_email,
      bank_account_no: employee.bank_account_no,
      ifsc_code: employee.ifsc_code,
      qualification: employee.qualification,
      employment_terms: employee.employment_terms,
      role: employee.role_name ? {
        name: employee.role_name,
        description: employee.role_description
      } : null,
      department: employee.department_name ? {
        name: employee.department_name,
        description: employee.department_description
      } : null,
      manager: employee.manager_full_name ? {
        id: employee.manager_id,
        full_name: employee.manager_full_name,
        email: employee.manager_email,
        position: employee.manager_position
      } : null
    };
  },

  async getEmployeeAttendance(userId: string, year: number = new Date().getFullYear()) {
    const { data, error } = await supabase
      .from('attendance_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .order('month');
    
    if (error) throw error;
    return data;
  },

  async getAllEmployeesAttendance(year: number = new Date().getFullYear(), month?: number) {
    let query = supabase
      .from('attendance_summary')
      .select(`
        *,
        user:users(full_name, employee_id, department:departments!users_department_id_fkey(name))
      `)
      .eq('year', year);
    
    if (month) {
      query = query.eq('month', month);
    }
    
    const { data, error } = await query.order('month');
    
    if (error) throw error;
    return data;
  }
};

// Asset Management API
export const assetApi = {
  async getAllAssets() {
    const { data, error } = await supabase
      .from('assets')
      .select(`
        *,
        category:asset_categories(name, description)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getAssetAssignments() {
    const { data, error } = await supabase
      .from('asset_assignments')
      .select(`
        *,
        asset:assets(name, asset_tag, brand, model),
        user:users!user_id(full_name, employee_id),
        assigned_by_user:users!assigned_by(full_name)
      `)
      .eq('is_active', true)
      .order('assigned_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getAssetCategories() {
    const { data, error } = await supabase
      .from('asset_categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async createAssetAssignment(assignmentData: any) {
    const { data, error } = await supabase
      .from('asset_assignments')
      .insert(assignmentData)
      .select(`
        *,
        asset:assets(name, asset_tag, brand, model),
        user:users!user_id(full_name, employee_id),
        assigned_by_user:users!assigned_by(full_name)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAvailableAssets() {
    const { data, error } = await supabase
      .from('assets')
      .select(`
        *,
        category:asset_categories(name)
      `)
      .eq('status', 'available')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async createAsset(assetData: any) {
    const { data, error } = await supabase
      .from('assets')
      .insert(assetData)
      .select(`
        *,
        category:asset_categories(name, description)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateAsset(id: string, updates: any) {
    const { data, error } = await supabase
      .from('assets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        category:asset_categories(name, description)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteAsset(id: string) {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateAssetAssignment(id: string, updates: any) {
    const { data, error } = await supabase
      .from('asset_assignments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        asset:assets(name, asset_tag, brand, model),
        user:users!user_id(full_name, employee_id),
        assigned_by_user:users!assigned_by(full_name)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteAssetAssignment(id: string) {
    const { error } = await supabase
      .from('asset_assignments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getAssetMetrics() {
    // Get total assets count
    const { data: totalAssets } = await supabase
      .from('assets')
      .select('id, status');
    
    // Get active assignments count
    const { data: activeAssignments } = await supabase
      .from('asset_assignments')
      .select('id')
      .eq('is_active', true);
    
    // Get assets by status
    const assetsByStatus = totalAssets?.reduce((acc: any, asset: any) => {
      acc[asset.status] = (acc[asset.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    return {
      totalAssets: totalAssets?.length || 0,
      activeAssignments: activeAssignments?.length || 0,
      availableAssets: assetsByStatus.available || 0,
      assignedAssets: assetsByStatus.assigned || 0,
      maintenanceAssets: assetsByStatus.maintenance || 0,
      retiredAssets: assetsByStatus.retired || 0,
    };
  }
};

// HR Referrals API
export const hrReferralsApi = {
  async getAllReferrals() {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        referred_by_user:users!referred_by(full_name, employee_id, email, department:departments!users_department_id_fkey(name))
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async updateReferralStatus(id: string, status: string, hrNotes?: string) {
    const { data, error } = await supabase
      .from('referrals')
      .update({ 
        status, 
        hr_notes: hrNotes,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select(`
        *,
        referred_by_user:users!referred_by(full_name, employee_id, email, department:departments!users_department_id_fkey(name))
      `)
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Grievance Management API
export const grievanceApi = {
  async getAllComplaints() {
    const { data, error } = await supabase
      .from('complaints')
      .select(`
        *,
        category:complaint_categories(name, description, priority_level),
        user:users!complaints_user_id_fkey(full_name, employee_id, email),
        assigned_to_user:users!complaints_assigned_to_fkey(full_name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getComplaintCategories() {
    const { data, error } = await supabase
      .from('complaint_categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async approveComplaint(id: string, assigned_to: string, approvedBy: string) {
    console.log('Approving complaint:', { id, assigned_to, approvedBy });
    
    const { data, error } = await supabase
      .from('complaints')
      .update({ 
        status: 'in_progress', // Change to in_progress when approved and assigned
        assigned_to: assigned_to, // Update the assigned_to field with the new resolver
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        category:complaint_categories(name, description, priority_level),
        user:users!complaints_user_id_fkey(full_name, employee_id, email, manager_id),
        assigned_to_user:users!complaints_assigned_to_fkey(full_name)
      `)
      .single();
    
    if (error) throw error;
    
    console.log('Complaint updated successfully:', data);
    
    // Send notifications after manager approval
    try {
      // 1. Notify the assigned resolver
      await notificationApi.createNotification({
        user_id: assigned_to,
        title: 'Complaint Assigned to You',
        message: `You have been assigned to resolve the complaint "${data.title}" submitted by ${data.user.full_name}.`,
        type: 'complaint_assigned',
        data: { complaint_id: data.id, action: 'resolve', target: 'grievance/active' }
      });
      
      // 2. Notify the employee who submitted the complaint
      await notificationApi.createNotification({
        user_id: data.user_id,
        title: 'Complaint Approved and Assigned',
        message: `Your complaint "${data.title}" has been approved by your manager and assigned to ${data.assigned_to_user.full_name} for resolution.`,
        type: 'complaint_approved',
        data: { complaint_id: data.id, action: 'view', target: 'dashboard/complaints', tab: 'my-complaints' }
      });
    } catch (notificationError: any) {
      console.error('Failed to send approval notifications:', notificationError);
    }
    
    return data;
  },

  async rejectComplaint(id: string, rejectedBy: string, reason?: string) {
    const { data, error } = await supabase
      .from('complaints')
      .update({ 
        status: 'closed',
        resolution: `Rejected: ${reason}` || 'Complaint rejected by manager',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        category:complaint_categories(name, description, priority_level),
        user:users!complaints_user_id_fkey(full_name, employee_id, email, manager_id),
        assigned_to_user:users!complaints_assigned_to_fkey(full_name)
      `)
      .single();
    
    if (error) throw error;
    
    // Send notifications for rejection
    try {
      // 1. Notify the employee who submitted the complaint
      await notificationApi.createNotification({
        user_id: data.user_id,
        title: 'Complaint Closed',
        message: `Your complaint "${data.title}" has been closed by your manager. ${reason ? `Reason: ${reason}` : ''}`,
        type: 'complaint_resolved',
        data: { complaint_id: data.id, action: 'view', target: 'dashboard/complaints', tab: 'my-complaints' }
      });
    } catch (notificationError) {
      console.error('Failed to send rejection notification:', notificationError);
    }
    
    return data;
  },

  async reassignComplaint(id: string, new_assigned_to: string, reassignedBy: string, reason?: string) {
    const { data, error } = await supabase
      .from('complaints')
      .update({ 
        assigned_to: new_assigned_to,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        category:complaint_categories(name, description, priority_level),
        user:users!complaints_user_id_fkey(full_name, employee_id, email, manager_id),
        assigned_to_user:users!complaints_assigned_to_fkey(full_name)
      `)
      .single();
    
    if (error) throw error;
    
    // Send notifications for reassignment
    try {
      // 1. Notify the new assignee
      await notificationApi.createNotification({
        user_id: new_assigned_to,
        title: 'Complaint Reassigned to You',
        message: `The complaint "${data.title}" has been reassigned to you${reason ? `: ${reason}` : '.'}`,
        type: 'complaint_reassigned',
        data: { complaint_id: data.id, action: 'resolve' }
      });
      
      // 2. Notify the employee who submitted the complaint
      await notificationApi.createNotification({
        user_id: data.user_id,
        title: 'Complaint Reassigned',
        message: `Your complaint "${data.title}" has been reassigned to a different resolver for better handling.`,
        type: 'complaint_reassigned',
        data: { complaint_id: data.id, action: 'view', target: 'dashboard/complaints', tab: 'my-complaints' }
      });
      
      // 3. Notify the employee's manager (if different from reassigner)
      if (data.user.manager_id) {
        await notificationApi.createNotification({
          user_id: data.user.manager_id,
          title: 'Team Member Complaint Reassigned',
          message: `The complaint "${data.title}" from ${data.user.full_name} has been reassigned.`,
          type: 'complaint_reassigned',
          data: { complaint_id: data.id, action: 'view', target: 'grievance/active' }
        });
      }
    } catch (notificationError) {
      console.error('Failed to send reassignment notifications:', notificationError);
    }
    
    return data;
  },

  async getResolverOptions() {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, employee_id, role:roles(name), department:departments!users_department_id_fkey(name)')
      .eq('status', 'active')
      .order('full_name');
    
    if (error) throw error;
    
    // Also get users by role name for flexibility
    const { data: roleBasedUsers, error: roleError } = await supabase
      .from('users')
      .select(`
        id, full_name, employee_id, 
        role:roles!inner(name), 
        department:departments!users_department_id_fkey(name)
      `)
      .eq('status', 'active')
      .in('role.name', ['hr', 'bdm', 'qam', 'sdm', 'hrm', 'admin', 'super_admin'])
      .order('full_name');
    
    if (roleError) throw roleError;
    
    // Get users who are managers (have direct reports)
    const { data: managers, error: managersError } = await supabase
      .from('users')
      .select(`
        id, full_name, employee_id, 
        role:roles(name), 
        department:departments!users_department_id_fkey(name)
      `)
      .eq('status', 'active')
      .not('manager_id', 'is', null)
      .order('full_name');
    
    if (managersError) throw managersError;
    
    // Get users from HR and Finance departments
    const { data: departmentUsers, error: deptError } = await supabase
      .from('users')
      .select(`
        id, full_name, employee_id, 
        role:roles(name), 
        department:departments!users_department_id_fkey!inner(name)
      `)
      .eq('status', 'active')
      .in('department.name', ['HR', 'Finance', 'Human Resources'])
      .order('full_name');
    
    if (deptError) throw deptError;
    
    // Combine all resolver sources and deduplicate
    const allResolvers = [
      ...(roleBasedUsers || []), 
      ...(managers || []), 
      ...(departmentUsers || [])
    ];
    const uniqueResolvers = allResolvers.filter((resolver, index, self) => 
      index === self.findIndex(r => r.id === resolver.id)
    );
    
    return uniqueResolvers;
  },

  async updateComplaintStatus(id: string, status: string, resolution?: string, assigned_to?: string) {
    const updateData: any = { 
      status, 
      updated_at: new Date().toISOString() 
    };
    
    if (resolution) {
      updateData.resolution = resolution;
    }
    
    if (assigned_to) {
      updateData.assigned_to = assigned_to;
    }
    
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('complaints')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        category:complaint_categories(name, description, priority_level),
        user:users!complaints_user_id_fkey(full_name, employee_id, email, manager_id),
        assigned_to_user:users!complaints_assigned_to_fkey(full_name)
      `)
      .single();
    
    if (error) throw error;
    
    // Send notifications for all status updates
    try {
      // 1. Notify the employee who submitted the complaint
      let notificationTitle = 'Complaint Status Updated';
      let notificationMessage = `Your complaint "${data.title}" status has been updated to ${status}.`;
      
      if (status === 'resolved') {
        notificationTitle = 'Complaint Resolved';
        notificationMessage = `Your complaint "${data.title}" has been resolved.`;
        if (resolution) {
          notificationMessage += ` Resolution: ${resolution}`;
        }
      }
      
      await notificationApi.createNotification({
        user_id: data.user_id,
        title: notificationTitle,
        message: notificationMessage,
        type: status === 'resolved' ? 'complaint_resolved' : 'complaint_status_updated',
        data: { complaint_id: data.id, action: 'view' }
      });
      
      // 2. Notify the employee's manager (always notify manager of changes)
      if (data.user.manager_id && data.user.manager_id !== assigned_to) {
        await notificationApi.createNotification({
          user_id: data.user.manager_id,
          title: 'Team Member Complaint Updated',
          message: `The complaint "${data.title}" from ${data.user.full_name} has been ${status}.`,
          type: status === 'resolved' ? 'complaint_resolved' : 'complaint_status_updated',
          data: { complaint_id: data.id, action: 'view' }
        });
      }
      
      // 3. If there's an assigned resolver (and it's not the employee or manager), notify them too
      if (data.assigned_to && data.assigned_to !== data.user_id && data.assigned_to !== data.user.manager_id) {
        await notificationApi.createNotification({
          user_id: data.assigned_to,
          title: 'Assigned Complaint Updated',
          message: `The complaint "${data.title}" you are resolving has been updated to ${status}.`,
          type: status === 'resolved' ? 'complaint_resolved' : 'complaint_status_updated',
          data: { complaint_id: data.id, action: 'view' }
        });
      }
    } catch (notificationError) {
      console.error('Failed to send status update notifications:', notificationError);
    }
    
    return data;
  },

  async getComplaintComments(complaintId: string) {
    const { data, error } = await supabase
      .from('complaint_comments')
      .select(`
        *,
        user:users(full_name, avatar_url)
      `)
      .eq('complaint_id', complaintId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async createComplaintComment(commentData: {
    complaint_id: string;
    user_id: string;
    comment: string;
    is_internal?: boolean;
  }) {
    const { data, error } = await supabase
      .from('complaint_comments')
      .insert(commentData)
      .select(`
        *,
        user:users(full_name, avatar_url)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Exit Process API for HR
export const hrExitApi = {
  async getAllExitProcesses() {
    const { data, error } = await supabase
      .from('exit_processes')
      .select(`
        *,
        user:users!user_id(full_name, employee_id, email, department:departments!users_department_id_fkey(name)),
        initiated_by_user:users!initiated_by(full_name),
        hr_approved_by_user:users!hr_approved_by(full_name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getExitProcessById(id: string) {
    const { data, error } = await supabase
      .from('exit_processes')
      .select(`
        *,
        user:users!user_id(full_name, employee_id, email, phone, department:departments!users_department_id_fkey(name), role:roles(name)),
        initiated_by_user:users!initiated_by(full_name),
        hr_approved_by_user:users!hr_approved_by(full_name),
        clearance_items:exit_clearance_items(*),
        documents:exit_documents(*),
        interview:exit_interviews(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateExitProcess(id: string, updates: any) {
    const { data, error } = await supabase
      .from('exit_processes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteExitProcess(id: string) {
    const { error } = await supabase
      .from('exit_processes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// BD Team API
export const bdTeamApi = {
  async getDashboardStats() {
    // Get active clients count
    const { data: billingRecords } = await supabase
      .from('billing_records')
      .select('client_name')
      .gte('contract_end_date', new Date().toISOString().split('T')[0]);
    
    const activeClients = new Set(billingRecords?.map((r: any) => r.client_name)).size;

    // Get unpaid invoices
    const { data: unpaidInvoices } = await supabase
      .from('invoices')
      .select('invoice_amount')
      .in('status', ['assigned', 'in_progress', 'sent']);
    
    const unpaidAmount = unpaidInvoices?.reduce((sum: any, inv: any) => sum + inv.invoice_amount, 0) || 0;
    const unpaidCount = unpaidInvoices?.length || 0;

    // Get overdue invoices
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('id')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .neq('status', 'paid');
    
    const overdueCount = overdueInvoices?.length || 0;

    // Get total contract value
    const { data: totalContracts } = await supabase
      .from('billing_records')
      .select('contract_value');
    
    const totalContractValue = totalContracts?.reduce((sum: any, record: any) => sum + record.contract_value, 0) || 0;

    return {
      activeClients,
      unpaidAmount,
      unpaidCount,
      overdueCount,
      totalContractValue
    };
  },

  async getAllBillingRecords() {
    const { data, error } = await supabase
      .from('billing_records')
      .select(`
        *,
        assigned_to_finance_user:users!assigned_to_finance(full_name, email),
        created_by_user:users!created_by(full_name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getBillingRecordById(id: string) {
    const { data, error } = await supabase
      .from('billing_records')
      .select(`
        *,
        assigned_to_finance_user:users!assigned_to_finance(full_name, email),
        created_by_user:users!created_by(full_name)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createBillingRecord(billingData: any) {
    const { data, error } = await supabase
      .from('billing_records')
      .insert(billingData)
      .select(`
        *,
        assigned_to_finance_user:users!assigned_to_finance(full_name, email),
        created_by_user:users!created_by(full_name)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateBillingRecord(id: string, updates: any, currentUserId: string) {
    const { data, error } = await supabase
      .from('billing_records')
      .update({
        ...updates,
        last_modified_by: currentUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        assigned_to_finance_user:users!assigned_to_finance(full_name, email),
        created_by_user:users!created_by(full_name)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAllInvoices() {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        assigned_finance_poc_user:users!assigned_finance_poc(full_name, email),
        created_by_user:users!created_by(full_name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getInvoiceById(id: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        assigned_finance_poc_user:users!assigned_finance_poc(full_name, email),
        created_by_user:users!created_by(full_name)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createInvoice(invoiceData: any) {
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select(`
        *,
        assigned_finance_poc_user:users!assigned_finance_poc(full_name, email),
        created_by_user:users!created_by(full_name)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateInvoice(id: string, updates: any, currentUserId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        ...updates,
        last_modified_by: currentUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        assigned_finance_poc_user:users!assigned_finance_poc(full_name, email),
        created_by_user:users!created_by(full_name)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getBillingLogs(recordId?: string, invoiceId?: string) {
    try {
      let query = supabase
        .from('billing_logs')
        .select(`
          *,
          changed_by_user:users!changed_by(full_name)
        `);
      
      if (recordId) {
        query = query.eq('billing_record_id', recordId);
      }
      
      if (invoiceId) {
        query = query.eq('invoice_id', invoiceId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Billing logs fetch error:', error);
        // Return empty array if there's an RLS error or no data
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Billing logs API error:', error);
      return [];
    }
  },

  async getRecentBillingLogs(limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('billing_logs')
        .select(`
          *,
          changed_by_user:users!changed_by(full_name),
          billing_record:billing_records(client_name, project_name),
          invoice:invoices(invoice_title, client_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit || 10);
      
      if (error) {
        console.error('Recent billing logs fetch error:', error);
        // Return empty array if there's an RLS error or no data
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Recent billing logs API error:', error);
      return [];
    }
  },

  async getInvoiceComments(invoiceId: string) {
    const { data, error } = await supabase
      .from('invoice_comments')
      .select(`
        *,
        user:users(full_name, avatar_url)
      `)
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async createInvoiceComment(commentData: {
    invoice_id: string;
    user_id: string;
    comment: string;
    is_internal?: boolean;
  }) {
    const { data, error } = await supabase
      .from('invoice_comments')
      .insert(commentData)
      .select(`
        *,
        user:users(full_name, avatar_url)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getFinanceUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, employee_id')
      .eq('status', 'active')
      .order('full_name');
    
    if (error) throw error;
    return data;
  },

  async getBillingHistoryByClient(clientName: string) {
    const { data, error } = await supabase
      .from('billing_records')
      .select('*')
      .eq('client_name', clientName)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};

// Export finance API
export { financeApi };

// Export ATS API
export { atsApi };

// Export LMS API
export { lmsApi } from './lmsApi';

// Export Notification API
export { notificationApi };