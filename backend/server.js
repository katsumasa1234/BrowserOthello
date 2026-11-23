import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import RoomManager from './services/RoomManager.js';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const roomManager = new RoomManager(io);

// API endpoint for testing socket connection
app.get('/api/test-socket', (req, res) => {
  res.json({ status: 'ok', connectedClients: io.engine.clientsCount });
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Create a room (host)
  socket.on('create-room', ({ playerName }) => {
    roomManager.createRoom(socket, playerName);
  });

  // Join an existing room
  socket.on('join-room', ({ roomCode, playerName }) => {
    roomManager.joinRoom(socket, roomCode, playerName);
  });

  // Accept a game invitation (host)
  socket.on('accept-game', ({ roomCode }) => {
    roomManager.acceptGame(socket, roomCode);
  });

  // Place a stone
  socket.on('place-stone', ({ roomId, move }) => {
    roomManager.placeStone(socket, roomId, move);
  });

  // Leave room
  socket.on('leave-room', () => {
    roomManager.leaveRoom(socket);
  });

  // Request available rooms for matchmaking
  socket.on('find-opponent', ({ playerName }) => {
    roomManager.findOpponent(socket, playerName);
  });

  // Cancel matchmaking
  socket.on('cancel-matchmaking', () => {
    roomManager.removeFromQueue(socket);
    socket.emit('error', { message: 'マッチングをキャンセルしました' });
  });

  // Disconnect
  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket);
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
