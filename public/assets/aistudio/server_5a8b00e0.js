const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the static HTML page layout
app.use(express.static(path.join(__dirname, 'public')));

// Handle real-time communication events
io.on('connection', (socket) => {
    console.log('A user connected to the chat lobby');

    // Listen for incoming messages from any user
    socket.on('sendMessage', (data) => {
        // Broadcast the text message out to all other active screens instantly
        io.emit('receiveMessage', data);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Run online server on port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`WhatsApp Server is running on port ${PORT}`);
});
