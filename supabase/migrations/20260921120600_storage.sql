-- ════════════════════════════════════════════════════════════════════════════
-- Storage de fotos
--
-- Bucket PRIVADO. As fotos mostram o interior do imóvel de alguém — não podem
-- ficar em URL pública adivinhável. O acesso é por URL assinada, de curta duração.
--
-- Convenção de caminho: tickets/<ticket_id>/<uuid>.<ext>
-- O primeiro segmento depois de "tickets/" é o ticket_id, e é o que as políticas
-- abaixo usam para decidir quem pode ler cada arquivo.
-- ════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-photos',
  'ticket-photos',
  false,
  5242880, -- 5 MB por arquivo; o cliente ainda reduz para 1600px/JPEG antes de subir
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Extrai o ticket_id do caminho do objeto, devolvendo nulo se não for um uuid
-- válido — um caminho malformado nunca vira permissão.
create or replace function public.storage_ticket_id(p_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  v_parts text[];
begin
  v_parts := string_to_array(p_name, '/');
  if array_length(v_parts, 1) < 2 or v_parts[1] <> 'tickets' then
    return null;
  end if;
  return v_parts[2]::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

grant execute on function public.storage_ticket_id(text) to authenticated;

-- Leitura espelha exatamente a visibilidade do chamado.
create policy "ticket photos: leitura segue o chamado"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ticket-photos'
    and public.can_read_ticket(public.storage_ticket_id(name))
  );

create policy "ticket photos: upload por quem enxerga o chamado"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ticket-photos'
    and public.can_read_ticket(public.storage_ticket_id(name))
    and owner_id = auth.uid()::text
  );

-- Sem UPDATE: foto de "antes" não se edita depois do serviço feito.
create policy "ticket photos: remoção pelo autor ou pela central"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'ticket-photos'
    and (owner_id = auth.uid()::text or public.is_empresa())
  );
