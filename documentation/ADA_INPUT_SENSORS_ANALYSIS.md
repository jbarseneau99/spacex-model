# Ada Input Sensors Analysis - Current Design

## Executive Summary

**Current State**: Ada has **partial** support for three input types, but they're **not unified** and have **inconsistent handling**. The architecture needs redesign to properly support Click, Type, and Voice as **first-class input sensors**.

---

## Current Input Handling Architecture

### 1. **CLICK Input** (Partially Implemented)

#### Current Implementation:
- **Location**: `js/app.js` - `handleElementSelection()`
- **What Works**:
  - ✅ Chart clicks (competitor stocks, data points)
  - ✅ Navigation clicks (view switching)
  - ✅ Button clicks (calculate, save)
  - ✅ Stock tile clicks

- **What's Missing**:
  - ❌ Report section clicks (paragraphs, headings, tables)
  - ❌ Image clicks (with coordinates)
  - ❌ Unified click handler
  - ❌ Click context extraction

#### Current Flow:
```
User clicks chart element
  ↓
handleElementSelection() called
  ↓
Extract selection info (chartId, label, value)
  ↓
sendAgentMessageSilent(message, stockInfo)
  ↓
Agent responds
```

#### Code Location:
- `js/app.js` line ~17623: `sendAgentMessageSilent()`
- `js/agent-enhanced/integration-layer.js`: Chart click tracking
- `js/app.js` line ~615: Navigation click handlers

#### Issues:
1. **No unified click handler** - clicks handled in multiple places
2. **Limited context extraction** - only chart data, not UI element context
3. **No click coordinate tracking** - can't identify what was clicked
4. **Inconsistent response** - some clicks trigger agent, others don't

---

### 2. **TYPE Input** (Fully Implemented)

#### Current Implementation:
- **Location**: `js/app.js` - `sendAgentMessage()`
- **What Works**:
  - ✅ Text input in agent chat
  - ✅ Enter key submission
  - ✅ Send button click
  - ✅ Full context building (model data, navigation history)
  - ✅ Relationship detection
  - ✅ History tracking

#### Current Flow:
```
User types in agent chat input
  ↓
Press Enter or click Send
  ↓
sendAgentMessage() called
  ↓
Build context (current view, model, history)
  ↓
POST /api/agent/chat-enhanced
  ↓
Agent responds with text
  ↓
If voice enabled → speakAgentResponse()
```

#### Code Location:
- `js/app.js` line ~17623: `sendAgentMessageSilent()`
- `js/app.js` line ~17788: `sendAgentMessage()` (with UI)
- `server.js` line ~7774: `socket.on('grok-voice:text')`

#### Issues:
1. **Only works in agent chat** - can't type elsewhere to trigger Ada
2. **No text selection handling** - selecting text doesn't trigger Ada
3. **No command parsing** - treats all text as questions

---

### 3. **VOICE Input** (Partially Implemented)

#### Current Implementation:
- **Location**: `js/grok-voice-socketio-service.js`
- **What Works**:
  - ✅ Voice output (TTS) - Grok Voice API
  - ✅ Voice input toggle (microphone icon)
  - ✅ Socket.io connection to backend
  - ✅ Audio playback

- **What's Missing**:
  - ❌ **Bidirectional voice** - can't speak to Ada yet
  - ❌ **Voice-to-text conversion** - no speech recognition
  - ❌ **Voice command handling** - no voice command parsing
  - ❌ **Voice context** - voice input doesn't include UI context

#### Current Flow (TTS Only):
```
Agent generates text response
  ↓
speakAgentResponse() called
  ↓
speakWithGrokVoice(text)
  ↓
grokVoiceService.speakText(text)
  ↓
Socket.io emit('grok-voice:text')
  ↓
Backend sends to Grok Voice API
  ↓
Audio chunks received
  ↓
Play via Web Audio API
```

#### Code Location:
- `js/app.js`: `speakAgentResponse()`, `speakWithGrokVoice()`
- `js/grok-voice-socketio-service.js`: `speakText()`
- `server.js` line ~7774: `socket.on('grok-voice:text')`

#### Issues:
1. **No voice input** - can't speak to Ada, only hear responses
2. **No speech recognition** - Web Speech API not integrated
3. **Voice doesn't include context** - no UI state awareness
4. **Grok creating narrative** - not reading verbatim (current bug)

---

## Current Architecture Problems

### 1. **No Unified Input Handler**
- Each input type handled separately
- No common interface or abstraction
- Inconsistent context extraction

### 2. **Inconsistent Context Building**
- **Type**: Full context (model, history, navigation)
- **Click**: Limited context (chart data only)
- **Voice**: No context (just text)

### 3. **No Input Sensor Abstraction**
- No `InputSensor` interface
- No unified `processInput()` method
- No input type detection/routing

