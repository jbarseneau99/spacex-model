/**
 * Embedding Service
 * Generates vector embeddings for semantic similarity
 * Infrastructure service - can be swapped for different providers
 */

const fetch = require('node-fetch');

class EmbeddingService {
    constructor(config = {}) {
        this.provider = config.provider || 'openai'; // 'openai' | 'local' | 'cohere'
        this.model = config.model || 'text-embedding-3-small';
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
        this.cache = new Map(); // Simple in-memory cache
        this.cacheSize = config.cacheSize || 1000; // Max cache entries
        this.enabled = config.enabled !== false;
        
        // Circuit breaker for API failures
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.circuitBreakerThreshold = 3; // Fail after 3 consecutive failures
        this.circuitBreakerTimeout = 5 * 60 * 1000; // 5 minutes
        this.circuitOpen = false;
    }
    
    /**
     * Check if service is enabled and configured
     */
    isAvailable() {
        // Check circuit breaker first
        if (this.circuitOpen) {
            const timeSinceFailure = Date.now() - this.lastFailureTime;
            if (timeSinceFailure > this.circuitBreakerTimeout) {
                // Reset circuit breaker after timeout
                console.log('✅ Embedding service circuit breaker reset - will retry');
                this.circuitOpen = false;
                this.failureCount = 0;
            } else {
                // Circuit is still open - don't attempt API calls
                return false;
            }
        }
        
        return this.enabled && this.apiKey && this.apiKey !== 'undefined';
    }
    
    /**
     * Record API failure
     */
    recordFailure(error = null) {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        // Check if it's a quota/billing error
        const isQuotaError = error && (
            error.message.includes('quota') || 
            error.message.includes('billing') || 
            error.message.includes('exceeded') ||
            error.message.includes('payment')
        );
        
        if (this.failureCount >= this.circuitBreakerThreshold) {
            this.circuitOpen = true;
            if (isQuotaError) {
                console.warn(`⚠️ Embedding API quota exceeded - circuit breaker opened. System will use Jaccard similarity fallback.`);
            } else {
                console.warn(`⚠️ Embedding API circuit breaker opened after ${this.failureCount} failures. Will retry in ${this.circuitBreakerTimeout / 1000}s`);
            }
        }
    }
    
    /**
     * Record API success (reset failure count)
     */
    recordSuccess() {
        this.failureCount = 0;
        this.circuitOpen = false;
    }
    
    /**
     * Generate embedding for text
     */
    async generateEmbedding(text) {
        if (!this.isAvailable()) {
            throw new Error('Embedding service not available');
        }
        
        if (!text || text.trim().length === 0) {
            throw new Error('Text cannot be empty');
        }
        
        // Check cache
        const cacheKey = this.hashText(text);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        // Generate embedding based on provider
        let embedding;
        try {
            switch (this.provider) {
                case 'openai':
                    embedding = await this.generateOpenAIEmbedding(text);
                    this.recordSuccess(); // Reset failure count on success
                    break;
                case 'local':
                    embedding = await this.generateLocalEmbedding(text);
                    this.recordSuccess();
                    break;
                default:
                    throw new Error(`Unknown provider: ${this.provider}`);
            }
            
            // Cache result (with size limit)
            if (this.cache.size >= this.cacheSize) {
                // Remove oldest entry (simple FIFO)
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            this.cache.set(cacheKey, embedding);
            
            return embedding;
        } catch (error) {
            // Check if it's a quota/billing error - these are expected and handled gracefully
            const isQuotaError = error.message.includes('quota') || 
                                error.message.includes('billing') || 
                                error.message.includes('exceeded') ||
                                error.message.includes('payment');
            
            // Record failure for circuit breaker (pass error for quota detection)
            this.recordFailure(error);
            
            // NEVER log quota errors - they're expected and handled gracefully via fallback
            // Only log other errors if circuit breaker is not already open (to avoid spam)
            if (!isQuotaError && !this.circuitOpen) {
                console.error('❌ Error generating embedding:', error.message);
            }
            
            throw error;
        }
    }
    
    /**
     * Generate embedding using OpenAI API
     */
    async generateOpenAIEmbedding(text) {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                input: text.substring(0, 8000) // Limit to 8000 chars
            })
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
            const errorMessage = error.error?.message || response.statusText;
            
            // Check for quota/billing errors specifically
            if (errorMessage.includes('quota') || errorMessage.includes('billing') || errorMessage.includes('exceeded')) {
                throw new Error(`OpenAI API error: ${errorMessage}`);
            }
            
            throw new Error(`OpenAI API error: ${errorMessage}`);
        }
        
        const data = await response.json();
        if (!data.data || !data.data[0] || !data.data[0].embedding) {
            throw new Error('Invalid response from OpenAI API');
        }
        
        return data.data[0].embedding; // Returns array of numbers
    }
    
    /**
     * Generate embedding using local model (placeholder for future implementation)
     */
    async generateLocalEmbedding(text) {
        // TODO: Implement local embedding model (e.g., Sentence-BERT)
        // For now, throw error
        throw new Error('Local embedding model not yet implemented');
    }
    
    /**
     * Calculate cosine similarity between embeddings
     */
    calculateSimilarity(embedding1, embedding2) {
        if (!embedding1 || !embedding2) {
            return 0;
        }
        
        if (embedding1.length !== embedding2.length) {
            console.warn('⚠️ Embedding dimensions mismatch');
            return 0;
        }
        
        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;
        
        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            magnitude1 += embedding1[i] * embedding1[i];
            magnitude2 += embedding2[i] * embedding2[i];
        }
        
        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);
        
        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }
        
        return dotProduct / (magnitude1 * magnitude2);
    }
    
    /**
     * Hash text for cache key
     */
    hashText(text) {
        // Simple hash - use first 100 chars + length
        const normalized = text.trim().substring(0, 100).toLowerCase();
        return `${normalized.length}-${normalized.replace(/\s+/g, ' ')}`;
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
    
    /**
     * Get cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.cacheSize,
            hitRate: 0 // Could track hits/misses if needed
        };
    }
}

module.exports = EmbeddingService;

