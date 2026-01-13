#!/usr/bin/env node

/**
 * Test script to connect to Grok Voice API and play audio response
 * This tests the full flow: WebSocket connection → text message → audio response → playback
 */

require('dotenv').config();
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Enhanced error handling
process.on('uncaughtException', (error) => {
    console.error('\n❌❌❌ UNCAUGHT EXCEPTION ❌❌❌');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n❌❌❌ UNHANDLED REJECTION ❌❌❌');
    console.error('Reason:', reason);
    console.error('Promise:', promise);
    process.exit(1);
});

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

if (!GROK_API_KEY) {
    console.error('❌ Error: GROK_API_KEY or XAI_API_KEY not found in environment variables');
    console.error('💡 Make sure your .env file contains one of these keys');
    process.exit(1);
}

console.log('🧪 Testing Grok Voice API Connection');
console.log('📋 API Key:', GROK_API_KEY.substring(0, 10) + '...');
console.log('');

// Test message
const testMessage = "Hello, can you hear me? Please respond with a short greeting.";

// Audio output file
const audioOutputFile = path.join(__dirname, '..', 'test-grok-audio-output.wav');

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000]; // Exponential backoff: 2s, 4s, 8s

let retryCount = 0;
let grokWs = null;
let isRetrying = false; // Track if we're in retry mode
let audioReceived = false; // Track if we received audio

