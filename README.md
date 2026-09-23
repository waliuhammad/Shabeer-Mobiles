# Shabbir Mobiles

A shop management platform for a mobile phone business in Multan, Pakistan — used handsets, accessories and a repairing lab.

**The shop does not sell online.** This is an internal system, used in the
shop by shop staff, to keep track of everything: stock, counter sales,
customers, suppliers, purchases and money.

- **Point of sale** — ring up a counter sale; stock and the ledger move with it
- **Inventory** — stock as the running total of an auditable ledger
- **Purchasing** — suppliers, purchase orders, receiving
- **Finance** — revenue, COGS, gross profit, expenses, net profit
- **Catalogue and customers** — the records everything else refers to

A customer-facing storefront exists in the codebase and is **switched off**
behind one flag (`ONLINE_STORE_ENABLED`). It is kept alive and compiling
rather than deleted, in case the business ever sells online.

Built with the Next.js App Router, React 19, Firebase Auth and Firestore.

> **Status:** live. Authentication is real, Security Rules are deployed,
> and all business data is in Firestore with real-time updates.

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

The `productCosts` collection holds the *current* cost and is used to value stock on hand. The two answer different questions and are never conflated.

Cost is looked up **on the server** when a sale is recorded — a cashier is forbidden from reading it, so a cashier's browser could only ever have stamped a zero.

### Cost is admin-only, by type AND by rule

`Product` deliberately cannot carry `purchasePrice`. One careless read of the catalogue would ship the shop's margins, and no Security Rule can undo a read that was legitimate. Cost lives in its own collection, which `firestore.rules` refuses to a cashier. A type that cannot carry cost cannot leak it.

### Sales are recorded by the server, not the browser

`app/api/sales/route.ts` recomputes every total from the product documents, looks up the real cost, checks stock against the database and issues the invoice number from a counter — all in one transaction. The till sends only *which products and how many*. A client that can name its own total is a client that can charge zero.

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
  (store)/      login, register (+ the switched-off storefront)
  admin/        32 admin routes — the actual system
  api/auth/     session cookie endpoint
  api/sales/    the trusted path for recording a counter sale
components/     UI, grouped by feature
context/        live Firestore subscriptions, one per collection
services/       server-side reads via the Admin SDK
data/           seed templates only — Firestore is the source of truth
lib/            business logic, framework-free and unit-testable
  auth/dal.ts   the authorization boundary
  finance-utils.ts
  inventory-utils.ts
  feature-flags.ts
scripts/        set-role.mjs, seed-catalog.mjs
types/          domain models
firestore.rules Security Rules — deployed
proxy.ts        optimistic route redirects
```

Business rules live in `lib/` as pure functions with no React imports, so they can be reasoned about — and checked with a calculator — on their own.

## Current state

**Working:** real authentication (email/password, Google, phone OTP) with
server-verified sessions and roles as custom claims; Security Rules
deployed; every collection in Firestore with live `onSnapshot` updates;
counter sales recorded server-side with stock and ledger in one
transaction; finance calculations verified by hand.

**Outstanding:**

- **No product images.** `images: []` is a valid state — the UI renders a
  branded placeholder. Photos have to come from the shop.
- **Shop map pin** not set; the map falls back to an address search.
- **Settings** still saves to one browser rather than Firestore.
- **Order and inventory writes** come from the browser. Rules permit staff,
  but the safer end state is a server action, as counter sales already do.
  Each rule site says so.

## Security notes

- The client Firebase config is **public by design**. It identifies which project to talk to and grants nothing.
- `lib/firebase/admin.ts` starts with `import "server-only"`, so the build fails if a client component imports it, even transitively.
- Roles are **custom claims** signed into the token, not documents a user could write to. Rules read `request.auth.token.role` directly.
- `firestore.rules` is **default-deny**: a new collection starts closed and must be opened deliberately.
- Hiding a button is not security. Every guard in the UI has a server-side counterpart.

## License

Private project. Not licensed for reuse.
