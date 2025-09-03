/*
  # Automatic Leave Balance System Implementation
  
  This migration implements the comprehensive leave balance logic with the following rules:
  
  ## Tenure-based Leave Allocation Rules:
  - < 9 months: 0 leaves per month
  - 9 months to < 1 year: 1 leave per month (credited at start of each month)
  - ≥ 1 year: 1.5 leaves per month (credited at start of each month)
  
  ## Carry-forward Rules:
  - < 2 years tenure: Leaves expire on anniversary date (joining date + 1 year)
  - ≥ 2 years tenure: Leaves can be carried forward to next year
  
  ## Negative Balance Handling:
  - If balance goes negative, salary deduction will be applied (handled externally)
  
  This system automatically:
  1. Calculates monthly leave credits based on tenure
  2. Handles carry-forward logic based on tenure
  3. Resets balances for users < 2 years tenure on their anniversary
  4. Updates balances when leaves are approved/rejected
*/

-- First, let's add additional columns to leave_balances table for better tracking
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS monthly_credit_rate decimal(3,1) DEFAULT 0.0;
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS last_credited_month date;
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS carry_forward_from_previous_year integer DEFAULT 0;
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS anniversary_reset_date date;

-- Add index for performance on tenure-based queries
CREATE INDEX IF NOT EXISTS idx_users_date_of_joining ON users(date_of_joining) WHERE date_of_joining IS NOT NULL;

-- Create function to calculate tenure in months from joining date
CREATE OR REPLACE FUNCTION get_tenure_months(joining_date date)
RETURNS integer AS $$
BEGIN
  IF joining_date IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, joining_date)) * 12 + 
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, joining_date));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate monthly leave credit rate based on tenure
CREATE OR REPLACE FUNCTION get_monthly_leave_rate(joining_date date)
RETURNS decimal(3,1) AS $$
DECLARE
  tenure_months integer;
BEGIN
  IF joining_date IS NULL THEN
    RETURN 0.0;
  END IF;
  
  tenure_months := get_tenure_months(joining_date);
  
  -- Tenure rules:
  -- < 9 months: 0 leaves per month
  -- 9 months to < 12 months: 1 leave per month  
  -- >= 12 months: 1.5 leaves per month
  IF tenure_months < 9 THEN
    RETURN 0.0;
  ELSIF tenure_months < 12 THEN
    RETURN 1.0;
  ELSE
    RETURN 1.5;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to determine if carry-forward is allowed based on tenure
CREATE OR REPLACE FUNCTION can_carry_forward_leaves(joining_date date)
RETURNS boolean AS $$
DECLARE
  tenure_months integer;
BEGIN
  IF joining_date IS NULL THEN
    RETURN false;
  END IF;
  
  tenure_months := get_tenure_months(joining_date);
  
  -- Carry-forward allowed if tenure >= 24 months (2 years)
  RETURN tenure_months >= 24;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get next anniversary date for balance reset
CREATE OR REPLACE FUNCTION get_next_anniversary_date(joining_date date)
RETURNS date AS $$
DECLARE
  current_year integer;
  anniversary_this_year date;
BEGIN
  IF joining_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  anniversary_this_year := (current_year::text || '-' || 
                           EXTRACT(MONTH FROM joining_date)::text || '-' || 
                           EXTRACT(DAY FROM joining_date)::text)::date;
  
  -- If anniversary has passed this year, return next year's anniversary
  IF anniversary_this_year <= CURRENT_DATE THEN
    RETURN (anniversary_this_year + INTERVAL '1 year')::date;
  ELSE
    RETURN anniversary_this_year;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to handle anniversary resets for users with < 2 years tenure
CREATE OR REPLACE FUNCTION process_anniversary_resets()
RETURNS void AS $$
DECLARE
  user_record record;
  annual_leave_type_id uuid;
BEGIN
  -- Get annual leave type
  SELECT id INTO annual_leave_type_id
  FROM leave_types 
  WHERE name = 'Annual Leave'
  LIMIT 1;
  
  IF annual_leave_type_id IS NULL THEN
    RAISE EXCEPTION 'Annual Leave type not found in leave_types table';
  END IF;
  
  -- Find users whose anniversary is today and can't carry forward
  FOR user_record IN 
    SELECT u.id, u.date_of_joining, u.full_name, lb.id as balance_id
    FROM users u
    JOIN leave_balances lb ON u.id = lb.user_id
    WHERE u.status = 'active' 
      AND u.date_of_joining IS NOT NULL
      AND lb.leave_type_id = annual_leave_type_id
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
      AND lb.anniversary_reset_date = CURRENT_DATE
      AND NOT can_carry_forward_leaves(u.date_of_joining)
  LOOP
    -- Reset the leave balance to 0 for users who can't carry forward
    UPDATE leave_balances SET
      allocated_days = 0,
      used_days = 0,
      carry_forward_from_previous_year = 0,
      anniversary_reset_date = get_next_anniversary_date(user_record.date_of_joining),
      updated_at = now()
    WHERE id = user_record.balance_id;
    
    RAISE NOTICE 'Reset leave balance for % on anniversary date', user_record.full_name;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to handle carry-forward for users with >= 2 years tenure
