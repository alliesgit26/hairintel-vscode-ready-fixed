# HairIntel AI — Google Play Release Readiness

Updated: August 18, 2026

HairIntel uses two billing paths by platform:

- Website: Stripe may be used for website subscriptions.
- Android app distributed through Google Play: Google Play Billing is used for digital subscriptions. Android purchase buttons must not route customers to Stripe.

## Package and Android build

- Application ID / package: `com.hairintel.ai`
- Capacitor app name: `HairIntel AI`
- Target SDK: 36
- Compile SDK: 36
- Google Play Billing Library: 9.1.0
- Android App Bundle output: `android/app/build/outputs/bundle/release/app-release.aab`
- Native Android project is committed under `android/` and must NOT be deleted/regenerated during CI.

The GitHub Actions workflow `.github/workflows/build-android.yml` preserves the native project, installs Android 16 SDK, syncs Capacitor, builds the release AAB, uses a monotonically increasing CI version code, and can sign the bundle from protected GitHub Secrets.

## Google Play subscription catalog

Create these subscription products in Play Console exactly as written:

| Plan | Product ID | Intended US monthly price |
| --- | --- | --- |
| Starter | `hairintel_starter_monthly` | $29.00/month |
| Pro | `hairintel_pro_monthly` | $49.00/month |
| Studio | `hairintel_studio_monthly` | $79.00/month |

For each product:

1. Create an auto-renewing monthly base plan and activate it.
2. Set the US price shown above and review Google-generated/localized regional pricing.
3. If HairIntel continues advertising a 7-day trial, create an eligible free-trial offer with a 7-day zero-price phase and activate it.
4. Do not hard-code the Android display price in the UI. HairIntel queries Google Play and displays the localized price returned by Play Billing.

## Android purchase flow already implemented

The Android app uses the native Capacitor `PlayBilling` plugin.

1. The signed-in user selects Starter, Pro, or Studio.
2. HairIntel launches the Google Play purchase sheet.
3. The Play purchase is associated with an obfuscated HairIntel/Supabase account ID.
4. HairIntel sends the purchase token to `/api/google-play-verify` with the signed-in Supabase access token.
5. The Vercel API verifies the purchase with the Google Play Developer API and confirms that it belongs to the signed-in HairIntel account.
6. The server updates the HairIntel subscription entitlement in Supabase.
7. The server acknowledges eligible purchases.
8. Restore Purchase rechecks owned Play subscriptions and re-verifies them server-side.
9. Manage Subscription opens Google Play subscription management for Play-billed accounts.

## Google Play Developer API / Vercel configuration

Create a Google Cloud service account for the Play Developer API and grant it the permissions required to read/verify subscription purchases for the HairIntel app. Configure Vercel with either the single JSON variable or the split credentials below.

Preferred:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` = full service-account JSON

Alternative:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY`

Also set:

- `GOOGLE_PLAY_PACKAGE_NAME=com.hairintel.ai`
- `GOOGLE_PLAY_RTDN_TOKEN=<strong random secret>`

Never commit the service-account private key to this public repository.

## Real-time subscription updates (RTDN)

HairIntel includes `/api/google-play-rtdn` for Google Play Real-time Developer Notifications.

Configure Google Play / Google Cloud Pub/Sub so subscription lifecycle notifications are pushed to:

`https://hairintel-ai.vercel.app/api/google-play-rtdn?token=<GOOGLE_PLAY_RTDN_TOKEN>`

The endpoint re-verifies the complete subscription state with Google before changing HairIntel access. It handles renewals, cancellations, grace-period changes, holds, expirations, and other subscription-state changes by updating the HairIntel entitlement record.

## AAB upload-key signing

Google Play release bundles must be signed with the HairIntel upload key. The repository expects these GitHub Actions Secrets:

- `HAIRINTEL_UPLOAD_KEYSTORE_BASE64`
- `HAIRINTEL_UPLOAD_STORE_PASSWORD`
- `HAIRINTEL_UPLOAD_KEY_ALIAS`
- `HAIRINTEL_UPLOAD_KEY_PASSWORD`

