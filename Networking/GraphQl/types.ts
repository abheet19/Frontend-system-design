// typeDefs (Type Definitions) = the SCHEMA of the GraphQL API
// It defines the shape of data and what operations are allowed
// Written in SDL (Schema Definition Language) inside a tagged template literal
// The #graphql comment enables syntax highlighting in editors

export const typeDefs: string = `#graphql

    # ----------------------------
    # OBJECT TYPES
    # ----------------------------
    # Object types define the entities in your graph
    # Each field has a type; ! means non-nullable (required)

    type Author {
        id: ID!              # ID! = unique identifier, non-nullable
        name: String!        # String! = required string
        books: [Book!]       # [Book!] = list of non-null Book objects (list itself can be null)
    }

    type Book {
        id: ID!
        title: String!
        publishedYear: Int!  # Int! = required integer
        author: Author       # Author (no !) = nullable — a book may not have a resolved author
    }

    # ----------------------------
    # QUERY TYPE
    # ----------------------------
    # Query = READ operations (equivalent to GET in REST)
    # Every GraphQL API must have a Query type

    type Query {
        books: [Book!]       # returns a list of Books
        authors: [Author!]   # returns a list of Authors
    }

    # ----------------------------
    # MUTATION TYPE
    # ----------------------------
    # Mutation = WRITE operations (equivalent to POST/PUT/DELETE in REST)
    # Arguments are the inputs; return type is what gets sent back

    type Mutation {
        addAuthor(name: String!): Author!                                    # create a new author
        addBook(title: String!, publishedYear: Int!, authorId: ID!): Book!   # create a new book linked to an author
    }
`;
