/**
 * Memory Retrieval
 * Multi-signal retrieval orchestration
 * Combines time, topic, semantic, and relationship signals
 */

class MemoryRetrieval {
    constructor(redisService, embeddingService = null, knowledgeGraph = null) {
        this.redis = redisService;
        this.embeddingService = embeddingService;
        this.knowledgeGraph = knowledgeGraph;
    }
    
    /**
     * Retrieve interactions using multiple signals
     */
    async retrieve(query, options = {}) {
        const {
            timeWeight = 0.3,
            topicWeight = 0.3,
            semanticWeight = 0.3,
            relationshipWeight = 0.1,
            limit = 20
        } = options;
        
        // Signal 1: Time-based (recent more relevant)
        const timeResults = await this.retrieveByTime(limit);
        
        // Signal 2: Topic-based (same topics more relevant)
        const topicResults = await this.retrieveByTopic(query, limit);
        
        // Signal 3: Semantic-based (if embeddings available)
        const semanticResults = this.embeddingService && this.embeddingService.isAvailable()
            ? await this.retrieveBySemantic(query, limit)
            : [];
        
        // Signal 4: Relationship-based (if graph available)
        const relationshipResults = this.knowledgeGraph && this.knowledgeGraph.initialized
            ? await this.retrieveByRelationship(query, limit)
            : [];
        
        // Combine signals
        return this.combineSignals(
            timeResults,
            topicResults,
            semanticResults,
            relationshipResults,
            { timeWeight, topicWeight, semanticWeight, relationshipWeight },
            limit
        );
    }
    
    /**
     * Retrieve by time (recent first)
     */
    async retrieveByTime(limit) {
        if (!this.redis || !this.redis.isReady()) return [];
        
        try {
            const interactions = await this.redis.getRecentInteractions(limit);
            return interactions.map((interaction, index) => ({
                ...interaction,
                id: interaction.id || `interaction-${interaction.timestamp}`,
                timeRank: index
            }));
        } catch (error) {
            console.error('❌ Error retrieving by time:', error);
            return [];
        }
    }
    
    /**
     * Retrieve by topic (keyword matching)
     */
    async retrieveByTopic(query, limit) {
        if (!this.redis || !this.redis.isReady()) return [];
        
        try {
            // Simple keyword matching for now
            const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const allInteractions = await this.redis.getRecentInteractions(100);
            
            const scored = allInteractions.map(interaction => {
                const text = `${interaction.input} ${interaction.response}`.toLowerCase();
                const matches = queryWords.filter(word => text.includes(word)).length;
                const score = matches / queryWords.length;
                
                return {
                    ...interaction,
                    id: interaction.id || `interaction-${interaction.timestamp}`,
                    topicScore: score
                };
            });
            
            return scored
                .filter(i => i.topicScore > 0)
                .sort((a, b) => b.topicScore - a.topicScore)
                .slice(0, limit);
        } catch (error) {
            console.error('❌ Error retrieving by topic:', error);
            return [];
        }
    }
    
    /**
     * Retrieve by semantic similarity (using embeddings)
     */
    async retrieveBySemantic(query, limit) {
        if (!this.embeddingService || !this.embeddingService.isAvailable() || !this.redis || !this.redis.isReady()) {
            return [];
        }
        
        try {
            const queryEmbedding = await this.embeddingService.generateEmbedding(query);
            const allInteractions = await this.redis.getRecentInteractions(100);
            
            const scored = await Promise.all(allInteractions.map(async (interaction) => {
                // Check if interaction has embedding
                if (!interaction.semantics?.embedding) {
                    // Generate embedding on the fly if missing
                    try {
                        const text = `${interaction.input} ${interaction.response}`;
                        interaction.semantics = interaction.semantics || {};
                        interaction.semantics.embedding = await this.embeddingService.generateEmbedding(text);
                    } catch (error) {
                        return null;
                    }
                }
                
                const similarity = this.embeddingService.calculateSimilarity(
                    queryEmbedding,
                    interaction.semantics.embedding
                );
                
                return {
                    ...interaction,
                    id: interaction.id || `interaction-${interaction.timestamp}`,
                    semanticScore: similarity
                };
            }));
            
            return scored
                .filter(i => i !== null)
                .sort((a, b) => b.semanticScore - a.semanticScore)
                .slice(0, limit);
        } catch (error) {
            console.error('❌ Error retrieving by semantic:', error);
            return [];
        }
    }
    
