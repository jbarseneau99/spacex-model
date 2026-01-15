# Ada Links - Two Types Explained

## Overview

Ada uses **two distinct types of links** in her responses, each serving a different purpose:

---

## 1. Inline Entity Links (Specific Named Entities)

### Purpose
Click to get commentary about a **specific named entity** in the context of the current conversation.

### Examples
- **Starlink** - Specific product/service
- **Falcon** - Specific rocket family
- **Starship** - Specific spacecraft
- **Mars** - Specific concept/destination
- **SpaceX** - Specific company

### Behavior
- Appear **inline** within Ada's response text
- Clicking generates: "Tell me more about [Entity] in the context of [current topic]"
- Response focuses on that **specific entity** with current conversation context

### Example Flow
```
Ada: "Starlink is approaching cash flow positive with 4.6 million subscribers."
     ↑ Clickable inline link

User clicks "Starlink"
→ Ada: "Starlink, in the context of SpaceX's $350 billion valuation, 
        represents the primary Earth operations revenue driver..."
```

---

## 2. Learn More Links (General Categories/Topics)

### Purpose
Click to get further commentary about **general categories or broader topics**.

### Examples
- "Starlink unit economics" - General topic category
- "Private market liquidity trends" - General market topic
- "Valuation methodology comparison" - General methodology topic
- "Mars colonization timeline" - General timeline topic

### Behavior
- Appear in **separate "Learn more:" section** after Ada's response
- Clicking generates: "Tell me more about [Topic]"
- Response provides **broader commentary** on that topic category

### Example Flow
```
Ada: "The valuation reflects market confidence in SpaceX's dual revenue engines."

Learn more: Starlink unit economics, Private market liquidity trends, 
            Valuation methodology comparison
            ↑ Clickable category links

User clicks "Starlink unit economics"
→ Ada: "Starlink unit economics involve analyzing cost per subscriber, 
        bandwidth costs, ground station infrastructure..."
```

---

## Key Differences

| Aspect | Inline Entity Links | Learn More Links |
|--------|---------------------|-----------------|
| **Type** | Specific named entities | General categories/topics |
| **Location** | Inline in response text | Separate "Learn more:" section |
| **Purpose** | Entity-specific commentary | Broader topic exploration |
| **Context** | Current conversation context | General topic context |
| **Examples** | Starlink, Falcon, Starship | "unit economics", "market trends" |

---

## Implementation

### Inline Entity Links
- **Detection**: Keyword-based matching of main entities
- **Format**: `<span class="ada-entity-link">Entity</span>`
- **Handler**: Context-aware entity commentary

### Learn More Links
- **Detection**: Extracted from "Learn more:" section in response
- **Format**: `<span class="learn-more-link">Topic</span>`
- **Handler**: General topic exploration

---

## Best Practices

### When to Use Each

**Use Inline Entity Links for:**
- ✅ Specific products (Starlink, Falcon, Starship)
- ✅ Specific companies (SpaceX, Tesla)
- ✅ Specific concepts mentioned (Mars, Valuation)
- ✅ When entity is central to the response

**Use Learn More Links for:**
- ✅ Broader topic categories
- ✅ Related topics for exploration
- ✅ Methodological discussions
- ✅ Market trends and analysis

### Guidelines

1. **Don't duplicate**: If an entity is already linked inline, don't repeat it in "Learn more"
2. **Balance**: 2-3 inline entity links per response, 2-3 learn more topics
3. **Relevance**: Only link entities/topics relevant to the current response
4. **Clarity**: Keep link text clear and descriptive

---

## Status: ✅ **UNDERSTOOD**

The distinction between inline entity links (specific entities) and learn more links (general categories) is now clearly documented and maintained in the implementation.

