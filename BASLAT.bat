@echo off
chcp 65001 >nul
title AI Influencer Otomasyon
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [HATA] Node.js bulunamadi.
  echo  https://nodejs.org adresinden Node.js 18 veya ustunu kurun, sonra bu dosyayi tekrar calistirin.
  echo.
  pause
  exit /b 1
)

echo.
echo  ================================================
echo   AI INFLUENCER OTOMASYON
echo  ================================================
echo.
echo  Panel aciliyor: http://localhost:4200
echo  Kapatmak icin bu pencerede Ctrl+C yapin.
echo.

start "" http://localhost:4200
node server.js
pause
