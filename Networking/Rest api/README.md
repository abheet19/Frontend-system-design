# REST API Todo App

A simple REST API for managing todos, built with Express.js.

## Features

- Get all todos
- Create a new todo
- Update a todo by ID
- Delete a todo by ID
- 404 handling for unmatched routes

## Setup

Install dependencies:

```bash
npm install
```

Start the server:

```bash
node index.js
```

The server runs on `http://localhost:3000`.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/todos` | Get all todos |
| POST | `/todos` | Create a new todo |
| PUT | `/todos/:id` | Update a todo by ID |
| DELETE | `/todos/:id` | Delete a todo by ID |

## Example Requests

**Get all todos:**

```http
GET /todos
```

**Create a todo:**

```http
POST /todos
Content-Type: application/json

{
  "title": "Learn REST APIs",
  "completed": false
}
```

**Update a todo:**

```http
PUT /todos/1
Content-Type: application/json

{
  "completed": true
}
```

**Delete a todo:**

```http
DELETE /todos/1
```

## Notes

- `express.json()` is used for parsing JSON request bodies.
- Todo IDs are stored as strings. The API uses `String(todo.id)` when comparing against `req.params.id` so both string and number IDs work correctly.
- The in-memory `todos` array resets when the server restarts.
