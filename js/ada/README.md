# Ada Input System - Modular Architecture

## Overview

Modular, extensible input sensor system for Ada with three input types: Click, Type, and Voice.

## File Structure

```
js/ada/
├── README.md                          # This file
├── AdaInputSystem.js                  # Main orchestrator
│
├── sensors/                           # Input sensors
│   ├── ClickSensor.js                # Click detection
│   ├── TypeSensor.js                 # Text input detection
│   └── VoiceSensor.js                # Voice input detection
│
├── voice/                             # Voice handling
│   ├── VoiceOutputHandler.js         # TTS output (verbatim reading)
│   └── VoiceInputHandler.js          # Speech recognition
│
├── handlers/                          # Input handlers
│   └── UnifiedInputHandler.js        # Routes all inputs to agent
│
├── context/                           # Context building
│   └── ContextBuilder.js             # Builds unified context
│
└── utils/                             # Utilities (future)
```

## Usage

### 1. Include Scripts in HTML

```html
<!-- Ada Input System -->
<script src="/js/ada/context/ContextBuilder.js"></script>
<script src="/js/ada/voice/VoiceInputHandler.js"></script>
<script src="/js/ada/voice/VoiceOutputHandler.js"></script>
<script src="/js/ada/sensors/ClickSensor.js"></script>
<script src="/js/ada/sensors/TypeSensor.js"></script>
<script src="/js/ada/sensors/VoiceSensor.js"></script>
<script src="/js/ada/handlers/UnifiedInputHandler.js"></script>
<script src="/js/ada/AdaInputSystem.js"></script>
```

### 2. Initialize in app.js

```javascript
// After app initialization
this.adaInputSystem = new AdaInputSystem(this);
await this.adaInputSystem.initialize();
```

### 3. Use Voice Output

```javascript
// Speak text verbatim
const voiceHandler = this.adaInputSystem.getVoiceOutputHandler();
await voiceHandler.speakVerbatim("Hello, I am Ada");
```

### 4. Use Voice Input

```javascript
// Start listening
const voiceSensor = this.adaInputSystem.getVoiceSensor();
voiceSensor.startListening();

// Stop listening
voiceSensor.stopListening();
```

## Architecture

### Input Flow

```
User Action (Click/Type/Voice)
    ↓
Sensor Detects (ClickSensor/TypeSensor/VoiceSensor)
    ↓
Custom Event ('ada:click', 'ada:type', 'ada:voice')
    ↓
UnifiedInputHandler Receives
    ↓
ContextBuilder Builds Context
    ↓
Send to Agent (via app.sendAgentMessageSilent)
    ↓
Response Received
    ↓
VoiceOutputHandler Speaks (if enabled)
```

### Components

#### Sensors
- **ClickSensor**: Detects clicks on charts, UI elements, images
- **TypeSensor**: Detects text input and selections
- **VoiceSensor**: Detects voice input via Web Speech API

#### Handlers
- **UnifiedInputHandler**: Routes all inputs through one pipeline
- **VoiceOutputHandler**: Handles verbatim TTS output

#### Context
- **ContextBuilder**: Builds unified context from UI state, history, model data

## Benefits

1. **Modular**: Each component in its own file
2. **Extensible**: Easy to add new sensors or handlers
3. **Testable**: Each component can be tested independently
4. **Maintainable**: Clear separation of concerns
5. **Reusable**: Components can be used independently

## Integration Points

- **app.js**: Main application instance
- **grokVoiceService**: Grok Voice API service
- **agentSystemPrompts**: System prompts for agent
- **getAgentChatHistory()**: Chat history retrieval
- **sendAgentMessageSilent()**: Agent message sending


