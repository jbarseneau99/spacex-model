/**
 * Permanent Memory
 * Hybrid Redis (fast) + MongoDB (persistent) storage for conversation history
 */

class PermanentMemory {
    constructor(redisService, mongoClient = null, embeddingService = null, summarizationService = null, analytics = null) {
        this.redis = redisService;
        this.mongo = mongoClient;
        this.embeddingService = embeddingService; // Optional embedding service
        this.summarizationService = summarizationService; // Optional summarization service
        this.analytics = analytics; // Optional analytics service
        this.batchQueue = [];
        this.batchSize = 10;
        this.batchInterval = 5 * 60 * 1000; // 5 minutes
        this.batchTimer = null;
        this.RECENT_THRESHOLD = 20; // Keep last 20 interactions full detail
        
        // Start batch processing timer
        this.startBatchTimer();
    }
    
    /**
     * Save interaction to memory
     * Enhanced to store embeddings and summaries
     */
    async saveInteraction(interaction) {
        const interactionData = {
            input: interaction.input,
            response: interaction.response,
            relationship: interaction.relationship || null,
            patterns: interaction.patterns || [],
            timestamp: interaction.timestamp || Date.now(),
            sessionId: interaction.sessionId || null,
            userId: interaction.userId || null,
            semantics: {
                topics: interaction.semantics?.topics || [],
                keywords: interaction.semantics?.keywords || [],
                embedding: null, // Will be generated if service available
                inputEmbedding: null,
                responseEmbedding: null
            },
            summary: null // Will be generated if service available
        };
        
        // Generate embeddings if service available
        let embeddingSuccess = false;
        let embeddingCached = false;
        let embeddingFallback = false;
        const embeddingStartTime = Date.now();
        
        if (this.embeddingService && this.embeddingService.isAvailable()) {
            try {
                const combinedText = `${interaction.input} ${interaction.response}`;
                const embStart = Date.now();
                interactionData.semantics.embedding = await this.embeddingService.generateEmbedding(combinedText);
                const embTime = Date.now() - embStart;
                embeddingSuccess = true;
                
                // Check if cached (very fast = likely cached)
                embeddingCached = embTime < 10;
                
                // Also generate separate embeddings for input and response
                interactionData.semantics.inputEmbedding = await this.embeddingService.generateEmbedding(interaction.input);
                interactionData.semantics.responseEmbedding = await this.embeddingService.generateEmbedding(interaction.response);
            } catch (error) {
                // Check if it's a quota/billing error - these are expected and handled gracefully
                const isQuotaError = error.message.includes('quota') || 
                                    error.message.includes('billing') || 
                                    error.message.includes('exceeded') ||
                                    error.message.includes('payment');
                
                // Only log warning if not a quota error (quota errors are expected and handled)
                if (!isQuotaError) {
                    console.warn('⚠️ Failed to generate embeddings:', error.message);
                }
                embeddingFallback = true;
                // Continue without embeddings (works for all error types)
            }
        }
        
        const embeddingTime = Date.now() - embeddingStartTime;
        
        // Track embedding usage (if analytics available)
        if (this.analytics) {
            this.analytics.trackEmbeddingUsage(embeddingSuccess, embeddingCached, embeddingFallback, embeddingTime);
        }
        
        // Generate summary if service available
        if (this.summarizationService && this.summarizationService.enabled) {
            try {
                interactionData.summary = await this.summarizationService.summarizeTurn(interactionData);
            } catch (error) {
                console.warn('⚠️ Failed to generate summary:', error.message);
                // Continue without summary
            }
        }
        
        // Fast save to Redis
        if (this.redis && this.redis.isReady()) {
            await this.redis.addInteraction(interactionData);
            
            // Check if we need to summarize old interactions
            const count = await this.redis.getInteractionCount();
            if (count > this.RECENT_THRESHOLD && this.summarizationService) {
                // Summarize old interactions in background (don't await)
                this.summarizeOldInteractions().catch(err => {
                    console.error('❌ Error summarizing old interactions:', err);
                });
            }
        }
        
        // Queue for MongoDB batch save
        this.batchQueue.push(interactionData);
        
        // Save immediately if batch is full
        if (this.batchQueue.length >= this.batchSize) {
            await this.flushBatch();
        }
        
        return true;
    }
    
