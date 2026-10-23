#!/bin/sh
# Renders fixtures/maquette-ds.html (the reference) and dist/exemple.html with headless Chrome into
# dist/captures/, then builds side by side sheets (reference left, engine right) and a print check.
set -e
cd "$(dirname "$0")/.."
mkdir -p dist/captures
scripts/shoot.sh "$PWD/fixtures/maquette-ds.html" "$PWD/dist/captures/ref-maquette.png"
scripts/shoot.sh "$PWD/dist/exemple.html" "$PWD/dist/captures/exemple.png"
python3 scripts/compare-captures.py
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$C" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$PWD/dist/captures/exemple.pdf" "file://$PWD/dist/exemple.html" 2>&1 | grep -v TASK_ || true
python3 - <<'PY'
import re
d = open('dist/captures/exemple.pdf', 'rb').read()
print('print: %d A4 pages' % len(re.findall(rb'/Type\s*/Page[^s]', d)))
PY
