# Grok Voice WebSocket Message Debugging Guide

## Overview

This guide helps you debug WebSocket messages for Grok Voice bidirectional conversations. It shows exactly what messages are sent/received and how to identify issues.

---

## WebSocket Message Types

### Messages Sent TO Grok (Client → Grok)

#### 1. Session Configuration
```json
{
  "type": "session.update",
  "session": {
    "instructions": "You are a helpful voice assistant.",
    "voice": "Ara",
    "turn_detection": {
      "type": "server_vad"
    },
    "audio": {
      "input": {
        "format": {
          "type": "audio/pcm",
          "rate": 24000
        }
      },
      "output": {
        "format": {
          "type": "audio/pcm",
          "rate": 24000
        }
      }
    }
  }
}
```

**When sent**: When WebSocket first connects  
**Console log**: `[grok-voice-service] Sending session config`

---

#### 2. Send Audio Chunk (Bidirectional Voice)
```json
{
  "type": "input_audio_buffer.append",
  "audio": "base64-encoded-pcm-audio-data..."
}
```

**When sent**: Continuously while user is speaking  
**Console log**: `[grok-voice-service] 📤 Successfully sent audio chunk to WebSocket`  
**Format**: Base64-encoded PCM (Int16), 24kHz, mono

---

#### 3. Commit Audio Buffer (Bidirectional Voice)
```json
{
  "type": "input_audio_buffer.commit"
}
```

**When sent**: When user stops speaking  
**Console log**: `[grok-voice-service] Committing audio buffer`

---

#### 4. Send Text Message (TTS Mode)
```json
{
  "type": "conversation.item.create",
  "item": {
    "type": "message",
    "role": "user",
    "content": [
      {
        "type": "input_text",
        "text": "Hello, how are you?"
      }
    ]
  }
}
```

**When sent**: When user sends text message in voice mode  
**Console log**: `[grok-voice-webrtc] 📤 Sending text to Grok`

**Followed by**:
```json
{
  "type": "response.create",
  "response": {
    "modalities": ["audio", "text"]
  }
}
```

**When sent**: Immediately after conversation.item.create (500ms delay)  
**Console log**: `[grok-voice-webrtc] ✅ Response.create sent to Grok`

---

### Messages Received FROM Grok (Grok → Client)

#### 1. Session Created
```json
{
  "type": "session.created",
  "session_id": "session-12345"
}
```

**When received**: After session.update is sent  
**Console log**: `[grok-voice-service] ✅ Session created: session-12345`

---

#### 2. Session Updated
```json
{
  "type": "session.updated"
}
```

**When received**: After session configuration is confirmed  
**Console log**: `[grok-voice-service] ✅ Session updated`

---

#### 3. Audio Response Chunk (JSON format)
```json
{
  "type": "response.output_audio.delta",
  "delta": "base64-encoded-pcm-audio-data..."
}
```

**When received**: Streaming audio chunks from Grok  
**Console log**: `[grok-voice-webrtc] 🎵 Received audio chunk from Grok`  
**Format**: Base64-encoded PCM (Int16), 24kHz, mono  
**IMPORTANT**: Message type is `response.output_audio.delta` (NOT `response.audio.delta`)

---

#### 4. Audio Response Chunk (Binary format)
```
Binary Blob containing raw PCM audio data
```

**When received**: Alternative format for audio chunks  
**Console log**: `[grok-voice-service] 📦 Received binary audio data: X bytes`  
**Format**: Raw PCM (Int16), 24kHz, mono

---

#### 5. Audio Response Complete
```json
{
  "type": "response.audio.done"
}
```

**When received**: When all audio chunks have been sent  
**Console log**: `[grok-voice-service] Audio response complete`

---

#### 6. Text Transcript Chunk (Streaming)
```json
{
  "type": "response.output_audio_transcript.delta",
  "delta": "Hello, how"
}
```

