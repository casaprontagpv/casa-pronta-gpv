# Primeira conta e recuperação de acesso

O banco de produção nasce com **zero usuários**, e o sistema não tem auto-cadastro: quem cria conta
é o painel administrativo, que por sua vez exige uma conta com papel `empresa` para ser acessado.

É um ovo e uma galinha, e ele se resolve **uma única vez**, à mão. Depois disso, toda conta nasce
pelo painel.

---

## Criando a primeira conta

### Passo 1 — criar o usuário no Supabase Auth

No painel do Supabase do projeto de produção: **Authentication → Users → Add user → Create new
user**.

- **Email:** o e-mail do administrador da Casa Pronta
- **Password:** senha forte, guardada no gerenciador de senhas
- **Auto Confirm User:** ✅ **marcado** — sem isso a pessoa não consegue entrar

O perfil é criado automaticamente por trigger. Como o painel do Supabase não envia metadados, o
papel cai no padrão **`inquilino`**, o de menor privilégio: papel alto não deve nascer por
acidente.

### Passo 2 — promover a conta a `empresa`

No **SQL Editor** do mesmo projeto, trocando o e-mail:

```sql
update public.profiles
set role = 'empresa',
    name = 'Casa Pronta Admin'
where email = 'admin@SEU-DOMINIO.com.br';
```

Confirme que pegou **exatamente uma linha**:

```sql
select id, name, email, role, active from public.profiles where role = 'empresa';
```

### Passo 3 — entrar e cadastrar o resto

Acesse a aplicação com esse e-mail e senha. Você cai na central, e o botão **Administração**
aparece no cabeçalho.

Cadastre nesta ordem — ela é a de dependência:

1. **Imobiliária**
2. **Imóvel** (pertence a uma imobiliária)
3. **Inquilino** (vinculado a um imóvel)
4. **Técnicos** (independentes)

A partir daqui nada mais é feito por SQL.

> **Crie uma segunda conta `empresa` logo no começo.** Perder a única significa voltar ao SQL
> Editor.

---

## Se perder o acesso do administrador

Enquanto houver **outra** conta `empresa`, ela cria a reposição pelo painel.

Se for a única:

- **Esqueceu a senha:** Authentication → Users → ⋮ → _Send password recovery_. Depende do SMTP
  estar configurado (ver [`DEPLOY.md`](./DEPLOY.md)).
- **Perdeu a conta inteira:** crie outro usuário pelo passo 1 e promova pelo passo 2.

---

## Em desenvolvimento

Nada disso é necessário: o `supabase/seed.sql` já cria `admin@casapronta.com.br` com papel
`empresa` e senha `senha123`. Esse seed **nunca** é aplicado em produção — o `db push` não o envia.
