# Deploy Notes

## Local in VS Code
1. Open this folder in VS Code.
2. Install the Live Server extension, or run `npx serve .`.
3. Open `index.html`.

## Supabase
Create a `profiles` table:

```sql
create table if not exists profiles (
  id uuid primary key,
  email text unique,
  first_name text,
  last_name text,
  plan text default 'free',
  created_at timestamptz default now()
);
```

Copy `js/env.example.js` to `js/env.js` and fill in your Supabase values.

## Stripe + Vercel
Set these environment variables in Vercel:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_PRO
- STRIPE_PRICE_STUDIO

Create a Stripe webhook pointing to `/api/stripe-webhook`.
