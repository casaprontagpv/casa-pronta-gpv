# Casa Pronta — Gestão de Manutenções

Plataforma web (PWA) que organiza o ciclo completo de **manutenção predial em imóveis de locação**,
conectando inquilino, imobiliária, empresa prestadora e técnico de campo em uma linha do tempo única
e auditável por chamado.

**No ar:** <https://casa-pronta-gpv.vercel.app> · React 19 · TypeScript · Vite · Tailwind v4 ·
Supabase (Postgres com RLS, Auth, Storage, Realtime) · Vercel.

## Rodando localmente

Requer Node.js 20+ e Docker (para o Supabase local).

```bash
npm install
cp .env.example .env.local   # preencha com a saída de `npm run db:start:app`
npm run db:start:app         # Supabase local: Postgres, Auth, REST, Storage, Realtime
npm run dev                  # http://localhost:3000
```

Usuários de demonstração e senhas do seed: [`supabase/README.md`](supabase/README.md).

## Scripts

| Comando                      | O que faz                                                     |
| ---------------------------- | ------------------------------------------------------------- |
| `npm run dev`                | Servidor de desenvolvimento                                   |
| `npm run build`              | Build de produção em `dist/`                                  |
| `npm run check`              | typecheck + lint + test + build — o mesmo que o CI roda       |
| `npm run test`               | Vitest (as suítes `*.integration.test.ts` exigem banco no ar) |
| `npm run db:start:app`       | Supabase local, perfil completo para o app                    |
| `npm run db:reset`           | Recria o banco: migrations + seed                             |
| `npm run db:test`            | Suíte pgTAP, com reset antes                                  |
| `npm run db:stop`            | Desliga os containers do projeto                              |
| `npm run db:push`            | Publica as migrations no projeto remoto                       |
| `npm run db:types`           | Regenera os tipos TypeScript a partir do schema               |
| `npm run verificar:producao` | Teste de fumaça contra o ambiente no ar                       |

> **Ordem entre as suítes:** rode `db:test` (pgTAP) **antes** das suítes de integração, ou
> `db:reset` entre as duas. O pgTAP mede contagens exatas contra o seed, e a integração cria
> chamados de verdade.

## Documentação

| Documento                                                  | Conteúdo                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)                                   | **Comece por aqui.** Domínio, regras de negócio, máquina de estados, isolamento, convenções |
| [`docs/ESTADO-DO-PROJETO.md`](docs/ESTADO-DO-PROJETO.md)   | O que está no ar, o que falta, roteiro de ensaio antes do piloto, decisões em vigor         |
| [`docs/LACUNAS-FUNCIONAIS.md`](docs/LACUNAS-FUNCIONAIS.md) | O que o sistema **não** faz, por decisão, e o backlog por ordem de impacto                  |
| [`docs/DEPLOY.md`](docs/DEPLOY.md)                         | Operação: Vercel, variáveis, publicação de migration, cabeçalhos de segurança               |
| [`docs/PRIMEIRO-ADMIN.md`](docs/PRIMEIRO-ADMIN.md)         | Como nasce a primeira conta num banco vazio, e como recuperar o acesso                      |
| [`supabase/README.md`](supabase/README.md)                 | Schema, RLS, testes pgTAP e o banco local                                                   |

## Arquitetura em três frases

A autorização é do **banco**: 38 políticas RLS decidem o que cada papel enxerga, e nenhuma consulta
do front filtra por usuário. Toda mutação de domínio passa por uma **função transacional** no
Postgres, que grava registro, evento de timeline e notificações numa operação só. A **timeline é
append-only** por ausência de política de `UPDATE` e `DELETE` — é o que transforma "histórico
auditável" de promessa em garantia.
