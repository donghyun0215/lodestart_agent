-- ============================================================
--  Contact change log (2026-09-05)
-- ============================================================
--  Every DB mutation from the app (수정/추가/삭제/CSV 업로드) writes a
--  row here: when, who (Gmail account), what changed. `before`/`after`
--  hold full row snapshots so the most recent action can be reversed
--  from the UI ("되돌리기" — last action only).
--  Safe to re-run.
-- ============================================================

create table if not exists contact_logs (
  id            bigint generated always as identity primary key,
  created_at    timestamptz default now(),
  actor         text,      -- Gmail account that performed the action
  action        text,      -- update | add | delete | import | undo
  contact_email text,      -- target contact (single-row actions)
  contact_org   text,
  before        jsonb,     -- snapshot before the change (null for add)
  after         jsonb,     -- snapshot after the change (null for delete)
  note          text       -- human-readable one-liner shown in the UI
);

create index if not exists contact_logs_created_idx on contact_logs (id desc);
