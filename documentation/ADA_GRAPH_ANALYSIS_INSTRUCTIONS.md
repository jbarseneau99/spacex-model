# Ada's Discourse Graph Analysis Instructions

## What Ada Receives

### 1. Full Discourse Graph Structure
```json
{
  "conversationId": "tweet1",
  "rootTweetId": "tweet1",
  "participantCount": 3,
  "participants": ["Starlink", "TMFAssociates", "SpaceXAnalyst"],
  "tweetCount": 4,
  "edgeCount": 3,
  "keyNodes": ["tweet3", "tweet2"],
  "threadCount": 1
}
```

### 2. Full Graph with All Nodes and Edges
```json
{
  "nodes": {
    "tweet1": { "account": "@Starlink", "centrality": 0.85, "discourseRole": "initiator", ... },
    "tweet2": { "account": "@TMFAssociates", "centrality": 0.61, "discourseRole": "challenger", "skepticism": { "isSkeptical": true, "hasContradiction": true }, ... },
    "tweet3": { "account": "@TMFAssociates", "centrality": 0.61, "discourseRole": "challenger", "skepticism": { "isSkeptical": true, "hasConditional": true }, ... },
    "tweet4": { "account": "@TMFAssociates", "centrality": 0.61, "discourseRole": "amplifier", ... }
  },
  "edges": {
    "tweet1->tweet2": { "source": "tweet1", "target": "tweet2", "type": "reply" },
    "tweet2->tweet3": { "source": "tweet2", "target": "tweet3", "type": "reply" },
    "tweet1->tweet4": { "source": "tweet1", "target": "tweet4", "type": "retweet" }
  }
}
```

### 3. Account Discourse Analysis
```json
{
  "account": "@TMFAssociates",
  "tweetCount": 3,
  "roles": {
    "challenger": 2,
    "amplifier": 1
  },
  "isSkeptical": true,
  "skepticalTweetCount": 2,
  "avgSkepticismConfidence": 0.70,
  "primaryDiscourseRole": "challenger",
  "avgCentrality": 0.61,
  "tweets": [
    {
      "id": "tweet2",
      "content": "But 1.2M messages indicates most of them haven't ever used it...",
      "discourseRole": "challenger",
      "skepticism": { "isSkeptical": true, "hasContradiction": true, "confidence": 0.70 },
      "centrality": 0.61,
      "depth": 1,
      "repliesTo": ["tweet1"]
    },
    {
      "id": "tweet3",
      "content": "I'd also sign up if a) I was subject to frequent random attacks... and b) it was free",
      "discourseRole": "challenger",
      "skepticism": { "isSkeptical": true, "hasConditional": true, "confidence": 0.70 },
      "centrality": 0.61,
      "depth": 2,
      "repliesTo": ["tweet2"]
    },
    {
      "id": "tweet4",
      "content": "Reposting this Starlink announcement",
      "discourseRole": "amplifier",
      "centrality": 0.61,
      "depth": 1,
      "retweets": ["tweet1"]
    }
  ],
  "discourseFlow": [
    { "timestamp": "2024-01-15T10:05:00Z", "content": "But 1.2M messages...", "role": "challenger" },
    { "timestamp": "2024-01-15T10:07:00Z", "content": "I'd also sign up if...", "role": "challenger" },
    { "timestamp": "2024-01-15T10:10:00Z", "content": "Reposting this...", "role": "amplifier" }
  ]
}
```

### 4. Graph-Based Interpretation Guide (for Skeptical Accounts)
```
🚨 GRAPH-BASED INTERPRETATION GUIDE:
@TMFAssociates is CHALLENGER with 2 skeptical tweets. Graph analysis reveals:
1. CENTRALITY (0.61): @TMFAssociates is CENTRAL to the conversation - their skepticism drives the discourse
2. ROLE DOMINANCE: CHALLENGER (2) vs AMPLIFIER (1) = SKEPTICISM is primary
3. DISCOURSE FLOW: 1. challenger at 10:05 → 2. challenger at 10:07 → 3. amplifier at 10:10
4. EDGE TYPES: Reply edges show CHALLENGE, retweet edge shows SHARING (not endorsement)
5. SKEPTICAL LANGUAGE: contradiction, conditional

INTERPRETATION: @TMFAssociates is QUESTIONING/CHALLENGING claims, not endorsing them. 
The graph structure (2 challenger tweets, centrality 0.61) confirms SKEPTICAL intent. 
Analyze what they're skeptical about, not what they're amplifying.
```

