#!/usr/bin/env bash
#
# deploy.sh — build and run e-DPAP for production on a local government server.
#
# Deployment model (per the project constraints): open-source only, no paid
# cloud, Docker + Docker Compose on an on-premise server. This script performs
# a repeatable, fail-closed deploy of all three components:
#
#   Phase 1  Preflight     — verify tools AND that real production secrets are
#                            set (refuses to deploy with dev defaults).
#   Phase 2  Backend       — build & start PostGIS + the Spring Boot API with
#                            the injected secrets and demo seeding OFF.
#   Phase 3  Web platform  — production build of DPAP-web, then `next start`.
#   Phase 4  Mobile PWA    — production build of DPAP-mobile (static bundle),
#                            served for verification.
#   Phase 5  Summary       — URLs, process info, and reverse-proxy guidance.
#
# Configuration comes from the environment, or from a ./.env.deploy file (which
# must NOT be committed). Required variables:
#
#   PUBLIC_API_URL        URL browsers use to reach the API, e.g.
#                         https://dpap.gov.mz/api  (baked into the web/mobile
#                         builds and used for CORS).
#   JWT_SECRET            >= 32 chars — signs the backend's JWTs.
#   AUTH_SESSION_SECRET   >= 32 chars — signs the web app's session cookie.
#   DB_PASSWORD           >= 8 chars  — PostgreSQL password.
# Optional:
#   PUBLIC_WEB_ORIGINS    comma-separated browser origins allowed by CORS
#                         (defaults to the origin of PUBLIC_API_URL).
#   WEB_PORT  (3000)   MOBILE_PORT (4173)
#
# Usage:
#   ./deploy.sh          # run the full deploy
#   ./deploy.sh stop     # stop web + mobile and tear the backend down
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT/.deploy"        # holds pidfiles + logs for the node processes
mkdir -p "$RUN_DIR"
MODE="${1:-up}"

WEB_PORT="${WEB_PORT:-3000}"
MOBILE_PORT="${MOBILE_PORT:-4173}"
HEALTH_URL="http://localhost:8080/api/actuator/health"

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
info() { printf '    %s\n' "$*"; }
die()  { printf '\n\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# npm ci when a lockfile exists (reproducible), else npm install.
npm_install() { if [ -f package-lock.json ]; then npm ci; else npm install; fi; }

# ---------------------------------------------------------------------------
# stop: shut everything down.
# ---------------------------------------------------------------------------
stop_all() {
  step "Stopping web + mobile processes"
  for name in web mobile; do
    if [ -f "$RUN_DIR/$name.pid" ] && kill "$(cat "$RUN_DIR/$name.pid")" 2>/dev/null; then
      info "Stopped $name (pid $(cat "$RUN_DIR/$name.pid"))."
    fi
    rm -f "$RUN_DIR/$name.pid"
  done
  step "Tearing down the backend stack"
  ( cd "$ROOT/DPAP-api" && docker compose down )
  info "Done. The database volume (dpap_db) is kept; add -v above to wipe data."
}

if [ "$MODE" = "stop" ]; then stop_all; exit 0; fi
[ "$MODE" = "up" ] || die "Unknown mode '$MODE'. Use: up | stop"

# ---------------------------------------------------------------------------
# Phase 1 — Preflight: tools + production secrets (fail closed).
# ---------------------------------------------------------------------------
step "Phase 1/5 — Preflight checks"

# Load ./.env.deploy if present (values there become environment variables).
if [ -f "$ROOT/.env.deploy" ]; then
  info "Loading configuration from .env.deploy"
  set -a; # shellcheck disable=SC1091
  . "$ROOT/.env.deploy"; set +a
fi

command -v docker >/dev/null 2>&1 || die "Docker is required."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required."
docker info >/dev/null 2>&1 || die "Docker is not running."
command -v node >/dev/null 2>&1 || die "Node.js 20+ is required (to build web & mobile)."
command -v npm  >/dev/null 2>&1 || die "npm is required."

# Validate a required secret is present and long enough.
need_secret() { # $1 name  $2 value  $3 min-length
  [ -n "${2:-}" ]         || die "$1 is not set. Provide it via the environment or .env.deploy."
  [ "${#2}" -ge "$3" ]    || die "$1 is too short (need >= $3 characters) — use a strong value."
  case "$2" in
    *change-me*|*dpap2024*|dpap) die "$1 is still a placeholder/dev value — set a real secret." ;;
  esac
}

: "${PUBLIC_API_URL:?Set PUBLIC_API_URL (e.g. https://dpap.gov.mz/api)}"
need_secret JWT_SECRET          "${JWT_SECRET:-}"          32
need_secret AUTH_SESSION_SECRET "${AUTH_SESSION_SECRET:-}" 32
need_secret DB_PASSWORD         "${DB_PASSWORD:-}"         8

