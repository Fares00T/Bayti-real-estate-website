# Bayti — investor demo

The whole Bayti platform in one link, with no server: the **marketplace**, the
**agency platform** and the **admin dashboard**, exactly as in `client/`,
`agency/` and `admin/`, running against the **real API code** from `api/`
executed inside the visitor's browser.

| URL | App |
| --- | --- |
| `/` | Marketplace (`client/`) |
| `/agency` | Agency platform (`agency/`) |
| `/admin` | Admin dashboard (`admin/`) |

All three share one in-browser database, so the flows connect: an inquiry a
home seeker sends on the marketplace appears in the agency's inbox; a listing
an agency publishes goes to the admin moderation queue and, once approved,
shows up in marketplace search.

Each visitor gets their own private copy of the data (saved in their browser),
pre-filled with realistic Algerian listings, agencies, conversations,
applications and reports. Nothing they do affects anyone else.

## Trying it

A **Live demo** panel (bottom-left) signs you in as any role in one click:

| Role | Account | Shows |
| --- | --- | --- |
| Visitor | — | Search, map, listing pages, agency directory |
| Home seeker | `client@bayti.dz` | Favourites, inquiries & visit requests, messages, notifications |
| Private seller | `seller@bayti.dz` | Personal listings, the 3-listing limit, received inquiries |
| Agency owner | `agency@bayti.dz` | Overview & analytics, listings, team & invitations, inquiries, messages |
| Agent | `agent@bayti.dz` | The same workspace limited to their assigned work |
| New agency | `applicant@bayti.dz` | An agency application waiting for more information |
| Admin | `admin@bayti.dz` | Moderation queue, users, agencies, applications, reports, audit log, settings |

The password for every account is `demo1234`. **Reset demo** in the panel
restores the original data.

## Deploying on Vercel

1. Push the repository to GitHub and import it in Vercel.
2. Set **Root Directory** to `demo`. Everything else comes from `vercel.json`
   (install, build, output folder and the `/agency` and `/admin` routing).
3. Deploy. No environment variables are needed.

## Running locally

```bash
npm run build   # installs the three apps if needed and builds them into dist/
npm run serve   # http://localhost:5188 with the same routing as Vercel
npm run smoke   # signs in as every role and calls the API under Node
```

## How it works

```
demo/
  client/ agency/ admin/ shared/   copies of the production apps (small demo patches, marked "Demo build")
  server/                          copy of api/ (controllers, lib, routes, middleware) + schema.prisma
    shims/                         browser stand-ins for express, bcrypt, jsonwebtoken, crypto, multer, nodemailer
    runtime/
      prisma.js                    in-memory Prisma client built from schema.prisma
      database.js                  seeds it on first visit, saves it in localStorage
      http.js                      turns a request into Express req/res and runs the real routes
      client.js                    axios adapter + fetch interception used by the three apps
      cookies.js                   per-path cookie jar (separate marketplace / agency / admin sessions)
      files.js                     private documents in IndexedDB
      demoBar.js                   the Live demo panel
    seed.js                        the demo data
  scripts/                         build, local server, smoke test
```

Differences from production, all limited to `demo/`:

- Each app's axios instance uses the in-browser adapter; other `fetch("/api/...")`
  calls are intercepted the same way.
- Photo uploads that would go to Cloudinary are resized in the browser and
  stored as data URLs (the three photo URL checks also accept them).
- Legal documents are kept in IndexedDB; seeded documents open as a
  placeholder PDF.
- The one raw SQL query (unread message counts in `chat.controller.js`) is
  rewritten with the Prisma API.
- Passwords are stored as `demo$<password>` and sessions use a simple signed
  token: this is demo data, not a security model.
- Emails are not sent; in-app notifications work as in production.

To refresh the demo after changing the real app, copy the changed files from
`client/`, `agency/`, `admin/` or `api/` into the matching folder here (keeping
the `Demo build` patches), and bump `DB_KEY` in `server/runtime/database.js`
if the seed or schema changed.
