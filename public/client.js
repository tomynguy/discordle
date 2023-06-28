// Socket.io connection
const socket = io();

// Event listener for join button
$('#joinButton').on('click', function() {
    const roomID = $('#roomID').val();
    const username = $('#username').val();
    console.log(roomID);
    // Emit join event to the server
    socket.emit('join', { roomID, username });
  });

// Socket.io event listeners
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('joined', ({ roomID, username }) => {
    // Request filter data map from server and await for filterDataResponse message
    socket.emit('getFilterData', roomID);
});

socket.on('filterDataResponse', (filterData) => {
    // save filter data
    const data = JSON.parse(filterData);
    const channels = new Map(JSON.parse(data.channels));
    console.log(channels);
    const usernames = new Map(JSON.parse(data.usernames));
    console.log(usernames);
    // update room page contents
    $('#roomInfoDisplay').text(`Room ID: ${$('#roomID').val()}, Username: ${$('#username').val()}`);

    // populate channel filter form with each channel
    channels.forEach((channelName, channelID) => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'channel';
        checkbox.value = channelID;
      
        const label = document.createElement('label');
        label.textContent = channelName;
        label.appendChild(checkbox);
      
        $('#channelFilter').append(label);
      });

    // populate channel filter form with each channel
    usernames.forEach(({displayName, nickname}, globalName) => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'username';
        checkbox.value = {globalName: globalName, displayName: displayName, nickname: nickname};
    
        const label = document.createElement('label');
        label.textContent = globalName;
        label.appendChild(checkbox);
    
        $('#userFilter').append(label);
    }); 
    
    // switch to room page
    $('#joinContainer').hide();
    $('#roomContainer').show();
});

socket.on('error', (error) => {
    console.error('Socket error:', error);
    alert('Error: ' + error);
});
