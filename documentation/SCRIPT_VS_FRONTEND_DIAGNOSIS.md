# Script vs Frontend Diagnosis

## Key Differences

### 1. **Account Name Matching**

**Test Script:**
```javascript
const accountAnalysis = graphBuilder.analyzeAccountCommentary('@TMFAssociates');
// Uses exact string '@TMFAssociates'
```

**Frontend:**
```javascript
const account = item.getAttribute('data-x-feed-account') || 'Unknown';
// Account comes from HTML attribute - could be 'TMFAssociates', '@TMFAssociates', or 'Tim Farrar'
accountDiscourseAnalysis = graphBuilder.analyzeAccountCommentary(account);
```

**Potential Issue:** If `data-x-feed-account` contains `'Tim Farrar'` instead of `'@TMFAssociates'`, the matching will fail because:
- Graph nodes store: `tweet.account = '@TMFAssociates'` or `tweet.accountName = 'Tim Farrar'`
- Matching checks: `(node.account || node.accountName)` - so it should work IF the data has both

### 2. **Data Structure**

**Test Script:**
```javascript
const mockConversationThread = [
    {
        tweetId: 'tweet2',
        account: '@TMFAssociates',  // ← Has account
        accountName: 'Tim Farrar',   // ← Has accountName
        content: 'But 1.2M messages...',
        // ... other fields
    }
];
```

**Frontend:**
```javascript
const conversationThread = fullTweetObject.conversationThread || [];
// Structure depends on what the backend sends
// Could be: { account: '@TMFAssociates' } OR { accountName: 'Tim Farrar' } OR both
```

**Potential Issue:** If frontend data only has `accountName` but not `account`, or vice versa, matching might fail.

### 3. **Graph Builder Availability**

**Test Script:**
```javascript
const DiscourseGraphBuilder = require('../js/agent/discourse/DiscourseGraphBuilder.js');
// Always available - loaded via require()
```

**Frontend:**
```javascript
if (typeof DiscourseGraphBuilder === 'undefined') {
    console.warn('[X Feed Click Handler] DiscourseGraphBuilder not loaded, skipping graph analysis');
}
// Might not be loaded if script tag is missing or loads after click handler
```

**Potential Issue:** If `DiscourseGraphBuilder.js` isn't loaded in the browser, graph analysis is skipped entirely.

### 4. **Conversation Thread Data**

**Test Script:**
```javascript
// Mock data with all required fields
{
    tweetId: 'tweet2',
    account: '@TMFAssociates',
    accountName: 'Tim Farrar',
    content: 'But 1.2M messages...',
    timestamp: '2024-01-15T10:05:00Z',
    conversationId: 'tweet1',
    isReply: true,
    referencedTweets: [{ id: 'tweet1', type: 'replied_to' }]
}
```

**Frontend:**
```javascript
const conversationThread = fullTweetObject.conversationThread || [];
// Structure depends on backend API response
// Might be missing fields like: referencedTweets, isReply, conversationId
```

**Potential Issue:** If conversation thread is missing required fields, graph building might fail or produce incomplete results.

## Debugging Steps

### 1. Check if DiscourseGraphBuilder is loaded
```javascript
// In browser console:
console.log(typeof DiscourseGraphBuilder); // Should be 'function'
```

### 2. Check conversation thread structure
```javascript
// In browser console after clicking tweet:
// Check what conversationThread contains
console.log('Conversation thread:', conversationThread);
console.log('Account:', account);
console.log('Account tweets:', accountTweets);
```

### 3. Check graph building
```javascript
// Look for console logs:
[X Feed Click Handler] Built discourse graph: X nodes, Y edges
[X Feed Click Handler] Account analysis for @TMFAssociates: { isSkeptical: true, ... }
```

### 4. Check account matching
```javascript
// In DiscourseGraphBuilder.analyzeAccountCommentary:
// Add logging:
console.log('Looking for account:', normalizedAccount);
console.log('Available accounts:', Object.values(this.graph.nodes).map(n => (n.account || n.accountName).toLowerCase()));
```

## Most Likely Issues

1. **DiscourseGraphBuilder not loaded** - Script tag missing or loads too late
2. **Account name mismatch** - `data-x-feed-account` doesn't match `tweet.account` or `tweet.accountName`
3. **Conversation thread missing** - `conversationThread` is empty or malformed
4. **Missing fields** - Conversation thread missing `referencedTweets`, `isReply`, etc.

## Solution

Add comprehensive logging to identify which issue is occurring:

```javascript
console.log('[DEBUG] DiscourseGraphBuilder available:', typeof DiscourseGraphBuilder !== 'undefined');
console.log('[DEBUG] Conversation thread length:', conversationThread.length);
console.log('[DEBUG] Account from HTML:', account);
console.log('[DEBUG] Conversation thread accounts:', conversationThread.map(t => t.account || t.accountName));
console.log('[DEBUG] Graph built:', !!discourseGraph);
console.log('[DEBUG] Account analysis:', accountDiscourseAnalysis);
```

