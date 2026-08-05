-- ============================================================
--  Rename contact types (2026-08-01)
-- ============================================================
--  PERSONAL_NETWORK -> REMEMBER   (the list came from the Remember
--                                  business-card app; call it what it is)
--  INTERMEDIARY     -> AGENCY     (two labels for the same kind of org;
--                                  Padang & Co and the other brokers all
--                                  belong with the agencies)
--  Safe to re-run: after the first run there is nothing left to update.
-- ============================================================

update contacts set type = 'REMEMBER', updated_at = now()
 where type = 'PERSONAL_NETWORK';

update contacts set type = 'AGENCY', updated_at = now()
 where type = 'INTERMEDIARY';

-- Verify: expect REMEMBER ~1493, AGENCY ~32 (30 intermediary + 2 agency), no old names.
select type, count(*) from contacts group by type order by count(*) desc;
