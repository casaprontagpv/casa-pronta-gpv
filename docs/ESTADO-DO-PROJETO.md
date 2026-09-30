# Estado do projeto e próximos passos

Documento vivo. Serve a dois leitores:

1. **Você**, para saber onde o projeto está e o que depende de uma ação sua.
2. **Uma conversa nova**, sem o histórico das anteriores. Cada tarefa pendente
   da §4 é escrita para ser colada isolada num chat limpo: tem objetivo,
   arquivos, critério de pronto e as armadilhas conhecidas.

Última atualização: **2026-09-30**.

---

## 1. Onde o projeto está

O protótipo virou aplicação. O `localStorage` saiu, o Postgres entrou, e o
isolamento entre inquilinos, imobiliárias e prestadora deixou de ser filtro de
tela para ser política do banco.

Funcionando de ponta a ponta, contra o Supabase real:

- Login com Supabase Auth, sessão persistida, recuperação e troca de senha.
- Painel administrativo: imobiliárias, imóveis, inquilinos e técnicos, com
  criação de usuário via `service_role` numa função de servidor.
- Ciclo completo do chamado: abertura → análise → parecer → orçamento →
  aprovação → agenda → execução → conclusão → aceite → avaliação.
- Fotos em bucket **privado**, com redução no cliente e URL assinada.
- Timeline, chat e notificações **ao vivo** — a página se atualiza sozinha.

**No ar desde 2026-09-30:** <https://casa-pronta-gpv.vercel.app>.
Falta a primeira conta para que alguém consiga entrar — ver §4.1.

---

## 2. O mapa rápido

| Onde                  | O quê                                                                   |
| --------------------- | ----------------------------------------------------------------------- |
| `CLAUDE.md`           | Regra de negócio. **Leia primeiro.** É a fonte do domínio               |
| `supabase/migrations` | O schema, a RLS, a máquina de estados e as RPCs                         |
| `supabase/tests`      | pgTAP — 57 asserções de isolamento, estados e agenda                    |
| `src/data`            | A camada de acesso: consultas, RPCs, fotos, realtime                    |
| `src/context`         | `AppContext` — orquestra estado e ações; componente nunca chama o banco |
| `api/`                | Vercel Functions. Hoje só o endpoint administrativo                     |
| `docs/`               | Plano, lacunas funcionais, deploy, primeiro admin, este arquivo         |

Comandos que importam:

```bash
npm run dev            # front em :3000 (precisa do Supabase local no ar)
npm run check          # typecheck + lint + testes + build — o mesmo do CI
npm run db:start:app   # Supabase local, perfil APP (Postgres, Auth, REST, Storage, Realtime)
npm run db:reset       # recria o banco: migrations + seed
npm run db:test        # pgTAP, com reset antes e devolvendo a máquina como estava
npm run db:stop        # desliga os containers
```

> **Ordem obrigatória entre as suítes.** O pgTAP mede coisas do tipo "a inquilina
> enxerga EXATAMENTE 1 chamado", contra o seed. As suítes de integração abrem
> chamados de verdade. Rode **pgTAP antes** da integração, ou `db:reset` entre as
> duas. O CI faz nessa ordem; é a mesma razão.

---

## 3. O que já está pronto

| Entrega                      | Commit               | O que garante                                                                      |
| ---------------------------- | -------------------- | ---------------------------------------------------------------------------------- |
| Higienização e defeitos      | `a62d933`            | Saiu o Google AI Studio; 18 defeitos corrigidos, com teste de regressão nos graves |
| Fundação Supabase            | `e2066b4`            | 17 tabelas com RLS, 38 políticas, máquina de estados em trigger, 13 RPCs           |
| Ciclo de vida dos containers | `f9d436f`, `b3b4485` | `scripts/db.sh` — perfis e fim do auto-restart eterno                              |
| Trilho de produção           | `188fd3f`, `b623ed8` | Schema publicado em São Paulo; `vercel.json` com CSP e HSTS                        |
| Autenticação                 | `4d4f7f1`            | Supabase Auth; fim das senhas `123`/`admin` e do login por nome parcial            |
| Painel administrativo        | `8d66d25`            | Criação de usuário com `service_role`, atrás de verificação de papel no banco      |
| Camada de dados              | `b9b4dea`            | `localStorage` fora; timeline e chat passam a ser compartilhados de verdade        |
| Fotos no Storage             | `c9bda57`            | Bucket privado, redução no cliente, URL assinada, EXIF descartado                  |
| Realtime                     | `ba53f54`            | Timeline, chat e notificações ao vivo, com a RLS valendo também no WebSocket       |
| Primeiro deploy              | `d564f43`            | No ar na Vercel, com CSP, HSTS e a `service_role` comprovadamente fora do bundle   |

