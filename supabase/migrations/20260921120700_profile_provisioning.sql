-- ════════════════════════════════════════════════════════════════════════════
-- Provisionamento de perfil
--
-- Quando o painel administrativo cria um usuário via Auth Admin API, o perfil
-- correspondente nasce junto, na mesma transação. Sem isso existiria uma janela
-- em que o usuário consegue autenticar mas `auth_role()` devolve nulo — e um
-- usuário sem papel não enxerga nada, o que parece bug de permissão.
--
-- O papel vem de `user_metadata.role`, informado na criação. Não há caminho em
-- que o próprio usuário escolha o papel: `enable_signup = false`.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.user_role;
  v_name text;
begin
  -- Papel inválido ou ausente cai em 'inquilino', o papel de menor privilégio.
  begin
    v_role := coalesce(new.raw_user_meta_data ->> 'role', 'inquilino')::public.user_role;
  exception
    when invalid_text_representation then
      v_role := 'inquilino';
  end;

  v_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');

  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(v_name, split_part(new.email, '@', 1)),
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

comment on function public.handle_new_auth_user() is
  'Cria o profile junto com o usuário do Auth. Papel vem de user_metadata.role, '
  'definido pelo painel administrativo — nunca pelo próprio usuário.';

-- Desativar o perfil quando o usuário do Auth é removido é tratado pelo
-- ON DELETE CASCADE da FK. Em produção, a preferência é DESATIVAR
-- (profiles.active = false) em vez de apagar: o histórico da timeline referencia
-- o autor, e apagar o perfil transformaria autoria em nulo.
