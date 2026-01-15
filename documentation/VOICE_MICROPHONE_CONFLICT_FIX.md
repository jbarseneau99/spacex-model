# Voice Output Microphone Conflict Fix

## Problem

When the microphone (voice input) was enabled, voice output (Ada speaking) was not working properly. This was caused by a conflict between:

1. **Web Speech API** (microphone input) - Uses the microphone for speech recognition
2. **Grok Voice API** (voice output) - Uses AudioContext for audio playback

## Root Cause

When both microphone input and voice output were active simultaneously:
- The microphone (Web Speech API) was holding audio resources
- Audio playback (Grok Voice) couldn't properly access AudioContext
- This caused voice output to fail or play incorrectly

## Solution

Implemented **automatic microphone pause/resume** during voice output:

### When Voice Output Starts:
1. **Pause microphone** (Web Speech API) if it's currently listening
2. **Track state** - Remember if microphone was listening before pausing
3. **Start voice output** - Play Ada's response

### When Voice Output Completes:
1. **Resume microphone** (Web Speech API) if it was listening before
2. **Only resume if** voice input toggle is still enabled
3. **Small delay** (500ms) to ensure audio playback has fully stopped

## Implementation

### Modified Files:

1. **`js/ada/voice/VoiceOutputHandler.js`**:
   - Added `app` parameter to constructor (for accessing VoiceSensor)
   - Added `pauseMicrophoneIfListening()` method
   - Added `resumeMicrophoneIfWasListening()` method
   - Added `setupAudioCompletionCallback()` to listen for audio completion
   - Modified `speakVerbatim()` to pause microphone before speaking
   - Modified `stop()` to resume microphone when stopping

2. **`js/ada/AdaInputSystem.js`**:
   - Updated `getVoiceOutputHandler()` to pass app instance to VoiceOutputHandler

## How It Works

```
User enables microphone (voice input)
  ↓
Web Speech API starts listening
  ↓
User sends message → Ada responds
  ↓
VoiceOutputHandler.speakVerbatim() called
  ↓
[PAUSE] Microphone stops listening (prevents conflict)
  ↓
Grok Voice plays audio response
  ↓
Audio playback completes (grok-voice:response-complete event)
  ↓
[RESUME] Microphone resumes listening (if still enabled)
```

## Benefits

✅ **No conflicts** - Microphone and audio playback don't interfere  
✅ **Automatic** - User doesn't need to manually pause/resume  
✅ **Seamless** - Microphone automatically resumes after Ada finishes speaking  
✅ **Smart** - Only pauses if microphone is actually listening  

## Testing

To test the fix:

1. **Enable microphone** (click microphone icon in Ada header)
2. **Enable voice output** (click volume icon in Ada header)
3. **Send a message** to Ada
4. **Verify**:
   - ✅ Microphone pauses when Ada starts speaking
   - ✅ Ada's voice plays correctly
   - ✅ Microphone resumes after Ada finishes speaking
   - ✅ No audio conflicts or errors

## Status: ✅ **FIXED**

The microphone conflict with voice output has been resolved. Voice output now works correctly even when the microphone is enabled.