### 4. **Voice Output Issues**
- Grok creating narrative instead of reading verbatim
- No proper TTS mode vs conversation mode
- Session instructions not working correctly

---

## Proposed New Architecture

### **Three Input Sensors Design**

```
┌─────────────────────────────────────────────────┐
│           Ada Input Sensor Layer                │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  CLICK   │  │   TYPE   │  │  VOICE   │     │
│  │  Sensor  │  │  Sensor  │  │  Sensor  │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       │             │             │            │
│       └─────────────┼─────────────┘            │
│                     │                           │
│         ┌───────────▼───────────┐             │
│         │  Unified Input Handler │             │
│         │  - Detect input type   │             │
│         │  - Extract context     │             │
│         │  - Build request       │             │
│         └───────────┬───────────┘             │
│                     │                           │
│         ┌───────────▼───────────┐             │
│         │  Context Builder      │             │
│         │  - UI state           │             │
│         │  - History            │             │
│         │  - Model data         │             │
│         └───────────┬───────────┘             │
│                     │                           │
│         ┌───────────▼───────────┐             │
│         │  Agent Communication │             │
│         │  - Relationship det  │             │
│         │  - Response gen       │             │
│         └───────────┬───────────┘             │
│                     │                           │
│         ┌───────────▼───────────┐             │
│         │  Response Handler     │             │
│         │  - Text display       │             │
│         │  - Voice output       │             │
│         └───────────────────────┘             │
└─────────────────────────────────────────────────┘
```

### **Key Components**

#### 1. **ClickSensor**
```javascript
class ClickSensor {
  // Detect clicks on:
  // - Charts (data points, axes, legends)
  // - UI elements (buttons, tiles, cards)
  // - Report sections (paragraphs, headings, tables)
  // - Images (with coordinates)
  
  handleClick(event) {
    const context = this.extractClickContext(event);
    return {
      type: 'click',
      element: context.element,
      coordinates: context.coords,
      data: context.data,
      uiState: this.getUIState()
    };
  }
}
```

#### 2. **TypeSensor**
```javascript
class TypeSensor {
  // Handle:
  // - Agent chat input
  // - Text selection
  // - Command parsing
  
  handleType(text, source) {
    return {
      type: 'type',
      text: text,
      source: source, // 'chat', 'selection', 'command'
      context: this.getContext()
    };
  }
}
```

#### 3. **VoiceSensor**
```javascript
class VoiceSensor {
  // Handle:
  // - Speech recognition (Web Speech API)
  // - Voice commands
  // - Bidirectional voice
  
  async handleVoice(audioStream) {
    const transcript = await this.speechToText(audioStream);
    return {
      type: 'voice',
      transcript: transcript,
      audio: audioStream,
      context: this.getContext()
    };
  }
}
```

#### 4. **UnifiedInputHandler**
```javascript
class UnifiedInputHandler {
  async processInput(input) {
    // 1. Detect input type
    // 2. Extract context
    // 3. Build unified request
    // 4. Send to agent
    // 5. Handle response
    
    const context = this.buildContext(input);
    const response = await this.sendToAgent(input, context);
    await this.handleResponse(response, input.type);
  }
}
```

---

## Implementation Plan

### Phase 1: Create Input Sensor Abstraction
1. Create `InputSensor` base class
2. Implement `ClickSensor`, `TypeSensor`, `VoiceSensor`
3. Create `UnifiedInputHandler`

### Phase 2: Refactor Click Handling
1. Move all click handlers to `ClickSensor`
2. Add click context extraction
3. Add click coordinate tracking

### Phase 3: Enhance Type Handling
1. Add text selection support
2. Add command parsing
3. Unify with other sensors

### Phase 4: Implement Voice Input
1. Integrate Web Speech API
2. Add speech-to-text
3. Add bidirectional voice support

### Phase 5: Fix Voice Output
1. Fix verbatim reading issue
2. Separate TTS mode from conversation mode
3. Improve session instructions

---

## Current File Structure

```
js/
├── app.js                    # Main app (handles all inputs currently)
├── grok-voice-socketio-service.js  # Voice output only
└── agent-enhanced/
    ├── integration-layer.js   # Chart click tracking
    └── unified-event-manager.js  # Event system (not fully used)
```

---

## Recommendations

1. **Create unified input sensor layer** - Abstract all inputs
2. **Fix voice output first** - Get verbatim reading working
3. **Add voice input** - Speech recognition integration
4. **Enhance click handling** - Full UI element support
5. **Unify context building** - Same context for all inputs

---

## Next Steps

1. **Analyze current voice output bug** - Why Grok creates narrative
2. **Design unified input API** - Common interface for all sensors
3. **Implement ClickSensor** - Refactor existing click handlers
4. **Implement VoiceSensor** - Add speech recognition
5. **Create UnifiedInputHandler** - Route all inputs through one handler


