#!/usr/bin/env bash
# Backs up the database and the private uploads to /srv/bayti/backups and
# deletes copies older than 14 days. Runs nightly from cron (setup-server.sh)
# and before every deploy. Manual run, as the bayti user:
#
#   bash /srv/bayti/app/deploy/scripts/backup.sh manual
#
# These copies live on the same server. Download them regularly (see
# deploy/DEPLOY.md, "Backups") so a lost server doesn't mean lost data.
set -euo pipefail

BASE="/srv/bayti"
DIR="$BASE/backups"
TAG="${1:-manual}"
STAMP="$(date +%Y-%m-%d_%H%M%S)"

mkdir -p "$DIR"
umask 077

# Credentials come from ~/.my.cnf (written by setup-server.sh)
mysqldump --single-transaction --no-tablespaces bayti \
  | gzip > "$DIR/db-$STAMP-$TAG.sql.gz"

if [ -d "$BASE/storage/private" ]; then
  tar -czf "$DIR/storage-$STAMP-$TAG.tar.gz" -C "$BASE/storage" private
fi

find "$DIR" -maxdepth 1 -type f -name '*.gz' -mtime +14 -delete

echo "$(date '+%F %T') backup ok: db-$STAMP-$TAG.sql.gz ($(du -h "$DIR/db-$STAMP-$TAG.sql.gz" | cut -f1))"
