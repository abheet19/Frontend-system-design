// Resolvers = functions that FULFILL each field defined in typeDefs
// They are the "implementation" of the schema
// Structure must mirror the typeDefs shape: { TypeName: { fieldName: fn } }

// ----------------------------
// IN-MEMORY DATA STORE
// ----------------------------
// In production this would be replaced by DB calls (e.g. MongoDB, PostgreSQL)
// IDs are intentionally mixed types here to demonstrate loose == comparison in resolvers

const data = {
    authors: [
        {
            id: 1,
            name: "John Doe",
            bookIds: ["101", "102"]
        },
        {
            id: 2,
            name: "Jane Smith",
            bookIds: ["103"]
        }
    ],
    books: [
        {
            id: 101,
            title: "Book 1",
            publishedYear: 2022,
            authorId: "1"
        },
        {
            id: 102,
            title: "Book 2",
            publishedYear: 2023,
            authorId: "1"
        },
        {
            id: 103,
            title: "Book 3",
            publishedYear: 2024,
            authorId: "2"
        }
    ]
}

// ----------------------------
// RESOLVER FUNCTION SIGNATURE
// ----------------------------
// Every resolver receives 4 arguments:
//   parent  - the resolved value of the PARENT field (crucial for nested/field-level resolvers)
//   args    - the arguments passed to this field in the query/mutation
//   context - shared object across all resolvers in a request (auth, DB connections, etc.)
//   info    - metadata about the query (field name, return type, path, etc.) — rarely needed

export const resolvers = {

    // ----------------------------
    // FIELD-LEVEL RESOLVERS
    // ----------------------------
    // These run ONLY when the client explicitly requests that field
    // GraphQL is lazy — it only resolves what is asked for
    // parent here is the Book object returned by the Query.books resolver

    Book: {
        author: (parent, args, context, info) => {
            // parent = the individual Book object
            // Use == (loose equality) because authorId is stored as string ("1") but author.id is a number (1)
            return data.authors.find(author => author.id == parent.authorId)
        }
    },

    Author: {
        books: (parent, args, context, info) => {
            // parent = the individual Author object
            // Filter all books where the book's authorId matches this author's id
            return data.books.filter(book => book.authorId == parent.id)
        }
    },

    // ----------------------------
    // QUERY RESOLVERS (READ)
    // ----------------------------
    // parent is null/undefined for root Query resolvers (they are the entry point)

    Query: {
        authors: (parent, args, context, info) => {
            return data.authors  // in prod: await db.authors.findAll()
        },
        books: (parent, args, context, info) => {
            return data.books    // in prod: await db.books.findAll()
        }
    },

    // ----------------------------
    // MUTATION RESOLVERS (WRITE)
    // ----------------------------
    // args contains the variables passed in the mutation
    // Example mutation call:
    //   mutation AddAuthor($name: String!) { addAuthor(name: $name) { id name } }
    //   variables: { "name": "Abheet" }

    Mutation: {
        addAuthor: (parent, args, context, info) => {
            // args = { name: "Abheet" } (whatever was passed in the mutation)
            // Spread args to get all input fields, then assign a new id
            const newAuthor = { ...args, id: data.authors.length + 1 }
            data.authors.push(newAuthor)
            return newAuthor  // must return Author! as declared in typeDefs
        },
        addBook: (parent, args, context, info) => {
            // args = { title, publishedYear, authorId }
            const newBook = { ...args, id: data.books.length + 1 }
            data.books.push(newBook)
            return newBook    // must return Book! as declared in typeDefs
        }
    }
}

