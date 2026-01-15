#!/usr/bin/env node

/**
 * Full Grok Voice WebSocket Test
 * Tests: Server status → WebSocket proxy → Grok connection → Audio response
 */

require('dotenv').config();
const WebSocket = require('ws');
const http = require('http');

const SERVER_PORT = process.env.PORT || 3333;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const WS_URL = `ws://localhost:${SERVER_PORT}/api/analyst/ws/grok-voice`;

console.log('🧪 Grok Voice WebSocket Full Test');
console.log('=====================================\n');

// Step 1: Check if server is running
function checkServer() {
    return new Promise((resolve, reject) => {
        console.log(`1️⃣ Checking if server is running on port ${SERVER_PORT}...`);
        const req = http.get(`${SERVER_URL}/api/analyst/browser/voice-health`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const health = JSON.parse(data);
                    console.log('✅ Server is running');
                    console.log(`   Grok connected: ${health.grokConnected || false}`);
                    console.log(`   WebSocket state: ${health.websocketState || 'unknown'}`);
                    resolve(health);
                } catch (e) {
                    console.log('✅ Server is running (health check response received)');
                    resolve({});
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Server is NOT running!');
            console.error(`   Error: ${error.message}`);
            console.error(`\n💡 Please start the server first:`);
            console.error(`   node server.js`);
            reject(error);
        });
        
        req.setTimeout(3000, () => {
            req.destroy();
            console.error('❌ Server health check timeout');
            reject(new Error('Server timeout'));
        });
    });
}

// Step 2: Test WebSocket connection
function testWebSocket() {
    return new Promise((resolve, reject) => {
        console.log(`\n2️⃣ Testing WebSocket connection to: ${WS_URL}`);
        
        const ws = new WebSocket(WS_URL);
        let sessionReady = false;
        let receivedMessages = [];
        
        const timeout = setTimeout(() => {
            ws.close();
            console.error('\n❌ WebSocket test timeout (10 seconds)');
            console.log(`📋 Received ${receivedMessages.length} messages`);
            reject(new Error('WebSocket timeout'));
        }, 10000);
        
        ws.on('open', () => {
            console.log('✅ WebSocket connected');
            console.log('📤 Sending session configuration...');
            
            const sessionConfig = {
                type: 'session.update',
                session: {
                    instructions: "You are a helpful voice assistant.",
                    voice: "ara",
                    turn_detection: { type: "server_vad" },
                    audio: {
                        input: { format: { type: "audio/pcm", rate: 24000 } },
                        output: { format: { type: "audio/pcm", rate: 24000 } }
                    }
                }
            };
            
            ws.send(JSON.stringify(sessionConfig));
        });
        
        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                const msgType = msg.type || 'unknown';
                receivedMessages.push(msgType);
                
                console.log(`📨 Received: ${msgType}`);
                
                if (msgType === 'session.created' || msgType === 'session.updated') {
                    sessionReady = true;
                    console.log('✅ Session ready!');
                    clearTimeout(timeout);
                    ws.close();
                    resolve({ sessionReady: true, messages: receivedMessages });
                } else if (msgType === 'error') {
                    console.error('❌ Error from server:', JSON.stringify(msg, null, 2));
                    clearTimeout(timeout);
                    ws.close();
                    reject(new Error('Server returned error'));
                }
            } catch (e) {
                console.log('📨 Received binary/non-JSON message');
            }
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            clearTimeout(timeout);
            reject(error);
        });
        
        ws.on('close', (code, reason) => {
            if (code === 1006 && !sessionReady) {
                console.error(`❌ WebSocket closed abnormally: ${code}`);
                console.error('💡 This usually means:');
                console.error('   1. Server closed the connection');
                console.error('   2. Grok connection failed');
                console.error('   3. Check server logs for errors');
                clearTimeout(timeout);
                reject(new Error(`WebSocket closed: ${code}`));
            }
        });
    });
}

// Step 3: Test full conversation flow
function testFullFlow() {
    return new Promise((resolve, reject) => {
        console.log(`\n3️⃣ Testing full conversation flow...`);
        
        const ws = new WebSocket(WS_URL);
        let sessionReady = false;
        let conversationSent = false;
        let responseReceived = false;
        let audioChunks = 0;
        
        const timeout = setTimeout(() => {
            ws.close();
            console.error('\n❌ Full flow test timeout (30 seconds)');
            console.log(`   Session ready: ${sessionReady}`);
            console.log(`   Conversation sent: ${conversationSent}`);
            console.log(`   Response received: ${responseReceived}`);
            console.log(`   Audio chunks: ${audioChunks}`);
            reject(new Error('Full flow timeout'));
        }, 30000);
        
        ws.on('open', () => {
            const sessionConfig = {
                type: 'session.update',
                session: {
                    voice: "ara",
                    turn_detection: { type: "server_vad" },
                    audio: {
                        input: { format: { type: "audio/pcm", rate: 24000 } },
                        output: { format: { type: "audio/pcm", rate: 24000 } }
                    }
                }
            };
            ws.send(JSON.stringify(sessionConfig));
        });
        
        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                const msgType = msg.type || 'unknown';
                
                if (msgType === 'session.created' || msgType === 'session.updated') {
                    sessionReady = true;
                    console.log('✅ Session ready');
                    
                    if (!conversationSent) {
                        conversationSent = true;
                        console.log('📤 Sending text message...');
                        const conversationItem = {
                            type: 'conversation.item.create',
                            item: {
                                type: 'message',
                                role: 'user',
                                content: [{ type: 'input_text', text: 'Say hello in one sentence.' }]
                            }
                        };
                        ws.send(JSON.stringify(conversationItem));
                        
                        setTimeout(() => {
                            console.log('📤 Requesting audio response...');
                            const responseRequest = {
                                type: 'response.create',
                                response: { modalities: ['audio', 'text'] }
                            };
                            ws.send(JSON.stringify(responseRequest));
                        }, 500);
                    }
                } else if (msgType === 'response.output_audio.delta' || msgType === 'response.audio.delta') {
                    audioChunks++;
                    if (audioChunks === 1) {
                        console.log('🎵 Audio chunks starting...');
                    }
                } else if (msgType === 'response.done') {
                    responseReceived = true;
                    console.log(`✅ Response complete (${audioChunks} audio chunks)`);
                    clearTimeout(timeout);
                    ws.close();
                    resolve({ success: true, audioChunks });
                } else if (msgType === 'error') {
                    console.error('❌ Error:', JSON.stringify(msg, null, 2));
                    clearTimeout(timeout);
                    ws.close();
                    reject(new Error('Grok returned error'));
                }
            } catch (e) {
                // Binary message
            }
        });
        
        ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        
        ws.on('close', (code) => {
            if (code !== 1000 && !responseReceived) {
                clearTimeout(timeout);
                reject(new Error(`Connection closed: ${code}`));
            }
        });
    });
}

// Run all tests
async function runTests() {
    try {
        await checkServer();
        await testWebSocket();
        await testFullFlow();
        
        console.log('\n✅✅✅ ALL TESTS PASSED ✅✅✅');
        console.log('🎉 Grok Voice WebSocket is working correctly!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌❌❌ TESTS FAILED ❌❌❌');
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

runTests();











