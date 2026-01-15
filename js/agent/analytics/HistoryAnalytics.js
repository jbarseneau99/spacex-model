/**
 * History Analytics
 * Collects data on history functionality for analysis and optimization
 */

class HistoryAnalytics {
    constructor(redisService) {
        this.redis = redisService;
        this.sessionId = null;
        this.metrics = {
            interactions: 0,
            relationships: {},
            similarityScores: [],
            embeddingUsage: {
                total: 0,
                successful: 0,
                failed: 0,
                cacheHits: 0,
                fallbacks: 0
            },
            performance: {
                relationshipDetection: [],
                embeddingGeneration: [],
                memoryOperations: []
            },
            patterns: {
                detected: 0,
                types: {}
            }
        };
    }
    
    /**
     * Set session ID for tracking
     */
    setSessionId(sessionId) {
        this.sessionId = sessionId;
    }
    
    /**
     * Track relationship detection
     */
    trackRelationshipDetection(relationship, timing, context = {}) {
        const data = {
            timestamp: Date.now(),
            sessionId: this.sessionId,
            category: relationship.category,
            confidence: relationship.confidence,
            similarity: relationship.similarity || null,
            timing: timing,
            usedEmbeddings: context.usedEmbeddings || false,
            fallbackUsed: context.fallbackUsed || false,
            inputLength: context.inputLength || 0,
            historyLength: context.historyLength || 0
        };
        
        // Update metrics
        this.metrics.interactions++;
        this.metrics.relationships[relationship.category] = 
            (this.metrics.relationships[relationship.category] || 0) + 1;
        
        if (relationship.similarity !== null && relationship.similarity !== undefined) {
            this.metrics.similarityScores.push({
                category: relationship.category,
                similarity: relationship.similarity,
                timestamp: Date.now()
            });
        }
        
        this.metrics.performance.relationshipDetection.push({
            timing: timing,
            category: relationship.category,
            usedEmbeddings: context.usedEmbeddings || false
        });
        
        // Store in Redis for persistence
        this.saveToRedis('relationship', data).catch(err => {
            console.warn('⚠️ Failed to save relationship data:', err.message);
        });
        
        return data;
    }
    
    /**
     * Track embedding usage
     */
    trackEmbeddingUsage(success, cached = false, fallback = false, timing = null) {
        this.metrics.embeddingUsage.total++;
        
        if (success) {
            this.metrics.embeddingUsage.successful++;
            if (cached) {
                this.metrics.embeddingUsage.cacheHits++;
            }
        } else {
            this.metrics.embeddingUsage.failed++;
            if (fallback) {
                this.metrics.embeddingUsage.fallbacks++;
            }
        }
        
        if (timing !== null) {
            this.metrics.performance.embeddingGeneration.push({
                timing: timing,
                cached: cached,
                success: success
            });
        }
        
        const data = {
            timestamp: Date.now(),
            sessionId: this.sessionId,
            success: success,
            cached: cached,
            fallback: fallback,
            timing: timing
        };
        
        this.saveToRedis('embedding', data).catch(err => {
            console.warn('⚠️ Failed to save embedding data:', err.message);
        });
    }
    
    /**
     * Track memory operations
     */
    trackMemoryOperation(operation, timing, details = {}) {
        this.metrics.performance.memoryOperations.push({
            operation: operation,
            timing: timing,
            timestamp: Date.now(),
            ...details
        });
        
        const data = {
            timestamp: Date.now(),
            sessionId: this.sessionId,
            operation: operation,
            timing: timing,
            ...details
        };
        
        this.saveToRedis('memory', data).catch(err => {
            console.warn('⚠️ Failed to save memory data:', err.message);
        });
    }
    
    /**
     * Track pattern detection
     */
    trackPatternDetection(patterns, timing) {
        this.metrics.patterns.detected++;
        
        patterns.forEach(pattern => {
            const type = pattern.type || 'unknown';
            this.metrics.patterns.types[type] = 
                (this.metrics.patterns.types[type] || 0) + 1;
        });
        
        const data = {
            timestamp: Date.now(),
            sessionId: this.sessionId,
            patterns: patterns,
            count: patterns.length,
            timing: timing
        };
        
        this.saveToRedis('pattern', data).catch(err => {
            console.warn('⚠️ Failed to save pattern data:', err.message);
        });
    }
    
    /**
     * Track similarity comparison
     */
    trackSimilarityComparison(text1, text2, similarity, method, timing = null) {
        const data = {
            timestamp: Date.now(),
            sessionId: this.sessionId,
            text1: text1.substring(0, 100), // Truncate for storage
            text2: text2.substring(0, 100),
            similarity: similarity,
            method: method, // 'embeddings' or 'jaccard'
            timing: timing
        };
        
        this.saveToRedis('similarity', data).catch(err => {
            console.warn('⚠️ Failed to save similarity data:', err.message);
        });
    }
    
