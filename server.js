// server.js
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const fs = require('fs');
const csv = require('csv-parser');

const PORT = 3000;

// map from room -> parsed message data
let roomMessageData = new Map();
// map from room -> map about components of the parsed data (i.e. channels names/ids, usernames), keys: "channels", "users"
let roomFilterData = new Map();
// map from room -> {components of room (message, roundsLeft, inGame)}
let roomData = new Map();

module.exports = {
    createRoom: createRoom,
    PORT: PORT
};

app.use(express.static('public'));

app.use(express.json());

async function createRoom(file, recurse = 0) {
    let room = 'room';
    for (let i = 0; i < 5 + recurse / 5; i++) room += Math.floor(Math.random() * 10);
    if (roomMessageData.has(room)) room = createRoom(file, recurse + 1);
    else {
        // Valid room ID, so create and set up room
        const messageData = await parseMessageData(file);
        roomMessageData.set(room, messageData);
        roomFilterData.set(room, getFilterData(room));
        roomData.set(room, {
            message: null,
            roundsLeft: 1,
            inGame: false,
            playerList: new Set(),
            selectedChannels: null,
            selectedUsers: null,
        });
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
    let data = roomMessageData.get(roomID);

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
        if (!roomData.has(roomID)) {
            socket.emit('error', 'Room not found');
        } else if (roomData.get(roomID).playerList.has(username)) {
            socket.emit('error', 'Username taken');
        } else if (username === '') {
            socket.emit('error', 'Invalid username');
        } else {
            socket.roomID = roomID;
            socket.username = username;
            socket.join(roomID);
            roomData.get(roomID).playerList.add(username);

            // if there's not a host yet, make them new host
            socket.isHost = (roomData.get(roomID).playerList.size == 1);

            socket.emit('joined', socket.isHost);

            // update clients on player list
            io.to(socket.roomID).emit('playerListResponse', JSON.stringify([...roomData.get(socket.roomID).playerList]));
        }
    });

    // Updates rooms upon client disconnection
    socket.on('disconnect', () => {
        console.log('Client Disconnected');
        let room = roomData.get(socket.roomID);
        if (room) {
            room.playerList.delete(socket.username);
            // Delete room and update maps if all users leave.
            if (room.playerList.size == 0) {
                [roomMessageData, roomFilterData, roomData].forEach(map => map.delete(socket.roomID));
                return;
            }
            // Assign a new host 
            else if (socket.isHost) {
                let socketRoom = io.sockets.adapter.rooms.get(socket.roomID);
                if (socketRoom) {
                    for (const socketID of socketRoom) {
                        const socketInRoom = io.sockets.sockets.get(socketID);
                        socketInRoom.isHost = true;
                        break;
                    }
                }
            }

            // update clients on player list
            io.to(socket.roomID).emit('playerListResponse', JSON.stringify([...roomData.get(socket.roomID).playerList]));
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

    socket.on('setupGame', (settings) => {
        // ignore non-host requests
        if(!socket.isHost) {
            socket.emit('error', 'Only the host can start the game');
            return;
        }

        const data = JSON.parse(settings);
        roomData.get(socket.roomID).selectedChannels = new Set(JSON.parse(data.channels));
        roomData.get(socket.roomID).selectedUsers = new Set(JSON.parse(data.usernames));

        // select random message that fits these filters
        const messages = roomMessageData.get(socket.roomID);
        let randomMessage;
        do {
            randomMessage = messages[Math.floor(Math.random() * messages.length)];
        }
        while (!roomData.get(socket.roomID).selectedChannels.has(randomMessage.ChannelID) || !roomData.get(socket.roomID).selectedUsers.has(randomMessage.GlobalName));

        roomData.get(socket.roomID).message = randomMessage;
        roomData.get(socket.roomID).roundsLeft = data.numRounds;
        roomData.get(socket.roomID).inGame = true;

        // send startGame message to all users
        io.to(socket.roomID).emit('startGame', randomMessage.Message);
    });

    socket.on('guessAnswer', (guess) => {
        if(guess.toLowerCase() != roomData.get(socket.roomID).message.GlobalName.toLowerCase() && guess.toLowerCase() != "balls") {
            console.log(`${socket.username}'s guess was wrong!`);
            return;
        }

        console.log(`Answer was: ${roomData.get(socket.roomID).message.GlobalName}`);
        
        // round finished

        if(roomData.get(socket.roomID).roundsLeft == 1) {
            // last round, so send players back to room page
            console.log("Game end!");
            roomData.get(socket.roomID).inGame = false;
            io.to(socket.roomID).emit('gameEnd');
        }
        else {
            const messages = roomMessageData.get(socket.roomID);

            // start next round
            let randomMessage;
            do {
                randomMessage = messages[Math.floor(Math.random() * messages.length)];
            }
            while (!roomData.get(socket.roomID).selectedChannels.has(randomMessage.ChannelID) || !roomData.get(socket.roomID).selectedUsers.has(randomMessage.GlobalName));

            roomData.get(socket.roomID).message = randomMessage;
            roomData.get(socket.roomID).roundsLeft = roomData.get(socket.roomID).roundsLeft - 1;

            // send startGame message to all users
            io.to(socket.roomID).emit('startGame', randomMessage.Message);
        }
    });

    socket.on('playerListRequest', () => {
        socket.emit('playerListResponse', JSON.stringify([...roomData.get(socket.roomID).playerList]));
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
