# Deploying Bayti on a VPS (Octenium)

This guide puts the whole platform on one Ubuntu VPS:

| Address | What | Served by |
|---|---|---|
| `https://bayti.com` | Marketplace (`client/`) | Nginx, static files |
| `https://agency.bayti.com` | Agency workspace (`agency/`) | Nginx, static files |
| `https://admin.bayti.com` | Admin dashboard (`admin/`) | Nginx, static files |
| `https://api.bayti.com` | API (`api/`) | Node 22 + PM2, behind Nginx |
| — | MySQL database `bayti` | MySQL on the same server, not reachable from outside |

Photos still go to Cloudinary. Private documents are stored in `/srv/bayti/storage/private` on the server.

Replace `bayti.com` with your real domain everywhere below, and `YOUR_SERVER_IP` with the IP Octenium gives you.

The files used here:

| File | Role |
|---|---|
| `deploy/scripts/setup-server.sh` | Run **once** as root: installs everything, creates the database, secrets, Nginx config, firewall, backups |
| `deploy/scripts/deploy.sh` | Run **every time** you want to put new code live |
| `deploy/scripts/backup.sh` | Database + private files backup (nightly, and before each deploy) |
| `deploy/nginx/` | Nginx config for the four addresses |
| `deploy/ecosystem.config.cjs` | Keeps the API running (PM2) |
| `deploy/api.env.example` | What the production `api/.env` contains |

---

## Step 0 — Before you start

1. **These deploy files must be on `main` on GitHub.** The server downloads the code from `main`.
2. **Have a domain.** A `.dz` is free at Octenium, or use a `.com`.
3. **Optional, for emails** (password reset, agency notifications): a Gmail account with 2-Step Verification on, and an **App password** created at Google Account → Security → 2-Step Verification → App passwords. You can add this later.

## Step 1 — Order the VPS

On octenium.com: **Serveur VPS → Gamme SSD NVMe → VPS Advanced** (2 vCores, 4 GB RAM, 80 GB NVMe).

- **Operating system:** choose **Ubuntu 24.04 LTS** (22.04 also works).
- After activation, Octenium sends you the **server IP** and the **root password**. Keep them somewhere safe.

## Step 2 — Point the domain to the server

In the DNS zone of your domain (Octenium panel → your domain → DNS zone), create five **A** records, all pointing to `YOUR_SERVER_IP`:

| Type | Name | Value |
|---|---|---|
| A | `@` (the domain itself) | `YOUR_SERVER_IP` |
| A | `www` | `YOUR_SERVER_IP` |
| A | `api` | `YOUR_SERVER_IP` |
| A | `agency` | `YOUR_SERVER_IP` |
| A | `admin` | `YOUR_SERVER_IP` |

Delete any older A/CNAME records with the same names. DNS can take from a few minutes to a few hours. To check from Windows PowerShell:

```powershell
nslookup api.bayti.com
```

When it answers with your server IP, that name is ready. You can continue with steps 3–5 while you wait; only step 6 (HTTPS) needs DNS to be working.

## Step 3 — Connect to the server

You always connect with **SSH** (the `ssh` command). The password and the key are just two ways of proving it's you: the **first time you must use the password** from Octenium's email; then, once, you can set up a key so you never type the password again. The PDF guide (`deploy/Bayti-VPS-Deployment-Guide.pdf`) walks through this screen by screen.

Open **PowerShell** on your PC:

```powershell
ssh root@YOUR_SERVER_IP
```

