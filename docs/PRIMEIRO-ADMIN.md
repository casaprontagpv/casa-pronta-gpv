# Criando a primeira conta em produção

Um banco de produção novo tem **zero usuários**, e o sistema não tem auto-cadastro:
quem cria conta é o painel administrativo, que por sua vez exige uma conta com papel
`empresa` para ser acessado.

É um ovo e uma galinha, e ele se resolve **uma única vez**, à mão. Depois disso, toda
conta nasce pelo painel.

---

## Passo 1 — Criar o usuário no Supabase Auth

No painel do Supabase do projeto de **produção**:

1. **Authentication → Users → Add user → Create new user**
2. Preencha:
   - **Email:** o e-mail do administrador da Casa Pronta
   - **Password:** uma senha forte, guardada no gerenciador de senhas
   - **Auto Confirm User:** ✅ **marcado** — sem isso a pessoa não consegue entrar
3. **Create user**

> O trigger `on_auth_user_created` cria o `profile` automaticamente. Como o painel do
> Supabase não envia `user_metadata`, o papel cai no padrão **`inquilino`** — o de menor
> privilégio. É intencional: um papel alto não deve nascer por acidente.

---

## Passo 2 — Promover a conta a `empresa`

No **SQL Editor** do mesmo projeto, trocando o e-mail:

```sql
update public.profiles
set role = 'empresa',
    name = 'Casa Pronta Manutenções (Central)'
where email = 'admin@SEU-DOMINIO.com.br';
```

Confirme que pegou **exatamente uma linha**:

```sql
select id, name, email, role, active
from public.profiles
where role = 'empresa';
```

---

## Passo 3 — Entrar e usar o painel

1. Acesse a aplicação e entre com esse e-mail e senha.
2. Você cai na central; o botão **Administração** aparece no cabeçalho.
3. Cadastre nesta ordem — ela é a ordem de dependência:
   1. **Imobiliária**
   2. **Imóvel** (pertence a uma imobiliária)
   3. **Inquilino** (vinculado a um imóvel)
   4. **Técnicos** (independentes)

A partir daqui nada mais é feito por SQL.

---

## Por que não automatizamos isto

Três caminhos foram considerados:

**Seed de produção.** Colocaria uma senha conhecida numa migration versionada. Todo
mundo com acesso ao repositório teria a credencial do administrador.

**Variável de ambiente com a senha inicial.** Melhor, mas a senha ficaria no painel da
Vercel, visível a qualquer pessoa com acesso ao projeto, e sobreviveria indefinidamente
a um valor que deveria ser efêmero.

**Endpoint de bootstrap** que cria o primeiro admin se não houver nenhum. É uma rota
pública que cria um superusuário — e toda proteção que se coloque nela é mais frágil do
que simplesmente não existir.

Um procedimento manual de dois minutos, executado uma vez na vida do sistema, é mais
seguro do que qualquer automação aqui.

---

## Em desenvolvimento

Nada disso é necessário: o `supabase/seed.sql` já cria `admin@casapronta.com.br` com
papel `empresa` e senha `senha123`. Esse seed **nunca** é aplicado em produção — o
`db push` não o envia.

---

## Se perder o acesso do administrador

Enquanto houver **outra** conta `empresa`, ela cria a reposição pelo painel.

Se for a única, o caminho é o mesmo do passo 2: promover outra conta existente via SQL
Editor, ou redefinir a senha em **Authentication → Users → ⋮ → Send password recovery**.

Recomendação: mantenha **duas** contas `empresa` desde o início. Perder a única
significa voltar ao SQL Editor.
