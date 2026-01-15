/**
 * Semantic Analyzer
 * Analyzes semantic similarity between texts, extracts topics, and detects patterns
 * Enhanced with vector embeddings support (with Jaccard fallback)
 */

const EmbeddingService = require('../services/EmbeddingService');

class SemanticAnalyzer {
    constructor(embeddingService = null) {
        // Embedding service (optional - injected via constructor)
        this.embeddingService = embeddingService;
        
        // Simple word-based similarity (fallback)
        this.stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
            'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
            'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
        ]);
    }
    
    /**
     * Calculate semantic similarity between two texts (0-1)
     * Uses embeddings if available, falls back to Jaccard similarity
     * Returns similarity score where 1 = identical, 0 = completely different
     */
    async calculateSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;
        
        // Try embeddings first if service available
        if (this.embeddingService && this.embeddingService.isAvailable()) {
            try {
                const embedding1 = await this.embeddingService.generateEmbedding(text1);
                const embedding2 = await this.embeddingService.generateEmbedding(text2);
                const similarity = this.embeddingService.calculateSimilarity(embedding1, embedding2);
                
                // Ensure similarity is between 0 and 1
                return Math.max(0, Math.min(1, similarity));
            } catch (error) {
                // Check if it's a quota/billing error - these are expected and handled gracefully
                const isQuotaError = error.message.includes('quota') || 
                                    error.message.includes('billing') || 
                                    error.message.includes('exceeded');
                
                // Only log warning if not a quota error (quota errors are expected and handled)
                if (!isQuotaError) {
                    console.warn('⚠️ Embedding similarity failed, falling back to Jaccard:', error.message);
                }
                // Fall through to Jaccard similarity (works for all error types)
            }
        }
        
        // Fallback to Jaccard similarity
        return this.calculateSimilarityJaccard(text1, text2);
    }
    
    /**
     * Calculate Jaccard similarity (word-based fallback)
     */
    calculateSimilarityJaccard(text1, text2) {
        if (!text1 || !text2) return 0;
        
        const words1 = this.tokenize(text1);
        const words2 = this.tokenize(text2);
        
        if (words1.length === 0 || words2.length === 0) return 0;
        
        // Calculate Jaccard similarity
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }
    
    /**
     * Extract topics from text
     */
    extractTopics(text) {
        const words = this.tokenize(text);
        const wordFreq = {};
        
        words.forEach(word => {
            if (!this.stopWords.has(word.toLowerCase())) {
                wordFreq[word.toLowerCase()] = (wordFreq[word.toLowerCase()] || 0) + 1;
            }
        });
        
        // Get top 5 most frequent words as topics
        const topics = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
        
        return topics;
    }
    
    /**
     * Detect if texts are about the same topic
     * Note: Now async due to potential embedding usage
     */
    async isSameTopic(text1, text2, threshold = 0.3) {
        const similarity = await this.calculateSimilarity(text1, text2);
        return similarity >= threshold;
    }
    
    /**
     * Detect if text is a continuation/extension of another
     * Note: Now async due to potential embedding usage
     */
    async isContinuation(text1, text2, threshold = 0.5) {
        const similarity = await this.calculateSimilarity(text1, text2);
        return similarity >= threshold;
    }
    
    /**
     * Detect if text contradicts another
     * Note: Now async due to potential embedding usage
     */
    async detectsContradiction(text1, text2) {
        const contradictionKeywords = [
            'but', 'however', 'although', 'despite', 'nevertheless', 'yet',
            'contrary', 'opposite', 'different', 'disagree', 'wrong', 'incorrect',
            'no', 'not', 'never', 'none', 'nothing'
        ];
        
        const words1 = this.tokenize(text1.toLowerCase());
        const words2 = this.tokenize(text2.toLowerCase());
        
        // Check if text2 contains contradiction keywords
        const hasContradictionKeywords = contradictionKeywords.some(keyword =>
            words2.includes(keyword)
        );
        
        // Check if topics are similar but sentiment differs
        const sameTopic = await this.isSameTopic(text1, text2);
        
        return sameTopic && hasContradictionKeywords;
    }
    
    /**
     * Tokenize text into words
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);
    }
    
    /**
     * Calculate topic overlap percentage
     */
    calculateTopicOverlap(text1, text2) {
        const topics1 = this.extractTopics(text1);
        const topics2 = this.extractTopics(text2);
        
        if (topics1.length === 0 || topics2.length === 0) return 0;
        
        const set1 = new Set(topics1);
        const set2 = new Set(topics2);
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }
}

module.exports = SemanticAnalyzer;





