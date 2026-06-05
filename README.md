# Python Code Runner

A secure, browser-based Python code runner with a live terminal. The frontend
is a Monaco editor served as static files, and the backend spawns an isolated
Docker container to execute untrusted Python code safely.

## Features

- Monaco-based code editor with tabs, full-screen mode, undo/redo
- Run Python code inside a sandboxed Docker container (no network, limited
  memory and CPU)
- Streaming terminal output over Socket.IO
- Interactive stdin support (programs can read input line-by-line)
- Problems panel for surfacing errors

## Project Structure

```
pythonrunner/
├── server.js           # Express + Socket.IO server
├── package.json
├── package-lock.json
└── frontend/
    ├── index.html
    ├── styles.css
    └── script.js
```

## Prerequisites

- Node.js (LTS recommended)
- Docker (the server runs user code in a `python:3.9-alpine` container)
- A POSIX-style shell to launch Docker (Windows: WSL or PowerShell with
  Docker Desktop)

## Installation

```bash
cd f:\pythonrunner
npm install
```

## Running

```bash
node server.js
```

Then open http://localhost:3000 in your browser.

## Security Notes

The server executes user-supplied code via:

```bash
docker run -i --rm \
  -v ${PWD}:/app -w /app \
  --network none --memory=50m --cpus=0.5 \
  python:3.9-alpine python -u temp.py
```

- `--network none` blocks outbound network access
- `--memory=50m` and `--cpus=0.5` cap resource usage
- `--rm` cleans up the container after it exits
