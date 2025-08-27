/*
  # Add manager_id column to users table

  1. Schema Changes
    - Add `manager_id` column to `users` table
    - Create foreign key relationship to users table (self-referencing)
    - Add index for performance

  2. Functions
    - Update notification functions to notify managers
    - Add function to mark notifications as read
    - Add function to mark all notifications as read

  3. Security
    - No RLS changes needed as existing policies cover the new column
*/

-- Add manager_id column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE users ADD COLUMN manager_id uuid REFERENCES users(id);
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications 
  SET 
    is_read = true,
    read_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications 
  SET 
    is_read = true,
    read_at = now()
  WHERE user_id = p_user_id AND user_id = auth.uid() AND is_read = false;
END;
$$;

-- Function to create notification (updated to notify managers)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'general',
  p_data jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id uuid;
  manager_id uuid;
BEGIN
  -- Create notification for the user
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (p_user_id, p_title, p_message, p_type, p_data)
  RETURNING id INTO notification_id;
  
  -- Get the user's manager
  SELECT u.manager_id INTO manager_id
  FROM users u
  WHERE u.id = p_user_id;
  
  -- If user has a manager, create notification for manager too
  IF manager_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      manager_id, 
      'Team Member: ' || p_title, 
      p_message, 
      p_type, 
      jsonb_build_object('original_user_id', p_user_id) || p_data
    );
  END IF;
  
  RETURN notification_id;
END;
$$;

-- Updated leave request notification function
CREATE OR REPLACE FUNCTION notify_leave_request_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name text;
  leave_type_name text;
  manager_id uuid;
BEGIN
  -- Get user name and leave type
  SELECT u.full_name, u.manager_id INTO user_name, manager_id
  FROM users u
  WHERE u.id = NEW.user_id;
  
  SELECT lt.name INTO leave_type_name
  FROM leave_types lt
  WHERE lt.id = NEW.leave_type_id;
  
  -- Create notification for the user
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    NEW.user_id,
    'Leave Application Submitted',
    'Your ' || leave_type_name || ' application has been submitted for approval.',
    'leave_request_submitted',
    jsonb_build_object(
      'leave_application_id', NEW.id,
      'leave_type', leave_type_name,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'days_count', NEW.days_count
    )
  );
  
  -- Create notification for the manager if exists
  IF manager_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      manager_id,
      'New Leave Request',
      user_name || ' has submitted a ' || leave_type_name || ' request for ' || NEW.days_count || ' days.',
      'leave_request_submitted',
      jsonb_build_object(
        'leave_application_id', NEW.id,
        'employee_name', user_name,
        'employee_id', NEW.user_id,
        'leave_type', leave_type_name,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date,
        'days_count', NEW.days_count
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Updated leave request status update function
CREATE OR REPLACE FUNCTION notify_leave_request_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name text;
  leave_type_name text;
  approver_name text;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get user name, leave type, and approver name
  SELECT u.full_name INTO user_name
  FROM users u
  WHERE u.id = NEW.user_id;
  
  SELECT lt.name INTO leave_type_name
  FROM leave_types lt
  WHERE lt.id = NEW.leave_type_id;
  
  SELECT u.full_name INTO approver_name
  FROM users u
  WHERE u.id = NEW.approved_by;
  
  -- Create notification for the user
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    NEW.user_id,
    'Leave Application ' || CASE 
      WHEN NEW.status = 'approved' THEN 'Approved'
      WHEN NEW.status = 'rejected' THEN 'Rejected'
      ELSE 'Updated'
    END,
    'Your ' || leave_type_name || ' application has been ' || NEW.status || 
    CASE WHEN approver_name IS NOT NULL THEN ' by ' || approver_name ELSE '' END || '.',
    'leave_request_' || NEW.status,
    jsonb_build_object(
      'leave_application_id', NEW.id,
      'leave_type', leave_type_name,
      'status', NEW.status,
      'approver_name', approver_name,
      'comments', NEW.comments
    )
  );
  
  RETURN NEW;
END;
$$;