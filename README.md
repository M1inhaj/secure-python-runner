
# Secure Python Code Runner

The Secure Python Code Runner is an interactive, real-time Python execution environment built with Node.js and Docker. It provides a cloud IDE interface for writing, executing, and interacting with untrusted Python code inside ephemeral, resource-constrained containers.

## System Architecture

<img width="4443" height="2395" alt="python code runner architecture" src="https://github.com/user-attachments/assets/9af12a52-763f-4dd2-ac8b-88017fb21f00" />

The application relies on a decoupled, stream-based architecture divided into three components:

1. **Client (Browser):** Captures code via the Monaco Editor and user inputs via an HTML/CSS terminal. Sends payloads via WebSockets.
2. **Orchestrator (Node.js/Express):** Maintains the persistent Socket.io connection. Receives code, writes it to a temporary file, and uses `child_process.spawn()` to initialize the Docker container.
3. **Sandbox (Docker):** Runs the `python:3.9-alpine` image. Node.js attaches virtual pipes to the container's `stdin`, `stdout`, and `stderr`, streaming the execution results back to the frontend.

## Technology Stack

* **Frontend:** HTML5, CSS3, JavaScript, Monaco Editor, FontAwesome
* **Backend:** Node.js, Express.js
* **Communication:** Socket.io
* **Infrastructure:** Docker, Alpine Linux

## Core Features

### Docker Sandboxing and Security
The system executes user-submitted code in an isolated environment to protect the host server from malicious payloads.
* **Network Isolation:** Internet access is disabled (`--network none`) to prevent data exfiltration.
* **Memory Limits:** Containers are capped at 50MB of RAM to prevent Out-Of-Memory (OOM) attacks.
* **CPU Throttling:** Execution is limited to 0.5 CPU cores to mitigate resource exhaustion from infinite loops.
* **Ephemeral File System:** The container and its file system are destroyed when the WebSocket connection closes or the process exits.

### Cloud IDE Frontend
* **Monaco Editor Integration:** Features Python syntax highlighting, automatic indentation, and cursor tracking using the Monaco Editor engine.
* **Tab Management:** Supports writing and managing multiple Python scripts through a dynamic tab interface.
* **Error Parsing:** Intercepts Python tracebacks, sanitizes Docker container paths, and displays syntax and execution errors in a dedicated Problems UI tab.

### Real-Time Interactive Terminal
* **WebSocket Streaming:** Uses Socket.io for persistent, two-way communication.
* **Standard I/O Piping:** Supports interactive Python functions (e.g., `input()`) by piping keystrokes from the browser terminal directly into the Docker container's `stdin`.
## System Demonstrations

[Demonstration 1 - Real-time error parsing and Problems tab catching a syntax error]<img width="800" height="807" alt="ScreenRecording2026-06-05114526-ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/1ac07d3b-8754-428e-99e0-e1fe43bd3d18" />


[Demonstration 2 - Security validation showing the terminal blocking a Botnet network request]<img width="800" height="742" alt="ezgif-60c663d6d82f1842" src="https://github.com/user-attachments/assets/3dd5e7c1-c0cc-4e95-a614-40f4c54af223" />

## Local Setup and Installation

### Prerequisites
Verify the following software is installed on the host machine:
* Node.js (v16 or higher)
* Docker Desktop

### Installation Steps
Execute the following commands in the terminal to initialize the application:

1. Clone the repository:
   ```bash
   git clone https://github.com/M1inhaj/secure-python-runner.git
   cd secure-python-runner
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Pull the required Docker image:
   ```bash
   docker pull python:3.9-alpine
   ```
4. Start the server:
   ```bash
   node server.js
   ```
5. Navigate to `http://localhost:3000` in a web browser.

## Penetration Testing and Security Validation

The following table details the sandbox response to common vulnerabilities during penetration testing.

| Attack Vector | Payload Example | System Response |
| :--- | :--- | :--- |
| **RAM Exhaustion** | `x = [] \n while True: x.append(" " * 10**6)` | Container killed by OS. Exit Code 137. |
| **Network Exfiltration** | `urllib.request.urlopen("http://google.com")` | Fails with socket.gaierror [Errno -3]. |
| **Host Breakout** | `open("/etc/passwd").read()` | Returns Alpine Linux users. Host OS remains isolated. |

## Future Enhancements

* Implement inactivity timeouts to terminate idle interactive containers.
* Integrate a Language Server Protocol (LSP) for real-time error detection inside the Monaco Editor.
* Add support for additional languages via dynamic Docker image routing.