    /**
     * Summarize old interactions beyond threshold
     */
    async summarizeOldInteractions() {
        if (!this.summarizationService || !this.redis || !this.redis.isReady()) {
            return;
        }
        
        try {
            // Get interactions beyond threshold
            const oldInteractions = await this.redis.getInteractions(
                this.RECENT_THRESHOLD,
                this.RECENT_THRESHOLD + this.batchSize
            );
            
            if (oldInteractions.length === 0) return;
            
            // Summarize batch
            const summary = await this.summarizationService.summarizeInteractions(oldInteractions);
            
            // Store summary
            await this.redis.addSummary({
                interactions: oldInteractions.map(i => i.id || i.timestamp),
                summary: summary,
                timestamp: Date.now(),
                count: oldInteractions.length
            });
            
            console.log(`✅ Summarized ${oldInteractions.length} old interactions`);
        } catch (error) {
            console.error('❌ Error summarizing old interactions:', error);
        }
    }
    
    /**
     * Load all history (Redis + MongoDB)
     * Enhanced to return recent full + older summaries
     */
    async loadAllHistory(limit = 10000) {
        const history = [];
        
        // Load from Redis (fast, recent)
        if (this.redis && this.redis.isReady()) {
            // Get recent full interactions
            const recentFull = await this.redis.getRecentInteractions(this.RECENT_THRESHOLD);
            history.push(...recentFull);
            
            // Get summaries for older interactions if available
            if (this.summarizationService) {
                const summaries = await this.redis.getSummaries(limit - this.RECENT_THRESHOLD);
                // Convert summaries to interaction-like objects for compatibility
                summaries.forEach(summary => {
                    history.push({
                        id: `summary-${summary.timestamp}`,
                        input: '[Summarized]',
                        response: summary.summary,
                        timestamp: summary.timestamp,
                        isSummary: true,
                        summaryCount: summary.count
                    });
                });
            } else {
                // Fallback: load more full interactions if no summarization
                const olderFull = await this.redis.getAllInteractions(limit);
                history.push(...olderFull.filter(i => 
                    !recentFull.some(r => r.timestamp === i.timestamp)
                ));
            }
        }
        
        // Load from MongoDB (older, persistent)
        if (this.mongo) {
            try {
                const mongoHistory = await this.loadFromMongo(limit);
                history.push(...mongoHistory);
            } catch (error) {
                console.error('❌ Error loading from MongoDB:', error);
            }
        }
        
        // Sort by timestamp and deduplicate
        const sorted = history
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
            .slice(-limit);
        
        return this.deduplicate(sorted);
    }
    
    /**
     * Get recent interactions
     */
    async getRecentInteractions(count = 100) {
        if (this.redis && this.redis.isReady()) {
            return await this.redis.getRecentInteractions(count);
        }
        
        // Fallback to MongoDB
        if (this.mongo) {
            return await this.loadFromMongo(count);
        }
        
        return [];
    }
    
    /**
     * Detect patterns in history
     */
    async detectPatterns(history = null) {
        const historyToAnalyze = history || await this.loadAllHistory(1000);
        
        // Check Redis cache first
        if (this.redis && this.redis.isReady()) {
            const historyHash = this.hashHistory(historyToAnalyze);
            const cached = await this.redis.getCachedPatterns(historyHash);
            if (cached) {
                return cached;
            }
        }
        
        // Compute patterns
        const patterns = this.computePatterns(historyToAnalyze);
        
        // Cache in Redis
        if (this.redis && this.redis.isReady()) {
            const historyHash = this.hashHistory(historyToAnalyze);
            await this.redis.cachePatterns(historyHash, patterns, 1800); // 30 min TTL
        }
        
        return patterns;
    }
    
