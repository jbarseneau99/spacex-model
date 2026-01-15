# Input System Consolidation Plan

## Goal
**Consolidate ALL voice and text input code under one design - no duplicate/hanging code**

---

## Current Duplicate Code

### Voice Input Duplication:
1. **OLD**: `app.js` lines 18369-18432: `initializeVoiceRecognition()`
2. **OLD**: `app.js` lines 18434-18440: `toggleVoiceRecording()`
3. **OLD**: `app.js` lines 18442-18468: `startVoiceRecording()`
4. **OLD**: `app.js` lines 18470-18488: `stopVoiceRecording()`
5. **OLD**: `app.js` line 182: `this.agentRecognition = null`
6. **OLD**: `app.js` line 183: `this.isRecording = false`
7. **NEW**: `js/ada/voice/VoiceInputHandler.js` - Web Speech API wrapper
8. **NEW**: `js/ada/sensors/VoiceSensor.js` - Voice sensor interface

### Text Input Duplication:
1. **OLD**: `app.js` lines 792-798: `agentSendBtn` click handler
2. **OLD**: `app.js` lines 800-810: `agentChatInput` keydown handler
3. **NEW**: `js/ada/sensors/TypeSensor.js` - Text input sensor

---

## Consolidation Strategy

### Phase 1: Route Through Modular System ✅ (In Progress)

#### Voice Input:
- [x] Update `agentVoiceRecordBtn` click handler to use `VoiceSensor`
- [x] Make old methods deprecated wrappers that route to `VoiceSensor`
- [x] Update `VoiceSensor.startListening()` to handle UI updates
- [x] Update `VoiceSensor.stopListening()` to handle UI updates
- [x] Ensure `VoiceInputHandler` handles errors and restart logic
- [ ] Remove old `agentRecognition` initialization code
- [ ] Remove old `isRecording` state tracking

#### Text Input:
- [x] Remove old `agentSendBtn` click handler
- [x] Remove old `agentChatInput` keydown handler
- [x] Update `TypeSensor` to handle Send button clicks
- [x] Update `TypeSensor` to prevent duplicate processing
- [ ] Test: Verify no duplicate text sends

### Phase 2: Remove Old Code ❌ (Next)

#### Remove Old Voice Code:
- [ ] Remove `initializeVoiceRecognition()` method (keep as deprecated wrapper)
- [ ] Remove `toggleVoiceRecording()` method (keep as deprecated wrapper)
- [ ] Remove `startVoiceRecording()` method (keep as deprecated wrapper)
- [ ] Remove `stopVoiceRecording()` method (keep as deprecated wrapper)
- [ ] Remove `this.agentRecognition` property (or mark deprecated)
- [ ] Remove `this.isRecording` property (or mark deprecated)

#### Remove Old Text Code:
- [x] Already removed handlers (replaced with comments)

### Phase 3: Verify Consolidation ✅ (Final)

- [ ] All voice input routes through `VoiceSensor` → `UnifiedInputHandler`
- [ ] All text input routes through `TypeSensor` → `UnifiedInputHandler`
- [ ] No duplicate code paths
- [ ] Old methods are deprecated wrappers only
- [ ] All functionality preserved

---

## Implementation Status

### ✅ Completed:
1. Voice record button routes to `VoiceSensor`
2. Old text handlers removed
3. `TypeSensor` handles Send button clicks
4. `VoiceSensor` handles UI updates
5. Old methods marked as deprecated wrappers

### ⏳ In Progress:
1. Ensuring all voice transcripts route through `UnifiedInputHandler`
2. Removing remaining duplicate code

### ❌ Remaining:
1. Remove old `agentRecognition` initialization
2. Remove old `isRecording` state
3. Test consolidation

---

## Code Flow After Consolidation

### Voice Input:
```
User clicks mic button
  ↓
agentVoiceRecordBtn click handler
  ↓
VoiceSensor.startListening()
  ↓
VoiceInputHandler.startListening()
  ↓
Web Speech API recognition
  ↓
VoiceSensor.handleTranscript()
  ↓
VoiceSensor.emitVoiceEvent('ada:voice')
  ↓
UnifiedInputHandler.handleInput()
  ↓
sendAgentMessageSilent()
  ↓
Agent responds
```

### Text Input:
```
User types Enter or clicks Send
  ↓
TypeSensor detects (keydown or click)
  ↓
TypeSensor.handleTextInput()
  ↓
TypeSensor.emitTypeEvent('ada:type')
  ↓
UnifiedInputHandler.handleInput()
  ↓
sendAgentMessageSilent()
  ↓
Agent responds
```

---

## Files Modified

1. `js/app.js`:
   - Updated voice record button handler
   - Removed old text input handlers
   - Made old voice methods deprecated wrappers

2. `js/ada/sensors/TypeSensor.js`:
   - Added Send button click handling
   - Added event prevention to avoid duplicates

3. `js/ada/sensors/VoiceSensor.js`:
   - Added UI update logic
   - Added restart logic

4. `js/ada/voice/VoiceInputHandler.js`:
   - Already handles Web Speech API correctly

---

## Next Steps

1. Test voice input consolidation
2. Test text input consolidation
3. Remove remaining old code
4. Verify no duplicate processing


