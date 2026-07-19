-- ============================================================
--  Paste ALL of this into Supabase -> SQL Editor -> New query -> Run
--  It creates the tables the app needs and opens them for the
--  demo (anon key can read/write). Tighten later with real auth.
--
--  Safe to re-run: every statement is idempotent (IF NOT EXISTS /
--  DROP POLICY IF EXISTS), so if you already ran an older version
--  of this file, running it again just adds what's missing.
-- ============================================================

create table if not exists contacts (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  email       text unique not null,
  org         text,
  person      text,
  title       text,
  country     text,
  type        text,       -- VC | CORPORATE_KR | VC_CRYPTO_LIST | ACCELERATOR | INTERMEDIARY | AGENCY
  notes       text,
  sendable    text default 'YES'
);

create table if not exists campaigns (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  startup     text,
  audience    text,
  lang        text,
  note        text
);

create table if not exists sends (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  campaign_id    uuid references campaigns(id) on delete cascade,
  contact_id     uuid references contacts(id) on delete cascade,
  email          text,
  org            text,
  person         text,
  fit            int,
  subject        text,
  body           text,
  status         text default 'draft',   -- draft | sent | replied | no_interest
  gmail_draft_id text
);

-- Migration for anyone who ran an earlier version of this file where
-- `sends` already existed without these columns.
alter table sends add column if not exists contact_id     uuid references contacts(id) on delete cascade;
alter table sends add column if not exists gmail_draft_id text;
alter table sends add column if not exists updated_at     timestamptz default now();

-- one row per (campaign, contact) — lets us upsert instead of duplicating
-- rows every time a draft is regenerated or a status changes.
create unique index if not exists sends_campaign_contact_uidx
  on sends (campaign_id, contact_id);

alter table contacts  enable row level security;
alter table campaigns enable row level security;
alter table sends     enable row level security;

-- Demo policies: allow the anon key full access.
-- (For production you'd scope these to an authenticated user.)
drop policy if exists "demo_all_contacts" on contacts;
create policy "demo_all_contacts" on contacts
  for all using (true) with check (true);

drop policy if exists "demo_all_campaigns" on campaigns;
create policy "demo_all_campaigns" on campaigns
  for all using (true) with check (true);

drop policy if exists "demo_all_sends" on sends;
create policy "demo_all_sends" on sends
  for all using (true) with check (true);

