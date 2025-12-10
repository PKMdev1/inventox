# Deployment Guide - Shelf Inventory Tracker

This guide will help you deploy your app online so it's accessible from anywhere.

## Quick Deploy Options

### Option 1: Vercel (Recommended - Easiest & Free)

**Steps:**

1. **Install Vercel CLI** (optional, or use web interface):
   ```bash
   npm install -g vercel
   ```

2. **Create a GitHub Repository** (if you haven't already):
   - Go to https://github.com/new
   - Create a new repository
   - Push your code:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin YOUR_GITHUB_REPO_URL
     git push -u origin main
     ```

3. **Deploy to Vercel**:
   - Go to https://vercel.com
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: Vite
     - **Root Directory**: `./` (default)
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   
4. **Add Environment Variables** in Vercel:
   - Go to Project Settings → Environment Variables
   - Add:
     - `VITE_SUPABASE_URL` = Your Supabase URL
     - `VITE_SUPABASE_ANON_KEY` = Your Supabase Anon Key
   - Click "Save"
   - Redeploy the project

5. **Deploy!**
   - Click "Deploy"
   - Wait 1-2 minutes
   - Your app will be live at `your-project-name.vercel.app`

---

### Option 2: Netlify (Also Easy & Free)

**Steps:**

1. **Create a GitHub Repository** (same as above)

2. **Deploy to Netlify**:
   - Go to https://netlify.com
   - Sign up/login with GitHub
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repository
   - Configure:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
   
3. **Add Environment Variables**:
   - Go to Site Settings → Environment Variables
   - Add:
     - `VITE_SUPABASE_URL` = Your Supabase URL
     - `VITE_SUPABASE_ANON_KEY` = Your Supabase Anon Key
   - Click "Save"
   - Go to Deploys → Trigger deploy → Clear cache and deploy site

4. **Your app is live!**
   - URL will be `your-project-name.netlify.app`

---

### Option 3: GitHub Pages (Free but requires manual setup)

1. **Install gh-pages**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json**:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. **Update vite.config.ts** (add base path):
   ```typescript
   export default defineConfig({
     base: '/your-repo-name/',
     plugins: [react()],
   })
   ```

4. **Deploy**:
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Select source: `gh-pages` branch
   - Your site: `https://yourusername.github.io/your-repo-name/`

**Note**: GitHub Pages doesn't support environment variables easily. You'd need to use a different approach for env vars.

---

## Environment Variables Setup

For all platforms, you need to set these environment variables:

1. **VITE_SUPABASE_URL**
   - Get from: Supabase Dashboard → Project Settings → API
   - Example: `https://xxxxx.supabase.co`

2. **VITE_SUPABASE_ANON_KEY**
   - Get from: Supabase Dashboard → Project Settings → API
   - This is the "anon" or "public" key (safe to expose in frontend)

**Important**: These variables must start with `VITE_` for Vite to include them in the build.

---

## Testing Your Deployment

After deployment:

1. Visit your deployed URL
2. Try logging in
3. Test scanning a shelf
4. Check if offline mode works
5. Verify all features work correctly

---

## Custom Domain (Optional)

Both Vercel and Netlify support custom domains:

- **Vercel**: Project Settings → Domains → Add your domain
- **Netlify**: Site Settings → Domain Management → Add custom domain

---

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure environment variables are set correctly
- Check build logs for specific errors

### Environment Variables Not Working
- Make sure they start with `VITE_`
- Redeploy after adding variables
- Check that variables are set for "Production" environment

### Routing Issues (404 on refresh)
- Vercel: Automatically handles this
- Netlify: Create `public/_redirects` file with:
  ```
  /*    /index.html   200
  ```

### CORS Issues
- Check Supabase RLS policies
- Verify Supabase URL is correct
- Check browser console for specific errors

---

## Recommended: Vercel

**Why Vercel?**
- ✅ Easiest setup
- ✅ Automatic HTTPS
- ✅ Free tier is generous
- ✅ Automatic deployments from GitHub
- ✅ Great performance
- ✅ Handles SPA routing automatically

---

## Need Help?

If you encounter issues:
1. Check the deployment platform's documentation
2. Review build logs
3. Check browser console for errors
4. Verify environment variables are set correctly

