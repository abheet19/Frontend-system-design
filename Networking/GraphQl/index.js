// ApolloServer - the core GraphQL server class
import { ApolloServer } from '@apollo/server';

// startStandaloneServer - spins up a built-in Express HTTP server for Apollo
// Internally it: creates an Express app → applies GraphQL middleware → starts listening
// For production with custom middleware (auth, cors, etc.) use expressMiddleware() instead
import { startStandaloneServer } from '@apollo/server/standalone';

import { typeDefs } from './types.js'; // schema (what data looks like + allowed operations)
import { resolvers } from './resolvers.js'; // implementation (how to fetch/mutate data)

// ApolloServer takes 2 required things:
//   typeDefs  - the SDL schema string
//   resolvers - the resolver map object
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// startStandaloneServer returns the URL the server is listening on
// listen.port sets the HTTP port (default 4000)
// In prod you'd also configure: context (for auth), cors, plugins (for logging/APM), etc.
//
// NEW SYNTAX — top-level await: `await` used directly at module scope, outside
// any async function. This is legal ONLY in ES modules ("type":"module"); in a
// CommonJS file you'd have to wrap it in an async IIFE. `const { url } = ...` is
// object destructuring — pull the `url` property out of the returned object.
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀  Server ready at: ${url}`);
