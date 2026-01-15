# Ada Named Entity Links - Feature Proposal

## Concept

Add clickable links to named entities in Ada's responses that, when clicked, generate context-aware commentary about that entity with respect to the current conversation context.

## Example

**Current Response:**
```
Starlink is approaching cash flow positive with 4.6 million subscribers, 
driven by Falcon launches and Starship development.
```

**With Named Entity Links:**
```
[Starlink] is approaching cash flow positive with 4.6 million subscribers, 
driven by [Falcon] launches and [Starship] development.
```

When user clicks "Starlink", Ada responds:
```
"Starlink, in the context of SpaceX's $350 billion valuation, represents 
the primary Earth operations revenue driver with 4.6 million subscribers..."
```

## Benefits

1. **Interactive Exploration**: Users can dive deeper into any entity mentioned
2. **Context-Aware**: Responses consider current conversation context
3. **Natural Flow**: Links appear inline, not as separate "Learn more" section
4. **Progressive Disclosure**: Users explore at their own pace

## Implementation Approach

### Option 1: LLM-Based Entity Detection (Recommended)
- Use LLM to identify named entities in responses
- More accurate, handles context
- Can identify entities beyond predefined list

### Option 2: Keyword-Based Detection
- Predefined list of entities (Starlink, Falcon, Starship, etc.)
- Fast, simple
- Less flexible, misses new entities

### Option 3: Hybrid Approach
- Keyword matching for known entities
- LLM for unknown/contextual entities
- Best of both worlds

## Entity Categories

### SpaceX-Specific Entities
- **Products**: Starlink, Falcon, Starship, Dragon, Raptor
- **Concepts**: Mars colonization, Earth operations, Launch services
- **Metrics**: Valuation, Revenue, Subscribers, Launch volume
- **People**: Elon Musk, Gwynne Shotwell
- **Companies**: SpaceX, Tesla (related), competitors

### Financial Entities
- **Metrics**: DCF, Terminal value, Discount rate, Cash flow
- **Concepts**: Valuation methodology, Risk factors

## Link Format

### Inline Links
```html
<span class="ada-entity-link" data-entity="Starlink" data-context="..." style="...">
  Starlink
</span>
```

### Click Handler
```javascript
link.addEventListener('click', async (e) => {
    e.preventDefault();
    const entity = link.getAttribute('data-entity');
    const context = JSON.parse(link.getAttribute('data-context'));
    
    // Generate context-aware response
    await this.sendAgentMessage(
        `Tell me more about ${entity} in the context of ${context.currentTopic}`
    );
});
```

## Context Preservation

When generating entity commentary, include:
- Current conversation topic
- Recent messages (last 3-5)
- Current model/view context
- Entity's role in current discussion

## System Prompt Enhancement

Add to Ada's system prompt:
```
When mentioning named entities (Starlink, Falcon, Starship, etc.), 
you may wrap them in [ENTITY:entityName] format to create clickable links.
Users can click these links to explore the entity in the current context.
```

## Implementation Plan

### Phase 1: Basic Entity Detection
1. Create entity detection function
2. Define entity list (SpaceX-specific)
3. Add link parsing to response processing

### Phase 2: Link Creation
1. Parse responses for entities
2. Wrap entities in clickable links
3. Style links consistently

### Phase 3: Context-Aware Responses
1. Capture conversation context
2. Generate entity-specific prompts
3. Handle entity link clicks

### Phase 4: LLM Enhancement (Optional)
1. Use LLM to detect entities
2. Identify entity relationships
3. Suggest related entities

## Considerations

### Pros
- ✅ More interactive and engaging
- ✅ Natural exploration flow
- ✅ Context-aware responses
- ✅ Reduces need for separate "Learn more" section

### Cons
- ⚠️ May clutter responses if too many links
- ⚠️ Need to balance link density
- ⚠️ Entity detection accuracy
- ⚠️ Voice output needs to skip links

## Recommendation

**Start with Option 2 (Keyword-Based)** for MVP:
- Fast to implement
- Works immediately
- Can upgrade to LLM later
- Focus on high-value entities (Starlink, Falcon, Starship, Mars, etc.)

**Upgrade to Option 3 (Hybrid)** later:
- Add LLM for unknown entities
- Improve accuracy
- Handle edge cases

## Questions

1. Which entities should be linked? (All or curated list?)
2. How many links per response? (Limit to 3-5?)
3. Should links appear in voice output? (No - skip for TTS)
4. Should we track entity click analytics?

