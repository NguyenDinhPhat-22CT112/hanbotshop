@echo off
setlocal
set ROOT=%~dp0

start "Hanbotorder API" cmd /k ""%ROOT%scripts\dev-api.cmd""
start "Hanbotorder Web" cmd /k ""%ROOT%scripts\dev-web.cmd""
start "Hanbotorder Admin" cmd /k ""%ROOT%scripts\dev-admin.cmd""

echo Hanbotorder dev servers are starting.
echo.
echo Web shop: http://127.0.0.1:3000
echo Admin:    http://127.0.0.1:3002
echo API:      http://127.0.0.1:3001/api/v1/health
echo.
pause
