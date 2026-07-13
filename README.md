# ניהול אירועים (Event Manager)

Internal web app for managing events (weddings, Bar/Bat Mitzvahs, etc.): tasks, a day-of timeline, guest lists imported from iPlan, and waiter/table staffing assignments. Hebrew-only UI, right-to-left layout.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth), accessed via `@supabase/ssr`
- PapaParse + chardet + iconv-lite for Hebrew-safe CSV guest import

## Supabase project

A dedicated Supabase project ("event-manager", ref `cjokvfibkyvdquonusqe`, eu-central-1/Frankfurt, free `nano` tier) is already created and linked, with the schema applied via `supabase/migrations/00000000000000_schema.sql`. `.env.local` is already filled in with its URL/anon key (gitignored).

- Dashboard: https://supabase.com/dashboard/project/cjokvfibkyvdquonusqe
- Schema changes going forward: edit/add a file under `supabase/migrations/`, then run `supabase db push` (requires `SUPABASE_ACCESS_TOKEN` and the project's DB password — the DB password set at creation time wasn't retained anywhere; reset it from the dashboard under Project Settings → Database if a future push needs it).
- Still to do manually: add your 2-5 staff members as rows in the `staff` table (Table Editor) — there's no staff-management UI in v1 since the roster is small and rarely changes.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Notes

- **CSV import (guests)**: the importer auto-detects the file's character encoding (handles Windows-1255, which is common for Hebrew exports from Israeli tools) before parsing, then lets you map CSV columns to guest fields. No fixed iPlan schema is assumed yet — confirm the exact export format once available and adjust `lib/csv-import.ts` / the mapping UI if needed.
- **Waiter staffing**: the waiter roster (`/waiters`) is reusable across events. Per-event tables/food stands live under an event's "צוות הגשה" (Staffing) tab; use "צור שולחנות מרשימת האורחים" to auto-create table locations from each guest's imported seating table.
- **Email reminders**: not yet wired up — the schema includes a `notification_log` table and the spec calls for a daily scheduled job (Vercel Cron) plus an email provider (Resend/SendGrid); this is a follow-up, not part of this scaffold.
- Supabase types in `lib/types.ts` are hand-written to mirror `supabase/migrations/00000000000000_schema.sql`. If you prefer generated types, run `supabase gen types typescript` once the project is linked and swap them in.
