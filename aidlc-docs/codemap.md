# Codemap — repo

Read this first, then open only the files the task touches. Regenerate with
`python3 scripts/codemap.py .` after adding routes, tables, or env vars.

- Generated at: 80a0f2a 2026-09-23 Global activity indicator for backend actions
- Files mapped: 29 · code LOC: 8,442
- Scripts: `dev`, `build`, `start`
- Deps: @radix-ui/react-hover-card, @supabase/supabase-js, lucide-react, next, papaparse, react, react-dom

## API endpoints
- app/api/auth/callback/route.js · GET
- app/api/auth/google/route.js · GET
- app/api/auth/status/route.js · GET
- app/api/claude/route.js · POST
- app/api/contacts/delete/route.js · POST
- app/api/export/route.js · POST
- app/api/fetch-page/route.js · POST
- app/api/gmail/draft/route.js · POST
- app/api/gmail/send/route.js · POST
- app/api/gmail/sync/route.js · POST

## Data
- table `campaigns` — defined in supabase_schema.sql
- table `contact_logs` — defined in migration_contact_logs.sql
- table `contacts` — defined in supabase_schema.sql
- table `sends` — defined in supabase_schema.sql (+contact_id, gmail_draft_id, thread_id, updated_at)
- Supabase tables touched in code: `contacts`×10, `campaigns`×3, `sends`×3, `contact_logs`×2

## Environment variables
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `STAFF_EMAIL_DOMAINS`, `STAFF_EMAIL_ALLOWLIST`, `DELETE_ALLOWED_EMAILS`

## Biggest files (open these surgically — grep for the symbol, don't cat)
- app/page.jsx — 6806 LOC
- scripts/codemap.py — 165 LOC
- app/api/gmail/draft/route.js — 154 LOC
- app/api/gmail/sync/route.js — 138 LOC
- lib/staff.js — 107 LOC
- app/api/claude/route.js — 97 LOC
- app/api/export/route.js — 87 LOC
- app/api/fetch-page/route.js — 77 LOC
- app/api/gmail/send/route.js — 74 LOC
- app/api/contacts/delete/route.js — 67 LOC
- app/api/auth/callback/route.js — 52 LOC
- app/api/auth/status/route.js — 40 LOC

## Exports by file
- **app/api/auth/callback/route.js** (52): GET, runtime
- **app/api/auth/google/route.js** (21): GET, runtime
- **app/api/auth/status/route.js** (40): GET, runtime
- **app/api/claude/route.js** (97): POST, maxDuration, runtime
- **app/api/contacts/delete/route.js** (67): POST, runtime
- **app/api/export/route.js** (87): POST, runtime
- **app/api/fetch-page/route.js** (77): POST, maxDuration, runtime
- **app/api/gmail/draft/route.js** (154): POST, runtime
- **app/api/gmail/send/route.js** (74): POST, runtime
- **app/api/gmail/sync/route.js** (138): POST, runtime
- **app/layout.js** (12): metadata
- **lib/staff.js** (107): canDelete, deleteAllowlist, resolveAccount, staffDomains
- **lib/supabase.js** (8): supabase
- **scripts/codemap.py** (165): rel_files, loc, read, scan, tree, main

## Tree (depth 3)
```
AGENTS.md
DEPLOY_GUIDE.md
aidlc-docs/
  codemap.md
app/
  api/
    auth/
    claude/
    contacts/
    export/
    fetch-page/
    gmail/
  layout.js
  page.jsx
lib/
  staff.js
  supabase.js
migration_contact_logs.sql
migration_final_types.sql
migration_linkedin_only.sql
migration_merge_institution.sql
migration_merge_vc.sql
migration_rename_types.sql
migration_strip_cites.sql
migration_taxonomy_v3.sql
next.config.js
package.json
scripts/
  codemap.py
supabase_schema.sql
```
