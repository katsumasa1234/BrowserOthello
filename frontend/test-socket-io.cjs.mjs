#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { io } = require('./node_modules/socket.io-client/dist/socket.io.js');

console.log('=== Socket.IO Room Creation Test ===');

async function test() {
  const socket = io('http://localhost:5000', { transports: ['websocket', 'polling'] });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log('✅ Connected:', socket.id);
      resolve();
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log('📤 Emitting create-room event...');

  const roomCreated = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('room-created timeout')), 5000);
    socket.once('room-created', (data) => {
      clearTimeout(timeout);
      resolve(data);
    });
    socket.once('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(err.message || 'error event'));
    });
  });

  socket.emit('create-room', { playerName: 'TestPlayer' });

  const data = await roomCreated;
  console.log('✅ room-created received:', JSON.stringify(data));
  console.log('🎉 Test PASSED!');

  socket.disconnect();
  process.exit(0);
}

test().catch((err) => {
  console.error('❌ Test FAILED:', err.message);
  process.exit(1);
});
