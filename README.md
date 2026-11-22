# Fizzy

Fizzy is our insurance broking app for **leads, clients, policies and renewals**. It runs in any web browser and on Android and iPhone, all from this one codebase.

Built for Kove's own broking team (about 5 users). Main lines: **Motor** and **Commercial**.

## What it does (version 1)

| Area | What you can do |
| --- | --- |
| **Home** | Today's follow-ups, renewals due in ±30 days, premium this month, renewal rate |
| **Leads** | Add leads, move them through stages (New → Contacted → Requirement → Quoted → Won / Lost), set follow-up dates, call or WhatsApp from the app, convert a won lead into a client and policy |
| **Clients** | Individuals and companies, group members under a parent client, all their policies on one page |
| **Policies** | Motor details (vehicle no., make, model, IDV, NCB, OD/TP premium) and Commercial details (occupancy, risk location, sum insured split); premium with auto 18% GST; brokerage % |
| **Renewals** | Policies expiring in 7 / 15 / 30 / 60 / 90 days or already expired; renewal stage, quote and lost reason; one tap **Renew now** creates next year's policy linked to the old one; export the list to Excel |
| **Documents** | Upload policy copies, KYC, RC and quotes (PDF or photo) to any lead, client or policy. Files are private. |
| **Excel import** | Bring in existing policies, clients or leads from a spreadsheet. Column names are matched automatically; a template is available to download. |
| **Team** | Admin sets each person's role (Admin, Manager, Sales, Operations, Accounts) or switches access off |

Every call, WhatsApp, note and stage change is kept on the record's activity timeline.

---

## Setup, step by step (no coding needed)

You need two free accounts: **Supabase** (the database and login) and **Vercel** (puts the website online). Both can be created with "Sign in with GitHub".

### 1. Create the database (Supabase), about 10 minutes

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign in with GitHub.
2. **New project**. Name: `fizzy`. Choose a strong database password and save it somewhere safe. Region: **South Asia (Mumbai)**. Click **Create**.
3. When it's ready, open **SQL Editor** (left menu) → **New query**.
4. Open the file [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in this repository, copy all of it, paste it into the editor, and click **Run**. You should see "Success".
5. Go to **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up", so only people you add can log in.
6. Go to **Authentication → Users → Add user → Create new user**. Enter **your own** email and a password, tick **Auto Confirm User**, and click **Create**.
   The first user becomes the **Admin** automatically.
7. Go to **Project Settings → API** (also shown as **Data API** / **API Keys**). Keep this page open: you need the **Project URL** and the **anon public** key in step 2.

### 2. Put the app online (Vercel), about 5 minutes

1. Go to [vercel.com](https://vercel.com) → sign in with GitHub.
2. **Add New → Project** → choose the **KoveInsurance** repository → **Import**.
3. Open **Environment Variables** and add two:
   - `EXPO_PUBLIC_SUPABASE_URL` = the Project URL from step 1.7
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = the anon public key from step 1.7
4. Click **Deploy**. After about 2 minutes you get a link like `https://kove-insurance.vercel.app`. That's your app.
5. In Supabase, go to **Authentication → URL Configuration** and set **Site URL** to that link, so password-reset emails point to the right place.

### 3. Use it on your phone

Open the same link in Chrome (Android) or Safari (iPhone) and choose **Add to Home Screen**. It then opens like an app.

Real Play Store and App Store apps can be built from this same code later (see "Later" below).

### 4. Add your team

For each person: in Supabase, go to **Authentication → Users → Add user**, enter their email and a password, and tick **Auto Confirm**. They start as **Sales**. Change their role in Fizzy under **More → Team**.

### 5. Bring in your existing data

In Fizzy, go to **More → Import from Excel** (or use the **Import Excel** button on Home). Pick **Policies**, **Clients** or **Leads**, click **Download template** to see the expected columns, fill it in, and upload. Rows with problems are listed and skipped; everything else is imported.

---

## For developers

- **App:** [Expo](https://expo.dev) SDK 58 (React Native + React Native Web), Expo Router, TypeScript. Screens are in `src/app/`; shared code is in `src/lib/` and `src/components/`.
- **Backend:** [Supabase](https://supabase.com) (Postgres with row-level security, Auth, Storage). Schema and security rules are in `supabase/migrations/`.
- **Security model:** only active staff can read or write anything. Only admins can delete records or change roles. Documents live in a private bucket and open through 5-minute signed links.

```bash
cp .env.example .env.local      # fill in your Supabase URL and anon key
npm install
npm run web                     # browser
npm start                       # then scan the QR code with Expo Go on a phone
npm run typecheck
npx expo export --platform web  # production web build into dist/
```

## Later (phase 2 and beyond)

- Email and WhatsApp renewal reminders sent automatically to clients and staff
- Quotes from several insurers (RFQ) with a comparison sheet for the client
- Endorsements, claims tracking, commission reconciliation and partner payouts
- Client login to view policies and download documents
- Read policy PDFs automatically to fill in the form
- Play Store and App Store builds using [EAS Build](https://docs.expo.dev/build/introduction/). This needs a Google Play developer account (US$25 one-time) and an Apple developer account (US$99/year).
