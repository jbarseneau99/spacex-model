# Grok Voice Bidirectional Implementation Guide

## Overview

This document explains exactly how **Bidirectional Voice Conversation** with Grok Voice is implemented. This enables real-time voice conversations where users speak to Grok and receive audio responses.

## Architecture

```
Browser (Frontend)
    ↓ WebSocket (via proxy)
Backend Proxy (/api/analyst/ws/grok-voice)
    ↓ WebSocket (authenticated)
Grok Voice API (wss://api.x.ai/v1/realtime)
```

**Why Backend Proxy?**
- Browser WebSocket API doesn't support custom headers (Authorization)
- Backend proxy handles authentication securely
- Proxy forwards messages bidirectionally

---

## Step-by-Step Implementation

### Step 1: Get Ephemeral Token (Optional but Recommended)

**Endpoint**: `POST /api/analyst/browser/voice-token`

**Backend Implementation**:
```typescript
browserRouter.post('/voice-token', async (req: Request, res: Response) => {
  const grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  
  if (!grokApiKey) {
    return res.status(400).json({ error: 'Grok API key not provided' });
  }
  
  // Request ephemeral token from Grok
  const tokenResponse = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${grokApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      expires_after: { seconds: 300 } // 5 minutes
    })
  });
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    return res.status(tokenResponse.status).json({ 
      error: 'Failed to get ephemeral token',
      details: errorText 
    });
  }
  
  const tokenData = await tokenResponse.json();
  
  // Return client secret (ephemeral token)
  return res.json({
    clientSecret: tokenData.client_secret,
    expiresAt: tokenData.expires_at
  });
});
```

**Frontend Usage**:
```javascript
// Fetch ephemeral token (more secure than sending API key)
const tokenResponse = await fetch('/api/analyst/browser/voice-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});

const tokenData = await tokenResponse.json();
const authToken = tokenData.clientSecret; // Use ephemeral token
```

### Step 2: Connect to Backend WebSocket Proxy

**Frontend Code**:
```javascript
async connectWebSocket() {
  // Determine WebSocket URL (handles port detection)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  const currentPort = window.location.port;

  // Detect if accessing via proxy (port 1999) vs direct (port 1998)
  const isFabricAppPort = currentPort === '1999' || currentPort === '3333';
  let analystPort = currentPort;
  if (isFabricAppPort) {
    analystPort = currentPort === '1999' ? '1998' : '3341';
  }

  const proxyUrl = `${protocol}//${hostname}:${analystPort}/api/analyst/ws/grok-voice`;

  // Connect to backend proxy
  this.ws = new WebSocket(proxyUrl);
  
  this.ws.onopen = () => {
    console.log('WebSocket connected to proxy');
    this.sendSessionConfig();
  };
  
  this.ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  this.ws.onclose = (event) => {
    console.log('WebSocket closed:', event.code, event.reason);
  };
  
  this.ws.onmessage = (event) => {
    this.handleWebSocketMessage(event);
  };
}
```

### Step 3: Backend WebSocket Proxy

**Backend Implementation**:
```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const server = createServer();
const wss = new WebSocketServer({ 
  path: '/api/analyst/ws/grok-voice',
  noServer: true 
});

// Handle HTTP upgrade to WebSocket
server.on('upgrade', (request, socket, head) => {
  if (request.url === '/api/analyst/ws/grok-voice') {
    wss.handleUpgrade(request, socket, head, (clientWs) => {
      wss.emit('connection', clientWs, request);
    });
  }
});