**When received**: Streaming text transcript  
**Console log**: `[grok-voice-webrtc] 📨 Message: response.output_audio_transcript.delta`  
**IMPORTANT**: Message type is `response.output_audio_transcript.delta` (NOT `response.text.delta`)

---

#### 7. Text Transcript Complete
```json
{
  "type": "response.output_audio_transcript.done",
  "transcript": "Hello, how are you?"
}
```

**When received**: Final complete transcript  
**Console log**: `[grok-voice-webrtc] 📨 Message: response.output_audio_transcript.done`  
**IMPORTANT**: Message type is `response.output_audio_transcript.done` (NOT `response.text.done`)

---

#### 8. Response Complete
```json
{
  "type": "response.done"
}
```

**When received**: When entire response (audio + text) is complete  
**Console log**: `[grok-voice-service] Response complete`

---

#### 9. Error Message
```json
{
  "type": "error",
  "error": {
    "message": "Error description",
    "code": "error_code"
  }
}
```

**When received**: When an error occurs  
**Console log**: `[grok-voice-service] API error: {...}`

---

## Socket.io Events (Frontend ↔ Backend)

### Events Sent FROM Frontend

#### 1. Connect to Grok Voice
```javascript
socket.emit('grok-voice:connect', {
  sessionId: 'session-12345',
  voice: 'ara',
  component: 'primary-agent'
});
```

**Console log**: `[primary-agent] Connecting to Grok Voice...`

---

#### 2. Send Text to Grok Voice
```javascript
socket.emit('grok-voice:text', {
  sessionId: 'session-12345',
  text: 'Hello, how are you?'
});
```

**Console log**: `[primary-agent] 📤 Sending to Grok Voice:`  
**Backend log**: `[icrm-api] 📨 Received grok-voice:text event`

---

### Events Received BY Frontend

#### 1. Grok Voice Connected
```javascript
socket.on('grok-voice:connected', (data) => {
  // data: { sessionId: 'session-12345', voice: 'ara' }
});
```

**Console log**: `[primary-agent] ✅ Grok Voice connected`

---

#### 2. Audio Chunk Received
```javascript
socket.on('grok-voice:audio', (data) => {
  // data: {
  //   sessionId: 'session-12345',
  //   audio: 'base64-encoded-pcm...',
  //   format: 'pcm',
  //   sampleRate: 24000
  // }
});
```

**Console log**: `[primary-agent] 📨 Received grok-voice:audio event`

---

#### 3. Transcript Delta
```javascript
socket.on('grok-voice:transcript-delta', (data) => {
  // data: { sessionId: 'session-12345', transcript: 'Hello, how' }
});
```

**Console log**: `[primary-agent] 📝 Transcript delta: Hello, how`

---

#### 4. Transcript Complete
```javascript
socket.on('grok-voice:transcript-complete', (data) => {
  // data: { sessionId: 'session-12345', transcript: 'Hello, how are you?' }
});
```

**Console log**: `[primary-agent] 📝 Transcript complete: Hello, how are you?`

---

#### 5. Response Complete
```javascript
socket.on('grok-voice:response-complete', (data) => {
  // data: { sessionId: 'session-12345' }
});
```

**Console log**: `[primary-agent] ✅ Grok Voice response complete`

---

#### 6. Error
```javascript
socket.on('grok-voice:error', (data) => {
  // data: { sessionId: 'session-12345', error: 'Error message' }
});
```

**Console log**: `[primary-agent] ❌ Grok Voice error: Error message`

---

## Console Log Checklist

### ✅ Connection Phase

Look for these logs in order:

1. **Socket.io Connection**
   ```
   [primary-agent] ✅ Socket.io connected for Grok Voice
   ```

2. **Grok Voice Connection**
   ```
   [primary-agent] Connecting to Grok Voice...
   [icrm-api] 📨 Received grok-voice:connect event
   ```

