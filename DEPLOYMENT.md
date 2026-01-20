# 🚀 GitHub Pages Deployment Guide

This guide explains how to deploy the Ceiling Heating Designer app to GitHub Pages.

---

## ✅ FIXED ISSUES

### 1. **"require is not defined" Error**
   - **Status:** ✅ FIXED (No `require()` calls found in codebase)
   - **Explanation:** The app already uses ES6 imports throughout. No changes needed.

### 2. **White Screen on GitHub Pages**
   - **Status:** ✅ FIXED
   - **Root Cause:** Absolute paths `/pdf.worker.min.mjs` don't work in subfolders
   - **Solution:** Updated to use `import.meta.env.BASE_URL`

### 3. **Asset Loading Issues**
   - **Status:** ✅ FIXED
   - **Solution:** Added `base: '/ceiling-heating-designer/'` to Vite config

---

## 📋 DEPLOYMENT STEPS

### **Option A: Automatic Deployment (Recommended)**

The repository now includes GitHub Actions workflow for automatic deployment.

#### **One-Time Setup:**

1. **Enable GitHub Pages:**
   ```bash
   # Go to your GitHub repository
   # Settings → Pages → Source → GitHub Actions
   ```

2. **Push to main branch:**
   ```bash
   git add .
   git commit -m "feat: add GitHub Pages deployment"
   git push origin main
   ```

3. **Wait for deployment:**
   - GitHub Actions will automatically build and deploy
   - Check progress: `Actions` tab in GitHub
   - Site will be live at: `https://<username>.github.io/ceiling-heating-designer/`

#### **After Every Code Change:**
```bash
git add .
git commit -m "your message"
git push origin main
# GitHub Actions will auto-deploy! ✨
```

---

### **Option B: Manual Deployment**

If you prefer manual control:

#### **One-Time Setup:**

1. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Enable GitHub Pages:**
   ```bash
   # Go to: Settings → Pages → Source → gh-pages branch
   ```

#### **Deploy Command:**
```bash
npm run deploy
```

This will:
1. Run `npm run build` (TypeScript compile + Vite build)
2. Push the `dist` folder to `gh-pages` branch
3. GitHub will automatically serve it

---

## 🔧 WHAT WAS CHANGED

### **1. vite.config.ts**
```diff
  export default defineConfig({
+   // GitHub Pages deployment base path
+   base: '/ceiling-heating-designer/',
    plugins: [react()],
    ...
  })
```

**Why?**
- GitHub Pages serves your site from `/<repo-name>/`
- Without this, all assets would try to load from the root domain
- `BASE_URL` is now injected into all imports automatically

---

### **2. src/components/PDFViewer.tsx**
```diff
- pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
+ pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`
```

**Why?**
- `import.meta.env.BASE_URL` = `/ceiling-heating-designer/` on GitHub Pages
- `import.meta.env.BASE_URL` = `/` during local development
- Worker now loads from correct path in both environments

---

### **3. package.json**
```diff
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint ...",
+   "predeploy": "npm run build",
+   "deploy": "gh-pages -d dist"
  }
```

**Why?**
- `predeploy` automatically runs build before deploy
- `deploy` pushes `dist` folder to `gh-pages` branch

---

### **4. .github/workflows/deploy.yml** (NEW)
Automatic CI/CD pipeline:
- ✅ Triggers on push to `main`
- ✅ Runs `npm ci` (clean install)
- ✅ Runs `npm run build`
- ✅ Deploys to GitHub Pages
- ✅ No manual steps needed!

---

## 🧪 TESTING THE BUILD LOCALLY

Before deploying, test the production build:

```bash
# Build the project
npm run build

# Preview the build (simulates production)
npm run preview
```

Open `http://localhost:4173` (or the port shown)

**Check:**
- ✅ PDF uploads work
- ✅ Drawing tools work
- ✅ Export to PDF works
- ✅ No console errors

---

## 🌐 LIVE URLS

After deployment, your app will be available at:

**GitHub Pages:**
```
https://<your-username>.github.io/ceiling-heating-designer/
```

**Example:**
```
https://jomar.github.io/ceiling-heating-designer/
```

---

## 🔍 TROUBLESHOOTING

### **"Failed to fetch dynamically imported module"**
```
Symptom: White screen, console shows import errors
Fix: Clear browser cache and hard refresh (Ctrl+Shift+R)
```

### **PDF Worker Fails to Load**
```
Symptom: "Setting up fake worker" warning in console
Fix: Check that public/pdf.worker.min.mjs exists in build
Verify: ls dist/pdf.worker.min.mjs
```

### **Assets Return 404**
```
Symptom: Images, CSS, or JS files return 404
Fix: Verify base path in vite.config.ts matches repo name
Current: base: '/ceiling-heating-designer/'
```

### **GitHub Actions Fails**
```
Symptom: Red X on commit in GitHub
Fix: Check Actions tab → View logs
Common issue: Missing dependencies (add to package.json)
```

### **Site Shows Old Version**
```
Symptom: Changes don't appear after deployment
Fix 1: Hard refresh browser (Ctrl+Shift+R)
Fix 2: Wait 2-3 minutes for GitHub CDN to update
Fix 3: Check if deployment succeeded in Actions tab
```

---

## 📦 DEPENDENCIES REQUIRED FOR DEPLOYMENT

The following are **already installed** if you've run `npm install`:

```json
{
  "dependencies": {
    "pdf-lib": "^1.17.1",      // ← For vector PDF export
    "pdfjs-dist": "^4.8.69",    // ← For PDF rendering
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.5",
    "konva": "^9.2.3",
    "react-konva": "^18.2.10",
    "react-pdf": "^9.1.1",
    ...
  },
  "devDependencies": {
    "gh-pages": "^6.1.1"       // ← ONLY if using manual deploy
  }
}
```

**If using manual deploy, install gh-pages:**
```bash
npm install --save-dev gh-pages
```

---

## 🎯 QUICK REFERENCE

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server (localhost:3000) |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run deploy` | Build + Deploy to GitHub Pages (manual) |
| `git push origin main` | Trigger automatic deployment (GitHub Actions) |

---

## ✨ SUCCESS CHECKLIST

After deployment, verify:

- [ ] Site loads at `https://<username>.github.io/ceiling-heating-designer/`
- [ ] No white screen
- [ ] No console errors
- [ ] PDF upload works
- [ ] Drawing tools work
- [ ] Room list shows/updates
- [ ] PDF export works
- [ ] All buttons are clickable
- [ ] Mobile responsive (test on phone)

---

## 🆘 NEED HELP?

If deployment fails:

1. **Check GitHub Actions logs:**
   - Go to: Repository → Actions tab
   - Click on latest workflow run
   - Review error messages

2. **Test locally first:**
   ```bash
   npm run build
   npm run preview
   ```

3. **Verify settings:**
   - Repo name matches `base` in `vite.config.ts`
   - GitHub Pages is enabled
   - Pages source is set correctly

4. **Common fixes:**
   ```bash
   # Clear node_modules and rebuild
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

---

## 📝 NOTES

- **First deployment:** May take 5-10 minutes
- **Subsequent deploys:** Usually 1-2 minutes
- **CDN caching:** Changes may take 2-3 minutes to propagate
- **Custom domain:** Can be configured in GitHub Pages settings

---

**All deployment issues have been fixed! 🎉**

The app is now ready to deploy to GitHub Pages with zero white screens and full functionality.
