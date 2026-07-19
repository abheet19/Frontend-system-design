// ============================================================================
// gRPC CLIENT STUB — the object that lets us call the remote server's methods
// as if they were local functions (client.get(...), client.insert(...), ...).
// ----------------------------------------------------------------------------
// "Stub" is the standard RPC term: a local proxy that marshals your arguments
// into a Protobuf message, sends them over HTTP/2 to the server, waits for the
// reply, and hands it back. All the networking is hidden inside these methods.
// This module builds the stub ONCE and exports it so the gateway can reuse it.
// ============================================================================

import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';

// Load the SAME contract the server loads — both sides must agree on it.
// import.meta.dirname = this file's folder (ESM replacement for __dirname).
const PROTO_PATH = path.join(import.meta.dirname, '../customers.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, // keep proto field names as-is
  longs: String, // 64-bit ints as strings
  enums: String, // enums as names
  arrays: true, // repeated fields default to []
});

// Drill into the `customers` package to reach the generated CustomerService.
const customersProto = grpc.loadPackageDefinition(packageDefinition).customers;

// Construct the stub, pointing it at the server's address.
//   'localhost:3004'              -> where the gRPC server is listening
//   grpc.credentials.createInsecure() -> plaintext (matches the server's
//                                        createInsecure(); prod uses TLS creds)
// The returned `client` has one JS method per rpc in the .proto.
const client = new customersProto.CustomerService(
  'localhost:3004',
  grpc.credentials.createInsecure()
);

export default client;
