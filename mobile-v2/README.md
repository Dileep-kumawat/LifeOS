# LifeOS Mobile v2 (Capacitor Android)

> **Side-by-Side Mobile Candidate**: A native Android shell built with Capacitor 7 wrapping the LifeOS web application in a full-bleed, high-performance WebView with native status bar, splash screen, hardware back button navigation, Chrome Custom Tabs Google OAuth interception (`lifeos://oauth`), and FCM push notifications.

---

## 1. Prerequisites

- **Node.js**: 22 LTS
- **JDK**: Java 17 (`JAVA_HOME` pointing to JDK 17)
- **Android SDK & Platform Tools**: `adb` available in your system `PATH`
- **Device / Emulator**: An Android phone connected via USB with **USB Debugging enabled**, or an active Android Emulator via Android Studio.

Verify your connected Android device:
```bash
adb devices
```

---

## 2. Environment Variables

Create or edit `mobile-v2/.env` (a template is available at [`.env.example`](./.env.example)):

```env
# 1. Target Website URL to load in the native WebView:
# Points to deployed Vercel web app
CAPACITOR_WEB_URL=https://life-os-web-puce.vercel.app

# 2. Developer & Debug Mode:
# Enables Chrome remote webContents debugging (chrome://inspect)
CAPACITOR_DEV=true

# 3. Local Vite dev server fallback (used if CAPACITOR_WEB_URL is omitted):
# Android emulator loopback alias to host machine localhost:5173
CAPACITOR_DEV_URL=http://10.0.2.2:5173

# 4. Backend REST API URL (used for FCM device token registration):
VITE_API_URL=https://lifeos-api-hqcz.onrender.com/api/v1
```

---

## 3. How to Run the App

### Option A: Run Directly on Device / Emulator (Capacitor CLI)

This command automatically syncs your `.env` configuration, builds the Android project, and deploys/launches it on your connected device:

```bash
cd mobile-v2
npm run cap:run
```

*Or from the repository root:*
```bash
npm run --workspace=mobile-v2 cap:run
```

---

### Option B: Install the Compiled APK via ADB

If the debug APK has already been compiled:

```bash
# 1. Install to connected device or emulator
adb install -r "mobile-v2/android/app/build/outputs/apk/debug/app-debug.apk"

# 2. Launch the app directly
adb shell am start -n com.lifeos.v2/.MainActivity
```

---

### Option C: Run and Debug in Android Studio

If you want to view Logcat, inspect native memory/CPU, or manage emulators:

```bash
cd mobile-v2
npm run cap:open
```

Once Android Studio opens:
1. Wait for Gradle sync to complete.
2. Select your connected device or emulator in the top toolbar.
3. Click the green **Run (▶)** button.

---

## 4. Building the Project

When updating `.env` variables or web shell scripts:

```bash
cd mobile-v2

# 1. Sync config & web assets into native Android project:
npm run cap:sync

# 2. Build web bundle + sync + assemble APK:
npm run cap:build
```

The output APK will be generated at:
```
mobile-v2/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Development & Debugging Tools

### Inspecting the WebView via Chrome DevTools
With `CAPACITOR_DEV=true`:
1. Connect your device via USB and open the LifeOS v2 app.
2. Open Google Chrome on your PC and navigate to:
   ```
   chrome://inspect/#devices
   ```
3. Locate **com.lifeos.v2** and click **inspect** to view Console logs, Network requests, DOM tree, and Application storage in real time.

### Testing OAuth Deep Links
Google OAuth redirects to `lifeos://oauth`. You can test deep link resolution via ADB:

```bash
adb shell am start -W -a android.intent.action.VIEW -d "lifeos://oauth" com.lifeos.v2
```
