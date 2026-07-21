# Benaiah International School — Parent Payment Portal

Parents log in, add their children (JSS1–SS3), pick what they're paying for
(fees, books, levy — managed by you in the Admin panel), pay through Paystack,
and get an automatically generated receipt they can download as a PDF.
Everything — students, categories, payments, receipts — is stored in a real
database (Supabase/Postgres), which is the reliable equivalent of "a folder of
records" that won't get lost or corrupted.

This doc is written so you can deploy it **without writing any code** — just
following steps and pasting keys in. Budget about 30–45 minutes the first time.

---

## What you'll need accounts for (all free to start)

1. **Supabase** — supabase.com — the database + login system
2. **Paystack** — paystack.com — you said you already have API keys ✅
3. **Netlify** — netlify.com — hosts the website
4. **GitHub** (recommended) — github.com — so Netlify can deploy straight from your code

---

## Step 1 — Set up the database (Supabase)

1. Go to supabase.com → New project. Name it `benaiah-school`, set a database
   password (save it somewhere), pick a region close to Nigeria.
2. Once it's created, click **SQL Editor** in the left sidebar → **New query**.
3. Open `supabase/schema.sql` from this project, copy the whole file, paste it
   in, and click **Run**. This creates every table, security rule, and three
   starter payment categories (School Fees, Books & Materials, Development Levy)
   you can edit later from the Admin panel.
4. Go to **Project Settings → API**. You'll need three values from this page
   in Step 3:
   - `Project URL`
   - `anon public` key
   - `service_role` key (click "reveal" — keep this one secret, never put it
     in frontend code)

---

## Step 2 — Push this code to GitHub

If you don't already have a GitHub account, make one, then:

```bash
cd benaiah-school
git init
git add .
git commit -m "Benaiah International School parent payment portal"
```

Create a new empty repository on GitHub, then follow the "push an existing
repository" instructions it shows you.

---

## Step 3 — Deploy to Netlify

1. Go to app.netlify.com → **Add new site → Import an existing project** →
   connect GitHub → pick your repository.
2. Build settings should auto-detect from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Before the first deploy, click **Add environment variables** and add:

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon public key |
   | `SUPABASE_URL` | same Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service_role key |
   | `PAYSTACK_SECRET_KEY` | your Paystack **test** secret key (starts `sk_test_`) |

4. Click **Deploy site**. Netlify gives you a URL like
   `https://benaiah-school.netlify.app`.

---

## Step 4 — Connect Paystack's webhook (the "automatic" part)

This is what makes payment confirmation automatic instead of relying on the
parent staying on the page until it redirects back.

1. In your Paystack dashboard: **Settings → API Keys & Webhooks**.
2. Set the webhook URL to:
   `https://YOUR-SITE-NAME.netlify.app/.netlify/functions/paystack-webhook`
3. Save. Paystack will now ping this URL itself the instant a payment clears.

*(The site also verifies payment immediately when the parent is redirected
back after paying, so confirmation is normally instant either way — the
webhook is the safety net for cases like a parent closing the browser tab
mid-payment.)*

---

## Step 5 — Make yourself an admin

1. Visit your live site, click **Create parent account**, sign up as normal
   (use your own email).
2. In Supabase: **Authentication → Users**, find your account, copy the
   **User UID**.
3. Back in **SQL Editor**, run (replacing the placeholder):
   ```sql
   update profiles set role = 'admin' where id = 'PASTE-YOUR-USER-UID-HERE';
   ```
4. Log out and back in on the site — you'll now land on `/admin` instead of
   the parent dashboard, where you can add/edit fee categories and see every
   payment across the school.

Repeat this for anyone else (bursar, proprietor, etc.) who needs admin access.

---

## Step 6 — Test it end-to-end (Paystack test mode)

With `PAYSTACK_SECRET_KEY` set to a `sk_test_` key, no real money moves.
Register a parent account, add a test child, go to pay, and use one of
Paystack's test cards, e.g.:

- Card number: `4084 0840 8408 4081`
- Expiry: any future date · CVV: `408` · PIN: `0000` · OTP: `123456`

You should land on a success page with a downloadable PDF receipt, and see
the transaction appear instantly in both your Admin panel and your Paystack
dashboard (Test mode).

**When you're ready to accept real fees:** swap `PAYSTACK_SECRET_KEY` in
Netlify for your **live** secret key (`sk_live_...`), and update the webhook
URL setting in Paystack's **live mode** dashboard too (test and live mode
have separate webhook settings). Paystack will also require your school's
settlement bank account details before it pays out real collections to you.

---

## Running it on your laptop before deploying (optional)

```bash
npm install
cp .env.example .env   # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

The payment/receipt functions (`netlify/functions/*`) only run on Netlify (or
via `netlify dev` if you install the Netlify CLI) since they need the service
role and Paystack secret keys — a plain `npm run dev` is fine for building and
checking the look of pages, but "Pay Now" won't work until it's deployed.

---

## What's in here

```
src/pages/          Landing, Login, Register, ParentDashboard, PaymentPage,
                     PaymentCallback, AdminDashboard
src/lib/             Supabase client, auth context, PDF receipt generator
netlify/functions/   initialize-payment · verify-payment · paystack-webhook
supabase/schema.sql  Every table + security rule + starter fee categories
```

**Classes supported:** JSS1, JSS2, JSS3, SS1, SS2, SS3 (edit the `CLASSES`
array in `src/lib/helpers.js` and the matching `check` constraint in
`schema.sql` if you later add JSS/SS arms, Primary, or Nursery classes).

**Data stored per payment:** student name & class, parent name & phone,
which categories were paid for and their amounts, the Paystack reference,
timestamp, and status — all queryable and exportable to CSV from the Admin
panel (Payments tab → Export CSV).

---

## For the pitch

A few honest talking points that tend to land well with a school board:

- **No cash handling risk** — money goes straight into the school's Paystack
  settlement account, never through a staff member's hands.
- **Instant, tamper-proof receipts** — generated the second Paystack confirms
  payment, not hand-written and not editable after the fact.
- **One place to see everything** — the Admin panel replaces a paper ledger:
  filter by class, by status, export to Excel/CSV for the accountant.
- **Costs nothing to run at this scale** — Supabase, Netlify, and Paystack are
  all free until the school is processing serious volume, at which point the
  fees are small relative to a bursary office's paper and time costs.