CREATE OR REPLACE FUNCTION process_year_end_carry_forward()
RETURNS void AS $$
DECLARE
  user_record record;
  remaining_leaves integer;
  annual_leave_type_id uuid;
  current_year integer;
  next_year integer;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  next_year := current_year + 1;
  
  -- Get annual leave type
  SELECT id INTO annual_leave_type_id
  FROM leave_types 
  WHERE name = 'Annual Leave'
  LIMIT 1;
  
  IF annual_leave_type_id IS NULL THEN
    RAISE EXCEPTION 'Annual Leave type not found in leave_types table';
  END IF;
  
  -- Process carry-forward for eligible users (only run on December 31st)
  IF EXTRACT(MONTH FROM CURRENT_DATE) = 12 AND EXTRACT(DAY FROM CURRENT_DATE) = 31 THEN
    FOR user_record IN 
      SELECT u.id, u.date_of_joining, u.full_name, lb.remaining_days
      FROM users u
      JOIN leave_balances lb ON u.id = lb.user_id
      WHERE u.status = 'active' 
        AND u.date_of_joining IS NOT NULL
        AND lb.leave_type_id = annual_leave_type_id
        AND lb.year = current_year
        AND can_carry_forward_leaves(u.date_of_joining)
        AND lb.remaining_days > 0
    LOOP
      remaining_leaves := user_record.remaining_days;
      
      -- Create next year's balance with carry-forward
      INSERT INTO leave_balances (
        user_id, 
        leave_type_id, 
        year, 
        allocated_days, 
        used_days, 
        monthly_credit_rate,
        last_credited_month,
        carry_forward_from_previous_year,
        anniversary_reset_date
      ) VALUES (
        user_record.id,
        annual_leave_type_id,
        next_year,
        remaining_leaves, -- Start with carried forward leaves
        0,
        get_monthly_leave_rate(user_record.date_of_joining),
        NULL,
        remaining_leaves,
        get_next_anniversary_date(user_record.date_of_joining)
      ) ON CONFLICT (user_id, leave_type_id, year) DO UPDATE SET
        carry_forward_from_previous_year = remaining_leaves,
        allocated_days = allocated_days + remaining_leaves;
      
      RAISE NOTICE 'Carried forward % leaves for % to year %', 
        remaining_leaves, user_record.full_name, next_year;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update leave balance when application is approved/rejected
CREATE OR REPLACE FUNCTION update_leave_balance_on_status_change()
RETURNS trigger AS $$
DECLARE
  days_difference integer;
BEGIN
  -- Only process when status changes from/to approved
  IF OLD.status != NEW.status THEN
    days_difference := 0;
    
    -- If changing from approved to something else, add days back
    IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
      days_difference := -NEW.days_count;
    -- If changing to approved from something else, subtract days
    ELSIF OLD.status != 'approved' AND NEW.status = 'approved' THEN
      days_difference := NEW.days_count;
    END IF;
    
    -- Update the leave balance if there's a change
    IF days_difference != 0 THEN
      UPDATE leave_balances SET
        used_days = used_days + days_difference,
        updated_at = now()
      WHERE user_id = NEW.user_id 
        AND leave_type_id = NEW.leave_type_id 
        AND year = EXTRACT(YEAR FROM NEW.start_date);
      
      -- If no balance record exists for this year, create one
      IF NOT FOUND THEN
        PERFORM update_user_leave_balance(NEW.user_id, EXTRACT(YEAR FROM NEW.start_date)::integer);
        
        -- Try the update again
        UPDATE leave_balances SET
          used_days = used_days + days_difference,
          updated_at = now()
        WHERE user_id = NEW.user_id 
          AND leave_type_id = NEW.leave_type_id 
          AND year = EXTRACT(YEAR FROM NEW.start_date);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for leave balance updates
DROP TRIGGER IF EXISTS trigger_update_leave_balance_on_status_change ON leave_applications;
CREATE TRIGGER trigger_update_leave_balance_on_status_change
  AFTER UPDATE ON leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_balance_on_status_change();

-- Initialize leave balances for all existing active users
DO $$
DECLARE
  user_record record;
BEGIN
  FOR user_record IN 
    SELECT id, full_name, date_of_joining
    FROM users 
    WHERE status = 'active' 
      AND date_of_joining IS NOT NULL
  LOOP
    BEGIN
      PERFORM update_user_leave_balance(user_record.id);
      RAISE NOTICE 'Initialized leave balance for %', user_record.full_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to initialize leave balance for %: %', user_record.full_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Create comments for documentation
COMMENT ON FUNCTION get_tenure_months(date) IS 'Calculates tenure in months from joining date to current date';
COMMENT ON FUNCTION get_monthly_leave_rate(date) IS 'Returns monthly leave credit rate based on tenure: 0 for <9mo, 1 for 9-11mo, 1.5 for 12+mo';
COMMENT ON FUNCTION can_carry_forward_leaves(date) IS 'Returns true if user can carry forward leaves (tenure >= 2 years)';
COMMENT ON FUNCTION update_user_leave_balance(uuid, integer) IS 'Initializes or updates leave balance for a user for a given year';
COMMENT ON FUNCTION credit_monthly_leaves() IS 'Credits monthly leaves to all eligible users - should be run monthly';
COMMENT ON FUNCTION process_anniversary_resets() IS 'Resets leave balances for users with <2 years tenure on their anniversary';
COMMENT ON FUNCTION process_year_end_carry_forward() IS 'Handles carry-forward of leaves for users with >=2 years tenure';

COMMENT ON COLUMN leave_balances.monthly_credit_rate IS 'Monthly leave credit rate based on tenure';
COMMENT ON COLUMN leave_balances.last_credited_month IS 'Last month when leaves were credited';
COMMENT ON COLUMN leave_balances.carry_forward_from_previous_year IS 'Leaves carried forward from previous year';
COMMENT ON COLUMN leave_balances.anniversary_reset_date IS 'Date when balance resets for users with <2 years tenure';
