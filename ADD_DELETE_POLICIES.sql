-- ============================================
-- ADD DELETE POLICIES FOR SHELVES AND ITEMS
-- ============================================
-- 
-- Copy and paste this entire file into Supabase SQL Editor
-- Then click "Run" to execute
--
-- This will allow authenticated users to delete shelves and items
-- ============================================

-- Add DELETE policy for shelves
CREATE POLICY "Users can delete shelves" ON shelves
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add DELETE policy for items
CREATE POLICY "Users can delete items" ON items
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add DELETE policy for movements
CREATE POLICY "Users can delete movements" ON movements
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- VERIFICATION
-- ============================================
-- After running, verify the policies were created:
-- 1. Go to Supabase Dashboard → Authentication → Policies
-- 2. Select the 'shelves' table
-- 3. You should see a DELETE policy listed
-- 4. Select the 'items' table  
-- 5. You should see a DELETE policy listed
-- 6. Select the 'movements' table
-- 7. You should see a DELETE policy listed
-- ============================================

