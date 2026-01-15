/**
 * Relationship Detector
 * Detects relationship category (1-9) between new input and current context
 */

const SemanticAnalyzer = require('./SemanticAnalyzer');
const TransitionSelector = require('./TransitionSelector');

class RelationshipDetector {
    constructor(redisService, embeddingService = null) {
        // Inject embedding service into semantic analyzer (optional)
        this.semanticAnalyzer = new SemanticAnalyzer(embeddingService);
        this.transitionSelector = new TransitionSelector();
        this.redis = redisService;
    }
    
    /**
     * Detect relationship between new input and current context
     * Returns: { category: 1-9, confidence: 0-1, similarity: 0-1, transitionPhrase: string }
     */
    async detectRelationship(newInput, context) {
        const {
            currentSentence = null,
            recentTurns = [],
            fullHistory = [],
            currentStock = null,
            newStock = null,
            isFirstInteraction = false
        } = context;
        
        // Category 9: First interaction / no history
        if (isFirstInteraction || (!currentSentence && recentTurns.length === 0)) {
            const transitionPhrase = this.transitionSelector.selectTransition(9);
            return {
                category: 9,
                confidence: 1.0,
                similarity: 0,
                transitionPhrase
            };
        }
        
        // Category 7: Explicit resumption
        if (await this.detectsResumption(newInput, recentTurns, fullHistory)) {
            const transitionPhrase = this.transitionSelector.selectTransition(7);
            return {
                category: 7,
                confidence: 0.9,
                similarity: 0.5,
                transitionPhrase
            };
        }
        
        // Category 8: Contradiction / challenge
        if (currentSentence && await this.semanticAnalyzer.detectsContradiction(currentSentence, newInput)) {
            const transitionPhrase = this.transitionSelector.selectTransition(8);
            const similarity = await this.semanticAnalyzer.calculateSimilarity(currentSentence, newInput);
            return {
                category: 8,
                confidence: 0.85,
                similarity: similarity,
                transitionPhrase
            };
        }
        
        // Calculate similarity scores (now async)
        const currentSimilarity = currentSentence 
            ? await this.semanticAnalyzer.calculateSimilarity(currentSentence, newInput)
            : 0;
        
        const recentSimilarityPromises = recentTurns.length > 0
            ? recentTurns.map(turn => 
                this.semanticAnalyzer.calculateSimilarity(turn.input || turn.response || '', newInput)
            )
            : [];
        const recentSimilarities = await Promise.all(recentSimilarityPromises);
        const recentSimilarity = recentSimilarities.length > 0
            ? Math.max(...recentSimilarities)
            : 0;
        
        const maxSimilarity = Math.max(currentSimilarity, recentSimilarity);
        
        // Category 1: Direct continuation / extension (>75% similarity with current)
        if (currentSimilarity >= 0.75) {
            const transitionPhrase = this.transitionSelector.selectTransition(1);
            return {
                category: 1,
                confidence: 0.9,
                similarity: currentSimilarity,
                transitionPhrase
            };
        }
        
        // Category 2: Strong topical relatedness (>75% similarity)
        if (maxSimilarity >= 0.75) {
            const transitionPhrase = this.transitionSelector.selectTransition(2, {
                previousStock: currentStock,
                currentStock: newStock
            });
            return {
                category: 2,
                confidence: 0.85,
                similarity: maxSimilarity,
                transitionPhrase
            };
        }
        
        // Category 3: Moderate topical relatedness (40-75%)
        if (maxSimilarity >= 0.40 && maxSimilarity < 0.75) {
            const transitionPhrase = this.transitionSelector.selectTransition(3, {
                previousStock: currentStock,
                currentStock: newStock
            });
            return {
                category: 3,
                confidence: 0.75,
                similarity: maxSimilarity,
                transitionPhrase
            };
        }
        
        // Category 5: Logical clarification/refinement (moderate similarity, clarification keywords)
        if (maxSimilarity >= 0.30 && this.detectsClarification(newInput)) {
            const transitionPhrase = this.transitionSelector.selectTransition(5);
            return {
                category: 5,
                confidence: 0.8,
                similarity: maxSimilarity,
                transitionPhrase
            };
        }
        
        // Category 4: Logical pattern reinforcement (check for patterns)
        const patternMatch = await this.detectPatternMatch(newInput, fullHistory);
        if (patternMatch) {
            const transitionPhrase = this.transitionSelector.selectTransition(4);
            return {
                category: 4,
                confidence: patternMatch.confidence,
                similarity: maxSimilarity,
                transitionPhrase,
                pattern: patternMatch.pattern
            };
        }
        
        // Category 6: Weak/unrelated shift (<40%)
        const transitionPhrase = this.transitionSelector.selectTransitionWithContext(6, {
            previousStock: currentStock,
            currentStock: newStock
        });
        return {
            category: 6,
            confidence: 0.7,
            similarity: maxSimilarity,
            transitionPhrase
        };
    }
    
