#!/usr/bin/env node

/**
 * Simple test to check if server WebSocket proxy is working
 */

const WebSocket = require('ws');

const proxyUrl = 'ws://localhost:3333/api/analyst/ws/grok-voice';

console.log('🧪 Testing Server WebSocket Proxy');
console.log(`🔌 Connecting to: ${proxyUrl}`);
console.log('');

const ws = new WebSocket(proxyUrl);

ws.on('open', () => {
    console.log('✅ Connected to server proxy');
    console.log('📤 Sending test message...');
    
    const testMsg = {
        type: 'session.update',
        session: {
            voice: 'ara'
        }
    };
    
    ws.send(JSON.stringify(testMsg));
    console.log('✅ Test message sent');
});

ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data.toString());
        console.log('📨 Received:', msg.type || 'unknown');
        console.log('📋 Full message:', JSON.stringify(msg, null, 2));
    } catch (e) {
        console.log('📨 Received binary/non-JSON:', data.toString().substring(0, 100));
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    console.error('❌ Error details:', error);
});

ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket closed: ${code} - ${reason.toString()}`);
    if (code === 1006) {
        console.error('❌ Abnormal closure (1006) - Server may have closed connection');
        console.error('💡 Check server logs for errors');
    }
    process.exit(code === 1000 ? 0 : 1);
});

setTimeout(() => {
    console.log('⏱️  Test timeout (5 seconds)');
    ws.close();
    process.exit(1);
}, 5000);


