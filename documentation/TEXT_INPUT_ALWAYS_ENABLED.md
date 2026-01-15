# Text Input Always Enabled

## Design Principle

**Text input is ALWAYS enabled and cannot be disabled.**

### Why?

1. **Non-Intrusive**: Text input doesn't interfere with normal browsing
2. **Primary Interface**: It's the main way users interact with Ada
3. **Always Available**: Users should always be able to type a message
4. **No Conflicts**: Unlike clicks or voice, text input doesn't conflict with UI interactions

---

## Implementation

### TypeSensor
- `enabled` property: Always `true` (cannot be changed)
- `setEnabled(enabled)`: No-op - always keeps `enabled = true`
- `handleTextInput()`: Never checks `this.enabled` - always processes text
- `initialize()`: Always initializes regardless of state

### AdaInputSystem
- `setSensorEnabled('type', enabled)`: Ignores `enabled` parameter, always sets to `true`
- Logs warning if attempt made to disable text input

---

## Controls

### Available Controls:
- ✅ **Disable Clicks** - Can disable click-to-chat
- ✅ **Mute User** - Can disable microphone input
- ✅ **Mute Ada** - Can disable Ada's voice output
- ❌ **Disable Text** - NOT AVAILABLE (text always enabled)

### Why No Text Disable Control?

Text input is:
- Non-intrusive (doesn't interfere with browsing)
- Primary interface (main way to interact)
- Always needed (users should always be able to type)
- No conflicts (doesn't conflict with UI interactions)

---

## Code References

### TypeSensor.js
```javascript
// Text input is always enabled - never check this.enabled
handleTextInput(text, context = {}) {
    if (!text || text.trim().length === 0) {
        return;
    }
    // ... process text
}

setEnabled(enabled) {
    // Text input is always enabled - ignore attempts to disable
    this.enabled = true; // Always true
    console.log('[TypeSensor] ⚠️ Attempt to disable text input ignored');
}
```

### AdaInputSystem.js
```javascript
setSensorEnabled(sensorType, enabled) {
    case 'type':
        // Text input is always enabled - ignore attempts to disable
        console.log('[AdaInputSystem] ⚠️ Attempt to disable text input ignored');
        if (this.typeSensor) {
            this.typeSensor.setEnabled(true); // Force enabled
        }
        break;
}
```

---

## User Experience

### Always Available:
- ✅ Text input field always enabled
- ✅ Enter key always works
- ✅ Send button always works
- ✅ No way to accidentally disable text input

### Can Be Disabled:
- ⚠️ Click-to-chat (via "Disable Clicks" toggle)
- ⚠️ Voice input (via "Mute User" toggle)
- ⚠️ Voice output (via "Mute Ada" toggle)

---

## Rationale

### Text Input vs Other Inputs:

| Input Type | Intrusive? | Can Disable? | Reason |
|------------|------------|--------------|--------|
| **Text** | ❌ No | ❌ No | Non-intrusive, primary interface |
| **Clicks** | ⚠️ Yes | ✅ Yes | Can interfere with normal browsing |
| **Voice** | ⚠️ Yes | ✅ Yes | Requires microphone, can be intrusive |

---

## Status: ✅ **IMPLEMENTED**

Text input is now guaranteed to always be enabled and cannot be disabled.

