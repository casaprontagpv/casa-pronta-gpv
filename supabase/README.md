# Banco de dados — Supabase

Schema, políticas RLS, máquina de estados e testes. Tudo versionado em
`migrations/`, aplicado pelo Supabase CLI.

## Rodando localmente

Requer **Docker** rodando.

```bash
npm run db:start    # sobe Postgres, Auth, Storage e Studio; aplica migrations + seed
npm run db:test     # reset + suíte pgTAP
npm run db:stop     # derruba os containers
```

O Studio fica em <http://localhost:54323>.

| Comando            | O que faz                                                       |
| ------------------ | --------------------------------------------------------------- |
| `npm run db:reset` | Recria o banco do zero: todas as migrations + `seed.sql`        |
| `npm run db:test`  | Reset seguido dos testes pgTAP                                  |
| `npm run db:diff`  | Mostra divergência entre o banco e as migrations                |
| `npm run db:types` | Regenera `src/lib/database.types.ts` a partir do schema         |
| `npm run db:push`  | Publica as migrations no projeto remoto (exige `supabase link`) |

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
