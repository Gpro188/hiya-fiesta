@echo off
TITLE ArtsFest Management System - Launcher
SETLOCAL EnableDelayedExpansion

echo ==========================================
echo    ARTSFEST MANAGEMENT SYSTEM
echo ==========================================
echo.

:: Check for node_modules
if not exist "node_modules\" (
    echo [1/3] Installing dependencies...
    call npm install
) else (
    echo [1/3] Dependencies found.
)

:: Check for .env
if not exist ".env" (
    echo [!] Warning: .env file not found. Creating a default one...
    echo DATABASE_URL="file:./dev.db" > .env
    echo NEXTAUTH_SECRET="yoursecret" >> .env
    echo NEXTAUTH_URL="http://localhost:3001" >> .env
)

:: Run Migrations
echo [2/3] Preparing database...
call npx prisma generate
call npx prisma db push

:: Start App
echo [3/3] Starting development server on port 3001...
echo.
echo ------------------------------------------
echo  App will be available at: http://localhost:3001
echo ------------------------------------------
echo.
call npm run dev -- -p 3001 --hostname 0.0.0.0

pause
