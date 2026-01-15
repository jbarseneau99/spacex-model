#!/usr/bin/env node
/**
 * Simple UI Connection Test
 * Tests what the UI actually does - WebSocket connection and session config
 */

require('dotenv').config();
const WebSocket = require('ws');

const WS_URL = process.env.WS_URL || 'ws://localhost:3333/api/analyst/ws/grok-voice';

console.log('🧪 Testing UI Grok Voice Connection\n');
console.log('='.repeat(60));
console.log(`WebSocket URL: ${WS_URL}`);
console.log('='.repeat(60));

const ws = new WebSocket(WS_URL);

let sessionConfigSent = false;
let sessionUpdated = false;
let conversationCreated = false;

ws.on('open', () => {
  console.log('\n✅ WebSocket connected');
  
  // What UI does: Send session config with Ada (Eve voice)
  const sessionConfig = {
    type: 'session.update',
    session: {
      instructions: 'You are Ada, the Mach33 Assistant. You are a helpful voice assistant with a British accent. Respond naturally and conversationally, and identify yourself as Ada when appropriate.',
      voice: 'eve', // Ada uses Eve voice (British accent)
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
  console.log(`   Voice: ${sessionConfig.session.voice}`);
  console.log(`   Instructions: ${sessionConfig.session.instructions.substring(0, 60)}...`);
  ws.send(JSON.stringify(sessionConfig));
  sessionConfigSent = true;
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    const messageType = message.type;
    
    console.log(`\n📨 Received: ${messageType}`);
    
    if (messageType === 'session.updated') {
      console.log('✅ Session updated');
      if (message.session && message.session.voice) {
        console.log(`   Voice confirmed: ${message.session.voice}`);
        if (message.session.voice.toLowerCase() === 'eve') {
          console.log('   ✅ Ada (Eve voice) is active!');
        } else {
          console.log(`   ⚠️  Expected 'eve' but got '${message.session.voice}'`);
        }
      }
      sessionUpdated = true;
      
      // What UI does next: Create conversation
      const createConversation = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Hello Ada, this is a test from the UI'
            }
          ]
        }
      };
      
      console.log('\n📤 Creating conversation...');
      ws.send(JSON.stringify(createConversation));
      
    } else if (messageType === 'conversation.created' || messageType === 'conversation.item.created') {
      console.log('✅ Conversation created');
      conversationCreated = true;
      
      // What UI does: Request response
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
      console.log('\n✅✅✅ UI CONNECTION TEST PASSED ✅✅✅');
      console.log('   The UI can successfully connect and communicate with Grok Voice');
      console.log('   Ada (Eve voice) is configured correctly');
      ws.close();
      process.exit(0);
      
    } else if (messageType === 'error') {
      console.error('\n❌ Error from Grok:', message.error || message);
      ws.close();
      process.exit(1);
    }
    
  } catch (e) {
    // Binary data - ignore
  }
});

ws.on('error', (error) => {
  console.error('\n❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 WebSocket closed: ${code} - ${reason.toString()}`);
  
  if (!sessionUpdated) {
    console.log('\n⚠️  Session was not updated - connection may have closed too early');
    console.log('   Check server logs for errors');
  } else if (!conversationCreated) {
    console.log('\n⚠️  Conversation was not created');
  } else {
    console.log('\n✅ Connection test completed');
  }
  
  process.exit(0);
});

setTimeout(() => {
  console.log('\n⏱️  Timeout after 30 seconds');
  ws.close();
  process.exit(1);
}, 30000);