3. **Session Configuration**
   ```
   [grok-voice-webrtc] Sending session config...
   [grok-voice-webrtc] ✅ Session config sent successfully
   [grok-voice-webrtc] ✅ Session configured with voice: ara (no confirmation response expected)
   [grok-voice-webrtc] 📢 Emitting session-ready event
   ```
   **IMPORTANT**: Session-ready is emitted IMMEDIATELY after sending session.update. We do NOT wait for session.updated confirmation because Grok doesn't send one.

4. **Session Ready**
   ```
   [primary-agent] ✅ Grok Voice connected
   ```

---

### ✅ Sending Text Message

Look for these logs:

1. **Text Sent**
   ```
   [primary-agent] 📤 Sending to Grok Voice: { sessionId: '...', textLength: 20 }
   [PERF] ✅ Text sent: 5.23ms
   ```

2. **Backend Receives**
   ```
   [icrm-api] 📨 Received grok-voice:text event from [primary-agent]
   [icrm-api] ✅ Calling sendTextToGrok...
   ```

3. **Backend Sends to Grok**
   ```
   [grok-voice-webrtc] 📤 Sending text to Grok: { sessionId: '...', textLength: 20 }
   [grok-voice-webrtc] ✅ Conversation item sent to Grok
   [grok-voice-webrtc] ✅ Response creation triggered - Grok will now generate audio/transcript
   ```
   **IMPORTANT**: There's a 500ms delay between conversation.item.create and response.create

---

### ✅ Receiving Audio Response

Look for these logs:

1. **Response Creation** (Grok starts generating)
   ```
   [grok-voice-webrtc] 🎬 Response created - Grok is starting to generate audio
   ```

2. **First Audio Chunk**
   ```
   [grok-voice-webrtc] 🎵 Received audio chunk from Grok: { sessionId: '...', audioSize: 4096 }
   [icrm-api] 📨 Received audio-from-grok event
   [primary-agent] 📨 Received grok-voice:audio event
   [PERF] ⚡ First audio chunk: 850ms (target: <1000ms)
   ```

3. **Audio Chunks Streaming**
   ```
   [grok-voice-webrtc] 🎵 Received audio chunk from Grok: { audioSize: 4096 }
   [primary-agent] 📨 Received grok-voice:audio event: { audioLength: 4096 }
   [primary-agent] 🔊 Playing audio chunk: 2048 samples
   ```

4. **Audio Complete**
   ```
   [grok-voice-webrtc] ✅ Response done for session: ...
   [primary-agent] ✅ Grok Voice response complete
   ```

---

### ✅ Receiving Transcript

Look for these logs:

1. **Transcript Delta**
   ```
   [grok-voice-webrtc] 📨 Message: response.output_audio_transcript.delta
   [primary-agent] 📝 Transcript delta: Hello
   [primary-agent] 📝 Transcript delta: Hello, how
   ```

2. **Transcript Complete**
   ```
   [grok-voice-webrtc] 📨 Message: response.output_audio_transcript.done
   [primary-agent] 📝 Transcript complete: Hello, how are you?
   ```

---

## Debugging Steps

### Step 1: Check WebSocket Connection

**Open Browser Console** and look for:

```
✅ Good:
[primary-agent] ✅ Socket.io connected for Grok Voice
[primary-agent] ✅ Grok Voice connected

❌ Bad:
[primary-agent] ⚠️ Socket.io connection failed
[primary-agent] ❌ Grok Voice connection timeout
```

**If connection fails:**
- Check backend is running on port 1996
- Check `GROK_API_KEY` is set
- Check CORS settings
- Check WebSocket upgrade handler

---

### Step 2: Check Session Configuration

**Look for:**

```
✅ Good:
[grok-voice-webrtc] 📤 Sending session.update to Grok
[grok-voice-webrtc] ✅ Session configured with voice: ara
[primary-agent] ✅ Grok Voice connected

❌ Bad:
[grok-voice-webrtc] ❌ Session configuration failed
[grok-voice-webrtc] ❌ Session configuration timeout
```

