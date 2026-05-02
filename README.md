# HairIntel AI — VS Code Ready

This bundle has been reorganized into a clean project structure for VS Code and local preview.

## What was fixed
- Widened the app shell for desktop/tablet instead of a narrow phone frame.
- Switched the visual system to a softer, more professional luxury palette.
- Fixed the viewport tag for better desktop/mobile behavior.
- Assembled all loose JS screen files into `/js/screens`.
- Added deploy scaffolding for Supabase auth and Stripe checkout/webhooks.
- Patched subscription selection so Pro/Studio can launch Stripe checkout when configured.

## Project structure
- `index.html`
- `css/style.css`
- `js/app.js`
- `js/engine.js`
- `js/utils.js`
- `js/auth.js`
- `js/env.js`
- `js/env.example.js`
- `js/screens/*`
- `api/create-checkout-session.js`
- `api/stripe-webhook.js`

## Run locally
Open this folder in VS Code and launch `index.html` with Live Server.

## Important
The original source was a client-side app using `localStorage` and demo data. Auth and live subscriptions are now scaffolded, but still need real Supabase and Stripe keys to be active.

## 🔑 Subscription Tiers

| Plan | Consultations | AI Preview | PDF Export | Client Sharing | Price |
|------|--------------|------------|-----------|----------------|-------|
| Free | 3 total | ✗ | ✗ (watermark) | ✗ | $0 |
| Pro | Unlimited | 10 AI previews / month | ✓ | ✓ | $29/mo |
| Studio | Unlimited (5 users) | 50 AI previews / month | ✓ Branded | ✓ | $79/mo |

### AI Preview Notes
- AI preview is a paid feature.
- Each preview generation uses 1 monthly AI preview credit.
- Free plan does not include AI preview.
- Pro includes 10 AI previews per month.
- Studio includes 50 AI previews per month.