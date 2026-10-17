# BrandGate

BrandGate is a rebuildable Node.js 20 + TypeScript application for checking copy
against a brand's voice and rules. It uses the Next.js App Router, deterministic
local evaluation by default, and an optional JEV adapter when `JEV_API_KEY` is
configured. The local path is deliberately useful without any external service.

## Architecture

```text
src/app/                  Next.js pages and API route handlers
src/engine/               Pure evaluation primitives
  lexicon.ts              Versioned slop, banned-word, and hard-rule patterns
  spans.ts                Offset-preserving detection and highlighting
  rules.ts                Brand-rule checks and findings
  dna.ts                  DNA extraction from 3–10 representative posts
  scoring.ts              Transparent hook/virality scoring
  routing.ts              Channel-aware content routing
  jev.ts                  Optional JEV adapter with local fallback
  receipt.ts              SHA-256 brand receipts
src/types/                Shared domain contracts
data/                     Local JSON persistence boundary (runtime files ignored)
tests/                    Node test-runner unit and route integration tests
```

The engine has no database or network requirement for its deterministic path. Server
route handlers should call engine functions rather than duplicate rules in UI code.
Runtime collections belong under `data/`; credentials belong in environment variables.

## Requirements and setup

- Node.js **20.19.0** (the version in `.nvmrc` and the Docker image)
- npm 10 or newer

Use the pinned runtime locally, then install from the committed lockfile:

```sh
nvm install
nvm use
npm ci
cp .env.example .env.local
```

`.env.local` is ignored by git. It may contain:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Next.js HTTP port |
| `JEV_API_KEY` | empty | Optional remote JEV evaluation; local evaluation is used when empty |
| `WEBHOOK_URL` | empty | Optional callback destination for evaluation notifications |

Do not commit API keys or other secrets. `.env.example` contains names and safe empty
values only.

## Run the application

Start the development server with hot reload:

```sh
npm run dev
```

Open <http://localhost:3000>. For a production-like local run:

```sh
npm run build
npm run start -- --hostname 0.0.0.0
```

`PORT=3000` is the default; Next.js honors an alternate `PORT` if one is exported.

## HTTP API

All versioned endpoints are under `/api/v1` and return JSON. Invalid JSON or missing
required fields returns `400` with an `error` field.

| Method and path | Purpose |
| --- | --- |
| `POST /api/v1/evaluate` | Evaluate text with brand rules, hook score, routing, provider, and SHA-256 receipt |
| `POST /api/v1/rewrite` | Replace detected slop/rule spans and return routed rewritten content |
| `POST /api/v1/brand/extract` | Extract DNA from 3–10 `posts` strings or `{text}` objects |
| `GET, POST /api/v1/brand/profiles` | List or create local brand profiles |
| `GET, PUT /api/v1/brand/profiles/:id` | Read or update one profile |
| `GET, POST /api/v1/brands` and `/api/v1/brand-profiles` | Compatibility aliases for profile collection operations |
| `GET, PUT /api/v1/brands/:id` | Compatibility alias for profile lookup/update |
| `POST /api/v1/tournament` | Rank at least two candidate posts by transparent hook score |
| `GET, POST /api/v1/webhooks` (also `/api/v1/webhook`) | List or register evaluation webhook destinations |
| `GET, POST /api/mcp` | Inspect or invoke the small MCP-compatible tool surface |

Example evaluation request:

```sh
curl -sS -X POST http://localhost:3000/api/v1/evaluate \
  -H 'content-type: application/json' \
  -d '{"text":"A specific lesson for thoughtful teams.","channel":"linkedin"}'
```

The MCP endpoint supports `initialize`, `tools/list`, and the agent-facing tools
`brandgate_get_memory`, `brandgate_extract_dna`, `brandgate_evaluate_draft`, and
`brandgate_split_threads` (plus compatibility aliases).

## Docker

The multi-stage Linux `Dockerfile` uses `node:20.19.0-alpine`, installs from
`package-lock.json`, builds the Next.js app, and exposes port 3000. The `/app/data`
volume is retained for local JSON persistence.

```sh
docker build -t brandgate:local .
docker run --rm -p 3000:3000 \
  --env-file .env.local \
  -v "$(pwd)/data:/app/data" \
  brandgate:local
```

Then visit <http://localhost:3000>. The container listens on `0.0.0.0:3000`.

## Tests and checks

The test suite uses Node's built-in test runner through `tsx`, so TypeScript engine
modules are exercised directly. It covers slop span detection and offsets, custom
brand rules and severity, DNA extraction boundaries and summaries, channel routing,
and API handler success/error contracts.

Run the full suite and static checks:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Use `npm ci` rather than `npm install` in CI and Docker so dependency versions remain
the versions recorded in `package-lock.json`.

## Rebuildability notes

- Keep the Node version aligned across `.nvmrc`, `package.json` `engines`, and
  `Dockerfile`.
- Keep `package-lock.json` committed and use `npm ci` for clean installs.
- Keep deterministic evaluation available when `JEV_API_KEY` is absent.
- Keep runtime data under the relative `data/` boundary; never use machine-specific
  absolute paths.
