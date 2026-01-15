/**
 * Redis Service for Agent Communication System
 * Provides fast access to conversation history, state management, pattern caching, and queues
 */

let redis;
try {
  redis = require('redis');
} catch (error) {
  console.warn('⚠️ Redis module not available:', error.message);
  console.warn('⚠️ Redis features will be disabled');
  redis = null;
}

class RedisService {
    constructor() {
        this.client = null;
        this.subscriber = null;
        this.isConnected = false;
    }
    
    /**
     * Connect to Redis server
     */
    async connect() {
        if (!redis) {
            console.warn('⚠️ Redis module not available - Redis features disabled');
            this.isConnected = false;
            return;
        }
        
        if (this.isConnected && this.client) {
            console.log('✅ Redis already connected');
            return;
        }
        
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
            const redisPassword = process.env.REDIS_PASSWORD || null;
            
            const config = {
                url: redisUrl,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            console.error('❌ Redis: Max reconnection attempts reached');
                            return new Error('Max reconnection attempts reached');
                        }
                        return Math.min(retries * 100, 3000);
                    }
                }
            };
            
            if (redisPassword) {
                config.password = redisPassword;
            }
            
            if (!redis) {
                throw new Error('Redis module not available');
            }
            
            this.client = redis.createClient(config);
            this.subscriber = this.client.duplicate();
            
            // Error handling
            this.client.on('error', (err) => {
                console.error('❌ Redis Client Error:', err);
                this.isConnected = false;
            });
            
            this.subscriber.on('error', (err) => {
                console.error('❌ Redis Subscriber Error:', err);
            });
            
            // Connect
            await this.client.connect();
            await this.subscriber.connect();
            
            this.isConnected = true;
            console.log('✅ Redis connected successfully');
            
            // Test connection
            await this.client.ping();
            console.log('✅ Redis ping successful');
            
        } catch (error) {
            console.error('❌ Redis connection failed:', error);
            console.warn('⚠️ Continuing without Redis - some features may be limited');
            this.isConnected = false;
        }
    }
    
    /**
     * Disconnect from Redis
     */
    async disconnect() {
        if (this.client) {
            await this.client.quit();
        }
        if (this.subscriber) {
            await this.subscriber.quit();
        }
        this.isConnected = false;
        console.log('✅ Redis disconnected');
    }
    
    /**
     * Check if Redis is connected
     */
    isReady() {
        return this.isConnected && this.client && this.client.isReady;
    }
    
    // ============================================================================
    // Conversation History Management
    // ============================================================================
    
    /**
     * Add interaction to conversation history
     */
    async addInteraction(interaction) {
        if (!this.isReady()) {
            console.warn('⚠️ Redis not ready, skipping interaction save');
            return;
        }
        
        try {
            const interactionData = {
                input: interaction.input,
                response: interaction.response,
                relationship: interaction.relationship || null,
                patterns: interaction.patterns || [],
                timestamp: interaction.timestamp || Date.now(),
                sessionId: interaction.sessionId || null,
                userId: interaction.userId || null
            };
            
            await this.client.lPush('agent:interactions', JSON.stringify(interactionData));
            
            // Keep last 10,000 interactions
            await this.client.lTrim('agent:interactions', 0, 9999);
            
            return true;
        } catch (error) {
            console.error('❌ Error adding interaction to Redis:', error);
            return false;
        }
    }
    
    /**
     * Get recent interactions
     */
    async getRecentInteractions(count = 100) {
        if (!this.isReady()) {
            return [];
        }
        
        try {
            const interactions = await this.client.lRange('agent:interactions', 0, count - 1);
            return interactions.map(i => JSON.parse(i));
        } catch (error) {
            console.error('❌ Error getting interactions from Redis:', error);
            return [];
        }
    }
    
    /**
     * Get all interactions (up to limit)
     */
    async getAllInteractions(limit = 10000) {
        if (!this.isReady()) {
            return [];
        }
        
        try {
            const interactions = await this.client.lRange('agent:interactions', 0, limit - 1);
            return interactions.map(i => JSON.parse(i));
        } catch (error) {
            console.error('❌ Error getting all interactions from Redis:', error);
            return [];
        }
    }
    
    /**
     * Get interactions in a range (for summarization)
     */
    async getInteractions(start, end) {
        if (!this.isReady()) {
            return [];
        }
        
        try {
            const interactions = await this.client.lRange('agent:interactions', start, end);
            return interactions.map(i => JSON.parse(i));
        } catch (error) {
            console.error('❌ Error getting interactions range from Redis:', error);
            return [];
        }
    }
    
    /**
     * Get interaction count
     */
    async getInteractionCount() {
        if (!this.isReady()) {
            return 0;
        }
        
        try {
            return await this.client.lLen('agent:interactions');
        } catch (error) {
            console.error('❌ Error getting interaction count from Redis:', error);
            return 0;
        }
    }
    
    /**
     * Add summary for old interactions
     */
    async addSummary(summaryData) {
        if (!this.isReady()) {
            console.warn('⚠️ Redis not ready, skipping summary save');
            return false;
        }
        
        try {
            const summaryKey = `agent:summaries:${summaryData.timestamp}`;
            await this.client.set(summaryKey, JSON.stringify(summaryData));
            
            // Add to summaries index (sorted set by timestamp)
            await this.client.zAdd('agent:summaries:index', {
                score: summaryData.timestamp,
                value: summaryKey
            });
            
            return true;
        } catch (error) {
            console.error('❌ Error adding summary to Redis:', error);
            return false;
        }
    }
    
    /**
     * Get summaries (for older interactions)
     */
    async getSummaries(limit = 100) {
        if (!this.isReady()) {
            return [];
        }
        
        try {
            // Get summary keys from index
            const summaryKeys = await this.client.zRange(
                'agent:summaries:index',
                -limit,
                -1,
                { REV: true }
            );
            
            // Load summaries
            const summaries = [];
            for (const key of summaryKeys) {
                const summaryData = await this.client.get(key);
                if (summaryData) {
                    summaries.push(JSON.parse(summaryData));
                }
            }
            
            return summaries;
        } catch (error) {
            console.error('❌ Error getting summaries from Redis:', error);
            return [];
        }
    }
    
    // ============================================================================
    // State Management
    // ============================================================================
    
    /**
     * Update agent state
     */
    async updateState(updates) {
        if (!this.isReady()) {
            return false;
        }
        
        try {
            const pipeline = this.client.multi();
            for (const [key, value] of Object.entries(updates)) {
                pipeline.hSet('agent:state', key, JSON.stringify(value));
            }
            await pipeline.exec();
            
            // Publish update for real-time synchronization
            await this.client.publish('agent:state:updates', JSON.stringify(updates));
            
            return true;
        } catch (error) {
            console.error('❌ Error updating state in Redis:', error);
            return false;
        }
    }
    
    /**
     * Get state value
     */
    async getState(key) {
        if (!this.isReady()) {
            return null;
        }
        
        try {
            const value = await this.client.hGet('agent:state', key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('❌ Error getting state from Redis:', error);
            return null;
        }
    }
    
    /**
     * Get all state
     */
    async getAllState() {
        if (!this.isReady()) {
            return {};
        }
        
        try {
            const state = await this.client.hGetAll('agent:state');
            return Object.fromEntries(
                Object.entries(state).map(([k, v]) => [k, JSON.parse(v)])
            );
        } catch (error) {
            console.error('❌ Error getting all state from Redis:', error);
            return {};
        }
    }
    
    /**
     * Clear state
     */
    async clearState() {
        if (!this.isReady()) {
            return false;
        }
        
        try {
            await this.client.del('agent:state');
            return true;
        } catch (error) {
            console.error('❌ Error clearing state in Redis:', error);
            return false;
        }
    }
    
    // ============================================================================
    // Pattern Caching
    // ============================================================================
    
    /**
     * Cache pattern detection results
     */
    async cachePatterns(historyHash, patterns, ttl = 1800) {
        if (!this.isReady()) {
            return false;
        }
        
        try {
            await this.client.setEx(
                `agent:patterns:${historyHash}`,
                ttl,
                JSON.stringify(patterns)
            );
            return true;
        } catch (error) {
            console.error('❌ Error caching patterns in Redis:', error);
            return false;
        }
    }
    
    /**
     * Get cached patterns
     */
    async getCachedPatterns(historyHash) {
        if (!this.isReady()) {
            return null;
        }
        
        try {
            const cached = await this.client.get(`agent:patterns:${historyHash}`);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('❌ Error getting cached patterns from Redis:', error);
            return null;
        }
    }
    
    /**
     * Clear pattern cache
     */
    async clearPatternCache() {
        if (!this.isReady()) {
            return false;
        }
        
        try {
            const keys = await this.client.keys('agent:patterns:*');
            if (keys.length > 0) {
                await this.client.del(keys);
            }
            return true;
        } catch (error) {
            console.error('❌ Error clearing pattern cache in Redis:', error);
            return false;
        }
    }
    
    // ============================================================================
    // Transition Queue Management
    // ============================================================================
    
    /**
     * Queue transition phrase
     */
    async queueTransition(transition) {
        if (!this.isReady()) {
            return false;
        }
        
        try {
            const transitionData = {
                relationship: transition.relationship,
                transitionPhrase: transition.transitionPhrase,
                timestamp: transition.timestamp || Date.now()
            };
            
            await this.client.lPush('agent:transition:queue', JSON.stringify(transitionData));
            return true;
        } catch (error) {
            console.error('❌ Error queueing transition in Redis:', error);
            return false;
        }
    }
    
    /**
     * Get next transition from queue
     */
    async getNextTransition() {
        if (!this.isReady()) {
            return null;
        }
        
        try {
            const transition = await this.client.rPop('agent:transition:queue');
            return transition ? JSON.parse(transition) : null;
        } catch (error) {
            console.error('❌ Error getting transition from Redis:', error);
            return null;
        }
    }
    
    /**
     * Clear transition queue
     */
    async clearTransitionQueue() {
        if (!this.isReady()) {
            return false;
        }
        
        try {
            await this.client.del('agent:transition:queue');
            return true;
        } catch (error) {
            console.error('❌ Error clearing transition queue in Redis:', error);
            return false;
        }
    }
    
    // ============================================================================
    // Interrupted Position Management
    // ============================================================================
    
    /**
     * Save interrupted position
     */
    async saveInterruptedPosition(position, ttl = 300) {
        if (!this.isReady()) {
            return false;
        }
        
        try {
            await this.client.setEx(
                'agent:interrupted:position',
                ttl,
                JSON.stringify(position)
            );
            return true;
        } catch (error) {
            console.error('❌ Error saving interrupted position in Redis:', error);
            return false;
        }
    }
    
    /**
     * Get interrupted position
     */
    async getInterruptedPosition() {
        if (!this.isReady()) {
            return null;
        }
        
        try {
            const position = await this.client.get('agent:interrupted:position');
            return position ? JSON.parse(position) : null;
        } catch (error) {
            console.error('❌ Error getting interrupted position from Redis:', error);
            return null;
        }
    }
    
    /**
     * Clear interrupted position
     */
    async clearInterruptedPosition() {
        if (!this.isReady()) {
            return false;
        }
        
        try {
            await this.client.del('agent:interrupted:position');
            return true;
        } catch (error) {
            console.error('❌ Error clearing interrupted position in Redis:', error);
            return false;
        }
    }
    
    // ============================================================================
    // Session Management
    // ============================================================================
    
    /**
     * Create or update session
     */
    async createSession(sessionId, data) {
        if (!this.isReady()) {
            return false;
        }
        
        try {
            const sessionData = {
                userId: data.userId || 'anonymous',
                startTime: Date.now().toString(),
                lastActivity: Date.now().toString(),
                currentView: data.currentView || 'dashboard',
                currentReportPosition: JSON.stringify(data.currentReportPosition || {})
            };
            
            await this.client.hSet(`agent:session:${sessionId}`, sessionData);
            await this.client.expire(`agent:session:${sessionId}`, 86400); // 24 hours
            return true;
        } catch (error) {
            console.error('❌ Error creating session in Redis:', error);
            return false;
        }
    }
    
    /**
     * Update session
     */
    async updateSession(sessionId, updates) {
        if (!this.isReady()) {
            return false;
        }
        
        try {
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
            
            // Reset TTL
            await this.client.expire(`agent:session:${sessionId}`, 86400);
            return true;
        } catch (error) {
            console.error('❌ Error updating session in Redis:', error);
            return false;
        }
    }
    
    /**
     * Get session
     */
    async getSession(sessionId) {
        if (!this.isReady()) {
            return null;
        }
        
        try {
            const session = await this.client.hGetAll(`agent:session:${sessionId}`);
            if (!session || Object.keys(session).length === 0) {
                return null;
            }
            
            return {
                userId: session.userId,
                startTime: parseInt(session.startTime),
                lastActivity: parseInt(session.lastActivity),
                currentView: session.currentView,
                currentReportPosition: JSON.parse(session.currentReportPosition || '{}')
            };
        } catch (error) {
            console.error('❌ Error getting session from Redis:', error);
            return null;
        }
    }
    
    /**
     * Delete session
     */
    async deleteSession(sessionId) {
        if (!this.isReady()) {
            return false;
        }
        
        try {
            await this.client.del(`agent:session:${sessionId}`);
            return true;
        } catch (error) {
            console.error('❌ Error deleting session in Redis:', error);
            return false;
        }
    }
    
    // ============================================================================
    // Pub/Sub for Real-Time Updates
    // ============================================================================
    
    /**
     * Subscribe to channel
     */
    async subscribe(channel, callback) {
        if (!this.isReady() || !this.subscriber) {
            return false;
        }
        
        try {
            await this.subscriber.subscribe(channel, (message) => {
                try {
                    callback(JSON.parse(message));
                } catch (error) {
                    console.error('❌ Error parsing pub/sub message:', error);
                }
            });
            return true;
        } catch (error) {
            console.error('❌ Error subscribing to Redis channel:', error);
            return false;
        }
    }
    
    /**
     * Unsubscribe from channel
     */
    async unsubscribe(channel) {
        if (!this.isReady() || !this.subscriber) {
            return false;
        }
        
        try {
            await this.subscriber.unsubscribe(channel);
            return true;
        } catch (error) {
            console.error('❌ Error unsubscribing from Redis channel:', error);
            return false;
        }
    }
    
    /**
     * Publish to channel
     */
    async publish(channel, data) {
        if (!this.isReady()) {
            return false;
        }
        
        try {
            await this.client.publish(channel, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('❌ Error publishing to Redis channel:', error);
            return false;
        }
    }
    
    // ============================================================================
    // Utility Methods
    // ============================================================================
    
    /**
     * Get Redis info
     */
    async getInfo() {
        if (!this.isReady()) {
            return { connected: false };
        }
        
        try {
            const info = await this.client.info();
            const interactionCount = await this.client.lLen('agent:interactions');
            const stateKeys = await this.client.hLen('agent:state');
            const patternCacheKeys = (await this.client.keys('agent:patterns:*')).length;
            
            return {
                connected: true,
                interactionCount,
                stateKeys,
                patternCacheKeys,
                info: info.substring(0, 200) // First 200 chars
            };
        } catch (error) {
            console.error('❌ Error getting Redis info:', error);
            return { connected: false, error: error.message };
        }
    }
    
    /**
     * Flush all agent data (for testing/cleanup)
     */
    async flushAgentData() {
        if (!this.isReady()) {
            return false;
        }
        
        try {
            const keys = [
                'agent:interactions',
                'agent:state',
                'agent:transition:queue',
                'agent:interrupted:position'
            ];
            
            // Get pattern cache keys
            const patternKeys = await this.client.keys('agent:patterns:*');
            keys.push(...patternKeys);
            
            // Get session keys
            const sessionKeys = await this.client.keys('agent:session:*');
            keys.push(...sessionKeys);
            
            if (keys.length > 0) {
                await this.client.del(keys);
            }
            
            console.log('✅ Flushed all agent data from Redis');
            return true;
        } catch (error) {
            console.error('❌ Error flushing agent data from Redis:', error);
            return false;
        }
    }
}

// Export singleton instance
let redisServiceInstance = null;

function getRedisService() {
    if (!redisServiceInstance) {
        redisServiceInstance = new RedisService();
    }
    return redisServiceInstance;
}

module.exports = { RedisService, getRedisService };

