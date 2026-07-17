#!/usr/bin/env bash
# Expose the local FastAPI backend (port 8000) on a public HTTPS URL so Twilio /
# Meta / Razorpay webhooks can reach it during a demo.
#
# Prereqs:
#   1. Install ngrok:            brew install ngrok/ngrok/ngrok
#   2. Add your authtoken once:  ngrok config add-authtoken <YOUR_TOKEN>
#
# Usage:  ./scripts/ngrok.sh [port]     (default port 8000)
#
# Then set your webhook URLs to:
#   Twilio  WhatsApp Sandbox  ->  https://<subdomain>.ngrok-free.app/webhook/whatsapp
#   Razorpay webhook          ->  https://<subdomain>.ngrok-free.app/payments/webhook
set -euo pipefail

PORT="${1:-8000}"

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok not found. Install with:  brew install ngrok/ngrok/ngrok" >&2
  exit 1
fi

echo "Starting ngrok tunnel to http://localhost:${PORT} ..."
echo "Public webhook path will be:  <ngrok-url>/webhook/whatsapp"
exec ngrok http "${PORT}"