The workflow decodes the keystore only on the private GitHub Actions runner, signs the AAB, verifies the signature, removes the keystore from the runner, and uploads the AAB artifact. Do not commit the `.jks` file or passwords.

Enroll the app in Google Play App Signing when creating the first Play release. Keep a secure offline backup of the HairIntel upload key and its passwords.

## Account deletion / privacy

Because HairIntel supports account creation, it now includes both required deletion entry points:

- In-app: signed-in Account modal → Delete Account
- Public web page: `https://hairintel-ai.vercel.app/delete-account.html`

The deletion flow requires verified HairIntel authentication before deleting the Supabase authentication account and the current server-side HairIntel profile/subscription records. Local HairIntel data is cleared from that app/browser instance after successful deletion.

Google Play subscription cancellation remains separate from HairIntel account deletion. Play subscribers are directed to Google Play subscription management to stop future renewal. Connected Stripe website subscriptions are cancelled by HairIntel during account deletion when the subscription can be identified.

Privacy policy:

`https://hairintel-ai.vercel.app/privacy.html`

Terms & Billing:

`https://hairintel-ai.vercel.app/terms.html`

Account deletion:

`https://hairintel-ai.vercel.app/delete-account.html`

## Play Console setup still required outside the repository

These actions require the HairIntel Play Console / Google Cloud account and cannot be completed by source-code changes alone:

1. Create or finish the Google Play Console app for package `com.hairintel.ai`.
2. Complete the Google Play developer/merchant payments profile and payout setup.
3. Create and activate all three subscription products/base plans and the optional 7-day trial offers.
4. Enable the Google Play Developer API and authorize the service account.
5. Configure Pub/Sub / Real-time Developer Notifications and the Vercel RTDN secret.
6. Add the four upload-key values as GitHub Actions Secrets.
7. Build/download a signed AAB from GitHub Actions and upload it to Play Console Internal testing.
8. Add internal testers/license testers and install HairIntel through Google Play for billing tests.
9. Test Starter, Pro, Studio, free-trial eligibility, cancellation, restore purchase, renewal/expiration state, and account deletion on an actual Play-installed Android build.
10. Complete App content, Data safety, content rating, target audience, ads declaration, and any required permissions declarations accurately.
11. Set the public account-deletion URL shown above.
12. Complete the Store listing and upload final graphics/screenshots.

## Store listing assets still required

- 512 × 512 app icon PNG
- 1024 × 500 feature graphic PNG
- Phone screenshots showing the real public landing page, sign-in/private dashboard, consultation workflow, Pro features, and AI preview where functional
- Short description and full description
- Support email

Do not use fake reviews, fake client data presented as real, fabricated performance claims, or medical/diagnostic claims in the listing.

## Product positioning

Use HairIntel as a beauty consultation and extension-planning support tool for professional stylists. It should not be marketed as a medical or dermatology diagnostic service.

Recommended disclaimer:

> HairIntel AI is a consultation and planning support tool for professional hairstylists. It does not diagnose, treat, cure, or prevent medical conditions and does not replace professional judgment or medical advice.

Avoid claims such as “diagnoses scalp conditions,” “medical-grade analysis,” “guaranteed safe install,” “prevents hair damage,” or “detects disease.”

## Release gate

Do not call HairIntel production-ready for Google Play until all of the following are true:

- Native Android GitHub Actions build succeeds with the current Play Billing code.
- AAB is signed with the upload key and accepted by Play Console.
- All three Play subscription products return their live/test localized prices.
- A license tester completes a real Google Play test purchase.
- Server verification grants the correct HairIntel plan.
- Restore Purchase works.
- Subscription cancellation/expiration is reflected in HairIntel.
- Account deletion works from both in-app and the external deletion route.
- Play pre-launch report and policy/app-content checks are reviewed.
