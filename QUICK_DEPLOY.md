# 🚀 Quick Deploy Guide

## Fastest Way: Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub
```bash
# If you haven't initialized git yet
git init
git add .
git commit -m "Ready to deploy"

# Create a new repository on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel

1. **Go to**: https://vercel.com
2. **Sign up** with GitHub (free)
3. **Click**: "Add New Project"
4. **Import** your GitHub repository
5. **Configure**:
   - Framework: **Vite** (auto-detected)
   - Build Command: `npm run build` (auto-filled)
   - Output Directory: `dist` (auto-filled)
   - Install Command: `npm install` (auto-filled)

6. **Add Environment Variables**:
   Click "Environment Variables" and add:
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: Your Supabase URL (from Supabase Dashboard → Settings → API)
   
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: Your Supabase Anon Key (from Supabase Dashboard → Settings → API)

7. **Click**: "Deploy"
8. **Wait**: 1-2 minutes
9. **Done!** Your app is live at `your-project.vercel.app`

---

## Alternative: Netlify (Also 5 minutes)

1. **Go to**: https://netlify.com
2. **Sign up** with GitHub
3. **Click**: "Add new site" → "Import an existing project"
4. **Select** your GitHub repository
5. **Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. **Environment Variables**:
   - Site Settings → Environment Variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
7. **Deploy!**

---

## Get Your Supabase Credentials

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to: **Settings** → **API**
4. Copy:
   - **Project URL** → Use as `VITE_SUPABASE_URL`
   - **anon public** key → Use as `VITE_SUPABASE_ANON_KEY`

---

## Test Locally First (Optional)

Before deploying, test the build:

```bash
npm run build
npm run preview
```

Visit http://localhost:4173 to test the production build.

---

## That's It! 🎉

Your app will be:
- ✅ Live on the internet
- ✅ Accessible from any device
- ✅ HTTPS enabled (secure)
- ✅ Auto-deploys on every git push

---

## Need Help?

- Check `DEPLOYMENT.md` for detailed instructions
- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com

