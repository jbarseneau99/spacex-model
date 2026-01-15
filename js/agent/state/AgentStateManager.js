/**
 * Agent State Manager
 * Centralized state management with Redis backing for shared state across instances
 */

class AgentStateManager {
    constructor(redisService) {
        this.redis = redisService;
        this.subscribers = [];
        this.localState = {
            isSpeaking: false,
            currentSentence: null,
            currentSentencePosition: null,
            currentStock: null,
            recentTurns: [],
            isWaitingForNewAudio: false,
            pendingStockRequest: null,
            firstAudioChunkReceived: false
        };
        
        // Subscribe to Redis state updates
        if (this.redis && this.redis.isReady()) {
            this.redis.subscribe('agent:state:updates', (updates) => {
                this.handleRemoteUpdate(updates);
            });
        }
    }
    
    /**
     * Update state
     */
    async update(updates) {
        // Update local state
        Object.assign(this.localState, updates);
        
        // Update Redis (shared state)
        if (this.redis && this.redis.isReady()) {
            await this.redis.updateState(updates);
        }
        
        // Notify subscribers
        this.notifySubscribers(updates);
    }
    
    /**
     * Get state value
     */
    async get(key) {
        // Try Redis first (most up-to-date)
        if (this.redis && this.redis.isReady()) {
            const redisValue = await this.redis.getState(key);
            if (redisValue !== null) {
                this.localState[key] = redisValue;
                return redisValue;
            }
        }
        
        // Fallback to local state
        return this.localState[key];
    }
    
    /**
     * Get all state
     */
    async getAll() {
        // Try Redis first
        if (this.redis && this.redis.isReady()) {
            const redisState = await this.redis.getAllState();
            if (Object.keys(redisState).length > 0) {
                Object.assign(this.localState, redisState);
                return redisState;
            }
        }
        
        // Fallback to local state
        return { ...this.localState };
    }
    
    /**
     * Handle remote state update (from Redis pub/sub)
     */
    handleRemoteUpdate(updates) {
        Object.assign(this.localState, updates);
        this.notifySubscribers(updates);
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(callback) {
        this.subscribers.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.subscribers.indexOf(callback);
            if (index > -1) {
                this.subscribers.splice(index, 1);
            }
        };
    }
    
    /**
     * Notify all subscribers
     */
    notifySubscribers(updates) {
        this.subscribers.forEach(callback => {
            try {
                callback(updates, this.localState);
            } catch (error) {
                console.error('❌ Error in state subscriber callback:', error);
            }
        });
    }
    
    /**
     * Reset state
     */
    async reset() {
        this.localState = {
            isSpeaking: false,
            currentSentence: null,
            currentSentencePosition: null,
            currentStock: null,
            recentTurns: [],
            isWaitingForNewAudio: false,
            pendingStockRequest: null,
            firstAudioChunkReceived: false
        };
        
        if (this.redis && this.redis.isReady()) {
            await this.redis.clearState();
        }
        
        this.notifySubscribers(this.localState);
    }
    
    /**
     * Add recent turn to history
     */
    async addRecentTurn(turn) {
        const recentTurns = await this.get('recentTurns') || [];
        recentTurns.push({
            ...turn,
            timestamp: Date.now()
        });
        
        // Keep last 5 turns
        const trimmed = recentTurns.slice(-5);
        await this.update({ recentTurns: trimmed });
    }
    
    /**
     * Get recent turns
     */
    async getRecentTurns(count = 5) {
        const recentTurns = await this.get('recentTurns') || [];
        return recentTurns.slice(-count);
    }
}

module.exports = AgentStateManager;






