@echo off
setlocal

cd /d "%~dp0"

echo Stopping any website process listening on port 3000...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING"') do (
  echo Stopping process %%P...
  taskkill /PID %%P /F >nul 2>nul
)

echo.
echo Stopping PostgreSQL Docker container...
docker-compose down

echo.
echo Local website and database stop command finished.
pause

