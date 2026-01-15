#!/usr/bin/env node
/**
 * Play Grok Voice Audio on Local Machine
 * Generates audio from text and plays it using macOS afplay
 */

require('dotenv').config();
const WebSocket = require('ws');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
const TEXT_TO_SPEAK = process.argv[2] || 'hello brant';

if (!GROK_API_KEY) {
  console.error('❌ GROK_API_KEY or XAI_API_KEY not set');
  process.exit(1);
}

console.log(`🎤 Grok Voice: "${TEXT_TO_SPEAK}"\n`);
console.log('='.repeat(60));

let audioChunks = [];
let conversationId = null;
let sessionId = null;

const ws = new WebSocket('wss://api.x.ai/v1/realtime', {
  headers: {
    'Authorization': `Bearer ${GROK_API_KEY}`
  }
});

ws.on('open', () => {
  console.log('✅ Connected to Grok Voice API');
  
  // Send session configuration
  const sessionConfig = {
    type: 'session.update',
    session: {
      modalities: ['text', 'audio'],
      instructions: 'You are Ada, the Mach33 Assistant. You are a helpful voice assistant with a British accent. Speak naturally and clearly.',
      voice: 'eve', // Ada - Mach33 Assistant (British accent)
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1'
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      }
    }
  };
  
  ws.send(JSON.stringify(sessionConfig));
  console.log('📤 Session configuration sent');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    const messageType = message.type;
    
    if (messageType === 'session.updated') {
      console.log('✅ Session ready');
      
      // Create conversation
      const createConversation = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: TEXT_TO_SPEAK
            }
          ]
        }
      };
      
      ws.send(JSON.stringify(createConversation));
      console.log(`📤 Sending text: "${TEXT_TO_SPEAK}"`);
      
    } else if (messageType === 'conversation.created' || messageType === 'conversation.item.created') {
      if (message.conversation) {
        conversationId = message.conversation.id;
      }
      console.log('✅ Conversation created');
      
      // Request response
      const createResponse = {
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: 'Speak naturally and clearly.'
        }
      };
      
      ws.send(JSON.stringify(createResponse));
      console.log('📤 Requesting audio response...');
      
    } else if (messageType === 'response.output_audio.delta') {
      // Collect audio chunks
      if (message.delta) {
        audioChunks.push(message.delta);
        process.stdout.write('🎵');
      }
      
    } else if (messageType === 'response.output_audio_transcript.delta') {
      // Show transcript as it comes in
      if (message.delta) {
        process.stdout.write(message.delta);
      }
      
    } else if (messageType === 'response.output_audio_transcript.done') {
      if (message.transcript) {
        console.log(`\n📝 Transcript: "${message.transcript}"`);
      }
      
    } else if (messageType === 'response.done') {
      console.log('\n✅ Audio response complete');
      console.log(`📊 Collected ${audioChunks.length} audio chunks`);
      
      // Decode and save audio
      if (audioChunks.length > 0) {
        playAudio(audioChunks);
      } else {
        console.log('⚠️  No audio chunks received');
        ws.close();
        process.exit(1);
      }
      
    } else if (messageType === 'error') {
      console.error('\n❌ Error from Grok:', message.error || message);
      ws.close();
      process.exit(1);
    }
    
  } catch (e) {
    // Binary data or other non-JSON - ignore
  }
});

ws.on('error', (error) => {
  console.error('\n❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 Connection closed: ${code} - ${reason.toString()}`);
});

function playAudio(chunks) {
  console.log('\n🔊 Processing audio...');
  
  try {
    // Decode base64 audio chunks
    const audioBuffers = chunks.map(chunk => Buffer.from(chunk, 'base64'));
    const combinedAudio = Buffer.concat(audioBuffers);
    
    // Save as WAV file (PCM16, 24kHz, mono)
    const sampleRate = 24000;
    const channels = 1;
    const bitsPerSample = 16;
    const dataSize = combinedAudio.length;
    const fileSize = 36 + dataSize;
    
    const wavHeader = Buffer.alloc(44);
    // RIFF header
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(fileSize - 8, 4);
    wavHeader.write('WAVE', 8);
    // fmt chunk
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16); // fmt chunk size
    wavHeader.writeUInt16LE(1, 20); // audio format (PCM)
    wavHeader.writeUInt16LE(channels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28); // byte rate
    wavHeader.writeUInt16LE(channels * (bitsPerSample / 8), 32); // block align
    wavHeader.writeUInt16LE(bitsPerSample, 34);
    // data chunk
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(dataSize, 40);
    
    const wavFile = Buffer.concat([wavHeader, combinedAudio]);
    
    // Save to temp file
    const tempFile = path.join(__dirname, 'temp_grok_audio.wav');
    fs.writeFileSync(tempFile, wavFile);
    
    console.log(`💾 Audio saved: ${tempFile}`);
    console.log(`📊 Audio size: ${(combinedAudio.length / 1024).toFixed(2)} KB`);
    console.log(`⏱️  Duration: ~${(combinedAudio.length / (sampleRate * channels * (bitsPerSample / 8))).toFixed(2)} seconds`);
    
    // Play audio on macOS
    console.log('\n🔊 Playing audio...\n');
    try {
      execSync(`afplay "${tempFile}"`, { stdio: 'inherit' });
      console.log('\n✅ Audio played successfully!');
    } catch (playError) {
      console.error('❌ Error playing audio:', playError.message);
      console.log(`💡 Audio file saved at: ${tempFile}`);
      console.log('💡 You can play it manually with: afplay', tempFile);
    }
    
    // Clean up temp file after a delay
    setTimeout(() => {
      try {
        fs.unlinkSync(tempFile);
        console.log('🧹 Cleaned up temp file');
      } catch (e) {
        // Ignore cleanup errors
      }
    }, 5000);
    
    ws.close();
    setTimeout(() => process.exit(0), 1000);
    
  } catch (error) {
    console.error('❌ Error processing audio:', error.message);
    ws.close();
    process.exit(1);
  }
}

// Timeout after 30 seconds
setTimeout(() => {
  console.error('\n⏱️  Timeout: No response received');
  ws.close();
  process.exit(1);
}, 30000);

