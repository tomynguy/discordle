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
    const usernames = new Set(JSON.parse(data.usernames));

    // update room page contents
    $('#roomIDDisplay').text(`Room ID: ${$('#roomID').val()}`);
    $('#usernameDisplay').text(`Username: ${$('#username').val()}`);

    // populate filter form with each channel
    channels.forEach((channelName, channelID) => {
        console.log('adding checkbox');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'channel';
        checkbox.value = channelID;
    
        const label = document.createElement('label');
        label.textContent = channelName;
        label.appendChild(checkbox);
    
        $('#channelFilter').before(label);
    }); 
    
    // switch to room page
    $('#joinContainer').hide();
    $('#roomContainer').show();
});

socket.on('error', (error) => {
    console.error('Socket error:', error);
    alert('Error: ' + error);
});
