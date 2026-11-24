#!/system/bin/sh
# Magisk/KernelSU Action button: print status and open config help in terminal log.
BIN=/system/bin/jevandroid
[ -x "$BIN" ] || BIN=/data/adb/modules/jevandroid/system/bin/jevandroid

echo "========================================"
echo " JevAndroid v0.1"
echo "========================================"
"$BIN" doctor