function connectWithRetry() {
    console.log(`🔌 Connecting to Grok Voice API (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);
    
    try {
        grokWs = new WebSocket('wss://api.x.ai/v1/realtime', {
            headers: {
                'Authorization': `Bearer ${GROK_API_KEY}`
            }
        });
        
        setupWebSocketHandlers();
    } catch (error) {
        console.error('❌ Error creating WebSocket:', error.message);
        handleConnectionError(error);
    }
}

function setupWebSocketHandlers() {

    let sessionReady = false;
    let conversationReady = false;
    let audioChunks = [];
    let transcript = '';

    grokWs.on('open', () => {
    console.log('✅ Connected to Grok Voice API');
    
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
    
    grokWs.send(JSON.stringify(sessionConfig));
    console.log('✅ Session config sent');
});

    grokWs.on('message', (data) => {
    try {
        let messageStr = data.toString();
        let message;
        
        try {
            message = JSON.parse(messageStr);
        } catch (parseError) {
            console.error('❌ Failed to parse message as JSON');
            console.error('Raw data (first 200 chars):', messageStr.substring(0, 200));
            console.error('Parse error:', parseError.message);
            return;
        }
        
        const messageType = message.type || 'unknown';
        
        console.log(`📨 Received: ${messageType}`);
        
        // Log full message for debugging
        if (messageType === 'error' || message.error) {
            console.error('📋 Full error message:', JSON.stringify(message, null, 2));
        }
        
        switch (messageType) {
            case 'session.created':
            case 'session.updated':
                console.log('✅ Session ready');
                sessionReady = true;
                // Wait a bit then send conversation item
                setTimeout(() => sendTextMessage(), 500);
                break;
                
            case 'conversation.created':
                console.log('✅ Conversation created');
                conversationReady = true;
                break;
                
            case 'conversation.item.created':
                console.log('✅ Conversation item created');
                // Wait 500ms then request response
                setTimeout(() => requestResponse(), 500);
                break;
                
            case 'response.create':
                console.log('🎬 Response creation confirmed by Grok');
                console.log('⏳ Waiting for audio chunks...');
                break;
                
            case 'response.output_audio.delta':
            case 'response.audio.delta':
                if (message.delta) {
                    audioReceived = true; // Mark that we received audio
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
                    process.stdout.write(text); // Stream transcript
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
                console.error('\n❌❌❌ ERROR FROM GROK API ❌❌❌');
                console.error('Error type:', message.type);
                console.error('Error code:', message.error?.code || 'no code');
                console.error('Error message:', message.error?.message || message.error || 'no message');
                console.error('Full error:', JSON.stringify(message, null, 2));
                grokWs.close();
                process.exit(1);
                break;
                
            case 'ping':
                // Ignore ping messages
                break;
                
            default:
                console.log(`⚠️ Unhandled message type: ${messageType}`);
                console.log('📋 Full message:', JSON.stringify(message, null, 2));
        }
    } catch (error) {
        console.error('\n❌❌❌ ERROR IN MESSAGE HANDLER ❌❌❌');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('Raw data type:', typeof data);
        console.error('Raw data (first 500 chars):', data.toString().substring(0, 500));
    }
});

    grokWs.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        handleConnectionError(error);
    });

    grokWs.on('close', (code, reason) => {
        console.log(`🔌 WebSocket closed: ${code} - ${reason.toString()}`);
        if (code !== 1000) {
            console.error('❌ Unexpected close code:', code);
            if (code === 1008) {
                console.error('  1008 = Policy violation (may indicate rate limit or auth issue)');
            } else if (code === 1011) {
                console.error('  1011 = Internal server error');
            } else if (code === 1006) {
                console.error('  1006 = Abnormal closure (no close frame received)');
            }
            
            // Only retry if we haven't received audio and we're not already retrying
            if (!audioReceived && !isRetrying && audioChunks.length === 0 && retryCount < MAX_RETRIES) {
                handleConnectionError(new Error(`WebSocket closed with code ${code}`));
            } else if (!audioReceived && audioChunks.length === 0) {
                console.error('\n❌ Connection closed without receiving audio');
                process.exit(1);
            }
        }
    });
    
    // Helper functions (need to be inside setupWebSocketHandlers to access variables)
    function sendTextMessage() {
        if (!sessionReady) {
            console.log('⏳ Waiting for session to be ready...');
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
        
        grokWs.send(JSON.stringify(conversationItem));
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
        
        grokWs.send(JSON.stringify(responseRequest));
        console.log('✅ Response request sent');
    }
    
    function processAudioResponse() {
        try {
            if (audioChunks.length === 0) {
                console.error('\n❌❌❌ NO AUDIO CHUNKS RECEIVED ❌❌❌');
                console.error('This means Grok did not send any audio data.');
                console.error('Possible causes:');
                console.error('  1. Rate limiting');
                console.error('  2. API key issues');
                console.error('  3. Grok API error');
                console.error('  4. Network issues');
                console.log('\n📋 Transcript received:', transcript || 'none');
                grokWs.close();
                process.exit(1);
                return;
            }
            
            console.log(`\n🎵 Received ${audioChunks.length} audio chunks`);
            console.log('📦 Processing audio...');
            
            // Combine all base64 chunks
            const combinedBase64 = audioChunks.join('');
            
            // Convert base64 to buffer
            let audioBuffer;
            try {
                audioBuffer = Buffer.from(combinedBase64, 'base64');
            } catch (bufferError) {
                console.error('\n❌❌❌ ERROR CONVERTING BASE64 TO BUFFER ❌❌❌');
                console.error('Error:', bufferError.message);
                console.error('Combined base64 length:', combinedBase64.length);
                console.error('First 100 chars:', combinedBase64.substring(0, 100));
                grokWs.close();
                process.exit(1);
                return;
            }
            
            console.log(`📊 Audio buffer size: ${audioBuffer.length} bytes`);
            console.log(`📊 Estimated duration: ${(audioBuffer.length / 2 / 24000).toFixed(2)} seconds`);
            
            // Save to WAV file for playback
            // PCM Int16, 24kHz, mono
            const sampleRate = 24000;
            const numChannels = 1;
            const bitsPerSample = 16;
            const dataSize = audioBuffer.length;
            const fileSize = 36 + dataSize;
            
            // Create WAV header
            const wavHeader = Buffer.alloc(44);
            wavHeader.write('RIFF', 0);
            wavHeader.writeUInt32LE(fileSize - 8, 4);
            wavHeader.write('WAVE', 8);
            wavHeader.write('fmt ', 12);
            wavHeader.writeUInt32LE(16, 16); // fmt chunk size
            wavHeader.writeUInt16LE(1, 20); // PCM format
            wavHeader.writeUInt16LE(numChannels, 22);
            wavHeader.writeUInt32LE(sampleRate, 24);
            wavHeader.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28); // byte rate
            wavHeader.writeUInt16LE(numChannels * bitsPerSample / 8, 32); // block align
            wavHeader.writeUInt16LE(bitsPerSample, 34);
            wavHeader.write('data', 36);
            wavHeader.writeUInt32LE(dataSize, 40);
            
            // Combine header + audio data
            const wavFile = Buffer.concat([wavHeader, audioBuffer]);
            
            // Write to file
            try {
                fs.writeFileSync(audioOutputFile, wavFile);
                console.log(`💾 Audio saved to: ${audioOutputFile}`);
            } catch (writeError) {
                console.error('\n❌❌❌ ERROR WRITING AUDIO FILE ❌❌❌');
                console.error('Error:', writeError.message);
                console.error('Path:', audioOutputFile);
                grokWs.close();
                process.exit(1);
                return;
            }
            
            // Try to play audio
            console.log('🔊 Attempting to play audio...');
            
            // Try different audio players based on OS
            const platform = process.platform;
            let playCommand;
            
            if (platform === 'darwin') {
                // macOS - use afplay
                playCommand = `afplay "${audioOutputFile}"`;
            } else if (platform === 'linux') {
                // Linux - try aplay or paplay
                playCommand = `aplay "${audioOutputFile}" || paplay "${audioOutputFile}"`;
            } else if (platform === 'win32') {
                // Windows - use PowerShell
                playCommand = `powershell -c (New-Object Media.SoundPlayer "${audioOutputFile}").PlaySync()`;
            } else {
                console.log('⚠️ Unknown platform, cannot auto-play audio');
                console.log(`📁 Audio file saved at: ${audioOutputFile}`);
                grokWs.close();
                return;
            }
            
            exec(playCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error('\n❌❌❌ ERROR PLAYING AUDIO ❌❌❌');
                    console.error('Error:', error.message);
                    if (stderr) console.error('Stderr:', stderr);
                    console.log(`📁 Audio file saved at: ${audioOutputFile}`);
                    console.log('💡 You can play it manually with:', playCommand);
                } else {
                    console.log('✅ Audio playback completed!');
                }
                grokWs.close();
            });
        } catch (processError) {
            console.error('\n❌❌❌ ERROR IN processAudioResponse ❌❌❌');
            console.error('Error:', processError.message);
            console.error('Stack:', processError.stack);
            grokWs.close();
            process.exit(1);
        }
    }
}

function handleConnectionError(error) {
    if (isRetrying) {
        return; // Don't handle errors during retry
    }
    
    const isRateLimit = error.message.includes('429') || 
                       error.message.includes('Unexpected server response: 429') ||
                       error.message.includes('rate limit');
    
    if (isRateLimit) {
        console.error('\n❌❌❌ GROK API RATE LIMITED ❌❌❌');
        console.error('Grok is rate limiting WebSocket connections.');
        console.error('\nPossible causes:');
        console.error('  1. Too many connection attempts');
        console.error('  2. API key has reached spending limit');
        console.error('  3. Rate limit on your account');
        
        if (retryCount < MAX_RETRIES) {
            isRetrying = true;
            const delay = RETRY_DELAYS[retryCount];
            retryCount++;
            console.error(`\n⏳ Retrying in ${delay / 1000} seconds (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);
            setTimeout(() => {
                isRetrying = false;
                connectWithRetry();
            }, delay);
        } else {
            console.error('\n❌ Max retries reached. Solutions:');
            console.error('  1. Wait a few minutes and try again');
            console.error('  2. Check your xAI console for account status');
            console.error('  3. Verify API key has proper permissions');
            console.error('  4. Check if you have available credits');
            process.exit(1);
        }
    } else {
        console.error('\n❌❌❌ CONNECTION ERROR ❌❌❌');
        console.error('Error:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
        process.exit(1);
    }
}

