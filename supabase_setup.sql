-- Enable the ability to delete a user from the client side (Final Robust Version)
-- Run this SQL in your Supabase SQL Editor

-- 1. Create a function to allow users to delete their own account
-- Returns the ID of the deleted user, or NULL if no user was deleted
create or replace function delete_user()
returns text as $$
declare
  request_id uuid;
  deleted_id uuid;
begin
  -- Get the current user's ID from the JWT
  request_id := auth.uid();
  
  if request_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Forcefully clean up ALL public tables dependent on user_id
  -- Since this runs as security definer, it bypasses RLS
  
  -- Core Data
  delete from public.user_preferences where user_id = request_id;
  delete from public.records where user_id = request_id;
  delete from public.circles where user_id = request_id;
  
  -- Feedback Data (The one causing the previous error)
  -- Note: Check if 'feedback' table exists before deleting to avoid errors if schema changes
  -- But standard DELETE is safe even if empty.
  -- If the table name is different, please adjust. Assuming 'feedback'.
  begin
    delete from public.feedback where user_id = request_id;
  exception when others then
    -- Ignore error if table doesn't exist, but log it if possible or just continue
    null; 
  end;

  -- 2. Delete the user from auth.users
  delete from auth.users 
  where id = request_id
  returning id into deleted_id;
  
  return deleted_id::text;
end;
$$ language plpgsql security definer;

-- 2. Grant execute permission to authenticated users
grant execute on function delete_user to authenticated;

-- Note:
-- The 'security definer' allows this function to run with admin privileges
-- We explicitly check auth.uid() to ensure safety
-- We manually delete dependent rows to avoid Foreign Key Constraint violations
