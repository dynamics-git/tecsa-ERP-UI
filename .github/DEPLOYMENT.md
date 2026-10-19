# GitHub Actions FTP Deployment

This workflow automatically deploys your Angular frontend to your server via FTP when you push to `main` or `prod` branches.

## Required GitHub Secrets

You need to add these secrets to your GitHub repository:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `FTP_SERVER` | Your FTP server hostname | `ftp.yourserver.com` |
| `FTP_USER` | FTP username | `youruser@domain.com` |
| `FTP_PASS` | FTP password | `your-secure-password` |

## Workflow Configuration

### Build Output
- The Angular app builds to: `dist/tecsa-erp-ui/browser/`
- Files are deployed to: `./public/` on your FTP server

### Triggers
- **Automatic**: Pushes to `main` or `prod` branches
- **Manual**: Click "Run workflow" button in GitHub Actions tab

### What Gets Deployed
✅ All compiled JavaScript, CSS, HTML, and assets  
❌ Source maps (*.map files)  
❌ node_modules  
❌ Git files  

## Server Directory Structure

Make sure your FTP server has the correct permissions:
```
/public/
  ├── index.html
  ├── main-[hash].js
  ├── styles-[hash].css
  └── assets/
```

Adjust the `server-dir` in the workflow file if your hosting path is different.

## Testing Deployment

1. Make a change to your frontend code
2. Commit and push to `main` branch
3. Go to GitHub → Actions tab
4. Watch the deployment progress
5. Check your live site!

## Troubleshooting

### Deployment fails with "Missing required secret"
→ Add the missing FTP secret in GitHub repository settings

### Files not appearing on server
→ Check `server-dir` path matches your hosting structure

### Build fails
→ Run `npm run build` locally first to verify the build works

## Manual Deployment

You can also trigger deployment manually:
1. Go to GitHub → Actions tab
2. Click "Deploy Frontend via FTP" workflow
3. Click "Run workflow" button
4. Select branch and click "Run workflow"