    /**
     * Retrieve by relationship (using knowledge graph)
     */
    async retrieveByRelationship(query, limit) {
        if (!this.knowledgeGraph || !this.knowledgeGraph.initialized || !this.redis || !this.redis.isReady()) {
            return [];
        }
        
        try {
            // Extract topics from query
            const queryTopics = await this.knowledgeGraph.extractTopicsWithGraph(query);
            
            if (queryTopics.primary.length === 0) return [];
            
            // Find interactions mentioning related nodes
            const relatedNodeIds = new Set();
            queryTopics.primary.forEach(node => relatedNodeIds.add(node.id));
            queryTopics.neighbors.forEach(node => relatedNodeIds.add(node.id));
            
            // Get all interactions and score by relationship
            const allInteractions = await this.redis.getRecentInteractions(100);
            
            const scored = await Promise.all(allInteractions.map(async (interaction) => {
                const text = `${interaction.input} ${interaction.response}`;
                const interactionTopics = await this.knowledgeGraph.extractTopicsWithGraph(text);
                
                // Calculate relationship score
                const primaryMatches = interactionTopics.primary.filter(node =>
                    relatedNodeIds.has(node.id)
                ).length;
                
                const neighborMatches = interactionTopics.neighbors.filter(node =>
                    relatedNodeIds.has(node.id)
                ).length;
                
                const score = (primaryMatches * 1.0 + neighborMatches * 0.5) / Math.max(relatedNodeIds.size, 1);
                
                return {
                    ...interaction,
                    id: interaction.id || `interaction-${interaction.timestamp}`,
                    relationshipScore: score
                };
            }));
            
            return scored
                .filter(i => i.relationshipScore > 0)
                .sort((a, b) => b.relationshipScore - a.relationshipScore)
                .slice(0, limit);
        } catch (error) {
            console.error('❌ Error retrieving by relationship:', error);
            return [];
        }
    }
    
    /**
     * Combine multiple signals with weights
     */
    combineSignals(timeResults, topicResults, semanticResults, relationshipResults, weights, limit) {
        const scored = new Map();
        
        // Score each result from each signal
        [
            { results: timeResults, weight: weights.timeWeight, scoreField: 'timeRank' },
            { results: topicResults, weight: weights.topicWeight, scoreField: 'topicScore' },
            { results: semanticResults, weight: weights.semanticWeight, scoreField: 'semanticScore' },
            { results: relationshipResults, weight: weights.relationshipWeight, scoreField: 'relationshipScore' }
        ].forEach(({ results, weight, scoreField }) => {
            results.forEach((result, rank) => {
                const id = result.id || `interaction-${result.timestamp}`;
                
                // Calculate normalized score (0-1)
                let normalizedScore = 0;
                if (scoreField === 'timeRank') {
                    // Lower rank = higher score (recent = better)
                    normalizedScore = 1 - (rank / Math.max(results.length, 1));
                } else if (result[scoreField] !== undefined) {
                    // Use provided score (already normalized)
                    normalizedScore = Math.max(0, Math.min(1, result[scoreField]));
                }
                
                const weightedScore = normalizedScore * weight;
                
                const current = scored.get(id) || {
                    id: id,
                    score: 0,
                    result: result,
                    signals: {}
                };
                
                current.score += weightedScore;
                current.signals[scoreField] = normalizedScore;
                scored.set(id, current);
            });
        });
        
        // Sort by combined score and return top N
        return Array.from(scored.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => ({
                ...item.result,
                combinedScore: item.score,
                signalScores: item.signals
            }));
    }
}

module.exports = MemoryRetrieval;


