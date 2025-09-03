/*
  # Add Trigger for Automatic Internal Fields Population

  1. Function
    - `set_default_internal_fields()` - Function to set internal fields for new users
    - Gets the most recent internal_people and internal_payroll values from existing users
    - Sets these values for newly inserted users

  2. Trigger
    - `trigger_set_default_internal_fields` - Trigger that fires BEFORE INSERT on users table
    - Automatically populates internal_people and internal_payroll for new users

  3. Security
    - Function is marked as SECURITY DEFINER to ensure it runs with necessary privileges
    - Only executes during INSERT operations on users table
*/

-- Create function to set default internal fields for new users
CREATE OR REPLACE FUNCTION set_default_internal_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    default_internal_people uuid REFERENCES users(id) NOT NULL;
    default_internal_payroll uuid REFERENCES users(id) NOT NULL;
    user_count integer;
BEGIN
    -- Check if there are any existing users with internal field values
    SELECT COUNT(*) INTO user_count
    FROM users 
    WHERE internal_people IS NOT NULL OR internal_payroll IS NOT NULL;
    
    -- Only set defaults if there are existing users with internal field values
    -- and if the new user doesn't already have these values set
    IF user_count > 0 THEN
        -- Set internal_people if not already provided
        IF NEW.internal_people IS NULL THEN
            -- Get the most recent internal_people value from existing users
            SELECT internal_people INTO default_internal_people
            FROM users 
            WHERE internal_people IS NOT NULL 
            ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
            LIMIT 1;
            
            NEW.internal_people := default_internal_people;
        END IF;
        
        -- Set internal_payroll if not already provided
        IF NEW.internal_payroll IS NULL THEN
            -- Get the most recent internal_payroll value from existing users
            SELECT internal_payroll INTO default_internal_payroll
            FROM users 
            WHERE internal_payroll IS NOT NULL 
            ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
            LIMIT 1;
            
            NEW.internal_payroll := default_internal_payroll;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger that fires before insert on users table
CREATE TRIGGER trigger_set_default_internal_fields
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_default_internal_fields();

-- Add comment for documentation
COMMENT ON FUNCTION set_default_internal_fields() IS 'Automatically sets internal_people and internal_payroll fields for new users based on existing user values';
COMMENT ON TRIGGER trigger_set_default_internal_fields ON users IS 'Trigger that automatically populates internal fields for new users';
