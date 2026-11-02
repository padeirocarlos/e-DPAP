#!/usr/bin/env bash
#
# e-DPAP — cópia completa dos dados em formatos abertos (BRD FR-EXP-4).
# Produz, numa pasta com data/hora:
#   1. dump.sql       — dump completo do PostgreSQL (pg_dump, formato texto)
#   2. csv/*.csv      — cada tabela em CSV (abre no Excel/LibreOffice/QGIS)
#   3. attachments/   — as fotografias carregadas (cópia da pasta de anexos)
#   4. dicionario.json — o dicionário de dados (esquema do questionário)
#
# Uso:  ./scripts/dump.sh            (usa a stack do docker-compose do DPAP-api)
# Requer a base de dados a correr (./start.sh api  ou  docker compose up).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/DPAP-api"
DB_SERVICE="db"
DB_USER="${DB_USER:-dpap}"
DB_NAME="${DB_NAME:-dpap}"
ATTACHMENTS_DIR="${ATTACHMENTS_DIR:-}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$ROOT/dumps/dpap-$STAMP"

echo "==> e-DPAP: cópia completa dos dados  ($STAMP)"
mkdir -p "$OUT/csv"

compose() { (cd "$API_DIR" && docker compose "$@"); }

# 1) Dump SQL completo.
echo "  [1/4] pg_dump → dump.sql"
compose exec -T "$DB_SERVICE" pg_dump -U "$DB_USER" "$DB_NAME" > "$OUT/dump.sql"

# 2) CSV por tabela (todas as tabelas do schema public).
echo "  [2/4] tabelas → csv/"
TABLES=$(compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
for t in $TABLES; do
  compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" \
    -c "\copy (SELECT * FROM \"$t\") TO STDOUT WITH CSV HEADER" > "$OUT/csv/$t.csv"
done

# 3) Anexos (fotografias). Em produção aponte ATTACHMENTS_DIR para o volume.
echo "  [3/4] anexos → attachments/"
if [ -n "$ATTACHMENTS_DIR" ] && [ -d "$ATTACHMENTS_DIR" ]; then
  cp -R "$ATTACHMENTS_DIR" "$OUT/attachments"
else
  mkdir -p "$OUT/attachments"
  echo "(defina ATTACHMENTS_DIR para incluir as fotografias)" > "$OUT/attachments/LEIA-ME.txt"
fi

# 4) Dicionário de dados (esquema canónico do questionário).
echo "  [4/4] dicionário → dicionario.json"
cp "$ROOT/schema/form_schema.json" "$OUT/dicionario.json"

echo "==> Concluído: $OUT"
