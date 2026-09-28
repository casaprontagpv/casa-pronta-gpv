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
    supabase start
    desativar_autorestart
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

    supabase start >/dev/null
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

  db:start    sobe o Supabase local e desativa o auto-restart
  db:stop     para e remove os containers (mantém os dados)
  db:down     para e remove containers E volumes
  db:reset    recria o banco: migrations + seed
  db:test     sobe se preciso, roda o pgTAP e devolve a máquina como estava
  db:status   mostra o que está de pé e a política de reinício
  db:purge    remove tudo, inclusive as ~5,8 GB de imagens Docker
USO
    exit 1
    ;;
esac
