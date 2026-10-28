# dsc-alarm-navigator

DSC Alarm Navigator: menu maps and step-by-step programming guides for DSC alarm panels
(PowerSeries PC1864 first). A keypad simulator shows which section, sub-section and entry you
are in and the keys you pressed to get there. Guides replay their keys on the simulator so each
step shows what the real keypad should look like.

Next.js 16 (App Router, standalone output) + Postgres 16 + better-auth. Sign-up is open, but an
admin must approve each account before it can see anything. The simulator never talks to a real panel.

## Project layout

| Path | What it is |
|------|------------|
| `app/` | Pages and route handlers (`/devices`, maps, guides, `/admin/users`, `/api/health`, `/api/auth`). |
| `components/` | Keypads, the menu map and the guide step UI. |
| `lib/` | Panel engines, content repo, guide replay, auth and the DB client. |
| `migrations/` | tern migrations: schema **and** content (panels, sections, guides). |
| `scripts/` | `tern.mjs` wrapper, `seed-admin.ts`, `reset-password.ts`, and the one-off `convert-legacy.ts`. |
| `proxy.ts` | Session-cookie gate and the per-request CSP nonce. |
| `tests/` | Vitest suites (`*.test.ts`) and the Playwright smoke test (`tests/e2e`). |
| `tests/fixtures/legacy/` | The retired static site's `data.js` / `app.js`, frozen as test oracles. |
| `Dockerfile` | Production image (Node 24 alpine, non-root, port 3000). |
| `dsc.iamonline.co.za` | nginx vhost: reverse proxy to the container. |

## Configuration

All config comes from the environment. `.env.example` lists the keys:

| Variable | Used for |
|----------|----------|
| `DATABASE_URL` | Postgres connection for the app, tern and the scripts. |
| `TEST_DATABASE_URL` | The `dsc_test` database (tests and `npm run db:migrate:test` only). |
| `BETTER_AUTH_SECRET` | Session signing secret. Generate with `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | The public URL of the site, e.g. `https://dsc.iamonline.co.za`. |
| `TRUSTED_ORIGINS` | Optional, comma-separated extra origins you open the app from, e.g. your phone hitting the dev server by LAN IP: `http://192.168.10.177:3001`. Without it, `next dev` blocks its scripts for that host and sign-up just reloads. |

Never commit `.env` files. In a Docker `--env-file`, do **not** quote values: Docker passes the
quotes through literally (`KEY=value`, not `KEY="value"`).

## Local development

Needs Node 24, Docker, and [tern](https://github.com/jackc/tern)
(`go install github.com/jackc/tern/v2@latest`, or set `TERN_BIN` to its path).

```bash
npm ci
docker compose up -d              # Postgres 16 on localhost:5435 with dsc_dev and dsc_test
cp .env.example .env              # then fill it in:
#   DATABASE_URL=postgres://postgres:postgres@localhost:5435/dsc_dev
#   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5435/dsc_test
#   BETTER_AUTH_SECRET=<openssl rand -base64 32>
#   BETTER_AUTH_URL=http://localhost:3000
npm run db:migrate                # dsc_dev
npm run db:migrate:test           # dsc_test
npm run dev                       # http://localhost:3000
```

Then sign up at `/signup` and make that account an admin (it is approved at the same time):

```bash
npm run seed:admin -- you@example.com
```

Other database commands: `npm run db:status`, `npm run db:rollback` (one step down).

### Tests

```bash
npm test                # vitest: unit, DB (dsc_test), parity and engine-oracle tests
npm run typecheck
npm run build
```

The end-to-end smoke test runs against the real Docker image on port 3100. Create a gitignored
`.env.test` (no quotes) whose `DATABASE_URL` points at `dsc_test` through the Docker host, e.g.
`postgres://postgres:postgres@host.docker.internal:5435/dsc_test`, with `BETTER_AUTH_URL=http://localhost:3100`
and any `BETTER_AUTH_SECRET`. Then:

```bash
npx playwright install chromium   # once
docker build -t dsc-panel-guides .
docker run --rm -d --name dsc-e2e -p 3100:3000 --add-host=host.docker.internal:host-gateway \
  --env-file .env.test dsc-panel-guides
npx playwright test
docker stop dsc-e2e
```

The test signs up its own admin, promotes it with `seed:admin` against `dsc_test`, and deletes
every `@e2e.example.test` account when it finishes. It also fails on any CSP violation in the browser.

## Writing a guide

Guides are content, so they ship as tern migrations like everything else. Copy the shape of
`migrations/004_guide_create_partition.sql`:

```bash
npm run db:new guide_<slug>       # e.g. guide_add_user_code -> migrations/005_guide_add_user_code.sql
```

- One `INSERT INTO guide` (panel model, `slug`, `title`, `summary`, `danger`, `verified`, `position`)
  and one `INSERT INTO guide_step` with a row per step (`position`, `title`, `keys`, `note`,
  `warning`, `section_ref`). Use `$q$…$q$` quoting for text.
- **Keys** are space-separated tokens. The only valid tokens are `0`–`9`, `*`, `#`, `<`, `>`,
  `{installer}` and `{master}` (the code placeholders the keypad fills in). Anything else is rejected.
- `section_ref` is the section number the step works in (it links to the map), or `NULL`.
- A new guide ships with `verified = false`, so it shows an "unverified" badge. Only flip it after
  running the guide on a real panel. Never invent panel behaviour.
- Write the down part (`DELETE FROM guide WHERE slug = … AND panel_model_id = …`; steps cascade).

Then `npm run db:migrate && npm run db:migrate:test && npm test`. The guide lint test
(`tests/guides/lint.test.ts`) replays every stored guide through its panel engine and fails on a
bad token, on any step that leaves the keypad in an error state, or on a `section_ref` that isn't a
real section.

## Deploy

The server already runs Postgres in Docker, and nginx with certbot. DNS for dsc.iamonline.co.za
must point at the server before certbot runs.

**1. Create the database** (once) on the server's Postgres, e.g.:

```bash
docker exec -it <postgres-container> psql -U postgres \
  -c "CREATE ROLE dsc LOGIN" \
  -c "CREATE DATABASE dsc OWNER dsc"
docker exec -it <postgres-container> psql -U postgres
# then, at the psql prompt (the password never lands in shell history or the process list):
#   \password dsc
```

**2. Migrate.** Migrations never run when the container starts. Run them by hand from a checkout
of this repo. Install dependencies first, dev dependencies included (so no `NODE_ENV=production`);
`db:migrate` and `seed:admin` need dotenv and tsx. Then run with the production URL in the
environment (it overrides `.env`):

```bash
npm ci
DATABASE_URL='postgres://dsc:<password>@<host>:<port>/dsc' npm run db:migrate
```

This needs Node and the `tern` binary on that machine. If the server has no tern, run it from a
machine that has it and can reach the server's Postgres (e.g. through an SSH tunnel:
`ssh -L 5440:127.0.0.1:<pg-port> server`, then use `localhost:5440`). Run it before starting each
new image that brings new migrations.

