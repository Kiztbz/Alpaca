# Supabase deployment

Alpaca uses Supabase as a hosted PostgreSQL database. Authentication remains in
the Next.js server so the migration does not silently change account or session
semantics.

## 1. Create and configure the database

1. Create a Supabase project.
2. In **Connect**, copy the **Transaction pooler** URI (port `6543`).
3. Percent-encode reserved characters in the database password.
4. Add the following server-only variables to `.env` and to the Vercel project:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:6543/postgres?sslmode=require"
DATABASE_POOL_SIZE=1
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
ACCESS_TOKEN_SECRET="a-unique-random-secret"
REFRESH_TOKEN_SECRET="a-different-unique-random-secret"
```

Never prefix database credentials or token secrets with `NEXT_PUBLIC_`. Do not
commit `.env`; it is ignored by Git.

## 2. Initialize and seed

```powershell
npm run db:init
npm run db:seed
```

The migration is idempotent. The seed is transactional and replaces only its
own deterministic demo records.

## Security model

- The browser has no direct database credentials.
- Row Level Security is enabled on every application table.
- The Supabase `anon` and `authenticated` roles have no table or sequence
  privileges. This prevents the Data API from becoming an unintended second
  authorization path.
- All access goes through server-side Next.js routes, which retain Alpaca's
  existing permissions and signed-cookie checks.
- PostgreSQL connections require TLS by default and the Vercel pool is capped at
  one connection per warm function instance.

If Supabase Auth is added later, introduce reviewed RLS policies in a separate
migration before granting either API role access.

## Vercel

Add the variables above under **Project Settings → Environment Variables**.
Use separate Supabase projects or credentials for Preview and Production. Set
the Vercel function region close to the Supabase project region to reduce
latency.
