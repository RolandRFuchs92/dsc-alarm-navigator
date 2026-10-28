#!/usr/bin/env bash
# Build the app image and push it to the registry, tagged with the commit and :latest.
#
#   deploy/build-and-push.sh             build + push
#   deploy/build-and-push.sh --no-push   build only (local check)
#
# Env overrides:
#   IMAGE        default ghcr.io/rolandrfuchs92/dsc-panel-guides
#   PLATFORM     e.g. linux/amd64 when the server's CPU differs from this machine (uses buildx)
#   ALLOW_DIRTY  set to 1 to build with uncommitted changes (the tag gets a -dirty suffix)
#
# One-time login: gh auth refresh -s write:packages
#                 gh auth token | docker login ghcr.io -u RolandRFuchs92 --password-stdin
# Migrations are NOT part of the image: run `npm run db:migrate` against prod before starting it.
set -euo pipefail

IMAGE="${IMAGE:-ghcr.io/rolandrfuchs92/dsc-panel-guides}"
PUSH=1
if [[ "${1:-}" == "--no-push" ]]; then PUSH=0; elif [[ -n "${1:-}" ]]; then echo "Unknown option: $1" >&2; exit 2; fi

cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

TAG="$(git rev-parse --short HEAD)"
if [[ -n "$(git status --porcelain)" ]]; then
  if [[ "${ALLOW_DIRTY:-}" != "1" ]]; then
    echo "Uncommitted changes: commit first so the tag matches the code (or ALLOW_DIRTY=1)." >&2
    exit 1
  fi
  TAG="${TAG}-dirty"
fi

echo "Building ${IMAGE}:${TAG}"
if [[ -n "${PLATFORM:-}" ]]; then
  # buildx can't load a foreign-platform image locally, so it pushes directly.
  if [[ "$PUSH" == "0" ]]; then echo "PLATFORM builds push directly; drop --no-push." >&2; exit 2; fi
  docker buildx build --platform "$PLATFORM" -t "${IMAGE}:${TAG}" -t "${IMAGE}:latest" --push .
else
  docker build -t "${IMAGE}:${TAG}" -t "${IMAGE}:latest" .
  if [[ "$PUSH" == "1" ]]; then
    docker push "${IMAGE}:${TAG}"
    docker push "${IMAGE}:latest"
  fi
fi

if [[ "$PUSH" == "1" ]]; then echo "Pushed ${IMAGE}:${TAG} and :latest"; else echo "Built ${IMAGE}:${TAG} (not pushed)"; fi
