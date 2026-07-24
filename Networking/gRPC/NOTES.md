# gRPC + REST Gateway — Study Notes

CRUD service over **gRPC**, fronted by a thin **REST gateway** so HTTP+JSON tools
(Postman, browsers) can reach it. Two Node processes, one Protobuf contract.

> A polished web version of these notes (with diagrams) exists as a Claude artifact.

## The pieces

| Process                | Port   | Speaks            | File               |
| ---------------------- | ------ | ----------------- | ------------------ |
| REST gateway (BFF)     | `3000` | HTTP/1.1 + JSON   | `client/index.js`  |
| gRPC server            | `3004` | HTTP/2 + Protobuf | `server/index.js`  |
| gRPC stub (in gateway) | →3004  | Protobuf          | `client/client.js` |
| Shared contract        | —      | proto3            | `customers.proto`  |

> ⚠️ The `client/` folder is a **server** to Postman and a **client** to the gRPC
> server at the same time. That dual role is the "gateway"/BFF pattern.

## Full flow

```
Postman ──HTTP/JSON──▶ REST gateway :3000 ──Protobuf/HTTP-2──▶ gRPC server :3004
Postman ◀─HTTP/JSON── REST gateway :3000 ◀─Protobuf/HTTP-2── gRPC server :3004
```

1. Postman sends `GET /get/1` to the gateway (`:3000`).
2. The Express route calls `client.get({ id }, ...)` — that stub call **is** the
   network hop: it Protobuf-encodes the request and sends it over HTTP/2 to `:3004`.
3. The server's `get` handler runs and replies via `callback(null, customer)`.
4. The stub decodes the Protobuf `Customer` back to a JS object; the gateway maps
   it to `res.json({ success, data })` (and gRPC status → HTTP status).

## The bug: `/get/1` returned `{"success":true}` with no data

**Contract-shape mismatch.** The proto says `rpc Get(...) returns (Customer)` — the
response **is** a `Customer` (fields `id/name/email/phone`), with no `customer`
wrapper. But the code wrapped it on both sides:

```js
// BEFORE — server:   callback(null, { customer });      // 'customer' isn't a Customer field
// BEFORE — gateway:   data: response.customer            // response IS the Customer

// AFTER  — server:   callback(null, customer);
// AFTER  — gateway:  reply(res, (r) => r);
```

Protobuf **silently drops unknown fields**, so `{ customer }` encoded as a `Customer`
put an _empty_ Customer on the wire. Without `defaults:true` in proto-loader, the
absent fields decode to `undefined`, so `response` is `{}` and `response.customer`
is `undefined`. `JSON.stringify` omits `undefined` → `{"success":true}`.

`GetAll` was fine because `CustomerList` genuinely has a `customers` field, so its
wrapper matched the contract.

_(Also fixed: a double-callback — the not-found branch called `callback(err)` with
no `return`, then fell through to a second `callback`.)_

## Gotcha: path id vs body id on update

`PUT /update/1` with a body that also has `"id":"5"` was returning "Customer not
found". The gateway built the request as `{ id: req.params.id, ...req.body }`, and
object spread lets **later keys win**, so the body's `id:"5"` overwrote the path's
`1` → it tried to update a customer that doesn't exist. Fix: spread the body
first, pin the path id last so the URL always wins:

```js
const customer = { ...req.body, id: req.params.id }; // path id is authoritative
```

## gRPC vs REST — quick guide

| Choose **gRPC** when…                                    | Choose **REST** when…                                |
| -------------------------------------------------------- | ---------------------------------------------------- |
| Internal service-to-service calls                        | Public / browser-facing APIs, 3rd-party integrations |
| Low-latency, high-throughput paths                       | You want human-debuggable requests + HTTP caching    |
| Polyglot backends (one `.proto`, many generated clients) | Simple CRUD; familiarity beats raw performance       |
| Streaming (telemetry, chat, live sync)                   | Wide, uncontrolled client variety                    |

**Browser limitation:** browsers can't speak raw gRPC. Production uses `grpc-web` plus an Envoy proxy, or a REST/BFF gateway (this repo's pattern).

**Streaming modes** (this demo is all unary): unary (1→1), server-streaming (1→N),
client-streaming (N→1), bidirectional (N↔N).

## Run & verify

```sh
npm run server      # gRPC server  → 127.0.0.1:3004
npm run client      # REST gateway → http://localhost:3000

curl localhost:3000/getAll
curl localhost:3000/get/1
curl -X POST localhost:3000/insert -H 'Content-Type: application/json' \
     -d '{"name":"Ada","email":"ada@x.com","phone":"555"}'
curl -X PUT  localhost:3000/update/2 -H 'Content-Type: application/json' \
     -d '{"name":"Jane 2","email":"j@x.com","phone":"9"}'
curl -X DELETE localhost:3000/delete/3
```

## Now in TypeScript

`server/index.js`, `client/client.js`, and `client/index.js` are now `.ts`
(old `.js` files kept alongside for now). `npm run typecheck` (`tsc --noEmit`)
enforces the types; `npm run server` / `npm run client` run the `.ts` files
directly via `tsx` — no separate build step needed for dev (`npm run build`
exists for a real compiled `dist/` output). New: `types.ts` mirrors
`customers.proto`'s messages (`Customer`, `CustomerRequestID`, `CustomerList`,
`Empty`); the server's `handler` wrapper and every RPC method are typed via
`@grpc/grpc-js`'s `ServerUnaryCall`/`sendUnaryData` generics; `client.ts`
exports a hand-written `CustomerServiceClient` interface for the proto-loader
stub (the one loosely-typed boundary, cast via `unknown`); the REST gateway
types every route with Express's `Request`/`Response`.
