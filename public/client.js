// client.js
const joinButton = document.getElementById('joinButton');
const roomIDInput = document.getElementById('roomID');
const usernameInput = document.getElementById('username');
const roomIDDisplay = document.getElementById('roomIDDisplay');
const usernameDisplay = document.getElementById('usernameDisplay');
const roomInfoDiv = document.getElementById('roomInfo');

// Event listener for join button
joinButton.addEventListener('click', () => {
    const roomID = roomIDInput.value.trim();
    const username = usernameInput.value.trim();

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
    // Hide join form and display room information
    roomIDDisplay.textContent = roomID;
    usernameDisplay.textContent = username;
    roomInfoDiv.style.display = 'block';

    console.log(`Joined Room: ${roomID}`);
    console.log(`Username: ${username}`);
});

socket.on('error', (error) => {
    console.error('Socket error:', error);
    alert('Error: ' + error);
});