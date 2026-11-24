#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/release/JevAndroid-v0.1.0-dev.zip"
rm -f "$OUT"
cd "$ROOT"
zip -qr "$OUT" module.prop customize.sh service.sh action.sh uninstall.sh system jevandroid \
  -x 'release/*' '*.DS_Store'
echo "$OUT"
