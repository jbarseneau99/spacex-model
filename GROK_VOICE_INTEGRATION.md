# Grok Voice API Integration Guide

## Overview

This guide explains how to integrate Grok Voice API for real-time bidirectional voice conversations alongside GPT-5.1 for text-based interactions.

## Architecture

### Current Setup
- **Text Chat**: Uses GPT-5.1 via `/api/analyst/browser/chat/stream`
- **Voice Input**: Web Speech API (browser native)
- **Voice Output**: Web Speech API TTS (browser native)

### Proposed Setup
- **Text Chat**: GPT-5.1 (unchanged)
- **Voice Chat**: Grok Voice API for real-time bidirectional voice
- **Fallback**: Web Speech API if Grok unavailable

## Grok Voice API Details

Based on the screenshot and Grok documentation:

### Endpoint
```
POST https://api.x.ai/v1/chat/completions
```

### Voice Parameters
- `voice`: `'alloy'` or `'echo'` (real-time audio I/O)
- Audio input: Base64 encoded audio in `messages` array
- Audio output: Streamed audio response

### Authentication
```javascript
headers: {
  'Authorization': `Bearer ${GROK_API_KEY}`,
  'Content-Type': 'application/json'
}
```

## Implementation Plan

### Phase 1: Add Grok Voice Service

Create `apps/shared/js/grok-voice-service.js`:

```javascript
class GrokVoiceService {
  constructor() {
    this.apiKey = null;
    this.apiBase = 'https://api.x.ai/v1';
    this.isRecording = false;
    this.isSpeaking = false;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.mediaStream = null;
  }

  async initialize(apiKey) {
    this.apiKey = apiKey;
    // Request microphone access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext();
  }

  async startVoiceConversation(onAudioChunk, onTranscript, onError) {
    // Start recording audio
    // Stream to Grok Voice API
    // Handle audio responses
  }

  async stopVoiceConversation() {
    // Stop recording
    // Close streams
  }
}
```

### Phase 2: Integrate with Voice Service

Update `apps/shared/js/voice-service.js` to support Grok:

```javascript
class VoiceService {
  constructor() {
    // ... existing code ...
    this.useGrokVoice = false; // Toggle for Grok vs Web Speech
    this.grokVoiceService = null;
  }

  async enableGrokVoice(apiKey) {
    if (!this.grokVoiceService) {
      const { GrokVoiceService } = await import('./grok-voice-service.js');
      this.grokVoiceService = new GrokVoiceService();
      await this.grokVoiceService.initialize(apiKey);
    }
    this.useGrokVoice = true;
  }

  async startRecording(onTranscript, onError) {
    if (this.useGrokVoice && this.grokVoiceService) {
      return await this.grokVoiceService.startVoiceConversation(
        null, // onAudioChunk
        onTranscript,
        onError
      );
    } else {
      // Use Web Speech API (existing code)
      return await this.startWebSpeechRecording(onTranscript, onError);
    }
  }
}
```

### Phase 3: Backend Support

Add Grok Voice endpoint to `server/analyst-api/src/routes/browser.ts`:

```typescript
// New endpoint for Grok Voice
router.post('/browser/voice/stream', async (req, res) => {
  const { audioData, sessionId, history } = req.body;
  
  // Convert base64 audio to buffer
  // Call Grok Voice API
  // Stream audio response back
});
```

### Phase 4: UI Toggle

Add voice provider selection in settings:
- Web Speech API (default, free, browser native)
- Grok Voice API (premium, real-time bidirectional)

## Configuration

### Environment Variables

```bash
# Grok Voice API
GROK_API_KEY=xai-...
GROK_VOICE_ENABLED=true
GROK_VOICE_MODEL=grok-beta
GROK_VOICE_VOICE=alloy  # or 'echo'
```

### User Settings

Add to user settings:
- Voice provider preference
- Grok API key (encrypted)
- Voice selection (alloy/echo)

## Usage Flow

### Web Speech API (Current)
1. User clicks mic → Web Speech API starts
2. User speaks → Browser transcribes
3. Text sent to GPT-5.1 → Text response
4. Browser TTS speaks response

### Grok Voice API (Proposed)
1. User clicks mic → Grok Voice API starts
2. User speaks → Audio streamed to Grok
3. Grok processes → Audio response streamed back
4. Browser plays audio response
5. Optional: Grok also provides transcript

## Benefits of Grok Voice

1. **Real-time bidirectional**: True voice conversation
2. **Lower latency**: Direct audio streaming
3. **Better quality**: Advanced voice models
4. **Natural pauses**: Better handling of conversation flow
5. **Emotion/intonation**: More natural responses

## Migration Path

1. Keep Web Speech API as default
2. Add Grok Voice as optional premium feature
3. Allow users to toggle between providers
4. Gradually migrate power users to Grok

## Code Changes Needed

1. **New file**: `apps/shared/js/grok-voice-service.js`
2. **Update**: `apps/shared/js/voice-service.js` - Add Grok support
3. **New route**: `server/analyst-api/src/routes/browser.ts` - Voice endpoint
4. **Update**: `apps/analyst-ui/public/js/llm-tools/research-agent-chat.js` - Use Grok when enabled
5. **Settings UI**: Add voice provider selection

## Testing

1. Test Web Speech API (current) - should still work
2. Test Grok Voice API - verify audio streaming
3. Test fallback - if Grok fails, use Web Speech
4. Test toggle - switch between providers

## Cost Considerations

- **Web Speech API**: Free (browser native)
- **Grok Voice API**: Check current pricing
- **GPT-5.1**: Already in use for text

## Next Steps

1. Get Grok API key
2. Implement Grok Voice Service
3. Add backend endpoint
4. Update UI to support both providers
5. Test and refine