**If session fails:**
- Check Grok API key is valid
- Check voice name is correct (ara, rex, sal, eve, leo)
- Check audio format matches (PCM, 24kHz)

---

### Step 3: Check Text Message Sending

**When you send a text message, look for:**

```
✅ Good:
[primary-agent] 📤 Sending to Grok Voice: { sessionId: '...', textLength: 20 }
[icrm-api] 📨 Received grok-voice:text event
[grok-voice-webrtc] 📤 Sending text to Grok
[grok-voice-webrtc] ✅ Conversation item sent to Grok
[grok-voice-webrtc] ✅ Response.create sent to Grok

❌ Bad:
[primary-agent] ⚠️ Grok Voice not connected
[icrm-api] ❌ Invalid grok-voice:text data
[grok-voice-webrtc] ❌ No active connection for session
```

**If sending fails:**
- Check `isGrokVoiceConnected` is true
- Check `currentSessionId` is set
- Check Socket.io connection is active

---

### Step 4: Check Audio Response

**Look for:**

```
✅ Good:
[icrm-api] 📨 Received audio-from-grok event
[primary-agent] 📨 Received grok-voice:audio event
[PERF] ⚡ First audio chunk: 850ms
[primary-agent] 🔊 Playing audio chunk: 2048 samples

❌ Bad:
[primary-agent] ⚠️ No audio received after 5 seconds
[primary-agent] ❌ Error decoding/playing Grok audio
```

**If no audio:**
- Check Grok is sending `response.audio.delta` messages
- Check backend is forwarding audio events
- Check frontend is receiving Socket.io events
- Check audio format conversion (PCM → Float32)

---

### Step 5: Check Transcript

**Look for:**

```
✅ Good:
[primary-agent] 📝 Transcript delta: Hello
[primary-agent] 📝 Transcript complete: Hello, how are you?

❌ Bad:
[primary-agent] ⚠️ No transcript received
```

**If no transcript:**
- Check Grok is sending `response.text.delta` messages
- Check transcript handlers are registered
- Check sessionId matches

---

## Enable Detailed Logging

### Frontend (Browser Console)

All logs are already enabled. Filter console by:
- `[grok-voice-service]` - WebSocket messages
- `[primary-agent]` - Primary agent panel
- `[PERF]` - Performance metrics

### Backend (Server Console)

All logs are already enabled. Look for:
- `[grok-voice-webrtc]` - Grok WebSocket proxy
- `[icrm-api]` - Socket.io server
- `[chief-of-staff]` - Chief of Staff service

---

## Common Issues & Solutions

### Issue: No "response.output_audio.delta" Messages

**Symptoms:**
- Text sent successfully
- No audio received
- No errors in console

**Debug:**
1. Check if `response.create` was sent:
   ```
   [grok-voice-webrtc] ✅ Response creation triggered - Grok will now generate audio/transcript
   ```

2. Check if Grok is responding:
   ```
   [grok-voice-webrtc] 🎬 Response created - Grok is starting to generate audio
   [grok-voice-webrtc] 🎵 Received audio chunk from Grok
   ```
   **IMPORTANT**: Look for `response.output_audio.delta` (NOT `response.audio.delta`)

3. Check backend is forwarding:
   ```
   [icrm-api] 📨 Received audio-from-grok event
   ```

4. Check all messages from Grok:
   ```
   [grok-voice-webrtc] 📨 Message: <message-type>
   ```
   This logs ALL non-audio messages. Audio messages are logged separately.

**Solution:**
- Ensure `response.create` is sent 500ms after `conversation.item.create`
- Check Grok API key is valid
- Check session is properly configured
- Verify `expectingResponse` flag is set to true

---

### Issue: WebSocket Connection Fails

**Symptoms:**
- `[primary-agent] ⚠️ Socket.io connection failed`
- No connection logs