# Default the allowed browser origins to the origin of PUBLIC_API_URL.
PUBLIC_WEB_ORIGINS="${PUBLIC_WEB_ORIGINS:-$(printf '%s' "$PUBLIC_API_URL" | sed -E 's#(https?://[^/]+).*#\1#')}"
info "API (browser) URL : $PUBLIC_API_URL"
info "Allowed origins   : $PUBLIC_WEB_ORIGINS"
info "Secrets           : present and non-default."

# ---------------------------------------------------------------------------
# Phase 2 — Backend: inject secrets, seeding OFF, build & start, wait healthy.
# ---------------------------------------------------------------------------
step "Phase 2/5 — Deploying the backend (PostGIS + Spring Boot API)"
info "docker-compose.yml reads these from the environment (prod values, no dev defaults):"
info "  JWT_SECRET, DB_PASSWORD, CORS_ALLOWED_ORIGINS, SEED_DEMO_DATA=false"
(
  cd "$ROOT/DPAP-api"
  JWT_SECRET="$JWT_SECRET" \
  DB_PASSWORD="$DB_PASSWORD" \
  CORS_ALLOWED_ORIGINS="$PUBLIC_WEB_ORIGINS" \
  SEED_DEMO_DATA="false" \
    docker compose up -d --build
)
info "Waiting for the API health check…"
for _ in $(seq 1 60); do
  curl -fsS "$HEALTH_URL" >/dev/null 2>&1 && { info "API healthy."; break; }
  sleep 2
done
curl -fsS "$HEALTH_URL" >/dev/null 2>&1 || die "API did not become healthy (cd DPAP-api && docker compose logs api)."

# ---------------------------------------------------------------------------
# Phase 3 — Web: production build (bakes PUBLIC_API_URL), then next start.
# ---------------------------------------------------------------------------
step "Phase 3/5 — Building and starting DPAP-web (Next.js)"
(
  cd "$ROOT/DPAP-web"
  info "Installing dependencies…"; npm_install
  info "Building (NEXT_PUBLIC_API_BASE_URL is baked in at build time)…"
  NEXT_PUBLIC_API_BASE_URL="$PUBLIC_API_URL" AUTH_DEV_MODE=false npm run build
  info "Starting next start on port $WEB_PORT (session secret provided at runtime)…"
  AUTH_SESSION_SECRET="$AUTH_SESSION_SECRET" AUTH_DEV_MODE=false PORT="$WEB_PORT" \
    nohup npm run start >"$RUN_DIR/web.log" 2>&1 &
  echo $! >"$RUN_DIR/web.pid"
)
info "Web started (pid $(cat "$RUN_DIR/web.pid"), logs: .deploy/web.log)."

# ---------------------------------------------------------------------------
# Phase 4 — Mobile: static production build, served for verification.
# ---------------------------------------------------------------------------
step "Phase 4/5 — Building DPAP-mobile (offline PWA static bundle)"
(
  cd "$ROOT/DPAP-mobile"
  info "Installing dependencies…"; npm_install
  info "Building (VITE_API_BASE_URL is baked into the bundle)…"
  VITE_API_BASE_URL="$PUBLIC_API_URL" npm run build
  info "Serving the static bundle on port $MOBILE_PORT for verification…"
  nohup npm run preview -- --port "$MOBILE_PORT" --strictPort --host >"$RUN_DIR/mobile.log" 2>&1 &
  echo $! >"$RUN_DIR/mobile.pid"
)
info "Mobile bundle built to DPAP-mobile/dist and served (pid $(cat "$RUN_DIR/mobile.pid"))."
info "For real production, serve DPAP-mobile/dist with nginx and a long-cache policy instead of 'preview'."

# ---------------------------------------------------------------------------
# Phase 5 — Summary + reverse-proxy guidance.
# ---------------------------------------------------------------------------
step "Phase 5/5 — Deployed"
cat <<EOF
    API           : http://localhost:8080/api         (health: $HEALTH_URL)
    Web platform  : http://localhost:$WEB_PORT
    Mobile PWA    : http://localhost:$MOBILE_PORT   (static bundle in DPAP-mobile/dist)

    Put a TLS reverse proxy (nginx/Caddy) in front so browsers reach:
      $PUBLIC_API_URL            -> http://127.0.0.1:8080/api
      your web domain            -> http://127.0.0.1:$WEB_PORT
      your mobile/PWA domain     -> serve DPAP-mobile/dist (static)
    A PWA + service worker require HTTPS in production (localhost is exempt).

    For resilience, run the web process under systemd/pm2 rather than this
    script's background process. Logs: .deploy/web.log, .deploy/mobile.log
    Stop everything:  ./deploy.sh stop
EOF