### 5. System Prompt Instructions
```
GRAPH-BASED ANALYSIS EXAMPLE:
If the discourse graph shows an account with:
- 2 CHALLENGER tweets vs 1 AMPLIFIER tweet
- Centrality > 0.5 (CENTRAL to conversation)
- Reply edges showing CHALLENGE to root tweet
- Retweet edge AFTER skeptical comments
- Skeptical language (contradiction + conditional)

Then the account is SKEPTICAL, not bullish. Their tweets mean:
- CHALLENGING subscriber claims (not amplifying)
- QUESTIONING actual usage (not celebrating)
- CAUTIONING about market context (not bullish)
- IMPLYING peacetime markets won't see same adoption (not suggesting upward revision)
- Retweet AFTER comments = sharing for DISCUSSION, not ENDORSEMENT

USE THE GRAPH STRUCTURE:
- Count challenger vs amplifier roles (challenger > amplifier = skeptical)
- Check centrality (high = central to conversation, their view matters)
- Analyze edge types (reply = challenge, retweet after comments = discussion)
- Follow discourse flow chronologically (challenge → elaborate → share)
- Identify skeptical language patterns (contradiction, conditional)
```

## How Ada Should Analyze

### Step 1: Check Graph Structure
- **Nodes**: 4 tweets (Starlink + 3 Tim tweets)
- **Edges**: 3 relationships (2 replies, 1 retweet)
- **Tim's centrality**: 0.61 (CENTRAL)

### Step 2: Check Discourse Roles
- **Challenger**: 2 tweets
- **Amplifier**: 1 tweet
- **Primary role**: CHALLENGER
- **Conclusion**: Skepticism is primary

### Step 3: Analyze Edge Types
- **tweet2 → tweet1**: Reply = CHALLENGE
- **tweet3 → tweet2**: Reply = ELABORATION
- **tweet4 → tweet1**: Retweet AFTER comments = DISCUSSION, not endorsement

### Step 4: Check Skepticism
- **2 skeptical tweets** (confidence: 0.70)
- **Tweet 2**: Contradiction ("But...")
- **Tweet 3**: Conditional ("I'd sign up IF...")

### Step 5: Follow Discourse Flow
- **10:05**: Challenge Starlink's claim
- **10:07**: Elaborate on skepticism
- **10:10**: Retweet for discussion

### Step 6: Interpret Intent
Based on graph structure:
- **Centrality 0.61** = Central to conversation
- **2 challenger vs 1 amplifier** = Skepticism primary
- **Reply edges** = Challenging, not endorsing
- **Retweet after comments** = Sharing for discussion

## Expected Ada Response

"Tim Farrar is challenging Starlink's Direct to Cell subscriber claims. He points out that 1.2M messages for 3M subscribers suggests most haven't actually used the service - this is a data validity challenge. His conditional statement - that he'd sign up if in a war zone AND it was free - reveals his skepticism about peacetime market adoption. This suggests we should be cautious about extrapolating Ukraine's war-driven, free-service adoption to normal market conditions. Tim's analysis implies the valuation impact may be less positive than the raw subscriber numbers suggest. His retweet comes AFTER his skeptical comments, indicating he's sharing for discussion/analysis, not endorsing."

## What Ada Should NOT Say

❌ "Tim Farrar is amplifying Starlink's announcement..."
❌ "Extraordinary adoption velocity..."
❌ "This validates the massive TAM assumptions..."
❌ "This demonstrates revenue acceleration potential..."

## Verification Checklist

✅ Graph structure received (4 nodes, 3 edges)
✅ Account analysis received (challenger: 2, amplifier: 1)
✅ Skepticism detected (2 tweets, confidence 0.70)
✅ Centrality calculated (0.61 = CENTRAL)
✅ Discourse flow provided (chronological order)
✅ Edge types identified (reply = challenge, retweet = discussion)
✅ Graph-based interpretation guide provided
✅ System prompt includes graph analysis instructions

