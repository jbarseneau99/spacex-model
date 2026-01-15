/**
 * Context Integrator
 * Builds comprehensive context for response generation, incorporating
 * relationship information, history, patterns, and current state
 */

class ContextIntegrator {
    constructor(memory, stateManager) {
        this.memory = memory;
        this.state = stateManager;
    }
    
    /**
     * Build context for response generation
     */
    async buildContext(input, relationship, additionalContext = {}) {
        const context = {
            // Input information
            input: input,
            relationship: relationship,
            
            // Current state
            currentState: await this.state.getAll(),
            recentTurns: await this.state.getRecentTurns(5),
            
            // History
            fullHistory: await this.memory.loadAllHistory(100),
            
            // Patterns
            patterns: await this.memory.detectPatterns(),
            
            // Additional context
            ...additionalContext
        };
        
        // Add relationship-specific context
        context.relationshipContext = this.buildRelationshipContext(relationship, context);
        
        // Add pattern-based context
        context.patternContext = this.buildPatternContext(context.patterns, context.fullHistory);
        
        // Add continuity context
        context.continuityContext = this.buildContinuityContext(relationship, context.recentTurns);
        
        return context;
    }
    
    /**
     * Build relationship-specific context
     */
    buildRelationshipContext(relationship, context) {
        const relationshipContext = {
            category: relationship.category,
            transitionPhrase: relationship.transitionPhrase,
            shouldReferencePrevious: false,
            shouldCompare: false,
            shouldContrast: false
        };
        
        switch (relationship.category) {
            case 1: // Direct continuation
                relationshipContext.shouldReferencePrevious = true;
                relationshipContext.referenceType = 'continue';
                break;
                
            case 2: // Strong topical relatedness
                relationshipContext.shouldReferencePrevious = true;
                relationshipContext.shouldCompare = true;
                relationshipContext.referenceType = 'connect';
                break;
                
            case 3: // Moderate topical relatedness
                relationshipContext.shouldReferencePrevious = true;
                relationshipContext.referenceType = 'build_on';
                break;
                
            case 4: // Pattern reinforcement
                relationshipContext.shouldReferencePrevious = true;
                relationshipContext.shouldHighlightPattern = true;
                relationshipContext.pattern = relationship.pattern;
                break;
                
            case 5: // Clarification
                relationshipContext.shouldReferencePrevious = true;
                relationshipContext.referenceType = 'clarify';
                break;
                
            case 6: // Weak shift
                relationshipContext.shouldReferencePrevious = false;
                break;
                
            case 7: // Resumption
                relationshipContext.shouldReferencePrevious = true;
                relationshipContext.referenceType = 'resume';
                relationshipContext.resumeFrom = this.findResumePoint(context.fullHistory, context.input);
                break;
                
            case 8: // Contradiction
                relationshipContext.shouldReferencePrevious = true;
                relationshipContext.shouldContrast = true;
                relationshipContext.referenceType = 'address_contradiction';
                break;
                
            case 9: // First interaction
                relationshipContext.shouldReferencePrevious = false;
                break;
        }
        
        return relationshipContext;
    }
    
    /**
     * Build pattern-based context
     */
    buildPatternContext(patterns, history) {
        const patternContext = {
            recurringThemes: patterns.recurringThemes || [],
            contradictions: patterns.contradictions || [],
            causalChains: patterns.causalChains || []
        };
        
        // Add pattern insights
        if (patternContext.recurringThemes.length > 0) {
            patternContext.themeInsights = this.buildThemeInsights(patternContext.recurringThemes);
        }
        
        return patternContext;
    }
    
    /**
     * Build continuity context
     */
    buildContinuityContext(relationship, recentTurns) {
        const continuityContext = {
            shouldMaintainFlow: relationship.category <= 3, // Categories 1-3 maintain flow
            shouldAcknowledgeShift: relationship.category >= 6, // Categories 6+ acknowledge shift
            previousTopic: null,
            currentTopic: null
        };
        
        if (recentTurns.length > 0) {
            const lastTurn = recentTurns[recentTurns.length - 1];
            continuityContext.previousTopic = this.extractTopic(lastTurn.input || lastTurn.response || '');
        }
        
        return continuityContext;
    }
    
    /**
     * Find resume point in history
     */
    findResumePoint(history, input) {
        // Find the most recent turn that matches the input topic
        for (let i = history.length - 1; i >= 0; i--) {
            const turn = history[i];
            const turnText = (turn.input || turn.response || '').toLowerCase();
            const inputLower = input.toLowerCase();
            
            // Simple topic matching
            const turnWords = turnText.split(/\s+/).filter(w => w.length > 3);
            const inputWords = inputLower.split(/\s+/).filter(w => w.length > 3);
            
            const overlap = turnWords.filter(w => inputWords.includes(w));
            if (overlap.length > 0) {
                return {
                    turn: turn,
                    index: i,
                    overlap: overlap
                };
            }
        }
        
        return null;
    }
    
    /**
     * Extract topic from text
     */
    extractTopic(text) {
        // Simple topic extraction (can be enhanced)
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3);
        
        // Return most frequent word as topic
        const freq = {};
        words.forEach(w => freq[w] = (freq[w] || 0) + 1);
        
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? sorted[0][0] : null;
    }
    
    /**
     * Build theme insights
     */
    buildThemeInsights(themes) {
        return themes.map(theme => ({
            word: theme.word,
            frequency: theme.count,
            insight: `This topic has been mentioned ${theme.count} times in recent conversations`
        }));
    }
    
    /**
     * Build context string for prompt
     */
    async buildContextString(input, relationship, additionalContext = {}) {
        const context = await this.buildContext(input, relationship, additionalContext);
        
        let contextString = '';
        
        // Add relationship context
        if (context.relationshipContext.shouldReferencePrevious && context.recentTurns.length > 0) {
            const lastTurn = context.recentTurns[context.recentTurns.length - 1];
            contextString += `Previous discussion: ${(lastTurn.input || lastTurn.response || '').substring(0, 200)}\n\n`;
        }
        
        // Add pattern context
        if (context.patternContext.recurringThemes.length > 0) {
            const themes = context.patternContext.recurringThemes.slice(0, 3);
            contextString += `Recurring themes: ${themes.map(t => t.word).join(', ')}\n\n`;
        }
        
        // Add continuity context
        if (context.continuityContext.previousTopic) {
            contextString += `Previous topic: ${context.continuityContext.previousTopic}\n\n`;
        }
        
        return contextString.trim();
    }
}

module.exports = ContextIntegrator;






