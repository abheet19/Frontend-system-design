# REST API — Study Notes

A tiny Express **CRUD service for todos** (in-memory). The plain HTTP/JSON
counterpart to the gRPC demo: same CRUD idea, but hand-written routes + JSON
instead of a `.proto` contract + Protobuf. Runs on `http://localhost:3000`.

## Endpoints

| Method    | Path         | Does                       | Success       |
| --------- | ------------ | -------------------------- | ------------- |
| `GET`     | `/todos`     | list all                   | `200`         |
| `POST`    | `/todos`     | create (server assigns id) | `201 Created` |
| `PUT`     | `/todos/:id` | update the given fields    | `200`         |
| `DELETE`  | `/todos/:id` | remove                     | `200`         |
| `HEAD`    | `/todos`     | headers only, no body      | `200`         |
| `OPTIONS` | `/todos`     | which methods are allowed  | `200`         |
| `TRACE`   | `/todos`     | echo the request (debug)   | `200`         |

## HTTP method semantics (the actual lesson)

- **GET** — read, no side effects, safe + idempotent.
- **POST** — create; **not** idempotent (POST twice = two rows). Returns `201`.
- **PUT** — full update; **idempotent** (same request twice = same state).
- **DELETE** — remove; idempotent.
- **HEAD** — like GET but **no body**; check existence / read headers cheaply.
- **OPTIONS** — capability discovery; browsers send it automatically as a **CORS
  preflight** before cross-origin calls with custom methods/headers.
- **TRACE** — echoes the request back for debugging; often disabled in prod
  (can leak headers).

**Status codes used:** `200` ok · `201` created · `400` bad input · `404` not found.

## Bugs fixed / best practices applied

- **ID-collision bug** — `id: String(todos.length + 1)` duplicates after a
  delete (delete `1` from `[1,2]`, add → id `2` again). Fixed with a **monotonic
  `nextId` counter** that only ever increases. _Rule: never derive ids from length._
- **Input validation** on POST and PUT — reject wrong types with `400` before
  mutating the store.
- **Global error handler** (a 4-arg `(err, req, res, next)` middleware) — Express
  routes thrown errors + malformed JSON here, so the client gets clean JSON, not
  an HTML stack trace.
- **404 handler** registered **after** all real routes (order matters in Express).

## New syntax flagged in the code

- `const { title, completed = false } = req.body` — destructuring **with a default**.
- `{ ...todos[i] }` — spread to **shallow-clone** instead of mutating in place.
- `express.json()` — built-in body parser (replaces the old `body-parser` package).

## Run & test

```sh
npm run start     # nodemon → http://localhost:3000

curl localhost:3000/todos
curl -X POST localhost:3000/todos -H 'Content-Type: application/json' \
     -d '{"title":"Learn REST"}'
curl -X PUT  localhost:3000/todos/1 -H 'Content-Type: application/json' \
     -d '{"completed":true}'
curl -X DELETE localhost:3000/todos/1
```

> ⚠️ Port `3000` is shared with the gRPC gateway — run only one of them at a time.

## Now in TypeScript

`index.js` → `index.ts`. `npm run typecheck` (`tsc --noEmit`) now enforces
types on every commit-worthy change. `npm run start` runs `tsx watch index.ts`
directly — no separate build step needed for dev (nodemon is gone, tsx's
watch mode replaces its job). Types added: a `Todo` interface for the
in-memory store, `Request`/`Response`/`NextFunction` on every route handler,
and a narrowed `unknown` → `{ status?: number }` cast in the error handler
(replacing the implicit `any` on `err`).
