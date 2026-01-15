# Twitter Discourse Graph Model

## Current State

**Current Representation**: Flat array sorted chronologically
```javascript
conversationChain = [
  { account: "@user1", content: "...", timestamp: "...", isReply: false },
  { account: "@user2", content: "...", timestamp: "...", isReply: true },
  // ... linear array
]
```

**Problem**: 
- Loses relationship structure (who replied to whom)
- Can't identify discourse patterns (agreement, disagreement, elaboration)
- Can't find key nodes (central tweets, high engagement)
- Hard to understand conversation flow

## Proposed Discourse Graph Model

### Graph Structure

```javascript
{
  // Graph metadata
  conversationId: string,           // Root conversation ID
  rootTweetId: string,              // Root tweet ID
  participants: string[],           // List of participant accounts
  createdAt: timestamp,             // Conversation start time
  updatedAt: timestamp,             // Last tweet time
  
  // Nodes (Tweets)
  nodes: {
    [tweetId]: {
      id: string,                   // Tweet ID
      account: string,               // @username
      accountName: string,            // Display name
      content: string,               // Tweet text
      timestamp: timestamp,          // Created timestamp
      url: string,                   // Tweet URL
      
      // Discourse properties
      type: 'tweet' | 'reply' | 'retweet' | 'quote',
      isRoot: boolean,              // Is this the root tweet?
      depth: number,                // Depth in conversation tree
      
      // Engagement metrics
      engagement: {
        likes: number,
        retweets: number,
        replies: number,
        quotes: number,
        total: number
      },
      
      // Graph metrics (computed)
      inDegree: number,              // Number of replies/retweets/quotes
      outDegree: number,             // Number of tweets this replies to
      centrality: number,            // Graph centrality (importance)
      betweenness: number,           // Betweenness centrality (bridge)
      
      // Discourse analysis
      discourseRole: 'initiator' | 'responder' | 'amplifier' | 'challenger' | 'elaborator',
      sentiment: number,              // -1 to 1
      topicAlignment: number,        // 0-1 alignment with root topic
      
      // Relationships (outgoing edges)
      edges: {
        replies: string[],           // Tweet IDs this replies to
        retweets: string[],          // Tweet IDs this retweets
        quotes: string[]             // Tweet IDs this quotes
      }
    }
  },
  
  // Edges (Relationships)
  edges: {
    [edgeId]: {
      id: string,                    // Edge ID (e.g., "tweet1->tweet2")
      source: string,                // Source tweet ID
      target: string,                // Target tweet ID
      type: 'reply' | 'retweet' | 'quote',
      direction: 'forward' | 'backward',
      
      // Discourse properties
      relationship: 'agreement' | 'disagreement' | 'elaboration' | 'question' | 'amplification',
      strength: number,               // 0-1 relationship strength
      timeDelta: number,             // Time between tweets (ms)
      
      // Semantic similarity
      semanticSimilarity: number,     // 0-1 content similarity
      topicOverlap: number            // 0-1 topic overlap
    }
  },
  
  // Discourse patterns
  patterns: {
    threads: Array<{                 // Conversation threads
      rootTweetId: string,
      participants: string[],
      depth: number,
      engagement: number
    }>,
    keyNodes: string[],              // High-centrality tweet IDs
    bridges: string[],               // Bridge tweets (high betweenness)
    clusters: Array<{                // Topic clusters
      tweetIds: string[],
      topic: string,
      participants: string[]
    }>
  }
}
```

## Discourse Graph Construction

### Step 1: Build Nodes
```javascript
function buildDiscourseGraph(conversationThread) {
  const graph = {
    nodes: {},
    edges: {},
    patterns: {}
  };
  
  // Create nodes from tweets
  conversationThread.forEach(tweet => {
    graph.nodes[tweet.tweetId] = {
      id: tweet.tweetId,
      account: tweet.account,
      accountName: tweet.accountName,
      content: tweet.content,
      timestamp: tweet.timestamp,
      url: tweet.url,
      type: tweet.isReply ? 'reply' : tweet.isRetweet ? 'retweet' : tweet.isQuote ? 'quote' : 'tweet',
      engagement: tweet.engagement,
      edges: {
        replies: [],
        retweets: [],
        quotes: []
      }
    };
  });
  
  return graph;
}
```

### Step 2: Build Edges from Relationships
```javascript
function addEdges(graph, tweets) {
  tweets.forEach(tweet => {
    if (tweet.referencedTweets) {
      tweet.referencedTweets.forEach(ref => {
        const edgeId = `${ref.id}->${tweet.tweetId}`;
        graph.edges[edgeId] = {
          id: edgeId,
          source: ref.id,
          target: tweet.tweetId,
          type: ref.type,  // 'replied_to', 'retweeted', 'quoted'
          direction: 'forward',
          timeDelta: new Date(tweet.timestamp) - new Date(graph.nodes[ref.id].timestamp)
        };
        
        // Add to node edges
        if (ref.type === 'replied_to') {
          graph.nodes[tweet.tweetId].edges.replies.push(ref.id);
        } else if (ref.type === 'retweeted') {
          graph.nodes[tweet.tweetId].edges.retweets.push(ref.id);
        } else if (ref.type === 'quoted') {
          graph.nodes[tweet.tweetId].edges.quotes.push(ref.id);
        }
      });
    }
  });
}
```

