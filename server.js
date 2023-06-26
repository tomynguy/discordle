// server.js
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const fs = require('fs');
const csv = require('csv-parser');

const PORT = 3001;
let roomList = new Map([['balls', new Set()]]);
let roomData = new Map([['balls', undefined]]);
// map from room -> map about components of the parsed data (i.e. channels names/ids, usernames), keys: "channels", "users"
let roomFilterData = new Map([
    ['balls', 
    {"channels": new Map([[1, "channel1"]]),
     "usernames": new Set([{
        globalName: "tomynguy",
        displayName: "Nathan",
        nickname: "WackyFlacky"}]),
    }]
]);

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
        roomList.set(room, new Set());
        roomData.set(room, parseMessageData(file));
        roomFilterData.set(room, getFilterData(room));
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

function getFilterData(roomID) {
    let result = new Map();

    let channels = new Map();
    let usernames = new Set();
    let data = roomData.get(roomID);
    for (let i = 0; i < data.length; i++) {
        const row = data[i];

        // add channel
        if(!channels.has(row.channelID)) {
            channels.set(row.channelID, row.channel);
        }
        
        // add username
        const username = {
            globalName: row.author.globalName,
            displayName: row.author.displayName,
            nickname: row.nickname
        }
        usernames.add(username);
    }

    result.set("channels", channels);
    result.set("usernames", usernames);

    return result;
}

io.on('connection', (socket) => {
    console.log('New user connected');

    // Validates client join request
    // Starts joining process if valid, otherwise send error
    socket.on('join', ({ roomID, username }) => {
        roomID = roomID.toLowerCase();
        if (!roomList.has(roomID)) {
            socket.emit('error', 'Room not found');
        } else if (roomList.get(roomID).has(username)) {
            socket.emit('error', 'Username Taken');
        } else {
            socket.room = roomID;
            socket.username = username;
            socket.emit('joined', { roomID, username });
        }
    });

        // Updates rooms upon client disconnection
        socket.on('disconnect', () => {
            console.log('Client Disconnected');
            let room = roomList.get(socket.room);
            if (room) {
                room.delete(socket.username);
            }
        });
        
        // Event listener for getFilterData event
        // returns: a Map of all filter data (channels, usernames) associated with this room
        socket.on('getFilterData', (roomID) => {
            roomID = roomID.toLowerCase();
            if (roomFilterData.has(roomID)) {
                const serializedData = {
                    "channels": JSON.stringify(Array.from(roomFilterData.get(roomID).channels)),
                    "usernames": JSON.stringify(Array.from(roomFilterData.get(roomID).usernames))
                }

                socket.emit('filterDataResponse', JSON.stringify(serializedData));
            }
            else {
                socket.emit('error', 'Filter data for room not found');
            }
        });

        // Get attributes
        socket.on('balls', () => {
            console.log(socket.username, socket.room);
        });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
