// client.js
const joinButton = document.getElementById('joinButton');
const roomIDInput = document.getElementById('roomID');
const usernameInput = document.getElementById('username');
const roomIDDisplay = document.getElementById('roomIDDisplay');
const usernameDisplay = document.getElementById('usernameDisplay');
const roomInfoDiv = document.getElementById('roomInfo');

// Event listener for join button
joinButton.addEventListener('click', () => {
    const roomID = roomIDInput.value;
    const username = usernameInput.value;

    // Validate input
    if (roomID === '' || username === '') {
        alert('Please enter a valid Room ID and Username.');
        return;
    }

    // Emit join event to the server
    socket.emit('join', { roomID, username });
});

// Socket.io connection
const socket = io();

// Socket.io event listeners
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('joined', ({ roomID, username }) => {
    // Save roomID and username
    sessionStorage.setItem('roomID', roomID);
    sessionStorage.setItem('username', username);

    // Request filter data map from server and await for filterDataResponse message
    socket.emit('getFilterData', roomID);
});

socket.on('filterDataResponse', (filterData) => {
    // save filter data
    const data = JSON.parse(filterData);
    console.log(data);
    sessionStorage.setItem('channels', data.channels);
    sessionStorage.setItem('usernames', data.usernames);

    // redirect to room page
    window.location.href = 'room.html';
});

socket.on('error', (error) => {
    console.error('Socket error:', error);
    alert('Error: ' + error);
});
