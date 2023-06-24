// server.js
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const fs = require('fs');
const csv = require('csv-parser');

const PORT = 3000;

let rooms = new Map();
module.exports = {
    randRoom: randRoom
};

app.use(express.static('public'));

app.use(express.json());

function randRoom(file, recurse = 0) {
    let room = 'Room';
    for (let i = 0; i < 5 + recurse / 5; i++) room += Math.floor(Math.random() * 10);
    if (rooms.has(room)) room = randRoom(file, recurse + 1);
    else rooms.set(room, file);
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
        if (!rooms.has(roomID)) {
            socket.emit('error', 'Room not found');
            return;
        }

        // Emit joined event to the client
        socket.emit('joined', { roomID, username });
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
