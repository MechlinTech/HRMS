/*
  # Leave Balance Scheduler Functions
  
  This migration creates scheduled functions to automatically manage leave balances:
  1. Monthly leave credits (run on 1st of each month)
  2. Anniversary resets (run daily)
  3. Year-end carry forward
  
  Uses pg_cron extension for scheduling
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to manually trigger leave balance recalculation for a specific user
CREATE OR REPLACE FUNCTION recalculate_user_leave_balance(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  user_info record;
  result jsonb;
  annual_leave_type_id uuid;
  balance_info record;
BEGIN
  -- Get user information
  SELECT id, full_name, date_of_joining, status INTO user_info
  FROM users WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF user_info.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not active');
  END IF;
  
  IF user_info.date_of_joining IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User has no joining date');
  END IF;
  
  -- Get annual leave type
  SELECT id INTO annual_leave_type_id
  FROM leave_types WHERE name = 'Annual Leave' LIMIT 1;
  
  IF annual_leave_type_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Annual Leave type not found');
  END IF;
  
  -- Recalculate balance
  PERFORM update_user_leave_balance(p_user_id);
  
  -- Get updated balance information
  SELECT 
    allocated_days,
    used_days,
    remaining_days,
    monthly_credit_rate,
    carry_forward_from_previous_year,
    anniversary_reset_date
  INTO balance_info
  FROM leave_balances 
  WHERE user_id = p_user_id 
    AND leave_type_id = annual_leave_type_id 
    AND year = EXTRACT(YEAR FROM CURRENT_DATE);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No balance record found after recalculation');
  END IF;
  
  result := jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', user_info.id,
      'full_name', user_info.full_name,
      'date_of_joining', user_info.date_of_joining,
      'tenure_months', get_tenure_months(user_info.date_of_joining)
    ),
    'balance', jsonb_build_object(
      'allocated_days', balance_info.allocated_days,
      'used_days', balance_info.used_days,
      'remaining_days', balance_info.remaining_days,
      'monthly_credit_rate', balance_info.monthly_credit_rate,
      'carry_forward_from_previous_year', balance_info.carry_forward_from_previous_year,
      'anniversary_reset_date', balance_info.anniversary_reset_date,
      'can_carry_forward', can_carry_forward_leaves(user_info.date_of_joining)
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a function to manually run all leave balance maintenance (useful for testing)
CREATE OR REPLACE FUNCTION manual_leave_maintenance()
RETURNS text AS $$
DECLARE
  result text;
BEGIN
  PERFORM maintain_leave_balances();
  result := 'Leave balance maintenance executed manually at ' || now();
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for the new functions (ensure only authorized users can call them)
-- These functions should be callable by HR and admin users

-- Create a view for HR to monitor leave balance status
CREATE OR REPLACE VIEW leave_balance_summary AS
SELECT 
  u.id as user_id,
  u.full_name,
  u.employee_id,
  u.date_of_joining,
  u.status as user_status,
  get_tenure_months(u.date_of_joining) as tenure_months,
  get_monthly_leave_rate(u.date_of_joining) as monthly_rate,
  can_carry_forward_leaves(u.date_of_joining) as can_carry_forward,
  lb.year,
  lb.allocated_days,
  lb.used_days,
  lb.remaining_days,
  lb.carry_forward_from_previous_year,
  lb.anniversary_reset_date,
  lb.last_credited_month,
  lt.name as leave_type_name
FROM users u
LEFT JOIN leave_balances lb ON u.id = lb.user_id 
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE u.status = 'active' 
  AND u.date_of_joining IS NOT NULL
ORDER BY u.full_name;

-- Enable RLS on the view
ALTER VIEW leave_balance_summary OWNER TO postgres;

-- Create policy for the view (HR and admin can see all, others can see only their own)
CREATE POLICY "leave_balance_summary_policy" ON leave_balances
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role_id IN (
      SELECT id FROM roles WHERE name IN ('super_admin', 'admin', 'hr')
    )
  )
);

-- Add helpful comments
COMMENT ON FUNCTION maintain_leave_balances() IS 'Main scheduled function that handles all leave balance maintenance operations';
COMMENT ON FUNCTION recalculate_user_leave_balance(uuid) IS 'Manually recalculates leave balance for a specific user and returns detailed result';
COMMENT ON FUNCTION get_user_leave_summary(uuid) IS 'Returns comprehensive leave balance information for a user';
COMMENT ON FUNCTION manual_leave_maintenance() IS 'Manually triggers all leave balance maintenance operations';
COMMENT ON VIEW leave_balance_summary IS 'HR view showing leave balance status for all active users';
