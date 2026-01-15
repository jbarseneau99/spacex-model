# How to Use Grok Voice (Ada) in the UI

## Quick Start

### Step 1: Enable Voice Output

1. Open the **Desktop Agent** panel (click the bot icon in header)
2. Look for the **Voice Output** button (volume icon) in the agent header
3. Click it to enable voice output
4. Icon should change from `volume-x` (muted) to `volume-2` (enabled)

### Step 2: Send a Message

1. Type a message in the agent chat input
2. Press Enter or click Send
3. **Ada will automatically speak the response** (if voice output is enabled)

## Voice Controls

### Voice Output Toggle (`agentVoiceToggleBtn`)
- **Location**: Agent header (top right of agent panel)
- **Icon**: Volume icon (muted/enabled)
- **Function**: Enables/disables audio playback of agent responses
- **When Enabled**: All agent responses are spoken by Ada (Eve voice - British accent)

### Voice Input Toggle (`agentVoiceInputToggleBtn`)
- **Location**: Agent header (next to voice output toggle)
- **Icon**: Microphone icon (off/on)
- **Function**: Enables/disables microphone input for voice conversations
- **When Enabled**: You can speak to the agent (bidirectional voice)

### Voice Record Button (`agentVoiceRecordBtn`)
- **Location**: Agent chat input area
- **Function**: Start/stop voice recording (when voice input is enabled)
- **Usage**: Click to start recording, click again to stop

### Voice Stop Button (`agentVoiceStopBtn`)
- **Location**: Agent chat input area (appears when speaking)
- **Function**: Stop current audio playback
- **Usage**: Click to stop Ada from speaking

## How It Works

### Text-to-Speech (TTS) Mode

1. **Enable Voice Output** (click volume icon)
2. **Send a text message** to the agent
3. **Agent responds** with text
4. **Ada automatically speaks** the response using Grok Voice API
5. **Audio plays** through your speakers

### Bidirectional Voice Mode

1. **Enable Voice Input** (click microphone icon)
2. **Enable Voice Output** (click volume icon)
3. **Click Record button** (mic icon in input area)
4. **Speak** your message
5. **Click Record again** to stop
6. **Agent processes** your voice
7. **Ada responds** with voice

## Testing Voice

### Quick Test

1. Open browser DevTools (F12)
2. Go to Console tab
3. Enable Voice Output in UI
4. Send a message like "Hello Ada"
5. Watch console for:
   - `✅ Socket.io connected`
   - `📤 Sent grok-voice:connect (Ada - Eve voice)`
   - `📤 Sending text via Socket.io (Ada - Eve voice)`
   - `🎵` (audio chunks received)
6. **Listen for Ada** (British accent) speaking

### Console Commands (for testing)

```javascript
// Enable voice output programmatically
app.agentVoiceOutputEnabled = true;
app.toggleAgentVoiceMode();

// Send a test message
app.sendAgentMessage("Hello Ada, can you hear me?");

// Check voice service status
console.log('Voice Output:', app.agentVoiceOutputEnabled);
console.log('Voice Service:', app.grokVoiceService);
console.log('Socket.io Connected:', app.grokVoiceService?.socket?.connected);
```

## Troubleshooting

### No Audio Playing

1. **Check Voice Output**: Make sure volume icon is enabled (not muted)
2. **Check Browser Console**: Look for errors
3. **Check Socket.io Connection**: Should see "✅ Socket.io connected"
4. **Check Audio Context**: Browser may require user interaction first
5. **Check System Volume**: Make sure your speakers are on

### Socket.io Not Connecting

1. **Check Server**: Make sure server is running on port 3333
2. **Check Console**: Look for connection errors
3. **Check Network Tab**: Verify Socket.io connection in Network tab
4. **Check CORS**: Make sure CORS is configured correctly

### Wrong Voice

1. **Check Console**: Should see "voice: eve" in logs
2. **Check Server Logs**: Should see "Ada - Eve voice" configured
3. **Refresh Browser**: Reload page to get latest code

## UI Elements

### Agent Header Buttons

```
[Bot Icon] [Settings] [Voice Input Toggle] [Voice Output Toggle] [Collapse] [Close]
```

### Chat Input Area

```
[Text Input] [Send] [Record Button] [Stop Button]
```

## Code Flow

1. **User enables voice output** → `toggleAgentVoiceMode()`
2. **User sends message** → `sendAgentMessage()`
3. **Agent responds** → `handleAgentResponse()`
4. **Voice enabled?** → `speakWithGrokVoice(text)`
5. **Socket.io connects** → `grokVoiceService.connectSocketIO()`
6. **Text sent** → `grokVoiceService.speakText(text)`
7. **Audio received** → `grok-voice:audio` event
8. **Audio plays** → `playAudioChunk()`
9. **Ada speaks** → British accent voice

## Next Steps

1. **Open the UI** in your browser
2. **Open Desktop Agent** (bot icon)
3. **Enable Voice Output** (volume icon)
4. **Send a message** to test
5. **Listen for Ada** speaking!









