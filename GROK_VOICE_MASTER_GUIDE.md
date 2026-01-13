# Grok Voice Master Guide

## Complete Guide to Implementing Grok Voice Bidirectional Conversations

This is the **complete, step-by-step guide** to implementing Grok Voice bidirectional voice conversations. Follow this guide from start to finish to get Grok Voice working in your application.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Configuration](#setup--configuration)
4. [Implementation Steps](#implementation-steps)
5. [How It Works](#how-it-works)
6. [Message Flow](#message-flow)
7. [Rate Limiting Prevention](#rate-limiting-prevention)
8. [Debugging Guide](#debugging-guide)
9. [Troubleshooting](#troubleshooting)
10. [Testing](#testing)

---

## Overview

### What is Grok Voice?

Grok Voice enables **real-time bidirectional voice conversations** with Grok AI. Users can:
- Speak to Grok and receive audio responses
- Have natural voice conversations
- Get real-time audio streaming with <1s latency

### Key Features

- **Real-time streaming**: Audio streams continuously via WebSocket
- **Low latency**: <1 second from text to first audio chunk
- **Multiple voices**: Ara (default), Rex, Sal, Eve, Leo
- **Bidirectional**: Send audio and receive audio simultaneously
- **High quality**: Native Grok voice (same as x.ai console)

---

## Architecture

### Three-Layer WebSocket Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Frontend (Browser)                                 │
│ apps/shared/js/grok-voice-service.js                       │
│ - Connects to backend WebSocket proxy                      │
│ - Captures microphone audio                                │
│ - Plays audio responses                                     │
└─────────────────────────────────────────────────────────────┘
                    ↓ WebSocket
                    ws://backend/api/analyst/ws/grok-voice
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Backend Proxy                                      │
│ server/icrm-api/src/services/grok-voice-webrtc.service.ts  │
│ - Handles authentication                                    │
│ - Proxies messages bidirectionally                          │
│ - Manages connection reuse                                  │
└─────────────────────────────────────────────────────────────┘
                    ↓ WebSocket (authenticated)
                    wss://api.x.ai/v1/realtime
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Grok Voice API                                     │
│ wss://api.x.ai/v1/realtime                                  │
│ - Processes voice input                                     │
│ - Generates audio responses                                 │
│ - Streams audio chunks                                      │
└─────────────────────────────────────────────────────────────┘
```

### Why Backend Proxy?

- Browser WebSocket API doesn't support custom headers (Authorization)
- Backend proxy handles authentication securely
- API keys never exposed to frontend
- Proxy forwards messages bidirectionally

---

## Setup & Configuration

### 1. Environment Variables

**Backend** (`.env` file):
```bash
# Required
GROK_API_KEY=xai-...  # or XAI_API_KEY

# Optional
GROK_ENDPOINT=https://api.x.ai/v1/chat/completions
GROK_DEFAULT_MODEL=grok-4
```

### 2. Install Dependencies

**Backend**:
```bash
npm install ws  # WebSocket library
```

**Frontend**:
- No additional dependencies (uses native WebSocket API)
- Requires Socket.io for backend communication

### 3. Voice Options

Available voices:
- **Ara**: Female, warm, friendly (default)
- **Rex**: Male, confident, clear
- **Sal**: Neutral, smooth, balanced
- **Eve**: Female, energetic, upbeat
- **Leo**: Male, authoritative, strong

---

## Implementation Steps

### Step 1: Backend WebSocket Proxy Service

**File**: `server/icrm-api/src/services/grok-voice-webrtc.service.ts`

Create a service that manages WebSocket connections to Grok:

```typescript
import WebSocket from 'ws';
import { EventEmitter } from 'events';

interface GrokVoiceConnection {
  grokWs: WebSocket | null;
  voice: 'ara' | 'rex' | 'sal' | 'eve' | 'leo';
  sessionId: string;
  isConnected: boolean;
  expectingResponse?: boolean;
}

export class GrokVoiceWebSocketProxy extends EventEmitter {
  private connections: Map<string, GrokVoiceConnection> = new Map();
  private grokApiKey: string;

  constructor() {
    super();
    this.setMaxListeners(20);
    this.grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
  }

  /**
   * CRITICAL: Check for existing connection BEFORE creating new one
   * This prevents rate limiting by reusing connections
   */
  async connectToGrok(sessionId: string, voice: 'ara' | 'rex' | 'sal' | 'eve' | 'leo' = 'ara'): Promise<WebSocket> {
    // CHECK FOR EXISTING CONNECTION FIRST
    const existing = this.connections.get(sessionId);
    if (existing?.grokWs && existing.isConnected) {
      console.log('[grok-voice-webrtc] Reusing existing Grok connection');
      this.emit('session-ready', { sessionId, voice: existing.voice });
      return existing.grokWs; // REUSE instead of creating new
    }

    const wsUrl = 'wss://api.x.ai/v1/realtime';
    
    return new Promise((resolve, reject) => {
      const grokWs = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.grokApiKey}`
        }
      });

      grokWs.on('open', () => {
        // Configure session
        const sessionConfig = {
          type: 'session.update',
          session: {
            voice: voice.toLowerCase(), // Must be lowercase
            instructions: 'You are a helpful voice assistant.',
            turn_detection: { type: 'server_vad' },
            audio: {
              input: { format: { type: 'audio/pcm', rate: 24000 } },
              output: { format: { type: 'audio/pcm', rate: 24000 } }
            }
          }
        };
        
        grokWs.send(JSON.stringify(sessionConfig));
        
        // CRITICAL: Session-ready is emitted IMMEDIATELY
        // Grok doesn't send confirmation, so we don't wait
        const connection: GrokVoiceConnection = {
          grokWs,
          voice,
          sessionId,
          isConnected: true
        };
        this.connections.set(sessionId, connection);
        this.emit('session-ready', { sessionId, voice });
        resolve(grokWs);
      });

      grokWs.on('message', (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());
        this.handleMessage(sessionId, message);
      });

      grokWs.on('error', (error: any) => {
        // Handle rate limiting (HTTP 429)
        const isRateLimited = String(error).includes('429') || 
                             String(error).includes('Too Many Requests');
        if (isRateLimited) {
          console.error('❌❌❌ GROK API RATE LIMITED ❌❌❌');
          console.error('Wait 5-10 minutes before retrying');
        }
        this.emit('error', { sessionId, error: error.message, isRateLimited });
        reject(error);
      });
    });
  }

  /**
   * Handle messages from Grok
   */
  private handleMessage(sessionId: string, message: any) {
    // Audio chunks: response.output_audio.delta (NOT response.audio.delta)
    if (message.type === 'response.output_audio.delta' && message.delta) {
      const audioData = Buffer.from(message.delta, 'base64');
      this.emit('audio-from-grok', { sessionId, audioData });
      return;
    }

    // Transcript chunks: response.output_audio_transcript.delta
    if (message.type === 'response.output_audio_transcript.delta' && message.delta) {
      this.emit('transcript-delta', { sessionId, transcript: message.delta });
      return;
    }

    // Transcript complete: response.output_audio_transcript.done
    if (message.type === 'response.output_audio_transcript.done' && message.transcript) {
      this.emit('transcript-complete', { sessionId, transcript: message.transcript });
      return;
    }

    // Response complete: response.done
    if (message.type === 'response.done') {
      const connection = this.connections.get(sessionId);
      if (connection?.expectingResponse) {
        connection.expectingResponse = false;
        this.emit('response-complete', { sessionId });
      }
      return;
    }
  }

  /**
   * Send text to Grok (for text-to-voice)
   */
  sendTextToGrok(sessionId: string, text: string): void {
    const connection = this.connections.get(sessionId);
    if (!connection?.grokWs || !connection.isConnected) {
      throw new Error('No active connection for session');
    }

    // Step 1: Create conversation item
    const conversationItem = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: text }]
      }
    };
    connection.grokWs.send(JSON.stringify(conversationItem));

    // Step 2: Wait 500ms, then send response.create
    setTimeout(() => {
      const responseCreate = {
        type: 'response.create',
        response: { modalities: ['audio', 'text'] }
      };
      connection.grokWs!.send(JSON.stringify(responseCreate));
      connection.expectingResponse = true;
    }, 500);
  }
}

// Singleton pattern - prevents multiple instances
let grokVoiceProxyInstance: GrokVoiceWebSocketProxy | null = null;

export function getGrokVoiceProxy(): GrokVoiceWebSocketProxy {
  if (!grokVoiceProxyInstance) {
    grokVoiceProxyInstance = new GrokVoiceWebSocketProxy();
  }
  return grokVoiceProxyInstance;
}
```

---

### Step 2: Backend Socket.io Handler

**File**: `server/icrm-api/src/services/realtime.service.ts`

Add Socket.io handlers for Grok Voice:

```typescript
import { getGrokVoiceProxy } from './grok-voice-webrtc.service.js';

io.on('connection', (socket) => {
  // Connect to Grok Voice
  socket.on('grok-voice:connect', async (data: { sessionId: string; voice?: string }) => {
    const { sessionId, voice = 'ara' } = data;
    const grokVoiceProxy = getGrokVoiceProxy();

    // Set up session-ready handler
    const sessionReadyHandler = ({ sessionId: sid, voice: v }) => {
      if (sid === sessionId) {
        socket.emit('grok-voice:connected', { sessionId: sid, voice: v });
      }
    };
    grokVoiceProxy.on('session-ready', sessionReadyHandler);

    // Connect to Grok
    try {
      await grokVoiceProxy.connectToGrok(sessionId, voice);
    } catch (error) {
      socket.emit('grok-voice:error', { sessionId, error: error.message });
    }

    // Forward audio from Grok to frontend
    grokVoiceProxy.on('audio-from-grok', ({ sessionId: sid, audioData }) => {
      if (sid === sessionId) {
        socket.emit('grok-voice:audio', {
          sessionId: sid,
          audio: audioData.toString('base64'),
          format: 'pcm',
          sampleRate: 24000
        });
      }
    });

    // Forward transcript
    grokVoiceProxy.on('transcript-delta', ({ sessionId: sid, transcript }) => {
      if (sid === sessionId) {
        socket.emit('grok-voice:transcript-delta', { sessionId: sid, transcript });
      }
    });

    // Forward response complete
    grokVoiceProxy.on('response-complete', ({ sessionId: sid }) => {
      if (sid === sessionId) {
        socket.emit('grok-voice:response-complete', { sessionId: sid });
      }
    });
  });

  // Send text to Grok Voice
  socket.on('grok-voice:text', (data: { sessionId: string; text: string }) => {
    const { sessionId, text } = data;
    const grokVoiceProxy = getGrokVoiceProxy();
    grokVoiceProxy.sendTextToGrok(sessionId, text);
  });
});
```

---

### Step 3: Frontend Grok Voice Service

**File**: `apps/shared/js/grok-voice-service.js`

Create frontend service (simplified version):

```javascript
class GrokVoiceService {
  constructor() {
    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.isRecording = false;
  }

  /**
   * Connect to backend WebSocket proxy
   */
  async connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = window.location.port || (protocol === 'wss:' ? '443' : '80');
    const proxyUrl = `${protocol}//${hostname}:${port}/api/analyst/ws/grok-voice`;

    this.ws = new WebSocket(proxyUrl);

    this.ws.onopen = () => {
      this.sendSessionConfig();
    };

    this.ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        this.handleBinaryMessage(event.data);
      } else {
        this.handleWebSocketMessage(event);
      }
    };
  }

  /**
   * Send session configuration
   */
  sendSessionConfig() {
    const config = {
      type: 'session.update',
      session: {
        voice: 'Ara',
        instructions: 'You are a helpful voice assistant.',
        turn_detection: { type: 'server_vad' },
        audio: {
          input: { format: { type: 'audio/pcm', rate: 24000 } },
          output: { format: { type: 'audio/pcm', rate: 24000 } }
        }
      }
    };
    this.ws.send(JSON.stringify(config));
  }

  /**
   * Handle WebSocket messages
   */
  handleWebSocketMessage(event) {
    const message = JSON.parse(event.data);
    
    // Audio chunks: response.output_audio.delta
    if (message.type === 'response.output_audio.delta' && message.delta) {
      this.playAudioChunk(message.delta);
    }

    // Transcript: response.output_audio_transcript.delta
    if (message.type === 'response.output_audio_transcript.delta' && message.delta) {
      // Update UI with transcript
      console.log('Transcript:', message.delta);
    }
  }

  /**
   * Play audio chunk (PCM base64)
   */
  async playAudioChunk(base64Audio) {
    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert PCM Int16 to Float32
    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0;
    }

    // Create audio buffer and play
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }
    const audioBuffer = this.audioContext.createBuffer(1, floatData.length, 24000);
    audioBuffer.getChannelData(0).set(floatData);
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start();
  }
}
```

---

### Step 4: Frontend Socket.io Integration

**File**: `apps/control-center-ui/public/js/components/primary-agent-panel.js`

Integrate with Socket.io:

```javascript
// Initialize Socket.io connection
const socket = io(socketUrl, {
  path: '/api/icrm/socket.io',
  autoConnect: false // Connect only when needed
});

// Connect to Grok Voice
function connectToGrokVoice(sessionId, voice = 'ara') {
  socket.emit('grok-voice:connect', { sessionId, voice });
}

// Listen for connection confirmation
socket.on('grok-voice:connected', (data) => {
  console.log('✅ Grok Voice connected:', data.sessionId);
  isGrokVoiceConnected = true;
});

// Listen for audio chunks
socket.on('grok-voice:audio', (data) => {
  if (data.sessionId === currentSessionId) {
    // Convert base64 to audio and play
    const audioBuffer = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
    playGrokAudioChunk(audioBuffer, data.sampleRate || 24000);
  }
});

// Listen for transcript
socket.on('grok-voice:transcript-delta', (data) => {
  if (data.sessionId === currentSessionId) {
    updateTranscript(data.transcript);
  }
});

// Send text message
function sendTextToGrok(text) {
  socket.emit('grok-voice:text', {
    sessionId: currentSessionId,
    text: text
  });
}
```

---

## How It Works

### Complete Flow: Text Message → Audio Response

```
1. User sends text message
   ↓
2. Frontend: socket.emit('grok-voice:text', { sessionId, text })
   ↓
3. Backend: Receives 'grok-voice:text' event
   ↓
4. Backend: grokVoiceProxy.sendTextToGrok(sessionId, text)
   ↓
5. Backend → Grok: Send conversation.item.create
   {
     type: 'conversation.item.create',
     item: {
       type: 'message',
       role: 'user',
       content: [{ type: 'input_text', text: 'Hello' }]
     }
   }
   ↓
6. Wait 500ms
   ↓
7. Backend → Grok: Send response.create
   {
     type: 'response.create',
     response: { modalities: ['audio', 'text'] }
   }
   ↓
8. Grok → Backend: response.create (confirmation)
   {
     type: 'response.create',
     response: { id: '...', status: 'started' }
   }
   ↓
9. Grok → Backend: Audio chunks (streaming)
   {
     type: 'response.output_audio.delta',
     delta: 'base64-encoded-pcm...'
   }
   (Multiple chunks)
   ↓
10. Backend → Frontend: socket.emit('grok-voice:audio', { audio: '...' })
   ↓
11. Frontend: Convert base64 → PCM → Float32 → Web Audio API
   ↓
12. Frontend: Play audio through speakers
   ↓
13. Grok → Backend: Transcript chunks
   {
     type: 'response.output_audio_transcript.delta',
     delta: 'Hello'
   }
   ↓
14. Backend → Frontend: socket.emit('grok-voice:transcript-delta', { transcript: 'Hello' })
   ↓
15. Frontend: Display transcript in UI
   ↓
16. Grok → Backend: Response complete
   {
     type: 'response.done'
   }
   ↓
17. Backend → Frontend: socket.emit('grok-voice:response-complete')
```

---

## Message Flow

### Messages Sent TO Grok

#### 1. Session Configuration
```json
{
  "type": "session.update",
  "session": {
    "voice": "ara",
    "instructions": "You are a helpful voice assistant.",
    "turn_detection": { "type": "server_vad" },
    "audio": {
      "input": { "format": { "type": "audio/pcm", "rate": 24000 } },
      "output": { "format": { "type": "audio/pcm", "rate": 24000 } }
    }
  }
}
```

#### 2. Send Text Message
```json
{
  "type": "conversation.item.create",
  "item": {
    "type": "message",
    "role": "user",
    "content": [
      { "type": "input_text", "text": "Hello, how are you?" }
    ]
  }
}
```

**Followed by** (after 500ms delay):
```json
{
  "type": "response.create",
  "response": {
    "modalities": ["audio", "text"]
  }
}
```

#### 3. Send Audio Chunk (Bidirectional Voice)
```json
{
  "type": "input_audio_buffer.append",
  "audio": "base64-encoded-pcm-audio-data..."
}
```

#### 4. Commit Audio Buffer
```json
{
  "type": "input_audio_buffer.commit"
}
```

---

### Messages Received FROM Grok

#### 1. Audio Response Chunk
```json
{
  "type": "response.output_audio.delta",
  "delta": "base64-encoded-pcm-audio-data..."
}
```
**IMPORTANT**: Message type is `response.output_audio.delta` (NOT `response.audio.delta`)

#### 2. Transcript Chunk
```json
{
  "type": "response.output_audio_transcript.delta",
  "delta": "Hello"
}
```
**IMPORTANT**: Message type is `response.output_audio_transcript.delta` (NOT `response.text.delta`)

#### 3. Transcript Complete
```json
{
  "type": "response.output_audio_transcript.done",
  "transcript": "Hello, how are you?"
}
```

#### 4. Response Complete
```json
{
  "type": "response.done"
}
```

---

## Rate Limiting Prevention

### Why We Don't Get Rate Limited

Our implementation has **6 protection layers** that prevent HTTP 429 errors:

#### 1. ✅ Connection Reuse (CRITICAL)

```typescript
// ALWAYS check for existing connection FIRST
const existing = this.connections.get(sessionId);
if (existing?.grokWs && existing.isConnected) {
  return existing.grokWs; // REUSE instead of creating new
}
```

**Prevents**: Multiple connections for same session

#### 2. ✅ Singleton Pattern

```typescript
let grokVoiceProxyInstance: GrokVoiceWebSocketProxy | null = null;

export function getGrokVoiceProxy() {
  if (!grokVoiceProxyInstance) {
    grokVoiceProxyInstance = new GrokVoiceWebSocketProxy();
  }
  return grokVoiceProxyInstance; // Single shared instance
}
```

**Prevents**: Multiple proxy instances creating duplicate connections

#### 3. ✅ Lazy Connection

```javascript
// Don't connect on page load
grokVoiceSocket = io(socketUrl, {
  autoConnect: false // Connect only when needed
});

// Only connect when user sends message
if (useGrokVoice && currentSessionId) {
  grokVoiceSocket.connect();
}
```

**Prevents**: Unnecessary connection attempts

#### 4. ✅ Limited Retries

```javascript
const MAX_GROK_CONNECTION_ATTEMPTS = 3; // Max 3 attempts

if (grokConnectionAttempts < MAX_GROK_CONNECTION_ATTEMPTS) {
  setTimeout(() => {
    connectToGrokVoice(currentSessionId);
  }, 2000 * grokConnectionAttempts); // 2s, 4s, 6s backoff
}
```

**Prevents**: Infinite retry loops

#### 5. ✅ Rate Limit Detection

```typescript
grokWs.on('error', (error: any) => {
  const isRateLimited = String(error).includes('429') || 
                       String(error).includes('Too Many Requests');
  if (isRateLimited) {
    console.error('❌❌❌ GROK API RATE LIMITED ❌❌❌');
    // Don't retry - wait for limit to clear
    return;
  }
});
```

**Prevents**: Retrying when rate limited (makes it worse)

#### 6. ✅ Connection State Tracking

```typescript
interface GrokVoiceConnection {
  grokWs: WebSocket | null;
  isConnected: boolean; // Track state
  sessionId: string;
}

private connections: Map<string, GrokVoiceConnection> = new Map();
```

**Prevents**: Creating connection if already connected

---

### Common Mistakes That Cause Rate Limiting

#### ❌ DON'T: Create New Connection Each Time
```javascript
// BAD: Creates new connection every time
function sendMessage() {
  const ws = new WebSocket('wss://api.x.ai/v1/realtime');
  // ... use connection
}
```

#### ✅ DO: Reuse Existing Connection
```typescript
// GOOD: Check for existing connection first
const existing = this.connections.get(sessionId);
if (existing?.grokWs && existing.isConnected) {
  return existing.grokWs; // Reuse
}
```

#### ❌ DON'T: Infinite Retry Loops
```javascript
// BAD: Keeps retrying forever
while (!connected) {
  try {
    await connect();
  } catch (error) {
    await connect(); // Immediate retry - causes rate limiting!
  }
}
```

#### ✅ DO: Limited Retries with Backoff
```javascript
// GOOD: Max 3 attempts with exponential backoff
if (attempts < 3) {
  setTimeout(() => {
    connect();
  }, 2000 * attempts); // 2s, 4s, 6s delays
}
```

---

## Debugging Guide

### Console Log Checklist

#### ✅ Connection Phase

Look for these logs in order:

1. **Socket.io Connection**
   ```
   [primary-agent] ✅ Socket.io connected for Grok Voice
   ```

2. **Grok Voice Connection**
   ```
   [icrm-api] 📨 Received grok-voice:connect event
   [grok-voice-webrtc] ✅ WebSocket connected to Grok Voice Agent API
   ```

3. **Session Configuration**
   ```
   [grok-voice-webrtc] ✅ Session config sent successfully
   [grok-voice-webrtc] ✅ Session configured with voice: ara
   [grok-voice-webrtc] 📢 Emitting session-ready event
   ```

4. **Session Ready**
   ```
   [primary-agent] ✅ Grok Voice connected
   ```

---

#### ✅ Sending Text Message

Look for these logs:

1. **Text Sent**
   ```
   [primary-agent] 📤 Sending to Grok Voice: { sessionId: '...', textLength: 20 }
   ```

2. **Backend Receives**
   ```
   [icrm-api] 📨 Received grok-voice:text event
   [grok-voice-webrtc] 📤 Sending text to Grok
   ```

3. **Backend Sends to Grok**
   ```
   [grok-voice-webrtc] ✅ Conversation item sent to Grok
   [grok-voice-webrtc] ✅ Response creation triggered
   ```

---

#### ✅ Receiving Audio Response

Look for these logs:

1. **Response Creation**
   ```
   [grok-voice-webrtc] 🎬 Response created - Grok is starting to generate audio
   ```

2. **First Audio Chunk**
   ```
   [grok-voice-webrtc] 🎵 Received audio chunk from Grok: { audioSize: 4096 }
   [primary-agent] 📨 Received grok-voice:audio event
   [PERF] ⚡ First audio chunk: 850ms (target: <1000ms)
   ```

3. **Audio Chunks Streaming**
   ```
   [grok-voice-webrtc] 🎵 Received audio chunk from Grok: { audioSize: 4096 }
   [primary-agent] 🔊 Playing audio chunk: 2048 samples
   ```

4. **Response Complete**
   ```
   [grok-voice-webrtc] ✅ Response done for session
   [primary-agent] ✅ Grok Voice response complete
   ```

---

### What to Look For

#### ✅ Success Indicators

- `✅ Socket.io connected`
- `✅ Grok Voice connected`
- `📤 Sending text to Grok`
- `🎬 Response created`
- `🎵 Received audio chunk from Grok`
- `🔊 Playing audio chunk`

#### ❌ Failure Indicators

- `❌ WebSocket connection error`
- `❌❌❌ GROK API RATE LIMITED ❌❌❌`
- `⚠️ No audio received after 5 seconds`
- `❌ Max Grok Voice connection attempts reached`

---

## Troubleshooting

### Issue: No Audio Received

**Symptoms:**
- Text sent successfully
- No audio chunks received
- No errors in console

**Debug Steps:**

1. **Check if response.create was sent:**
   ```
   [grok-voice-webrtc] ✅ Response creation triggered
   ```

2. **Check if Grok is responding:**
   ```
   [grok-voice-webrtc] 🎬 Response created - Grok is starting to generate audio
   ```

3. **Check for audio chunks:**
   ```
   [grok-voice-webrtc] 🎵 Received audio chunk from Grok
   ```
   **IMPORTANT**: Look for `response.output_audio.delta` (NOT `response.audio.delta`)

4. **Check backend is forwarding:**
   ```
   [icrm-api] 📨 Received audio-from-grok event
   ```

**Solutions:**
- Ensure `response.create` is sent 500ms after `conversation.item.create`
- Check Grok API key is valid
- Verify session is properly configured
- Check message type is `response.output_audio.delta`

---

### Issue: HTTP 429 Rate Limited

**Symptoms:**
```
❌❌❌ GROK API RATE LIMITED ❌❌❌
HTTP 429 (Too Many Requests)
```

**Causes:**
- Too many connection attempts
- Retry loops creating multiple connections
- Not reusing existing connections

**Solutions:**
1. **Wait 5-10 minutes** for rate limit to clear
2. **Check connection reuse** is working:
   ```
   [grok-voice-webrtc] Reusing existing Grok connection
   ```
3. **Stop all retry attempts** when rate limited
4. **Use HTTP TTS fallback** until limit clears

**Prevention:**
- Always check for existing connection before creating new
- Use singleton pattern for proxy instance
- Limit retry attempts (max 3)
- Detect rate limits and stop retrying

---

### Issue: WebSocket Connection Fails

**Symptoms:**
- `❌ WebSocket connection error`
- Connection timeout

**Debug Steps:**

1. **Check backend is running:**
   ```bash
   curl http://localhost:1996/api/icrm/health
   ```

2. **Check API key is set:**
   ```bash
   echo $GROK_API_KEY
   ```

3. **Check WebSocket upgrade handler** is configured

4. **Check CORS settings**

**Solutions:**
- Start backend server
- Set `GROK_API_KEY` environment variable
- Verify WebSocket upgrade handler
- Check port configuration

---

### Issue: Wrong Message Types

**Symptoms:**
- No audio received
- Messages not being handled

**Problem:**
Looking for wrong message types:
- ❌ `response.audio.delta` (wrong)
- ✅ `response.output_audio.delta` (correct)

- ❌ `response.text.delta` (wrong)
- ✅ `response.output_audio_transcript.delta` (correct)

**Solution:**
Use correct message types from Grok API:
- Audio: `response.output_audio.delta`
- Transcript: `response.output_audio_transcript.delta`

---

## Testing

### Test 1: Connection

```javascript
// Browser Console
const socket = io('http://localhost:1996', {
  path: '/api/icrm/socket.io'
});

socket.on('connect', () => {
  console.log('✅ Socket.io connected');
  socket.emit('grok-voice:connect', {
    sessionId: 'test-session',
    voice: 'ara'
  });
});

socket.on('grok-voice:connected', (data) => {
  console.log('✅ Grok Voice connected:', data);
});
```

**Expected logs:**
```
[icrm-api] 📨 Received grok-voice:connect event
[grok-voice-webrtc] ✅ WebSocket connected to Grok Voice Agent API
[grok-voice-webrtc] ✅ Session configured with voice: ara
✅ Grok Voice connected
```

---

### Test 2: Send Text Message

```javascript
// After connection established
socket.emit('grok-voice:text', {
  sessionId: 'test-session',
  text: 'Hello, how are you?'
});
```

**Expected logs:**
```
[grok-voice-webrtc] 📤 Sending text to Grok
[grok-voice-webrtc] ✅ Conversation item sent to Grok
[grok-voice-webrtc] ✅ Response creation triggered
[grok-voice-webrtc] 🎬 Response created
[grok-voice-webrtc] 🎵 Received audio chunk from Grok
```

---

### Test 3: Receive Audio

```javascript
socket.on('grok-voice:audio', (data) => {
  console.log('📨 Received audio:', {
    sessionId: data.sessionId,
    audioLength: data.audio.length,
    sampleRate: data.sampleRate
  });
  // Audio should play automatically
});
```

**Expected:**
- Audio chunks received
- Audio plays through speakers
- Transcript updates in UI

---

## Quick Reference

### Key Message Types

**Sent to Grok:**
- `session.update` - Configure voice
- `conversation.item.create` - Send text
- `response.create` - Trigger response
- `input_audio_buffer.append` - Send audio chunk

**Received from Grok:**
- `response.output_audio.delta` - Audio chunk ⚠️ (NOT `response.audio.delta`)
- `response.output_audio_transcript.delta` - Transcript chunk ⚠️ (NOT `response.text.delta`)
- `response.done` - Response complete

### Key Console Logs

- Connection: `✅ Socket.io connected`, `✅ Grok Voice connected`
- Sending: `📤 Sending text to Grok`
- Receiving: `🎵 Received audio chunk from Grok`
- Performance: `⚡ First audio chunk: Xms`

### Critical Implementation Points

1. **Connection Reuse**: Always check for existing connection first
2. **Singleton Pattern**: Use single proxy instance
3. **Lazy Connection**: Connect only when needed
4. **500ms Delay**: Wait between `conversation.item.create` and `response.create`
5. **Correct Message Types**: Use `response.output_audio.delta` (not `response.audio.delta`)
6. **Rate Limit Detection**: Stop retries on HTTP 429

---

## Summary

**To Get Grok Voice Working:**

1. ✅ Set `GROK_API_KEY` environment variable
2. ✅ Create backend WebSocket proxy service (with connection reuse)
3. ✅ Add Socket.io handlers for Grok Voice events
4. ✅ Create frontend service to connect and handle audio
5. ✅ Use correct message types (`response.output_audio.delta`)
6. ✅ Implement rate limiting prevention (connection reuse, singleton, limited retries)
7. ✅ Test connection and message flow
8. ✅ Debug using console logs

**Key Success Factors:**
- Connection reuse prevents rate limiting
- Correct message types (`response.output_audio.delta`)
- 500ms delay between `conversation.item.create` and `response.create`
- Rate limit detection stops retries
- Proper audio format conversion (PCM Int16 ↔ Float32)

Follow this guide step-by-step, and Grok Voice will work correctly without rate limiting issues.

