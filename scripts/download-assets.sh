#!/usr/bin/env bash
#
# Download all game icons referenced by the local catalogs into public/assets/<cat>/,
# so the client serves them same-origin instead of hitting the CDN on every render.
#
# Usage:   bash scripts/download-assets.sh
#
# - Idempotent & resumable: files already present are skipped, so re-running after a
#   season/catalog update fetches only the new codes.
# - Parallel (16 at a time) and verifies each download is a real PNG; any code with
#   no art on the CDN is dropped rather than left as a broken/empty file.
# - Catalog-driven (reads public/data/*.json) for items/monsters/resources/npcs/
#   effects/badges; character skins come from a fixed list (no catalog source).
#
# Image source & URL patterns: https://docs.artifactsmmo.com/resources/images/
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT" || exit 1

CDN="https://artifactsmmo.com/images"

# Catalogs that expose a `code` per entry → one icon each.
CATALOGS="items monsters resources npcs effects badges"

# Character avatars are referenced by skin, which isn't in the catalog data.
CHARACTER_SKINS="men1 men2 men3 women1 women2 women3"

dl_one() {
  local cat="$1" code="$2"
  local out="public/assets/$cat/$code.png"
  [ -s "$out" ] && return 0 # already have it
  if curl -sf --max-time 30 -o "$out" "$CDN/$cat/$code.png"; then
    if [ "$(head -c4 "$out" 2>/dev/null | od -An -tx1 | tr -d ' \n')" = "89504e47" ]; then
      return 0
    fi
  fi
  rm -f "$out" # 404 / non-PNG → don't leave a broken file behind
  return 1
}
export -f dl_one
export CDN

for cat in $CATALOGS; do
  mkdir -p "public/assets/$cat"
  node -e 'const a=require("./public/data/'"$cat"'.json");for(const x of a)if(x&&x.code)console.log(x.code);' |
    xargs -P 16 -I{} bash -c 'dl_one "$0" "$1"' "$cat" {}
  have=$(find "public/assets/$cat" -type f -name '*.png' | wc -l | tr -d ' ')
  total=$(node -e 'const a=require("./public/data/'"$cat"'.json");console.log(a.length);')
  echo "$cat: $have / $total present"
done

mkdir -p public/assets/characters
for skin in $CHARACTER_SKINS; do dl_one characters "$skin"; done
have=$(find public/assets/characters -type f -name '*.png' | wc -l | tr -d ' ')
echo "characters: $have present"
