#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${1:?Usage: restore-postgres.sh path/to/backup.dump}"

if [ "${CONFIRM_RESTORE:-}" != "RESTORE" ]; then
  echo "Set CONFIRM_RESTORE=RESTORE to confirm replacing data in the target database." >&2
  exit 2
fi

pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "$1"
pnpm prisma migrate deploy --schema prisma/schema.prisma
