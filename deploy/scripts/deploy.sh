#!/usr/bin/env bash
# Deploys the latest code from GitHub. Run on the server as the bayti user:
#
#   sudo -iu bayti bash /srv/bayti/app/deploy/scripts/deploy.sh
#
# Order: pull -> build the three front ends -> back up the database -> migrate
# -> restart the API -> publish the front ends. If a build fails, nothing live
# has changed yet.

# Everything runs inside main(), so `git pull` replacing this file mid-run
# can't change what bash executes.
main() {
  set -euo pipefail

  local BASE="/srv/bayti"
  local APP_DIR="$BASE/app"
  local WEB_ROOT="/var/www/bayti"

  [ "$(id -un)" = "bayti" ] || { echo "Run as the bayti user: sudo -iu bayti bash $0" >&2; exit 1; }
  # shellcheck source=/dev/null
  source "$BASE/deploy.conf"
  : "${DOMAIN:?missing in $BASE/deploy.conf}"
  local BRANCH="${BRANCH:-main}"

  step() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

  cd "$APP_DIR"
  step "Pulling $BRANCH"
  git fetch --quiet origin "$BRANCH"
  git checkout --quiet "$BRANCH"
  git merge --ff-only "origin/$BRANCH"
  git log -1 --format='Now at %h: %s (%cr)'

  # Production URLs for the front ends. *.local files are git-ignored and
  # take priority over the committed .env files during `vite build`.
  cat > client/.env.production.local <<EOF
VITE_BACK_END_URL=https://api.$DOMAIN/api
VITE_AGENCY_URL=https://agency.$DOMAIN
EOF
  for app in agency admin; do
    cat > "$app/.env.production.local" <<EOF
VITE_API_URL=https://api.$DOMAIN/api
VITE_MARKETPLACE_URL=https://$DOMAIN
EOF
  done

  for app in client agency admin; do
    step "Building $app"
    (cd "$app" && npm ci --no-audit --no-fund && npm run build)
  done

  step "Installing API dependencies"
  # generate runs explicitly in case npm skipped the postinstall script
  (cd api && npm ci --no-audit --no-fund --legacy-peer-deps && npx prisma generate)

  step "Backing up the database before migrating"
  bash "$APP_DIR/deploy/scripts/backup.sh" pre-deploy

  step "Applying database migrations"
  (cd api && npx prisma migrate deploy)

  step "Restarting the API"
  pm2 startOrReload "$APP_DIR/deploy/ecosystem.config.cjs" --update-env
  pm2 save >/dev/null

  local ok=""
  for _ in $(seq 1 15); do
    if curl -fsS -o /dev/null http://127.0.0.1:8800/api/settings/public; then ok=1; break; fi
    sleep 1
  done
  if [ -z "$ok" ]; then
    echo "The API did not answer on port 8800. Last log lines:" >&2
    pm2 logs bayti-api --lines 40 --nostream >&2 || true
    echo "The front ends were NOT published. Fix the API, then run this script again." >&2
    exit 1
  fi
  echo "API is up."

  for app in client agency admin; do
    step "Publishing $app"
    rsync -a "$app/dist/" "$WEB_ROOT/$app/"
    # Keep last week's hashed assets for visitors with an older page open
    find "$WEB_ROOT/$app/assets" -type f -mtime +7 -delete 2>/dev/null || true
  done

  step "Done"
  echo "https://$DOMAIN  ·  https://agency.$DOMAIN  ·  https://admin.$DOMAIN  ·  https://api.$DOMAIN"
}

main "$@"
exit
