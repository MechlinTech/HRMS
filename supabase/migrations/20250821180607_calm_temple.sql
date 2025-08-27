/*
  # Remove push notification triggers and functions

  1. Changes
    - Remove any database triggers that attempt to make HTTP calls
    - Remove functions that use net.http_post
    - Keep only basic notification creation in database

  2. Security
    - Maintain existing RLS policies
    - Keep notification table structure intact
*/

-- Drop any triggers that might be making HTTP calls
DROP TRIGGER IF EXISTS leave_request_status_update_trigger ON leave_applications;
DROP TRIGGER IF EXISTS leave_request_submitted_trigger ON leave_applications;

-- Drop the functions that use net.http_post
DROP FUNCTION IF EXISTS notify_leave_request_status_update();
DROP FUNCTION IF EXISTS notify_leave_request_submitted();

-- Create simple notification functions that don't make HTTP calls
CREATE OR REPLACE FUNCTION notify_leave_request_submitted()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create in-app notification, no HTTP calls
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    NEW.user_id,
    'Leave Request Submitted',
    'Your leave request has been submitted and is pending approval.',
    'leave_request_submitted',
    jsonb_build_object('leave_application_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_leave_request_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create in-app notification when status changes, no HTTP calls
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.user_id,
      CASE NEW.status
        WHEN 'approved' THEN 'Leave Request Approved'
        WHEN 'rejected' THEN 'Leave Request Rejected'
        ELSE 'Leave Request Updated'
      END,
      CASE NEW.status
        WHEN 'approved' THEN 'Your leave request has been approved.'
        WHEN 'rejected' THEN 'Your leave request has been rejected.'
        ELSE 'Your leave request status has been updated.'
      END,
      CASE NEW.status
        WHEN 'approved' THEN 'leave_request_approved'
        WHEN 'rejected' THEN 'leave_request_rejected'
        ELSE 'leave_request_submitted'
      END,
      jsonb_build_object('leave_application_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers with the updated functions
CREATE TRIGGER leave_request_submitted_trigger
  AFTER INSERT ON leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_leave_request_submitted();

CREATE TRIGGER leave_request_status_update_trigger
  AFTER UPDATE ON leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_leave_request_status_update();