-- Fix RLS policies for households, household_members, and household_invitations to use clerk_user_id()
-- This migration updates all household-related RLS policies to work with Clerk authentication

-- ============================================
-- HOUSEHOLDS TABLE POLICIES
-- ============================================

-- Drop old policies for households
DROP POLICY IF EXISTS "households_insert_creator" ON households;
DROP POLICY IF EXISTS "households_select_member" ON households;
DROP POLICY IF EXISTS "households_update_creator" ON households;
DROP POLICY IF EXISTS "households_delete_creator" ON households;

-- Create new policies using clerk_user_id()
CREATE POLICY "households_insert_creator" ON households
  FOR INSERT
  WITH CHECK (clerk_user_id() = created_by);

CREATE POLICY "households_select_member" ON households
  FOR SELECT
  USING (
    id IN (
      SELECT household_id FROM household_members
      WHERE user_id = clerk_user_id()
    )
    OR created_by = clerk_user_id()
  );

CREATE POLICY "households_update_creator" ON households
  FOR UPDATE
  USING (clerk_user_id() = created_by);

CREATE POLICY "households_delete_creator" ON households
  FOR DELETE
  USING (clerk_user_id() = created_by);

-- ============================================
-- HOUSEHOLD_MEMBERS TABLE POLICIES
-- ============================================

-- Drop old policies for household_members
DROP POLICY IF EXISTS "household_members_insert_as_admin" ON household_members;
DROP POLICY IF EXISTS "household_members_select_own_memberships" ON household_members;
DROP POLICY IF EXISTS "household_members_update_as_admin" ON household_members;
DROP POLICY IF EXISTS "household_members_delete_as_admin" ON household_members;

-- Create new policies for household_members using clerk_user_id()
-- Allow insert if user is household creator OR adding themselves
CREATE POLICY "household_members_insert_as_admin" ON household_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM households
      WHERE households.id = household_members.household_id
      AND households.created_by = clerk_user_id()
    )
    OR user_id = clerk_user_id()
  );

-- Allow select for own memberships or if user is in same household
CREATE POLICY "household_members_select_own_memberships" ON household_members
  FOR SELECT
  USING (
    user_id = clerk_user_id()
    OR household_id IN (
      SELECT id FROM households WHERE created_by = clerk_user_id()
    )
    OR household_id IN (
      SELECT household_id FROM household_members WHERE user_id = clerk_user_id()
    )
  );

-- Allow update only for household admins
CREATE POLICY "household_members_update_as_admin" ON household_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM households
      WHERE households.id = household_members.household_id
      AND households.created_by = clerk_user_id()
    )
  );

-- Allow delete for household admins or self-removal
CREATE POLICY "household_members_delete_as_admin" ON household_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM households
      WHERE households.id = household_members.household_id
      AND households.created_by = clerk_user_id()
    )
    OR user_id = clerk_user_id()
  );

-- ============================================
-- HOUSEHOLD_INVITATIONS TABLE POLICIES
-- ============================================

-- Drop old policies for household_invitations
DROP POLICY IF EXISTS "household_invitations_insert_household_admin" ON household_invitations;
DROP POLICY IF EXISTS "household_invitations_select_household_admin" ON household_invitations;
DROP POLICY IF EXISTS "household_invitations_update_household_admin" ON household_invitations;
DROP POLICY IF EXISTS "household_invitations_delete_household_admin" ON household_invitations;

-- Create new policies for household_invitations using clerk_user_id()
CREATE POLICY "household_invitations_insert_household_admin" ON household_invitations
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT id FROM households WHERE created_by = clerk_user_id()
    )
  );

CREATE POLICY "household_invitations_select_household_admin" ON household_invitations
  FOR SELECT
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = clerk_user_id()
    )
    OR household_id IN (
      SELECT household_id FROM household_members WHERE user_id = clerk_user_id()
    )
  );

CREATE POLICY "household_invitations_update_household_admin" ON household_invitations
  FOR UPDATE
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = clerk_user_id()
    )
  );

CREATE POLICY "household_invitations_delete_household_admin" ON household_invitations
  FOR DELETE
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = clerk_user_id()
    )
  );

