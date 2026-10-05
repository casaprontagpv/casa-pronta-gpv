# Deploy e operação — Vercel + Supabase

Runbook do ambiente no ar. A configuração da hospedagem fica em
[`vercel.json`](../vercel.json); as variáveis, em [`.env.example`](../.env.example).

| Ambiente        | Onde                         | Banco                                         |
| --------------- | ---------------------------- | --------------------------------------------- |
| Desenvolvimento | `npm run dev` na máquina     | Supabase local, em Docker (`db:start:app`)    |
| Preview         | Deploy por branch, na Vercel | Mesmo projeto Supabase da produção            |
| Produção        | `casa-pronta-gpv.vercel.app` | Supabase `cwigtsefbiajqfxqiqaa` (`sa-east-1`) |

> Preview e produção **compartilham banco**. Enquanto o volume de dados reais for pequeno isso é
> aceitável; a partir do momento em que houver operação de verdade, um projeto Supabase separado
> para preview deixa de ser luxo.

---

## Variáveis de ambiente

São três — as únicas que o código lê (`src/lib/supabase.ts` e `api/_lib/adminAuth.ts`):

| Variável                    | Escopo                | Onde obter                              |
| --------------------------- | --------------------- | --------------------------------------- |
| `VITE_SUPABASE_URL`         | Preview + Production  | Project Settings → API                  |
| `VITE_SUPABASE_ANON_KEY`    | Preview + Production  | Project Settings → API → `anon public`  |
| `SUPABASE_SERVICE_ROLE_KEY` | **Production apenas** | Project Settings → API → `service_role` |

A `service_role` **não** leva prefixo `VITE_`. Com o prefixo ela entraria no bundle, e qualquer
visitante teria acesso irrestrito ao banco, ignorando toda a RLS. Ela também não precisa existir
em Preview: cada branch gera uma URL pública.

Use as chaves **legadas** (JWT, começam com `eyJ`), não as novas `sb_publishable_` / `sb_secret_`:
são as que o ambiente local usa e contra as quais as suítes de integração rodam.

---

## Configuração de Auth — não está no repositório

O `supabase/config.toml` configura o Supabase **local**. O `db push` envia migrations, não
configuração de Auth. Tudo abaixo é painel do Supabase, e precisa ser conferido lá:

| Configuração     | Valor correto                                               | Onde                           |
| ---------------- | ----------------------------------------------------------- | ------------------------------ |
| Cadastro público | **Desligado** — o sistema não tem auto-cadastro             | Authentication → Sign In       |
| Login anônimo    | Desligado                                                   | Authentication → Sign In       |
| Site URL         | `https://casa-pronta-gpv.vercel.app`                        | Authentication → URL Config    |
| Redirect URLs    | `https://casa-pronta-gpv.vercel.app/**`                     | Authentication → URL Config    |
| SMTP             | Provedor próprio — o embutido é limitado e serve só a teste | Authentication → SMTP Settings |

`npm run verificar:producao` confere o cadastro público e o login anônimo sem precisar de sessão, e
falha se alguém reabrir. Rode depois de qualquer mexida no painel.

---

## Publicando

**Front-end:** automático. Todo push em `main` dispara o deploy de produção; outras branches geram
preview. Se o projeto tiver acabado de ser conectado ao repositório, a Vercel não reprocessa o
histórico — é preciso um push novo para o primeiro build acontecer.

**Banco:** pela CLI, nunca pela Vercel.

```bash
npm run db:test      # as 57 asserções pgTAP precisam passar antes
npm run db:push      # aplica as migrations no projeto remoto
npm run db:types     # regenera src/lib/database.types.ts
```

`seed.sql` **nunca** vai junto — ele cria usuários com senha conhecida e existe só para
desenvolvimento. O banco de produção nasce vazio; a primeira conta é criada à mão, ver
[`PRIMEIRO-ADMIN.md`](./PRIMEIRO-ADMIN.md).

---

## Verificando o que está no ar

```bash
npm run verificar:producao
```

Entra pela porta da frente: cadastro público fechado, login, papel do perfil, leitura sob RLS,
conexão do realtime e o endpoint administrativo aceitando a sessão. A senha é pedida no terminal,
não aparece na tela e não é gravada; nada é criado.

Num terminal sem teclado — rodando por dentro de outra ferramenta — as verificações que exigem
sessão são **puladas com aviso**, nunca em silêncio. Para rodá-las assim:

```bash
read -rs CP_SENHA && CP_SENHA=$CP_SENHA npm run verificar:producao
```

---

## Cabeçalhos de segurança

Definidos no `vercel.json` e aplicados a todas as respostas:

| Cabeçalho                   | Para quê                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `Content-Security-Policy`   | Restringe de onde o app carrega script, estilo, fonte, imagem e conexão              |
| `Strict-Transport-Security` | Força HTTPS por 2 anos, inclusive em subdomínios                                     |
| `X-Frame-Options: DENY`     | Impede que o app seja embutido em iframe (clickjacking)                              |
| `X-Content-Type-Options`    | Impede o navegador de adivinhar tipo de conteúdo                                     |
| `Referrer-Policy`           | Não vaza a URL completa (que contém protocolo do chamado) para sites externos        |
| `Permissions-Policy`        | Libera câmera e geolocalização só para o próprio app; bloqueia microfone e pagamento |

### Ao mexer na CSP

A política cobre exatamente o que o app usa:

- `fonts.googleapis.com` e `fonts.gstatic.com` — as fontes do `index.html`
- `images.unsplash.com` — fotos do seed de demonstração
- `*.supabase.co` — API, Storage e o WebSocket do realtime (`wss:`)
- `data:` e `blob:` em `img-src` — pré-visualização de foto antes do upload

`wa.me` e `google.com/maps` **não** aparecem: são destinos de link, não requisições.

Recurso externo novo exige liberar **o domínio dele**, nunca um `*`. Sem isso o navegador bloqueia
em silêncio, e o erro só aparece no console de quem estiver usando.

### Cache

`/assets/*` tem hash no nome e é imutável: um ano de cache. `index.html` e `sw.js` são sempre
revalidados — é o que garante que um deploy novo chegue imediatamente, sem ninguém precisar
desinstalar o PWA.

---

## Rewrite de SPA

```
/((?!api/).*)  →  /index.html
```

Toda rota que não comece com `api/` cai no `index.html`, para o roteamento do navegador funcionar
em link direto e refresh. A exceção de `api/` preserva as Vercel Functions do painel
administrativo.
