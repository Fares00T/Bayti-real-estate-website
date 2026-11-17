#!/usr/bin/env bash
# One-time preparation of a fresh Ubuntu VPS for Bayti. Run as root:
#
#   bash /srv/bayti/app/deploy/scripts/setup-server.sh bayti.com
#
# Safe to run again: steps that are already done are skipped, and existing
# secrets, database credentials and Nginx/HTTPS config are never overwritten.
set -euo pipefail

DOMAIN="${1:-}"
APP_USER="bayti"
BASE="/srv/bayti"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_ROOT="/var/www/bayti"
NODE_MAJOR=22

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31mError: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run this as root (or with sudo)."
[[ "$DOMAIN" =~ ^[a-z0-9-]+(\.[a-z0-9-]+)+$ ]] || die "usage: setup-server.sh yourdomain.com (lowercase, no https://, no www)"
[ "$APP_DIR" = "$BASE/app" ] || die "clone the repository to $BASE/app first (found it at $APP_DIR)."

export DEBIAN_FRONTEND=noninteractive

say "Installing system packages"
apt-get update -y
apt-get -o Dpkg::Options::=--force-confold upgrade -y
apt-get install -y nginx git rsync curl ca-certificates openssl gzip ufw fail2ban \
  unattended-upgrades certbot python3-certbot-nginx
if ! command -v mysqld >/dev/null && ! command -v mariadbd >/dev/null; then
  apt-get install -y mysql-server || apt-get install -y mariadb-server
fi
systemctl enable --now nginx fail2ban
systemctl enable --now mysql 2>/dev/null || systemctl enable --now mariadb

say "Installing Node.js $NODE_MAJOR and PM2"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt "$NODE_MAJOR" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2
node -v

say "Adding 2 GB of swap (keeps builds from running out of memory)"
# Some container-type VPSes don't allow swap; that's fine with 4 GB of RAM.
if [ -z "$(swapon --show)" ]; then
  if { fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048; } \
    && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile; then
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  else
    rm -f /swapfile
    echo "This VPS doesn't allow a swap file; continuing without one."
  fi
fi

say "Creating the '$APP_USER' user and folders"
id "$APP_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$APP_USER"
mkdir -p "$BASE/storage/private" "$BASE/backups" "$WEB_ROOT/client" "$WEB_ROOT/agency" "$WEB_ROOT/admin"
chown -R "$APP_USER:$APP_USER" "$BASE" "$WEB_ROOT"
chmod 750 "$BASE/storage" "$BASE/backups"
chmod 755 "$WEB_ROOT" "$WEB_ROOT"/*

cat > "$BASE/deploy.conf" <<EOF
# Read by deploy.sh
DOMAIN=$DOMAIN
BRANCH=main
EOF
chown "$APP_USER:$APP_USER" "$BASE/deploy.conf"

say "Creating the database and api/.env"
ENV_FILE="$APP_DIR/api/.env"
if [ -f "$ENV_FILE" ]; then
  echo "api/.env already exists; leaving it and the database password as they are."
else
  DB_PASS="$(openssl rand -hex 24)"
  mysql <<SQL
CREATE DATABASE IF NOT EXISTS bayti CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'bayti'@'localhost' IDENTIFIED BY '$DB_PASS';
ALTER USER 'bayti'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON bayti.* TO 'bayti'@'localhost';
FLUSH PRIVILEGES;
SQL

  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=8800

DATABASE_URL="mysql://bayti:$DB_PASS@localhost:3306/bayti"

JWT_SECRET_KEY="$(openssl rand -hex 48)"
ADMIN_JWT_SECRET="$(openssl rand -hex 48)"
AGENCY_JWT_SECRET="$(openssl rand -hex 48)"

CLIENT_URL="https://$DOMAIN"
AGENCY_URL="https://agency.$DOMAIN"
ADMIN_URL="https://admin.$DOMAIN"

STORAGE_DIR="$BASE/storage/private"

# Gmail address and Google App password for outgoing email (optional)
EMAIL_USER=""
EMAIL_PASS=""
EOF
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"

  # Lets backup.sh run mysqldump without a password on the command line
  cat > "/home/$APP_USER/.my.cnf" <<EOF
[client]
user=bayti
password=$DB_PASS
EOF
  chown "$APP_USER:$APP_USER" "/home/$APP_USER/.my.cnf"
  chmod 600 "/home/$APP_USER/.my.cnf"
  echo "Database 'bayti' ready; credentials and fresh JWT secrets written to api/.env."
fi

say "Configuring Nginx"
install -m 644 "$APP_DIR/deploy/nginx/bayti-spa.conf" /etc/nginx/snippets/bayti-spa.conf
if [ -f /etc/nginx/sites-available/bayti ]; then
  echo "/etc/nginx/sites-available/bayti already exists (it may hold Certbot's HTTPS lines); left unchanged."
else
  sed "s/__DOMAIN__/$DOMAIN/g" "$APP_DIR/deploy/nginx/bayti.conf.template" > /etc/nginx/sites-available/bayti
fi
ln -sf /etc/nginx/sites-available/bayti /etc/nginx/sites-enabled/bayti
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

say "Firewall: SSH, HTTP and HTTPS only"
if ! { ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable; }; then
  echo "WARNING: the firewall could not be enabled on this VPS. Ask Octenium whether they filter ports in their panel."
fi

say "Starting PM2 at boot for '$APP_USER'"
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" >/dev/null
sudo -iu "$APP_USER" pm2 install pm2-logrotate >/dev/null 2>&1 || true

say "Nightly backups at 03:00"
cat > /etc/cron.d/bayti-backup <<EOF
0 3 * * * $APP_USER bash $APP_DIR/deploy/scripts/backup.sh nightly >> $BASE/backups/backup.log 2>&1
EOF
chmod 644 /etc/cron.d/bayti-backup

say "Server ready"
cat <<EOF
Next steps (see deploy/DEPLOY.md):
  1. Point the DNS records for $DOMAIN, www, api, agency and admin to this server.
  2. First deploy:   sudo -iu $APP_USER bash $APP_DIR/deploy/scripts/deploy.sh
  3. HTTPS:          certbot --nginx --redirect -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN -d agency.$DOMAIN -d admin.$DOMAIN
EOF
