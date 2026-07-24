// Hand-written interfaces matching the GraphQL schema (types.ts) and the
// shape of the in-memory data store (resolvers.ts). Named `entities.ts`
// (not `types.ts`) to avoid colliding with the schema file, which already
// owns that name.

export interface Author {
  id: string;
  name: string;
}

export interface Book {
  id: string;
  title: string;
  publishedYear: number;
  authorId: string;
}

export interface AddAuthorArgs {
  name: string;
}

export interface AddBookArgs {
  title: string;
  publishedYear: number;
  authorId: string;
}
