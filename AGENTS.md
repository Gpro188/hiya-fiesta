<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# DEPLOYMENT & REPOSITORY RULES (CRITICAL)

1. **Official Git Repository**:
   - `https://github.com/Gpro188/hiya-fiesta.git` (branch: `main`)
   
2. **Official Server Target**:
   - `dpro188@192.168.18.236`
   - Working Directory: `/home/dpro188/hiya-fiesta`
   - Process Manager: PM2 (`pm2 restart hiya-fiesta`)

3. **Official Vercel Project**:
   - Organization/Account: `dpro-02`
   - Project: `hiya-fiesta` (URL: `https://vercel.com/dpro-02/hiya-fiesta`)
   - **DO NOT** run `vercel --prod` using other CLI accounts or link to any other project (e.g. `gpro188s-projects/dpro-artsfes` or any other team).
   - Vercel deployments must ONLY happen automatically via Git integration by pushing to `origin/main` on `https://github.com/Gpro188/hiya-fiesta`.

