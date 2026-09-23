-- ════════════════════════════════════════════════════════════════════════════
-- pgTAP — framework de teste do banco.
--
-- Fica em schema próprio (`extensions`) e não é usado por nenhum código de
-- aplicação. É seguro no projeto de produção, mas os testes em si só rodam
-- sob demanda, via `supabase test db`, nunca em produção.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgtap with schema extensions;