    /**
     * Infer chains (A→B + B→C = A→C)
     */
    async inferChains(history = null) {
        const historyToAnalyze = history || await this.loadAllHistory(1000);
        const chains = [];
        
        // Simple chain inference: look for sequential relationships
        for (let i = 0; i < historyToAnalyze.length - 2; i++) {
            const turn1 = historyToAnalyze[i];
            const turn2 = historyToAnalyze[i + 1];
            const turn3 = historyToAnalyze[i + 2];
            
            // Check if turn2 relates to turn1 and turn3 relates to turn2
            if (turn1.relationship && turn2.relationship && turn3.relationship) {
                // If both are continuations or strong relatedness, infer chain
                if ((turn2.relationship === 1 || turn2.relationship === 2) &&
                    (turn3.relationship === 1 || turn3.relationship === 2)) {
                    chains.push({
                        start: turn1.input,
                        middle: turn2.input,
                        end: turn3.input,
                        confidence: 0.7
                    });
                }
            }
        }
        
        return chains;
    }
    
    /**
     * Compute patterns from history
     */
    computePatterns(history) {
        const patterns = {
            causalChains: [],
            contradictions: [],
            recurringThemes: []
        };
        
        // Extract topics from all interactions
        const topics = {};
        history.forEach(interaction => {
            const text = (interaction.input || interaction.response || '').toLowerCase();
            const words = text.split(/\s+/).filter(w => w.length > 3);
            words.forEach(word => {
                topics[word] = (topics[word] || 0) + 1;
            });
        });
        
        // Find recurring themes (words mentioned 3+ times)
        patterns.recurringThemes = Object.entries(topics)
            .filter(([word, count]) => count >= 3)
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        
        // Find contradictions (relationship category 8)
        patterns.contradictions = history.filter(i => i.relationship === 8);
        
        return patterns;
    }
    
    /**
     * Load from MongoDB
     */
    async loadFromMongo(limit = 1000) {
        if (!this.mongo) return [];
        
        // This would need to be implemented based on your MongoDB schema
        // For now, return empty array
        return [];
    }
    
    /**
     * Flush batch queue to MongoDB
     */
    async flushBatch() {
        if (this.batchQueue.length === 0) return;
        
        const batch = [...this.batchQueue];
        this.batchQueue = [];
        
        if (this.mongo) {
            try {
                // Save batch to MongoDB
                // This would need to be implemented based on your MongoDB schema
                console.log(`💾 Flushing ${batch.length} interactions to MongoDB`);
            } catch (error) {
                console.error('❌ Error flushing batch to MongoDB:', error);
                // Re-queue failed items
                this.batchQueue.unshift(...batch);
            }
        }
    }
    
    /**
     * Start batch timer
     */
    startBatchTimer() {
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
        }
        
        this.batchTimer = setInterval(() => {
            if (this.batchQueue.length > 0) {
                this.flushBatch();
            }
        }, this.batchInterval);
    }
    
    /**
     * Hash history for cache key
     */
    hashHistory(history) {
        const hash = history
            .slice(-10) // Last 10 interactions
            .map(i => (i.input || '').substring(0, 50))
            .join('|');
        
        // Simple hash (can be improved)
        let hashValue = 0;
        for (let i = 0; i < hash.length; i++) {
            const char = hash.charCodeAt(i);
            hashValue = ((hashValue << 5) - hashValue) + char;
            hashValue = hashValue & hashValue; // Convert to 32bit integer
        }
        return Math.abs(hashValue).toString(36);
    }
    
    /**
     * Deduplicate interactions by timestamp and input
     */
    deduplicate(interactions) {
        const seen = new Set();
        return interactions.filter(interaction => {
            const key = `${interaction.timestamp}-${(interaction.input || '').substring(0, 50)}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}

module.exports = PermanentMemory;





