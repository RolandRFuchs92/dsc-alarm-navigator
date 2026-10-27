# Panel Guides — design

_2026-10-27 · Roland + Claude · status: draft for approval_

## Why

The current app (`src/`, static HTML/JS) maps the DSC PC1864 installer menu and simulates a keypad. It helps
answer "which section am I in", but it can't answer "how do I do job X". Roland wants to stand at a real
panel, phone in hand, pick the device, pick a guide such as "Create a new partition" or "Delete all
partitions", and follow plain steps one at a time. The on-screen keypad should look like the one on the
wall, so he can be sure he's looking at the right thing.

Guides are written by Claude and shipped as **tern migrations**, so they are versioned in git like code.
The first real guides will come from Roland reconfiguring his own alarm, tested against the actual panel.

## Goals

1. A server-rendered Next.js app that replaces the static site at dsc.iamonline.co.za, shipped as a Docker image.
2. Email/password accounts. New accounts are **unapproved** until Roland approves them on an admin page.
3. Everything about a panel lives in Postgres: models, menu groups, sections, options, defaults, tips,
   keypad commands, guides and steps. The only exceptions are keypad *behaviour* and keypad *looks*, which are code.
4. One React keypad component per keypad model. The user picks the keypad that matches theirs.
5. Guides are stepped **manually** (Next / Back). The keypad shows the state the real keypad should be in at that step.
6. The existing menu map and simulator are ported in, at parity with today's app.

## Non-goals (v1)

- Editing guides in the UI. Content changes go through migrations only.
- Multi-tenancy, organisations, per-user content. Everything is one shared library behind login.
- Talking to real panel hardware (IT-100, TL280, etc.).
- Brands other than DSC. The structure must allow them, but nothing gets built for them yet.
- Deciding the day-one guide list. Roland will bring real jobs once the app exists.
- Saving progress through a guide across sessions.

## Anti-goals (a failure even if it works)

- **Autoplay.** Guides must never advance on their own like a video.
- **Executable code stored in the database.** No `eval` and no stored JS. Computed labels use a fixed rule vocabulary (below).
- **Anyone using the app without approval**, including someone who signs up before Roland's admin account exists.
- **A simulator that disagrees with the real panel.** Where the data is unverified, say so; never invent behaviour.
- Ports that lose content from today's app, for example a section label that comes out differently.

## Users and access

- Open sign-up (email + password). A new user has `approved = false` and sees only a "waiting for approval" screen.
- `is_admin` users get `/admin/users`: email, sign-up date, status, with Approve and Revoke buttons.
  Revoking takes effect on the next request, because the check runs server-side on every request, not just at login.
- The first admin is made by **promoting an existing account**: Roland signs up normally (landing on `/pending`), then runs
  `npm run seed:admin -- <email>`, which sets `approved = true, is_admin = true` on that user. No password ever passes
  through a script or env var. Anyone else who signs up before or after stays unapproved.
- Password reset in v1 is `npm run user:reset-password -- <email>`, which reads the new password from a hidden stdin prompt
  and hashes it with better-auth's hasher. No email sending.
- Approved users see everything. There are no other roles.

## Stack (decided)

Mirrors Roland's `stedy` backend so the patterns are familiar:

- Next.js (App Router, server components, server actions), TypeScript, Node 24, npm.
- Postgres 16. **tern** owns the schema and the content (`migrations/*.sql`), run through a `scripts/tern.mjs` wrapper like stedy's.
- better-auth for email/password and sessions, stored in Postgres. Its tables are created by a tern migration, not by its own migrator.
- `pg` plus drizzle-orm for queries only (tern stays the single source of schema). zod for validating JSON columns.
- vitest for tests.
- Local dev: `docker-compose.yml` with a throwaway Postgres. Prod: Roland creates a database on his existing
  Docker Postgres and runs `tern migrate` himself. Migrations do **not** run on container start.
- Secrets (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) come only from env vars. `.env.example` lists them, without values.
- Roland's code style: `const result = …; return result;`, and function names start with a verb ("VANS").

## The core split: data in Postgres, behaviour in code

Analysis of today's app:

- `data.js` (736 lines) is about 95% plain data. About 30 fields are small JS functions
  (`describe`, `entriesFor`, `optionsFor`), and they all fall into three patterns.
