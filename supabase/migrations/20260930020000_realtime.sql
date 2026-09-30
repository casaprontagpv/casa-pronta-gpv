-- ════════════════════════════════════════════════════════════════════════════
-- Realtime — a página deixa de precisar de F5
--
-- O Realtime lê o WAL do Postgres, e só enxerga as tabelas que estiverem na
-- publicação `supabase_realtime`. Sem isto, nenhum evento sai do banco por mais
-- que o cliente assine.
--
-- SEGURANÇA: os eventos passam pela RLS. O servidor avalia a política de SELECT
-- da tabela em nome de CADA assinante antes de entregar a mensagem — quem não
-- pode ler a linha não recebe o evento. É a mesma política de
-- 20260921120300_rls.sql, não uma segunda cópia da regra.
--
-- Ainda assim, o cliente trata o evento como SINAL, não como dado: ao receber,
-- ele relê pelo caminho normal (PostgREST + RLS) em vez de confiar no payload.
-- Ver src/data/realtime.ts.
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_tabela text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  -- `alter publication ... add table` estoura se a tabela já for membro, e a
  -- publicação já vem criada no projeto hospedado. Daí a verificação.
  foreach v_tabela in array array[
    'tickets',          -- status do chamado muda para todo mundo que o enxerga
    'ticket_timeline',  -- toda ação do domínio passa por log_timeline()
    'ticket_messages',  -- o chat
    'appointments',     -- agenda da central e rota do dia do técnico
    'notifications'     -- o sininho
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_tabela
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_tabela);
    end if;
  end loop;
end
$$;

-- ─── O que deliberadamente NÃO está aqui ────────────────────────────────────
--
-- `quotes`, `technical_reports`, `service_completions`, `evaluations` e
-- `attachments`: toda RPC que escreve nelas também chama `log_timeline()`, então
-- a linha nova na timeline já é o sinal. Publicar as cinco significaria avaliar
-- RLS cinco vezes por ação para disparar a mesma releitura.
--
-- `profiles`, `agencies`, `properties`: cadastro muda por operação
-- administrativa, não durante o atendimento.
--
-- DELETE também fica de fora, no cliente: o Realtime não consegue aplicar RLS
-- sobre uma linha que já não existe (com REPLICA IDENTITY padrão o evento só
-- carrega a chave primária), e um evento sem filtro de RLS é exatamente o que
-- não queremos. Nada no domínio apaga registro — chamado se cancela, não se
-- apaga — então não há o que assinar.
