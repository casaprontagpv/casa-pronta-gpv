# Banco de dados — Supabase

Schema, políticas RLS, máquina de estados e testes. Tudo versionado em
`migrations/`, aplicado pelo Supabase CLI.

## O que é o "Supabase local"

O Supabase é um Postgres com alguns serviços em volta (autenticação, API REST,
Storage, Realtime, um painel web). O `supabase start` reproduz esse conjunto
inteiro na sua máquina como **12 containers Docker**, para que schema, RLS e
testes sejam desenvolvidos sem tocar em nenhum projeto na nuvem.

**Pegada em disco: ~5,8 GB de imagens** (o Postgres tem 1,3 GB, o Studio 1,2 GB,
o Storage 807 MB) **+ ~90 MB do volume de dados.** As imagens ficam no cache do
Docker mesmo com tudo parado; `npm run db:purge` remove.

Os 12 containers:

| Container                             | Para quê                                               |
| ------------------------------------- | ------------------------------------------------------ |
| `db`                                  | O Postgres. É o único que guarda dado.                 |
| `auth`                                | GoTrue — login, sessão, JWT                            |
| `rest`                                | PostgREST — a API que o supabase-js consome            |
| `storage`                             | Upload e download de arquivos                          |
| `realtime`                            | Assinaturas de mudança em tabela                       |
| `kong`                                | Gateway na porta 54321, na frente de todos os acima    |
| `studio`                              | Painel web (localhost:54323)                           |
| `pg_meta`                             | API de introspecção que o Studio usa                   |
| `inbucket`                            | Caixa de e-mail falsa, para ver convites e recuperação |
| `vector`, `analytics`, `edge_runtime` | Logs e Edge Functions — não usamos, mas sobem junto    |

**Nada disso é necessário para rodar o app.** `npm run dev` funciona sem Docker;
o front-end ainda lê do `localStorage`. O banco local só é preciso para mexer no
schema ou rodar os testes pgTAP.

## Ciclo de vida

```bash
npm run db:start    # sobe (requer Docker)
npm run db:status   # o que está de pé
npm run db:test     # sobe se preciso, testa, e encerra se não estava de pé antes
npm run db:stop     # para e remove os containers, mantendo os dados
npm run db:down     # idem, mas descarta também o volume
npm run db:purge    # remove tudo, inclusive as ~5,8 GB de imagens
```

O Studio fica em <http://localhost:54323>.

### ⚠️ Por que existe o `scripts/db.sh` em vez de chamar a CLI direto

A CLI do Supabase cria os containers com **`restart: unless-stopped`**. Isso faz
com que eles **voltem sozinhos toda vez que o daemon do Docker sobe** — inclusive
dias depois, sem ninguém pedir, consumindo CPU e memória em segundo plano. Parar
pelo botão do Docker Desktop não resolve: o container só é parado, não removido,
e o próximo start do daemon o ressuscita.

`npm run db:start` passa `docker update --restart=no` nos containers do projeto
logo após subir. A partir daí eles só rodam quando você mandar.

Se em algum momento aparecerem containers `supabase_*_casa-pronta` que você não
subiu, `npm run db:stop` resolve — ele remove, não apenas para.

O script age **apenas** sobre containers com o label
`com.supabase.cli.project=casa-pronta`. Nunca use `docker system prune` para
limpar isto: levaria junto os volumes dos seus outros projetos.

## Alternativa: não usar Docker

Dá para trabalhar direto contra um projeto Supabase na nuvem, sem nada local:

```bash
npx supabase link --project-ref <ref>
npm run db:push      # aplica as migrations no projeto remoto
```

O que se perde: os testes pgTAP (`supabase test db` exige banco local) e a
possibilidade de recriar o banco do zero em segundos. Para mexer em RLS, o ciclo
local é bem mais rápido e não arrisca o banco compartilhado.

## Estrutura

```
migrations/
  …120000_extensions_and_enums.sql   btree_gist, enums espelhando types.ts, sequência de protocolo
  …120100_tables.sql                 14 tabelas, índices, constraint EXCLUDE da agenda
  …120200_auth_helpers.sql           auth_role(), can_read_ticket() e afins
  …120300_rls.sql                    políticas de todas as tabelas
  …120400_state_machine.sql          tabela de transições + trigger
  …120500_rpc.sql                    casos de uso transacionais
  …120600_storage.sql                bucket privado de fotos e suas políticas
  …120700_profile_provisioning.sql   cria o profile junto com o usuário do Auth
  …120800_pgtap.sql                  extensão de teste
seed.sql                             dados de demonstração — NUNCA em produção
tests/
  _helpers.psql                      autenticação simulada (não é suíte; daí a extensão)
  01_isolamento.test.sql             27 asserções de RLS
  02_maquina_estados.test.sql        18 asserções de fluxo e orçamento
  03_agenda.test.sql                 12 asserções de conflito
```

## As três garantias que o banco dá

**Isolamento por papel.** `01_isolamento.test.sql` cobre uma asserção por regra do
`CLAUDE.md` §6. A mais importante: o inquilino do Apto 402 não enxerga o chamado do
Apto 201 no mesmo prédio — era exatamente esse o vazamento do protótipo.

**Ordem do fluxo.** Nenhum chamado pula etapa. A tabela `ticket_status_transitions`
define quem pode mover o quê, e o trigger recusa o resto.

**Agenda sem sobreposição.** A constraint `EXCLUDE USING gist` torna impossível dois
atendimentos sobrepostos no mesmo técnico, mesmo com dois operadores agendando no
mesmo instante. Encostar não é sobrepor: 09–11 e 11–13 convivem.

## Publicando no projeto remoto

```bash
npx supabase link --project-ref <ref>   # pede a senha do banco; não vai para o repositório
npm run db:push
```

`seed.sql` **não** é enviado pelo `db:push` — ele existe só para desenvolvimento.

## Ao alterar o schema

1. Crie a migration: `npx supabase migration new <nome>`
2. Escreva o SQL. Migration aplicada nunca se edita — crie outra.
3. `npm run db:test` — as suítes precisam continuar verdes.
4. `npm run db:types` se mexeu em tabela ou enum.
5. Se mexeu em enum, `npm run typecheck` acusa divergência com `src/types.ts`
   (ver `src/lib/schemaContract.test.ts`).

## Usuários do seed

Senha de todos: `senha123`.

| E-mail                             | Papel       | Contexto                        |
| ---------------------------------- | ----------- | ------------------------------- |
| `mariana.costa@email.com`          | inquilino   | Rua das Acácias, 450 — Apto 402 |
| `andre.siqueira@email.com`         | inquilino   | Mesmo prédio, Apto 201          |
| `roberto.nunes@email.com`          | inquilino   | Av. Paulista, 1200              |
| `camila.toledo@email.com`          | inquilino   | Imóvel da **outra** imobiliária |
| `gestao@aliancaimoveis.com.br`     | imobiliaria | Aliança — 3 imóveis             |
| `contato@solarimoveis.com.br`      | imobiliaria | Solar — 1 imóvel                |
| `admin@casapronta.com.br`          | empresa     | Central da prestadora           |
| `carlos.santos@casapronta.com.br`  | prestador   | Equipe Hidráulica               |
| `jose.lima@casapronta.com.br`      | prestador   | Equipe Elétrica                 |
| `carlos.eduardo@casapronta.com.br` | prestador   | Outro Carlos, sem chamado algum |

Os quatro últimos casos não são decorativos: André e Carlos Eduardo existem no seed
exatamente para que as suítes provem que os vazamentos do protótipo não voltaram.
