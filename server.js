// server.js
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const fs = require('fs');
const csv = require('csv-parser');

const PORT = 3001;

let roomData = new Map([['balls', undefined]]);
let roomChannels = new Map([['balls', new Map([[1234, 'channel2']])]]); // map from roomID -> map of (channelID, channel) for all text channels associated with room
let roomUsers = new Map([['balls', new Set()]]);
let socket_to_user = new Map();
let socketIsHost = new Map();

module.exports = {
    createRoom: createRoom
};

app.use(express.static('public'));

app.use(express.json());

function createRoom(file, recurse = 0) {
    let room = 'room';
    for (let i = 0; i < 5 + recurse / 5; i++) room += Math.floor(Math.random() * 10);
    if (roomData.has(room)) room = createRoom(file, recurse + 1);
    else {
        // Valid room ID, so create and set up room
        roomData.set(room, parseMessageData(file));
        roomChannels.set(room, getChannels(room));
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
        console.log('Done.');
    });

    return results;
}

function getChannels(roomID) {
    let result = new Map();
    let data = roomData.get(roomID);
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if(!result.has(row.channelID)) {
            result.set(row.channelID, row.channel);
        }
    }

    return result;
}

io.on('connection', (socket) => {
    console.log('New user connected');

    // Event listener for join event
    socket.on('join', ({ roomID, username }) => {
        roomID = roomID.toLowerCase();
        // Check if the requested room exists
        let room = roomUsers.get(roomID);
        console.log(roomUsers);
        if (room == null) socket.emit('error', 'Room not found');

        // Check if username already taken in room
        else if (room.has(username)) socket.emit('error', 'Username Taken');

         // Emit joined event to the client and update map
        else {
            room.add(username);
            socket_to_user.set(socket, [roomID, username]);
            socket.join(roomID);
            socket.emit('joined', { roomID, username });
            if (room.size == 1) socketIsHost.add(socket, roomID);
        }
    });

        // Event listener for join event
        socket.on('disconnect', () => {
            // Check if socket is in a room
            let room_user = socket_to_user.get(socket);
            if (room_user != undefined) {
                // If in a room, remove from room userlist
                let room = roomUsers.get(room_user[0]);
                room.delete(room_user[1]);

                // If socket is host, delete from host list
                let host = socketIsHost.get(socket);
                if (host != undefined) {
                    socketIsHost.delete(socket);
                    
                    // If room has more users, assign new host
                    if (room.size > 0) {
                        socketIsHost.set(room.values().next().value, host);
                        console.log('New Host Set');
                    }
                }
            }
        });
        
        // Event listener for getChannels event
        // returns: a Map (channelID -> channelName) of all channels associated with this room
        socket.on('getChannels', (roomID) => {
            roomID = roomID.toLowerCase();
            if(roomChannels.has(roomID)) {
                socket.emit('channelsResponse', roomChannels.get(roomID));
            }
            else {
                socket.emit('error', 'Channel data for room not found');
            }
        });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
