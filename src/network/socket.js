import * as io from 'socket.io-client';

const socket = io();
const server = {};

// Whenever the server emits 'login', log the login message
socket.on('login', (data) => {
  server.connected = true;
  // Display the welcome message
  const message = `Connected To Game Server as user: ${data}`;
  server.userName = data;
  console.log(message);
});


// Whenever the server emits 'user joined', log it in the chat body
socket.on('user joined', (data) => {
  console.log(`${data.username} joined`);
  // addParticipantsMessage(data);
});

// Whenever the server emits 'user left', log it in the chat body
socket.on('user left', (data) => {
  console.log(`${data.username} left`);
  // addParticipantsMessage(data);
  // removeChatTyping(data);
});

// Whenever the server emits 'typing', show the typing message
socket.on('typing', (data) => {
  // addChatTyping(data);
});

// Whenever the server emits 'stop typing', kill the typing message
socket.on('stop typing', (data) => {
  // removeChatTyping(data);
});

// Sends a chat message
function sendMessage() {
  // var message = $inputMessage.val();
  // Prevent markup from being injected into the message
  // message = cleanInput(message);
  // if there is a non-empty message and a socket connection
  // if (message && connected) {
  //  $inputMessage.val('');
  //  addChatMessage({
  //    username: username,
  //    message: message
  //  });
  // tell server to execute 'new message' and send along one parameter
  //  socket.emit('new message', message);
  //  }
}
