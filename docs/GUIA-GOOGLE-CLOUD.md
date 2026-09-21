# Guia — Limpeza do projeto Google Cloud herdado do AI Studio

## Resposta curta

**Você não precisa criar nenhum projeto Google novo.** Nada no escopo aprovado da migração usa API
do Google. O projeto `gen-lang-client-0528821397` foi criado automaticamente pelo Google AI Studio,
nunca foi usado por este código, e pode ser apagado.

Um projeto novo só será necessário se um dia você retomar **Google Agenda** ou **login com Google**
(backlog, §10 do plano) — e aí ele é criado do zero em 10 minutos, já no padrão certo.

---

## O que existia e qual o risco de verdade

O arquivo `firebase-applet-config.json` (agora removido) continha:

| Credencial                                          | Valor                  | Risco real                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiKey`                                            | `AIzaSyCS9tQ…`         | **É o único que merece atenção.** Chaves web do Firebase são públicas por natureza, mas quando não têm restrição de API elas conseguem chamar outras APIs habilitadas no projeto. Em projeto criado pelo AI Studio, a **Generative Language API (Gemini)** costuma estar habilitada — alguém com a chave poderia consumir cota no seu nome. |
| `oAuthClientId`                                     | `570658107030-vac7ii…` | Baixo. Client IDs OAuth aparecem no navegador de todo usuário por design, e aqui **não há client secret**. Só funciona a partir das origens autorizadas no projeto.                                                                                                                                                                         |
| `appId`, `projectId`, `authDomain`, `storageBucket` | —                      | Identificadores, não segredos.                                                                                                                                                                                                                                                                                                              |

Não havia chave de service account nem client secret — ou seja, **não existe cenário de tomada de
conta**. O caso ruim realista é consumo de cota de Gemini num projeto descartável. Ainda assim, como
o projeto não serve para nada, apagá-lo é a limpeza correta.

_(No meu resumo anterior eu tratei isso como "credenciais reais expostas" — é verdade, mas a
gravidade é essa acima, não mais que isso.)_

---

## O que já foi feito no repositório

- `firebase-applet-config.json` — **apagado**.
- `src/services/googleCalendar.ts` — o Client ID hardcoded foi substituído por
  `import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID` (vazio por padrão).
- Como **ainda não existe git neste diretório**, nenhuma dessas chaves entrou em histórico de
  versionamento. Não há o que expurgar com `git filter-repo` — é por isso que o plano só faz
  `git init` ao final da Etapa 1.

Falta a parte que só você pode fazer, porque depende da sua conta Google.

---

## Opção A — Apagar o projeto inteiro (recomendado)

Resolve tudo de uma vez: mata a API key, o OAuth Client ID e o projeto Firebase associado.

**Pré-requisito:** você precisa ser **Owner** do projeto (a permissão
`resourcemanager.projects.delete`). Se o projeto nasceu da sua conta do AI Studio, você é.

1. Abra <https://console.cloud.google.com/>.
2. No seletor de projeto (topo da página), escolha **`gen-lang-client-0528821397`**.
   Confira o ID — é fácil apagar o projeto errado.
3. Menu ☰ → **IAM e Admin** → **Configurações** (_IAM & Admin → Settings_).
   Link direto: <https://console.cloud.google.com/iam-admin/settings>
4. Clique em **DESLIGAR** (_SHUT DOWN_).
5. Digite o **ID do projeto** para confirmar e conclua.

### O que acontece depois

- Os recursos param de funcionar **imediatamente**. A API key deixa de valer na hora.
- O projeto fica **30 dias em "exclusão pendente"** e só então é apagado em definitivo.
- Durante esses 30 dias dá para restaurar em **IAM e Admin → Gerenciar recursos**
  (<https://console.cloud.google.com/cloud-resource-manager>) — é a sua rede de segurança caso
  descubra que o projeto era usado por outra coisa.

### Dois pontos a conferir antes

- **Conta de faturamento:** em <https://console.cloud.google.com/billing>, veja se há billing
  vinculado a esse projeto. Projetos de nível gratuito do AI Studio normalmente não têm — se tiver,
  desvincule antes.
- **Firebase:** se o projeto aparecer em <https://console.firebase.google.com/>, não precisa fazer
  nada separado. É o mesmo projeto; apagar no Google Cloud apaga o Firebase junto.

---

## Opção B — Manter o projeto, só revogar as credenciais

Faz sentido se você descobrir que esse projeto é usado por outra coisa sua.

1. Abra <https://console.cloud.google.com/apis/credentials> com o projeto selecionado.
2. Em **Chaves de API**: localize a chave que começa com `AIzaSyCS9tQ…` → menu **⋮** → **Excluir**.
3. Em **IDs do cliente OAuth 2.0**: localize `570658107030-vac7ii…` → ícone 🗑 → **Excluir**.
4. Em <https://aistudio.google.com/app/apikey>, apague qualquer chave Gemini ligada a esse projeto —
   é uma lista separada da do Cloud Console e passa despercebida com frequência.

**Alternativa a excluir a API key:** se preferir mantê-la, em vez de apagar clique nela e configure
_Restrições de aplicativo_ (referenciadores HTTP) e _Restrições de API_ (só as APIs necessárias).
Mas, para uma chave que não é usada por nada, excluir é mais simples e mais seguro.

---

## Bônus — revogar acessos que usuários já concederam

Se alguém chegou a clicar em "Conectar Google Agenda" no protótipo, a conta dessa pessoa ainda tem
o app autorizado. Cada um revoga na própria conta:

<https://myaccount.google.com/permissions> → localizar o app → **Remover acesso**.

Apagar o projeto (Opção A) também invalida essas autorizações.

---

## Quando (e como) criar um projeto novo

Só será necessário ao retomar um item do backlog:

| Item do backlog  | O que exige                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Google Agenda    | Projeto GCP + Google Calendar API habilitada + credencial                                                   |
| Login com Google | Projeto GCP + tela de consentimento OAuth + Client ID — configurado **dentro do Supabase Auth**, sem código |

Roteiro, quando chegar a hora:

1. <https://console.cloud.google.com/projectcreate> → nome `casa-pronta-prod`.
   Crie **na conta Google da Casa Pronta**, não numa conta pessoal — isso evita que o acesso ao
   projeto dependa de uma pessoa específica.
2. **APIs e serviços → Biblioteca** → habilite só a API que for usar.
3. **Tela de consentimento OAuth** → tipo **Externo**, dados da empresa, domínio autorizado.
4. **Credenciais** → criar a credencial do tipo certo:
   - **Login com Google** → _ID do cliente OAuth_ → tipo _Aplicativo da Web_, com a URI de
     redirecionamento que o próprio Supabase informa no painel de Auth.
   - **Google Agenda** → o plano recomenda **service account** (integração servidor-a-servidor),
     e não OAuth no navegador como o protótipo fazia. Assim a sincronização não depende de cada
     usuário conectar a própria conta.
5. Segredo nunca no código: `VITE_*` para o que é público, variável de ambiente de runtime na
   Vercel para o que não é.
