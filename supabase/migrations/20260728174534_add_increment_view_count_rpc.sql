/*
# Add increment_view_count RPC function

## Overview
Creates a PostgreSQL function to atomically increment the view_count column on community_posts.
This is called from the frontend when a user views a post.

## New Functions
- `increment_view_count(post_id uuid)` — increments view_count by 1 for the given post
  - SECURITY DEFINER so it can run from RLS-restricted context
  - Returns the new view_count

## Security
- Function is SECURITY DEFINER, runs as owner
- Only increments — no other fields touched
*/

CREATE OR REPLACE FUNCTION increment_view_count(post_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE community_posts SET view_count = view_count + 1 WHERE id = increment_view_count.post_id
  RETURNING view_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION increment_view_count(uuid) TO authenticated;
