-- ============================================================
--  Consolidate institution-family types (2026-08-08, 단일화 A안)
-- ============================================================
--  ACCELERATOR -> INSTITUTION
--  AGENCY      -> INSTITUTION
--  These three already shared one campaign pool ("기관 OIP 연계"),
--  so the split carried no functional meaning — the org's actual
--  nature lives in the company description instead.
--  Safe to re-run.
-- ============================================================

update contacts set type = 'INSTITUTION', updated_at = now()
 where type in ('ACCELERATOR', 'AGENCY');

select type, count(*) from contacts group by type order by count(*) desc;