### Step 3: Compute Graph Metrics
```javascript
function computeGraphMetrics(graph) {
  // Compute in-degree (how many tweets reply/retweet/quote this)
  Object.values(graph.nodes).forEach(node => {
    node.inDegree = Object.values(graph.edges)
      .filter(edge => edge.target === node.id).length;
    
    node.outDegree = Object.values(graph.edges)
      .filter(edge => edge.source === node.id).length;
  });
  
  // Compute centrality (simplified - use in-degree as proxy)
  const maxInDegree = Math.max(...Object.values(graph.nodes).map(n => n.inDegree));
  Object.values(graph.nodes).forEach(node => {
    node.centrality = maxInDegree > 0 ? node.inDegree / maxInDegree : 0;
  });
  
  // Identify key nodes (high centrality + high engagement)
  graph.patterns.keyNodes = Object.values(graph.nodes)
    .filter(node => node.centrality > 0.5 || node.engagement.total > 100)
    .map(node => node.id);
}
```

### Step 4: Identify Discourse Patterns
```javascript
function identifyDiscoursePatterns(graph) {
  // Identify threads (conversation branches)
  graph.patterns.threads = [];
  
  // Find root tweets (no incoming edges)
  const rootTweets = Object.values(graph.nodes)
    .filter(node => node.inDegree === 0);
  
  rootTweets.forEach(root => {
    const thread = {
      rootTweetId: root.id,
      participants: new Set(),
      depth: 0,
      engagement: root.engagement.total
    };
    
    // Traverse thread
    function traverse(nodeId, depth) {
      thread.depth = Math.max(thread.depth, depth);
      thread.participants.add(graph.nodes[nodeId].account);
      
      // Find replies to this tweet
      const replies = Object.values(graph.edges)
        .filter(edge => edge.source === nodeId && edge.type === 'replied_to')
        .map(edge => edge.target);
      
      replies.forEach(replyId => {
        traverse(replyId, depth + 1);
      });
    }
    
    traverse(root.id, 0);
    thread.participants = Array.from(thread.participants);
    graph.patterns.threads.push(thread);
  });
}
```

## Discourse Analysis for Ada

### Account Commentary Analysis
```javascript
function analyzeAccountCommentary(graph, accountName) {
  const accountTweets = Object.values(graph.nodes)
    .filter(node => node.account.toLowerCase() === accountName.toLowerCase());
  
  if (accountTweets.length === 0) return null;
  
  return {
    account: accountName,
    tweetCount: accountTweets.length,
    
    // Discourse role analysis
    roles: {
      initiator: accountTweets.filter(t => t.isRoot).length,
      responder: accountTweets.filter(t => t.type === 'reply').length,
      amplifier: accountTweets.filter(t => t.type === 'retweet').length,
      elaborator: accountTweets.filter(t => t.outDegree > 0).length
    },
    
    // Engagement analysis
    totalEngagement: accountTweets.reduce((sum, t) => sum + t.engagement.total, 0),
    avgEngagement: accountTweets.reduce((sum, t) => sum + t.engagement.total, 0) / accountTweets.length,
    
    // Centrality analysis
    avgCentrality: accountTweets.reduce((sum, t) => sum + t.centrality, 0) / accountTweets.length,
    maxCentrality: Math.max(...accountTweets.map(t => t.centrality)),
    
    // Tweet objects for analysis
    tweets: accountTweets.map(tweet => ({
      id: tweet.id,
      content: tweet.content,
      timestamp: tweet.timestamp,
      engagement: tweet.engagement,
      centrality: tweet.centrality,
      type: tweet.type,
      depth: tweet.depth,
      // Include relationship context
      repliesTo: tweet.edges.replies,
      retweets: tweet.edges.retweets,
      quotes: tweet.edges.quotes
    })),
    
    // Discourse flow
    discourseFlow: accountTweets
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map(tweet => ({
        timestamp: tweet.timestamp,
        content: tweet.content,
        type: tweet.type,
        engagement: tweet.engagement.total
      }))
  };
}
```

## Integration with Ada

### Pass Discourse Graph to Ada
```javascript
// In attachXFeedClickHandlers
const discourseGraph = buildDiscourseGraph(conversationThread);
const accountAnalysis = analyzeAccountCommentary(discourseGraph, account);

backgroundContext.push(`DISCOURSE GRAPH ANALYSIS: ${JSON.stringify(discourseGraph, null, 2)}`);
backgroundContext.push(`${account.toUpperCase()}'S DISCOURSE ANALYSIS: ${JSON.stringify(accountAnalysis, null, 2)}`);
backgroundContext.push(`CRITICAL: Analyze ${account}'s commentary using the discourse graph. Consider their discourse role (${accountAnalysis.roles}), their position in the conversation (centrality: ${accountAnalysis.avgCentrality}), and how their tweets relate to others in the graph.`);
```

## Benefits

1. **Relationship Structure**: Understand who replied to whom, conversation flow
2. **Discourse Patterns**: Identify agreement, disagreement, elaboration
3. **Key Node Identification**: Find central tweets, high-engagement nodes
4. **Account Analysis**: Understand account's role (initiator, responder, amplifier)
5. **Contextual Analysis**: See how tweets relate to conversation structure
6. **Better Ada Responses**: Ada can analyze discourse structure, not just text

## Implementation Plan

1. **Phase 1**: Build basic graph structure (nodes + edges)
2. **Phase 2**: Compute graph metrics (centrality, degree)
3. **Phase 3**: Identify discourse patterns (threads, key nodes)
4. **Phase 4**: Account commentary analysis
5. **Phase 5**: Pass discourse graph to Ada for analysis

