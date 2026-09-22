-- Remove web-search citation markup (<cite index="…">…</cite>) that leaked
-- into saved company descriptions during auto-enrichment. Safe to re-run.
update contacts
   set notes = btrim(regexp_replace(regexp_replace(notes, '</?cite[^>]*>', '', 'gi'), '\s{2,}', ' ', 'g')),
       updated_at = now()
 where notes ~* '<\/?cite';

select count(*) as remaining_with_cite from contacts where notes ~* '<\/?cite';
