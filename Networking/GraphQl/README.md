# GraphQL — Notes

## What is GraphQL?

- A **query language for APIs** (not a database)
- Client asks for **exactly** what it needs — no over-fetching or under-fetching
- Single endpoint (`/graphql`) vs many REST endpoints
- Strongly typed schema = self-documenting API

---

## Core Concepts

### Schema (typeDefs)

- Written in **SDL** (Schema Definition Language)
- Defines **types**, **queries**, and **mutations**
- `!` = non-nullable (required). Without `!` = nullable (optional)
- `[Book!]` = list of non-null Books (list itself can be null)
- `[Book!]!` = non-null list of non-null Books

### Resolvers

- Functions that **fulfill** each field in the schema
- Must mirror the schema structure: `{ TypeName: { fieldName: fn } }`
- Every resolver receives: `(parent, args, context, info)`
  - **parent** — resolved value of the parent field (key for nested resolvers)
  - **args** — arguments passed to the field in the query/mutation
  - **context** — shared across all resolvers (auth, DB, etc.)
  - **info** — query metadata (rarely needed)
- GraphQL is **lazy** — field-level resolvers only run if client requests that field

### Queries (READ)

```graphql
query ExampleQuery {
  books {
    id
    title
    publishedYear
    author {
      name
    }
  }
  authors {
    id
    name
  }
}
```

### Mutations (WRITE)

```graphql
# Using inline literal
mutation {
  addAuthor(name: "Abheet") {
    id
    name
  }
}

# Using variables (recommended — reusable, type-safe)
mutation AddAuthor($name: String!) {
  addAuthor(name: $name) {
    id
    name
  }
}
# variables: { "name": "Abheet" }
```

---

## Data Shape

```
Author { id, name, books[] }
Book   { id, title, publishedYear, author }
```

## Available Queries

- `books` — list of all books
- `authors` — list of all authors
- `books { author { name } }` — books with their author (field-level resolver)
- `authors { books { title } }` — authors with their books (field-level resolver)

## Available Mutations

- `addAuthor(name: String!)` — creates a new author
- `addBook(title: String!, publishedYear: Int!, authorId: ID!)` — creates a new book

---

## Running

```bash
npm start        # starts nodemon on port 4000
# open http://localhost:4000 for Apollo Sandbox
```
