# Ada - Mach33 Assistant

## Overview

**Ada** is the Mach33 Assistant voice interface, powered by Grok Voice API.

## Voice Configuration

- **Name**: Ada
- **Voice**: Eve (British accent)
- **Description**: Female, British accent, rich emotional expression
- **API Voice Code**: `eve`

## Configuration

### Default Settings

Ada uses the **Eve** voice from Grok Voice API, which provides a British accent.

**Server Default** (`server.js`):
```javascript
voice = 'eve' // Default Mach33 Assistant voice
```

**Frontend Default** (`js/grok-voice-service.js`):
```javascript
voice: 'eve', // Ada uses Eve voice (British accent)
instructions: 'You are Ada, the Mach33 Assistant. You are a helpful voice assistant with a British accent. Respond naturally and conversationally, and identify yourself as Ada when appropriate.'
```

### Available Voices

If you want to change the voice, these are available:

1. **Ara** - Female, warm, friendly (default Grok voice)
2. **Rex** - Male, confident, clear
3. **Sal** - Neutral, smooth, balanced
4. **Eve** - Female, British accent, rich emotional expression ⭐ **Ada uses this**
5. **Leo** - Male, authoritative, strong

## Usage

### In Frontend Code

```javascript
// Ada is the default - no configuration needed
const grokVoiceService = new GrokVoiceService();
await grokVoiceService.connectWebSocket();
// Ada (Eve voice) will be used automatically
```

### Override Voice (if needed)

```javascript
// To use a different voice temporarily
socket.emit('grok-voice:connect', {
  sessionId: 'your-session-id',
  voice: 'eve' // or 'ara', 'rex', 'sal', 'leo'
});
```

### Testing Ada

```bash
# Test Ada voice
node scripts/play-grok-voice.js "Hello, I am Ada, the Mach33 Assistant"

# Test with different text
node scripts/test-voices.js eve "Hello Brant, this is Ada speaking"
```

## Identity

Ada identifies herself as:
- **Name**: Ada
- **Role**: Mach33 Assistant
- **Voice**: British accent (Eve)
- **Personality**: Helpful, conversational, natural

## Implementation Notes

- Voice is set per-session, not per-connection
- The shared Grok connection supports multiple sessions with different voices
- Ada (Eve) is the default for all new sessions
- Instructions include Ada's identity and British accent

## Files Updated

- `server.js` - Default voice changed to 'eve'
- `js/grok-voice-service.js` - Default voice and instructions updated
- `scripts/play-grok-voice.js` - Updated to use Ada

## Testing

All voice tests now default to Ada (Eve voice):

```bash
# Quick test
node scripts/play-grok-voice.js "Hello"

# Full voice test
node scripts/test-voices.js eve "Hello, I'm Ada"
```










