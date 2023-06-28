// Socket.io connection
const socket = io();

let roomID = -1;
let username = "none";

// Event listener for join button
$('#joinButton').on('click', function() {
    roomID = $('#roomID').val();
    username = $('#username').val();
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
    $('#roomInfoDisplay').text(`Room ID: ${roomID}, Username: ${username}`);

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
        checkbox.value = globalName;
    
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

// Event listener for start button
$('#startButton').on('click', function() {
    // Create sets for selected channels and users
    let selectedChannels = new Set();
    let selectedUsers = new Set();
  
    // Iterate over checkboxes in the channel filter
    $('#channelFilter input[type="checkbox"]').each(function() {
      if ($(this).is(':checked')) {
        selectedChannels.add($(this).val());
      }
    });
  
    // Iterate over checkboxes in the user filter
    $('#userFilter input[type="checkbox"]').each(function() {
      if ($(this).is(':checked')) {
        selectedUsers.add($(this).val());
      }
    });
  
    console.log('Selected channels:', selectedChannels);
    console.log('Selected users:', selectedUsers);

    const serializedData = {
        channels: JSON.stringify(selectedChannels), 
        usernames: JSON.stringify(selectedUsers)
    };

    socket.emit('setupGame', roomID, JSON.stringify(serializedData));
  });