**3. Build the image**, either on the server from a checkout:

```bash
docker build -t dsc-panel-guides .
```

or locally and ship it: `docker save dsc-panel-guides | ssh server docker load`.

Or push it to GitHub's registry with `deploy/build-and-push.sh` (tags the commit and `:latest`;
`--no-push` builds only, `PLATFORM=linux/amd64` cross-builds). Log in once first:
`gh auth refresh -s write:packages && gh auth token | docker login ghcr.io -u RolandRFuchs92 --password-stdin`.
On the server, `docker login ghcr.io` with a `read:packages` token, then `docker pull` and run that image.

**4. Run it.** Put the runtime env in a root-only file on the server, e.g.
`/etc/dsc-panel-guides.env` (`chmod 600`, no quotes around values):

```
DATABASE_URL=postgres://dsc:<password>@<host>:<port>/dsc
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://dsc.iamonline.co.za
```

```bash
docker run -d --name dsc-panel-guides --restart unless-stopped \
  -p 127.0.0.1:3000:3000 --env-file /etc/dsc-panel-guides.env dsc-panel-guides
curl -s http://127.0.0.1:3000/api/health      # {"ok":true,"db":true}
```

If Postgres is another container, `<host>` must be reachable from inside this container: put both
on the same Docker network (`--network <net>` and the Postgres container name as host), or publish
Postgres on the host and use `--add-host=host.docker.internal:host-gateway` with `host.docker.internal`.

Port 3000 is the container's published port on the server, and the nginx vhost proxies to
`127.0.0.1:3000`. If 3000 is taken, change **both** the `-p 127.0.0.1:<port>:3000` mapping and
`proxy_pass` in `dsc.iamonline.co.za`.

To update: build the new image, run any new migrations, then
`docker rm -f dsc-panel-guides` and the `docker run` above again.

**5. nginx.** The vhost now proxies to the container instead of serving files from `/var/www`:

```bash
cp dsc.iamonline.co.za /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/dsc.iamonline.co.za /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d dsc.iamonline.co.za
```

Certbot edits the vhost in place: it adds HTTPS and redirects plain HTTP to it. If the site
already had a certificate, copying the file over removes certbot's 443 block, so run certbot
again (it reuses the existing certificate). The old static files in `/var/www/dsc.iamonline.co.za`
can be deleted.

**6. First admin.** Sign up on the live site, then from the checkout:

```bash
DATABASE_URL='postgres://…/dsc' npm run seed:admin -- you@example.com
```

## Resetting a password

There is no email reset. From a checkout that can reach the database:

```bash
DATABASE_URL='postgres://…/dsc' npm run user:reset-password -- user@example.com
```

It prompts for the new password on the terminal (never from argv, env or a pipe). Existing
sessions stay signed in; revoke the user in `/admin/users` first if that matters.

## Security notes

- The app sends a strict Content-Security-Policy with a fresh nonce per request (`proxy.ts`).
  No inline `style=` attributes or inline scripts: use CSS modules or `app/globals.css`.
  Fonts are self-hosted through `next/font`.
- nginx adds `X-Content-Type-Options` and `Referrer-Policy`.
- Menu data comes from the DSC PC1616/PC1832/PC1864 v4.2 installation guide. Check your panel's
  version with `[*][8][installer code][900]`. Anything not checked on a real panel is marked unverified.
