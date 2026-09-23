# Shabbir Mobiles

A shop management platform for a mobile phone business in Multan, Pakistan — used handsets, accessories and a repairing lab.

It is two systems sharing one codebase, one design language and one data layer:

- a **customer storefront** — browse, cart, checkout, order tracking
- an **admin panel** — point of sale, inventory, purchasing, customers, and full financial reporting

Built with the Next.js App Router, React 19 and Firebase Authentication.

> **Status:** the interface is complete and the authentication is real. Business data still lives in mock files and browser storage — the Firestore migration is the next step. See [Current state](#current-state).

---

## Stack

| | |
|---|---|
| Framework | Next.js 16.3.5 (App Router, Turbopack) |
| UI | React 19.2.8, Tailwind CSS v4, shadcn/ui, Lucide |
| Charts | Recharts 3.10 |
| Auth | Firebase Authentication + Firebase Admin SDK |
| Language | TypeScript, strict — no `any` |

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill it in, see below
npm run dev                        # http://localhost:3010
```

### Environment

`.env.local.example` documents every variable. The two that matter to start:

```bash
# Client SDK — public by design. Firebase expects these in the browser;
# Security Rules protect the data, not this config.
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Admin SDK — SERVER ONLY. No NEXT_PUBLIC_ prefix, ever.
# This bypasses every Security Rule. Firebase Console →
# Project settings → Service accounts → Generate new private key.
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Keep the quotes around the private key. It arrives from the JSON with `\n` written as two characters; the code converts them back to real newlines.

Enable **Email/Password**, **Google** and **Phone** under Authentication → Sign-in method, and add `localhost` to Authorised domains.

### Getting into the admin panel

`/admin` is locked to staff. Staff status is a **custom claim**, not a database field, so it has to be granted by a trusted process:

```bash
# 1. register an account at /register
# 2. grant it a role
node scripts/set-role.mjs you@example.com SUPER_ADMIN
# 3. sign out and back in — claims only land in a fresh token
```

Roles: `SUPER_ADMIN`, `MANAGER`, `CASHIER`. Pass `none` to revoke.

This is a local script rather than an admin page on purpose: granting `SUPER_ADMIN` is the most dangerous operation in the system, and the first one has to exist before any admin exists to authorise it.

## Scripts

```bash
npm run dev     # dev server on :3010
npm run build   # production build
npm start       # serve the production build
npm run lint    # eslint
```

## Architecture

### Authorization is three layers, weakest to strongest

```
browser signs in (Firebase)
  → ID token → POST /api/auth/session
  → Admin SDK verifies → httpOnly session cookie
  ├─ proxy.ts        is a cookie PRESENT?   optimistic, defeatable
  ├─ lib/auth/dal.ts is it GENUINE?         ← the real boundary
  └─ firestore.rules may this role READ it? ← the final word
```

`proxy.ts` (what Next.js called `middleware.ts` before v16) only checks that a cookie exists — it cannot verify one without a network call on every request, including prefetches. The real check is `lib/auth/dal.ts`, which hands the cookie to the Admin SDK for signature and revocation verification. Delete `proxy.ts` and `/admin` is still protected; the experience is just worse.

### Finance has exactly one calculation layer

```
  Revenue          completed sales, at the price charged
− COGS             historical cost of those exact goods
= Gross Profit
− Operating Expenses
= Net Profit
```

`lib/finance-utils.ts` is the only place these are computed. The dashboard, `/admin/revenue` and `/admin/profit-loss` all call the same functions, so they cannot disagree — the usual failure mode where three pages give three answers to "what did we make last month" is structurally impossible.

**Purchases are not operating expenses.** Buying stock swaps cash for inventory of equal value; nothing is consumed. That cost reaches the accounts as COGS when the item sells. Counting purchases as expenses would show a heavy loss in every restocking month and a false profit whenever the shelves ran down.

### Cost is frozen at the moment of sale

Every order line and invoice line stores a `purchasePrice` snapshot. COGS reads that, never today's cost. If a supplier raises a price, last month's reported profit does not move.

`data/product-costs.ts` holds the *current* cost and is used to value stock on hand. The two answer different questions and are never conflated.

### Cost is admin-only, by type

`Product` deliberately cannot carry `purchasePrice`. One careless `getProducts()` on a public page would ship the shop's margins to every customer, and no Security Rule can undo a read that was legitimate. Cost lives in a separate record. A type that cannot carry cost cannot leak it.

Orders are stripped at the storefront boundary by `toCustomerOrder()`.

### Stock changes only through the ledger

Stock is not a field anyone types. It is the running total of recorded movements — goods received, a counter sale, a stock-take correction — all funnelled through `applyStockChange()`. A form that could set stock to any number would let stock be created from nothing, and the ledger would stop reconciling with the shelf.

### Records are deactivated, never deleted

Products archive, customers deactivate, expenses cancel, purchases cancel. Orders and invoices reference them by id; deleting would leave an invoice that cannot say what was sold. A financial record nobody can audit is worse than a wrong one everybody can see.

## Deploying

See [DEPLOYMENT.md](DEPLOYMENT.md). The short version: the build needs no
environment variables, so import the repo into Vercel first, then add the
Firebase keys and authorise the deployment domain in Firebase Auth.

## Project layout

```
app/
  (store)/      12 storefront routes
  admin/        32 admin routes
  api/auth/     session cookie endpoint
components/     UI, grouped by feature
context/        client state (cart, catalog, orders, finance, auth…)
data/           mock datasets — replaced by Firestore
lib/            business logic, framework-free and unit-testable
  auth/dal.ts   the authorization boundary
  finance-utils.ts
  inventory-utils.ts
scripts/        set-role.mjs
types/          domain models
firestore.rules Security Rules
proxy.ts        optimistic route redirects
```

Business rules live in `lib/` as pure functions with no React imports, so they can be reasoned about — and checked with a calculator — on their own.

## Current state

**Working:** the full storefront and admin panel; real authentication with email/password, Google and phone OTP; server-verified sessions; role-based route protection; finance calculations verified by hand.

**Not yet:**

- **Data is mock.** `data/*.ts` plus `localStorage`. Admin edits do not reach the storefront, and `/account` shows the same orders to everyone. `firestore.rules` is written ahead of the migration so permissions are agreed before anything depends on them.
- **No product images.** `images: []` is a valid state — the UI renders a branded placeholder.
- **No payments, notifications or deployment.**

## Security notes

- The client Firebase config is **public by design**. It identifies which project to talk to and grants nothing.
- `lib/firebase/admin.ts` starts with `import "server-only"`, so the build fails if a client component imports it, even transitively.
- Roles are **custom claims** signed into the token, not documents a user could write to. Rules read `request.auth.token.role` directly.
- `firestore.rules` is **default-deny**: a new collection starts closed and must be opened deliberately.
- Hiding a button is not security. Every guard in the UI has a server-side counterpart.

## License

Private project. Not licensed for reuse.
