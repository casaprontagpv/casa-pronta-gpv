# Banco de dados — Supabase

Schema, políticas RLS, máquina de estados e testes. Tudo versionado em
`migrations/`, aplicado pelo Supabase CLI.

## O que é o "Supabase local"

O Supabase é um Postgres com serviços em volta (autenticação, API REST, Storage,
Realtime, um painel web). O `supabase start` reproduz esse conjunto na sua máquina
como containers Docker, para que schema, RLS e testes sejam desenvolvidos sem
tocar em nenhum projeto na nuvem.

**`npm run dev` não precisa de nada disso.** O front-end ainda lê do
`localStorage`; o banco local só é necessário para mexer no schema ou rodar os
testes pgTAP.

### Perfis — suba só o que a tarefa exige

O `supabase start` puro sobe **12 containers**. Quase nenhum é necessário hoje.

| Comando                 | Containers | Para quê                                                  |
| ----------------------- | ---------- | --------------------------------------------------------- |
| `npm run db:start`      | **1**      | Postgres. Schema, migrations e testes pgTAP.              |
| `npm run db:start:app`  | **6**      | + gateway, login, API REST, realtime, e-mail. Etapas 3–4. |
| `npm run db:start:full` | **10**     | + Studio e a API que ele usa. Inspeção visual.            |

O Postgres nunca é excluído: é obrigatório e a CLI não permite removê-lo.
`pg_prove` não aparece na conta porque não é serviço — sobe e morre a cada teste.

### O que não sobe em perfil nenhum

Desligado direto no `config.toml`, não só nas flags:

| Serviço        | Tamanho | Por que não usamos                                        |
| -------------- | ------- | --------------------------------------------------------- |
| `edge-runtime` | 686 MB  | O plano usa Vercel Functions, não Supabase Edge Functions |
| `logflare`     | 615 MB  | Pipeline de logs; `docker logs` resolve no local          |
| `vector`       | 137 MB  | Coletor que só alimenta o logflare                        |
| `supavisor`    | —       | Pooler de conexão, relevante só em produção               |
| `imgproxy`     | —       | Transformação de imagem, recurso pago                     |

`npm run db:trim` remove essas imagens do cache. Como os serviços estão
desligados na configuração, elas não voltam a ser baixadas.

### Por que a imagem do Postgres tem 1,3 GB

Não é um Postgres comum — é compilado com as extensões de que a plataforma
depende (`pgtap`, `pgsodium`, `pgjwt`, `pg_graphql`, `supautils`, entre outras).
Um `postgres:17-alpine` não serve: não traz nenhuma delas. E a CLI **fixa** a
imagem: `config.toml` não oferece como trocá-la. Não há reaproveitamento possível
de uma imagem Postgres que você já tenha.

### Pegada em disco

~4,5 GB de imagens com o trim aplicado, dos quais 1,3 GB é o Postgres e 1,23 GB
o Studio. Mais ~90 MB do volume de dados. `npm run db:purge` remove tudo.

## Ciclo de vida

```bash
npm run db:start    # perfil mínimo (requer Docker)
npm run db:status   # o que está de pé e a política de reinício
npm run db:test     # sobe se preciso, testa, e encerra se não estava de pé antes
npm run db:stop     # para e remove os containers, mantendo os dados
npm run db:down     # idem, mas descarta também o volume
npm run db:trim     # remove as imagens que nenhum perfil usa
npm run db:purge    # remove tudo, inclusive as imagens em uso
```

O Studio, quando ligado, fica em <http://localhost:54323>.

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
