#!/usr/bin/env bash
# Run ON THE SERVER: pull the image, test it, then swap it in for the running container.
#
#   server-deploy.sh               deploy :latest
#   server-deploy.sh <tag>         deploy a specific tag (e.g. the commit from build-and-push.sh)
#   server-deploy.sh --rollback    go back to the image that was live before the last deploy
#   add -y to skip the "migrations done?" question
#
# Env overrides:
#   IMAGE         default ghcr.io/rolandrfuchs92/dsc-panel-guides
#   NAME          container name, default dsc-panel-guides
#   ENV_FILE      runtime env (DATABASE_URL, BETTER_AUTH_*), default /etc/dsc-panel-guides.env
#   HOST_PORT     published on 127.0.0.1, default 10001 (must match proxy_pass in the nginx vhost)
#   NETWORK       docker network shared with the Postgres container, default event-net
#                 (NETWORK= with nothing after it joins no network)
#   HOST_GATEWAY  set to 1 to add host.docker.internal (Postgres published on the host)
#   NO_PULL       set to 1 when the image was built on this server (docker build -t ...)
#
# The new image is started once on the side and must pass /api/health (which also hits the DB)
# before the live container is touched. If the swapped-in container fails, the old image comes back.
set -euo pipefail

IMAGE="${IMAGE:-ghcr.io/rolandrfuchs92/dsc-panel-guides}"
NAME="${NAME:-dsc-panel-guides}"
ENV_FILE="${ENV_FILE:-/etc/dsc-panel-guides.env}"
HOST_PORT="${HOST_PORT:-10001}"
NETWORK="${NETWORK-event-net}"
HOST_GATEWAY="${HOST_GATEWAY:-}"
NO_PULL="${NO_PULL:-}"

TAG="latest"
ROLLBACK=0
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --rollback) ROLLBACK=1 ;;
    -y|--yes) ASSUME_YES=1 ;;
    -*) echo "Unknown option: $arg" >&2; exit 2 ;;
    *) TAG="$arg" ;;
  esac
done

log() { echo "==> $*"; }
fail() { echo "ERROR: $*" >&2; exit 1; }

[[ -r "$ENV_FILE" ]] || fail "can't read $ENV_FILE (run with sudo, or set ENV_FILE)"

RUN_ARGS=(--env-file "$ENV_FILE")
if [[ -n "$NETWORK" ]]; then
  docker network inspect "$NETWORK" >/dev/null 2>&1 || fail "docker network $NETWORK doesn't exist (docker network ls)"
  RUN_ARGS+=(--network "$NETWORK")
fi
[[ "$HOST_GATEWAY" == "1" ]] && RUN_ARGS+=(--add-host=host.docker.internal:host-gateway)

# Poll /api/health from inside the container (no published port needed). 60s budget.
wait_healthy() {
  local container="$1"
  for _ in $(seq 1 30); do
    if [[ "$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null)" != "true" ]]; then
      return 1
    fi
    if docker exec "$container" wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

start_live() {
  local ref="$1"
  docker run -d --name "$NAME" --restart unless-stopped \
    -p "127.0.0.1:${HOST_PORT}:3000" "${RUN_ARGS[@]}" "$ref" >/dev/null
}

if [[ "$ROLLBACK" == "1" ]]; then
  REF="${IMAGE}:previous"
  docker image inspect "$REF" >/dev/null 2>&1 || fail "no ${REF} image to roll back to"
else
  REF="${IMAGE}:${TAG}"
  if [[ "$ASSUME_YES" != "1" ]]; then
    read -r -p "Have you run any new migrations against the prod DB (npm run db:migrate)? [y/N] " answer
    [[ "$answer" =~ ^[Yy]$ ]] || fail "run the migrations first (see README, Deploy step 2)"
  fi
  if [[ "$NO_PULL" == "1" ]]; then
    docker image inspect "$REF" >/dev/null 2>&1 || fail "no local image $REF"
  else
    log "Pulling $REF"
    docker pull "$REF"
  fi
fi

# 1. Try the new image on the side, without a port, so the live site keeps serving.
CANDIDATE="${NAME}-candidate"
docker rm -f "$CANDIDATE" >/dev/null 2>&1 || true
log "Starting a test container from $REF"
docker run -d --name "$CANDIDATE" "${RUN_ARGS[@]}" "$REF" >/dev/null
if ! wait_healthy "$CANDIDATE"; then
  echo "---- test container logs ----" >&2
  docker logs --tail 50 "$CANDIDATE" >&2 || true
  docker rm -f "$CANDIDATE" >/dev/null
  fail "new image failed its health check; the live site was not touched"
fi
docker rm -f "$CANDIDATE" >/dev/null
log "Test container is healthy"

# 2. Remember what's live now, so we can go back.
PREVIOUS_ID="$(docker inspect -f '{{.Image}}' "$NAME" 2>/dev/null || true)"
if [[ -n "$PREVIOUS_ID" && "$ROLLBACK" != "1" ]]; then
  docker tag "$PREVIOUS_ID" "${IMAGE}:previous"
fi

# 3. The host port must be free, or held by the container we're replacing.
if command -v ss >/dev/null && [[ -n "$(ss -Hltn "sport = :${HOST_PORT}")" ]]; then
  docker port "$NAME" 3000 2>/dev/null | grep -q ":${HOST_PORT}$" \
    || fail "port ${HOST_PORT} is used by something else; the live site was not touched"
fi

# 4. Swap.
log "Replacing the live container"
docker rm -f "$NAME" >/dev/null 2>&1 || true
if ! start_live "$REF" || ! wait_healthy "$NAME"; then
  docker logs --tail 50 "$NAME" >&2 || true
  if [[ -n "$PREVIOUS_ID" ]]; then
    log "Live container failed, restoring the previous image"
    docker rm -f "$NAME" >/dev/null 2>&1 || true
    start_live "$PREVIOUS_ID" && wait_healthy "$NAME" || fail "previous image didn't come back either; check docker ps, the port and $ENV_FILE"
    fail "deploy rolled back to the previous image"
  fi
  fail "live container is unhealthy and there was no previous image to restore"
fi

curl -fsS "http://127.0.0.1:${HOST_PORT}/api/health" >/dev/null || fail "healthy inside, but 127.0.0.1:${HOST_PORT} doesn't answer"
log "Live: $REF ($(docker inspect -f '{{.Image}}' "$NAME" | cut -c8-19)) on 127.0.0.1:${HOST_PORT}"
docker image prune -f >/dev/null || true