**Verificação atual:** 131 testes de front (106 de unidade + 25 de integração),
57 asserções pgTAP, `supabase db diff` limpo, build passando.

**Banco de produção:** `cwigtsefbiajqfxqiqaa` (`sa-east-1`, São Paulo).
11 migrations aplicadas. O `seed.sql` **não** foi aplicado lá, de propósito: o
banco de produção nasce vazio.

---

## 4. O que falta

### 4.1 ✅ Publicado · falta a primeira conta

**No ar:** <https://casa-pronta-gpv.vercel.app> · repositório
`casaprontagpv/casa-pronta-gpv`, branch de produção `main`.

Variáveis cadastradas na Vercel (as únicas que o código lê — `src/lib/supabase.ts`
e `api/_lib/adminAuth.ts`):

| Variável                    | Escopo                | Observação                                        |
| --------------------------- | --------------------- | ------------------------------------------------- |
| `VITE_SUPABASE_URL`         | Preview + Production  | `https://cwigtsefbiajqfxqiqaa.supabase.co`        |
| `VITE_SUPABASE_ANON_KEY`    | Preview + Production  | Pública por design; protegida pela RLS            |
| `SUPABASE_SERVICE_ROLE_KEY` | **Production apenas** | **Sem** prefixo `VITE_`. Ignora a RLS por inteiro |

Conferido contra o deploy real, não deduzido:

- Rewrite de SPA respondendo em rota profunda (`/admin`, `/login`, `/nova-senha`).
- Os seis cabeçalhos de segurança do `vercel.json` presentes, com
  `connect-src` liberando `wss://*.supabase.co` — é o que o realtime precisa.
- `/api/admin/users`: `405` no GET, `401` no POST sem sessão. Recusa, não some.
- **A `service_role` não está no bundle.** Verificado por busca no JavaScript
  servido; lá estão só a URL e a anon key, ambas públicas por design.

**O que ainda falta — e é seu:** criar a conta do primeiro administrador
seguindo [`PRIMEIRO-ADMIN.md`](./PRIMEIRO-ADMIN.md). O banco de produção nasceu
vazio e o sistema não tem auto-cadastro, então hoje ninguém consegue entrar.

> **Pendências de higiene**, nenhuma bloqueante:
>
> - Na tela de criação a Vercel aplica as variáveis aos três ambientes. Restrinja
>   a `SUPABASE_SERVICE_ROLE_KEY` a **Production** em Settings → Environment
>   Variables. Cada branch vira um Preview de URL pública, e a chave que ignora
>   toda a RLS não precisa existir lá.
> - O repositório do GitHub está **público**. Nada vazou — `.env*` está
>   ignorado e não há JWT em arquivo versionado —, mas é uma decisão a tomar de
>   propósito, não por omissão.

---

### 4.2 PWA e service worker · _pronto para tocar isolado_

**Objetivo.** Garantir que o app instalável funcione depois de publicado.

**Situação.** `public/sw.js` foi corrigido na Etapa 1 — _network-first_ para
navegação, _cache-first_ só para `/assets/*`, que tem hash no nome. O registro
está em `src/main.tsx` e só roda em `import.meta.env.PROD`. Nada disso foi
exercitado contra um deploy real, porque não houve deploy.

**A fazer.**

- Verificar a instalação em Android e iOS a partir da URL publicada.
- Confirmar que um deploy novo chega sem precisar desinstalar o app — é o
  defeito que o _network-first_ resolveu e que precisa continuar resolvido.
- Decidir o que o app faz **offline**. Hoje ele abre e não carrega nada, porque
  toda leitura vai ao Supabase. Para um técnico em campo com 4G ruim, uma tela
  honesta de "sem conexão" vale mais do que um app que abre vazio.
- Os atalhos do `manifest.json` ("Novo Chamado", "Minha Agenda") apontam para
  rotas que mudaram na migração para o `react-router`. Conferir.

