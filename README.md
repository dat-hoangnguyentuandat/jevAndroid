# JevAndroid v0.1.0-dev

A root-first Android UI agent inspired by Jev's **dynamic indexed action space** architecture.

## What v0.1 does

1. Reads the current Android UI with `uiautomator dump`.
2. Normalizes visible/interactable nodes into an indexed table.
3. Sends only structured UI state + goal to an OpenAI-compatible model.
4. Model chooses one constrained action (`CLICK`, `TYPE_TEXT`, `SCROLL_*`, `BACK`, `HOME`, `WAIT`, `DONE`, `BLOCKED`) and an observed target index.
5. Before execution, JevAndroid re-observes and rejects stale UI state.
6. Runtime resolves the selected index to bounds and executes with Android `input`.
7. `TYPE_TEXT` uses a second small text-generation call, mirroring Jev's separation of decision and text generation.

The model never receives permission to generate coordinates, selectors, JavaScript, or shell commands.

## Architecture

```text
Goal
  ↓
UIAutomator snapshot
  ↓
[1] button Settings
[2] textbox Search
[3] text Wi‑Fi
  ↓
Decision model
  ↓
{ action: "CLICK", target: 3 }
  ↓
Freshness guard
  ↓
Android executor (input tap/swipe/text)
  ↓
Observe again
```

## Current runtime strategy

v0.1 contains no large runtime binary. The wrapper resolves Node.js in this order:

1. `/data/adb/jevandroid/node/bin/node`
2. `/data/adb/openclaw/node/bin/node` (reuses GlibClaw runtime)
3. Termux Node.js
4. `node` from PATH

This keeps the first development build small while the Android-native standalone runtime packaging is prepared for v0.2.

## Install / test

Flash `release/JevAndroid-v0.1.0-dev.zip` with Magisk/KernelSU.

```sh
su -c jevandroid doctor
su -c jevandroid configure
su -c jevandroid snapshot
su -c jevandroid run 'Open Settings and open Wi-Fi'
```

Provider config is OpenAI-compatible, so an ElectronHub/custom gateway can be used by setting base URL, model and key.

## Safety boundary

v0.1 intentionally has **no arbitrary shell action** exposed to the model. Root is used by the trusted executor only. The decision policy can select only the supported bounded actions and observed UI targets.

## Known v0.1 limitations

- `uiautomator dump` cannot see some SurfaceView/canvas/custom-rendered UI.
- Android `input text` is unreliable for arbitrary Unicode/IME text; ASCII is the reliable path in v0.1.
- No screenshot/vision fallback yet.
- No direct Chrome CDP/WebView DOM backend yet.
- No native AccessibilityService companion APK yet.
- Standalone bundled Node/glibc runtime is not included in this dev package; it can reuse GlibClaw/Termux runtime.

## Next milestone

v0.2 should add a standalone aarch64 runtime and hybrid observations:

- Native UI: Accessibility/UIAutomator
- Chrome/WebView: DOM/CDP where available
- Screenshot/vision fallback only when structural UI data is insufficient
