# Job Recommendation Engine

A transparent, rule-based Job Recommendation Engine & REST API built to match candidates with roles based on skills, experience, location, and salary fit. Pure-function scoring layer, PostgreSQL-backed repository persistence, Express-based HTTP layer. Designed for auditability — every recommendation ships with a fully numeric, dimension-level score breakdown.

## Tech Stack

- **Runtime / Language** — Node.js + TypeScript (strict, ES2022 target, CommonJS)
- **Web Framework** — Express 4
- **Testing** — Jest 29 + ts-jest
- **Lint / Format** — ESLint (typescript-eslint recommended) + Prettier
- **Config** — dotenv

---

## How to Run Locally

### Prerequisites

- Node.js 18+ (the code targets ES2022; LTS recommended)
- npm (comes with Node)

### Install dependencies

```bash
npm install
```

### Configure environment and database

Copy the example environment file and adjust values as needed:

```bash
cp .env.example .env          # Windows: copy .env.example .env
```

Start a local PostgreSQL instance. You can either:

- **Use Docker (recommended):**
  ```bash
  docker compose up -d postgres
  ```
- **Or point `DATABASE_URL` in `.env` at any existing local Postgres instance.**

Once PostgreSQL is ready, run the database migrations:

```bash
npm run migrate
```

### Start the dev server (with hot reload)

```bash
npm run dev
```

Server starts on `PORT` from `.env` (default **3000**). Health check:

```
GET http://localhost:3000/health
```

### Production build + start

```bash
npm run build     # tsc → ./dist
npm start         # node dist/index.js
```

### Run the test suite

```bash
npm test                          # full suite (API tests require a running PostgreSQL instance)
npm run test:scoring             # scoring tests only (10 cases, no DB needed)
```

### Run with Docker Compose (PostgreSQL + API)

The full stack — PostgreSQL, migrations, and the API — runs on any machine with Docker installed. No `.env` file or cloud database is required.

```bash
docker compose up --build
```

What this does:
1. Starts a `postgres:16-alpine` container and creates the `jobmatch` database.
2. Waits for PostgreSQL to pass its health check (`pg_isready`) before starting the API.
3. Builds the API image (multi-stage Dockerfile — builder + slim alpine runtime).
4. Runs `npm run migrate` against the PostgreSQL container (creates `candidates` and `jobs` tables).
5. Starts the API on **http://localhost:3000**.

PostgreSQL data is persisted in a named Docker volume (`postgres_data`) and survives API container restarts.

### Run API integration tests against Dockerized PostgreSQL

The API integration tests require a live PostgreSQL instance. They must be run **after** `docker compose up` has started the database (the API container itself is not required — only PostgreSQL on port `5432`).

```bash
docker compose up -d postgres          # start DB only (faster)
# or: docker compose up --build        # start the full stack
npm run test:api
```

`npm run test:api` automatically sets `DATABASE_URL=postgres://postgres:postgres@localhost:5432/jobmatch` (cross-platform via `cross-env`). If `DATABASE_URL` is missing or PostgreSQL isn't reachable, the tests fail with an explicit error message instead of silently skipping.

You can also run the scoring unit tests in isolation (no database needed) at any time:

```bash
npm run test:scoring
```

### Lint

```bash
npx eslint src
```

---

## API Endpoints

> Base URL: `http://localhost:3000`
> All request bodies must be JSON — `Content-Type: application/json`.
> Validation errors return HTTP 400 with a structured `{ errors: [{ field, message }] }` payload.

---

### 1. Create a Candidate

```
POST /candidates
```

**Request body**

