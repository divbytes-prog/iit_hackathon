# Hearthlog

**A cozy Life RPG for people whose to-do list has stopped working.**

Reading a book pays off in a year. The gym pays off in six months. A game pays off in
four seconds — which is why you finished the game. Hearthlog puts the four-second loop
around the rest of your life.

Write down what you mean to do, file it under one of five attributes, and finish it.
Experience and coffee beans land the instant you tick the box. Every consecutive day
raises what your work is worth. Beans buy mugs, plants, lamps, badges and records that
repaint the entire interface.

| | |
|---|---|
| **Live app** | _add your deployed URL here_ |
| **API** | _add your deployed API URL here_ |
| **Walkthrough video** | _add your video link here_ |
| **Stack** | React 18 · Vite · Express 4 · MongoDB Atlas · Mongoose 8 · JWT |

---

## Table of contents

- [What it does](#what-it-does)
- [Why you cannot cheat at it](#why-you-cannot-cheat-at-it)
- [The progression engine](#the-progression-engine)
- [Running it locally](#running-it-locally)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Testing](#testing)
- [Deployment](#deployment)
- [Accessibility](#accessibility)
- [Design notes](#design-notes)

---

## What it does

**Intentions.** Create, read, update, delete and complete tasks. One-off or repeating
(daily / weekly). Each carries an attribute, a difficulty, optional notes, tags and a
due date. Search, filter by attribute, sort five ways.

**Five attributes.** Every intention grows one part of the character — **Mind** (study,
reading, deep work), **Body** (movement, sleep, food), **Craft** (making things),
**Heart** (people, rest, journalling) and **Order** (chores, admin). Each levels
independently on its own curve, so after a month the shape of your attributes tells you
something a streak counter never could.

**Chapters, not levels.** A non-linear curve: each chapter costs strictly more than the
last. Chapter 2 is 132 XP; chapter 20 is 5,680. Titles change as you climb — Kettle
Novice, Lamp Keeper, Hearthwarden, Patron Saint of Tuesdays.

**The hearth.** A streak of consecutive days, in *your* timezone, not the server's. It
raises every reward by 1% per day up to +30%. Miss a day and a **Dented Thermos** bought
from The Shelf will cover for you, once.

**The Shelf.** Fifteen items across six categories, bought with beans. Cosmetics equip
to your desk; **records** repaint the whole interface (Daylight, Dusk Sessions, Rain On
The Window, Midnight Oil); badges pin to your corkboard; thermoses protect the streak.

**The Logbook.** An append-only, dated history of every completion, level, purchase and
broken streak, with a 30-day activity ribbon and a per-attribute breakdown. This is the
audit trail the totals are derived from.

---

## Why you cannot cheat at it

The brief asks for a backend that stops users trivially inflating their stats. Five
things do that work, and all five are covered by the test suite:

**1. Rewards are calculated server-side, from server-held state.** The client sends a
task id and nothing else. XP and beans come from the task's difficulty and the
character's own streak — both read from the database, never from the request.

**2. Every schema is a strict whitelist.** `xpAwarded`, `beansAwarded`, `level`, `beans`
and `status: "completed"` are not fields any endpoint accepts. A request carrying them
gets a `422`, not a silent no-op:

```bash
curl -X POST .../tasks -d '{"title":"Free money","attribute":"mind","xpAwarded":999999}'
# 422 VALIDATION_ERROR — "Unrecognized key(s) in object: 'xpAwarded'"
```

**3. Completion is idempotent, and atomically so.** The status flip is a conditional
`findOneAndUpdate`. If the condition does not match, someone already claimed it and
nothing is awarded. Five concurrent completion requests for the same task pay out
exactly once — there is a test that fires them in parallel and asserts the bean balance.

**4. Undo claws back precisely what was granted.** The awarded amounts are stored on the
task, so "complete → undo → complete" cannot mint currency even if the streak
multiplier changed in between.

**5. Diminishing returns past a generous allowance.** The first twelve completions of a
day are worth full value; each one after that is worth 10% less, floored at 25%. Someone
having a heroic day is still rewarded. Someone scripting a loop stops profiting.

On top of that: bcrypt at cost 12, JWTs with a hashed refresh token (so logout genuinely
revokes), `helmet`, CORS with an explicit origin allow-list, `express-mongo-sanitize`
against operator injection, and rate limits on authentication and on writes. **Every
database query is scoped to `owner: req.user._id`** — there is no code path that reads or
writes a task without it.

---

## The progression engine

Both curves are quadratic, so every level costs strictly more than the one before.

```
Chapter L → L+1     80 + 40L + 12L²
Attribute L → L+1   50 + 20L +  5L²
```

| Chapter | XP to next | | Attribute | XP to next |
|--------:|-----------:|---|----------:|-----------:|
| 1 | 132 | | 1 | 75 |
| 2 | 208 | | 2 | 130 |
| 5 | 580 | | 5 | 275 |
| 10 | 1,680 | | 10 | 750 |
| 20 | 5,680 | | 20 | 2,450 |

Base rewards by difficulty:

| Tier | XP | Beans |
|------|---:|------:|
| Trivial | 8 | 3 |
| Easy | 16 | 6 |
| Medium | 32 | 13 |
| Hard | 58 | 26 |
| Epic | 95 | 48 |

Final reward = `base × streakBonus × fatigue`, where `streakBonus` is `1 + min(streak, 30) × 0.01`
and `fatigue` decays past twelve completions a day. None of this is hidden from players —
**Settings → How scoring works** fetches these exact tables from the API and renders them.

---

## Running it locally

**Prerequisites:** Node.js 18.17+ and a MongoDB connection string (Atlas free tier is
fine).

```bash
git clone <your-repo-url>
cd hearthlog
```

**1. The API**

```bash
cd backend
npm install
cp .env.example .env      # then fill in MONGODB_URI and the two JWT secrets
npm run seed              # loads the 15 shop items (idempotent)
npm run dev               # http://localhost:4000
```

Generate the JWT secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**2. The web app**

```bash
cd frontend
npm install
cp .env.example .env      # defaults point at http://localhost:4000
npm run dev               # http://localhost:5173
```

**3. Check it came up**

```bash
curl http://localhost:4000/api/v1/health
# {"success":true,"data":{"status":"ok","database":"connected",...}}
```

---

## Environment variables

### `backend/.env`

| Variable | Required | Default | Notes |
|---|:---:|---|---|
| `NODE_ENV` | | `development` | `production` enables secure cookies and a strict CSP |
| `PORT` | | `4000` | |
| `MONGODB_URI` | ✅ | — | Full `mongodb+srv://` connection string |
| `MONGODB_DB_NAME` | | `hearthlog` | |
| `JWT_ACCESS_SECRET` | ✅ | — | Long random string |
| `JWT_REFRESH_SECRET` | ✅ | — | A **different** long random string |
| `JWT_ACCESS_TTL` | | `15m` | |
| `JWT_REFRESH_TTL` | | `30d` | |
| `JWT_REFRESH_TTL_MS` | | `2592000000` | Cookie `maxAge`; keep in step with the above |
| `CORS_ORIGIN` | | `http://localhost:5173` | Comma-separated. Must list your deployed frontend |
| `TRUST_PROXY` | | `false` | Set `true` on Render / Railway / Fly / Heroku |
| `COOKIE_DOMAIN` | | — | Only for cross-subdomain cookie sharing |

### `frontend/.env`

| Variable | Required | Default | Notes |
|---|:---:|---|---|
| `VITE_API_BASE_URL` | | `http://localhost:4000/api/v1` | Include the `/api/v1` suffix |
| `VITE_SITE_URL` | | `http://localhost:5173` | Used for canonical and Open Graph tags |

Both files ship as `.env.example`. Neither `.env` is committed.

---

## Project structure

```
backend/
├── src/
│   ├── config/           env parsing (fails fast) and the Mongo connection
│   ├── constants/        attributes, difficulty tiers, titles, the shop catalog
│   ├── models/           User, Task, ActivityLog, Item
│   ├── validators/       Zod schemas — the strict whitelist that blocks tampering
│   ├── middlewares/      auth, validation, rate limiting, 404, error normaliser
│   ├── services/         the domain layer: progression, streaks, tasks, shop, tokens
│   ├── controllers/      thin HTTP adapters over the services
│   ├── routes/           route tables + /health
│   ├── seed/             idempotent catalog seeder
│   ├── utils/            ApiError, ApiResponse, asyncHandler, logger, timezone dates
│   ├── app.js            middleware pipeline
│   └── server.js         boot, graceful shutdown
└── tests/api.smoke.test.js

frontend/
├── src/
│   ├── api/              fetch wrapper (token refresh, typed errors) + endpoints
│   ├── components/       Icon set, CharacterCard, StreakHearth, IntentionCard, …
│   ├── context/          AuthContext (session + snapshot), ToastContext
│   ├── hooks/            useIntentions (optimistic writes), useCountUp, useFocusTrap, …
│   ├── pages/            Landing, Auth, Desk, Intentions, Shelf, Logbook, Settings, 404
│   ├── styles/           design tokens, base layer, crash screen
│   └── utils/            shared vocabulary and formatting
└── public/               robots.txt, sitemap.xml, manifest, SPA redirects
```

Business rules live in `services/`, not in controllers. `progression.service.js` and
`streak.service.js` are pure functions over plain objects — no database, no `req` — which
is what makes the curve and the streak edge cases straightforward to reason about.

---

## API reference

Base URL: `/api/v1`. Every response uses one envelope:

```jsonc
// success
{ "success": true, "data": { … }, "message": "…", "meta": { … } }

// failure
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [ … ] } }
```

Authentication is a Bearer token **or** an httpOnly cookie; the client uses both so it
works with or without third-party cookies.

| Method | Endpoint | Auth | Purpose |
|---|---|:---:|---|
| `GET` | `/health` | | Liveness + database state |
| `POST` | `/auth/register` | | Create an account |
| `POST` | `/auth/login` | | Sign in |
| `POST` | `/auth/refresh` | | Exchange the refresh cookie for a new access token |
| `POST` | `/auth/logout` | | Revoke the refresh token |
| `GET` | `/auth/me` | ✅ | Current user + character snapshot |
| `GET` | `/tasks` | ✅ | List — `status`, `attribute`, `difficulty`, `q`, `sort`, `page`, `limit` |
| `GET` | `/tasks/today` | ✅ | The Desk, in one round trip |
| `POST` | `/tasks` | ✅ | Create |
| `GET` | `/tasks/:id` | ✅ | Read one |
| `PATCH` | `/tasks/:id` | ✅ | Update (cannot set completion or rewards) |
| `DELETE` | `/tasks/:id` | ✅ | Delete |
| `POST` | `/tasks/:id/complete` | ✅ | **Complete — the only endpoint that mints XP and beans** |
| `POST` | `/tasks/:id/reopen` | ✅ | Undo, clawing back the exact amounts |
| `POST` | `/tasks/reorder` | ✅ | Persist manual ordering |
| `GET` | `/character` | ✅ | Full snapshot |
| `GET` | `/character/rules` | | The scoring tables — public on purpose |
| `PATCH` | `/character/preferences` | ✅ | Theme, motion, timezone, display name |
| `GET` | `/shop/items` | ✅ | Catalog, annotated with owned / locked / affordable |
| `POST` | `/shop/purchase` | ✅ | Buy (price read server-side from the catalog) |
| `GET` | `/shop/inventory` | ✅ | What you own and what is equipped |
| `POST` | `/shop/equip` | ✅ | Equip or unequip a cosmetic you own |
| `GET` | `/stats/summary` | ✅ | 30-day ribbon, attribute breakdown, lifetime totals |
| `GET` | `/stats/activity` | ✅ | Paginated Logbook feed |

---

## Data model

**User** — credentials, IANA timezone, `character` (level, xp, totalXp, beans, equipped
cosmetics), `attributes` (five independent progress sub-documents), `streak` (current,
longest, lastActiveDay, freezes), `inventory`, `badges`, `unlockedThemes`, `preferences`,
and a hashed refresh token. The password hash and refresh hash are `select: false`, so
they never leave the database by accident.

**Task** — `owner`, title, notes, attribute, difficulty, status, recurrence, dueDate,
`completedAt`, `lastCompletedDay`, and the `xpAwarded` / `beansAwarded` audit fields.
Compound indexes on `{owner, status, position, createdAt}` and `{owner, completedAt}`.

**ActivityLog** — append-only receipts: `task_completed`, `level_up`,
`attribute_level_up`, `streak_extended`, `streak_frozen`, `streak_broken`, `purchase`,
`badge_earned` and more, each with XP/bean deltas and the user-local day.

**Item** — the shop catalog, seeded by slug from `constants/catalog.js`. Items removed
from the constant are deactivated rather than deleted, so anyone who already owns one
keeps it.

### A note on timezones

Streaks are the one place where "what day is it" has to match the user's own wall clock.
The IANA timezone is captured at signup and every calendar day is resolved through
`Intl.DateTimeFormat` against it, so finishing something at 11pm in UTC+5:30 counts for
the right day. Dividing a UTC timestamp by 86,400,000 would not.

---

## Testing

```bash
cd backend
npm run dev          # in one terminal
npm run test:api     # in another
```

The suite spins up two throwaway accounts and runs **90 checks** against a live server,
including the paths that are supposed to fail:

- **Auth** — weak passwords, malformed emails, duplicate registration, wrong password,
  forged tokens, missing tokens, logout revocation, session persistence across sign-out
- **CRUD** — empty titles, missing and unknown attributes, over-long titles, malformed
  ids, search, filtering, due dates (null, empty, real, and cleared)
- **Anti-cheat** — `xpAwarded` on create and on update, direct `status: "completed"`,
  bean injection via preferences, and buying an unpurchased theme
- **Isolation** — a second account attempting to read, edit, delete, complete and
  reorder the first account's tasks, plus logbook leakage
- **Progression** — reward maths, attribute XP, double completion, **five concurrent
  completions awarding exactly once**, undo clawback, repeating rituals
- **Economy** — unknown items, client-supplied prices, insufficient funds, level locks,
  double purchase, equipping something you do not own
- **Stats** — ribbon length, attribute breakdown, activity log contents

All 90 pass against MongoDB Atlas.

---

## Deployment

The repo ships with `render.yaml` (API) and `frontend/vercel.json` (web), plus a
`_redirects` file for Netlify. Any host works; these are just the paved paths.

**API — Render / Railway / Fly**

1. Root directory `backend`, build `npm install`, start `npm start`
2. Set every variable from the table above. Set `TRUST_PROXY=true` — without it, rate
   limiting keys every request to the proxy's IP and secure cookies are never set
3. Set `CORS_ORIGIN` to your deployed frontend origin, exactly, no trailing slash
4. Run `npm run seed` once to load the shop
5. Point the health check at `/api/v1/health`

**Web — Vercel / Netlify**

1. Root directory `frontend`, build `npm run build`, output `dist`
2. Set `VITE_API_BASE_URL` to `https://<your-api>/api/v1`
3. The included config rewrites all paths to `index.html`, so deep links and refreshes
   on `/app/shelf` resolve instead of 404ing

**MongoDB Atlas** — add your host's egress IPs to Network Access, or `0.0.0.0/0` if the
platform has no static IPs.

> The two most common deployment failures are a `CORS_ORIGIN` that does not exactly match
> the deployed frontend, and an Atlas IP allow-list that does not include the API host.
> `/api/v1/health` reports `database: "connected"` when the second one is right.

---

## Accessibility

Audited at zero issues — every interactive element named, no heading-level jumps, one
`<h1>` per page, landmarks present, `lang` set.

- **Keyboard** — everything is a real `<button>` or `<a>`; nothing relies on a click
  handler bolted to a `<div>`. Completion checkboxes carry `aria-pressed`, so their state
  is announced. Dialogs trap focus, close on <kbd>Esc</kbd>, and return focus to whatever
  opened them. A skip link is the first stop in the tab order.
- **Screen readers** — semantic landmarks throughout; progress bars are real
  `role="progressbar"` elements with min/max/now; toasts announce politely and errors
  assertively; the activity ribbon carries a text summary of what it shows.
- **Motion** — `prefers-reduced-motion` is honoured, *and* there is an in-app toggle for
  people whose OS setting does not reflect what they want right now. With it on,
  celebrations still happen — they just stop moving.
- **Touch** — 44px+ targets on mobile; row controls are always visible where there is no
  hover.
- **Colour** — body text sits at 8:1 against paper; no state is communicated by colour
  alone (difficulty also has pips, completion also has a strikethrough).

---

## Design notes

The theme is a cozy lo-fi study: cream paper, terracotta, sage and ochre, with
[Fraunces](https://fonts.google.com/specimen/Fraunces) — a variable serif with `SOFT` and
`WONK` axes dialled up — for display type and Inter for body copy. There is no CSS
framework; the design system is about 200 lines of custom properties in
`styles/tokens.css`, and every component reads from it. Swapping a record redefines
those properties and the entire interface repaints.

A few deliberate decisions:

- **The grain.** A single inlined SVG turbulence filter, tiled and multiplied over the
  page. It is most of what stops the interface reading as flat vector-on-white.
- **Hand-drawn icons.** Every glyph is drawn on a 24-unit grid, deliberately a little
  irregular. Stock icon fonts are the fastest way to look like every other app.
- **The checkbox gets the most attention.** It is the 36 most important pixels in the
  product: a spring that overshoots on press, and a tick that draws itself along its own
  path rather than fading in.
- **Optimistic everything.** Completing, editing and deleting all update locally first
  and reconcile with the server's answer. A failure visibly reverts and says why — the
  UI never claims something was saved when it was not.
- **Honest empty and error states.** When the API is unreachable the app keeps your
  session, shows a banner, and renders skeletons rather than inventing a Chapter 1 with
  zero beans. It recovers on its own when the server comes back.

---

## Licence

MIT.
