# Casa Pronta — Gestão de Manutenções

Plataforma web (PWA) que organiza o ciclo completo de **manutenção predial em imóveis de locação**,
conectando inquilino, imobiliária, empresa prestadora e técnico de campo em uma linha do tempo única
e auditável por chamado.

> **Estado atual:** o **banco já existe** (Supabase: schema, RLS, máquina de estados, 57 testes
> pgTAP), mas o front-end **ainda lê do `localStorage`** — a ligação entre os dois é a Etapa 4.
> Ver [`docs/PLANO-MIGRACAO.md`](docs/PLANO-MIGRACAO.md).

## Rodando localmente

Requer Node.js 20+.

```bash
npm install
npm run dev          # http://localhost:3000
```

## Scripts

| Comando             | O que faz                                               |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                             |
| `npm run build`     | Build de produção em `dist/`                            |
| `npm run preview`   | Serve o build localmente                                |
| `npm run typecheck` | `tsc --noEmit`                                          |
| `npm run lint`      | ESLint                                                  |
| `npm run lint:fix`  | ESLint com correção automática                          |
| `npm run format`    | Prettier                                                |
| `npm run test`      | Vitest                                                  |
| `npm run check`     | typecheck + lint + test + build (o mesmo que o CI roda) |
| `npm run db:start`  | Sobe o Postgres local — 1 container (requer Docker)     |
| `npm run db:test`   | Reset do banco + suíte pgTAP                            |
| `npm run db:types`  | Regenera os tipos TypeScript a partir do schema         |

## Variáveis de ambiente

Nenhuma é obrigatória no escopo atual. Ver [`.env.example`](.env.example).

## Documentação

| Documento                                                  | Conteúdo                                                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)                                   | **Comece por aqui.** Domínio, regras de negócio, máquina de estados, isolamento de dados, convenções de código |
| [`docs/PLANO-MIGRACAO.md`](docs/PLANO-MIGRACAO.md)         | Plano de migração para Vercel + Supabase                                                                       |
| [`docs/LACUNAS-FUNCIONAIS.md`](docs/LACUNAS-FUNCIONAIS.md) | O que o sistema **não** faz, por decisão                                                                       |
| [`docs/GUIA-GOOGLE-CLOUD.md`](docs/GUIA-GOOGLE-CLOUD.md)   | Limpeza do projeto Google herdado do AI Studio                                                                 |
| [`supabase/README.md`](supabase/README.md)                 | Schema, RLS, testes pgTAP e como rodar o banco localmente                                                      |

## Stack

React 19 · TypeScript 5.8 · Vite 6 · Tailwind CSS v4 · lucide-react

Estado de domínio centralizado em `src/context/AppContext.tsx` — toda mutação passa por ele.
