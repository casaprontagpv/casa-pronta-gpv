# Estado do projeto

Documento vivo. Serve a dois leitores:

1. **Quem toca o produto**, para saber o que já dá para usar e o que depende de
   uma ação fora do código.
2. **Uma conversa nova**, sem histórico. Cada tarefa da §5 é escrita para ser
   colada isolada: tem objetivo, arquivos, critério de pronto e armadilhas.

Última atualização: **2026-10-05**.

---

## 1. Resumo

**No ar:** <https://casa-pronta-gpv.vercel.app>
**Banco:** Supabase `cwigtsefbiajqfxqiqaa` (`sa-east-1`, São Paulo), 11 migrations aplicadas.
**Repositório:** `casaprontagpv/casa-pronta-gpv`, branch de produção `main`.

O sistema está **publicado, íntegro e praticamente vazio**. Toda a mecânica
existe e está protegida; nenhuma operação real passou por ela ainda.

Para um **piloto controlado** — uma imobiliária, poucos imóveis, inquilinos
avisados — está pronto, desde que o SMTP seja resolvido antes (§5.1). Para
entregar a imobiliárias e deixar rodando sozinho, ainda não: sem notificação que
saia do sistema, o produto depende de as pessoas lembrarem de abrir o site, e
manutenção predial não funciona assim.

---

## 2. O que está pronto

O ciclo completo do chamado: abertura → análise → parecer técnico → orçamento →
aprovação → agendamento → execução → conclusão → aceite do inquilino →
avaliação. Cada passo é uma função transacional no banco, que grava registro,
evento de timeline e notificações numa operação só.

As garantias que sustentam o produto estão no banco, não na tela:

| Garantia                | Como é imposta                                                            |
| ----------------------- | ------------------------------------------------------------------------- |
| Isolamento por papel    | 38 políticas RLS · 27 asserções pgTAP, incluindo o vizinho de andar       |
| Timeline inviolável     | `ticket_timeline` não tem política de `UPDATE` nem `DELETE`               |
| Agenda sem sobreposição | Constraint `EXCLUDE USING gist` sobre `tstzrange`                         |
| Ordem do fluxo          | Trigger contra a tabela `ticket_status_transitions`                       |
| Fotos privadas          | Bucket privado, URL assinada de 1 h, EXIF descartado no cliente           |
| Autoria não forjável    | `auth.uid()` como default de coluna, e política recusando valor diferente |

Além disso: autenticação com Supabase Auth, painel administrativo criando os
quatro tipos de usuário, timeline/chat/notificações ao vivo, e PWA instalável.

**Verificação:** 131 testes de front (106 de unidade + 25 de integração), 57
asserções pgTAP, `supabase db diff` limpo, build passando.

---

## 3. O que está verificado em produção

Conferido contra o ambiente no ar, não deduzido de arquivo de configuração:

- Rewrite de SPA em rota profunda (`/admin`, `/login`, `/nova-senha` com F5).
- Os seis cabeçalhos de segurança, com `connect-src` liberando `wss://*.supabase.co`.
- Cadastro público **fechado** e login anônimo desligado.
- `/api/admin/users` recusando quem não tem sessão (`401`) e método errado (`405`).
- A `service_role` **ausente do bundle** servido ao navegador.

`npm run verificar:producao` repete tudo isso a qualquer momento, e mais: login,
papel do perfil, leitura sob RLS, conexão do realtime e o endpoint
administrativo aceitando uma sessão real. As verificações que exigem senha só
rodam num terminal com teclado — dentro de outra ferramenta elas são **puladas
com aviso**, nunca em silêncio.

---

## 4. O ensaio geral — antes de chamar gente de fora

Vinte minutos, você nos quatro papéis. É a única forma de saber que o fluxo
funciona em produção: até hoje ele só rodou contra o banco local.

**Pré-requisito:** SMTP próprio configurado (§5.1). Sem ele, o passo 3 falha.

### Preparar

1. Entre como a central e abra **Administração**.
2. Cadastre, nesta ordem — ela é a de dependência:
   - **Imobiliária** `ENSAIO — Imobiliária Teste`
   - **Imóvel** vinculado a ela, e um **segundo imóvel**, que é o que prova o isolamento
   - **Inquilino** em cada imóvel. Use dois e-mails seus (o truque `voce+a@gmail.com`
     e `voce+b@gmail.com` entrega os dois na mesma caixa)
   - **Técnico**, com login