    /**
     * Detect if input is a resumption of earlier topic
     * Note: Now async due to potential embedding usage
     * Optimized to limit API calls when embeddings unavailable
     */
    async detectsResumption(newInput, recentTurns, fullHistory) {
        const resumptionKeywords = [
            'back to', 'return to', 'resume', 'continue', 'earlier', 'before',
            'previous', 'we discussed', 'we talked about', 'going back'
        ];
        
        const inputLower = newInput.toLowerCase();
        const hasResumptionKeywords = resumptionKeywords.some(keyword =>
            inputLower.includes(keyword)
        );
        
        if (!hasResumptionKeywords) return false;
        
        // Check if embedding service is available (to avoid excessive API calls)
        const embeddingAvailable = this.semanticAnalyzer.embeddingService?.isAvailable();
        
        // Limit search to recent turns if embeddings unavailable (to avoid API spam)
        const searchTurns = embeddingAvailable 
            ? [...recentTurns, ...fullHistory.slice(-20)]
            : recentTurns.slice(0, 5); // Only check last 5 if no embeddings
        
        // Check if input matches an earlier topic
        for (const turn of searchTurns) {
            const turnText = (turn.input || turn.response || '').toLowerCase();
            
            // Skip if turn text is too short
            if (turnText.length < 10) continue;
            
            try {
                const similarity = await this.semanticAnalyzer.calculateSimilarity(turnText, inputLower);
                if (similarity > 0.4) {
                    return true;
                }
            } catch (error) {
                // If embedding fails, continue with next turn (fallback will be used)
                continue;
            }
        }
        
        return false;
    }
    
    /**
     * Detect if input is asking for clarification
     */
    detectsClarification(input) {
        const clarificationKeywords = [
            'what', 'how', 'why', 'explain', 'clarify', 'elaborate',
            'more about', 'tell me more', 'can you', 'could you',
            'focus on', 'zoom in', 'drill down', 'specifically'
        ];
        
        const inputLower = input.toLowerCase();
        return clarificationKeywords.some(keyword => inputLower.includes(keyword));
    }
    
    /**
     * Detect if input matches a pattern from history
     */
    async detectPatternMatch(newInput, fullHistory) {
        if (fullHistory.length < 3) return null;
        
        // Simple pattern detection: check if input follows same structure as recent turns
        const recentPatterns = this.extractPatterns(fullHistory.slice(-10));
        
        for (const pattern of recentPatterns) {
            const match = this.matchesPattern(newInput, pattern);
            if (match) {
                return {
                    pattern: pattern.type,
                    confidence: match.confidence
                };
            }
        }
        
        return null;
    }
    
    /**
     * Extract patterns from history
     */
    extractPatterns(history) {
        const patterns = [];
        
        // Check for question-answer pattern
        let questionCount = 0;
        let statementCount = 0;
        
        history.forEach(turn => {
            const text = (turn.input || '').toLowerCase();
            if (text.includes('?') || this.detectsClarification(text)) {
                questionCount++;
            } else {
                statementCount++;
            }
        });
        
        if (questionCount > statementCount * 0.5) {
            patterns.push({ type: 'question-answer', confidence: 0.7 });
        }
        
        // Check for topic progression pattern
        const topics = history.map(turn => 
            this.semanticAnalyzer.extractTopics(turn.input || turn.response || '')
        );
        
        const topicOverlap = this.calculateTopicProgression(topics);
        if (topicOverlap > 0.5) {
            patterns.push({ type: 'topic-progression', confidence: topicOverlap });
        }
        
        return patterns;
    }
    
    /**
     * Check if input matches a pattern
     */
    matchesPattern(input, pattern) {
        if (pattern.type === 'question-answer') {
            const isQuestion = input.includes('?') || this.detectsClarification(input);
            return isQuestion ? { confidence: 0.7 } : null;
        }
        
        return null;
    }
    
    /**
     * Calculate topic progression score
     */
    calculateTopicProgression(topics) {
        if (topics.length < 2) return 0;
        
        let overlapSum = 0;
        for (let i = 1; i < topics.length; i++) {
            const set1 = new Set(topics[i - 1]);
            const set2 = new Set(topics[i]);
            const intersection = new Set([...set1].filter(x => set2.has(x)));
            const union = new Set([...set1, ...set2]);
            overlapSum += intersection.size / union.size;
        }
        
        return overlapSum / (topics.length - 1);
    }
}

module.exports = RelationshipDetector;





