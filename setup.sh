#!/bin/bash
# ============================================
# OURIN (SHIROWAHD) WA Bot - One-Click Setup
# Usage: cd /opt/ourin && bash setup.sh
# ============================================

set -e
cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   🚀 OURIN (SHIROWAHD) Setup v3.3       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ---- 1. Node.js 20+ ----
if command -v node &>/dev/null; then
    NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VER" -lt 20 ]; then
        echo "⚠️  Node.js $NODE_VER found but need 20+. Installing..."
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt install -y nodejs
    else
        echo "✅ Node.js $(node -v) OK"
    fi
else
    echo "📦 Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
fi

# ---- 2. ffmpeg ----
if command -v ffmpeg &>/dev/null; then
    echo "✅ ffmpeg OK"
else
    echo "📦 Installing ffmpeg..."
    apt update -y && apt install -y ffmpeg
fi

# ---- 3. python3 (for ngrok-sync) ----
if command -v python3 &>/dev/null; then
    echo "✅ python3 OK"
else
    echo "📦 Installing python3..."
    apt install -y python3
fi

# ---- 4. Create required dirs ----
echo "📁 Creating directories..."
mkdir -p temp tmp vids storage/session database/ai_chat database/autoreply_media database/cpanel database/main

# ---- 5. npm install ----
echo "📦 Running npm install (this may take a few minutes)..."
npm install --production 2>&1 | tail -5

# ---- 6. Patch Baileys (large file upload support) ----
echo "🔧 Patching Baileys for large file support..."

BAILEYS_SEND="$PROJECT_DIR/node_modules/@whiskeysockets/baileys/lib/Socket/messages-send.js"
BAILEYS_MEDIA="$PROJECT_DIR/node_modules/@whiskeysockets/baileys/lib/Utils/messages-media.js"

# Patch 1: maxContentLengthBytes → Infinity
if [ -f "$BAILEYS_SEND" ]; then
    if grep -q 'maxContentLengthBytes:' "$BAILEYS_SEND"; then
        sed -i 's/maxContentLengthBytes:[[:space:]]*[0-9]*/maxContentLengthBytes: Infinity/' "$BAILEYS_SEND"
        echo "   ✅ messages-send.js patched (maxContentLengthBytes → Infinity)"
    else
        echo "   ⚠️  maxContentLengthBytes not found in messages-send.js (may already be patched)"
    fi
else
    echo "   ❌ messages-send.js not found"
fi

# Patch 2: Disable maxContentLength check
if [ -f "$BAILEYS_MEDIA" ]; then
    if grep -q 'opts?.maxContentLength' "$BAILEYS_MEDIA" && ! grep -q 'if (false && opts?.maxContentLength' "$BAILEYS_MEDIA"; then
        sed -i 's/if (opts?.maxContentLength/if (false \&\& opts?.maxContentLength/' "$BAILEYS_MEDIA"
        echo "   ✅ messages-media.js patched (maxContentLength check disabled)"
    else
        echo "   ⚠️  messages-media.js already patched or pattern not found"
    fi
else
    echo "   ❌ messages-media.js not found"
fi

# ---- 7. pm2 ----
if command -v pm2 &>/dev/null; then
    echo "✅ pm2 OK"
else
    echo "📦 Installing pm2..."
    npm install -g pm2
fi

# ---- 8. Stop existing pm2 processes (if any) ----
echo "⚙️  Setting up PM2 processes..."
pm2 delete ourin 2>/dev/null || true
pm2 delete web-uploader 2>/dev/null || true
pm2 delete ngrok-tunnel 2>/dev/null || true
pm2 delete ngrok-sync 2>/dev/null || true
pm2 delete tg-pair 2>/dev/null || true

# ---- 9. Start PM2 processes ----
# Main bot
pm2 start index.js --name ourin --cwd "$PROJECT_DIR"

# Web uploader (video upload server, port 8080)
pm2 start web-uploader.js --name web-uploader --cwd "$PROJECT_DIR"

# Telegram pairing bot
pm2 start telegram-pair.cjs --name tg-pair --cwd "$PROJECT_DIR"

# Ngrok tunnel + sync (optional)
if command -v ngrok &>/dev/null; then
    pm2 start "ngrok http 8080" --name ngrok-tunnel --cwd "$PROJECT_DIR"
    sleep 3
    pm2 start ngrok-sync.sh --name ngrok-sync --cwd "$PROJECT_DIR" --interpreter bash
    echo "   🌐 Ngrok tunnel started"
else
    echo "   ⚠️  Ngrok not installed — skipping tunnel"
    echo "      Install: https://ngrok.com/download"
    echo "      Then: pm2 start 'ngrok http 8080' --name ngrok-tunnel"
    echo "            pm2 start ngrok-sync.sh --name ngrok-sync --interpreter bash"
fi

# ---- 10. pm2 save + startup ----
pm2 save
pm2 startup 2>/dev/null || true

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ✅ OURIN Setup Complete!               ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "📋 PM2 Services:"
echo "   ourin          — WA Bot (main)"
echo "   web-uploader   — Video Upload Server (:8080)"
echo "   tg-pair        — Telegram Pairing Bot"
echo "   ngrok-tunnel   — Ngrok HTTP tunnel"
echo "   ngrok-sync     — Ngrok URL → CF Worker sync"
echo ""
echo "📌 CONFIGURE BEFORE USE:"
echo "   1. Edit config.js:"
echo "      - session.pairingNumber → your WA number (628xxx)"
echo "      - owner.number → owner WA number"
echo "   2. Edit telegram-pair.cjs → set Telegram bot token"
echo "   3. Edit admin-settings.json → change adminPassword"
echo "   4. Edit deploy-worker.py → Cloudflare credentials (for ngrok sync)"
echo ""
echo "🔄 Then restart: pm2 restart all"
echo ""
echo "📱 PAIRING:"
echo "   Watch logs: pm2 logs ourin"
echo "   A pairing code will appear — enter it in WhatsApp > Linked Devices"
echo ""
pm2 list
