# Flag Configuration Guide

## Where to Set Flags

### 1. **Relationship Detection Flag** (`useRelationshipDetection`)

**Location**: Agent Settings Modal → Model Configuration Tab

**How to Access**:
1. Open the Desktop Agent panel
2. Click the **Settings** icon (⚙️) in the agent header
3. Click the **Model Configuration** tab
4. Find the **"Enable Relationship Detection"** checkbox

**Default**: Enabled (true)

**Storage**: Saved in `localStorage` as `useRelationshipDetection`

**Programmatic Access**:
```javascript
// Get current value
app.getUseRelationshipDetection() // returns true/false

// Set value
app.setUseRelationshipDetection(true)  // Enable
app.setUseRelationshipDetection(false) // Disable

// Direct localStorage access
localStorage.setItem('useRelationshipDetection', 'true')  // Enable
localStorage.setItem('useRelationshipDetection', 'false') // Disable
```

### 2. **Voice Output Flag** (`agentVoiceOutputEnabled`)

**Location**: Agent Header → Volume Icon Button

**How to Access**:
1. Open the Desktop Agent panel
2. Click the **Volume** icon in the agent header
3. Icon changes: `volume-x` (OFF) ↔ `volume-2` (ON)

**Default**: Disabled (false)

**Storage**: Saved in `localStorage` as `agentVoiceOutputEnabled`

**Programmatic Access**:
```javascript
// Toggle
app.toggleAgentVoiceMode()

// Direct access
app.agentVoiceOutputEnabled = true  // Enable
app.agentVoiceOutputEnabled = false // Disable

// localStorage
localStorage.setItem('agentVoiceOutputEnabled', 'true')
```

### 3. **Voice Input Flag** (`agentVoiceInputEnabled`)

**Location**: Agent Header → Microphone Icon Button

**How to Access**:
1. Open the Desktop Agent panel
2. Click the **Microphone** icon in the agent header
3. Icon changes: `mic-off` (OFF) ↔ `mic` (ON)

**Default**: Disabled (false)

**Storage**: Saved in `localStorage` as `agentVoiceInputEnabled`

### 4. **All Feature Flags** (Enhanced Agent System)

**Location**: Browser Console

**How to Access**:
1. Open browser console (F12 or Cmd+Option+I)
2. Use feature flags API:

```javascript
// Check if feature flags are available
window.featureFlags

// Enable a feature
window.featureFlags.setFlag('enableEnhancedSessionAwareness', true)

// Disable a feature
window.featureFlags.setFlag('enableEnhancedSessionAwareness', false)

// Get a flag value
window.featureFlags.getFlag('enableEnhancedSessionAwareness')
```

**Available Flags**:
- `enableEnhancedSessionAwareness` (default: false)
- `enableUnifiedEventManager` (default: false)
- `enableRichSelectionContext` (default: false)
- `enableDatapointContext` (default: false)
- `enableContextBuilder` (default: false)
- `enableSessionPersistence` (default: false)
- `integrateWithExistingAgent` (default: false)
- `debugEnhancedAgent` (default: false)

## Quick Reference

| Flag | UI Location | Default | Storage Key |
|------|-------------|---------|-------------|
| `useRelationshipDetection` | Settings → Model Config | true | `useRelationshipDetection` |
| `agentVoiceOutputEnabled` | Header → Volume Icon | false | `agentVoiceOutputEnabled` |
| `agentVoiceInputEnabled` | Header → Mic Icon | false | `agentVoiceInputEnabled` |
| Enhanced Agent Flags | Browser Console | false | `featureFlag_*` |

## Troubleshooting

**Flag not working?**
1. Check browser console for errors
2. Verify localStorage value: `localStorage.getItem('flagName')`
3. Clear localStorage if needed: `localStorage.removeItem('flagName')`
4. Refresh the page after changing flags


