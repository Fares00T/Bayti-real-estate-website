# 🏡 Real Estate Web Platform

A full-stack web application enabling individuals and real estate agencies to list, manage, and discover properties for sale or rent.

## 📌 Project Overview

This platform addresses inefficiencies in property listing and discovery by centralizing listings from individuals and agencies. Users can:

* Create and manage profiles
* List properties with detailed info and photos
* Filter and search listings by type, location, and price
* Schedule property tours with agencies
* Communicate via a built-in messaging system

## 🚀 Features

### 🧑‍💼 For Individuals

* Register/login with secure authentication
* Add, edit, or remove property listings
* Browse all available properties
* Request tours and message owners
* use the integrated messaging system 

### 🏢 For Agencies

* Create agency profiles
* Manage multiple property listings
* View and respond to tour requests
* Track listing performance
* use the integrated messaging system

### 🛠 Admin Features

* Monitor users and listings
* Remove flagged or inappropriate content
* Approve or reject new agency registrations
* View and manage reported messages or tour requests
* Access dashboard with user and property statistics

## 🛠 Tech Stack

**Frontend:** React
**Backend:** Node.js + Express
**Database:** MySQL (via Prisma ORM)
**Authentication:** JWT

## 📂 Project Structure

Bayti is split into three independent front ends that share one API and one database.

```plaintext
client/   Public marketplace (React + Vite)        → baytiy.com        · dev :5173
agency/   Agency workspace (React + Vite)          → agency.baytiy.com · dev :5175
admin/    Internal admin dashboard (React + Vite)  → admin.baytiy.com  · dev :5174
api/      Express + Prisma REST API (MySQL)        → api.baytiy.com    · dev :8800
shared/   Design tokens, MUI theme options and formatters used by the front ends
```

Chat needs no extra server: an open conversation asks the API for new messages every few seconds (paused while the tab is hidden), so it works on any host, including serverless.

The full architecture — accounts and roles, listing ownership, inquiries, verification, permissions and data ownership — is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### How the separation works

| | Marketplace (`client/`) | Agency workspace (`agency/`) | Admin dashboard (`admin/`) |
|---|---|---|---|
| Who | Visitors, buyers, tenants and individual sellers | Members of an agency (owner, managers, agents) — only here | The Bayti team only |
| Sign-in | `/api/auth/*`, cookie `token` | `/api/agency/auth/*`, cookie `agency_token` (path `/api/agency`) | `/api/admin/auth/*`, cookie `admin_token` (path `/api/admin`) |
| API | Public routes; people manage only their own data | `/api/agency/*`, scoped to the member's agency (`requireAgency.js`) | `/api/admin/*` (`requireAdmin.js`) |

Each account signs in on one platform only. Agency owners, managers and agents are refused by the marketplace and do everything on the agency workspace. Agency membership is accepted by invitation, and `role` is only `client` or `admin`.

- The admin role is checked **on the server for every admin request** (read from the database, so a demotion takes effect immediately). Hiding pages in the UI is not what protects them.
- A marketplace login, even for an admin account, has no admin powers on the public API: it cannot review, delete other people's listings, list users or change roles.
- New and edited listings are `pending` until the team publishes them from the dashboard's review queue.
- The API only accepts credentialed requests from `CLIENT_URL`, `AGENCY_URL` and `ADMIN_URL`.

## 🧪 How to Run Locally

Requirements: Node 20+, MySQL/MariaDB.

### 1. API

```bash
cd api
npm install
node backups/backup.mjs   # before migrating: dumps every table to api/backups/
npx prisma migrate deploy
npm start            # or: node --watch app.js
```

`api/.env`:

```env
DATABASE_URL="mysql://root:@localhost:3306/bayti"
JWT_SECRET_KEY="long-random-string"
ADMIN_JWT_SECRET="another-long-random-string"
CLIENT_URL="http://localhost:5173"
ADMIN_URL="http://localhost:5174"
EMAIL_USER=""        # optional: Gmail address for report / agency emails
EMAIL_PASS=""        # optional: Gmail app password
```

### 2. Marketplace

```bash
cd client
npm install
npm run dev          # http://localhost:5173
```

### 3. Admin dashboard

```bash
cd admin
npm install
npm run dev          # http://localhost:5174
```

Sign in with an account whose role is `admin`. Create the first one from the server: register it on the marketplace, then run `npm run make-admin -- you@example.com` in `api/`. After that, grant staff access from the dashboard (Users → account → Staff access), where it is audited.

### 4. Agency workspace

```bash
cd agency
npm install
npm run dev          # http://localhost:5175
```

Sign in with an account that belongs to an approved agency. Set `AGENCY_URL` and `AGENCY_JWT_SECRET` in `api/.env`.

## 🚀 Production

1. Deploy the API at `api.baytiy.com` with `NODE_ENV=production`, `CLIENT_URL=https://baytiy.com`, `AGENCY_URL=https://agency.baytiy.com` and `ADMIN_URL=https://admin.baytiy.com`.
2. Build each front end separately and host it on its own domain:
   - `client/`: set `VITE_BACK_END_URL=https://api.baytiy.com/api`, run `npm run build`, serve `client/dist` at `baytiy.com`.
   - `agency/`: set `VITE_API_URL=https://api.baytiy.com/api` and `VITE_MARKETPLACE_URL=https://baytiy.com`, run `npm run build`, serve `agency/dist` at `agency.baytiy.com`.
   - `admin/`: set `VITE_API_URL=https://api.baytiy.com/api` and `VITE_MARKETPLACE_URL=https://baytiy.com`, run `npm run build`, serve `admin/dist` at `admin.baytiy.com`.
3. Both are single-page apps: configure the host to fall back to `index.html` for unknown paths.
4. Optionally restrict `admin.baytiy.com` further (VPN, IP allow-list or SSO in front of it). The API already refuses non-admins either way.

## 📌 Future Improvements

* AI-powered recommendations
* Payment module for premium listings
* Multi-language support (Arabic/French)

## 🧑‍🎓 Author

**Fares Tinakiche**
3rd Year Computer Science Student, Higher Institute of Sciences
Supervised by: Prof. Kheira Lakhdari
Erasmus+ Alumni | Passionate about solving real-world problems with code

