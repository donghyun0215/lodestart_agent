-- ============================================================
--  Merge VC_CRYPTO_LIST into VC
-- ============================================================
--  Many firms tagged as crypto investors are ordinary VCs, and
--  keeping two buckets meant every filter and every count had to
--  be read twice. There is no case where we want to address them
--  as separate audiences, so they become one type.
--
--  Run once in the Supabase SQL editor. Safe to re-run: after the
--  first run there are no VC_CRYPTO_LIST rows left to update.
-- ============================================================

update contacts
   set type = 'VC',
       updated_at = now()
 where type = 'VC_CRYPTO_LIST';

-- Verify: should return a single row, type='VC', with the combined count.
select type, count(*) from contacts where type like 'VC%' group by type;