**Critério de pronto.** Instalar, usar, publicar uma versão nova e ver a versão
nova sem gambiarra.

---

### 4.3 Observabilidade · _pronto para tocar isolado_

**Objetivo.** Saber que quebrou antes de o cliente contar.

**A fazer.** Sentry no frontend (`VITE_SENTRY_DSN` já está previsto no
`.env.example`), com filtro de dados pessoais: este app trata endereço
residencial, telefone e foto do interior da casa de alguém. Nada disso pode ir
para o relatório de erro.

**Cuidado.** O `Content-Security-Policy` do `vercel.json` é restritivo de
propósito. Adicionar o Sentry exige liberar o domínio dele em `connect-src` — e
**só** ele. Se a alteração da CSP virar um `*`, a proteção acabou.

---

### 4.4 Dívidas pequenas, sem urgência

- `Header.tsx` ainda filtra notificações por `targetRoles`. O fan-out passou a
  ser por destinatário e o mapeador devolve `[]`, então o filtro deixa tudo
  passar — é código morto que só confunde quem ler depois.
- O bundle está em **716 kB** (190 kB comprimido). Um `manualChunks` separando
  React e `lucide-react` resolve a maior parte.
- `src/data/datetime.ts` converte data + hora usando o deslocamento fixo
  `-03:00`. Correto para o Brasil de hoje, que não tem horário de verão. Se o
  horário de verão voltar, este é o arquivo a mudar — e o único.
- As métricas da aba "Métricas & Indicadores" da imobiliária continuam
  **fixas no código** (1.8 dias, 92.4%, 4.9★). Está em
  [`LACUNAS-FUNCIONAIS.md`](./LACUNAS-FUNCIONAIS.md); virou decisão consciente,
  não esquecimento. Não apresente esses números como reais.

---

## 5. Decisões que uma conversa nova precisa conhecer

Quem pegar uma tarefa sem o histórico vai tropeçar nestas se não souber:

1. **A RLS é a segurança; a tela é conveniência.** Nenhuma consulta em
   `src/data` filtra por usuário. O que chega já é o que a pessoa pode ver. Se
   você se pegar escrevendo `where tenant_id = ...` no cliente, pare: ou a
   política do banco está errada, ou o filtro é redundante.

2. **Toda mutação passa por RPC.** As funções em
   `20260921120500_rpc.sql` são transacionais: registro, evento de timeline e
   notificações numa operação só. Não existe `insert` solto de domínio a partir
   do cliente.

3. **A timeline é append-only por ausência de política.** `ticket_timeline` tem
   `SELECT` e `INSERT`, e não tem `UPDATE` nem `DELETE`. Isso é o produto, não
   um detalhe: é o que transforma "histórico auditável" de promessa em garantia.
   Negação de `UPDATE` pela RLS é **no-op silencioso**, não exceção — teste
   verificando que o conteúdo não mudou, não que houve erro.

4. **O evento do Realtime é sinal, não dado.** Ver `src/data/realtime.ts`. Ao
   receber, releia pelo caminho normal. Não monte estado a partir do payload.

5. **Formulário não inventa dado.** Campo sem valor nasce vazio. Um default
   "plausível" vira parecer técnico que o técnico não escreveu, ou orçamento que
   ninguém orçou — foram defeitos reais, corrigidos na Etapa 1 (CLAUDE.md §11).

6. **Segredos.** A `service_role` ignora a RLS inteira e vive só nas variáveis
   de ambiente da Vercel, sem prefixo `VITE_`. A `anon key` e o `project ref`
   são públicos por design. Nada de token pessoal do Supabase em conversa.

7. **Docker.** Toda operação filtra por
   `label=com.supabase.cli.project=casa-pronta`. **Nunca** `docker system prune`
   nesta máquina: há volumes de outros projetos.

---

## 6. Como pedir a próxima tarefa a um chat novo

Cole isto, trocando o trecho final:

> Este repositório é o Casa Pronta. Leia `CLAUDE.md` (regra de negócio) e
> `docs/ESTADO-DO-PROJETO.md` (estado atual e decisões em vigor) antes de
> qualquer coisa. Depois execute a tarefa **§4.2 — PWA e service worker**,
> respeitando as decisões da §5. Ao terminar, rode `npm run check`, atualize o
> `docs/ESTADO-DO-PROJETO.md` e faça um commit.
