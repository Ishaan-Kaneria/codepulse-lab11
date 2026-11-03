# CodePulse: LeetCode-style Practice Management System

**Team 25 · MC212 Database Management Systems · Lab 11 (Database Connectivity + GUI)**
Ishaan Kaneria (202503004) · Mann Chauhan (202503045)

CodePulse is a web interface for our PostgreSQL database (42 tables in BCNF, about 14,900 rows).
It shows every functional requirement in SRS V6 on its own screen. It also gives full **CRUD on the `problems` table**,
plus a Query Lab that runs all 30 Lab 10A queries on the live database.

Stack (Lab 11, **Option B: JavaScript**): **PostgreSQL 16 → node-postgres (`pg`) → Node.js + Express REST API → HTML + JavaScript (`fetch`)**.

---

## Screens

| Screen | SRS V6 function | What you can do |
|---|---|---|
| Overview | all | Live totals, verdict mix, difficulty split, languages, latest submissions, and links to all 12 SRS functions |
| Problem Library | 1, 2, 7 | **Create / Read / Update / Delete problems**, with topic tags, company tags, test cases and per-problem judging stats |
| Submissions & Judge | 3, 11, 12 | Filter by verdict, language, user or contest; open a submission to see its code blob and its failure log |
| Contests & Leaderboard | 4 | Every contest, its pre-calculated leaderboard, its problem set, and the global rating ladder |
| Solver Progress | 5, 4, 10 | Profile, solved rings, topic accuracy, rating graph (`LAG`), badges, practice suggestions, people to follow |
| Premium & Access | 6 | Subscriptions, renewal reminders, revenue, payments, gating rules, and a live **access checker** |
| Companies & Editorials | 7 | Company frequency snapshots (30/90/180-day windows), problems asked, and editorials with code snippets |
| Discussions | 8 | Posts with votes, bookmarks and comments; threaded replies; top contributors |
| Moderation | 9 | Review queue (reports with no review), reasons, moderator workload, full review history |
| Study Plans & Badges | 10 | Plans with their ordered days, learner progress, badge catalogue, and badges due |
| Code Integrity | 11, 12 | SHA-256 dedup savings, identical contest code, and a check that failure logs stay disjoint |
| Query Lab · 10A | n/a | Run any of the 30 Lab 10A queries and see the output |
| Connection & Schema | n/a | `SELECT version()`, the request path, and a row count for all 42 tables |

Every card has a **View SQL** button that shows the exact statement the server runs.

---

## Project layout

```
codepulse/
├── server/
│   ├── db.js                 # new Pool() + run() + withTransaction()   <- connection code (Lab 11 A)
│   ├── app.js                # Express app: /api/health, /api/q/:key, /api/lab10a, error handling
│   ├── index.js              # starts the server locally / in a Codespace
│   ├── routes/problems.js    # CRUD on problems (INSERT / SELECT / UPDATE / DELETE)  <- Lab 11 B
│   └── queries/
│       ├── srs.js            # read-only queries for every SRS screen (placeholders only)
│       └── lab10a.js         # the 30 Lab 10A queries
├── public/                   # the frontend (HTML + CSS + JavaScript fetch)   <- Lab 11 C
│   ├── index.html
│   ├── css/style.css
│   └── js/core.js, js/app.js
├── netlify/functions/api.mjs # wraps the same Express app as a Netlify Function (v2)
├── netlify/database/migrations/ # the two SQL files, applied to Netlify Database on deploy
├── scripts/
│   ├── test-connection.js    # prints SELECT version()                      <- Lab 11 A
│   └── load-db.js            # loads db/*.sql into any database (e.g. Neon)
├── db/01_create_tables.sql   # 42 tables, enums, keys, checks, trigger, indexes
├── db/02_insert_data.sql     # all rows
├── .devcontainer/            # GitHub Codespaces: Node 22 + PostgreSQL 16, data pre-loaded
├── netlify.toml
└── .env.example              # copy to .env; .env itself is never committed
```

---

## 1. Run it on your laptop (your pgAdmin database)

