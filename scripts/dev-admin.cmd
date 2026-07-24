@echo off
setlocal
set ROOT=%~dp0..
cd /d "%ROOT%\apps\admin"
set COREPACK_HOME=%ROOT%\.corepack
set TEMP=%ROOT%\.tmp
set TMP=%ROOT%\.tmp
set USERPROFILE=%ROOT%\.pnpm-home
set HOME=%ROOT%\.pnpm-home
set NEXT_DIST_DIR=.next-dev
set NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api/v1
if not exist "%ROOT%\.tmp" mkdir "%ROOT%\.tmp"
cd /d "%ROOT%"
call corepack pnpm --filter @hanbotorder/admin dev
