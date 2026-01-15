#!/usr/bin/env node
/**
 * Test UI Grok Voice Integration
 * Simulates what the UI does when connecting to Grok Voice
 */

require('dotenv').config();
const WebSocket = require('ws');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3333';
const WS_URL = BASE_URL.replace(/^http/, 'ws');

console.log('🧪 Testing UI Grok Voice Integration\n');
console.log('='.repeat(60));
console.log(`Base URL: ${BASE_URL}`);
console.log(`WebSocket URL: ${WS_URL}`);
console.log('='.repeat(60));

// Test 1: Check health endpoint
async function testHealthEndpoint() {
  console.log('\n📋 Test 1: Health Endpoint');
  console.log('-'.repeat(60));
  
  return new Promise((resolve) => {
    const url = new URL(`${BASE_URL}/api/analyst/browser/voice-health`);
    const httpModule = url.protocol === 'https:' ? https : require('http');
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET'
    };

    const req = httpModule.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          console.log('✅ Health endpoint response:');
          console.log(`   Status: ${health.status}`);
          console.log(`   Grok Connected: ${health.grokConnected}`);
          console.log(`   WebSocket State: ${health.websocketState}`);
          console.log(`   API Key Configured: ${health.grokApiKeyConfigured}`);
          if (health.billingStatus) {
            console.log(`   Billing Status: ${health.billingStatus.status}`);
          }
          resolve(health);
        } catch (e) {
          console.log('⚠️  Response:', data.substring(0, 200));
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      resolve(null);
    });

    req.setTimeout(5000, () => {
      console.error('⏱️  Timeout');
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

// Test 2: WebSocket connection (what UI does)
async function testWebSocketConnection() {
  console.log('\n📋 Test 2: WebSocket Connection (UI Simulation)');
  console.log('-'.repeat(60));
  
  return new Promise((resolve) => {
    const wsUrl = `${WS_URL}/api/analyst/ws/grok-voice`;
    console.log(`🔌 Connecting to: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    let sessionConfigSent = false;
    let conversationCreated = false;
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      
      // Step 1: Send session config (what UI does)
      const sessionConfig = {
        type: 'session.update',
        session: {
          instructions: 'You are Ada, the Mach33 Assistant. You are a helpful voice assistant with a British accent. Respond naturally and conversationally, and identify yourself as Ada when appropriate.',
          voice: 'eve', // Ada uses Eve voice
          turn_detection: {
            type: 'server_vad'
          },
          audio: {
            input: {
              format: {
                type: 'audio/pcm',
                rate: 24000
              }
            },
            output: {
              format: {
                type: 'audio/pcm',
                rate: 24000
              }
            }
          }
        }
      };
      
      console.log('📤 Sending session config (Ada - Eve voice)...');
      ws.send(JSON.stringify(sessionConfig));
      sessionConfigSent = true;
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        const messageType = message.type;
        
        if (messageType === 'session.updated') {
          console.log('✅ Session updated');
          
          // Step 2: Create conversation (what UI does)
          if (!conversationCreated) {
            const createConversation = {
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: 'Hello, I am testing the UI connection. Are you Ada?'
                  }
                ]
              }
            };
            
            console.log('📤 Creating conversation...');
            ws.send(JSON.stringify(createConversation));
            conversationCreated = true;
          }
          
        } else if (messageType === 'conversation.created' || messageType === 'conversation.item.created') {
          console.log('✅ Conversation created');
          
          // Step 3: Request response (what UI does)
          const createResponse = {
            type: 'response.create',
            response: {
              modalities: ['text', 'audio'],
              instructions: 'Speak naturally and clearly.'
            }
          };
          
          console.log('📤 Requesting audio response...');
          ws.send(JSON.stringify(createResponse));
          
        } else if (messageType === 'response.output_audio.delta') {
          process.stdout.write('🎵');
          
        } else if (messageType === 'response.output_audio_transcript.delta') {
          process.stdout.write(message.delta || '');
          
        } else if (messageType === 'response.output_audio_transcript.done') {
          if (message.transcript) {
            console.log(`\n📝 Transcript: "${message.transcript}"`);
          }
          
        } else if (messageType === 'response.done') {
          console.log('\n✅ Response complete');
          console.log('✅ UI connection test successful!');
          ws.close();
          resolve(true);
          
        } else if (messageType === 'error') {
          console.error('\n❌ Error:', message.error || message);
          ws.close();
          resolve(false);
        }
        
      } catch (e) {
        // Binary data - ignore
      }
    });
    
    ws.on('error', (error) => {
      console.error('\n❌ WebSocket error:', error.message);
      resolve(false);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`\n🔌 WebSocket closed: ${code} - ${reason.toString()}`);
      if (!conversationCreated) {
        resolve(false);
      }
    });
    
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('\n⏱️  Timeout - closing connection');
        ws.close();
      }
      resolve(false);
    }, 30000);
  });
}

// Test 3: Socket.io connection (alternative UI method)
async function testSocketIOConnection() {
  console.log('\n📋 Test 3: Socket.io Connection (Alternative UI Method)');
  console.log('-'.repeat(60));
  
  try {
    const { io } = require('socket.io-client');
    
    const socketUrl = `${BASE_URL}/api/analyst/socket.io`;
    console.log(`🔌 Connecting to Socket.io: ${socketUrl}`);
    
    const socket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      timeout: 10000,
      reconnection: false
    });
    
    return new Promise((resolve) => {
      socket.on('connect', () => {
        console.log('✅ Socket.io connected');
        console.log(`   Socket ID: ${socket.id}`);
        
        // Emit grok-voice:connect (what UI does)
        socket.emit('grok-voice:connect', {
          sessionId: 'test-ui-session',
          voice: 'eve' // Ada
        });
        
        console.log('📤 Sent grok-voice:connect (Ada - Eve voice)');
      });
      
      socket.on('grok-voice:connected', (data) => {
        console.log('✅ Grok Voice connected via Socket.io');
        console.log(`   Session ID: ${data.sessionId}`);
        console.log(`   Voice: ${data.voice}`);
        
        // Send test text
        socket.emit('grok-voice:text', {
          sessionId: 'test-ui-session',
          text: 'Hello, are you Ada?'
        });
        
        console.log('📤 Sent test text message');
      });
      
      socket.on('grok-voice:audio', (data) => {
        process.stdout.write('🎵');
      });
      
      socket.on('grok-voice:transcript-delta', (data) => {
        process.stdout.write(data.transcript || '');
      });
      
      socket.on('grok-voice:transcript-complete', (data) => {
        console.log(`\n📝 Transcript: "${data.transcript}"`);
      });
      
      socket.on('grok-voice:response-complete', () => {
        console.log('\n✅ Response complete via Socket.io');
        socket.disconnect();
        resolve(true);
      });
      
      socket.on('grok-voice:error', (error) => {
        console.error('\n❌ Grok Voice error:', error);
        socket.disconnect();
        resolve(false);
      });
      
      socket.on('disconnect', () => {
        console.log('\n🔌 Socket.io disconnected');
      });
      
      setTimeout(() => {
        socket.disconnect();
        resolve(false);
      }, 30000);
    });
    
  } catch (error) {
    console.log('⚠️  Socket.io client not available (install: npm install socket.io-client)');
    console.log('   Skipping Socket.io test');
    return Promise.resolve(null);
  }
}

// Main test flow
async function runTests() {
  const health = await testHealthEndpoint();
  
  if (!health || !health.grokApiKeyConfigured) {
    console.log('\n❌ Health check failed or API key not configured');
    console.log('   Cannot proceed with WebSocket tests');
    return;
  }
  
  const wsResult = await testWebSocketConnection();
  const socketIOResult = await testSocketIOConnection();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Health Endpoint: ${health ? '✅' : '❌'}`);
  console.log(`WebSocket (Raw): ${wsResult ? '✅' : '❌'}`);
  console.log(`Socket.io: ${socketIOResult === null ? '⏭️  Skipped' : socketIOResult ? '✅' : '❌'}`);
  console.log('='.repeat(60));
  
  if (wsResult || socketIOResult) {
    console.log('\n✅ UI integration test PASSED');
    console.log('   The UI can successfully connect to Grok Voice');
  } else {
    console.log('\n❌ UI integration test FAILED');
    console.log('   Check server logs for errors');
  }
}

runTests().catch(console.error);

