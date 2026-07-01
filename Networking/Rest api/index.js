import express from 'express';

const app = express();
const port = 3000;

// Built-in JSON body parser (replaces the separate body-parser package)
app.use(express.json());

// In-memory todos store
let todos = [
  {
    id: '1',
    title: 'Todo 1',
    completed: false
  },
  {
    id: '2',
    title: 'Todo 2',
    completed: true
  }
];

// Health check route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Get all todos
app.get('/todos', (req, res) => {
  res.json(todos);
});

// Create a new todo
app.post('/todos', (req, res) => {
  const { title, completed = false } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ success: false, message: 'Title is required and must be a string' });
  }

  const newTodo = {
    id: String(todos.length + 1),
    title,
    completed: Boolean(completed)
  };

  todos.push(newTodo);
  res.status(201).json({ success: true, todo: newTodo });
});

// Update a todo by ID
app.put('/todos/:id', (req, res) => {
  const todoIndex = todos.findIndex(todo => String(todo.id) === req.params.id);

  if (todoIndex === -1) {
    return res.status(404).json({ success: false, message: 'Todo not found' });
  }

  const { title, completed } = req.body;
  const updatedTodo = { ...todos[todoIndex] };

  if (title !== undefined) updatedTodo.title = title;
  if (completed !== undefined) updatedTodo.completed = completed;

  todos[todoIndex] = updatedTodo;
  res.json({ success: true, todo: updatedTodo });
});

// Delete a todo by ID
app.delete('/todos/:id', (req, res) => {
  const todoIndex = todos.findIndex(todo => String(todo.id) === req.params.id);

  if (todoIndex === -1) {
    return res.status(404).json({ success: false, message: 'Todo not found' });
  }

  todos.splice(todoIndex, 1);
  res.json({ success: true });
});

app.head('/todos', (req, res) => {
  res.status(200).end();
});

app.options('/todos',(req,res)=>{
  res.set('Allow', 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS');
  res.status(200).end();
});
app.trace('/todos',(req,res)=>{
  res.status(200).end();
});
// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});