// Socket.io connection
const socket = io();

let roomID = "none";
let username = "none";
let host = false;

// Event listeners
$('#joinButton').on('click', function () {
  roomID = $('#roomID').val();
  username = $('#username').val();
  console.log(roomID);
  // Emit join event to the server
  socket.emit('join', { roomID, username });
});

$('#roomID').on('keydown', function(event) {
  if (event.key === 'Enter') {
    $('#username')[0].focus();
  }
});

$('#username').on('keydown', function(event) {
  if (event.key === 'Enter') {
    $('#joinButton').trigger('click');
  }
});

$('#answer').on('keydown', function(event) {
  if (event.key === 'Enter') {
    $('#answerButton').trigger('click');
  }
});

// Update client checkboxes to match host
$('#selectAllChannelsCheckbox').on('click', function () {
  // Get current state of select all checkbox
  const isChecked = this.checked;

  // Iterate over channel checkboxes
  $('input[type="checkbox"][name="channel"]').each(function () {
    $(this).prop('checked', isChecked);
    const checkboxId = $(this).attr('id');
    socket.emit('clickCheckbox', checkboxId, isChecked);
  });
});

// Update client checkboxes to match host
$('#selectAllUsersCheckbox').on('click', function () {
  // Get current state of select all checkbox
  const isChecked = this.checked;

  // Iterate over channel checkboxes
  $('input[type="checkbox"][name="username"]').each(function () {
    $(this).prop('checked', isChecked);
    const checkboxId = $(this).attr('id');
    socket.emit('clickCheckbox', checkboxId, isChecked);
  });
});

// Update client input-boxes to match host
$('.genSettings').on('input', 'input', function() {
  socket.emit('changeInput', this.id, this.value);
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
  host = isHost; 
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
  $('#roomInfoDisplay').text(`Room ID: ${roomID}`);
  // populate channel filter form with each channel
  channels.forEach((channelName, channelID) => {
    populateEntries(i, 'channel', channelID, channelName, `#col${i++ % 3}`);
  });

  // populate channel filter form with each channel
  usernames.forEach(({ displayName, nickname }, globalName) => {
    populateEntries(i, 'username', globalName, globalName, `#col${i++ % 3 + 3}`);
  });

  // Visually disable settings for non-hosts.
  if (!host) {
    $('#settingsPanel').addClass('block');
    $('#startButton').addClass('block');
  }

  // switch to room page
  $('#joinContainer').hide();

  $('#mainContainer').css('display', 'grid');
  $('#roomContainer').show();
  $('#playerList').show();
});

socket.on('startGame', (messageText) => {
  const regex = /\<\:[a-zA-Z0-9]+\:(\d+)\>|https:\/\/cdn\.discordapp\.com\/attachments\/\d+\/\d+\/[\w-]+\.(mp4|mov|avi|flv|wmv)|https?:\/\/(?:cdn|media)\.discordapp\.com\/attachments\/\d+\/\d+\/[\w-]+\.(png|jpg|jpeg|gif)|https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
  let msg = messageText, attachment, emojis = [], media = [];
  // Parse message of emojis and video/image links
  while (attachment = regex.exec(msg)) {
    if (attachment[1]) {
      emojis.push([attachment.index, 'emoji', `https://cdn.discordapp.com/emojis/${attachment[1]}.png`]);
    } else if (attachment[2]) {
      media.push(['discordVid', attachment[0]]);
    } else if (attachment[3]) {
      console.log("balls");
      media.push(['discordImg', attachment[0]]);
    } else if (attachment[4]) {
      console.log("Youtube!")
    }
    msg = msg.substring(0, attachment.index) + msg.substring(attachment.index + attachment[0].length);
  }

  $('#messageTextContainer').text("");
  
  let index = 0, msgText;
  // Insert text->emoji->text->...->emoji
  for (attachment of emojis) {
    // Insert text before emoji
    msgText = msg.substring(index, attachment[0]);
    if (msgText.length > 0) {
      $('#messageTextContainer').append($('<span>').addClass('msgText').text(msgText));
    }
    // Insert emoji
    if (attachment[1] == 'emoji') {
      $('#messageTextContainer').append($('<span>').append($('<img>', {
        src: attachment[2],
        alt: attachment[2],
        class: 'emoji'
      })));
    }

    // Update index to start of next text segment
    index = attachment[0] + 1;
  }

  // Insert remaining text after last emoji
  msgText = msg.substring(index);
  if (msgText.length > 0) {
    $('#messageTextContainer').append($('<span>').addClass('msgText').text(msgText));
  }

  // Add autocomplete to input
  $("#answer").autocomplete({
    source: $('input[type="checkbox"]:checked').map(function() {return this.value;}).toArray()
  });

  // Append media to the end of the message
  for (attachment of media) {
    if (attachment[0] == 'discordVid') {
      $('#messageTextContainer').append($('<span>', { class: 'mediaContainer' }).append($('<video>', {
        controls: true,
        src: attachment[1],
        alt: attachment[1],
        type: 'video/mp4',
        class: 'media'
      })));
    } else if (attachment[0] == 'discordImg') {
      $('#messageTextContainer').append($('<span>', { class: 'mediaContainer' }).append($('<img>', {
        src: attachment[1],
        alt: attachment[1],
        class: 'media'
      })));
    }
  }

  // switch to game page
  $('#roomContainer').hide();
  $('#response').hide();
  $('#userEntry').removeClass('block');
  $('#answer').val("");
  $('#gameContainer').show();
  $('#answer')[0].focus();
  $('#msgPFP').attr('src', 'discordPFP.png');
  $('#msgName').text('Discord User');
  document.documentElement.scrollTop = document.documentElement.scrollHeight;
});

