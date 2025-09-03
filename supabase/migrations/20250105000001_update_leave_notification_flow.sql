/*
  # Update Leave Management Notification Flow
  
  Changes the notification flow as follows:
  - Invoked (new leave application) → manager, internal_people, admin
  - Rejected → User who applied + manager + internal_people + admin
  - Accepted → Every active user in the database
  
  1. Functions
    - Updates `notify_leave_request_submitted()` for new applications
    - Updates `notify_leave_request_status_update()` for approvals/rejections
  
  2. Recipients
    - Manager: Direct manager of the employee
    - Internal People: Users with non-null internal_people field
    - Admin: Users with admin/super_admin roles
    - All Active Users: For approved leave notifications
*/

-- Updated function to notify leave request submitted (Invoked → manager, internal_people, admin)
CREATE OR REPLACE FUNCTION notify_leave_request_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name text;
  leave_type_name text;
  user_manager_id uuid;
  recipient_id uuid;
BEGIN
  -- Get user name, leave type, and manager
  SELECT u.full_name, u.manager_id INTO user_name, user_manager_id
  FROM users u
  WHERE u.id = NEW.user_id;
  
  SELECT lt.name INTO leave_type_name
  FROM leave_types lt
  WHERE lt.id = NEW.leave_type_id;
  
  -- Notify the manager if exists
  IF user_manager_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      user_manager_id,
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
        'days_count', NEW.days_count,
        'recipient_type', 'manager'
      )
    );
  END IF;
  
  -- Notify internal people (users whose ID matches any internal_people field)
  FOR recipient_id IN
    SELECT DISTINCT u_internal.internal_people as recipient_id
    FROM users u_internal
    WHERE u_internal.internal_people IS NOT NULL
    AND u_internal.status = 'active'
    AND u_internal.internal_people != NEW.user_id
    AND u_internal.internal_people != COALESCE(user_manager_id, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      recipient_id,
      'New Leave Request (Internal)',
      user_name || ' has submitted a ' || leave_type_name || ' request for ' || NEW.days_count || ' days.',
      'leave_request_submitted',
      jsonb_build_object(
        'leave_application_id', NEW.id,
        'employee_name', user_name,
        'employee_id', NEW.user_id,
        'leave_type', leave_type_name,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date,
        'days_count', NEW.days_count,
        'recipient_type', 'internal_people'
      )
    );
  END LOOP;
  
  -- Notify admins
  FOR recipient_id IN
    SELECT DISTINCT u.id
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.name IN ('admin', 'super_admin')
    AND u.status = 'active'
    AND u.id != NEW.user_id
    AND u.id != COALESCE(user_manager_id, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      recipient_id,
      'New Leave Request (Admin)',
      user_name || ' has submitted a ' || leave_type_name || ' request for ' || NEW.days_count || ' days.',
      'leave_request_submitted',
      jsonb_build_object(
        'leave_application_id', NEW.id,
        'employee_name', user_name,
        'employee_id', NEW.user_id,
        'leave_type', leave_type_name,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date,
        'days_count', NEW.days_count,
        'recipient_type', 'admin'
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Updated function to notify leave request status update
CREATE OR REPLACE FUNCTION notify_leave_request_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name text;
  leave_type_name text;
  approver_name text;
  recipient_id uuid;
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
  
  -- Handle rejected status - notify user, manager, internal_people, and admin
  IF NEW.status = 'rejected' THEN
    DECLARE
      user_manager_id uuid;
    BEGIN
      -- Get the manager of the user who applied
      SELECT u.manager_id INTO user_manager_id
      FROM users u
      WHERE u.id = NEW.user_id;
      
      -- Notify the user who applied
      INSERT INTO notifications (user_id, title, message, type, data)
      VALUES (
        NEW.user_id,
        'Leave Application Rejected',
        'Your ' || leave_type_name || ' application has been rejected' || 
        CASE WHEN approver_name IS NOT NULL THEN ' by ' || approver_name ELSE '' END || '.',
        'leave_request_rejected',
        jsonb_build_object(
          'leave_application_id', NEW.id,
          'leave_type', leave_type_name,
          'status', NEW.status,
          'approver_name', approver_name,
          'comments', NEW.comments,
          'start_date', NEW.start_date,
          'end_date', NEW.end_date,
          'days_count', NEW.days_count,
          'recipient_type', 'applicant'
        )
      );
      
      -- Notify the manager if exists
      IF user_manager_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, data)
        VALUES (
          user_manager_id,
          'Leave Request Rejected - ' || user_name,
          user_name || '''s ' || leave_type_name || ' request has been rejected' || 
          CASE WHEN approver_name IS NOT NULL THEN ' by ' || approver_name ELSE '' END || '.',
          'leave_request_rejected',
          jsonb_build_object(
            'leave_application_id', NEW.id,
            'employee_name', user_name,
            'employee_id', NEW.user_id,
            'leave_type', leave_type_name,
            'status', NEW.status,
            'approver_name', approver_name,
            'comments', NEW.comments,
            'start_date', NEW.start_date,
            'end_date', NEW.end_date,
            'days_count', NEW.days_count,
            'recipient_type', 'manager'
          )
        );
      END IF;
      
      -- Notify internal people (users whose ID matches any internal_people field)
      FOR recipient_id IN
        SELECT DISTINCT u_internal.internal_people as recipient_id
        FROM users u_internal
        WHERE u_internal.internal_people IS NOT NULL
        AND u_internal.status = 'active'
        AND u_internal.internal_people != NEW.user_id
        AND u_internal.internal_people != COALESCE(user_manager_id, '00000000-0000-0000-0000-000000000000'::uuid)
      LOOP
        INSERT INTO notifications (user_id, title, message, type, data)
        VALUES (
          recipient_id,
          'Leave Request Rejected - ' || user_name,
          user_name || '''s ' || leave_type_name || ' request has been rejected' || 
          CASE WHEN approver_name IS NOT NULL THEN ' by ' || approver_name ELSE '' END || '.',
          'leave_request_rejected',
          jsonb_build_object(
            'leave_application_id', NEW.id,
            'employee_name', user_name,
            'employee_id', NEW.user_id,
            'leave_type', leave_type_name,
            'status', NEW.status,
            'approver_name', approver_name,
            'comments', NEW.comments,
            'start_date', NEW.start_date,
            'end_date', NEW.end_date,
            'days_count', NEW.days_count,
            'recipient_type', 'internal_people'
          )
        );
      END LOOP;
      
      -- Notify admins
      FOR recipient_id IN
        SELECT DISTINCT u.id
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.name IN ('admin', 'super_admin')
        AND u.status = 'active'
        AND u.id != NEW.user_id
        AND u.id != COALESCE(user_manager_id, '00000000-0000-0000-0000-000000000000'::uuid)
      LOOP
        INSERT INTO notifications (user_id, title, message, type, data)
        VALUES (
          recipient_id,
          'Leave Request Rejected - ' || user_name,
          user_name || '''s ' || leave_type_name || ' request has been rejected' || 
          CASE WHEN approver_name IS NOT NULL THEN ' by ' || approver_name ELSE '' END || '.',
          'leave_request_rejected',
          jsonb_build_object(
            'leave_application_id', NEW.id,
            'employee_name', user_name,
            'employee_id', NEW.user_id,
            'leave_type', leave_type_name,
            'status', NEW.status,
            'approver_name', approver_name,
            'comments', NEW.comments,
            'start_date', NEW.start_date,
            'end_date', NEW.end_date,
            'days_count', NEW.days_count,
            'recipient_type', 'admin'
          )
        );
      END LOOP;
    END;
  
  -- Handle approved status - notify every active user in the database
  ELSIF NEW.status = 'approved' THEN
    -- First notify the applicant
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.user_id,
      'Leave Application Approved',
      'Your ' || leave_type_name || ' application has been approved' || 
      CASE WHEN approver_name IS NOT NULL THEN ' by ' || approver_name ELSE '' END || '.',
      'leave_request_approved',
      jsonb_build_object(
        'leave_application_id', NEW.id,
        'leave_type', leave_type_name,
        'status', NEW.status,
        'approver_name', approver_name,
        'comments', NEW.comments,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date,
        'days_count', NEW.days_count,
        'recipient_type', 'applicant'
      )
    );
    
    -- Then notify all other active users
    FOR recipient_id IN
      SELECT u.id
      FROM users u
      WHERE u.status = 'active'
      AND u.id != NEW.user_id
    LOOP
      INSERT INTO notifications (user_id, title, message, type, data)
      VALUES (
        recipient_id,
        'Leave Approved - ' || user_name,
        user_name || '''s ' || leave_type_name || ' leave has been approved for ' || NEW.days_count || ' days (' || 
        TO_CHAR(NEW.start_date::date, 'DD Mon YYYY') || ' to ' || TO_CHAR(NEW.end_date::date, 'DD Mon YYYY') || ').',
        'leave_request_approved',
        jsonb_build_object(
          'leave_application_id', NEW.id,
          'employee_name', user_name,
          'employee_id', NEW.user_id,
          'leave_type', leave_type_name,
          'status', NEW.status,
          'approver_name', approver_name,
          'start_date', NEW.start_date,
          'end_date', NEW.end_date,
          'days_count', NEW.days_count,
          'recipient_type', 'all_users'
        )
      );
    END LOOP;
  
  -- Handle other status changes (if any) - notify only the applicant
  ELSE
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.user_id,
      'Leave Application Updated',
      'Your ' || leave_type_name || ' application status has been updated to ' || NEW.status || 
      CASE WHEN approver_name IS NOT NULL THEN ' by ' || approver_name ELSE '' END || '.',
      'leave_request_' || NEW.status,
      jsonb_build_object(
        'leave_application_id', NEW.id,
        'leave_type', leave_type_name,
        'status', NEW.status,
        'approver_name', approver_name,
        'comments', NEW.comments,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date,
        'days_count', NEW.days_count
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION notify_leave_request_submitted() IS 'Notifies manager, internal_people, and admin when a new leave request is submitted';
COMMENT ON FUNCTION notify_leave_request_status_update() IS 'Handles leave status updates: rejected → applicant + manager + internal_people + admin, approved → all active users, other → applicant only';
