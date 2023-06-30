// Socket.io connection
const socket = io();

let roomID = "none";
let username = "none";

// Event listener for join button
$('#joinButton').on('click', function () {
  roomID = $('#roomID').val();
  username = $('#username').val();
  console.log(roomID);
  // Emit join event to the server
  socket.emit('join', { roomID, username });
});

// Socket.io event listeners
socket.on('connect', () => {
  console.log('Connected to server');
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get('room');
  const name = urlParams.get('name');
  if (room)
    $('#roomID').val(room);
  if (name)
    $('#username').val(name);
});

socket.on('joined', (isHost) => {
  // Request filter data map from server and await for filterDataResponse message
  console.log(`isHost: ${isHost}`);
  socket.emit('getFilterData');
});

socket.on('filterDataResponse', (filterData) => {
  // save filter data
  const data = JSON.parse(filterData);
  const channels = new Map(JSON.parse(data.channels));
  console.log(channels);
  const usernames = new Map(JSON.parse(data.usernames));
  console.log(usernames);
  // update room page contents
  let i = 0;
  $('#roomInfoDisplay').text(`Room ID: ${roomID}, Username: ${username}`);
  // populate channel filter form with each channel
  channels.forEach((channelName, channelID) => {
    populateEntries('channel', channelID, channelName, `#col${i++ % 3}`);
  });

  // populate channel filter form with each channel
  usernames.forEach(({ displayName, nickname }, globalName) => {
    populateEntries('username', globalName, globalName, `#col${i++ % 3 + 3}`);
  });

  // switch to room page
  $('#joinContainer').hide();
  $('#roomContainer').show();
});

socket.on('startGame', (messageText) => {
  const regex = /\<\:[a-zA-Z0-9]+\:(\d+)\>/;
  let msg = messageText, emoji, emojiMap = new Map();
  while (emoji = regex.exec(msg)) {
    emojiMap.set(emoji.index, `https://cdn.discordapp.com/emojis/${emoji[1]}.png`);
    msg = msg.substring(0, emoji.index) + msg.substring(emoji.index + emoji[0].length);
  }
  
  $('#messageTextContainer').text("");
  
  let currentIndex = 0, msgText;
  for (let index of emojiMap.keys()) {
    msgText = msg.substring(currentIndex, index);
    if (msgText.length > 0) {
      $('#messageTextContainer').append($('<span>').addClass('msgText').text(msgText));
    }
    $('#messageTextContainer').append($('<span>').append($('<img>', {
      src: emojiMap.get(index),
      alt: emojiMap.get(index),
      class: 'emoji'
    })));
    currentIndex = ++index;
  }
  msgText = msg.substring(currentIndex);
  if (msgText.length > 0) {
    $('#messageTextContainer').append($('<span>').addClass('msgText').text(msgText));
  }
  // switch to game page
  $('#roomContainer').hide();
  $('#gameContainer').show();
  document.documentElement.scrollTop = document.documentElement.scrollHeight;
});

socket.on('gameEnd', () => {
  // switch to room page
  $('#gameContainer').hide();
  $('#roomContainer').show();
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
  alert('Error: ' + error);
});

// Event listener for start button
$('#startButton').on('click', function () {
  // Create sets for selected channels and users
  let selectedChannels = new Set();
  let selectedUsers = new Set();

  // Iterate over checked-checkboxes
  $('input[type="checkbox"]:checked').each(function () {
    if (this.name === "channel") {
      selectedChannels.add(this.value);
    } else {
      selectedUsers.add(this.value);
      $('#myOptions').append(`<option value="${this.value}">`);
    }
  });

  $("#answer").autocomplete({
    source: Array.from(selectedUsers)
  });

  const serializedData = {
    channels: JSON.stringify([...selectedChannels]),
    usernames: JSON.stringify([...selectedUsers]),
    numRounds: Math.max($('#numRoundsInput').val(), 1)
  };

  socket.emit('setupGame', JSON.stringify(serializedData));
});

// Event listener for answer button
$('#answerButton').on('click', function () {
  socket.emit('guessAnswer', $("#answer").val());
  console.log(`Submitting answer: ${$("#answer").val()}`);
  $("#answer").val('');
  return false;
});

function populateEntries(name, val, text, parent) {
  const entry = $("<div>", {
    class: "entryContainer",
    html: `<input type="checkbox" name="${name}" value="${val}" checked>${text}`
  });

  $(parent).append(entry);
}