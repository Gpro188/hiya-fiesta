#!/bin/bash
# ==========================================
# Automated Deployment Script for CSWC Fiesta
# ==========================================

# 1. Go to the project directory (The webhook script runs this from the project root)
cd "$(dirname "$0")/.." || exit

echo "Starting deployment at $(date)..."

# 2. Pull the latest code from GitHub
echo "[1/5] Pulling latest code..."
git pull origin main

# 3. Install dependencies
echo "[2/5] Installing dependencies..."
npm install

# 4. Update Database schema
echo "[3/5] Updating database schema..."
npx prisma generate
npx prisma db push

# 5. Build the Next.js application
echo "[4/5] Building the Next.js app..."
npm run build

# 6. Restart the app using PM2
# NOTE: Make sure you started your app originally with PM2 like this:
# pm2 start npm --name "cswc-fiesta" -- start
echo "[5/5] Restarting the server..."
pm2 restart cswc-fiesta

echo "Deployment complete at $(date)!"
