const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const fs = require('fs');
const csv = require('csv-parser')

// ['guild', 'guildID', 'channel', 'channelID', 'author.globalName', 'author.displayName', 'author.nickname', 'message', 'attachments']

let rooms = new Map();
module.exports = {
    randRoom: randRoom
};

app.use(express.static('public'));

app.use(express.json());

app.post('/create-room', (req, res) => {
  const roomID = req.body.roomID;

  // Create a room using the received room ID
  // Add any additional logic here based on your requirements

  // Emit the room ID to connected clients
  io.emit('room-created', roomID);

  res.sendStatus(200);
});

function randRoom(file, recurse = 0) {
    let room = "Room";
    for (let i = 0; i < (5 + recurse / 5); i++) room += Math.floor(Math.random() * 10);
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

server.listen(3000, () => {
  console.log('Server running on port 3000');
});