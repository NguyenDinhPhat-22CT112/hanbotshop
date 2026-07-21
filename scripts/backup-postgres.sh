#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/hanbotorder-$STAMP.dump"

pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="$FILE"
find "$BACKUP_DIR" -type f -name 'hanbotorder-*.dump' -mtime "+$RETENTION_DAYS" -delete
echo "$FILE"
