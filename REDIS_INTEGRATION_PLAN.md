# Redis Integration Plan for Agent Communication System

## Why Redis?

Redis is perfect for the agent communication system because:

1. **Fast Permanent Memory** - Sub-millisecond reads/writes for conversation history
2. **Real-Time State** - Shared state across multiple instances/sessions
3. **Pattern Caching** - Cache expensive pattern detection results
4. **Queue Management** - Audio chunk queues, transition queues
5. **Pub/Sub** - Real-time state synchronization
6. **TTL Support** - Auto-expire temporary state (interrupted positions, etc.)

## Redis Data Structures

### 1. Conversation History
```
Key: agent:interactions
Type: List
Value: JSON stringified interaction objects
TTL: None (persistent)
Example:
[
  {
    "input": "Tell me about AAPL",
    "response": "Apple Inc. is...",
    "relationship": 9,
    "patterns": [],
    "timestamp": 1234567890
  }
]
```

### 2. Current State
```
Key: agent:state
Type: Hash
Fields:
  - isSpeaking: boolean
  - currentSentence: string
  - currentPosition: number (sentence position)
  - recentTurns: JSON array
  - currentStock: string
TTL: None (updated in real-time)
```

### 3. Pattern Cache
```
Key: agent:patterns:{hash}
Type: String (JSON)
Value: Pattern detection results
TTL: 1800 seconds (30 min)
Example:
{
  "causalChains": [...],
  "contradictions": [...],
  "recurringThemes": [...]
}
```

### 4. Transition Queue
```
Key: agent:transition:queue
Type: List
Value: JSON stringified transition objects
TTL: Auto-expire after processing
Example:
[
  {
    "relationship": 2,
    "transitionPhrase": "That connects perfectly...",
    "timestamp": 1234567890
  }
]
```

### 5. Interrupted Position
```
Key: agent:interrupted:position
Type: String (JSON)
Value: Current sentence position when interrupted
TTL: 300 seconds (5 min)
Example:
{
  "sentenceIndex": 2,
  "wordIndex": 15,
  "audioPosition": 1234.5
}
```

### 6. Audio Chunk Queue
```
Key: agent:audio:queue:{sessionId}
Type: List
Value: Base64 audio chunks
TTL: Auto-expire after playback
```

### 7. Session State
```
Key: agent:session:{sessionId}
Type: Hash
Fields:
  - userId: string
  - startTime: timestamp
  - lastActivity: timestamp
  - currentView: string
  - currentReportPosition: JSON
TTL: 86400 seconds (24 hours)
```

## Redis Service Module

```javascript
// services/redis-service.js
const redis = require('redis');

class RedisService {
    constructor() {
        this.client = null;
        this.subscriber = null;
    }
    
    async connect() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.client = redis.createClient({ url: redisUrl });
        this.subscriber = this.client.duplicate();
        
        await this.client.connect();
        await this.subscriber.connect();
        
        console.log('✅ Redis connected');
    }
    
    // Conversation History
    async addInteraction(interaction) {
        await this.client.lPush('agent:interactions', JSON.stringify(interaction));
        // Keep last 10,000 interactions
        await this.client.lTrim('agent:interactions', 0, 9999);
    }
    
    async getRecentInteractions(count = 100) {
        const interactions = await this.client.lRange('agent:interactions', 0, count - 1);
        return interactions.map(i => JSON.parse(i));
    }
    
    // State Management
    async updateState(updates) {
        const pipeline = this.client.multi();
        for (const [key, value] of Object.entries(updates)) {
            pipeline.hSet('agent:state', key, JSON.stringify(value));
        }
        await pipeline.exec();
        
        // Publish update
        await this.client.publish('agent:state:updates', JSON.stringify(updates));
    }
    
    async getState(key) {
        const value = await this.client.hGet('agent:state', key);
        return value ? JSON.parse(value) : null;
    }
    
    async getAllState() {
        const state = await this.client.hGetAll('agent:state');
        return Object.fromEntries(
            Object.entries(state).map(([k, v]) => [k, JSON.parse(v)])
        );
    }
    
    // Pattern Caching
    async cachePatterns(historyHash, patterns, ttl = 1800) {
        await this.client.setEx(
            `agent:patterns:${historyHash}`,
            ttl,
            JSON.stringify(patterns)
        );
    }
    
    async getCachedPatterns(historyHash) {
        const cached = await this.client.get(`agent:patterns:${historyHash}`);
        return cached ? JSON.parse(cached) : null;
    }
    
    // Transition Queue
    async queueTransition(transition) {
        await this.client.lPush('agent:transition:queue', JSON.stringify(transition));
    }
    
    async getNextTransition() {
        const transition = await this.client.rPop('agent:transition:queue');
        return transition ? JSON.parse(transition) : null;
    }
    
    // Interrupted Position
    async saveInterruptedPosition(position, ttl = 300) {
        await this.client.setEx(
            'agent:interrupted:position',
            ttl,
            JSON.stringify(position)
        );
    }
    
    async getInterruptedPosition() {
        const position = await this.client.get('agent:interrupted:position');
        return position ? JSON.parse(position) : null;
    }
    
    // Session Management
    async createSession(sessionId, data) {
        await this.client.hSet(`agent:session:${sessionId}`, {
            userId: data.userId || 'anonymous',
            startTime: Date.now().toString(),
            lastActivity: Date.now().toString(),
            currentView: data.currentView || 'dashboard',
            currentReportPosition: JSON.stringify(data.currentReportPosition || {})
        });
        await this.client.expire(`agent:session:${sessionId}`, 86400);
    }
    
    async updateSession(sessionId, updates) {
        const pipeline = this.client.multi();
        for (const [key, value] of Object.entries(updates)) {
            if (typeof value === 'object') {
                pipeline.hSet(`agent:session:${sessionId}`, key, JSON.stringify(value));
            } else {
                pipeline.hSet(`agent:session:${sessionId}`, key, value.toString());
            }
        }
        pipeline.hSet(`agent:session:${sessionId}`, 'lastActivity', Date.now().toString());
        await pipeline.exec();
    }
    
    async getSession(sessionId) {
        const session = await this.client.hGetAll(`agent:session:${sessionId}`);
        if (!session || Object.keys(session).length === 0) return null;
        
        return {
            userId: session.userId,
            startTime: parseInt(session.startTime),
            lastActivity: parseInt(session.lastActivity),
            currentView: session.currentView,
            currentReportPosition: JSON.parse(session.currentReportPosition || '{}')
        };
    }
    
    // Pub/Sub for real-time updates
    subscribe(channel, callback) {
        this.subscriber.subscribe(channel, (message) => {
            callback(JSON.parse(message));
        });
    }
    
    async publish(channel, data) {
        await this.client.publish(channel, JSON.stringify(data));
    }
}
```

