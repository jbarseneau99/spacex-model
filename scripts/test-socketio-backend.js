/**
 * Test Socket.io Backend Connection
 * Tests if Socket.io server is working correctly from backend
 */

const io = require('socket.io-client');

const SOCKET_URL = 'http://localhost:3333';
const SOCKET_PATH = '/api/analyst/socket.io';

console.log('🧪 Testing Socket.io Backend Connection...');
console.log(`   URL: ${SOCKET_URL}`);
console.log(`   Path: ${SOCKET_PATH}`);

const socket = io(SOCKET_URL, {
  path: SOCKET_PATH,
  transports: ['polling', 'websocket'],
  reconnection: false,
  timeout: 5000
});

socket.on('connect', () => {
  console.log('✅ Socket.io connected successfully!');
  console.log(`   Socket ID: ${socket.id}`);
  
  // Test sending a message
  console.log('📤 Testing grok-voice:connect event...');
  socket.emit('grok-voice:connect', {
    sessionId: 'test-session-' + Date.now(),
    voice: 'eve'
  });
});

socket.on('grok-voice:connected', (data) => {
  console.log('✅ Received grok-voice:connected:', data);
  console.log('✅ Socket.io backend test PASSED');
  socket.disconnect();
  process.exit(0);
});

socket.on('grok-voice:error', (error) => {
  console.error('❌ Received grok-voice:error:', error);
  socket.disconnect();
  process.exit(1);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.error('   Error type:', error.type);
  console.error('   Error details:', error);
  socket.disconnect();
  process.exit(1);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
  socket.disconnect();
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

// Timeout after 10 seconds
setTimeout(() => {
  if (socket.connected) {
    console.log('⏱️ Test timeout - connection still open');
    socket.disconnect();
    process.exit(0);
  } else {
    console.error('❌ Test timeout - connection failed');
    process.exit(1);
  }
}, 10000);