3. Anote as senhas temporárias que o painel exibe. Elas aparecem **uma vez**.

### Rodar o ciclo

Abra uma janela anônima por papel, para ter quatro sessões ao mesmo tempo.

| #   | Quem        | Ação                                               | O que observar                                |
| --- | ----------- | -------------------------------------------------- | --------------------------------------------- |
| 1   | Inquilino A | Abre chamado **com foto**                          | A foto aparece depois de salvar               |
| 2   | Central     | Autoriza vistoria e designa o técnico              | Chega na tela do inquilino **sem recarregar** |
| 3   | Técnico     | Salva parecer com `needsQuote`, anexa foto         | Prioridade do chamado muda para a recomendada |
| 4   | Central     | Envia orçamento                                    | —                                             |
| 5   | Imobiliária | **Reprova com motivo**, depois peça outro e aprove | Reprovar sem motivo precisa ser recusado      |
| 6   | Central     | Agenda o técnico                                   | —                                             |
| 7   | Central     | Tenta agendar o **mesmo técnico no mesmo horário** | Precisa ser **recusado pelo banco**           |
| 8   | Inquilino A | Confirma presença                                  | —                                             |
| 9   | Técnico     | Inicia e registra conclusão com fotos antes/depois | —                                             |
| 10  | Inquilino A | Confirma realização e avalia                       | Chamado fecha com timeline completa           |

### Provar o isolamento — o passo que não pode falhar

11. Entre como **Inquilino B** e confirme que ele **não enxerga** o chamado do
    Inquilino A, nem a foto, nem o chat.
12. Copie a URL da foto assinada da sessão do A e abra na sessão do B: tem que
    falhar. A assinatura vale uma hora, então o teste é honesto.

### Verificar o ao vivo

13. Deixe inquilino e central lado a lado. Mande uma mensagem no chat de um
    lado: ela precisa aparecer do outro **sem recarregar**, e o sininho contar.

### Depois

O ensaio deixa rastro: chamado não se apaga, se cancela — é a timeline
append-only funcionando como projetado. Ou você mantém tudo com o prefixo
`ENSAIO —` e ignora, ou limpa pelo SQL Editor do Supabase. Desativar os usuários
de teste pelo painel é suficiente para tirá-los do caminho.

---

## 5. O que falta

### 5.1 SMTP próprio · **bloqueia o piloto**

"Esqueci minha senha" e o convite por e-mail passam hoje pelo SMTP embutido do
Supabase, limitado a poucos envios por hora e feito para teste. O primeiro
inquilino que esquecer a senha fica trancado do lado de fora.

**Onde:** painel do Supabase → Project Settings → Authentication → SMTP Settings.
Resend, Amazon SES ou SendGrid resolvem; qualquer um exige um domínio verificado.

**Critério de pronto:** pedir recuperação de senha com uma conta real e o e-mail
chegar, com o link apontando para `casa-pronta-gpv.vercel.app`.

### 5.2 Notificação fora do app · _o que mais muda a percepção do produto_

As notificações são só in-app. O inquilino — justamente quem menos abre o
sistema — só descobre que o técnico foi agendado se entrar e olhar.

Caminho mais curto: e-mail nos eventos que importam ao inquilino (técnico
designado, visita agendada, serviço concluído), disparado por trigger ou por uma
função de servidor. WhatsApp tem impacto maior e custo de aprovação maior — exige
a Cloud API da Meta, número verificado e templates aprovados.

### 5.3 PWA verificado no ar · _pronto para tocar isolado_

O service worker é _network-first_ para navegação e _cache-first_ só para
`/assets/*`, que tem hash no nome. O registro está em `src/main.tsx`, só em
produção. Nada disso foi exercitado a partir da URL publicada.

**A fazer:**

- Instalar em Android e iOS a partir da URL real.
- Publicar uma versão nova e confirmar que ela chega sem desinstalar o app.
- Conferir os atalhos do `manifest.json` ("Novo Chamado", "Minha Agenda"):
  apontam para rotas que mudaram quando o `react-router` entrou.
- Decidir o comportamento **offline**. Hoje o app abre e não carrega nada, porque
  toda leitura vai ao Supabase. Para um técnico em campo com 4G ruim, uma tela
  honesta de "sem conexão" vale mais do que um app que abre vazio.

