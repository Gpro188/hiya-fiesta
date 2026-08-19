@echo off
TITLE ArtsFest Management System - PRODUCTION
SETLOCAL EnableDelayedExpansion

echo ==========================================
echo    ARTSFEST MANAGEMENT SYSTEM (PRODUCTION)
echo ==========================================
echo.

echo [1/2] Building for Production...
call npm run build

echo.
echo [2/2] Starting Production Server on port 3001...
call npx next start -p 3001

pause