- `app.js` (1,225 lines) is mostly DSC firmware behaviour: [*][8] + code enters programming, Armed LED means
  "type a section", Ready LED means "type data", HEX entry, [#] backs out, sub-sections, toggle pages.
  That logic is shared by every DSC PowerSeries panel and is completely different on other brands.

So:

| Concern | Lives in |
|---|---|
| Manufacturer → panel family → panel model (PC1864 v4.2) | DB |
| Keypad behaviour per family (`dsc-powerseries`) | Code: a pure TS **engine**, picked by `panel_family.engine_key` |
| Keypad looks per keypad model (PK5500 full LCD, PK5501 icon LCD, PK5508/16 LED…) | Code: a React **component**, picked by `keypad_model.component_key` |
| Which keypads a model supports | DB (join table) |
| Menu groups, sections, entries, options, defaults, tips, related, sub-sections, keypad commands, lookups | DB |
| Guides and steps | DB |
| User's last keypad choice per panel model | DB |

### Engine contract

An engine is a **pure reducer**: `pressKey(state, key, model) → state`, plus selectors
(`selectDisplay` (a tagged union: `text` lines | `icons` set | `lights` numbered on/flash states), `selectLeds`, `selectLocation` for the "you are here" text and breadcrumbs). It never
touches the DOM. Components only render what the selectors return and send key presses back.
Because the reducer is pure, the state at any guide step can be rebuilt by replaying keys from reset (see Guides).

### Rule vocabulary for computed fields

The JS functions in `data.js` are replaced by a JSON `rule` on range sections. The vocabulary is fixed, and a new pattern means a code change:

1. **offset**: index = n − start + base. Example: [181]–[188] gives "Partition {i}".
2. **block**: index = n − start; first = index × size + 1; last = first + size − 1, optionally capped by `max`.
   Example: [320]–[323] gives "Zones {first}-{last}"; [601]–[604] gives users 33–95, capped at 95.
3. **grid**: index = n − start; group = floor(index / perGroup) + 1; within = index mod perGroup; first = within × size + 1.
   Example: [202]–[265] gives "Partition {group}, zones {first}-{last}".

Labels are templates over those variables (`{i}`, `{group}`, `{first}`, `{last}`). Entries and options for a
range are either a static list or a template list generated from the same variables. One example is option k
"Zone {first + k − 1} on this partition". Defaults may depend on the section, as in "on only for [202]",
so the rule needs a small `defaultWhen` form. Fixed lists like `s301`'s labels (1st/2nd/3rd number) are stored
as a `labels` array indexed by n − start.

## Data model (outline)

Shape, not final DDL:

- **better-auth tables** (`user`, `session`, `account`, `verification`), plus `user.approved boolean default false` and `user.is_admin boolean default false`.
- `manufacturer` (id, slug, name).
- `panel_family` (id, manufacturer_id, slug, name, engine_key), e.g. `dsc-powerseries`.
- `panel_model` (id, family_id, slug, name, firmware, installer_code_default, master_code_default, source_doc), e.g. `pc1864`, "v4.2", "29007359R003".
- `keypad_model` (id, family_id, slug, name, component_key, description). `panel_model_keypad` (panel_model_id, keypad_model_id, is_default).
- `menu_group` (id, panel_model_id, slug, label, position).
- `section` (id, group_id, slug such as `s202`, num or range_start/range_end, kind, label, description,
  sub_digits, rule jsonb, entries jsonb, options jsonb, subs jsonb, tips jsonb, related jsonb, pages,
  confirm, danger, verified boolean, position).
- `keypad_command` (id, panel_model_id, slug such as `k5`, keys, label, kind, description, payload jsonb).
- `lookup` (panel_model_id, key such as `zone_types`, values jsonb). Covers ZONE_TYPES, PGM_TYPES, FUNCTION_KEY_TYPES, COMM_FORMATS, LOOKUPS.
- `guide` (id, panel_model_id, slug, title, summary, danger, verified, position).
- `guide_step` (id, guide_id, position, title, keys, note, warning, section_ref nullable). `section_ref` is a
  section number such as 202, resolved within the guide's model.
- `user_keypad_choice` (user_id, panel_model_id, keypad_model_id).

Every JSON column has a zod schema, checked when the data is read.

## Routes

- `/login`, `/signup`, `/pending` (the waiting-for-approval screen)
- `/devices`: list of panel models
- `/devices/[model]`: that model's guides, plus a link into the menu map, plus the keypad picker
- `/devices/[model]/map`, `/devices/[model]/map/[section]`: the ported menu map and simulator, with deep links replacing today's `#s005` hashes
- `/devices/[model]/guides/[slug]`: a guide
- `/admin/users`: admin only

Everything except login, signup and pending requires an approved session, enforced in middleware **and**
re-checked in the server layout and in server actions.

## Guides

- A guide page shows one step at a time: title, the keys as keycaps, a note, an optional warning (red), and a
  "View this section" link to the map. Next and Back buttons are fixed at the bottom for thumbs. The current step goes in the URL (`?step=3`), so a refresh keeps your place.
- The keypad sits under the step and shows the **expected state at the start of the step**: the engine replays every
  step's keys from reset up to the previous step. The keypad stays interactive. Taps there are a scratch
  layer, and a "Back to step" button resets the keypad to the step's expected state.
- Keys are stored as a token string like `* 8 {installer} 2 0 1 #`. `{installer}` and `{master}` show as labelled
  keycaps ("installer code") and are replayed using the model's defaults. Steps with no keys (for example "wire the zone") are allowed.
- The replay starts from **factory defaults**, never from a user's saved worksheet, so every user sees the same expected state.
- Key tokens in v1 are `0`–`9`, `*`, `#`, `<`, `>` and the placeholders. Fire/Aux/Panic, function keys and press-and-hold aren't needed for programming guides and are left out until a guide needs them.
- Every guide is one migration file, such as `0xx_guide_create_partition.sql`. Its down-migration deletes that guide.

### Sample guide: "Create a new partition" (pc1864)

The example adds partition 2 using zones 9–16. All sections already exist in the ported data.

| # | Title | Keys | Note / warning | section_ref |
|---|---|---|---|---|
| 1 | Enter installer programming | `* 8 {installer}` | Armed light on = waiting for a section number. | — |
| 2 | Turn the partition on | `2 0 1 2 #` | Toggle 2 shows on the display. Partition 1 is always on. | 201 |
| 3 | Give it zones 9–16 | `2 1 1 1 2 3 4 5 6 7 8 #` | [210]–[217] are partition 2's zone sections; [211] = zones 9–16. | 211 |
| 4 | Check partition 1 still has zones 9–16 | `2 0 3 #` | Look at options 1–8: any that are ON are zones 9–16 still on partition 1. Press that number to turn it off, then press #. Warning: a zone left on both partitions only arms when both are armed. | 203 |
| 5 | Check the zone types | `0 0 1 #` | View only: zones 9–16 are in [001]. Set types if they've never been used. | 1 |
| 6 | Set entry/exit delays | `0 0 5 0 2 0 3 0 0 4 5 1 2 0 #` | Sub-section [02] = partition 2: Entry 1, Entry 2, Exit (defaults 030/045/120). | 5 |
| 7 | Assign this keypad to partition 2 | `0 0 0 0 2 2 #` | Do this at the keypad that will run partition 2. 22 = partition 2, slot 2. Each keypad needs its own slot. | 0 |
| 8 | Rescan modules | `9 0 2 #` | The panel rescans keypads and modules. Wait for the rescan to finish before pressing #. | 902 |
| 9 | Leave installer programming | `#` | | — |
| 10 | Give users access | `* 5 {master} 9 8 0 2 2 #` | Outside installer mode. 02 = user 2; press 2 to toggle partition 2 for that user. Repeat per user. | — |

The builder must check every key string by replaying it through the ported engine; where the engine and this table disagree, flag it rather than guess. The guide ships `verified = false` until Roland has run it on his real panel.

## Getting today's content in

A one-off converter script loads `src/data.js` and writes the first content migration (groups, sections,
commands, lookups for `pc1864`). It translates each function field into a `rule`. A **parity test** evaluates
every rule for every section number in every range and compares it against the old functions' output
(labels, entries, options, defaults). The migration isn't accepted until the test matches 100%. After that,
`src/` is deleted, and later content changes are hand-written migrations.

## Deployment

- Multi-stage `Dockerfile`, Next.js `output: 'standalone'`, `node:24-alpine`, non-root user, listening on port 3000.
- The nginx vhost `dsc.iamonline.co.za` changes from serving static files to `proxy_pass` to the container. Keep the
  security headers. The CSP will need adjusting for Next.js (nonces or hashes for its inline scripts), and Google Fonts move to `next/font` (self-hosted).
- The README is updated with the new local dev, migrate, seed-admin and deploy steps.

## Calls Claude made (check these)

- **Keypads in v1: PK5500 and PK5508/PK5516.** PK5500 is the full-message LCD, which matches Roland's keypad. PK5508/PK5516
  are zone-light LED keypads with no screen. They sit at opposite ends and together prove the engine contract.
  The engine's display selector must cover all three display types from day one: text lines, fixed-message icons
  (PK5501) and numbered zone lights (PK5508/16/32). After that, more keypads are component-only work.
  How an LED keypad's lights show section numbers, toggle options and data digits in programming mode must come from
  the v4.2 install guide. It is not in today's app, so it must not be guessed. Anything the guide doesn't cover is
  marked unverified in the UI.
- **One sample guide, "Create a new partition"**, ships to prove the pipeline end to end. Its content comes from the answer
  already given earlier in this conversation. Everything else waits for Roland's real jobs.
- Single Next.js app at the repo root (not a monorepo). `src/` stays until parity is proven, then it's removed.
- No email sending in v1: no email verification, and password reset is done by an admin through the CLI.
- Your last keypad choice is remembered per user per panel model.
- Today's "my entries" worksheet (values typed into the simulator, saved in browser `localStorage`) is kept as-is:
  per browser, used by the menu map only, not stored in the database. Guide replay ignores it. The engine state
  holds values and toggles so the map can show them.
- Sections whose details I couldn't confirm in the install guide ([501] opt 4, [311] defaults) carry `verified = false` and show a small "unverified" badge.

## Left to the builder

Visual design within the existing look (Barlow fonts, keypad styling), drizzle schema mapping, test layout,
exact zod schemas, the converter's implementation, breadcrumb details, and the CSP mechanics.
