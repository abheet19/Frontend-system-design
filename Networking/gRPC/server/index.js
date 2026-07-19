// ============================================================================
// gRPC SERVER — implements the CustomerService methods declared in the .proto
// ----------------------------------------------------------------------------
// Run it:  npm run server   (listens on 127.0.0.1:3004, binary gRPC over HTTP/2)
// Nobody talks to this directly from a browser/Postman — the REST gateway
// (../client) does, translating HTTP+JSON <-> gRPC+Protobuf. See client/index.js.
// ============================================================================

// --- imports (ESM: this folder's package.json has "type":"module") ----------
import grpc from '@grpc/grpc-js'; // pure-JS gRPC runtime (server + client + status codes)
import protoLoader from '@grpc/proto-loader'; // reads a .proto file into a JS package definition
import path from 'path'; // build a filesystem path to the .proto in an OS-safe way
import { randomUUID } from 'crypto'; // Node's built-in UUID generator (node:crypto), for new ids

// --- in-memory data store ----------------------------------------------------
// Declared FIRST so it exists before any handler closure below can run. (Your
// original had this at the bottom; it worked only because the whole module
// finishes evaluating before the first request arrives — but top is correct.)
// In production this would be a real database (Postgres, Mongo, ...).
const customers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '1234567890',
  },
  {
    id: '2',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '1234567890',
  },
  {
    id: '3',
    name: 'Jim Doe',
    email: 'jim.doe@example.com',
    phone: '1234567890',
  },
];

// --- load the contract -------------------------------------------------------
// `import.meta.dirname` = the folder THIS file lives in. It is the ESM
// replacement for CommonJS `__dirname` (available in Node 20.11+). We go up one
// level (..) to reach customers.proto which sits beside the server/ folder.
const PROTO_PATH = path.join(import.meta.dirname, '../customers.proto');

// Turn the .proto text into a "package definition" (a plain JS description of
// the services + messages). The options control how proto <-> JS map:
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, // keep proto field names as written (don't camelCase them)
  longs: String, // represent 64-bit ints as strings (JS numbers can't hold them safely)
  enums: String, // represent enum values as their string names, not numbers
  arrays: true, // give `repeated` fields a default [] instead of undefined
});

// Build usable gRPC objects from that definition, then drill into the
// `customers` package (from `package customers;` in the .proto).
const customersProto = grpc.loadPackageDefinition(packageDefinition).customers;

// --- helper: wrap a handler so any thrown error becomes a clean gRPC error ---
// gRPC unary handler signature is:  (call, callback) => { ... }
//   call     -> the incoming request; the payload is on `call.request`
//   callback -> you MUST call it exactly once: callback(error, response)
//               success => callback(null, responseMessage)
//               failure => callback({ code: grpc.status.X, message: '...' })
// This wrapper adds a try/catch so an unexpected bug returns INTERNAL instead
// of crashing the whole server (an uncaught throw in a handler is fatal).
const handler = (fn) => (call, callback) => {
  try {
    fn(call, callback);
  } catch (err) {
    console.error('Handler error:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
  }
};

// --- create the server and register the service implementation ---------------
const server = new grpc.Server();

// addService links the .proto service (CustomerService) to real JS functions.
// The keys here (getAll/get/insert/update/delete) map to the rpc names — with
// keepCase they match the proto casing (rpc GetAll -> getAll on the JS object).
server.addService(customersProto.CustomerService.service, {
  // GetAll -> returns CustomerList { repeated Customer customers }
  // So the response object's shape must be { customers: [...] }. This one was
  // already correct because CustomerList genuinely HAS a `customers` field.
  getAll: handler((call, callback) => {
    callback(null, { customers });
  }),

  // Get -> the .proto says `returns (Customer)`, i.e. a Customer DIRECTLY.
  // FIX: return the customer object itself, NOT { customer }. Wrapping it in
  // { customer } sent an *unknown* field, which protobuf silently drops, so the
  // gateway received an empty Customer — that was your "success:true but no
  // data" bug. Also note the `return` on the not-found path: without it the code
  // fell through and called callback() a SECOND time (a double-callback bug).
  get: handler((call, callback) => {
    const customer = customers.find((c) => c.id === call.request.id);
    if (!customer) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'Customer not found',
      });
    }
    callback(null, customer); // matches `returns (Customer)`
  }),

  // Insert -> create a new customer. Validate first, then assign a server-side
  // id (never trust the client to pick ids). Returns the created Customer.
  insert: handler((call, callback) => {
    const { name, email, phone } = call.request;
    if (!name || !email) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'name and email are required',
      });
    }
    const customer = { id: randomUUID(), name, email, phone: phone || '' };
    customers.push(customer);
    callback(null, customer); // matches `returns (Customer)`
  }),

  // Update -> full replace (PUT semantics). Find by id, overwrite fields,
  // return the updated Customer. `return` after NOT_FOUND is required.
  update: handler((call, callback) => {
    const customer = customers.find((c) => c.id === call.request.id);
    if (!customer) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'Customer not found',
      });
    }
    // proto3 note: any field the client omits arrives as "" (zero value), so a
    // full-replace PUT can blank a field. That's expected for PUT; use a
    // FieldMask/PATCH rpc if you want partial updates.
    customer.name = call.request.name;
    customer.email = call.request.email;
    customer.phone = call.request.phone;
    callback(null, customer); // matches `returns (Customer)`
  }),

  // Delete -> the .proto says `returns (Empty)` (no payload). We reply with {}.
  // Teaching note: Empty has NO fields, so if you tried to send
  // { message: 'deleted' } here, protobuf would drop it — the gateway can't
  // receive data through an Empty response. The "deleted" message is added by
  // the REST gateway instead (see client/index.js).
  delete: handler((call, callback) => {
    const index = customers.findIndex((c) => c.id === call.request.id);
    if (index === -1) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'Customer not found',
      });
    }
    customers.splice(index, 1);
    callback(null, {}); // Empty
  }),
});

// --- start listening ---------------------------------------------------------
// bindAsync opens the port. createInsecure() = plaintext (no TLS) — fine for
// local dev; production uses createSsl() with certs. The callback gives (err, port).
const ADDRESS = '127.0.0.1:3004';
server.bindAsync(
  ADDRESS,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      // FIX: on bind failure, log and exit instead of falsely printing "running".
      console.error('Failed to bind gRPC server:', err);
      process.exit(1);
    }
    console.log(`gRPC server running on ${ADDRESS} (port ${port})`);
  }
);

// --- graceful shutdown -------------------------------------------------------
// On Ctrl+C (SIGINT) or a kill (SIGTERM), stop accepting new calls and let
// in-flight calls finish before exiting. tryShutdown is the clean way to do this.
const shutdown = () => {
  console.log('\nShutting down gRPC server...');
  server.tryShutdown((err) => {
    if (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