### 5.4 Observabilidade · _pronto para tocar isolado_

Sentry no frontend (`VITE_SENTRY_DSN` já previsto no `.env.example`), com filtro
de dados pessoais: este app trata endereço residencial, telefone e foto do
interior da casa de alguém. Nada disso pode ir para um relatório de erro.

**Cuidado:** a CSP do `vercel.json` é restritiva de propósito. Adicionar o Sentry
exige liberar **o domínio dele** em `connect-src`, nunca um `*`.

### 5.5 Dívidas pequenas, sem urgência

- `Header.tsx` ainda filtra notificações por `targetRoles`. O fan-out passou a ser
  por destinatário e o mapeador devolve `[]`, então o filtro deixa tudo passar.
  É código morto que confunde quem ler.
- Bundle em **716 kB** (190 kB comprimido). Um `manualChunks` separando React e
  `lucide-react` resolve a maior parte.
- `src/data/datetime.ts` usa o deslocamento fixo `-03:00`. Correto para o Brasil
  de hoje, que não tem horário de verão. Se voltar, é o único arquivo a mudar.

---

## 6. Riscos aceitos

**O papel do usuário vem dos metadados do cadastro.** O trigger
`handle_new_auth_user` lê `raw_user_meta_data ->> 'role'`. Num cadastro público
esses metadados são escolhidos por quem se cadastra, o que permitiria criar a
própria conta como `empresa`.

Hoje **não é explorável**, porque o cadastro público está fechado — e
`npm run verificar:producao` falha se alguém reabrir. Mas a segurança disso
depende daquele botão continuar desligado.

Correção disponível quando se quiser: o trigger passa a criar todo perfil como
`inquilino`, e o papel é gravado pelo endpoint administrativo, que já verifica
quem está chamando. Migration + ajuste em `createUser.ts` + teste pgTAP.

> ⚠️ `enable_signup = false` no `config.toml` vale só para o Supabase **local**.
> O `db push` envia migrations, não configuração de Auth. Toda configuração de
> Auth em produção é feita no painel e precisa ser verificada lá.

---

## 7. Decisões em vigor

Quem pegar uma tarefa sem o histórico tropeça nestas se não souber:

1. **A RLS é a segurança; a tela é conveniência.** Nenhuma consulta em `src/data`
   filtra por usuário — o que chega já é o que a pessoa pode ver. Se você se pegar
   escrevendo um filtro de propriedade no cliente, ou a política está errada ou o
   filtro é redundante.

2. **Toda mutação de domínio passa por RPC.** As funções de `…_rpc.sql` são
   transacionais. Não existe `insert` solto de domínio a partir do cliente.

3. **A timeline é append-only por ausência de política.** Adicionar uma política
   de `UPDATE` "por conveniência" desfaz a garantia. Negação de `UPDATE` pela RLS
   é **no-op silencioso**, não exceção — teste verificando que o conteúdo não
   mudou, não que houve erro.

4. **O evento do Realtime é sinal, não dado.** Ao receber, releia pelo caminho
   normal. Não monte estado a partir do payload.

5. **Formulário não inventa dado.** Campo sem valor nasce vazio. Um default
   "plausível" vira parecer técnico que o técnico não escreveu.

6. **Segredos.** A `service_role` ignora a RLS inteira e vive só nas variáveis de
   ambiente do servidor, sem prefixo `VITE_`. A `anon key` e o `project ref` são
   públicos por design.

7. **Docker.** Toda operação filtra por `label=com.supabase.cli.project=casa-pronta`.
   **Nunca** `docker system prune` nesta máquina: há volumes de outros projetos.

8. **Ordem entre as suítes.** O pgTAP mede contagens exatas contra o seed; as
   suítes de integração abrem chamados de verdade. Rode pgTAP **antes**, ou
   `db:reset` entre as duas.

---

## 8. Como pedir uma tarefa a um chat novo

Cole isto, trocando o trecho final:

> Este repositório é o Casa Pronta. Leia `CLAUDE.md` (regra de negócio) e
> `docs/ESTADO-DO-PROJETO.md` (estado atual e decisões em vigor) antes de
> qualquer coisa. Depois execute a tarefa **§5.3 — PWA verificado no ar**,
> respeitando as decisões da §7. Ao terminar, rode `npm run check`, atualize o
> `docs/ESTADO-DO-PROJETO.md` e faça um commit.