**Debug:**
1. Check backend is running:
   ```bash
   curl http://localhost:1996/api/icrm/health
   ```

2. Check Socket.io path:
   ```
   Path: /api/icrm/socket.io
   ```

3. Check CORS settings

**Solution:**
- Start backend server
- Check port configuration
- Verify Socket.io path matches

---

### Issue: Audio Not Playing

**Symptoms:**
- Audio chunks received
- No sound from speakers

**Debug:**
1. Check audio format conversion:
   ```
   [primary-agent] 🔊 Playing audio chunk: 2048 samples
   ```

2. Check AudioContext state:
   ```javascript
   console.log(audioContext.state); // Should be "running"
   ```

3. Check browser audio permissions

**Solution:**
- Ensure AudioContext is resumed
- Check browser audio settings
- Verify audio device selection

---

## Testing Checklist

### Test 1: Connection
- [ ] Socket.io connects
- [ ] Grok Voice connects
- [ ] Session configured
- [ ] Session ready event received

### Test 2: Send Text
- [ ] Text message sent
- [ ] Backend receives `grok-voice:text`
- [ ] Backend sends to Grok
- [ ] `conversation.item.create` sent
- [ ] `response.create` sent

### Test 3: Receive Audio
- [ ] `response.audio.delta` messages received
- [ ] Backend forwards audio events
- [ ] Frontend receives `grok-voice:audio`
- [ ] Audio chunks played
- [ ] First chunk latency < 1000ms

### Test 4: Receive Transcript
- [ ] `response.text.delta` messages received
- [ ] Transcript displayed in UI
- [ ] `response.text.done` received
- [ ] Final transcript displayed

### Test 5: Complete Response
- [ ] `response.done` received
- [ ] `response-complete` event emitted
- [ ] Handlers cleaned up
- [ ] Ready for next message

---

## Quick Debug Commands

### Check WebSocket Connection (Browser Console)
```javascript
// Check Socket.io connection
console.log('Socket connected:', grokVoiceSocket?.connected);

// Check Grok Voice connection
console.log('Grok Voice connected:', isGrokVoiceConnected);

// Check current session
console.log('Session ID:', currentSessionId);
```

### Check Audio Context (Browser Console)
```javascript
// Check AudioContext state
console.log('AudioContext state:', grokVoiceAudioContext?.state);

// Resume if suspended
if (grokVoiceAudioContext?.state === 'suspended') {
  await grokVoiceAudioContext.resume();
}
```

### Monitor WebSocket Messages (Browser Console)
```javascript
// Intercept WebSocket messages
const originalOnMessage = WebSocket.prototype.onmessage;
WebSocket.prototype.onmessage = function(event) {
  console.log('📨 WebSocket message:', event.data);
  return originalOnMessage.call(this, event);
};
```

---

## Summary

**Key Message Types (CORRECTED):**
- **Sent**: `session.update`, `input_audio_buffer.append`, `conversation.item.create`, `response.create`
- **Received**: `response.create` (confirmation), `response.output_audio.delta`, `response.output_audio_transcript.delta`, `response.done`

**IMPORTANT CORRECTIONS:**
- Audio messages: `response.output_audio.delta` (NOT `response.audio.delta`)
- Transcript messages: `response.output_audio_transcript.delta` (NOT `response.text.delta`)
- Session: We do NOT wait for `session.updated` - session-ready is emitted immediately
- Response delay: 500ms between `conversation.item.create` and `response.create`

**Key Console Logs:**
- Connection: `✅ Socket.io connected`, `✅ Grok Voice connected`
- Sending: `📤 Sending to Grok Voice`, `📤 Sending text to Grok`
- Receiving: `🎵 Received audio chunk from Grok`, `📨 Message: response.output_audio.delta`
- Performance: `⚡ First audio chunk: Xms`

