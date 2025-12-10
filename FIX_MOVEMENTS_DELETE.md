# Fix: Cannot Delete Movements

## Problem
You're getting a success notification when trying to clear movements, but the movements reappear. This is because the `movements` table is missing a DELETE policy in Supabase.

## Solution

### Add DELETE Policy for Movements

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** → **New Query**
4. Copy and paste this SQL:

```sql
-- Add DELETE policy for movements
CREATE POLICY "Users can delete movements" ON movements
  FOR DELETE USING (auth.role() = 'authenticated');
```

5. Click **Run**
6. You should see "Success. No rows returned"

### Verify the Policy

1. Go to **Supabase Dashboard** → **Authentication** → **Policies**
2. Select the **`movements`** table
3. You should see a DELETE policy named "Users can delete movements"

### Test Again

After adding the policy:
1. Go back to your app
2. Go to Reports → All Movements tab
3. Click "Clear All" button
4. Confirm the deletion
5. Movements should now be deleted permanently! ✅

## Why This Happens

Supabase uses Row Level Security (RLS) to control access. DELETE operations are blocked unless you explicitly create a DELETE policy. The app was trying to delete, but Supabase was silently blocking it due to the missing policy.

## Alternative: Quick SQL Script

You can also run the updated `ADD_DELETE_POLICIES.sql` file which now includes the movements DELETE policy.

