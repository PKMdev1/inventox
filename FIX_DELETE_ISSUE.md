# Fix: Shelf/Item Deletion Issue

## Problem
Shelves or items appear to be deleted but then reappear. This is due to missing Row Level Security (RLS) DELETE policies in Supabase.

## Solution

### Step 1: Add DELETE Policies to Supabase

**Option A: Using SQL Editor (Recommended)**

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste this SQL code:

```sql
-- Add DELETE policy for shelves
CREATE POLICY "Users can delete shelves" ON shelves
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add DELETE policy for items
CREATE POLICY "Users can delete items" ON items
  FOR DELETE USING (auth.role() = 'authenticated');
```

6. Click **Run** (or press Ctrl+Enter / Cmd+Enter)
7. You should see "Success. No rows returned"

**Option B: Using the Policies UI**

1. Go to **Supabase Dashboard** → **Authentication** → **Policies**
2. Select the **`shelves`** table from the dropdown
3. Click **New Policy**
4. Choose **"Create a policy from scratch"**
5. Set:
   - **Policy name**: `Users can delete shelves`
   - **Allowed operation**: `DELETE`
   - **Policy definition**: `auth.role() = 'authenticated'`
6. Click **Save**
7. Repeat for the **`items`** table with policy name `Users can delete items`

### Step 2: Verify Policies

Check that the policies were created:
1. Go to **Supabase Dashboard** → **Authentication** → **Policies**
2. Select the **`shelves`** table
3. You should see a DELETE policy named "Users can delete shelves"
4. Select the **`items`** table
5. You should see a DELETE policy named "Users can delete items"

### Step 3: Test Again

After adding the policies:
1. Go back to your app
2. Try deleting a shelf or item again
3. It should work now! ✅

## Why This Happens

Supabase uses Row Level Security (RLS) to control access. By default, DELETE operations are blocked unless you explicitly create a DELETE policy. The app was trying to delete, but Supabase was silently blocking it due to missing policies.

## Alternative: Check Browser Console

If deletion still doesn't work after adding policies:
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Try deleting a shelf
4. Look for any error messages
5. Share the error message for further troubleshooting

