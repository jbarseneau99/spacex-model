/**
 * Summarization Service
 * Summarizes conversations for efficient storage
 * Infrastructure service - can use different LLM providers
 */

class SummarizationService {
    constructor(llmService, config = {}) {
        this.llmService = llmService; // Injected LLM service (must have generate method)
        this.enabled = config.enabled !== false && llmService !== null;
        this.batchSize = config.batchSize || 10;
        this.maxLength = config.maxLength || 200;
    }
    
    /**
     * Check if service is available
     */
    isAvailable() {
        return this.enabled && this.llmService !== null;
    }
    
    /**
     * Summarize a single conversation turn
     */
    async summarizeTurn(interaction) {
        if (!this.isAvailable()) {
            return null;
        }
        
        try {
            const prompt = `Summarize this conversation turn in 2-3 sentences, focusing on:
- Key topics discussed
- Important decisions or insights
- Any questions asked or answered

User: ${interaction.input}
Assistant: ${interaction.response}

Summary:`;
            
            const summary = await this.llmService.generate(prompt);
            return summary.trim();
        } catch (error) {
            console.error('❌ Error summarizing turn:', error);
            return null;
        }
    }
    
    /**
     * Summarize multiple interactions
     */
    async summarizeInteractions(interactions, maxLength = null) {
        if (!this.isAvailable() || interactions.length === 0) {
            return null;
        }
        
        const targetLength = maxLength || this.maxLength;
        
        try {
            const combined = interactions.map((i, idx) => 
                `Turn ${idx + 1}:\nUser: ${i.input}\nAssistant: ${i.response}`
            ).join('\n\n');
            
            const prompt = `Summarize these ${interactions.length} conversation turns in approximately ${targetLength} words, focusing on:
- Main topics discussed across all turns
- Key insights or decisions made
- Important patterns or themes
- Questions asked and answers provided

Conversations:
${combined}

Summary:`;
            
            const summary = await this.llmService.generate(prompt);
            return summary.trim();
        } catch (error) {
            console.error('❌ Error summarizing interactions:', error);
            return null;
        }
    }
}

module.exports = SummarizationService;


