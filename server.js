const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
// Create a standard HTTP server
const server = http.createServer(app);
// Attach Socket.io to that server
const io = new Server(server);

app.use(express.static('frontend'));

// Listen for WebSockets connecting from the browser
io.on('connection', (socket) => {
    console.log('A user connected to the terminal!');
    
    let pythonProcess = null;

    // Listen for the "run_code" event from the browser
    socket.on('run_code', (code) => {
        const fileName = 'temp.py';
        fs.writeFileSync(fileName, code);

        // We use 'spawn' to keep the process alive and streaming
        // NOTE: The '-u' flag in Python is CRUCIAL. It forces Python to stream 
        // output instantly instead of holding it in a buffer.
        pythonProcess = spawn('docker', [
            'run', '-i', '--rm', 
            '-v', `${__dirname}:/app`, '-w', '/app', 
            '--network', 'none', '--memory=50m', '--cpus=0.5', 
            'python:3.9-alpine', 'python', '-u', fileName
        ]);

        // When Docker spits out text, send it instantly to the browser
        pythonProcess.stdout.on('data', (data) => {
            socket.emit('terminal_output', data.toString());
        });

        // When Docker spits out an error, send it to the browser
        pythonProcess.stderr.on('data', (data) => {
            socket.emit('terminal_output', data.toString());
        });

        // When the container finishes/dies, tell the browser
        pythonProcess.on('close', (code) => {
            // We emit a special 'process_exit' event instead of just text
            socket.emit('process_exit', code);
            if (fs.existsSync(fileName)) fs.unlinkSync(fileName);
        });
    });

    // Listen for keystrokes/inputs from the browser and pipe them into Docker
    socket.on('terminal_input', (input) => {
        if (pythonProcess) {
            pythonProcess.stdin.write(input + '\n');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        // Clean up: Kill the container if the user closes the browser tab
        if (pythonProcess) pythonProcess.kill();
    });
});

// Notice we use 'server.listen' now, not 'app.listen'
server.listen(3000, () => console.log('Interactive Terminal Server running on http://localhost:3000'));