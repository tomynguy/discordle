// server.js
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const fs = require('fs');
const csv = require('csv-parser');

const PORT = 3001;
let roomList = new Map([['balls', new Set()]]);
let roomData = new Map([['balls', undefined]]); // map from room -> parsed message data
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

let gameData = new Map(); // map from room -> {message the room is currently on, number of rounds left}

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
            socket.roomID = roomID;
            socket.username = username;
            socket.join(roomID);
            socket.emit('joined', { roomID, username });
        }
    });

    // Updates rooms upon client disconnection
    socket.on('disconnect', () => {
        console.log('Client Disconnected');
        let room = roomList.get(socket.room);
        if (room) {
            socket.leave(socket.room);
            room.delete(socket.username);
        }
    });
    
    // Event listener for getFilterData event
    // returns: a Map of all filter data (channels, usernames) associated with this room
    socket.on('getFilterData', () => {
        roomID = socket.roomID.toLowerCase();
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

    // Event listener for setupGame event
    // this event is triggered when client presses start game and sends their selected settings
    // returns: a start game message along with a random message fitting criteria
    let selectedChannels;
    let selectedUsers;
    let messages;

    socket.on('setupGame', (settings) => {
        const data = JSON.parse(settings);
        selectedChannels = new Set(JSON.parse(data.channels));
        selectedUsers = new Set(JSON.parse(data.usernames));

        // select random message that fits these filters
        messages = roomData.get(socket.roomID);
        let randomMessage;
        do {
            randomMessage = messages[Math.floor(Math.random() * messages.length)];
        }
        while (!selectedChannels.has(randomMessage.ChannelID) || !selectedUsers.has(randomMessage.GlobalName));
        
        let newGame = {
            message: randomMessage,
            roundsLeft: data.numRounds
        }

        gameData.set(socket.roomID, newGame);

        // send startGame message to all users
        io.to(socket.roomID).emit('startGame', randomMessage.Message);
    });

    socket.on('guessAnswer', (guess) => {
        if(guess.toLowerCase() != gameData.get(socket.roomID).message.GlobalName.toLowerCase() && guess.toLowerCase() != "balls") {
            console.log(`${socket.username}'s guess was wrong!`);
            return;
        }

        console.log(`Answer was: ${gameData.get(socket.roomID).message.GlobalName}`);

        // round finished

        if(gameData.get(socket.roomID).roundsLeft == 1) {
            // last round, so send players back to room page
            console.log("Game end!");
            io.to(socket.roomID).emit('gameEnd');
        }
        else {
            // start next round
            let randomMessage;
            do {
                randomMessage = messages[Math.floor(Math.random() * messages.length)];
            }
            while (!selectedChannels.has(randomMessage.ChannelID) || !selectedUsers.has(randomMessage.GlobalName));
            
            let newGame = {
                message: randomMessage,
                roundsLeft: gameData.get(socket.roomID).roundsLeft - 1
            }

            gameData.set(socket.roomID, newGame);

            // send startGame message to all users
            io.to(socket.roomID).emit('startGame', randomMessage.Message);
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