    /**
     * Get current metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            summary: this.getSummary()
        };
    }
    
    /**
     * Get summary statistics
     */
    getSummary() {
        const relationshipTimings = this.metrics.performance.relationshipDetection.map(r => r.timing);
        const embeddingTimings = this.metrics.performance.embeddingGeneration.map(e => e.timing);
        const memoryTimings = this.metrics.performance.memoryOperations.map(m => m.timing);
        
        return {
            totalInteractions: this.metrics.interactions,
            relationshipDistribution: this.metrics.relationships,
            averageSimilarity: this.metrics.similarityScores.length > 0
                ? this.metrics.similarityScores.reduce((sum, s) => sum + s.similarity, 0) / this.metrics.similarityScores.length
                : null,
            embeddingStats: {
                total: this.metrics.embeddingUsage.total,
                successRate: this.metrics.embeddingUsage.total > 0
                    ? (this.metrics.embeddingUsage.successful / this.metrics.embeddingUsage.total * 100).toFixed(2) + '%'
                    : '0%',
                cacheHitRate: this.metrics.embeddingUsage.successful > 0
                    ? (this.metrics.embeddingUsage.cacheHits / this.metrics.embeddingUsage.successful * 100).toFixed(2) + '%'
                    : '0%',
                fallbackRate: this.metrics.embeddingUsage.total > 0
                    ? (this.metrics.embeddingUsage.fallbacks / this.metrics.embeddingUsage.total * 100).toFixed(2) + '%'
                    : '0%'
            },
            performance: {
                avgRelationshipDetection: relationshipTimings.length > 0
                    ? (relationshipTimings.reduce((a, b) => a + b, 0) / relationshipTimings.length).toFixed(2) + 'ms'
                    : 'N/A',
                avgEmbeddingGeneration: embeddingTimings.length > 0
                    ? (embeddingTimings.reduce((a, b) => a + b, 0) / embeddingTimings.length).toFixed(2) + 'ms'
                    : 'N/A',
                avgMemoryOperation: memoryTimings.length > 0
                    ? (memoryTimings.reduce((a, b) => a + b, 0) / memoryTimings.length).toFixed(2) + 'ms'
                    : 'N/A'
            },
            patterns: {
                totalDetected: this.metrics.patterns.detected,
                types: this.metrics.patterns.types
            }
        };
    }
    
    /**
     * Save data to Redis
     */
    async saveToRedis(type, data) {
        if (!this.redis || !this.redis.isReady()) {
            return;
        }
        
        try {
            const key = `analytics:history:${type}:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await this.redis.client.set(key, JSON.stringify(data), {
                EX: 86400 * 30 // 30 days expiration
            });
            
            // Add to index
            await this.redis.client.zAdd(`analytics:history:${type}:index`, {
                score: Date.now(),
                value: key
            });
            
            // Add to session index
            if (this.sessionId) {
                await this.redis.client.sAdd(`analytics:session:${this.sessionId}:${type}`, key);
            }
        } catch (error) {
            console.error('❌ Error saving analytics to Redis:', error);
        }
    }
    
    /**
     * Get analytics data from Redis
     */
    async getAnalyticsData(type, limit = 100, sessionId = null) {
        if (!this.redis || !this.redis.isReady()) {
            return [];
        }
        
        try {
            let keys = [];
            
            if (sessionId) {
                // Get keys for specific session
                keys = await this.redis.client.sMembers(`analytics:session:${sessionId}:${type}`);
            } else {
                // Get recent keys from index
                const keyStrings = await this.redis.client.zRange(
                    `analytics:history:${type}:index`,
                    -limit,
                    -1,
                    { REV: true }
                );
                keys = keyStrings;
            }
            
            // Load data
            const data = [];
            for (const key of keys.slice(0, limit)) {
                const value = await this.redis.client.get(key);
                if (value) {
                    data.push(JSON.parse(value));
                }
            }
            
            return data;
        } catch (error) {
            console.error('❌ Error loading analytics from Redis:', error);
            return [];
        }
    }
    
    /**
     * Export metrics to JSON
     */
    exportMetrics() {
        return JSON.stringify({
            metrics: this.metrics,
            summary: this.getSummary(),
            timestamp: Date.now()
        }, null, 2);
    }
    
    /**
     * Reset metrics (keep session ID)
     */
    resetMetrics() {
        this.metrics = {
            interactions: 0,
            relationships: {},
            similarityScores: [],
            embeddingUsage: {
                total: 0,
                successful: 0,
                failed: 0,
                cacheHits: 0,
                fallbacks: 0
            },
            performance: {
                relationshipDetection: [],
                embeddingGeneration: [],
                memoryOperations: []
            },
            patterns: {
                detected: 0,
                types: {}
            }
        };
    }
}

module.exports = HistoryAnalytics;


