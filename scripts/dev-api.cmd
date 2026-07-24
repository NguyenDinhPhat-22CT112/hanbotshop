@echo off
setlocal
set ROOT=%~dp0..
cd /d "%ROOT%"
set COREPACK_HOME=%ROOT%\.corepack
set TEMP=%ROOT%\.tmp
set TMP=%ROOT%\.tmp
set USERPROFILE=%ROOT%\.pnpm-home
set HOME=%ROOT%\.pnpm-home
if not exist "%ROOT%\.tmp" mkdir "%ROOT%\.tmp"
cd /d "%ROOT%"
call corepack pnpm --filter @hanbotorder/api start:dev
