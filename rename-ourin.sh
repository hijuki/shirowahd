#!/usr/bin/env bash
# rename ourin -> hillz di repo shirowahd. Idempotent-ish; jalankan dari root repo.
set -e
cd "$(dirname "$0")"

echo "== 1. rename files =="
# src/lib/ourin-*.js
for f in src/lib/ourin-*.js; do
  [ -e "$f" ] || continue
  git mv "$f" "${f/ourin-/hillz-}" 2>/dev/null || mv "$f" "${f/ourin-/hillz-}"
done
# case/ourin.js
if [ -e case/ourin.js ]; then git mv case/ourin.js case/hillz.js 2>/dev/null || mv case/ourin.js case/hillz.js; fi
# plugins/ai/ourin-ai.js
if [ -e plugins/ai/ourin-ai.js ]; then git mv plugins/ai/ourin-ai.js plugins/ai/hillz-ai.js 2>/dev/null || mv plugins/ai/ourin-ai.js plugins/ai/hillz-ai.js; fi
# plugins/owner/ganti-ourin*.js
for f in plugins/owner/ganti-ourin*.js; do
  [ -e "$f" ] || continue
  git mv "$f" "${f/ganti-ourin/ganti-hillz}" 2>/dev/null || mv "$f" "${f/ganti-ourin/ganti-hillz}"
done

echo "== 2. rewrite imports/refs =="
# semua .js tracked kecuali node_modules/web/package-lock
FILES=$(grep -rl 'ourin' --include='*.js' . 2>/dev/null | grep -v node_modules | grep -v 'web/' | grep -v package-lock || true)
for f in $FILES; do
  sed -i \
    -e 's#lib/ourin-#lib/hillz-#g' \
    -e 's#case/ourin\.js#case/hillz.js#g' \
    -e 's#from "ourin"#from "hillz"#g' \
    -e "s#from 'ourin'#from 'hillz'#g" \
    -e 's#import("ourin")#import("hillz")#g' \
    -e "s#import('ourin')#import('hillz')#g" \
    -e 's#\bourinApi\b#hillzApi#g' \
    "$f"
done

echo "== 3. package.json alias =="
sed -i 's#"ourin": "npm:ourin-baileys#"hillz": "npm:ourin-baileys#' package.json

echo "== 4. leftover check (harus cuma baileys/apikey/mourinho) =="
grep -rn -i 'ourin' --include='*.js' . 2>/dev/null | grep -v node_modules | grep -v 'web/' \
  | grep -v -i 'ourin-baileys\|Milik-Bot-OurinMD\|apikey=OurinNextGen\|mourinho' | head -20 || true
echo "== done =="
