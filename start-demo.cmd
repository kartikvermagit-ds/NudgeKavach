@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or later, then run this again.
  pause
  exit /b 1
)
echo The local demo URL will appear below.
echo Keep this window open. Press Ctrl+C to stop.
node backend\server.cjs
pause
