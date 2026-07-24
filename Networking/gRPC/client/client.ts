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
// NEW SYNTAX (TS): types-only import from our own types.ts. NodeNext ESM
// requires the `.js` specifier extension even though the source file on disk
// is types.ts — TS rewrites this to point at the compiled output, this is
// normal/required, not a typo.
import type {
  Customer,
  CustomerRequestID,
  CustomerList,
  Empty,
} from '../types.js';

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
// NEW SYNTAX (TS): same two-cast pattern as server/index.ts — proto-loader
// builds this object dynamically at runtime, so @grpc/proto-loader can't give
// it a precise compile-time type. This is the one intentionally-loose
// boundary in this file (as discussed above): everything past it, including
// the `client` this module exports, is fully typed again.
const customersProto = grpc.loadPackageDefinition(packageDefinition)
  .customers as grpc.GrpcObject;
const CustomerService =
  customersProto.CustomerService as grpc.ServiceClientConstructor;

// The typed shape of our stub's methods, mirroring customers.proto's
// CustomerService 1:1 (GetAll/Get/Insert/Update/Delete). `extends grpc.Client`
// because the real stub IS a grpc.Client instance (constructed below) with
// these five extra methods bolted on by @grpc/proto-loader at runtime.
export interface CustomerServiceClient extends grpc.Client {
  getAll(
    req: Empty,
    opts: grpc.CallOptions,
    cb: (err: grpc.ServiceError | null, res: CustomerList) => void
  ): void;
  get(
    req: CustomerRequestID,
    opts: grpc.CallOptions,
    cb: (err: grpc.ServiceError | null, res: Customer) => void
  ): void;
  insert(
    req: Customer,
    opts: grpc.CallOptions,
    cb: (err: grpc.ServiceError | null, res: Customer) => void
  ): void;
  update(
    req: Customer,
    opts: grpc.CallOptions,
    cb: (err: grpc.ServiceError | null, res: Customer) => void
  ): void;
  delete(
    req: CustomerRequestID,
    opts: grpc.CallOptions,
    cb: (err: grpc.ServiceError | null, res: Empty) => void
  ): void;
}

// Construct the stub, pointing it at the server's address.
//   'localhost:3004'              -> where the gRPC server is listening
//   grpc.credentials.createInsecure() -> plaintext (matches the server's
//                                        createInsecure(); prod uses TLS creds)
// The returned `client` has one JS method per rpc in the .proto.
// NEW SYNTAX (TS): `as unknown as CustomerServiceClient` — the constructor's
// declared return type (`ServiceClient`, from @grpc/grpc-js) only knows about
// a generic `[methodName: string]: Function` index signature, not our five
// named methods, so TS won't allow a direct cast (the two types "don't
// sufficiently overlap"). Going through `unknown` first is the standard way
// to say "trust me" at this one dynamic-loading boundary.
const client = new CustomerService(
  'localhost:3004',
  grpc.credentials.createInsecure()
) as unknown as CustomerServiceClient;

export default client;
