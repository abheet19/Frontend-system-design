// ============================================================================
// types.ts — TypeScript mirrors of the messages declared in customers.proto
// ----------------------------------------------------------------------------
// These are hand-written compile-time shapes, NOT generated from the .proto.
// @grpc/proto-loader still reads customers.proto at runtime and does the real
// encoding/decoding (see server/index.ts and client/client.ts) — these
// interfaces just describe, for the TypeScript compiler, the JS object shape
// that proto-loader produces for each message (with keepCase:true, arrays:true).
// Keep this file in sync with customers.proto by hand if the contract changes.
// ============================================================================

// The core entity. Mirrors: message Customer { string id/name/email/phone }
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

// Request payload that carries just an id (used by Get and Delete).
export interface CustomerRequestID {
  id: string;
}

// A list wrapper — the wire has a field named "customers" holding many
// Customer values (proto3 `repeated`).
export interface CustomerList {
  customers: Customer[];
}

// proto3's Empty message has no fields. `Record<string, never>` models "an
// object that cannot have any properties" — stricter than `{}` (which TS
// treats as "any non-nullish value") or `object`.
export type Empty = Record<string, never>;
