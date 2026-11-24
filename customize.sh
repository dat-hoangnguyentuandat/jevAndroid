#!/system/bin/sh
SKIPUNZIP=0
INSTALL_DIR=/data/adb/jevandroid

ui_print ""
ui_print "========================================"
ui_print " JevAndroid v0.1.0-dev"
ui_print " Indexed Android UI Agent"
ui_print "========================================"

ARCH=$(uname -m)
[ "$ARCH" = "aarch64" ] || abort "JevAndroid v0.1 currently supports aarch64 only (got $ARCH)"

mkdir -p "$INSTALL_DIR" "$INSTALL_DIR/config" "$INSTALL_DIR/logs" "$INSTALL_DIR/tmp"
cp -af "$MODPATH/jevandroid/." "$INSTALL_DIR/"
chmod -R 0755 "$INSTALL_DIR"
chmod 0700 "$INSTALL_DIR/config" 2>/dev/null || true

if [ ! -f "$INSTALL_DIR/config/config.json" ]; then
  cp "$INSTALL_DIR/config/config.example.json" "$INSTALL_DIR/config/config.json"
fi

set_perm_recursive "$MODPATH" 0 0 0755 0644
set_perm "$MODPATH/service.sh" 0 0 0755
set_perm "$MODPATH/action.sh" 0 0 0755
set_perm "$MODPATH/uninstall.sh" 0 0 0755
set_perm "$MODPATH/system/bin/jevandroid" 0 0 0755

ui_print ""
ui_print "Installed core to: $INSTALL_DIR"
ui_print ""
ui_print "Runtime resolution order:"
ui_print "  1. /data/adb/jevandroid/node/bin/node"
ui_print "  2. GlibClaw Node runtime (/data/adb/openclaw/node/bin/node)"
ui_print "  3. Termux node"
ui_print "  4. node in PATH"
ui_print ""
ui_print "Configure:"
ui_print "  su -c jevandroid configure"
ui_print "Test snapshot:"
ui_print "  su -c jevandroid snapshot"
ui_print "Run task:"
ui_print "  su -c jevandroid run 'Open Settings and open Wi-Fi'"
