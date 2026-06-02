# HairIntel AI — Play Store Readiness

This repository now supports the existing web app and an Android Play Store wrapper path.

## Current structure

- Web app entry: `index.html`
- Local/server entry: `server.js`
- Privacy page: `privacy.html`
- Terms page: `terms.html`
- Android wrapper config: `capacitor.config.json`
- Recommended Android application ID: `com.hairintel.ai`

## Web app behavior

The web app can continue running through Vercel/Node and can continue using Stripe for subscriptions on the web.

Useful commands:

```bash
npm install
npm run dev
npm start
```

## Android Play Store behavior

The Android app should be built using Capacitor and uploaded to Google Play as an Android App Bundle (`.aab`).

First-time Android setup:

```bash
npm install
npm run android:add
npm run android:sync
npm run android:open
```

Build release bundle after Android signing is configured:

```bash
npm run android:build:aab
```

Expected release bundle path after a successful Gradle build:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## Important billing warning

The web version may use Stripe.

The Google Play Android version should not route paid digital feature purchases through Stripe inside the app. For Play Store compliance, Android in-app subscriptions should use Google Play Billing unless a permitted alternative billing program applies.

Recommended Google Play subscription product IDs:

- `hairintel_starter_monthly`
- `hairintel_pro_monthly`
- `hairintel_studio_monthly`

## Required Play Store assets

Prepare these before submission:

- 512 x 512 app icon PNG
- 1024 x 500 feature graphic PNG
- At least 2 phone screenshots, preferably 6–8
- Privacy Policy URL
- Data deletion/account deletion request URL or clear deletion instructions
- Support email
- Reviewer login/test account if login blocks app review

## Play Store policy notes

HairIntel AI should be positioned as a beauty consultation and extension-planning support tool, not a medical or dermatology diagnostic tool.

Use wording like:

> HairIntel AI is a consultation and planning support tool for professional hairstylists. It does not diagnose, treat, cure, or prevent medical conditions and does not replace professional judgment or medical advice.

Avoid wording like:

- diagnoses hair/scalp conditions
- medical-grade hair analysis
- guaranteed safe install
- prevents hair damage
- detects disease

## Next technical step

Run this locally after pulling the repository:

```bash
npm install
npm run android:add
npm run android:sync
```

Then open Android Studio:

```bash
npm run android:open
```

Android Studio will generate and manage the native Android project folder.
