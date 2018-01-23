// Setup basic express server
const compression = require('compression');
const express = require('express');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const port = process.env.PORT || 8080;
const ip = process.env.IP || '127.0.0.1';
const gameManager = require('./server/gamemanager.js');
const qManager = require('./server/queuemanager.js');

// Setup the game queue and connection details
io.on('connection', (session) => {
  console.log('a user connected');

  // Store the username in the socket session for this client
  const username = makeid();
  session.username = username;

  // Add user to the queue
  qManager.addToQueue(session);

  session.on('disconnect', () => {
    console.log('user disconnected');
    qManager.removeFromQueue(session);
  });

  // Send user the username
  session.emit('login', session.username);
});


function makeid() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}


// Listen for server, and use static routing for deploy directory
server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

app.use(express.static('./deploy', {
  maxAge: 86400000,
}));
