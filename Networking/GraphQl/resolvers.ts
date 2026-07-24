// Resolvers = functions that FULFILL each field defined in typeDefs.
// They are the "implementation" of the schema. The object's shape MUST mirror
// the schema: { TypeName: { fieldName: resolverFn } }.

import { GraphQLError } from 'graphql'; // for throwing typed GraphQL errors
import type { Author, Book, AddAuthorArgs, AddBookArgs } from './entities.js';

// ----------------------------
// IN-MEMORY DATA STORE
// ----------------------------
// Stands in for a database (in prod: Mongo/Postgres calls).
// NOTE: all ids are STRINGS and the relationship is modelled ONE way — a book
// points at its author via `authorId`. (An author does NOT store bookIds; that
// would be a second, duplicate source of truth that can drift. Author.books is
// derived by filtering the books list — see the Author resolver below.)
const data: { authors: Author[]; books: Book[] } = {
  authors: [
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' },
  ],
  books: [
    { id: '101', title: 'Book 1', publishedYear: 2022, authorId: '1' },
    { id: '102', title: 'Book 2', publishedYear: 2023, authorId: '1' },
    { id: '103', title: 'Book 3', publishedYear: 2024, authorId: '2' },
  ],
};

// Monotonic id counters — never derive a new id from `array.length` (it can
// collide after removals, and here it wouldn't even match the id format).
let nextAuthorId = 3; // authors are '1','2'
let nextBookId = 104; // books are '101','102','103'

// ----------------------------
// RESOLVER FUNCTION SIGNATURE
// ----------------------------
// Every resolver can receive up to 4 args, in this order:
//   parent  - the resolved value of the PARENT field (key for nested resolvers)
//   args    - the arguments passed to this field in the query/mutation
//   context - shared per-request object (auth, DB handles) — same for all resolvers
//   info    - low-level query metadata (field name, path) — rarely needed
// You only need to LIST the args you actually use (trailing ones can be dropped),
// which is why the resolvers below take just `parent`, `args`, or nothing.

export const resolvers = {
  // ----------------------------
  // FIELD-LEVEL RESOLVERS
  // ----------------------------
  // These run ONLY when the client asks for that field — GraphQL is lazy and
  // resolves exactly what's requested, nothing more.

  Book: {
    // parent = one Book. Find its author. Ids are consistent strings, so we can
    // use STRICT === (no loose == coercion needed).
    author: (parent: Book): Author | undefined =>
      data.authors.find((author) => author.id === parent.authorId),
  },

  Author: {
    // parent = one Author. Its books are every book pointing back at this id.
    books: (parent: Author): Book[] =>
      data.books.filter((book) => book.authorId === parent.id),
  },

  // ----------------------------
  // QUERY RESOLVERS (READ) — the entry points; parent is undefined here.
  // ----------------------------
  Query: {
    authors: (): Author[] => data.authors, // in prod: await db.authors.findAll()
    books: (): Book[] => data.books, // in prod: await db.books.findAll()
  },

  // ----------------------------
  // MUTATION RESOLVERS (WRITE)
  // ----------------------------
  // Example call:
  //   mutation AddAuthor($name: String!) { addAuthor(name: $name) { id name } }
  //   variables: { "name": "Abheet" }
  Mutation: {
    // `_` is a throwaway for the unused `parent`; `args` = { name }.
    addAuthor: (_: unknown, args: AddAuthorArgs): Author => {
      const name = args.name?.trim();
      if (!name) {
        // Throwing a GraphQLError is how you surface a clean, typed error to the
        // client (shows up in the response's `errors` array with this code).
        throw new GraphQLError('name is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      const newAuthor: Author = { id: String(nextAuthorId++), name };
      data.authors.push(newAuthor);
      return newAuthor; // must satisfy `Author!` from the schema
    },

    // args = { title, publishedYear, authorId }
    addBook: (_: unknown, args: AddBookArgs): Book => {
      // Validate the relationship BEFORE creating — reject a book that points at
      // a non-existent author instead of silently storing a dangling link.
      const author = data.authors.find((a) => a.id === args.authorId);
      if (!author) {
        throw new GraphQLError(`Author ${args.authorId} not found`, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      const newBook: Book = { ...args, id: String(nextBookId++) };
      data.books.push(newBook);
      return newBook; // must satisfy `Book!` from the schema
    },
  },
};
