#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Supabase local — ciclo de vida controlado.
#
# Por que este script existe em vez de chamar a CLI direto:
# a CLI do Supabase cria os containers com `restart: unless-stopped`. Na prática
# isso significa que eles voltam sozinhos toda vez que o daemon do Docker sobe —
# inclusive dias depois, sem ninguém pedir. Aqui o ciclo é explícito: sobe quando
# você manda, e fica parado quando você manda parar.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT="casa-pronta"

# ── Perfis ───────────────────────────────────────────────────────────────────
# `supabase start` sobe 12 containers por padrão. Quase nenhum é necessário para
# o que estamos fazendo agora. Cada perfil lista o que NÃO sobe.
#
# O Postgres nunca entra na lista: ele é obrigatório e a CLI não deixa excluí-lo.
# `pg_prove` (testes) não aparece aqui porque não é um serviço — sobe e morre a
# cada `supabase test db`.

# MÍNIMO — schema, migrations e testes pgTAP. 1 container.
# É o que basta enquanto o front-end ainda lê do localStorage.
EXCLUI_MINIMO="gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor"

# APP — quando o front-end passar a falar com o banco (Etapas 3 e 4).
# Sobe: postgres, kong (gateway :54321), gotrue (login), postgrest (API),
# realtime (timeline/chat ao vivo), mailpit (ver e-mails de convite). 6 containers.
EXCLUI_APP="storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor"

# COMPLETO — tudo que usamos, incluindo o Studio para inspecionar dados na mão.
# Continua sem edge-runtime, logflare e vector: esses não entram em nenhum perfil.
EXCLUI_COMPLETO="edge-runtime,logflare,vector,supavisor"

# Serviços que NUNCA usaremos, em nenhum perfil:
#   edge-runtime (686 MB) — o plano usa Vercel Functions, não Edge Functions
#   logflare (615 MB) + vector (137 MB) — pipeline de logs; `docker logs` basta
#   supavisor — pooler de conexão, relevante só em produção
#   imgproxy — transformação de imagem, recurso pago do Supabase

# Só os containers DESTE projeto. Nunca toca em nada mais do seu Docker.
projeto_containers() {
  docker ps -aq --filter "label=com.supabase.cli.project=${PROJECT}" 2>/dev/null || true
}

desativar_autorestart() {
  local ids
  ids="$(projeto_containers)"
  if [ -n "$ids" ]; then
    # shellcheck disable=SC2086
    docker update --restart=no $ids >/dev/null 2>&1 || true
    echo "→ auto-restart desativado nos containers do projeto"
  fi
}

case "${1:-}" in
  start)
    supabase start -x "$EXCLUI_MINIMO"
    desativar_autorestart
    echo "→ perfil MÍNIMO: só o Postgres. Use 'db:start:app' ou 'db:start:full' se precisar de mais."
    ;;

  start:app)
    supabase start -x "$EXCLUI_APP"
    desativar_autorestart
    echo "→ perfil APP: Postgres, gateway, login, API REST, realtime e caixa de e-mail."
    ;;

  start:full)
    supabase start -x "$EXCLUI_COMPLETO"
    desativar_autorestart
    echo "→ perfil COMPLETO. Studio em http://localhost:54323"
    ;;

  stop)
    # Mantém o volume do banco: subir de novo é rápido e os dados continuam lá.
    supabase stop
    ;;

  down)
    # Remove containers E volumes. O banco é recriado do zero por migrations + seed,
    # então não há nada insubstituível aqui.
    supabase stop --no-backup
    echo "→ containers e volumes removidos"
    ;;

  reset)
    supabase start -x "$EXCLUI_MINIMO" >/dev/null 2>&1 || true
    supabase db reset
    desativar_autorestart
    ;;

  test)
    # Autocontido: sobe se precisar, testa e devolve a máquina ao estado anterior.
    # Se o banco já estava de pé, respeita isso e deixa de pé no fim.
    ESTAVA_UP=false
    if [ -n "$(docker ps -q --filter "label=com.supabase.cli.project=${PROJECT}")" ]; then
      ESTAVA_UP=true
    fi

    supabase start -x "$EXCLUI_MINIMO" >/dev/null
    desativar_autorestart
    supabase db reset

    # `set -e` abortaria aqui antes de encerrarmos os containers; o `|| CODIGO=$?`
    # captura a falha para que o encerramento aconteça de qualquer jeito.
    CODIGO=0
    supabase test db || CODIGO=$?

    if [ "$ESTAVA_UP" = false ]; then
      echo "→ o banco não estava rodando antes; encerrando"
      supabase stop
    fi
    exit "$CODIGO"
    ;;

  status)
    echo "=== containers do projeto ${PROJECT} ==="
    docker ps -a --filter "label=com.supabase.cli.project=${PROJECT}" \
      --format 'table {{.Names}}\t{{.Status}}\t{{.Label "restart"}}' 2>/dev/null
    echo
    echo "=== política de reinício ==="
    for c in $(projeto_containers); do
      printf '%-40s %s\n' \
        "$(docker inspect "$c" --format '{{.Name}}' | sed 's|^/||')" \
        "$(docker inspect "$c" --format '{{.HostConfig.RestartPolicy.Name}}')"
    done
    ;;

  trim)
    # Remove só as imagens que NENHUM perfil sobe. Como os serviços estão
    # desligados no config.toml, elas não voltam a ser baixadas.
    for img in edge-runtime logflare vector; do
      id="$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -E "supabase/${img}" || true)"
      if [ -n "$id" ]; then
        echo "$id" | xargs -r docker rmi -f >/dev/null 2>&1 && echo "→ removida: $id"
      fi
    done
    echo "→ pronto. As imagens em uso continuam no cache."
    ;;

  purge)
    # Libera TODO o espaço: containers, volumes e as ~5,8 GB de imagens.
    # Só remove imagens do Supabase — nada de `docker system prune`, que
    # levaria junto os volumes dos seus outros projetos.
    supabase stop --no-backup 2>/dev/null || true
    imagens="$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -E 'supabase' || true)"
    if [ -n "$imagens" ]; then
      echo "$imagens" | xargs -r docker rmi -f
    fi
    echo "→ imagens do Supabase removidas. Um novo 'db:start' baixa tudo de novo."
    ;;

  *)
    cat <<'USO'
Uso: npm run db:<comando>

  db:start        sobe só o Postgres (perfil mínimo) — basta para schema e testes
  db:start:app    + gateway, login, API REST, realtime e caixa de e-mail
  db:start:full   + Studio (painel web em localhost:54323)
  db:stop         para e remove os containers (mantém os dados)
  db:down         para e remove containers E volumes
  db:reset        recria o banco: migrations + seed
  db:test         sobe se preciso, roda o pgTAP e devolve a máquina como estava
  db:status       mostra o que está de pé e a política de reinício
  db:trim         remove as imagens que nenhum perfil usa (~1,4 GB)
  db:purge        remove tudo, inclusive as ~5,8 GB de imagens
USO
    exit 1
    ;;
esac
