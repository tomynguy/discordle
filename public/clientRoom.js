const socket = io();

const startButton = document.getElementById('startButton');

// Add an onclick event listener to the button
startButton.addEventListener('click', function() {
  // Emit the 'balls' event using socket.io
  socket.emit('balls');
});

// Retrieve room ID and username from sessionStorage
const roomID = sessionStorage.getItem('roomID');
const username = sessionStorage.getItem('username');

// Update display components
document.getElementById('roomIDDisplay').textContent += roomID;
document.getElementById('usernameDisplay').textContent += username;

// Retrieve channel elements and data
const channels = new Map(JSON.parse(sessionStorage.getItem('channels')));
const channelFilterForm = document.getElementById('channelFilter');

// Iterate over channels and create checkbox for each
channels.forEach((channelName, channelID) => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'channel';
    checkbox.value = channelID;

    const label = document.createElement('label');
    label.textContent = channelName;
    label.appendChild(checkbox);

    channelFilterForm.insertBefore(label, channelFilterForm.lastElementChild);
});