socket.on('gameEnd', () => {
  // switch to room page
  $('#gameContainer').hide();
  $('#roomContainer').show();
});

socket.on('playerListResponse', (playerListData) => {
  console.log('updating player list');

  // parse player list data
  let playerList = new Map(JSON.parse(playerListData));

  let sortedPlayers = Array.from(playerList, ([username, playerData]) => ({ username, score: playerData.score, isHost: playerData.isHost }));
  sortedPlayers.sort((a,b) => b.score - a.score);

  // clear tables
  $('#playerTable tbody').empty();

  // populate player list table with usernames
  sortedPlayers.forEach((player) => {
    const isHostElement = player.isHost ? 'yellow-text' : '';
  $('#playerTable tbody').append(`<tr><td class="username ${isHostElement}">${player.username}</td><td class="score">${player.score}</td></tr>`);
  });
});

socket.on('roundTimerUpdate', (remainingTime) => {
  $('#roundTimerDisplay').text(remainingTime);
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

  const serializedData = {
    channels: JSON.stringify([...selectedChannels]),
    usernames: JSON.stringify([...selectedUsers]),
    numRounds: Math.max($('#numRoundsInput').val(), 1),
    minMsg: Math.max($('#minMsgInput').val(), 1),
    roundDuration: Math.max($('#roundDurationInput').val(), 1)
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

// Helper function to setup checkboxes for settings.
function populateEntries(id, name, val, text, parent) {
  const entry = $("<div>", {
    class: "entryContainer",
    html: `<input type="checkbox" id="checkbox${id}" name="${name}" value="${val}" checked>${text}`
  });

  entry.find('input[type="checkbox"]').on('click', function() {
    const checkboxId = $(this).attr('id');
    const checkboxState = $(this).is(':checked');
    socket.emit('clickCheckbox', checkboxId, checkboxState );
  });

  $(parent).append(entry);
}

// Update client checkbox to match host
socket.on('updateCheckbox', (id, state) => {
  $(`#${id}`).prop('checked', state);
});

// Update client input-box to match host
socket.on('updateInput', (id, value) => {
  $(`#${id}`).val(value);
});

// Modify HTML to stop input and setup for next round
socket.on('roundTransition', (message, userAvatar, username) => {
  $('#msgPFP').attr('src', userAvatar);
  $('#msgName').text(username);
  $('#userEntry').addClass('block');
  $('#answer').trigger('blur');
  $('#answerButton').trigger('blur');
  $('#responseMessageTextContainer').text(message);
  $('#response').show();
  document.documentElement.scrollTop = document.documentElement.scrollHeight;
});

// Remove settings wall for newhost
socket.on('newHost', () => {
  $('#settingsPanel').removeClass('block');
  $('#startButton').removeClass('block');
});