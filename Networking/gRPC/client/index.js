// ============================================================================
// REST -> gRPC GATEWAY  (a.k.a. BFF: "Backend For Frontend")
// ----------------------------------------------------------------------------
// Run it:  npm run client   (needs the gRPC server running too: npm run server)
//
// WHY THIS FILE EXISTS: browsers and Postman speak HTTP/1.1 + JSON. Our gРС
// server speaks HTTP/2 + Protobuf (binary) and can't be called from a browser
// directly. So this small Express app accepts normal REST requests, calls the
// gRPC server through the stub, and translates the gRPC reply back into JSON.
//
//   Postman ──HTTP/JSON──▶ THIS gateway (:3000) ──gRPC/Protobuf──▶ server (:3004)
//   Postman ◀─HTTP/JSON── THIS gateway (:3000) ◀─gRPC/Protobuf── server (:3004)
//
// "How do I call the gRPC server internally?" -> you import the stub (client.js)
// and just call client.<method>(request, callback). That call IS the network
// hop to :3004; the stub does the Protobuf encoding + HTTP/2 transport for you.
// ============================================================================

import express from 'express';
import grpc from '@grpc/grpc-js'; // only needed here for grpc.status codes + Metadata
import client from './client.js'; // the pre-built gRPC stub pointing at :3004

const app = express();
const port = 3000;

// Parse incoming JSON bodies into req.body (built-in; replaces body-parser).
app.use(express.json());

// --- helper: translate a gRPC status code into the right HTTP status ---------
// gRPC has its own numeric status codes; REST clients expect HTTP codes. Mapping
// them makes the gateway behave like a proper REST API (404 for missing, etc.)
// instead of collapsing everything to 500.
const grpcToHttp = (code) => {
  switch (code) {
    case grpc.status.NOT_FOUND:
      return 404;
    case grpc.status.INVALID_ARGUMENT:
      return 400;
    case grpc.status.ALREADY_EXISTS:
      return 409;
    case grpc.status.UNAVAILABLE: // server down / unreachable
      return 503;
    case grpc.status.DEADLINE_EXCEEDED: // call took too long (see withDeadline)
      return 504;
    default:
      return 500;
  }
};

// --- helper: give every gRPC call a deadline ---------------------------------
// A deadline is gRPC's built-in timeout. Without it, if the server hangs the
// HTTP request hangs forever. Here every call must complete within 5 seconds or
// it fails with DEADLINE_EXCEEDED. (Date.now() runs in Node at request time.)
const withDeadline = (ms = 5000) => ({ deadline: new Date(Date.now() + ms) });

// --- helper: send a gRPC error back as the right HTTP JSON response -----------
// Every route's callback begins the same way: "if there was an error, reply with
// it." This plain function does just that, so we don't repeat those 3 lines in
// every route. A gRPC error carries `code` (a grpc.status) + `details`/`message`.
const sendError = (res, err) => {
  res
    .status(grpcToHttp(err.code))
    .json({ success: false, message: err.details || err.message });
};

// --- routes: each maps one REST endpoint to one gRPC method ------------------
// Each stub call takes: (requestMessage, options, callback). The callback is the
// standard Node shape (err, response) — the SAME shape the server uses. Read it
// top-to-bottom: "if error, send it; otherwise send the data."

// GET /getAll -> CustomerService.GetAll(Empty)
// Pass {} (not null) as the Empty request — the stub needs an object to encode.
app.get('/getAll', (req, res) => {
  client.getAll({}, withDeadline(), (err, response) => {
    if (err) return sendError(res, err);
    // GetAll returns CustomerList { customers }, so the list is response.customers.
    res.json({ success: true, data: response.customers });
  });
});

// GET /get/:id -> CustomerService.Get(CustomerRequestID) returns Customer
// FIX: send `response` itself, not response.customer. The proto returns a Customer
// DIRECTLY; reading .customer is why /get/1 used to come back with no data.
app.get('/get/:id', (req, res) => {
  client.get({ id: req.params.id }, withDeadline(), (err, response) => {
    if (err) return sendError(res, err);
    res.json({ success: true, data: response });
  });
});

// POST /insert -> CustomerService.Insert(Customer) returns Customer
// Body should be { name, email, phone }. The server assigns the id.
app.post('/insert', (req, res) => {
  client.insert(req.body, withDeadline(), (err, response) => {
    if (err) return sendError(res, err);
    res.json({ success: true, data: response });
  });
});

// PUT /update/:id -> CustomerService.Update(Customer) returns Customer
// Build the Customer message: take the body's fields, then PIN the id from the
// URL path LAST so it wins. Order matters — object spread lets later keys
// override earlier ones, so `{ ...req.body, id }` ignores any `id` in the body
// (the path identifies the resource; the body must not be able to change which
// customer we target). The reverse order `{ id, ...req.body }` was a bug: a body
// like {"id":"5"} would retarget the update and cause "Customer not found".
app.put('/update/:id', (req, res) => {
  const customer = { ...req.body, id: req.params.id };
  client.update(customer, withDeadline(), (err, response) => {
    if (err) return sendError(res, err);
    res.json({ success: true, data: response });
  });
});

// DELETE /delete/:id -> CustomerService.Delete(CustomerRequestID) returns Empty
// Empty carries no data, so we send our own confirmation object.
app.delete('/delete/:id', (req, res) => {
  client.delete({ id: req.params.id }, withDeadline(), (err) => {
    if (err) return sendError(res, err);
    res.json({ success: true, data: { deleted: true, id: req.params.id } });
  });
});

// 404 for any unmatched route.
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Express error handler (4 args) — catches sync throws / bad JSON bodies so the
// gateway returns clean JSON instead of an HTML stack trace.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({ success: false, message: 'Gateway error' });
});

app.listen(port, () => {
  console.log(`REST gateway listening on http://localhost:${port}`);
});
