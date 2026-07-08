@echo off
setlocal

echo Stopping Cloudflare tunnel processes...
taskkill /IM cloudflared.exe /F >nul 2>nul

if errorlevel 1 (
  echo No cloudflared.exe process was running.
) else (
  echo Cloudflare tunnel stopped.
)

pause