**Debugging Order:**
1. Check connection
2. Check session configuration (immediate, no wait)
3. Check text sending (conversation.item.create → 500ms delay → response.create)
4. Check response creation confirmation (`🎬 Response created`)
5. Check audio receiving (`🎵 Received audio chunk`)
6. Check transcript receiving (`response.output_audio_transcript.delta`)

---

## Complete Working Flow (From Implementation)

### How Text is Sent and Audio is Received

Based on the actual working implementation:

#### Step 1: Session Configuration (NO WAIT)
```typescript
// Backend: grok-voice-webrtc.service.ts
// When WebSocket opens:
grokWs.send(JSON.stringify({
  type: 'session.update',
  session: { voice: 'ara', ... }
}));

// IMMEDIATELY emit session-ready (no waiting for confirmation)
this.emit('session-ready', { sessionId, voice });
```

**Console logs:**
```
[grok-voice-webrtc] ✅ Session config sent successfully
[grok-voice-webrtc] ✅ Session configured with voice: ara (no confirmation response expected)
[grok-voice-webrtc] 📢 Emitting session-ready event
```

**Key Point**: We do NOT wait for `session.updated`. Session is ready immediately.

---

#### Step 2: Send Text Message
```typescript
// Backend: grok-voice-webrtc.service.ts
// Step 1: Send conversation item
connection.grokWs.send(JSON.stringify({
  type: 'conversation.item.create',
  item: {
    type: 'message',
    role: 'user',
    content: [{ type: 'input_text', text: text }]
  }
}));

// Step 2: Wait 500ms, then send response.create
setTimeout(() => {
  connection.grokWs.send(JSON.stringify({
    type: 'response.create',
    response: { modalities: ['audio', 'text'] }
  }));
  connection.expectingResponse = true;
}, 500);
```

**Console logs:**
```
[grok-voice-webrtc] 📤 Sending text to Grok: { sessionId: '...', textLength: 20 }
[grok-voice-webrtc] ✅ Conversation item sent to Grok
[grok-voice-webrtc] ✅ Response creation triggered - Grok will now generate audio/transcript
```

**Key Point**: 500ms delay between `conversation.item.create` and `response.create`.

---

#### Step 3: Receive Audio Response
```typescript
// Backend: grok-voice-webrtc.service.ts
grokWs.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  // Look for: response.output_audio.delta (NOT response.audio.delta)
  if (message.type === 'response.output_audio.delta' && message.delta) {
    const audioData = Buffer.from(message.delta, 'base64');
    this.emit('audio-from-grok', { sessionId, audioData });
  }
});
```

**Console logs:**
```
[grok-voice-webrtc] 🎬 Response created - Grok is starting to generate audio
[grok-voice-webrtc] 🎵 Received audio chunk from Grok: { sessionId: '...', audioSize: 4096 }
[grok-voice-webrtc] 🎵 Received audio chunk from Grok: { audioSize: 4096 }
[grok-voice-webrtc] 🎵 Received audio chunk from Grok: { audioSize: 4096 }
...
[grok-voice-webrtc] ✅ Response done for session: ...
```

**Key Point**: Message type is `response.output_audio.delta` (NOT `response.audio.delta`).

---

#### Step 4: Receive Transcript
```typescript
// Backend: grok-voice-webrtc.service.ts
// Look for: response.output_audio_transcript.delta (NOT response.text.delta)
if (message.type === 'response.output_audio_transcript.delta' && message.delta) {
  this.emit('transcript-delta', { sessionId, transcript: message.delta });
}

if (message.type === 'response.output_audio_transcript.done' && message.transcript) {
  this.emit('transcript-complete', { sessionId, transcript: message.transcript });
}
```

**Console logs:**
```
[grok-voice-webrtc] 📨 Message: response.output_audio_transcript.delta
[grok-voice-webrtc] 📨 Message: response.output_audio_transcript.delta
...
[grok-voice-webrtc] 📨 Message: response.output_audio_transcript.done
```

