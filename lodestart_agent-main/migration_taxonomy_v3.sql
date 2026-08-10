-- ============================================================
--  Taxonomy v3 — Tammy's classification (2026-08-10)
--  일반기업 / 공공기관 / 투자자 / 스타트업 / 연구기관 / 기타 / 미분류
--  Supersedes ALL earlier type migrations — safe to run on any
--  historical state, safe to re-run.
-- ============================================================

-- 투자자
update contacts set type = 'INVESTOR', updated_at = now()
 where type in ('VC', 'VC_CRYPTO_LIST');

-- 일반기업
update contacts set type = 'CORPORATE', updated_at = now()
 where type = 'CORPORATE_KR';

-- 공공기관·에이전시 (연구기관은 여기/미분류에서 Tammy가 골라 RESEARCH로 옮김)
update contacts set type = 'GOV_AND_AGENCY', updated_at = now()
 where type in ('INSTITUTION', 'ACCELERATOR', 'AGENCY', 'INTERMEDIARY', 'GOV');

-- 미분류 — 행사 참여·리멤버 등 새 DB 덤프는 여기 모이고, Tammy가 분류해서
-- 스타트업/연구기관/기타 등 해당 버킷으로 옮김
update contacts set type = 'UNCLASSIFIED', updated_at = now()
 where type in ('REMEMBER', 'PERSONAL_NETWORK', 'EVENT_GUEST', 'OTHERS');

-- 확인: INVESTOR / CORPORATE / GOV_AND_AGENCY / UNCLASSIFIED / TEST 만 남아야 정상
-- (STARTUP / RESEARCH / OTHERS 는 이후 수동 분류로 채워짐)
select type, count(*) from contacts group by type order by count(*) desc;
