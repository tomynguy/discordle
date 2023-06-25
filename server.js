// server.js
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const fs = require('fs');
const csv = require('csv-parser');

const PORT = 3000;

let rooms = new Map();
let roomUsers = new Map();
module.exports = {
    createRoom: createRoom
};

app.use(express.static('public'));

app.use(express.json());

function createRoom(file, recurse = 0) {
    let room = 'Room';
    for (let i = 0; i < 5 + recurse / 5; i++) room += Math.floor(Math.random() * 10);
    if (rooms.has(room)) room = createRoom(file, recurse + 1);
    else {
        // Valid room ID, so create and set up room
        rooms.set(room, parseMessageData(file));
        roomUsers.set(room, new Set());
    }
    return room;
}

// given a CSV file name of the message data, parse it
function parseMessageData(path) {
    let results = [];

    fs.createReadStream(`parsedMessages/${path}`)
    .pipe(csv())
    .on('data', (data) => {
        // Process each row of data
        results.push(data);
    })
    .on('end', () => {
        // CSV parsing is complete, print results
        console.log(results);
    });

    return results;
}

io.on('connection', (socket) => {
    console.log('New user connected');

    // Event listener for join event
    socket.on('join', ({ roomID, username }) => {
        // Check if the requested room exists
        let room = roomUsers.get(roomID);
        if (room == null) {
            socket.emit('error', 'Room not found');
        }

        // Check if username already taken in room
        else if (room.has(username)) {
            socket.emit('error', 'Username Taken');
        }

         // Emit joined event to the client and update map
        else {
            socket.emit('joined', { roomID, username });
            room.add(username);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