## Integration Points

### 1. Server Setup
```javascript
// server.js
const RedisService = require('./services/redis-service');
const redisService = new RedisService();

// Initialize Redis on server start
redisService.connect().catch(console.error);
```

### 2. Agent Communication System
```javascript
// js/agent/AgentCommunicationSystem.js
class AgentCommunicationSystem {
    constructor(redisService) {
        this.redis = redisService;
        this.memory = new PermanentMemory(redisService);
        this.state = new AgentStateManager(redisService);
        this.interruption = new InterruptionManager(redisService);
    }
}
```

### 3. Permanent Memory
```javascript
// js/agent/memory/PermanentMemory.js
class PermanentMemory {
    constructor(redisService, mongoClient) {
        this.redis = redisService;
        this.mongo = mongoClient;
    }
    
    async saveInteraction(input, response, relationship, patterns) {
        const interaction = {
            input,
            response,
            relationship,
            patterns,
            timestamp: Date.now()
        };
        
        // Fast save to Redis
        await this.redis.addInteraction(interaction);
        
        // Batch save to MongoDB (every 10 interactions or 5 minutes)
        await this.batchSaveToMongo(interaction);
    }
    
    async loadAllHistory() {
        // Fast load from Redis (recent)
        const redisHistory = await this.redis.getRecentInteractions(1000);
        
        // Complete load from MongoDB (older)
        const mongoHistory = await this.mongo.loadOlderInteractions(1000);
        
        return [...redisHistory, ...mongoHistory].sort((a, b) => a.timestamp - b.timestamp);
    }
}
```

## Environment Configuration

```bash
# .env
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=  # Optional
REDIS_DB=0  # Default database
```

## Package.json Update

```json
{
  "dependencies": {
    "redis": "^4.6.0"
  }
}
```

## Benefits

1. **Performance**: Sub-millisecond access to conversation history
2. **Scalability**: Shared state across multiple server instances
3. **Real-Time**: Pub/sub for instant state synchronization
4. **Caching**: Pattern detection results cached for 30 minutes
5. **Queue Management**: Audio chunks and transitions queued efficiently
6. **Session Management**: Auto-expiring session state

## Migration Strategy

1. **Phase 1**: Install Redis, create RedisService
2. **Phase 2**: Migrate state management to Redis
3. **Phase 3**: Migrate conversation history to Redis + MongoDB hybrid
4. **Phase 4**: Add pattern caching
5. **Phase 5**: Add pub/sub for real-time updates

## Redis Commands Reference

```bash
# Monitor Redis
redis-cli monitor

# Check conversation history length
redis-cli LLEN agent:interactions

# View recent interactions
redis-cli LRANGE agent:interactions 0 9

# Check current state
redis-cli HGETALL agent:state

# View pattern cache
redis-cli KEYS agent:patterns:*

# Check session
redis-cli HGETALL agent:session:{sessionId}
```






