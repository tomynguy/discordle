// server.js
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const fs = require('fs');
const csv = require('csv-parser');

const PORT = 3000;
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
    createRoom: createRoom,
    PORT: PORT
};

app.use(express.static('public'));

app.use(express.json());

async function createRoom(file, recurse = 0) {
    let room = 'room';
    for (let i = 0; i < 5 + recurse / 5; i++) room += Math.floor(Math.random() * 10);
    if (roomData.has(room)) room = createRoom(file, recurse + 1);
    else {
        // Valid room ID, so create and set up room
        roomList.set(room, new Set());
        const messageData = await parseMessageData(file);
        roomData.set(room, messageData);
        roomFilterData.set(room, getFilterData(room));
    }
    return room;
}

// given a CSV file name of the message data, parse it
async function parseMessageData(path) {
    return new Promise((resolve, reject) => {
      const results = [];
  
      fs.createReadStream(`parsedMessages/${path}`)
        .pipe(csv())
        .on('data', (data) => {
          // Process each row of data
          results.push(data);
        })
        .on('end', () => {
          // CSV parsing is complete, resolve the promise with the results
          console.log('CSV parsing completed.');
          resolve(results);
        })
        .on('error', (error) => {
          // Error occurred during CSV parsing, reject the promise
          reject(error);
        });
    });
  }

function getFilterData(roomID) {
    let channels = new Map();
    let usernames = new Map();
    let data = roomData.get(roomID);

    for (let i = 0; i < data.length; i++) {
        const row = data[i];

        // add channel
        channels.set(row.ChannelID, row.Channel);
        
        // add username
        const alternateNames = {
            displayName: row.DisplayName,
            nickname: row.Nickname
        }
        
        if(!usernames.has(row.GlobalName)) {
            usernames.set(row.GlobalName, alternateNames);
            console.log(`${row.GlobalName}: ${alternateNames}`);
        }

        
    }

    return {
        'channels': channels,
        'usernames' : usernames
    };
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
            socket.emit('error', 'Username taken');
        } else if (username === '') {
            socket.emit('error', 'Invalid username');
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

    socket.on('setupGame', (roomID, settings) => {
        const data = JSON.parse(settings);
        const selectedChannels = new Set(JSON.parse(data.channels));
        const selectedUsers = new Set(JSON.parse(data.usernames));

        console.log(selectedChannels);
        console.log(selectedUsers);

        // TO-DO: send back 'startGame' message to all user sockets somehow
        // which will triggers game page html
    });

    // Get attributes
    socket.on('balls', () => {
        console.log(socket.username, socket.room);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
