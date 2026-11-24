#!/system/bin/sh
# JevAndroid does not auto-run tasks at boot in v0.1.
# We only prepare directories and record boot readiness.
INSTALL_DIR=/data/adb/jevandroid
mkdir -p "$INSTALL_DIR/logs" "$INSTALL_DIR/tmp"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] JevAndroid boot service ready" >> "$INSTALL_DIR/logs/service.log"