```json
{
  "name": "Alice Chen",
  "skills": ["TypeScript", "Node.js", "PostgreSQL"],
  "yearsOfExperience": 6,
  "location": "New York",
  "expectedSalary": 130000
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | ✅ | non-empty |
| `skills` | string[] | ✅ | each item a string |
| `yearsOfExperience` | number | ✅ | ≥ 0 |
| `location` | string | ✅ | non-empty |
| `expectedSalary` | number | ✅ | ≥ 0 |

**Response — 201 Created**

```json
{
  "id": "2cf5c9f7-…",
  "name": "Alice Chen",
  "skills": ["TypeScript", "Node.js", "PostgreSQL"],
  "yearsOfExperience": 6,
  "location": "New York",
  "expectedSalary": 130000
}
```

**400 response example**

```json
{
  "errors": [
    { "field": "yearsOfExperience", "message": "yearsOfExperience is required and must be a number" }
  ]
}
```

---

### 2. Fetch a Candidate by ID

```
GET /candidates/:id
```

**Response — 200 OK**

```json
{
  "id": "2cf5c9f7-…",
  "name": "Alice Chen",
  "skills": ["TypeScript", "Node.js", "PostgreSQL"],
  "yearsOfExperience": 6,
  "location": "New York",
  "expectedSalary": 130000
}
```

**404 if missing**

```json
{ "error": "Candidate not found" }
```

---

### 3. Create a Job

```
POST /jobs
```

**Request body**

```json
{
  "title": "Senior Backend Engineer",
  "requiredSkills": [
    { "name": "TypeScript", "mustHave": true },
    { "name": "Node.js",    "mustHave": true },
    { "name": "AWS",        "mustHave": false }
  ],
  "minYearsExperience": 5,
  "location": "New York",
  "salaryRange": { "min": 120000, "max": 180000 },
  "remoteAllowed": true
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `title` | string | ✅ | non-empty |
| `requiredSkills` | `{name, mustHave}[]` | ✅ | each item has `name:string` + `mustHave:boolean` |
| `minYearsExperience` | number | ✅ | ≥ 0 |
| `location` | string | ✅ | non-empty |
| `salaryRange.min` | number | ✅ | ≥ 0, ≤ `max` |
| `salaryRange.max` | number | ✅ | ≥ 0, ≥ `min` |
| `remoteAllowed` | boolean | ✅ | — |

**Response — 201 Created**

```json
{
  "id": "5399a102-…",
  "title": "Senior Backend Engineer",
  "requiredSkills": [
    { "name": "TypeScript", "mustHave": true },
    { "name": "Node.js",    "mustHave": true },
    { "name": "AWS",        "mustHave": false }
  ],
  "minYearsExperience": 5,
  "location": "New York",
  "salaryRange": { "min": 120000, "max": 180000 },
  "remoteAllowed": true
}
```

---

### 4. Fetch Job by ID

```
GET /jobs/:id
```

200 returns the job; 404 returns `{ "error": "Job not found" }`.

---

### 5. Get Job Recommendations for a Candidate

```
GET /candidates/:id/recommendations?limit=N&skillsWeight=50&experienceWeight=20&locationWeight=15&salaryWeight=15
```

**Query params** (all optional — partial overrides allowed)

| Param | Default | Description |
|---|---|---|
| `limit` | `10` | Max results returned. Must be a positive integer; invalid values fall back to 10. |
| `skillsWeight` | `50` | Override the skills dimension weight. Must be a positive number; invalid values fall back to 50. |
| `experienceWeight` | `20` | Override the experience dimension weight. Must be a positive number; invalid values fall back to 20. |
| `locationWeight` | `15` | Override the location dimension weight. Must be a positive number; invalid values fall back to 15. |
| `salaryWeight` | `15` | Override the salary dimension weight. Must be a positive number; invalid values fall back to 15. |

Any weight that is omitted, zero, negative, or non-numeric silently reverts to its `DEFAULT_WEIGHTS` value — partial overrides are fully supported (e.g. pass only `?skillsWeight=60` to bump skills and keep 20/15/15 defaults).

**What it does**

1. Load candidate by `:id` → 404 if missing.
2. Pull **all** jobs from the repository.
3. Score each job against the candidate using the [scoring formula](#scoring-formula).
4. **Drop** any job with `eligible: false` (must-have filter fail).
5. Sort remaining by `totalScore` **descending**.
6. Slice to `limit`.

**Response — 200 OK**

```json
[
  {
    "job": {
      "id": "5399a102-…",
      "title": "Senior Backend Engineer",
      "requiredSkills": [
        { "name": "TypeScript", "mustHave": true },
        { "name": "Node.js", "mustHave": true },
        { "name": "AWS", "mustHave": false }
      ],
      "minYearsExperience": 5,
      "location": "New York",
      "salaryRange": { "min": 120000, "max": 180000 },
      "remoteAllowed": true
    },
    "score": {
      "totalScore": 93,
      "breakdown": {
        "skills":     43,
        "experience": 20,
        "location":   15,
        "salary":      15
      },
      "eligible": true
    }
  }
]
```

Empty array (`[]`) is returned for a candidate with no qualifying jobs — **not** a 404.

---

### 6. Get Candidate Recommendations for a Job

```
GET /jobs/:id/recommendations?limit=N&skillsWeight=50&experienceWeight=20&locationWeight=15&salaryWeight=15
```

**Query params** (all optional — partial overrides allowed)

| Param | Default | Description |
|---|---|---|
| `limit` | `10` | Max results returned. Must be a positive integer; invalid values fall back to 10. |
| `skillsWeight` | `50` | Override the skills dimension weight. Must be a positive number; invalid values fall back to 50. |
| `experienceWeight` | `20` | Override the experience dimension weight. Must be a positive number; invalid values fall back to 20. |
| `locationWeight` | `15` | Override the location dimension weight. Must be a positive number; invalid values fall back to 15. |
| `salaryWeight` | `15` | Override the salary dimension weight. Must be a positive number; invalid values fall back to 15. |

Any weight that is omitted, zero, negative, or non-numeric silently reverts to its `DEFAULT_WEIGHTS` value — partial overrides are fully supported (e.g. pass only `?experienceWeight=35` to prioritize seniority and keep 50/15/15 defaults).

**What it does**

1. Load job by `:id` → 404 if missing.
2. Pull **all** candidates from the repository.
3. Score each candidate against the job using the [scoring formula](#scoring-formula).
4. **Drop** any candidate with `eligible: false` (must-have skill filter fail).
5. Sort remaining by `totalScore` **descending**.
6. Slice to `limit`.

**Response — 200 OK**

```json
[
  {
    "candidate": {
      "id": "2cf5c9f7-…",
      "name": "Alice Chen",
      "skills": ["TypeScript", "Node.js", "PostgreSQL"],
      "yearsOfExperience": 6,
      "location": "New York",
      "expectedSalary": 130000
    },
    "score": {
      "totalScore": 93,
      "breakdown": {
        "skills":     43,
        "experience": 20,
        "location":   15,
        "salary":      15
      },
      "eligible": true
    }
  }
]
```

Empty array (`[]`) is returned for a job with no qualifying candidates — **not** a 404.

---

## Scoring Formula

All scoring lives in `src/services/scoringService.ts` as small, composable, **pure** functions. No side effects, no I/O, no hidden state — fully deterministic and unit-testable (10 Jest cases, all passing).

### Default weight budget (sum = 100)

| Dimension | Weight | Share |
|---|---|---|
| **Skills** | 50 | 50% |
| **Experience** | 20 | 20% |
| **Location** | 15 | 15% |
| **Salary** | 15 | 15% |

Weights are overrideable per-request via query params on `/recommendations`.

### Dimension-by-dimension rules

#### 1. Skills (weight × 1.0, split 60% / 40%)

- **60% base** — awarded for passing the must-have filter (see "Hard filter" below).
- **40% bonus pool** — distributed proportionally: `matchedNiceToHaves / totalNiceToHaves`. If the job has **zero** nice-to-haves, the full 40% bonus is granted (the candidate didn't "fail" anything — there simply wasn't upside to score).
- All skill name comparisons are **case-insensitive**.

#### 2. Experience (weight × 1.0)

- If `minYearsExperience === 0` → **full score** (no divide-by-zero).
- Otherwise: `min(weight, weight × candidate.years / job.min)`. Capped at the weight value (extra years beyond the minimum don't earn bonus; we don't double-count seniority).

#### 3. Location (weight × 1.0)

- **Exact case-insensitive match** → full score.
- No match **but** `remoteAllowed: true` → **2/3** of full (remote is a valid but slightly less ideal fit than on-site in the target city).
- Otherwise → 0.

#### 4. Salary (weight × 1.0)

- `expectedSalary > salaryRange.max` → **0** (candidate's ask exceeds budget).
- `expectedSalary ≤ salaryRange.min` → **full score** (candidate fits comfortably within budget floor).
- Otherwise: `weight × (max - expectedSalary) / (max - min)` — linear taper from full to 0 as expected salary moves from floor to ceiling. A candidate closer to the floor is a "better fit" financially.

#### 5. Aggregation

- `totalScore = round(skills + experience + location + salary)` (nearest integer, standard rounding).

### Hard filter vs. soft penalties — the philosophical "why"

| Behaviour | Applied to | Why |
|---|---|---|
| **Hard filter (drop candidate)** | Missing **any** `mustHave: true` skill | Must-have skills are **binary, non-negotiable prerequisites** defined by the hiring team. A candidate who has never written TypeScript cannot function as a TypeScript lead regardless of how senior they are or how close they live. Putting them forward wastes everyone's time (recruiter, hiring manager, candidate) and erodes trust in the ranking quality. |
| **Soft linear penalty** | Low years of experience, location mismatch, salary above budget | These dimensions are **negotiable** and multidirectionally compensable. E.g. a junior dev with *exactly* the right skills and a salary under budget can still be a great hire; a rock star across the country can be flown in; a slightly-over-budget ask can be re-scoped to a higher band. Hard-filtering on any of them would throw away valid, efficient matches — so each one simply loses proportional score and must be out-weighed by strength elsewhere. |

---

## Assumptions Made

1. **Skill-name matching is case-insensitive, whitespace-exact.** We lowercase both sides but don't alias synonyms (e.g. `"Node"` ≠ `"Node.js"`). For a real system, a skill-taxonomy/normalization layer would precede scoring.
2. **Persistence is PostgreSQL-backed.** Candidates and jobs are persisted in PostgreSQL. Locally, Docker Compose provisions PostgreSQL with a named volume, surviving container restarts. The repository interface (create / getById / getAll) hides the database implementation from callers — the same public surface that previously backed the in-memory implementation with no controller or scoring code.
3. **`location` is a free-form string.** No geocoding, no regional aliases (e.g. `"NYC"` vs `"New York"` are different). The 2/3-remote fallback alleviates this somewhat but it's a known simplification.
4. **Salary currency is implicit, single currency, no time-scaling.** Assumes all candidates and jobs share one currency (USD implicitly) and that `expectedSalary` and `salaryRange` are in the same units/period (e.g. annual).
5. **`totalScore` rounds once at the end only.** Sub-scores remain floats in the `breakdown` object — callers can show fractional scores if desired; the integer `totalScore` is only for ordinal ranking.
6. **`limit` uses a silent fallback (default 10) rather than a 400.** Negative / fractional / non-numeric limits quietly become 10 — this matches typical search-API UX.
7. **Candidates with zero eligible jobs return `[]`, not a 404.** The candidate exists; the recommendation set is merely empty. 404 is reserved for the candidate ID itself being unknown.

---

## What I'd Do Differently With More Time

1. **Database optimization and indexing** — Add appropriate indexes for frequently queried fields and optimize recommendation queries as the dataset grows.
2. **Pagination, not `limit`** — Cursor-based pagination (`after`, `first`) for recommendations; avoid a hard 10-item ceiling on large result sets.
3. **Proper validation layer** — Replace the ad-hoc `validateCandidateInput`/`validateJobInput` functions with `zod` schemas: tighter, reusable, and automatically typed (`z.infer<typeof schema>`).
4. **Authentication + authorization** — JWT auth middleware; distinguish recruiter vs. candidate roles so only a candidate (or their recruiter) can view `/recommendations` for that candidate's ID.
5. **Rate limiting + abuse mitigation** — Sliding-window rate limits per IP (and per authenticated user, once auth ships) on both recommendation endpoints to protect the O(n) scoring loop against burst traffic; return `429 Too Many Requests` with `Retry-After` and surface blocked-request counts as a metric.
6. **Telemetry + observability** — `pino` structured logs, Prometheus-style metrics (scoring latency, recommendation set size, filter-out rate per dimension), request IDs propagated via `AsyncLocalStorage`.
7. **Seed script + contract tests** — A `scripts/seed.ts` that loads realistic sample data; contract tests (`supertest`) round-tripping each endpoint end-to-end (not just the pure scoring unit tests).
8. **Skill normalization + fuzzy matching** — Levenshtein/synonym resolution over a canonical skill ontology. Same for location via Google Maps / Mapbox geocoding.
9. **Weight calibration tool** — A small admin UI or CLI that re-weights dimensions against a golden set of known-matches (supervised) to tune defaults away from 50/20/15/15.
10. **Score explainability layer** — Translate the `breakdown` object into one-line human reasons per recommendation, e.g. `+50 skills (excellent match) · -10 experience (junior for the role) · +10 remote-friendly location`.

---
## AI Tool Usage

I used TRAE with GPT-5.4 Beta as a coding assistant throughout this project. It helped with the initial project scaffolding and configuration, drafted the scoring service logic from the matching rules I provided, and generated most of the scoring test cases for the required formulas and edge cases. It also helped me draft and structure this README documentation. I did not treat the generated output as final; I reviewed the code against the assessment requirements, made changes where needed, and verified the behaviour through tests and builds. For example, I specifically reviewed the scoring logic to ensure that a missing must-have skill is treated as a hard eligibility filter and immediately produces a zero score, rather than allowing other matching factors to compensate for it. I also cross-checked the generated test cases against the exact scoring formulas and edge cases, and manually verified details such as input validation, route ordering, result sorting, recommendation limits, and partial scoring-weight overrides.