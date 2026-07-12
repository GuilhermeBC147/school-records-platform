@echo off
setlocal

cd /d "%~dp0"

if not exist ".tmp\cloudflared.exe" (
  echo cloudflared.exe was not found at .tmp\cloudflared.exe
  echo Ask Codex to download it again, or download cloudflared for Windows.
  pause
  exit /b 1
)

echo Starting Cloudflare temporary public tunnel...
echo Leave this window open while testers use the public link.
echo Press Ctrl+C in this window to stop the tunnel.
echo.
".tmp\cloudflared.exe" tunnel --url http://localhost:3000

