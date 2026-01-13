#!/usr/bin/env node

/**
 * Test script to connect through our server's WebSocket proxy
 * This tests the shared connection architecture
 */

require('dotenv').config();
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🧪 Testing Grok Voice API through Server Proxy');
console.log('📋 This tests the shared connection architecture');
console.log('');

// Test message
const testMessage = "Hello, can you hear me? Please respond with a short greeting.";

// Audio output file
const audioOutputFile = path.join(__dirname, '..', 'test-grok-audio-output.wav');

// Connect to our server's WebSocket proxy (not directly to Grok)
const serverUrl = process.env.SERVER_URL || 'ws://localhost:3333';
const proxyUrl = `${serverUrl}/api/analyst/ws/grok-voice`;

console.log(`🔌 Connecting to server proxy: ${proxyUrl}`);
console.log('📋 This will use the shared Grok connection on the server');
console.log('');

const clientWs = new WebSocket(proxyUrl);

let sessionReady = false;
let conversationReady = false;
let audioChunks = [];
let transcript = '';

clientWs.on('open', () => {
    console.log('✅ Connected to server proxy');
    console.log('⏳ Server will forward to shared Grok connection...');
    
    // Step 1: Send session configuration
    console.log('📤 Sending session configuration...');
    const sessionConfig = {
        type: 'session.update',
        session: {
            instructions: "You are a helpful voice assistant named Ara. Respond naturally and conversationally.",
            voice: "ara",
            turn_detection: {
                type: "server_vad"
            },
            audio: {
                input: {
                    format: {
                        type: "audio/pcm",
                        rate: 24000
                    }
                },
                output: {
                    format: {
                        type: "audio/pcm",
                        rate: 24000
                    }
                }
            }
        }
    };
    
    clientWs.send(JSON.stringify(sessionConfig));
    console.log('✅ Session config sent');
});

clientWs.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        const messageType = message.type || 'unknown';
        
        console.log(`📨 Received from server: ${messageType}`);
        
        switch (messageType) {
            case 'session.created':
            case 'session.updated':
                console.log('✅ Session ready');
                sessionReady = true;
                setTimeout(() => sendTextMessage(), 500);
                break;
                
            case 'conversation.created':
                console.log('✅ Conversation created');
                conversationReady = true;
                break;
                
            case 'conversation.item.created':
                console.log('✅ Conversation item created');
                setTimeout(() => requestResponse(), 500);
                break;
                
            case 'response.create':
                console.log('🎬 Response creation confirmed by Grok');
                console.log('⏳ Waiting for audio chunks...');
                break;
                
            case 'response.output_audio.delta':
            case 'response.audio.delta':
                if (message.delta) {
                    const chunkSize = message.delta.length;
                    console.log(`🎵 Audio chunk received: ${chunkSize} chars (base64)`);
                    audioChunks.push(message.delta);
                }
                break;
                
            case 'response.output_audio_transcript.delta':
            case 'response.text.delta':
                if (message.delta || message.text) {
                    const text = message.delta || message.text;
                    transcript += text;
                    process.stdout.write(text);
                }
                break;
                
            case 'response.output_audio_transcript.done':
            case 'response.text.done':
                const finalText = message.transcript || message.text || '';
                if (finalText) {
                    transcript = finalText;
                }
                console.log('\n📝 Final transcript:', transcript);
                break;
                
            case 'response.done':
                console.log('✅ Response complete');
                processAudioResponse();
                break;
                
            case 'error':
                console.error('❌ ERROR from Grok:', JSON.stringify(message, null, 2));
                clientWs.close();
                process.exit(1);
                break;
                
            case 'ping':
                break;
                
            default:
                console.log(`⚠️ Unhandled message type: ${messageType}`);
        }
    } catch (error) {
        console.error('❌ Error parsing message:', error.message);
    }
});

clientWs.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    process.exit(1);
});

clientWs.on('close', (code, reason) => {
    console.log(`🔌 WebSocket closed: ${code} - ${reason.toString()}`);
    if (code !== 1000) {
        console.error('❌ Unexpected close code:', code);
    }
});

function sendTextMessage() {
    if (!sessionReady) {
        setTimeout(() => sendTextMessage(), 500);
        return;
    }
    
    console.log(`📤 Sending text message: "${testMessage}"`);
    const conversationItem = {
        type: 'conversation.item.create',
        item: {
            type: 'message',
            role: 'user',
            content: [
                {
                    type: 'input_text',
                    text: testMessage
                }
            ]
        }
    };
    
    clientWs.send(JSON.stringify(conversationItem));
    console.log('✅ Conversation item sent');
}

function requestResponse() {
    console.log('📤 Requesting audio response...');
    const responseRequest = {
        type: 'response.create',
        response: {
            modalities: ['audio', 'text']
        }
    };
    
    clientWs.send(JSON.stringify(responseRequest));
    console.log('✅ Response request sent');
}

function processAudioResponse() {
    if (audioChunks.length === 0) {
        console.error('❌ No audio chunks received!');
        clientWs.close();
        process.exit(1);
        return;
    }
    
    console.log(`\n🎵 Received ${audioChunks.length} audio chunks`);
    console.log('📦 Processing audio...');
    
    const combinedBase64 = audioChunks.join('');
    const audioBuffer = Buffer.from(combinedBase64, 'base64');
    
    console.log(`📊 Audio buffer size: ${audioBuffer.length} bytes`);
    console.log(`📊 Estimated duration: ${(audioBuffer.length / 2 / 24000).toFixed(2)} seconds`);
    
    // Create WAV file
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const dataSize = audioBuffer.length;
    const fileSize = 36 + dataSize;
    
    const wavHeader = Buffer.alloc(44);
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(fileSize - 8, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20);
    wavHeader.writeUInt16LE(numChannels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28);
    wavHeader.writeUInt16LE(numChannels * bitsPerSample / 8, 32);
    wavHeader.writeUInt16LE(bitsPerSample, 34);
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(dataSize, 40);
    
    const wavFile = Buffer.concat([wavHeader, audioBuffer]);
    fs.writeFileSync(audioOutputFile, wavFile);
    console.log(`💾 Audio saved to: ${audioOutputFile}`);
    
    // Play audio (macOS)
    const platform = process.platform;
    if (platform === 'darwin') {
        console.log('🔊 Playing audio...');
        exec(`afplay "${audioOutputFile}"`, (error) => {
            if (error) {
                console.error('❌ Error playing audio:', error.message);
            } else {
                console.log('✅ Audio playback completed!');
            }
            clientWs.close();
        });
    } else {
        console.log(`📁 Audio file saved at: ${audioOutputFile}`);
        clientWs.close();
    }
}

// Timeout
setTimeout(() => {
    if (audioChunks.length === 0) {
        console.error('\n❌ Timeout: No audio received within 30 seconds');
        console.log('📋 Transcript so far:', transcript);
        clientWs.close();
        process.exit(1);
    }
}, 30000);

console.log('⏳ Waiting for response...');
console.log('');


