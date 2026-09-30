# Sai Water Suppliers – Jar Management

A simple app for one water-jar shop in Kolewadi, built to be used on a phone.

```
React PWA (Vercel)  →  Laravel 12 REST API  →  PostgreSQL
frontend/              backend/
```

## What it does

- **Dashboard**: today's jars given/returned, jars in the shop and with customers, cash, udhari, total pending, expenses and net cash. Filters: Today / Yesterday / This Week / This Month / Custom.
- **Daily Entry**: give or return jars. Amount, udhari and advance are worked out automatically. After saving, one tap sends the WhatsApp message.
- **Customers**: add, edit, view, soft delete, call, WhatsApp, udhari reminder and full history.
- **Payments**: Cash / UPI / Bank. If a payment is more than the pending amount, it must be ticked as an advance. Sends a WhatsApp receipt.
- **Jars**: total, available, with customers, damaged and lost, managed by quantity. You can turn on tracking by jar number (JAR-001…) in Settings.
- **Reports**: Daily, Weekly, Monthly, Customer Ledger, Jar Status, Cash, Udhari and Pending. Each has filters and search, plus Excel, PDF and Print.
- **Expenses**: a simple list that feeds Net Cash (cash collection minus cash expenses).
- **WhatsApp**: uses click-to-chat (`wa.me`). No WhatsApp API is needed. The Marathi message templates can be edited in Settings.
- **PWA**: can be installed on Android and iPhone, has a splash screen, and shows the last-seen data when offline. Entries saved offline sync later and are never duplicated (see below).

## Business rules (all calculated on the server)

| Value | Formula |
|---|---|
| Customer current jars | SUM(given) − SUM(returned) |
| Customer pending | SUM(udhari) − SUM(advance) − SUM(payments) (negative = advance credit) |
| Available jars | Total jars − jars with customers − damaged − lost |
| Cash collection | money received on jar entries + **cash** payments |
| Udhari | udhari created on jar entries in the period |
| Net cash | cash collection − cash expenses |

The server re-checks every number the app sends. For example, `amount` is always `qty × rate` and `udhari` is always `amount − paid`. Each jar entry or payment runs inside a database transaction with a row lock on the customer. The ledger (`customer_ledger`) is rebuilt in the same transaction, so balances stay correct after back-dated entries and deletes.

The server blocks:
- negative quantities and payments
- returning more jars than the customer holds
- a payment above the pending amount unless it is marked as an advance
- an invalid mobile number, transaction type or payment mode
- deleting a customer who still holds jars or owes money (mark them Inactive instead)
- deleting a "give" entry after those jars have been returned

**Offline safety:** each form gets a `client_uuid` when it opens. The jar-entry, payment and expense tables have a UNIQUE index on that column. If the phone has no internet, the save waits in an outbox on the phone and syncs automatically later. If the same save reaches the server twice, the server returns the existing record instead of creating a new one.

## Run locally

Requirements: PHP 8.2+ with `pdo_pgsql`, Composer, Node 20+, and PostgreSQL.

```bash
# API
cd backend
composer install
cp .env.example .env            # set DB_* for your PostgreSQL, APP_DEBUG=true, APP_ENV=local
php artisan key:generate
php artisan migrate --seed      # creates tables + the admin account + default settings
php artisan db:seed --class=DemoSeeder   # optional sample customers (local only)
php artisan serve               # http://127.0.0.1:8000

# App
cd ../frontend
npm install
cp .env.example .env            # VITE_API_URL=http://127.0.0.1:8000
npm run dev                     # http://localhost:5173
```

Default login is `admin@saiwater.in` / `ChangeMe@123` (or whatever `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set to in `.env`). You can also log in with `ADMIN_MOBILE`. **Change the password in Settings after the first login.**

Tests (these use in-memory SQLite, so no database setup is needed): `cd backend && php artisan test`

## Deploy

**PostgreSQL**: any hosted Postgres works (Neon, Supabase, Render, Railway, etc.). Copy its connection details into the backend `.env`, either as `DB_*` or as a single `DB_URL`. Keep `DB_SSLMODE=require`.

**Laravel API**: any PHP 8.2 host with the `pdo_pgsql` extension (Laravel Forge, a VPS, Railway, Render, etc.):
```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate        # first time only
php artisan migrate --force
php artisan db:seed --force     # first time only – creates the admin
php artisan config:cache && php artisan route:cache
```
Point the web root at `backend/public`. Set `FRONTEND_URL` to your Vercel URL (CORS only allows the origins listed there). Set `APP_DEBUG=false`.

**React PWA on Vercel**: import the repo and set Root Directory to `frontend`. Framework: Vite. Environment variable: `VITE_API_URL=https://your-api-domain` (without `/api`). `vercel.json` sends every page URL to `index.html` so links and refreshes work, and it stops the service worker from being cached.

**Install on a phone**: open the Vercel URL. On Android (Chrome), tap ⋮ → *Install app*. On iPhone (Safari), tap Share → *Add to Home Screen*.

## Notes

- **Name and logo**: Sai Water Suppliers (साई वॉटर सप्लायर्स), Kolewadi. The app icons and login banner come from the shop's banner. The business name in the header, reports and WhatsApp messages comes from **Settings**, so it can be changed without touching code.
- Developed by **AB Technology Services** · 7666287015.
- **PDF export** uses the browser's print dialog ("Save as PDF"). Marathi names print correctly this way, whereas JavaScript PDF libraries garble Devanagari unless fonts are embedded.
- **Jar stock** is one row per jar in the `jars` table, even in quantity mode. This gives exact totals and dated damaged/lost counts for the monthly report.
