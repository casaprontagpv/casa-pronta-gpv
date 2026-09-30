-- ════════════════════════════════════════════════════════════════════════════
-- Autoria preenchida pelo banco
--
-- As políticas de INSERT exigem que a coluna de autoria seja igual a auth.uid().
-- Isso funciona, mas obriga cada chamada a lembrar de mandá-la — e esquecer
-- produz um 403 sem explicação óbvia, porque `NULL = auth.uid()` é NULL, não
-- falso. Foi exatamente o que aconteceu ao escrever o teste das fotos.
--
-- Com o default, a autoria vem do token por padrão. A política continua valendo:
-- quem tentar enviar OUTRO id continua sendo recusado.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.attachments
  alter column uploaded_by set default auth.uid();

alter table public.ticket_messages
  alter column sender_profile_id set default auth.uid();

alter table public.evaluations
  alter column created_by set default auth.uid();

comment on column public.attachments.uploaded_by is
  'Preenchido por default a partir do token. A política de INSERT recusa valor diferente.';