// Start connection
connectWithRetry();

function sendTextMessage() {
    if (!sessionReady) {
        console.log('⏳ Waiting for session to be ready...');
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
    
    grokWs.send(JSON.stringify(conversationItem));
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
    
    grokWs.send(JSON.stringify(responseRequest));
    console.log('✅ Response request sent');
}

function processAudioResponse() {
    try {
        if (audioChunks.length === 0) {
            console.error('\n❌❌❌ NO AUDIO CHUNKS RECEIVED ❌❌❌');
            console.error('This means Grok did not send any audio data.');
            console.error('Possible causes:');
            console.error('  1. Rate limiting');
            console.error('  2. API key issues');
            console.error('  3. Grok API error');
            console.error('  4. Network issues');
            console.log('\n📋 Transcript received:', transcript || 'none');
            grokWs.close();
            process.exit(1);
            return;
        }
    
    console.log(`\n🎵 Received ${audioChunks.length} audio chunks`);
    console.log('📦 Processing audio...');
    
    // Combine all base64 chunks
    const combinedBase64 = audioChunks.join('');
    
        // Convert base64 to buffer
        let audioBuffer;
        try {
            audioBuffer = Buffer.from(combinedBase64, 'base64');
        } catch (bufferError) {
            console.error('\n❌❌❌ ERROR CONVERTING BASE64 TO BUFFER ❌❌❌');
            console.error('Error:', bufferError.message);
            console.error('Combined base64 length:', combinedBase64.length);
            console.error('First 100 chars:', combinedBase64.substring(0, 100));
            grokWs.close();
            process.exit(1);
            return;
        }
        
        console.log(`📊 Audio buffer size: ${audioBuffer.length} bytes`);
        console.log(`📊 Estimated duration: ${(audioBuffer.length / 2 / 24000).toFixed(2)} seconds`);
    
    // Save to WAV file for playback
    // PCM Int16, 24kHz, mono
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const dataSize = audioBuffer.length;
    const fileSize = 36 + dataSize;
    
    // Create WAV header
    const wavHeader = Buffer.alloc(44);
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(fileSize - 8, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16); // fmt chunk size
    wavHeader.writeUInt16LE(1, 20); // PCM format
    wavHeader.writeUInt16LE(numChannels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28); // byte rate
    wavHeader.writeUInt16LE(numChannels * bitsPerSample / 8, 32); // block align
    wavHeader.writeUInt16LE(bitsPerSample, 34);
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(dataSize, 40);
    
    // Combine header + audio data
    const wavFile = Buffer.concat([wavHeader, audioBuffer]);
    
        // Write to file
        try {
            fs.writeFileSync(audioOutputFile, wavFile);
            console.log(`💾 Audio saved to: ${audioOutputFile}`);
        } catch (writeError) {
            console.error('\n❌❌❌ ERROR WRITING AUDIO FILE ❌❌❌');
            console.error('Error:', writeError.message);
            console.error('Path:', audioOutputFile);
            grokWs.close();
            process.exit(1);
            return;
        }
    
    // Try to play audio
    console.log('🔊 Attempting to play audio...');
    
    // Try different audio players based on OS
    const platform = process.platform;
    let playCommand;
    
    if (platform === 'darwin') {
        // macOS - use afplay
        playCommand = `afplay "${audioOutputFile}"`;
    } else if (platform === 'linux') {
        // Linux - try aplay or paplay
        playCommand = `aplay "${audioOutputFile}" || paplay "${audioOutputFile}"`;
    } else if (platform === 'win32') {
        // Windows - use PowerShell
        playCommand = `powershell -c (New-Object Media.SoundPlayer "${audioOutputFile}").PlaySync()`;
    } else {
        console.log('⚠️ Unknown platform, cannot auto-play audio');
        console.log(`📁 Audio file saved at: ${audioOutputFile}`);
        grokWs.close();
        return;
    }
    
        exec(playCommand, (error, stdout, stderr) => {
            if (error) {
                console.error('\n❌❌❌ ERROR PLAYING AUDIO ❌❌❌');
                console.error('Error:', error.message);
                if (stderr) console.error('Stderr:', stderr);
                console.log(`📁 Audio file saved at: ${audioOutputFile}`);
                console.log('💡 You can play it manually with:', playCommand);
            } else {
                console.log('✅ Audio playback completed!');
            }
            grokWs.close();
        });
    } catch (processError) {
        console.error('\n❌❌❌ ERROR IN processAudioResponse ❌❌❌');
        console.error('Error:', processError.message);
        console.error('Stack:', processError.stack);
        grokWs.close();
        process.exit(1);
    }
}

// Timeout after 30 seconds
setTimeout(() => {
    if (audioChunks.length === 0) {
        console.error('\n❌ Timeout: No audio received within 30 seconds');
        console.log('📋 Transcript so far:', transcript);
        grokWs.close();
        process.exit(1);
    }
}, 30000);

console.log('⏳ Waiting for response...');
console.log('');

