-- ============================================================
--  Final type taxonomy (2026-08-10)
-- ============================================================
--  VC (+legacy VC_CRYPTO_LIST)                    -> INVESTOR
--  INSTITUTION / ACCELERATOR / AGENCY /
--  INTERMEDIARY                                   -> GOV_AND_AGENCY
--  REMEMBER / PERSONAL_NETWORK / EVENT_GUEST      -> OTHERS
--  Safe to re-run. Supersedes migration_rename_types.sql and
--  migration_merge_institution.sql (running those first is fine
--  but no longer necessary — this folds every historical name).
-- ============================================================

update contacts set type = 'INVESTOR', updated_at = now()
 where type in ('VC', 'VC_CRYPTO_LIST');

update contacts set type = 'GOV_AND_AGENCY', updated_at = now()
 where type in ('INSTITUTION', 'ACCELERATOR', 'AGENCY', 'INTERMEDIARY');

update contacts set type = 'OTHERS', updated_at = now()
 where type in ('REMEMBER', 'PERSONAL_NETWORK', 'EVENT_GUEST');

select type, count(*) from contacts group by type order by count(*) desc;
