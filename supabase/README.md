# Banco de dados — Supabase

Schema, políticas RLS, máquina de estados e testes. Tudo versionado em `migrations/`, aplicado
pelo Supabase CLI.

O banco é a especificação executável do domínio: regra de negócio nasce aqui, não no componente.

## O Supabase local

O Supabase é um Postgres com serviços em volta (autenticação, API REST, Storage, Realtime, um
painel web). O `supabase start` reproduz esse conjunto na sua máquina como containers Docker, para
que schema, RLS e testes sejam desenvolvidos sem tocar em nenhum projeto na nuvem.

`npm run dev` **precisa** dele: o front lê e escreve no Postgres.

### Perfis — suba só o que a tarefa exige

O `supabase start` puro sobe 12 containers. Quase nenhum é necessário aqui.

| Comando                 | Containers | Para quê                                                        |
| ----------------------- | ---------- | --------------------------------------------------------------- |
| `npm run db:start`      | **1**      | Postgres. Schema, migrations e testes pgTAP.                    |
| `npm run db:start:app`  | **7**      | + gateway, login, API REST, Storage, realtime e caixa de e-mail |
| `npm run db:start:full` | **10**     | + Studio e a API que ele usa. Inspeção visual.                  |

O Postgres nunca é excluído: é obrigatório e a CLI não permite removê-lo. `pg_prove` não aparece
na conta porque não é serviço — sobe e morre a cada teste.

**O front-end e as suítes de integração exigem o perfil APP.**

### O que não sobe em perfil nenhum

Desligado direto no `config.toml`, não só nas flags, para que as imagens não voltem a ser baixadas:

| Serviço        | Tamanho | Por que não usamos                                          |
| -------------- | ------- | ----------------------------------------------------------- |
| `edge-runtime` | 686 MB  | O projeto usa Vercel Functions, não Supabase Edge Functions |
| `logflare`     | 615 MB  | Pipeline de logs; `docker logs` resolve no local            |
| `vector`       | 137 MB  | Coletor que só alimenta o logflare                          |
| `supavisor`    | —       | Pooler de conexão, relevante só em produção                 |
| `imgproxy`     | —       | Transformação de imagem, recurso pago                       |

`npm run db:trim` remove essas imagens do cache.

A imagem do Postgres tem 1,3 GB porque não é um Postgres comum — vem compilada com as extensões de
que a plataforma depende (`pgtap`, `pgsodium`, `pgjwt`, `pg_graphql`, `supautils`). Um
`postgres:17-alpine` não serve, e a CLI fixa a imagem: não há reaproveitamento possível. Com o trim
aplicado são ~4,5 GB de imagens, mais ~90 MB do volume de dados. `npm run db:purge` remove tudo.

## Ciclo de vida

```bash
npm run db:start:app  # perfil do app (requer Docker)
npm run db:status     # o que está de pé e a política de reinício
npm run db:reset      # recria o banco: migrations + seed
npm run db:test       # sobe se preciso, roda o pgTAP, e encerra se não estava de pé antes
npm run db:stop       # para e remove os containers, mantendo os dados
npm run db:down       # idem, mas descarta também o volume
npm run db:trim       # remove as imagens que nenhum perfil usa
npm run db:purge      # remove tudo, inclusive as imagens em uso
```

O Studio, quando ligado, fica em <http://localhost:54323>.

### ⚠️ Use os scripts, não a CLI direto

A CLI do Supabase cria os containers com **`restart: unless-stopped`**: eles voltam sozinhos toda
vez que o daemon do Docker sobe, inclusive dias depois, sem ninguém pedir. Parar pelo botão do
Docker Desktop não resolve — o container é parado, não removido, e o próximo start o ressuscita.

`scripts/db.sh` aplica `docker update --restart=no` logo após subir. A partir daí eles só rodam
quando você mandar, e `npm run db:stop` remove de verdade.

O script age **apenas** sobre containers com o label `com.supabase.cli.project=casa-pronta`.
**Nunca** use `docker system prune` nesta máquina: levaria junto os volumes de outros projetos.

## Estrutura

```
migrations/
  …120000_extensions_and_enums.sql   btree_gist, enums espelhando types.ts, sequência de protocolo
  …120100_tables.sql                 14 tabelas, índices, constraint EXCLUDE da agenda
  …120200_auth_helpers.sql           auth_role(), can_read_ticket() e afins
  …120300_rls.sql                    38 políticas, de todas as tabelas
  …120400_state_machine.sql          tabela de transições + trigger
  …120500_rpc.sql                    casos de uso transacionais
  …120600_storage.sql                bucket privado de fotos e suas políticas
  …120700_profile_provisioning.sql   cria o profile junto com o usuário do Auth
  …120800_pgtap.sql                  extensão de teste
  …010000_autoria_por_default.sql    auth.uid() como default das colunas de autoria
  …020000_realtime.sql               publicação supabase_realtime
seed.sql                             dados de demonstração — NUNCA em produção
tests/
  _helpers.psql                      autenticação simulada (não é suíte; daí a extensão)
  01_isolamento.test.sql             27 asserções de RLS
  02_maquina_estados.test.sql        18 asserções de fluxo e orçamento
  03_agenda.test.sql                 12 asserções de conflito
```

## As garantias que o banco dá

**Isolamento por papel.** `01_isolamento.test.sql` cobre uma asserção por regra do `CLAUDE.md` §6.
A mais importante: o inquilino do Apto 402 não enxerga o chamado do Apto 201 no mesmo prédio.

**Ordem do fluxo.** Nenhum chamado pula etapa. A tabela `ticket_status_transitions` define quem
pode mover o quê, e o trigger recusa o resto.

**Agenda sem sobreposição.** A constraint `EXCLUDE USING gist` torna impossível dois atendimentos
sobrepostos no mesmo técnico, mesmo com dois operadores agendando no mesmo instante. Encostar não é
sobrepor: 09–11 e 11–13 convivem.

**Timeline append-only.** `ticket_timeline` tem `SELECT` e `INSERT`, e não tem `UPDATE` nem
`DELETE`. A ausência é a garantia.

**Autoria não forjável.** As colunas de autoria têm `auth.uid()` como default, e a política recusa
valor diferente — não dá para atribuir um anexo ou uma mensagem a outra pessoa.

## Ao alterar o schema

1. Crie a migration: `npx supabase migration new <nome>`
2. Escreva o SQL. Migration aplicada nunca se edita — crie outra.
3. `npm run db:test` — as suítes precisam continuar verdes.
4. `npm run db:types` se mexeu em tabela ou enum.
5. Se mexeu em enum, `npm run typecheck` acusa divergência com `src/types.ts`
   (ver `src/lib/schemaContract.test.ts`).
6. `npm run db:push` publica no projeto remoto.

> **Configuração de Auth não mora aqui.** O `config.toml` vale só para o ambiente local; o
> `db push` envia migrations, não configuração. Cadastro público, URLs de redirecionamento e SMTP
> são painel do Supabase — ver [`../docs/DEPLOY.md`](../docs/DEPLOY.md).

## Usuários do seed

Senha de todos: `senha123`. Só existem no banco local.

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

André, Camila e Carlos Eduardo não são decorativos: existem para que as suítes provem o isolamento
entre vizinhos de andar, entre imobiliárias e entre técnicos de nome parecido.

> Ao mexer no seed: as colunas de token do `auth.users` (`confirmation_token`, `recovery_token` e
> companhia) precisam ser string **vazia**, não `NULL`. O GoTrue lê todas como `string` e quebra o
> login com _"converting NULL to string is unsupported"_ — e o default da tabela é `NULL`.
