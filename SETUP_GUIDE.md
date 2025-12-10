# Setup Guide - Step by Step

## ✅ Step 1: Dependencies Installed
All npm packages have been installed successfully!

## 📝 Step 2: Create .env File

Since `.env` files are protected, you need to create it manually:

1. **Create a new file** in the root directory (same folder as `package.json`) named `.env`

2. **Copy and paste this content** into the `.env` file:

```env
# Supabase Configuration
# Replace the values below with your actual Supabase project credentials

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 🔑 Step 3: Get Your Supabase Credentials

### If you DON'T have a Supabase account yet:

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account
3. Click "New Project"
4. Fill in:
   - **Project Name**: (e.g., "shelf-inventory")
   - **Database Password**: (save this securely!)
   - **Region**: Choose closest to you
5. Wait 2-3 minutes for project to be created

### If you already have a Supabase project:

1. Go to your Supabase Dashboard
2. Select your project
3. Click **Settings** (gear icon) → **API**
4. You'll see:
   - **Project URL** - Copy this (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** - Copy this (long string starting with `eyJ...`)

## ✏️ Step 4: Update .env File

Replace the placeholder values in your `.env` file:

1. **VITE_SUPABASE_URL**: 
   - Replace `https://your-project-id.supabase.co` with your actual Project URL
   - Example: `VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co`

2. **VITE_SUPABASE_ANON_KEY**:
   - Replace `your-anon-key-here` with your actual anon/public key
   - Example: `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Your final .env file should look like:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🗄️ Step 5: Set Up Database Tables

1. In your Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire SQL schema from `README.md` (the section starting with `-- Shelves table`)
4. Click **Run** (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

## 👤 Step 6: Create a User Account

1. In Supabase Dashboard, go to **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Enter:
   - **Email**: (e.g., `admin@example.com`)
   - **Password**: (choose a strong password)
4. Click **Create User**
5. **Save these credentials** - you'll use them to log into the app!

## 🚀 Step 7: Run the App

Once you've completed steps 2-6, run:

```bash
npm run dev
```

The app will start at: `http://localhost:5173`

## 🎯 Step 8: Test the App

1. Open `http://localhost:5173` in your browser
2. You should see the Login page
3. Log in with the email/password you created in Step 6
4. You should see the Dashboard!

## 📋 Quick Checklist

- [ ] Created `.env` file
- [ ] Got Supabase Project URL
- [ ] Got Supabase Anon Key
- [ ] Updated `.env` with real values
- [ ] Created database tables (SQL script)
- [ ] Created at least one user account
- [ ] Ran `npm run dev`
- [ ] Successfully logged in

## 🆘 Troubleshooting

### "Supabase credentials not found" warning
- Make sure `.env` file exists in the root directory
- Make sure variable names start with `VITE_`
- Restart the dev server after creating/updating `.env`

### "Failed to login"
- Check that you created a user in Supabase Authentication
- Verify email/password are correct
- Check browser console for error messages

### Database errors
- Make sure you ran the SQL schema script
- Check that RLS policies were created
- Verify you're logged in as an authenticated user

### Camera not working
- Make sure you're using HTTPS (or localhost)
- Grant camera permissions in browser
- Try a different browser (Chrome/Firefox recommended)

---

**Need help?** Check the main `README.md` for more detailed information.

