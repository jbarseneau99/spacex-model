/**
 * Transition Selector
 * Selects appropriate transition phrases based on relationship category
 */

class TransitionSelector {
    constructor() {
        // Transition phrases for each relationship category
        this.transitions = {
            1: [ // Direct continuation / extension
                "Exactly – let's go deeper on that…",
                "Perfect follow-up…",
                "Building on that…",
                "Let me expand on that…"
            ],
            2: [ // Strong topical relatedness (>75%)
                "That connects perfectly…",
                "This fits right in…",
                "Related to what we were discussing…",
                "That ties in nicely…"
            ],
            3: [ // Moderate topical relatedness (40-75%)
                "Building on our earlier point…",
                "Related angle here…",
                "This connects to what we covered…",
                "Similar theme…"
            ],
            4: [ // Logical pattern reinforcement
                "Another instance of this pattern…",
                "See the chain growing…",
                "This follows the same pattern…",
                "The pattern continues…"
            ],
            5: [ // Logical clarification/refinement
                "Good – let's focus precisely on…",
                "Clarifying that part…",
                "Zooming in on…",
                "Let's drill down into…"
            ],
            6: [ // Weak/unrelated shift (<40%)
                "Ok, switching topics…",
                "Moving to your new selection…",
                "Let's shift focus to…",
                "Switching to…"
            ],
            7: [ // Explicit resumption
                "Going back to where we left off…",
                "Picking up the earlier thread…",
                "Resuming our discussion about…",
                "Returning to…"
            ],
            8: [ // Contradiction / challenge
                "Interesting challenge – let's examine that…",
                "Good point – let's reconsider…",
                "That's a valid concern…",
                "Let's address that directly…"
            ],
            9: [ // First interaction / no history
                "Starting fresh with this…",
                "Let's begin with…",
                "Looking at…",
                "Examining…"
            ]
        };
        
        // Track usage to avoid repetition
        this.recentTransitions = [];
        this.maxRecent = 10;
    }
    
    /**
     * Select transition phrase for relationship category
     */
    selectTransition(relationshipCategory, context = {}) {
        const category = relationshipCategory || 6; // Default to weak shift
        const phrases = this.transitions[category] || this.transitions[6];
        
        // Filter out recently used phrases
        const availablePhrases = phrases.filter(phrase => 
            !this.recentTransitions.includes(phrase)
        );
        
        // Use available phrases or fall back to all phrases
        const candidates = availablePhrases.length > 0 ? availablePhrases : phrases;
        
        // Random selection (can be made smarter based on context)
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        
        // Track usage
        this.recentTransitions.push(selected);
        if (this.recentTransitions.length > this.maxRecent) {
            this.recentTransitions.shift();
        }
        
        return selected;
    }
    
    /**
     * Get transition phrase with context awareness
     */
    selectTransitionWithContext(relationshipCategory, context) {
        const baseTransition = this.selectTransition(relationshipCategory, context);
        
        // Add context-specific modifications
        if (context.previousStock && context.currentStock) {
            // For stock switches, include stock names
            if (relationshipCategory === 6) {
                return `Switching to ${context.currentStock}…`;
            } else if (relationshipCategory === 2 || relationshipCategory === 3) {
                return `${baseTransition} ${context.currentStock} relates to ${context.previousStock}…`;
            }
        }
        
        return baseTransition;
    }
    
    /**
     * Clear recent transitions (for testing or reset)
     */
    clearRecent() {
        this.recentTransitions = [];
    }
}

module.exports = TransitionSelector;






