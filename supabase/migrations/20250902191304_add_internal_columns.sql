/*
  # Add Internal Columns to Users Table

  1. New Columns
    - `internal_people` - Text field for internal people information
    - `internal_payroll` - Text field for internal payroll information

  2. Security
    - No additional RLS policies needed (inherits from users table)
    - Only authorized users can modify these fields
*/

-- Add internal_people column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS internal_people uuid REFERENCES users(id) NOT NULL;

-- Add internal_payroll column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS internal_payroll uuid REFERENCES users(id) NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.internal_people IS 'Internal people information that applies to all users';
COMMENT ON COLUMN users.internal_payroll IS 'Internal payroll information that applies to all users';
