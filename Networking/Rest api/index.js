// ============================================================================
// REST API — a tiny Express CRUD service for "todos" (in-memory)
// ----------------------------------------------------------------------------
// Run it:  npm run start   (nodemon)  ->  http://localhost:3000
// This is the plain-HTTP/JSON counterpart to the gRPC demo next door: same CRUD
// idea, but hand-written routes + JSON instead of a .proto contract + Protobuf.
//
// REST conventions used here:
//   GET    /todos       list           POST /todos      create (201)
//   PUT    /todos/:id   full update     DELETE /todos/:id remove
//   HEAD / OPTIONS / TRACE /todos       metadata / preflight / echo
// ============================================================================

import express from 'express'; // ESM import (this package.json has "type":"module")

const app = express();
const port = 3000;

// express.json() is built-in middleware that parses a JSON request body and puts
// the result on req.body. (Replaces the old separate `body-parser` package.)
app.use(express.json());

// --- in-memory data store ----------------------------------------------------
// Stands in for a database. Resets every time the server restarts.
const todos = [
  { id: '1', title: 'Todo 1', completed: false },
  { id: '2', title: 'Todo 2', completed: true },
];

// Monotonic id counter. IMPORTANT: do NOT derive new ids from `todos.length`
// (the old bug) — after deleting an item, length can point back at an id that
// still exists, creating duplicates. A counter that only ever increases is safe.
let nextId = todos.length + 1;

// --- routes ------------------------------------------------------------------

// Health check.
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// READ all.
app.get('/todos', (req, res) => {
  res.json(todos);
});

// CREATE. `201 Created` is the correct status for a successful POST that makes
// a new resource.
app.post('/todos', (req, res) => {
  // NEW SYNTAX — destructuring with a DEFAULT: if req.body has no `completed`,
  // it defaults to false. `title` has no default, so it can be undefined.
  const { title, completed = false } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Title is required and must be a string',
    });
  }

  const newTodo = {
    id: String(nextId++), // use the counter, then increment (post-increment)
    title,
    completed: Boolean(completed), // coerce to a real boolean
  };

  todos.push(newTodo);
  res.status(201).json({ success: true, todo: newTodo });
});

// UPDATE (full replace of the provided fields). PUT is idempotent: sending the
// same request twice leaves the resource in the same state.
app.put('/todos/:id', (req, res) => {
  const todoIndex = todos.findIndex((todo) => todo.id === req.params.id);

  if (todoIndex === -1) {
    return res.status(404).json({ success: false, message: 'Todo not found' });
  }

  const { title, completed } = req.body;

  // Validate types before mutating — reject bad input with 400 instead of
  // storing a title that's a number, etc.
  if (title !== undefined && typeof title !== 'string') {
    return res
      .status(400)
      .json({ success: false, message: 'title must be a string' });
  }
  if (completed !== undefined && typeof completed !== 'boolean') {
    return res
      .status(400)
      .json({ success: false, message: 'completed must be a boolean' });
  }

  // NEW SYNTAX — spread (`...`) to shallow-CLONE the existing todo, so we build
  // a new object instead of mutating the array item in place.
  const updatedTodo = { ...todos[todoIndex] };
  if (title !== undefined) updatedTodo.title = title;
  if (completed !== undefined) updatedTodo.completed = completed;

  todos[todoIndex] = updatedTodo;
  res.json({ success: true, todo: updatedTodo });
});

// DELETE.
app.delete('/todos/:id', (req, res) => {
  const todoIndex = todos.findIndex((todo) => todo.id === req.params.id);

  if (todoIndex === -1) {
    return res.status(404).json({ success: false, message: 'Todo not found' });
  }

  todos.splice(todoIndex, 1); // remove 1 item at that index (mutates the array)
  res.json({ success: true });
});

// HEAD = same as GET but no response body — used to check a resource
// exists / get headers (Content-Length, ETag) without downloading it.
app.head('/todos', (req, res) => {
  res.status(200).end();
});

// OPTIONS = asks the server "what methods do you support here?"
// Browsers send this automatically as a CORS preflight before cross-origin
// requests with custom headers/methods.
app.options('/todos', (req, res) => {
  res.set('Allow', 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS');
  res.status(200).end();
});

// TRACE = echoes back the request as received, for debugging what
// proxies/middleware altered along the way. Rarely used, often disabled
// in prod (can leak headers) — included here for completeness only.
app.trace('/todos', (req, res) => {
  res.status(200).end();
});

// 404 for any unmatched route (must come AFTER all real routes).
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler — an Express middleware with FOUR args (err first) is
// special: Express routes thrown errors and bad JSON bodies here, so the client
// gets clean JSON instead of an HTML stack trace. `next` is unused but required
// for Express to recognize this as an error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  // express.json() throws a SyntaxError with status 400 on malformed JSON.
  const status = err.status === 400 ? 400 : 500;
  const message =
    status === 400 ? 'Invalid JSON body' : 'Internal server error';
  res.status(status).json({ success: false, message });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
