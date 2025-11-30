-- Fix RLS policies for grocery_list_items to use clerk_user_id() like pantry_items does
-- This migration fixes the 404/406 errors when adding items to the grocery list

-- Drop existing policies that used auth.jwt() ->> 'sub'
DROP POLICY IF EXISTS "Users can view their own grocery list items" ON public.grocery_list_items;
DROP POLICY IF EXISTS "Users can insert their own grocery list items" ON public.grocery_list_items;
DROP POLICY IF EXISTS "Users can update their own grocery list items" ON public.grocery_list_items;
DROP POLICY IF EXISTS "Users can delete their own grocery list items" ON public.grocery_list_items;

-- Create new policies using clerk_user_id() for Clerk JWT compatibility
CREATE POLICY "grocery_list_select_own"
ON public.grocery_list_items FOR SELECT
TO authenticated
USING (clerk_user_id() = user_id);

CREATE POLICY "grocery_list_insert_own"
ON public.grocery_list_items FOR INSERT
TO authenticated
WITH CHECK (clerk_user_id() = user_id);

CREATE POLICY "grocery_list_update_own"
ON public.grocery_list_items FOR UPDATE
TO authenticated
USING (clerk_user_id() = user_id)
WITH CHECK (clerk_user_id() = user_id);

CREATE POLICY "grocery_list_delete_own"
ON public.grocery_list_items FOR DELETE
TO authenticated
USING (clerk_user_id() = user_id);

-- Also add a service role policy for admin/backend operations
CREATE POLICY "grocery_list_service_role_all"
ON public.grocery_list_items FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

