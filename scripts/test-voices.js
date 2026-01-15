#!/usr/bin/env node
/**
 * Test Different Grok Voice Voices
 * Tests all available voices including Eve (British accent)
 */

require('dotenv').config();
const WebSocket = require('ws');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
const VOICE = process.argv[2] || 'eve'; // Default to Eve (British accent)
const TEXT = process.argv[3] || 'Hello, this is a test of the voice system';

if (!GROK_API_KEY) {
  console.error('❌ GROK_API_KEY or XAI_API_KEY not set');
  process.exit(1);
}

const VOICES = {
  ara: { name: 'Ara', description: 'Female, warm, friendly (default)' },
  rex: { name: 'Rex', description: 'Male, confident, clear' },
  sal: { name: 'Sal', description: 'Male, energetic' },
  eve: { name: 'Eve', description: 'Female, British accent, rich emotional expression' },
  leo: { name: 'Leo', description: 'Male, calm' }
};

if (!VOICES[VOICE]) {
  console.error(`❌ Unknown voice: ${VOICE}`);
  console.log('\nAvailable voices:');
  Object.entries(VOICES).forEach(([key, info]) => {
    console.log(`  ${key.padEnd(5)} - ${info.name}: ${info.description}`);
  });
  process.exit(1);
}

console.log(`🎤 Testing Voice: ${VOICES[VOICE].name}`);
console.log(`📝 Description: ${VOICES[VOICE].description}`);
console.log(`💬 Text: "${TEXT}"\n`);
console.log('='.repeat(60));

let audioChunks = [];

const ws = new WebSocket('wss://api.x.ai/v1/realtime', {
  headers: {
    'Authorization': `Bearer ${GROK_API_KEY}`
  }
});

ws.on('open', () => {
  console.log('✅ Connected to Grok Voice API');
  
  const sessionConfig = {
    type: 'session.update',
    session: {
      modalities: ['text', 'audio'],
      instructions: 'Speak naturally and clearly.',
      voice: VOICE,
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      }
    }
  };
  
  ws.send(JSON.stringify(sessionConfig));
  console.log(`📤 Session configured with voice: ${VOICE}`);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    const messageType = message.type;
    
    if (messageType === 'session.updated') {
      const createConversation = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: TEXT }]
        }
      };
      ws.send(JSON.stringify(createConversation));
      console.log(`📤 Sending text...`);
      
    } else if (messageType === 'conversation.created' || messageType === 'conversation.item.created') {
      const createResponse = {
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: 'Speak naturally and clearly.'
        }
      };
      ws.send(JSON.stringify(createResponse));
      
    } else if (messageType === 'response.output_audio.delta') {
      if (message.delta) {
        audioChunks.push(message.delta);
        process.stdout.write('🎵');
      }
      
    } else if (messageType === 'response.output_audio_transcript.delta') {
      if (message.delta) {
        process.stdout.write(message.delta);
      }
      
    } else if (messageType === 'response.output_audio_transcript.done') {
      if (message.transcript) {
        console.log(`\n📝 Transcript: "${message.transcript}"`);
      }
      
    } else if (messageType === 'response.done') {
      console.log(`\n✅ Audio response complete (${audioChunks.length} chunks)`);
      
      if (audioChunks.length > 0) {
        playAudio(audioChunks, VOICE);
      } else {
        console.log('⚠️  No audio received');
        ws.close();
        process.exit(1);
      }
      
    } else if (messageType === 'error') {
      console.error('\n❌ Error:', message.error || message);
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

function playAudio(chunks, voiceName) {
  console.log('\n🔊 Processing audio...');
  
  try {
    const audioBuffers = chunks.map(chunk => Buffer.from(chunk, 'base64'));
    const combinedAudio = Buffer.concat(audioBuffers);
    
    const sampleRate = 24000;
    const channels = 1;
    const bitsPerSample = 16;
    const dataSize = combinedAudio.length;
    const fileSize = 36 + dataSize;
    
    const wavHeader = Buffer.alloc(44);
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(fileSize - 8, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20);
    wavHeader.writeUInt16LE(channels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
    wavHeader.writeUInt16LE(channels * (bitsPerSample / 8), 32);
    wavHeader.writeUInt16LE(bitsPerSample, 34);
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(dataSize, 40);
    
    const wavFile = Buffer.concat([wavHeader, combinedAudio]);
    const tempFile = path.join(__dirname, `temp_${voiceName}_audio.wav`);
    fs.writeFileSync(tempFile, wavFile);
    
    console.log(`💾 Audio saved: ${tempFile}`);
    console.log(`📊 Duration: ~${(combinedAudio.length / (sampleRate * channels * (bitsPerSample / 8))).toFixed(2)}s`);
    
    console.log(`\n🔊 Playing ${VOICES[voiceName].name}...\n`);
    execSync(`afplay "${tempFile}"`, { stdio: 'inherit' });
    console.log('\n✅ Audio played!');
    
    setTimeout(() => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
    }, 5000);
    
    ws.close();
    setTimeout(() => process.exit(0), 1000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    ws.close();
    process.exit(1);
  }
}

setTimeout(() => {
  console.error('\n⏱️  Timeout');
  ws.close();
  process.exit(1);
}, 30000);