You have already loaded the two SQL files into PostgreSQL, so:

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
# open .env and set PGDATABASE, PGUSER, PGPASSWORD to your own values
npm run test:conn           # should print the PostgreSQL version and "Tables in public schema: 42"
npm start                   # open http://localhost:3000
```

Use `npm run dev` to restart automatically when you edit server files.

## 2. Run it in GitHub Codespaces

1. Push this folder to your GitHub repo.
2. On GitHub, click **Code → Codespaces → Create codespace on main**.
3. Wait for the first build (about 2–3 minutes). The Codespace starts **two containers**: Node 22 and PostgreSQL 16.
   On first start, PostgreSQL runs `db/01_create_tables.sql` and `db/02_insert_data.sql` by itself.
4. `.env` is created for you from `.devcontainer/codespace.env`, and `npm start` runs automatically.
   Port **3000** opens in a preview tab. Use the **Ports** tab to open it in a browser or share it.

The SQLTools extension is pre-configured, so you can browse the tables inside VS Code as well.
To reload the data from scratch: `npm run db:load`.

## 3. Deploy on Netlify (public link)

Netlify hosts the website and runs the API as a serverless function. It **cannot reach the PostgreSQL on your laptop**,
so the live site needs a hosted PostgreSQL database. Neon's free plan works well:

1. **Create the database.** Sign up at neon.tech, create a project (PostgreSQL 16, the region closest to you), and copy the
   **connection string**. It looks like `postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require`.
2. **Load our data into it** from your laptop or the Codespace terminal:
   ```bash
   DATABASE_URL="postgresql://…your Neon string…" npm run db:load
   ```
   (On Windows PowerShell: `$env:DATABASE_URL="…"; npm run db:load`.) You can also paste the two SQL files into Neon's SQL Editor.
3. **Connect Netlify.** Go to **Add new site → Import an existing project → GitHub**, then pick this repo.
   The settings come from `netlify.toml`, so leave the build fields as they are.
4. **Add the secret.** Go to **Site configuration → Environment variables → Add a variable**: key `DATABASE_URL`, value = your Neon string.
5. **Deploy**, or use **Trigger deploy → Clear cache and deploy site** if you added the variable after the first deploy.
   Open the site: the sidebar badge should say **Live · neondb · 42 tables**.

Requests on the deployed site take this path: `https://your-site.netlify.app/api/...` → `netlify/functions/api.mjs` → same Express app → `pg` → Netlify Database (PostgreSQL, `NETLIFY_DB_URL`).

---

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | `SELECT version()`, database name, table count |
| GET | `/api/problems?q=&difficulty=&topic_id=&company_id=&sort=&page=&size=` | **Read** a page of problems |
| GET | `/api/problems/:id` | **Read** one problem with topics, companies, test cases, verdicts |
| POST | `/api/problems` | **Create** a problem (and its topic/company tags) in one transaction |
| PUT | `/api/problems/:id` | **Update** a problem (`WHERE problem_id = $11`) |
| DELETE | `/api/problems/:id` | **Delete** a problem (`WHERE problem_id = $1`); returns 409 with reasons if a foreign key blocks it |
| GET | `/api/problems/meta` | setters, rules, topics, companies for the form |
| GET | `/api/q/:key?…` | Named read-only query for a screen (see `server/queries/srs.js`) |
| GET | `/api/sql/:key` | The SQL text behind a screen |
| GET | `/api/lab10a`, `/api/lab10a/:id` | List / run the 30 Lab 10A queries |

## Safety rules we follow (Lab 11)

- **Placeholders everywhere.** Every user value goes in as `$1, $2 …`. A search for `'; DROP TABLE problems;--` returns zero rows and does nothing else.
- **No password in Git.** `.env` is listed in `.gitignore`; Netlify reads `DATABASE_URL` from its own environment settings.
- **WHERE on every UPDATE and DELETE**, always on the primary key.
- **Validation** happens on the server before any SQL runs (title length, difficulty enum, time/memory limits that match the CHECK constraints).
- **The browser never connects to PostgreSQL.** It only calls our API with `fetch()`.
- **Foreign keys are respected.** Problems with history (submissions, contests, posts…) cannot be deleted; the UI explains why.
- Sort orders come from a fixed list on the server, never from raw input.

## Lab 11 submission checklist (TeamNo_Lab11_DBConnectivity.pdf)

| Section | What to screenshot |
|---|---|
| A. Connectivity | `server/db.js` (`new Pool()`, `run()`), `.env` with the password hidden, and the terminal output of `npm run test:conn` |
| B. CRUD code | In `server/routes/problems.js`: the `POST /`, `GET /`, `PUT /:id` and `DELETE /:id` handlers, each with its SQL and the server log line showing `rowCount` |
| C. Frontend | The **New problem** form, the problem table, the edit form, and the delete confirmation with its toast, plus the same row in pgAdmin before and after |
| D. Reflection | 150–250 words on what went wrong and what you learned (see the “Safety rules” above) |

Data note: the sample data runs up to **17 Oct 2026**, so date-based screens (renewals, access checks, moderation wait times) use that day as “today”.