wss.on('connection', (clientWs, req) => {
  const grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  
  if (!grokApiKey) {
    clientWs.close(1008, 'Grok API key not configured');
    return;
  }
  
  // Connect to Grok Voice API
  const grokWs = new WebSocket('wss://api.x.ai/v1/realtime', {
    headers: { 
      'Authorization': `Bearer ${grokApiKey}` 
    }
  });
  
  // Forward messages from client to Grok
  clientWs.on('message', (data) => {
    if (grokWs.readyState === WebSocket.OPEN) {
      grokWs.send(data);
    }
  });
  
  // Forward messages from Grok to client
  grokWs.on('message', (data) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });
  
  // Handle errors
  grokWs.on('error', (error) => {
    console.error('Grok WebSocket error:', error);
    clientWs.close(1011, 'Grok connection error');
  });
  
  clientWs.on('error', (error) => {
    console.error('Client WebSocket error:', error);
    grokWs.close();
  });
  
  // Handle disconnections
  clientWs.on('close', () => {
    if (grokWs.readyState === WebSocket.OPEN) {
      grokWs.close();
    }
  });
  
  grokWs.on('close', () => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close();
    }
  });
});
```

### Step 4: Configure Session

**Frontend Code**:
```javascript
sendSessionConfig() {
  if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
    console.error('WebSocket not open');
    return;
  }
  
  // Official format from xAI docs
  const config = {
    type: 'session.update',
    session: {
      instructions: 'You are a helpful voice assistant. Respond naturally and conversationally.',
      voice: 'Ara', // Ara, Rex, Sal, Eve, or Leo
      turn_detection: {
        type: 'server_vad' // Server-side voice activity detection
      },
      audio: {
        input: {
          format: {
            type: 'audio/pcm', // PCM format
            rate: 24000 // 24kHz sample rate (required)
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
  
  console.log('Sending session config:', JSON.stringify(config, null, 2));
  this.ws.send(JSON.stringify(config));
}
```

### Step 5: Initialize Microphone and Audio Context

**Frontend Code**:
```javascript
async initialize(apiKey, microphoneId = null) {
  this.apiKey = apiKey;
  this.selectedMicrophoneId = microphoneId;
  
  // Request microphone access
  const constraints = {
    audio: microphoneId ? {
      deviceId: { exact: microphoneId }
    } : true
  };
  
  this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  
  // Create AudioContext at 24kHz (Grok requirement)
  this.audioContext = new AudioContext({ sampleRate: 24000 });
  
  console.log('✅ Initialized with microphone:', microphoneId || 'default');
}
```

### Step 6: Capture and Send Audio

**Frontend Code**:
```javascript
async startAudioRecording() {
  if (!this.mediaStream) {
    throw new Error('Media stream not initialized');
  }

  // Grok Voice API requires PCM audio at 24kHz (Int16)
  const source = this.audioContext.createMediaStreamSource(this.mediaStream);
  
  // Use ScriptProcessorNode for audio processing
  const bufferSize = 4096;
  const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
  
  processor.onaudioprocess = (event) => {
    if (!this.isRecording) return;
    
    const inputData = event.inputBuffer.getChannelData(0); // Float32Array [-1, 1]
    
    // Check for silence (optional optimization)
    const maxAmplitude = Math.max(...Array.from(inputData).map(Math.abs));
    if (maxAmplitude < 0.01) {
      return; // Skip silent chunks
    }
    
    // Convert Float32Array to Int16Array (PCM)
    const pcmData = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      // Clamp to [-1, 1] range
      const sample = Math.max(-1, Math.min(1, inputData[i]));
      // Convert to 16-bit PCM: multiply by 32767 for positive, 32768 for negative
      pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    
    // Convert Int16Array to base64 string
    const bytes = new Uint8Array(pcmData.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binary);
    
    // Send to Grok via WebSocket
    this.sendAudioData(base64Audio);
  };
  
  source.connect(processor);
  processor.connect(this.audioContext.destination);
  this.processor = processor;
  
  console.log('✅ Audio recording started (PCM 24kHz Int16)');
}
```

### Step 7: Send Audio to Grok

**Frontend Code**:
```javascript
sendAudioData(base64Audio) {
  if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
    console.warn('WebSocket not open, cannot send audio');
    return;
  }
  
  if (!base64Audio || base64Audio.length === 0) {
    return;
  }
  
  // Official format from xAI docs
  // audio must be base64-encoded PCM (Int16) audio data
  const message = {
    type: 'input_audio_buffer.append',
    audio: base64Audio // Base64 encoded PCM audio (Int16)
  };
  
  try {
    this.ws.send(JSON.stringify(message));
  } catch (error) {
    console.error('Error sending audio:', error);
  }
}

// When user stops speaking, commit the buffer
commitAudioBuffer() {
  if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
    console.warn('WebSocket not open, cannot commit buffer');
    return;
  }
  
  // Official format from xAI docs
  const message = {
    type: 'input_audio_buffer.commit'
  };
  
  console.log('Committing audio buffer');
  this.ws.send(JSON.stringify(message));
}
```

### Step 8: Receive and Play Audio from Grok

**Frontend Code**:
```javascript
handleWebSocketMessage(event) {
  // Handle binary audio (PCM)
  if (event.data instanceof Blob) {
    this.handleBinaryMessage(event.data);
    return;
  }
  
  // Handle ArrayBuffer
  if (event.data instanceof ArrayBuffer) {
    const blob = new Blob([event.data]);
    this.handleBinaryMessage(blob);
    return;
  }
  
  // Handle JSON messages
  if (typeof event.data === 'string') {
    try {
      const message = JSON.parse(event.data);
      console.log('WebSocket message type:', message.type);
      
      switch (message.type) {
        case 'session.created':
          this.sessionId = message.session_id;
          console.log('✅ Session created:', this.sessionId);
          break;
          
        case 'session.updated':
          console.log('✅ Session updated');
          break;
          
        case 'response.audio.delta':
          // Audio chunk (base64 PCM)
          if (message.delta) {
            this.playAudioChunk(message.delta);
          }
          break;
          
        case 'response.audio.done':
          console.log('Audio response complete');
          this.isSpeaking = false;
          break;
          
        case 'response.text.delta':
          // Text transcript chunk (streaming)
          if (message.delta && this.onTranscriptCallback) {
            this.onTranscriptCallback({
              interim: message.delta,
              final: '',
              isFinal: false
            });
          }
          break;
          
        case 'response.text.done':
          // Final transcript
          if (message.text && this.onTranscriptCallback) {
            this.onTranscriptCallback({
              interim: '',
              final: message.text,
              isFinal: true
            });
          }
          break;
          
        case 'error':
          console.error('API error:', message.error);
          if (this.onErrorCallback) {
            this.onErrorCallback(message.error?.message || message.error || 'Grok Voice API error');
          }
          break;
          
        default:
          console.log('Unhandled message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, event.data);
    }
  }
}

async handleBinaryMessage(blob) {
  try {
    // Read Blob as ArrayBuffer (raw PCM data)
    const arrayBuffer = await blob.arrayBuffer();
    
    // Convert ArrayBuffer directly to Int16Array (PCM)
    if (arrayBuffer.byteLength % 2 !== 0) {
      // Pad with zero if odd length
      const paddedBuffer = new ArrayBuffer(arrayBuffer.byteLength + 1);
      new Uint8Array(paddedBuffer).set(new Uint8Array(arrayBuffer));
      this.playAudioFromBuffer(paddedBuffer);
    } else {
      this.playAudioFromBuffer(arrayBuffer);
    }
  } catch (error) {
    console.error('Error handling binary message:', error);
  }
}

playAudioFromBuffer(arrayBuffer) {
  try {
    // Convert ArrayBuffer to Int16Array (PCM)
    const pcmData = new Int16Array(arrayBuffer);
    
    // Convert Int16Array to Float32Array for Web Audio API
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0;
    }
    
    // Create audio buffer (24kHz sample rate)
    const audioBuffer = this.audioContext.createBuffer(1, floatData.length, 24000);
    audioBuffer.getChannelData(0).set(floatData);
    
    // Play audio
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start();
    
    this.isSpeaking = true;
    source.onended = () => {
      this.isSpeaking = false;
    };
    
    console.log('🔊 Playing audio chunk:', floatData.length, 'samples');
  } catch (error) {
    console.error('Error playing audio from buffer:', error);
  }
}

async playAudioChunk(base64Audio) {
  try {
    if (!base64Audio || base64Audio.length === 0) {
      return;
    }
    
    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Play from buffer
    this.playAudioFromBuffer(bytes.buffer);
  } catch (error) {
    console.error('Error playing audio chunk:', error);
  }
}
```

### Step 9: Start and Stop Voice Conversation

**Frontend Code**:
```javascript
async startVoiceConversation(onTranscript, onAudioChunk, onError) {
  if (this.isRecording) {
    console.warn('Already recording, stopping previous session first');
    await this.stopVoiceConversation();
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (!this.apiKey) {
    const error = 'Grok API key not configured';
    console.error(error);
    if (onError) onError(error);
    return false;
  }

  this.onTranscriptCallback = onTranscript;
  this.onAudioChunkCallback = onAudioChunk;
  this.onErrorCallback = onError;
  
  try {
    // Connect WebSocket first
    await this.connectWebSocket();
    
    // Wait for session to be configured
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Start recording audio
    await this.startAudioRecording();
    
    this.isRecording = true;
    console.log('✅ Voice conversation started');
    
    return true;
  } catch (error) {
    console.error('Failed to start voice conversation:', error);
    this.isRecording = false;
    if (onError) onError(error.message || 'Failed to start voice conversation');
    return false;
  }
}

async stopVoiceConversation() {
  if (!this.isRecording && !this.ws) {
    return false;
  }

  try {
    console.log('Stopping voice conversation...');
    
    // Commit any pending audio buffer BEFORE stopping
    // This tells Grok that the user has finished speaking
    this.commitAudioBuffer();
    
    // Wait a moment for commit to be sent
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Stop audio processor
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    // Stop media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
    }

    // Close WebSocket after a delay to allow responses
    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }, 2000); // Wait 2 seconds for Grok to respond

    this.isRecording = false;
    this.isSpeaking = false;
    
    console.log('✅ Voice conversation stopped');
    return true;
  } catch (error) {
    console.error('Failed to stop voice conversation:', error);
    this.isRecording = false;
    return false;
  }
}
```

---

## Complete Flow Diagram

```
User Clicks Mic
    ↓
Frontend: initialize()
    ↓
Get microphone access
    ↓
Create AudioContext (24kHz)
    ↓
Connect: ws://backend/api/analyst/ws/grok-voice
    ↓
Backend Proxy connects to: wss://api.x.ai/v1/realtime
    ↓
Frontend: Send session.update
    ↓
Start audio recording (ScriptProcessorNode)
    ↓
Convert Float32 → Int16 PCM → base64
    ↓
Send: input_audio_buffer.append (continuous)
    ↓
User stops speaking
    ↓
Send: input_audio_buffer.commit
    ↓
Grok processes → streams response
    ↓
Receive: response.audio.delta (binary PCM)
    ↓
Convert PCM → Float32 → Web Audio API
    ↓
Play audio through speakers
    ↓
Receive: response.text.done (transcript)
    ↓
Display transcript in UI
```

---

## Configuration

### Environment Variables

```bash
# Required
GROK_API_KEY=xai-...  # or XAI_API_KEY
```

### Voice Options

- **Ara**: Female, warm, friendly (default)
- **Rex**: Male, confident, clear
- **Sal**: Neutral, smooth, balanced
- **Eve**: Female, energetic, upbeat
- **Leo**: Male, authoritative, strong

### Audio Format

- **Format**: PCM (Int16)
- **Sample Rate**: 24kHz (required)
- **Channels**: Mono (1 channel)
- **Encoding**: Base64 for WebSocket messages

---

## Key Implementation Details

### 1. Audio Format Conversion

**Browser → Grok**:
- Browser: Float32Array [-1, 1] (Web Audio API)
- Convert to: Int16Array [-32768, 32767] (PCM)
- Encode: Base64 string
- Send: JSON message with `audio` field

**Grok → Browser**:
- Receive: Base64 PCM or binary Blob
- Decode: Int16Array
- Convert to: Float32Array [-1, 1]
- Play: Web Audio API AudioBuffer

### 2. WebSocket Message Types

**Client → Grok**:
- `session.update`: Configure voice and audio format
- `input_audio_buffer.append`: Send audio chunk
- `input_audio_buffer.commit`: Signal end of input

**Grok → Client**:
- `session.created`: Session established
- `session.updated`: Configuration confirmed
- `response.audio.delta`: Audio chunk (base64 or binary)
- `response.audio.done`: Audio complete
- `response.text.delta`: Text transcript chunk
- `response.text.done`: Final transcript
- `error`: Error message

### 3. Error Handling

- **WebSocket errors**: Log and retry with exponential backoff
- **Audio errors**: Skip chunk, continue processing
- **Connection timeout**: 5 seconds for connection
- **Silence detection**: Skip sending silent audio chunks (optimization)

### 4. Performance Optimizations

- **Silence detection**: Skip sending silent audio chunks
- **Chunk buffering**: Buffer audio chunks for smooth playback
- **Connection reuse**: Reuse WebSocket connections when possible
- **Latency tracking**: Monitor first audio chunk time (<1s target)

---

## Testing

### Test Voice Token Endpoint

```bash
curl -X POST http://localhost:1998/api/analyst/browser/voice-token \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Test WebSocket Connection

Use browser console or WebSocket testing tool:
```javascript
const ws = new WebSocket('ws://localhost:1998/api/analyst/ws/grok-voice');
ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', event.data);
ws.onerror = (error) => console.error('Error:', error);
```

---

## Common Issues & Solutions

### Issue: WebSocket Connection Fails

**Solution**: 
- Check `GROK_API_KEY` is set
- Verify backend proxy is running
- Check CORS settings
- Ensure WebSocket upgrade handler is configured

### Issue: No Audio Output

**Solution**:
- Verify audio format: PCM Int16, 24kHz
- Check Web Audio API permissions
- Ensure AudioContext is not suspended
- Verify speakers are not muted

### Issue: High Latency

**Solution**:
- Use ephemeral tokens (faster auth)
- Reduce audio chunk size
- Enable silence detection
- Use WebSocket (not HTTP polling)

### Issue: Audio Quality Issues

**Solution**:
- Ensure 24kHz sample rate (required)
- Use proper PCM conversion (Int16)
- Check microphone quality
- Verify no audio compression

---

## Security Considerations

1. **API Key**: Never expose in frontend code
2. **Ephemeral Tokens**: Use for client-side connections
3. **Backend Proxy**: Required for WebSocket authentication
4. **CORS**: Configure properly for WebSocket connections
5. **Rate Limiting**: Implement to prevent abuse

---

## References

- [Grok Voice API Documentation](https://docs.x.ai/docs/guides/voice/agent)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

## How Ara Speaks the Response

### Complete Audio Playback Flow

When Grok generates a response with Ara's voice, here's exactly how it gets played through your speakers:

```
1. Grok Generates Audio (Ara Voice)
   ↓
   Grok Voice API processes the response text
   Uses Ara voice model to generate speech
   Outputs: PCM audio chunks (24kHz, Int16)
   
2. Audio Streamed via WebSocket
   ↓
   Grok sends: response.audio.delta messages
   Format: Binary PCM data OR base64-encoded PCM
   Sample Rate: 24kHz (required)
   Format: Int16 (16-bit signed integers)
   
3. Backend Proxy Forwards Audio
   ↓
   Backend receives binary/base64 audio from Grok
   Converts to base64 if needed
   Forwards via Socket.io: grok-voice:audio event
   
4. Frontend Receives Audio
   ↓
   WebSocket/Socket.io receives audio chunk
   Format: base64-encoded PCM (Int16)
   OR: Binary Blob (raw PCM)
   
5. Convert PCM to Web Audio Format
   ↓
   Decode base64 → Uint8Array → ArrayBuffer
   OR: Blob → ArrayBuffer
   Convert Int16Array → Float32Array
   Formula: float32[i] = int16[i] / 32768.0
   
6. Create Web Audio Buffer
   ↓
   Create AudioBuffer (1 channel, 24kHz)
   Set Float32Array data to buffer channel
   
7. Play Through Speakers
   ↓
   Create AudioBufferSourceNode
   Connect to AudioContext.destination
   Call source.start() to play
   Audio plays through system speakers
```

### Detailed Code Flow

**Step 1: Grok Sends Audio**
```javascript
// Grok sends audio via WebSocket
// Message type: response.audio.delta
{
  type: 'response.audio.delta',
  delta: 'base64-encoded-pcm-data...'  // OR binary Blob
}
```

**Step 2: Frontend Receives Audio**
```javascript
ws.onmessage = (event) => {
  // Handle binary audio (PCM)
  if (event.data instanceof Blob) {
    handleBinaryMessage(event.data);
  }
  // Handle JSON with base64 audio
  else if (typeof event.data === 'string') {
    const message = JSON.parse(event.data);
    if (message.type === 'response.audio.delta' && message.delta) {
      playAudioChunk(message.delta); // base64 PCM
    }
  }
};
```

**Step 3: Convert Base64 to ArrayBuffer**
```javascript
async playAudioChunk(base64Audio) {
  // Convert base64 to ArrayBuffer
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Now we have raw PCM bytes (Int16)
  playAudioFromBuffer(bytes.buffer);
}
```

**Step 4: Convert PCM Int16 to Float32**
```javascript
playAudioFromBuffer(arrayBuffer) {
  // Step 1: Convert ArrayBuffer to Int16Array (PCM)
  const pcmData = new Int16Array(arrayBuffer);
  // pcmData contains: [-32768 to 32767] (16-bit signed integers)
  
  // Step 2: Convert Int16Array to Float32Array for Web Audio API
  const floatData = new Float32Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    // Normalize: Int16 [-32768, 32767] → Float32 [-1.0, 1.0]
    floatData[i] = pcmData[i] / 32768.0;
  }
  // floatData contains: [-1.0 to 1.0] (normalized audio samples)
}
```

**Step 5: Create Audio Buffer**
```javascript
playAudioFromBuffer(arrayBuffer) {
  // ... convert to Float32Array (from Step 4) ...
  
  // Step 3: Create Web Audio API buffer
  const audioBuffer = this.audioContext.createBuffer(
    1,                    // 1 channel (mono)
    floatData.length,     // Number of samples
    24000                 // Sample rate (24kHz - Grok requirement)
  );
  
  // Step 4: Set the audio data
  audioBuffer.getChannelData(0).set(floatData);
  // Channel 0 now contains the Float32 audio samples
}
```

**Step 6: Play Through Speakers**
```javascript
playAudioFromBuffer(arrayBuffer) {
  // ... create audioBuffer (from Step 5) ...
  
  // Step 5: Create audio source node
  const source = this.audioContext.createBufferSource();
  source.buffer = audioBuffer;
  
  // Step 6: Connect to audio output (speakers)
  source.connect(this.audioContext.destination);
  // destination = system audio output (speakers/headphones)
  
  // Step 7: Start playback
  source.start();
  // Audio now plays through speakers!
  
  // Track playback state
  this.isSpeaking = true;
  source.onended = () => {
    this.isSpeaking = false;
  };
}
```

### Audio Format Conversion Details

**Why Convert Formats?**

1. **Grok sends**: PCM Int16 (16-bit signed integers)
   - Range: -32768 to 32767
   - Raw audio data format

2. **Web Audio API needs**: Float32 (32-bit floating point)
   - Range: -1.0 to 1.0
   - Normalized audio format

3. **Conversion Formula**:
   ```javascript
   float32Sample = int16Sample / 32768.0
   ```
   - Divides by 32768 to normalize to [-1.0, 1.0]
   - Preserves audio quality
   - Required for Web Audio API

### Streaming Playback (Gapless)

For smooth playback of multiple audio chunks:

```javascript
// Track next play time for gapless playback
let nextPlayTime = 0;

function playGrokAudioChunk(audioData, sampleRate = 24000) {
  // ... convert and create audioBuffer ...
  
  const now = audioContext.currentTime;
  const chunkDuration = audioBuffer.duration;
  
  // Schedule next chunk to start when previous ends
  let startTime;
  if (nextPlayTime > 0 && nextPlayTime > now) {
    startTime = nextPlayTime; // Smooth continuation
  } else {
    startTime = now; // Start immediately
  }
  
  source.start(startTime);
  
  // Update next play time for next chunk
  nextPlayTime = startTime + chunkDuration;
}
```

This ensures:
- No gaps between audio chunks
- Smooth, continuous speech
- Low latency playback

### Audio Context Management

```javascript
// Initialize AudioContext once (reuse for all chunks)
this.audioContext = new AudioContext({ 
  sampleRate: 24000  // Must match Grok's 24kHz output
});

// Ensure context is running (browsers require user interaction)
if (this.audioContext.state === 'suspended') {
  await this.audioContext.resume();
}

// Connect to system audio output
source.connect(this.audioContext.destination);
// destination = speakers/headphones
```

### Key Points

1. **Audio Format**: Grok sends PCM Int16, browser needs Float32
2. **Sample Rate**: Must be 24kHz (Grok requirement)
3. **Channels**: Mono (1 channel)
4. **Streaming**: Chunks arrive continuously, scheduled for gapless playback
5. **Output**: `AudioContext.destination` = system speakers

---

## Summary

**Bidirectional Voice Implementation**:
1. Frontend connects to backend proxy
2. Backend proxy connects to Grok
3. Frontend captures microphone → PCM → base64 → WebSocket
4. Grok streams audio → PCM → Web Audio API → speakers
5. Transcripts streamed as text messages

**How Ara Speaks**:
1. Grok generates PCM audio (24kHz, Int16) with Ara voice
2. Audio streamed via WebSocket as binary/base64 chunks
3. Frontend receives chunks and converts Int16 → Float32
4. Creates Web Audio API buffer (24kHz, mono)
5. Connects to AudioContext.destination (speakers)
6. Plays chunks with gapless scheduling for smooth speech

**Key Requirements**:
- 24kHz PCM audio format
- WebSocket for real-time streaming
- Backend proxy for authentication
- Proper audio format conversion (Float32 ↔ Int16)
- Web Audio API for playback
