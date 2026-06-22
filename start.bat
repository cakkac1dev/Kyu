@echo off
chcp 65001 >nul
title AniXart Desktop
cd /d "%~dp0"

if not exist "node_modules\electron\dist\electron.exe" (
  echo [AniXart] Electron not found, installing dependencies...
  call npm.cmd install
  if not exist "node_modules\electron\dist\electron.exe" (
    echo [AniXart] Electron binary missing. Running install script...
    call node node_modules\electron\install.js
  )
)

echo [AniXart] Starting...
start "" "node_modules\electron\dist\electron.exe" .
exit
