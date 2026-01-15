# Agent Communication System

## Architecture Overview

This directory contains the new agent communication system architecture with proper separation of concerns.

## Directory Structure

```
js/agent/
├── AgentCommunicationSystem.js  # Main orchestrator
├── state/
│   └── AgentStateManager.js     # Centralized state management (Redis-backed)
├── relationship/
│   ├── RelationshipDetector.js   # Detects relationship category (1-9)
│   ├── SemanticAnalyzer.js       # Semantic similarity analysis
│   └── TransitionSelector.js     # Selects transition phrases
├── interruption/
│   └── InterruptionManager.js    # Handles mid-sentence interruption
├── memory/
│   └── PermanentMemory.js        # Hybrid Redis + MongoDB storage
├── response/
│   └── (Future: ResponseBuilder.js)
└── input/
    └── (Future: Input handlers)
```

## Core Components

### AgentCommunicationSystem
Main orchestrator that coordinates all components.

**Usage:**
```javascript
const AgentCommunicationSystem = require('./js/agent/AgentCommunicationSystem');
const { getRedisService } = require('./services/redis-service');

const redisService = getRedisService();
const agentSystem = new AgentCommunicationSystem(redisService, voiceService);

// Process input
const result = await agentSystem.processInput(userInput, context);
// Returns: { relationship, context, requestId }

// Save interaction after response
await agentSystem.saveInteraction(input, response, relationship);
```

### AgentStateManager
Centralized state management with Redis backing.

**Features:**
- Shared state across server instances
- Real-time synchronization via Redis pub/sub
- Local fallback if Redis unavailable

### RelationshipDetector
Detects relationship category (1-9) between new input and current context.

**Categories:**
1. Direct continuation / extension
2. Strong topical relatedness (>75%)
3. Moderate topical relatedness (40-75%)
4. Logical pattern reinforcement
5. Logical clarification/refinement
6. Weak/unrelated shift (<40%)
7. Explicit resumption
8. Contradiction / challenge
9. First interaction / no history

### InterruptionManager
Handles mid-sentence interruption and transition management.

**Features:**
- Mid-sentence pause
- Transition phrase handling
- Position tracking for resumption

### PermanentMemory
Hybrid Redis (fast) + MongoDB (persistent) storage.

**Features:**
- Fast access via Redis
- Persistent storage via MongoDB
- Pattern detection caching
- Chain inference

## Integration with Existing Code

The new system is designed to gradually replace the monolithic agent code in `app.js`:

1. **Phase 1**: Use alongside existing code (feature flag)
2. **Phase 2**: Migrate one feature at a time
3. **Phase 3**: Full migration, remove old code

## Next Steps

1. Create ResponseBuilder for coherent response generation
2. Create InputCaptureManager for unified input handling
3. Integrate with app.js sendAgentMessageSilent
4. Add MongoDB schema for persistent storage
5. Add tests for each component






