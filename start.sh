#!/usr/bin/env bash
#
# start.sh — one command to run e-DPAP locally for development.
#
# It brings up the three components in order and wires them together:
#   1. Checks prerequisites (Docker, Node, npm).
#   2. Builds & starts the backend (PostGIS + Spring Boot API) with Docker
#      Compose, then waits until its health check passes.
#   3. Starts DPAP-web (Next.js) pointed at the real backend.
#   4. Starts DPAP-mobile (the Vite PWA) pointed at the real backend.
#
# Usage:
#   ./start.sh            # everything on localhost (API background + web + mobile)
#   ./start.sh lan        # everything, but reachable from other devices on your
#                         #   Wi-Fi (phones/tablets) — binds to 0.0.0.0, wires the
#                         #   apps + CORS to this machine's LAN IP, prints LAN URLs
#   ./start.sh api        # only the backend stack (stays running in the background)
#   ./start.sh web        # only the web app (expects the API to be up)
#   ./start.sh mobile     # only the mobile PWA (expects the API to be up)
#   ./start.sh stop       # stop & remove the backend stack
#
# Press Ctrl+C to stop the web/mobile dev servers. The API container keeps
# running in the background; stop it with `./start.sh stop`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_PORT=3000
MOBILE_PORT=5173
MODE="${1:-all}"

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
info() { printf '    %s\n' "$*"; }
die()  { printf '\n\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# --- networking: localhost by default; `lan` mode exposes to the Wi-Fi --------
# Detect this machine's LAN IP (macOS en0/en1, then Linux).
lan_ip() {
  local ip=""
  ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
  [ -n "$ip" ] || ip="$(ipconfig getifaddr en1 2>/dev/null || true)"
  [ -n "$ip" ] || ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  printf '%s' "${ip:-127.0.0.1}"
}

EXPOSE=0
HOST_ADDR="localhost"            # where the apps + API live from the browser
if [ "$MODE" = "lan" ]; then EXPOSE=1; HOST_ADDR="$(lan_ip)"; MODE="all"; fi

API_URL="http://${HOST_ADDR}:8080/api"
# CORS origins the backend must allow (the browser's web/mobile origins).
CORS="http://localhost:${WEB_PORT},http://localhost:${MOBILE_PORT}"
[ "$EXPOSE" = "1" ] && CORS="${CORS},http://${HOST_ADDR}:${WEB_PORT},http://${HOST_ADDR}:${MOBILE_PORT}"

check_prereqs() {
  step "Step 1 — Checking prerequisites"
  command -v docker >/dev/null 2>&1 || die "Docker is required (https://docs.docker.com/get-docker/)."
  docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required (comes with Docker Desktop)."
  docker info >/dev/null 2>&1 || die "Docker is installed but not running — start Docker Desktop and retry."
  command -v node >/dev/null 2>&1 || die "Node.js 20+ is required (https://nodejs.org)."
  command -v npm  >/dev/null 2>&1 || die "npm is required (ships with Node.js)."
  info "Docker: $(docker --version)"
  info "Node:   $(node --version)"
  [ "$EXPOSE" = "1" ] && info "LAN mode: exposing on ${HOST_ADDR} (reachable from devices on this Wi-Fi)."
  info "All prerequisites present."
}

ensure_deps() {
  if [ ! -d "$1/node_modules" ]; then
    info "Installing npm dependencies in $(basename "$1")/ (first run only)…"
    ( cd "$1" && npm install )
  fi
}

wait_for_api() {
  info "Waiting for the API to become healthy at http://localhost:8080/api/actuator/health …"
  for _ in $(seq 1 60); do
    if curl -fsS "http://localhost:8080/api/actuator/health" >/dev/null 2>&1; then
      info "API is healthy."
      return 0
    fi
    sleep 2
  done
  die "API did not become healthy in time. Check logs: (cd DPAP-api && docker compose logs api)"
}

start_api() {
  step "Step 2 — Starting the backend (PostGIS + Spring Boot API) via Docker Compose"
  info "Allowed browser origins (CORS): ${CORS}"
  # CORS_ALLOWED_ORIGINS is read by docker-compose.yml (env interpolation).
  ( cd "$ROOT/DPAP-api" && CORS_ALLOWED_ORIGINS="$CORS" docker compose up -d --build )
  wait_for_api
  info "API ready at ${API_URL} (demo login password: dpap2024)."
}

PIDS=()
cleanup() {
  [ "${#PIDS[@]}" -gt 0 ] || return 0
  step "Stopping the web/mobile dev servers (the API container keeps running)"
  for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null || true; done
  info "Stopped. To stop the API too: ./start.sh stop"
}

start_web() {
  step "Step 3 — Starting DPAP-web (Next.js) on http://${HOST_ADDR}:${WEB_PORT}"
  ensure_deps "$ROOT/DPAP-web"
  info "Pointing the web app at the backend (${API_URL}) with backend login."
  # -H 0.0.0.0 makes Next listen on all interfaces so other devices can reach it.
  local host_flag=(); [ "$EXPOSE" = "1" ] && host_flag=(-H 0.0.0.0)
  # Allow HMR from the LAN origin; otherwise Next 16 blocks it and the page
  # falls back to constant full reloads when opened over the LAN IP.
  local dev_origins=""; [ "$EXPOSE" = "1" ] && dev_origins="$HOST_ADDR"
  ( cd "$ROOT/DPAP-web" \
      && NEXT_PUBLIC_API_BASE_URL="$API_URL" AUTH_DEV_MODE=false \
         ALLOWED_DEV_ORIGINS="$dev_origins" \
         npm run dev -- "${host_flag[@]}" ) &
  PIDS+=($!)
}

start_mobile() {
  step "Step 4 — Starting DPAP-mobile (Vite PWA) on http://${HOST_ADDR}:${MOBILE_PORT}"
  ensure_deps "$ROOT/DPAP-mobile"
  info "The PWA calls the backend at ${API_URL} (CORS allows it)."
  # --host makes Vite listen on all interfaces.
  local host_flag=(); [ "$EXPOSE" = "1" ] && host_flag=(--host)
  ( cd "$ROOT/DPAP-mobile" \
      && VITE_API_BASE_URL="$API_URL" \
         npm run dev -- --port "$MOBILE_PORT" --strictPort "${host_flag[@]}" ) &
  PIDS+=($!)
}

summary() {
  step "e-DPAP is running — open these in your browser"
  cat <<EOF
    Web platform : http://${HOST_ADDR}:${WEB_PORT}/pt
    Mobile PWA   : http://${HOST_ADDR}:${MOBILE_PORT}
    API          : ${API_URL}   (health: http://localhost:8080/api/actuator/health)

    Demo accounts (password: dpap2024):
      admin@dpap.gov.mz / editor@dpap.gov.mz / leitor@dpap.gov.mz
EOF
  if [ "$EXPOSE" = "1" ]; then
    cat <<EOF

    LAN mode: open the URLs above on another device on the same Wi-Fi.
    NOTE: service workers / "install app" / offline only work over HTTPS (or on
    localhost). Over http://${HOST_ADDR} the PWA loads and syncs online, but the
    offline features stay off until you serve it over HTTPS.
    If a device still can't connect, allow incoming connections for node in your
    firewall (macOS: System Settings → Network → Firewall).
EOF
  fi
  printf '\n    Press Ctrl+C to stop the web/mobile dev servers.\n'
}

case "$MODE" in
  all)
    check_prereqs; start_api
    trap cleanup EXIT INT TERM
    start_web; start_mobile; summary; wait ;;
  api)
    check_prereqs; start_api
    info "Backend only. It stays running in the background. Stop it with: ./start.sh stop" ;;
  web)
    check_prereqs; trap cleanup EXIT INT TERM; start_web; summary; wait ;;
  mobile)
    check_prereqs; trap cleanup EXIT INT TERM; start_mobile; summary; wait ;;
  stop)
    step "Stopping and removing the backend stack"
    ( cd "$ROOT/DPAP-api" && docker compose down )
    info "Stopped. The database volume (dpap_db) is kept; add -v to the command above to wipe it." ;;
  *)
    die "Unknown mode '$MODE'. Use: all | lan | api | web | mobile | stop" ;;
esac
