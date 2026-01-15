# Ada Prompt Storage Analysis

## Questions Answered

### 1. Is Ada using the prompt from settings?
**YES ✅** - Ada is using the prompts configured in settings.

### 2. Is the settings prompt stored in the database?
**NO ❌** - Prompts are stored in **localStorage** (browser storage), NOT in a database.

---

## How Prompts Are Used

### Loading Prompts
**Location**: `js/app.js` line 17569-17581

```javascript
loadAgentSystemPrompts() {
    const stored = localStorage.getItem('agentSystemPrompts');
    if (stored) {
        try {
            this.agentSystemPrompts = JSON.parse(stored);
        } catch (e) {
            this.agentSystemPrompts = this.getDefaultAgentSystemPrompts();
        }
    } else {
        this.agentSystemPrompts = this.getDefaultAgentSystemPrompts();
    }
    this.updateAgentSystemPromptDisplay();
}
```

**Flow**:
1. Loads from `localStorage.getItem('agentSystemPrompts')`
2. Falls back to defaults if not found or invalid
3. Stores in `this.agentSystemPrompts`

### Saving Prompts
**Location**: `js/app.js` line 17661-17688

```javascript
saveAgentSystemPrompts() {
    const prompts = {};
    for (let i = 1; i <= 10; i++) {
        const input = document.getElementById(`agentPrompt${i}`);
        if (input) {
            prompts[`level${i}`] = input.value.trim();
        }
    }
    this.agentSystemPrompts = prompts;
    localStorage.setItem('agentSystemPrompts', JSON.stringify(prompts));
    // ... rest of save logic
}
```

**Flow**:
1. Collects prompts from UI inputs (level1-level10)
2. Stores in `this.agentSystemPrompts`
3. Saves to `localStorage.setItem('agentSystemPrompts', JSON.stringify(prompts))`

### Using Prompts in API Calls
**Location**: `js/app.js` line 17752-17769

```javascript
// Build system prompts from 10-level hierarchy
const systemPrompts = this.agentSystemPrompts || this.getDefaultAgentSystemPrompts();
const systemPromptText = Object.values(systemPrompts)
    .filter(p => p && p.trim())
    .join('\n\n');

const response = await fetch('/api/agent/chat-enhanced', {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify({
        message: message,
        systemPrompt: systemPromptText,  // ← Prompts sent here
        context: { ... },
        history: this.getAgentChatHistory(),
        useRelationshipDetection: this.getUseRelationshipDetection(),
        adaSettings: adaSettings
    })
});
```

**Flow**:
1. Gets prompts from `this.agentSystemPrompts` (or defaults)
2. Joins all non-empty prompts with `\n\n`
3. Sends as `systemPrompt` in API request body
4. Server uses this prompt when calling AI API

---

## Storage Location

### Current: localStorage (Browser Storage)
- **Storage**: `localStorage.getItem('agentSystemPrompts')`
- **Format**: JSON string of object with `level1` through `level10` properties
- **Scope**: Per-browser, per-domain
- **Persistence**: Survives browser restarts, cleared if user clears browser data
- **Sync**: NOT synced across devices/browsers

### NOT Stored In:
- ❌ MongoDB database
- ❌ Redis
- ❌ Server-side database
- ❌ Cloud storage

---

## Prompt Usage Flow

```
User edits prompts in Settings UI
    ↓
User clicks "Save Settings"
    ↓
saveAgentSystemPrompts() collects prompts
    ↓
Stored in localStorage.setItem('agentSystemPrompts', ...)
    ↓
Stored in this.agentSystemPrompts (in-memory)
    ↓
When sending message to Ada:
    ↓
loadAgentSystemPrompts() loads from localStorage
    ↓
Joins prompts: Object.values(systemPrompts).join('\n\n')
    ↓
Sent in API request: { systemPrompt: systemPromptText, ... }
    ↓
Server receives systemPrompt
    ↓
Server sends to AI API with system prompt
    ↓
Ada uses the prompt to generate response
```

---

## Implications

### ✅ Advantages of localStorage:
- Fast access (no network call)
- Works offline
- Simple implementation
- No server-side storage needed

### ⚠️ Limitations:
- **Not synced across devices** - Each browser has its own prompts
- **Lost if browser data cleared** - User must reconfigure
- **Not backed up** - No server-side backup
- **Per-user only** - Can't share prompts across team

---

## Recommendations

### If Database Storage Needed:

1. **Add API endpoint** to save/load prompts:
   ```javascript
   POST /api/agent/prompts/save
   GET /api/agent/prompts/load
   ```

2. **Store in MongoDB**:
   ```javascript
   {
     userId: ObjectId,
     prompts: {
       level1: "...",
       level2: "...",
       ...
     },
     updatedAt: Date
   }
   ```

3. **Hybrid approach**:
   - Keep localStorage for fast access
   - Sync to database in background
   - Load from database on login

---

## Status Summary

| Question | Answer | Details |
|----------|--------|---------|
| **Is Ada using settings prompts?** | ✅ YES | Prompts from settings are loaded and sent to API |
| **Stored in database?** | ❌ NO | Stored in localStorage (browser storage) |
| **Persistent?** | ⚠️ PARTIAL | Survives browser restart, but lost if data cleared |
| **Synced across devices?** | ❌ NO | Each browser has its own prompts |