Type `yes` the first time, then the root password (nothing shows while you type; that's normal).

**Recommended: log in with a key instead of a password.** In a *new* PowerShell window on your PC (not on the server):

```powershell
ssh-keygen -t ed25519
```

Press Enter at every question. Then copy the key to the server:

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@YOUR_SERVER_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

From now on `ssh root@YOUR_SERVER_IP` logs you in without a password.

## Step 4 — Prepare the server (once)

On the server (you see a prompt like `root@vps:~#`), run these three commands. Change `bayti.com` to your domain in the last one.

```bash
apt-get update && apt-get install -y git
git clone https://github.com/Fares00T/Bayti-real-estate-website.git /srv/bayti/app
bash /srv/bayti/app/deploy/scripts/setup-server.sh bayti.com
```

This takes 5–10 minutes. It installs Nginx, MySQL, Node.js 22 and PM2; creates the `bayti` user, the `bayti` database with a random password, and `api/.env` with fresh secrets; sets up the firewall (only SSH, HTTP, HTTPS open), 2 GB of swap, and nightly backups at 03:00.

It ends with **"Server ready"**. If it stops with an error, read the red line, fix the cause and run the same command again; it skips what is already done.

**Add email settings (optional, can be done later):**

```bash
nano /srv/bayti/app/api/.env
```

Fill `EMAIL_USER="you@gmail.com"` and `EMAIL_PASS="the 16-letter app password"`. Save with `Ctrl+O`, Enter, exit with `Ctrl+X`. If the API is already running, restart it: `sudo -iu bayti pm2 restart bayti-api`.

## Step 5 — First deploy

```bash
sudo -iu bayti bash /srv/bayti/app/deploy/scripts/deploy.sh
```

This builds the three sites, creates the database tables, starts the API and publishes everything. It takes a few minutes and ends with **"Done"**.

## Step 6 — Turn on HTTPS

Once `nslookup` (step 2) shows your IP for all five names:

```bash
certbot --nginx --redirect -d bayti.com -d www.bayti.com -d api.bayti.com -d agency.bayti.com -d admin.bayti.com
```

Give your email, accept the terms. Certbot gets free certificates, switches every address to HTTPS and renews them automatically.

> HTTPS is required, not optional: in production the login cookies are only sent over HTTPS, so signing in won't work before this step.

## Step 7 — Create the first admin

1. Open `https://bayti.com`, register a normal account with your email.
2. On the server:

```bash
sudo -iu bayti bash -c "cd /srv/bayti/app/api && npm run make-admin -- you@example.com"
```

3. Sign in at `https://admin.bayti.com` with that account. Later admins are granted from the dashboard (Users → account → Staff access).

## Step 8 — Check that everything works

- [ ] `https://bayti.com` loads, and `http://bayti.com` and `https://www.bayti.com` redirect to it
- [ ] Register, sign in, sign out on the marketplace
- [ ] Post a listing with photos (Cloudinary upload)
- [ ] It appears in the admin review queue at `https://admin.bayti.com`; publish it
- [ ] `https://agency.bayti.com` loads and an agency account can sign in
- [ ] Refresh the browser on a deep page (e.g. a listing page): it must not show a 404
- [ ] If email is set: "forgot password" sends an email

---

## Putting new code live

1. Merge your changes into `main` on GitHub.
2. From PowerShell on your PC, one command:

```powershell
ssh root@YOUR_SERVER_IP "sudo -iu bayti bash /srv/bayti/app/deploy/scripts/deploy.sh"
```

The script backs up the database before applying migrations. If a build fails, nothing live changes. If the API fails to start after the update, the new sites are not published and the script prints the API's error log.

## Backups

- **What:** the full database (`db-…sql.gz`) and the private documents (`storage-…tar.gz`).
- **When:** every night at 03:00, and before every deploy. Kept 14 days.
- **Where:** `/srv/bayti/backups` on the server.

They are on the same server, so **download them regularly** (e.g. weekly) to your PC:

```powershell
scp -r root@YOUR_SERVER_IP:/srv/bayti/backups "$env:USERPROFILE\Documents\bayti-backups"
```

Take one by hand at any time:

```bash
sudo -iu bayti bash /srv/bayti/app/deploy/scripts/backup.sh manual
```

**Restoring** a database backup (this replaces the current data):

```bash
sudo -iu bayti pm2 stop bayti-api
gunzip -c /srv/bayti/backups/db-2026-12-01_030000-nightly.sql.gz | sudo -iu bayti mysql bayti
sudo -iu bayti pm2 start bayti-api
```

## Moving existing data from your PC (optional)

By default production starts with an empty database. To bring an existing local database instead, on your PC export it, copy it, then import it **before step 5**:

```powershell
mysqldump -u root bayti > bayti.sql
scp bayti.sql root@YOUR_SERVER_IP:/tmp/bayti.sql
```

```bash
sudo -iu bayti mysql bayti < /tmp/bayti.sql && rm /tmp/bayti.sql
```

Don't do this with the shared development database: it is full of test accounts.

## Everyday commands (on the server)

| What | Command |
|---|---|
| Is the API running? | `sudo -iu bayti pm2 status` |
| API logs (live, `Ctrl+C` to quit) | `sudo -iu bayti pm2 logs bayti-api` |
| Restart the API (after editing `api/.env`) | `sudo -iu bayti pm2 restart bayti-api` |
| Nginx errors | `tail -50 /var/log/nginx/error.log` |
| Disk space | `df -h /` |
| Database console | `sudo -iu bayti mysql bayti` |
| Last backup result | `tail -5 /srv/bayti/backups/backup.log` |

## Hardening (after key login works)

Once you've confirmed `ssh root@YOUR_SERVER_IP` logs in **without** asking for a password, turn password logins off so nobody can guess it:

```bash
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

Keep the Octenium panel login safe: its console is your way back in if you ever lose your SSH key.

To make the admin dashboard reachable only from your own connection, uncomment the `allow` / `deny` lines in `/etc/nginx/sites-available/bayti` (admin block), put your IP, then `nginx -t && systemctl reload nginx`.

## When something goes wrong

| Symptom | Likely cause and fix |
|---|---|
| **502 Bad Gateway** on any page that loads data | The API is down. `sudo -iu bayti pm2 logs bayti-api --lines 50` shows why (often a wrong value in `api/.env`). |
| Can't sign in, or "CORS" errors in the browser console | You're on `www.` or `http://` instead of `https://bayti.com`, or `CLIENT_URL` / `AGENCY_URL` / `ADMIN_URL` in `api/.env` don't match the addresses exactly (no trailing `/`). Restart the API after a change. |
| Sign-in works on nothing at all | HTTPS isn't on yet (step 6). |
| Certbot fails | DNS doesn't point to the server yet for one of the names. Check each with `nslookup`, wait, retry. |
| Page refresh shows 404 | The Nginx config wasn't installed: rerun `setup-server.sh`. |
| Emails don't arrive | Check `EMAIL_USER` / `EMAIL_PASS` (must be an App password, not your Gmail password), then the API logs. If logs show a connection timeout, ask Octenium whether outgoing SMTP (ports 465/587) is blocked. |
| Deploy says `Not possible to fast-forward` | Someone edited code directly on the server. `cd /srv/bayti/app && sudo -u bayti git status` shows what; discard it with `sudo -u bayti git checkout -- .` and redeploy. |
| Upload of large documents fails | Files are limited to 10 MB each (`api/lib/storage.js`). |
