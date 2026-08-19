#!/bin/bash
LAST_URL=""
while true; do
  URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys,json;t=json.load(sys.stdin)['tunnels'];print([x['public_url'] for x in t if x['public_url'].startswith('https')][0])" 2>/dev/null)

  if [ -n "$URL" ] && [ "$URL" != "$LAST_URL" ]; then
    echo "[SYNC] New ngrok URL: $URL"
    python3 /opt/ourin/deploy-worker.py "$URL"
    echo "[SYNC] CF Worker updated as proxy to $URL"
    LAST_URL="$URL"
  fi
  sleep 30
done
