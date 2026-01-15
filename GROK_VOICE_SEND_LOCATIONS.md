# Grok Voice - All Places Sending Messages

## Production Code (4 Places)

### 1. **server.js** - Socket.io Handler (PRIMARY PATH)
**Location**: `server.js:7659-7709`
**Trigger**: `socket.on('grok-voice:text')`
**What it sends**:
- `conversation.item.create` with text
- `response.create` (500ms delay)

**Status**: ✅ Currently active - sends text directly

---

### 2. **js/app.js** - Direct WebSocket (FALLBACK PATH)
**Location**: `js/app.js:19050-19125`
**Trigger**: When Socket.io NOT available
**What it sends**:
- `conversation.item.create` with text
- `response.create` (500ms delay)

**Status**: ⚠️ Fallback path - might not be used

---

### 3. **js/grok-voice-service.js** - WebSocket Service
**Location**: `js/grok-voice-service.js:287` (session.update), `js/grok-voice-service.js:377` (audio), `js/grok-voice-service.js:419` (response.create)
**Trigger**: Audio recording mode
**What it sends**:
- `session.update` on connect
- `input_audio_buffer.append` (audio chunks)
- `input_audio_buffer.commit`
- `response.create` (500ms delay)

**Status**: ⚠️ For audio input mode, not TTS

---

### 4. **js/grok-voice-socketio-service.js** - Socket.io Service
**Location**: `js/grok-voice-socketio-service.js:275`
**Trigger**: `speakText()` method
**What it sends**:
- Emits `grok-voice:text` event (which goes to #1 above)

**Status**: ✅ This is the main frontend entry point

---

## The Flow

```
User calls speakText()
  ↓
js/grok-voice-socketio-service.js:275
  ↓ emits 'grok-voice:text'
  ↓
server.js:7659 (Socket.io handler)
  ↓ sends to Grok
  ↓
Grok Voice API
```

## Problem: Session Instructions Being Read

**Issue**: Grok is reading the `session.update` instructions as text instead of the actual `input_text`.

**Current session.update instructions** (in `js/grok-voice-service.js:246`):
```
'You are Ada, the Mach33 Assistant with a British accent. When you receive input_text messages, read them exactly as written without interpretation.'
```

**Possible causes**:
1. Session instructions are being read as introductory text
2. Conversation history is being included
3. Multiple session.update calls are interfering

## Solution: Simplify Everything

1. **Remove ALL instructions from session.update** - Just set voice
2. **Send text directly** - No session.update before each text
3. **No conversation history** - Each text is standalone


