# Deploy — Vercel + Supabase

Runbook de publicação. A configuração fica em [`vercel.json`](../vercel.json);
as variáveis, em [`.env.example`](../.env.example).

> **Estado:** infraestrutura preparada, **nada publicado em produção**. Por decisão,
> nenhuma URL vai ao ar enquanto o login for de demonstração — a primeira publicação
> acontece junto com a autenticação real.

---

## Ambientes

| Ambiente        | Onde                          | Supabase                                           |
| --------------- | ----------------------------- | -------------------------------------------------- |
| Desenvolvimento | `npm run dev` na máquina      | Local, em Docker (`db:start`)                      |
| Homologação     | Preview da Vercel, por branch | Projeto `casa-pronta` (sa-east-1)                  |
| Produção        | Domínio final                 | Projeto próprio, criado na última etapa do Marco 1 |

Homologação e produção **não compartilham banco**. Enquanto o produto não está no ar,
o projeto `sa-east-1` serve como homologação; o de produção nasce limpo, sem seed.

---

## Primeira configuração na Vercel

1. <https://vercel.com/new> → importar o repositório.
2. **Framework:** Vite (detectado automaticamente). Build, output e install vêm do `vercel.json`.
3. **Environment Variables** — em Project Settings → Environment Variables:

   | Variável                    | Ambientes           | Valor                                   |
   | --------------------------- | ------------------- | --------------------------------------- |
   | `VITE_SUPABASE_URL`         | Preview, Production | `https://<ref>.supabase.co`             |
   | `VITE_SUPABASE_ANON_KEY`    | Preview, Production | Project Settings → API → `anon public`  |
   | `SUPABASE_SERVICE_ROLE_KEY` | Production          | Project Settings → API → `service_role` |

   A `service_role` **não** leva prefixo `VITE_`. Com o prefixo ela entraria no bundle
   e qualquer visitante teria acesso irrestrito ao banco, ignorando toda a RLS.

4. **Deployment Protection** → deixe os previews protegidos enquanto o produto não estiver no ar.

### Depois do primeiro deploy

O banco de produção nasce sem nenhum usuário, e o sistema não tem auto-cadastro.
Ver [`PRIMEIRO-ADMIN.md`](./PRIMEIRO-ADMIN.md) — é um procedimento manual de dois
minutos, executado uma vez na vida do sistema.

---

## Publicando o banco

As migrations vão para o Supabase pela CLI, não pela Vercel:

```bash
npx supabase login                               # uma vez, no seu terminal (precisa de TTY)
npx supabase link --project-ref <ref>            # pede a senha do banco no prompt
npm run db:push                                  # aplica as migrations
```

`seed.sql` **nunca** vai junto — ele cria usuários com senha conhecida e existe só para
desenvolvimento.

Depois de qualquer migration nova:

```bash
npm run db:test      # as 57 asserções pgTAP precisam passar antes
npm run db:push
npm run db:types     # regenera src/lib/database.types.ts
```

---

## Cabeçalhos de segurança

Definidos no `vercel.json` e aplicados a todas as respostas:

| Cabeçalho                   | Para quê                                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | Restringe de onde o app carrega script, estilo, fonte, imagem e conexão. Bloqueia injeção de script de terceiros |
| `Strict-Transport-Security` | Força HTTPS por 2 anos, inclusive em subdomínios                                                                 |
| `X-Frame-Options: DENY`     | Impede que o app seja embutido em iframe (clickjacking)                                                          |
| `X-Content-Type-Options`    | Impede o navegador de adivinhar tipo de conteúdo                                                                 |
| `Referrer-Policy`           | Não vaza a URL completa (que contém protocolo do chamado) para sites externos                                    |
| `Permissions-Policy`        | Libera câmera e geolocalização só para o próprio app; bloqueia microfone e pagamento                             |

### Ao mexer na CSP

A política atual cobre exatamente o que o app usa hoje:

- `fonts.googleapis.com` e `fonts.gstatic.com` — as fontes do `index.html`
- `images.unsplash.com` — fotos do seed de demonstração
- `*.supabase.co` — API, Storage e o WebSocket do realtime (`wss:`)
- `data:` e `blob:` em `img-src` — pré-visualização de foto antes do upload

`wa.me` e `google.com/maps` **não** aparecem: são destinos de link, não requisições.

Se adicionar qualquer recurso externo, a CSP precisa ser atualizada junto — senão o
navegador bloqueia em silêncio e o erro só aparece no console de quem estiver usando.

### Cache

`/assets/*` tem hash no nome e é imutável: um ano de cache. `index.html` e `sw.js`
são sempre revalidados — é o que garante que um deploy novo chegue imediatamente,
o mesmo problema que o service worker tinha na Etapa 1.

---

## Rewrite de SPA

```
/((?!api/).*)  →  /index.html
```

Toda rota que não comece com `api/` cai no `index.html`, para o roteamento do
navegador funcionar em link direto e refresh. A exceção de `api/` preserva as
Vercel Functions do painel administrativo.
