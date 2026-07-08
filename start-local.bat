@echo off
setlocal

cd /d "%~dp0"

echo Starting PostgreSQL with Docker...
docker-compose up -d
if errorlevel 1 (
  echo.
  echo Docker failed to start. Is Docker Desktop running?
  pause
  exit /b 1
)

echo.
echo Starting the local Next.js website...
echo Leave this window open while testing.
echo Press Ctrl+C in this window to stop the website.
echo.
npm.cmd run dev

