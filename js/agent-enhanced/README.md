# Enhanced Agent System

This directory contains the enhanced agent system modules. **All features are disabled by default** to preserve existing functionality.

## Architecture

The enhanced agent system is built with a **preservation-first approach**:

- ✅ **Additive Only**: New code doesn't modify existing code
- ✅ **Feature Flagged**: All features disabled by default
- ✅ **Parallel Systems**: New systems run alongside existing ones
- ✅ **Optional Integration**: Integration layer is opt-in
- ✅ **Easy Rollback**: Can disable instantly via feature flags

## Modules

### Core Modules

1. **feature-flags.js** - Feature flag management system
2. **selection-context-manager.js** - Text selection and chart datapoint context
3. **session-awareness.js** - Comprehensive session tracking
4. **context-builder.js** - Unified context construction
5. **unified-event-manager.js** - Centralized event handling
6. **integration-layer.js** - Optional bridge to existing agent

### Loader

**loader.js** - Loads all modules in correct order

## Feature Flags

All features are controlled by feature flags stored in localStorage:

- `enableEnhancedSessionAwareness` (default: false)
- `enableUnifiedEventManager` (default: false)
- `enableRichSelectionContext` (default: false)
- `enableDatapointContext` (default: false)
- `enableContextBuilder` (default: false)
- `enableSessionPersistence` (default: false)
- `integrateWithExistingAgent` (default: false)
- `debugEnhancedAgent` (default: false)

## Enabling Features

To enable features, set feature flags in browser console:

```javascript
// Enable session awareness
window.featureFlags.setFlag('enableEnhancedSessionAwareness', true);

// Enable selection context
window.featureFlags.setFlag('enableRichSelectionContext', true);
window.featureFlags.setFlag('enableDatapointContext', true);

// Enable context builder
window.featureFlags.setFlag('enableContextBuilder', true);

// Enable integration with existing agent (requires above flags)
window.featureFlags.setFlag('integrateWithExistingAgent', true);

// Enable debug logging
window.featureFlags.setFlag('debugEnhancedAgent', true);
```

## Usage

### Selection Context

```javascript
// Get active selection context
const context = window.selectionContextManager.getActiveContext();

// Set text selection
window.selectionContextManager.setTextSelection({
    text: 'Selected text',
    source: 'dashboard',
    elementType: 'tile'
});

// Set chart datapoint
window.selectionContextManager.setDatapoint({
    chartId: 'valuationChart',
    chartName: 'Valuation Breakdown',
    label: '2025',
    value: '$1.8T'
});
```

### Session Awareness

```javascript
// Track navigation
window.agentSessionAwareness.trackNavigation({
    fromView: 'dashboard',
    toView: 'insights',
    trigger: 'user-click'
});

// Track conversation
window.agentSessionAwareness.trackConversation({
    role: 'user',
    message: 'What does this mean?',
    view: 'dashboard'
});

// Get session summary
const summary = window.agentSessionAwareness.getSessionSummary();
```

### Context Builder

```javascript
// Build comprehensive context
const context = window.contextBuilder.buildContext({
    tab: 'dashboard',
    includeData: false
});

// Build context string for agent prompt
const contextString = window.contextBuilder.buildContextString(context);
```

### Event Manager

```javascript
// Emit event
window.unifiedEventManager.emit(
    window.unifiedEventManager.eventTypes.TILE_CLICK,
    { tileId: 'total-valuation' },
    window.unifiedEventManager.priorities.HIGH
);

// Listen to events
window.unifiedEventManager.on(
    window.unifiedEventManager.eventTypes.TEXT_SELECTION,
    (event) => {
        console.log('Text selected:', event.data);
    }
);
```

## Integration

The integration layer automatically hooks into existing agent code when enabled. It:

- Enhances text selection detection
- Enhances chart click handling
- Tracks navigation and conversation
- Adds context to agent prompts

**Important**: Integration only activates if `integrateWithExistingAgent` flag is enabled.

## Safety

- ✅ Existing agent code is **never modified**
- ✅ All new code is **additive only**
- ✅ Features are **disabled by default**
- ✅ Easy **rollback** via feature flags
- ✅ **No breaking changes** to existing functionality

## Testing

1. Load the application
2. Check console for `[EnhancedAgent]` logs
3. Verify all modules load successfully
4. Enable features one at a time
5. Test functionality incrementally
6. Disable features if issues arise

## Rollback

To disable all enhanced features:

```javascript
// Disable all flags
Object.keys(window.featureFlags.flags).forEach(flag => {
    window.featureFlags.setFlag(flag, false);
});

// Or reload page (flags persist in localStorage)
location.reload();
```

## Future Enhancements

- [ ] AI Progress Manager
- [ ] Proactive Assistance Engine
- [ ] User Journey Mapping
- [ ] Multi-Session Awareness
- [ ] Advanced Intent Inference
- [ ] Session Analytics Dashboard


















