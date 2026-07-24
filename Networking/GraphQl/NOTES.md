# GraphQL — Study Notes

An Apollo GraphQL server (authors + books). **One endpoint** (`POST /`), and the
client asks for exactly the fields it wants. Runs on `http://localhost:4000`.

## Mental model

GraphQL splits the API into two halves that must mirror each other:

| Half            | File           | Is…                                                |
| --------------- | -------------- | -------------------------------------------------- |
| **Schema**      | `types.js`     | the **contract** — types, queries, mutations (SDL) |
| **Resolvers**   | `resolvers.js` | the **implementation** — a function per field      |
| **Server boot** | `index.js`     | wires schema + resolvers into ApolloServer         |

- **REST** = many URLs, fixed response shapes. **GraphQL** = one URL, the client
  picks the shape (`{ authors { name books { title } } }`).
- **Lazy** — a resolver runs ONLY if the client asks for that field.

## Schema syntax (`types.js`)

- `type Author { ... }` — an object type. `!` = non-nullable (required).
- `[Book!]` — a list of non-null Books.
- `type Query { ... }` — **READ** entry points (like GET).
- `type Mutation { ... }` — **WRITE** entry points (like POST/PUT/DELETE).
- Backtick string tagged `#graphql` — just enables editor highlighting.

## Resolver signature (`resolvers.js`)

Every resolver can take up to 4 args, in order:

| Arg       | Meaning                                                      |
| --------- | ------------------------------------------------------------ |
| `parent`  | the resolved value of the **parent** field (key for nesting) |
| `args`    | arguments passed to this field in the query/mutation         |
| `context` | shared per-request object (auth, DB handles)                 |
| `info`    | low-level query metadata — rarely needed                     |

> You only **list the args you use** — trailing unused ones can be dropped. That
> keeps the linter quiet and the code honest (`() =>`, `(parent) =>`, `(_, args) =>`).

- **Root resolvers** (`Query.authors`) are the entry points — `parent` is undefined.
- **Field resolvers** (`Book.author`, `Author.books`) run per-parent to resolve a
  nested field; `parent` is the individual Book/Author.

## Bugs fixed / best practices applied

- **Consistent string ids + `===`** — the data used to mix `id: 1` (number) and
  `authorId: '1'` (string) and lean on loose `==`. Normalizing to strings lets us
  use strict `===`. _Better lesson: fix the types so you never need `==`._
- **One source of truth for relationships** — removed the unused `bookIds` on
  authors; `Author.books` is **derived** by filtering books on `authorId`. Two
  copies of a relationship drift apart.
- **Mutation validation via `GraphQLError`** — `addBook` rejects a non-existent
  `authorId`; `addAuthor` rejects an empty name. Throwing a `GraphQLError` with
  `extensions.code` surfaces a clean, typed error in the response's `errors[]`.
- **Monotonic id counters** — same "don't derive ids from `length`" fix as the
  other demos.

> Note: error responses show a `stacktrace` in dev only — Apollo hides it
> automatically when `NODE_ENV=production`.

## Run & test

```sh
npm run start     # nodemon → http://localhost:4000  (open it for the Sandbox UI)
```

```graphql
# nested read
{
  authors {
    id
    name
    books {
      title
    }
  }
}

# mutation (create a book under an existing author)
mutation {
  addBook(title: "New", publishedYear: 2025, authorId: "1") {
    id
    title
  }
}
```

```sh
curl localhost:4000 -H 'Content-Type: application/json' \
  -d '{"query":"{ authors { name books { title } } }"}'
```

## Now in TypeScript

Converted `types.js`/`resolvers.js`/`index.js` to `.ts`; `npm run typecheck` (`tsc
--noEmit`) now enforces types on every save. `npm run start` runs via `tsx watch
index.ts` — no separate build step needed for dev (`npm run build` exists for a
compiled `dist/` output). New: `entities.ts` hand-writes `Author`/`Book`/
`AddAuthorArgs`/`AddBookArgs` (deliberately separate from `types.ts`, which
still owns the SDL schema string) and the resolvers/index files are typed
against them — e.g. `Book.author` returns `Author | undefined`, `Mutation.addAuthor`
takes `AddAuthorArgs` and returns `Author`.
