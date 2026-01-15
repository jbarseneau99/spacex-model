# Socket.io Grok Voice Integration

## Overview

The frontend now uses **Socket.io** for Grok Voice communication instead of raw WebSocket. This provides better event handling, automatic reconnection, and cleaner API.

## Architecture

```
Frontend (Browser)
  ↓ Socket.io Client
  ↓ grok-voice-socketio-service.js
Backend Socket.io Server
  ↓ /api/analyst/socket.io
  ↓ server.js (Socket.io handler)
GrokVoiceWebSocketProxy (Singleton)
  ↓ Raw WebSocket
Grok Voice API (wss://api.x.ai/v1/realtime)
```

## Implementation

### Frontend Service

**File**: `js/grok-voice-socketio-service.js`

- Uses Socket.io client library
- Connects to `/api/analyst/socket.io`
- Automatically configures Ada (Eve voice) on connect
- Handles all Grok Voice events via Socket.io

### Socket.io Events

**Client → Server**:
- `grok-voice:connect` - Connect to Grok Voice (with voice: 'eve' for Ada)
- `grok-voice:text` - Send text for TTS

**Server → Client**:
- `grok-voice:connected` - Connection confirmed
- `grok-voice:audio` - Audio chunk received
- `grok-voice:transcript-delta` - Transcript chunk
- `grok-voice:transcript-complete` - Final transcript
- `grok-voice:response-complete` - Response done
- `grok-voice:error` - Error occurred

## Usage

### In app.js

```javascript
// Automatically uses Socket.io if available
if (typeof GrokVoiceSocketIOService !== 'undefined') {
    this.grokVoiceService = new GrokVoiceSocketIOService();
} else {
    // Fallback to WebSocket
    this.grokVoiceService = new GrokVoiceService();
}

// Connect
await this.grokVoiceService.connectSocketIO();

// Send text (Socket.io handles conversation + response automatically)
await this.grokVoiceService.speakText("Hello Ada");
```

### Direct Usage

```javascript
const grokVoiceService = new GrokVoiceSocketIOService();
await grokVoiceService.initialize();
await grokVoiceService.connectSocketIO();

// Set callbacks
grokVoiceService.onTranscript((transcript, isFinal) => {
    console.log('Transcript:', transcript);
});

grokVoiceService.onError((error) => {
    console.error('Error:', error);
});

// Speak text
await grokVoiceService.speakText("Hello, I am Ada");
```

## Ada Configuration

- **Default Voice**: `eve` (British accent)
- **Name**: Ada
- **Role**: Mach33 Assistant
- **Configured**: Automatically on `grok-voice:connect`

## Benefits Over Raw WebSocket

1. **Automatic Reconnection**: Socket.io handles reconnection automatically
2. **Event-Based**: Named events instead of parsing message types
3. **Simpler API**: `speakText()` handles conversation + response automatically
4. **Better Error Handling**: Structured error events
5. **Session Management**: Automatic session ID handling

## Fallback

If Socket.io service is not available, the code falls back to raw WebSocket (`GrokVoiceService`). This ensures backward compatibility.

## Testing

```bash
# Test Socket.io connection
node scripts/test-backend-services.js

# Test in browser
# Open DevTools → Console
# Look for: "✅ Socket.io connected"
# Look for: "📤 Sent grok-voice:connect (Ada - Eve voice)"
```

## Files

- `public/index.html` - Socket.io CDN added
- `js/grok-voice-socketio-service.js` - Socket.io service
- `js/app.js` - Updated to use Socket.io
- `server.js` - Socket.io handlers (already implemented)