**Key Point**: Message types are `response.output_audio_transcript.delta/done` (NOT `response.text.delta/done`).

---

## What to Look For When Debugging

### ✅ Success Indicators

1. **Session Configuration**
   - `✅ Session config sent successfully`
   - `📢 Emitting session-ready event`
   - `✅ Grok Voice connected` (frontend)

2. **Text Sending**
   - `📤 Sending text to Grok`
   - `✅ Conversation item sent to Grok`
   - `✅ Response creation triggered`

3. **Response Generation**
   - `🎬 Response created - Grok is starting to generate audio`
   - `🎵 Received audio chunk from Grok` (multiple times)
   - `📨 Message: response.output_audio_transcript.delta` (multiple times)

4. **Completion**
   - `✅ Response done for session`
   - `✅ Grok Voice response complete` (frontend)

### ❌ Failure Indicators

1. **No Response Creation**
   - Missing: `🎬 Response created`
   - Check: Did `response.create` get sent?
   - Check: Is `expectingResponse` flag set?

2. **No Audio Chunks**
   - Missing: `🎵 Received audio chunk from Grok`
   - Check: Are you looking for `response.output_audio.delta`?
   - Check: Is Grok API key valid?
   - Check: Is session properly configured?

3. **Wrong Message Types**
   - Looking for: `response.audio.delta` ❌
   - Should be: `response.output_audio.delta` ✅
   - Looking for: `response.text.delta` ❌
   - Should be: `response.output_audio_transcript.delta` ✅

---

## Enhanced Logging for Debugging

To see ALL messages from Grok, add this to the backend:

```typescript
// In grok-voice-webrtc.service.ts, grokWs.on('message')
grokWs.on('message', (data: WebSocket.Data) => {
  try {
    const message = JSON.parse(data.toString());
    
    // LOG ALL MESSAGES (including audio deltas)
    console.log('[grok-voice-webrtc] 📨 Grok → Client:', {
      type: message.type,
      hasDelta: !!message.delta,
      hasTranscript: !!message.transcript,
      deltaLength: message.delta?.length,
      transcriptLength: message.transcript?.length,
      responseId: message.response?.id,
      responseStatus: message.response?.status
    });
    
    // ... rest of message handling
  } catch (error) {
    console.error('[grok-voice-webrtc] Error parsing message:', error);
  }
});
```

This will show you EVERY message type Grok sends, helping identify what's missing.

## Detailed Message Flow

### Complete Flow for Text Message:

```
1. Frontend sends text:
   socket.emit('grok-voice:text', { sessionId, text })

2. Backend receives:
   [icrm-api] 📨 Received grok-voice:text event

3. Backend sends to Grok:
   [grok-voice-webrtc] 📤 Sending text to Grok
   → Send: conversation.item.create
   [grok-voice-webrtc] ✅ Conversation item sent to Grok
   → Wait 500ms
   → Send: response.create
   [grok-voice-webrtc] ✅ Response creation triggered

4. Grok responds:
   [grok-voice-webrtc] 🎬 Response created - Grok is starting to generate audio
   [grok-voice-webrtc] 🎵 Received audio chunk from Grok (multiple times)
   [grok-voice-webrtc] 📨 Message: response.output_audio_transcript.delta (multiple times)
   [grok-voice-webrtc] 📨 Message: response.output_audio_transcript.done
   [grok-voice-webrtc] ✅ Response done for session

5. Backend forwards to frontend:
   [icrm-api] 📨 Received audio-from-grok event
   socket.emit('grok-voice:audio', { sessionId, audio })
   socket.emit('grok-voice:transcript-delta', { sessionId, transcript })
   socket.emit('grok-voice:response-complete', { sessionId })

6. Frontend receives:
   [primary-agent] 📨 Received grok-voice:audio event
   [primary-agent] 🔊 Playing audio chunk
   [primary-agent] 📝 Transcript delta: ...
   [primary-agent] ✅ Grok Voice response complete
```

