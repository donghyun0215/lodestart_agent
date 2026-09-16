-- ============================================================
--  LINKEDIN_ONLY contact type (2026-09-16)
-- ============================================================
--  Contacts with no email address at all, reachable only through
--  their LinkedIn profile. They were loaded as INVESTOR with
--  sendable='NO'; Tammy asked for them to be their own category so
--  they show up as a separate card/filter in the contacts tab.
--  Safe to re-run.
-- ============================================================

update contacts set type = 'LINKEDIN_ONLY', updated_at = now()
 where sendable = 'NO'
   and email like '%@no-email.invalid';

select type, count(*) from contacts group by type order by count(*) desc;
