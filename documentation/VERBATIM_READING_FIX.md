# Verbatim Reading Fix - Current Status

## Problem

1. **Grok not reading verbatim** - Creating narrative instead of reading exactly as written
2. **Odd response before intro** - Unwanted response appearing before Ada's introduction

## Root Cause Analysis

### Issue 1: Verbatim Reading
- Grok Voice API treats `input_text` as **conversational input**, not TTS text
- Session.update instructions may not be strong enough
- Multiple session.update calls might confuse Grok

### Issue 2: Odd Response Before Intro
- `session.update` sent during connection might trigger a response
- Instructions in session.update might be interpreted as a question
- Timing issue - response.create might be sent unintentionally

## Current Fix Attempts

### Attempt 1: Stronger Instructions
- Added explicit "read exactly as written" instructions
- Result: Still not verbatim

### Attempt 2: Session.update Before Each Message
- Send session.update right before each text message
- Result: Caused odd response before intro

### Attempt 3: Verbatim Markers
- Wrap text with `[VERBATIM_START]` and `[VERBATIM_END]`
- Result: Not tested yet

### Attempt 4: Current Approach (Simplified)
- Remove session.update before each message
- Use prefix "Read this aloud exactly as written:" 
- Rely on initial session.update only
- Result: Testing now

## Next Steps to Try

### Option A: Different Message Format
Try using a different content type or format that Grok understands as "read verbatim"

### Option B: Two-Step Process
1. First message: "I will now read text verbatim. Do not add commentary."
2. Second message: The actual text to read

### Option C: Use Different API Endpoint
Check if Grok Voice has a TTS-only endpoint that reads verbatim

### Option D: Post-Process Transcript
Compare what Grok says (transcript) vs what we sent, and re-send if different

## Current Implementation

**File**: `server.js` line ~7774 (`socket.on('grok-voice:text')`)

**Current Flow**:
1. Receive text from frontend
2. Add prefix "Read this aloud exactly as written:"
3. Send conversation.item.create
4. Wait 500ms
5. Send response.create

**No session.update before each message** - This should prevent odd responses

## Testing Checklist

- [ ] Test intro message - should not have odd response before it
- [ ] Test regular message - should read verbatim
- [ ] Check console logs for session.update calls
- [ ] Check console logs for response.create calls
- [ ] Compare transcript with original text


