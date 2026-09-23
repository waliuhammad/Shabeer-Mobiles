# Deploying to Vercel

Written for whoever puts this live — first time or next time.

The build needs **no** environment variables. Everything is read at
request time, so a missing key shows up as a clear message on screen
rather than a failed deployment. Get the app up first, then add the keys.

---

## 1. Import the repository

[vercel.com/new](https://vercel.com/new) → import `waliuhammad/Shabeer-Mobiles`.

Framework preset, build command and output directory are all detected —
leave them alone.

## 2. Add the environment variables

**Settings → Environment Variables.** Tick **Production**, **Preview**
and **Development** for each one.

### Public — safe in the browser

These are inlined into the JavaScript bundle by design. They identify
which Firebase project to talk to; they grant nothing. Security Rules
protect the data, not this config.

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Copy the values from your local `.env.local`.

### Secret — server only

```
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
```

**None of these may ever get a `NEXT_PUBLIC_` prefix.** The Admin SDK
bypasses every Security Rule — that key is the master key to the whole
database.

**The private key is the one thing that usually goes wrong.** Paste it
exactly as it appears in `.env.local`, including the surrounding double
quotes and the literal `\n` sequences:

```
"-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

`lib/firebase/admin.ts` strips the quotes and turns `\n` back into real
newlines. If you paste it with actual line breaks instead, Vercel stores
only the first line and you get:

```
error:0909006C:PEM routines:get_name:no start line
```

That message always means the key was mangled, never that it is wrong.

## 3. Authorise the Vercel domain in Firebase

**Firebase Console → Authentication → Settings → Authorised domains →
Add domain.**

Add the deployment domain, e.g. `shabeer-mobiles.vercel.app`, and your
custom domain later.

**Sign-in will fail with `auth/unauthorized-domain` until you do this.**
It is the single most common "it worked locally" deployment problem.

Preview deployments get a new URL per commit and cannot all be
authorised. Either test auth on production only, or add a stable preview
alias.

## 4. Check it

1. Open the deployment URL — it should redirect to `/admin`
2. Not signed in, so it should bounce to `/login`
3. Sign in with the account you granted `SUPER_ADMIN`
4. The admin panel should open with your real products

If sign-in fails, it is almost always step 3 above.

---

## Things worth knowing

**`.env.local` is git-ignored and is not deployed.** Vercel reads only
what you put in its own settings. That is why the list above has to be
entered by hand.

**Changing an environment variable needs a redeploy.** They are read at
startup. Vercel does not restart the running deployment when you save
one — trigger a new deployment from the dashboard.

**Security Rules are not deployed by Vercel.** They live in Firebase and
are pushed separately:

```bash
npx firebase deploy --only firestore:rules
```

Vercel deploying the app does not change the rules, and vice versa.

**The online shop is switched off** by `ONLINE_STORE_ENABLED` in
`lib/feature-flags.ts`. That is a code constant, not an environment
variable, so it ships with the build and is the same everywhere. It is a
business decision rather than a per-environment setting, which is why it
is not configurable per deployment.

**Node version.** The project uses Node 24 features. Vercel defaults to
a recent Node and this needs nothing special, but if a build ever fails
on a syntax error in `scripts/`, check **Settings → General → Node.js
Version**.

## Custom domain

**Settings → Domains** → add it, then follow the DNS instructions.
Afterwards, add the same domain to Firebase's authorised domains, or
sign-in will break on the new address while continuing to work on the
`.vercel.app` one.
