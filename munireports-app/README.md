# MuniReports

AI-powered municipal bond credit reports. Free to use, paid to save.

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Auth & Database**: Supabase (PostgreSQL + Auth + Storage)
- **Payments**: Stripe (subscriptions)
- **AI**: Anthropic Claude API (web search + report generation)
- **Hosting**: Vercel

## Setup Instructions

### 1. Run the Database Schema

Go to your Supabase dashboard → **SQL Editor** → **New Query**

Paste the contents of `supabase-schema.sql` and click **Run**.

This creates the `profiles` and `reports` tables with row-level security.

### 2. Configure Supabase Auth

In your Supabase dashboard → **Authentication** → **URL Configuration**:
- Set **Site URL** to your Vercel URL (e.g., `https://munireports.vercel.app`)
- Add **Redirect URLs**: `https://munireports.vercel.app/auth/callback`

### 3. Set Environment Variables in Vercel

Go to your Vercel project → **Settings** → **Environment Variables**

Add these:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `STRIPE_SECRET_KEY` | `sk_test_...` from Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` from Stripe |
| `STRIPE_PRICE_ID` | `price_...` from Stripe |
| `ANTHROPIC_API_KEY` | `sk-ant-...` from Anthropic |
| `NEXT_PUBLIC_SITE_URL` | Your deployed URL |

### 4. Set up Stripe Webhook (for subscription tracking)

In Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**:
- URL: `https://your-domain.com/api/webhook`
- Events: `checkout.session.completed`, `customer.subscription.deleted`
- Copy the webhook signing secret and add it as `STRIPE_WEBHOOK_SECRET` in Vercel

### 5. Deploy

Push to GitHub and Vercel will auto-deploy:

```bash
git add .
git commit -m "initial app"
git push
```

## Project Structure

```
munireports/
├── app/
│   ├── layout.tsx          # Root layout with nav
│   ├── page.tsx            # Homepage / marketing
│   ├── globals.css         # Design system
│   ├── login/page.tsx      # Sign in
│   ├── signup/page.tsx     # Create account
│   ├── builder/page.tsx    # Report Builder (main product)
│   ├── dashboard/page.tsx  # Saved reports (logged-in)
│   ├── pricing/page.tsx    # Pricing page
│   ├── report/[id]/page.tsx # View saved report
│   ├── auth/callback/route.ts # Supabase auth callback
│   └── api/
│       ├── search-issuers/route.ts  # AI issuer search
│       ├── generate-report/route.ts # AI report generation
│       ├── create-checkout/route.ts # Stripe checkout
│       ├── webhook/route.ts         # Stripe webhook
│       └── auth/signout/route.ts    # Sign out
├── utils/supabase/
│   ├── server.ts           # Server-side Supabase client
│   └── client.ts           # Browser-side Supabase client
├── middleware.ts            # Auth session refresh + route protection
├── supabase-schema.sql     # Database schema (run in Supabase)
└── .env.local              # Local env vars (not committed)
```

## How It Works

1. **Free users**: Search issuers, upload docs, generate reports — all without an account. Reports are ephemeral (not saved).
2. **Logged-in free users**: Same as above, but reports are saved to their account.
3. **Pro users ($49/mo)**: Permanent report library, watchlists, shareable links, and priority support.
