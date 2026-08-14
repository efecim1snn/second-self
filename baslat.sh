#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "[HATA] Node.js bulunamadi. https://nodejs.org adresinden Node.js 18+ kurun."
  exit 1
fi

echo ""
echo "================================================"
echo "  AI INFLUENCER OTOMASYON"
echo "================================================"
echo ""
echo "  Panel: http://localhost:${PORT:-4200}"
echo "  Kapatmak icin Ctrl+C."
echo ""

if command -v open >/dev/null 2>&1; then
  (sleep 1 && open "http://localhost:${PORT:-4200}") &
elif command -v xdg-open >/dev/null 2>&1; then
  (sleep 1 && xdg-open "http://localhost:${PORT:-4200}") &
fi

node server.js
