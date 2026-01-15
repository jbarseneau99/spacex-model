/**
 * Response Builder
 * Builds coherent, context-aware responses incorporating relationship information,
 * history, patterns, and current state
 */

const ContextIntegrator = require('./ContextIntegrator');

class ResponseBuilder {
    constructor(memory, stateManager, contextIntegrator = null) {
        this.memory = memory;
        this.state = stateManager;
        this.contextIntegrator = contextIntegrator || new ContextIntegrator(memory, stateManager);
    }
    
    /**
     * Build response with full context
     */
    async buildResponse(input, relationship, additionalContext = {}) {
        // Build comprehensive context
        const context = await this.contextIntegrator.buildContext(input, relationship, additionalContext);
        
        // Build response instructions based on relationship
        const instructions = this.buildResponseInstructions(relationship, context);
        
        // Build context string for prompt
        const contextString = await this.contextIntegrator.buildContextString(input, relationship, additionalContext);
        
        return {
            instructions,
            contextString,
            context,
            relationship
        };
    }
    
    /**
     * Build response instructions based on relationship
     */
    buildResponseInstructions(relationship, context) {
        const instructions = [];
        
        // Base instruction
        instructions.push(`Respond to: "${context.input}"`);
        
        // Relationship-specific instructions
        switch (relationship.category) {
            case 1: // Direct continuation
                instructions.push('This is a direct continuation of the current discussion.');
                instructions.push('Continue seamlessly from where we left off.');
                instructions.push('Build on the previous point naturally.');
                break;
                
            case 2: // Strong topical relatedness
                instructions.push('This connects strongly to our previous discussion.');
                if (context.continuityContext.previousTopic) {
                    instructions.push(`Reference how this relates to ${context.continuityContext.previousTopic}.`);
                }
                instructions.push('Show the connection explicitly.');
                break;
                
            case 3: // Moderate topical relatedness
                instructions.push('This builds on our earlier point.');
                instructions.push('Reference the previous discussion briefly.');
                instructions.push('Then shift focus to the new topic.');
                break;
                
            case 4: // Pattern reinforcement
                instructions.push('This follows a pattern we\'ve seen before.');
                if (relationship.pattern) {
                    instructions.push(`The pattern is: ${relationship.pattern}.`);
                }
                instructions.push('Explicitly name the pattern and show how this fits.');
                break;
                
            case 5: // Clarification
                instructions.push('This is asking for clarification or more detail.');
                instructions.push('Focus precisely on what was asked.');
                instructions.push('Provide more depth and specificity.');
                break;
                
            case 6: // Weak shift
                instructions.push('This is a new topic shift.');
                instructions.push('Start fresh on the new topic.');
                instructions.push('Minimal or no reference to previous discussion.');
                break;
                
            case 7: // Resumption
                instructions.push('This is resuming an earlier discussion.');
                if (context.relationshipContext.resumeFrom) {
                    instructions.push(`Resume from: ${JSON.stringify(context.relationshipContext.resumeFrom.turn)}`);
                }
                instructions.push('Continue as if no interruption occurred.');
                break;
                
            case 8: // Contradiction
                instructions.push('This challenges or contradicts the previous discussion.');
                instructions.push('Re-evaluate the prior logic.');
                instructions.push('Present both sides or correct if necessary.');
                instructions.push('Be respectful and analytical, not defensive.');
                break;
                
            case 9: // First interaction
                instructions.push('This is the first interaction.');
                instructions.push('Respond naturally and directly.');
                instructions.push('No need for formal introduction or setup.');
                break;
        }
        
        // Add pattern insights if available
        if (context.patternContext.themeInsights && context.patternContext.themeInsights.length > 0) {
            instructions.push('\nPattern insights:');
            context.patternContext.themeInsights.forEach(insight => {
                instructions.push(`- ${insight.insight}`);
            });
        }
        
        // Add continuity instructions
        if (context.continuityContext.shouldMaintainFlow) {
            instructions.push('\nMaintain conversational flow - this continues naturally from previous discussion.');
        } else if (context.continuityContext.shouldAcknowledgeShift) {
            instructions.push('\nAcknowledge the topic shift naturally.');
        }
        
        return instructions.join('\n');
    }
    
    /**
     * Enhance system prompt with relationship context
     */
    enhanceSystemPrompt(basePrompt, relationship, context) {
        let enhancedPrompt = basePrompt;
        
        // CRITICAL: Always reinforce Ada's identity - she is NOT Grok
        enhancedPrompt += '\n\nCRITICAL IDENTITY REMINDER: You are Ada, the Mach33 Assistant. You are NOT Grok. Never say "I am Grok" or "This is Grok" - you are Ada speaking to Aaron.';
        
        // Add conversational acknowledgment guidance
        enhancedPrompt += '\n\nCONVERSATIONAL TONE: When a user types a question or message, acknowledge it naturally and conversationally before responding. Briefly reference what they asked about or acknowledge their question to make the conversation feel more natural and engaged. For example, if they ask "What is SpaceX valuation?", you might start with "The SpaceX valuation is..." or "Looking at the SpaceX valuation..." - this acknowledges their question naturally.';
        
        // Add relationship-specific guidance
        if (relationship.category <= 3) {
            enhancedPrompt += '\n\nIMPORTANT: This response should reference and build on the previous discussion. Maintain conversational continuity.';
        } else if (relationship.category === 6) {
            enhancedPrompt += '\n\nIMPORTANT: This is a topic shift. Start fresh on the new topic with minimal reference to previous discussion.';
        } else if (relationship.category === 7) {
            enhancedPrompt += '\n\nIMPORTANT: This is resuming an earlier discussion. Continue as if no interruption occurred.';
        } else if (relationship.category === 8) {
            enhancedPrompt += '\n\nIMPORTANT: This challenges previous discussion. Re-evaluate logically and present both sides respectfully.';
        }
        
        // Add pattern guidance
        if (context.patternContext.recurringThemes.length > 0) {
            const themes = context.patternContext.recurringThemes.slice(0, 3).map(t => t.word);
            enhancedPrompt += `\n\nRecurring themes in conversation: ${themes.join(', ')}. Consider these when responding.`;
        }
        
        return enhancedPrompt;
    }
    
    /**
     * Build message for agent API
     */
    async buildAgentMessage(input, relationship, context, systemPrompt) {
        // Build response instructions
        const responseInstructions = await this.buildResponse(input, relationship, context);
        
        // Enhance system prompt
        const enhancedSystemPrompt = this.enhanceSystemPrompt(
            systemPrompt,
            relationship,
            responseInstructions.context
        );
        
        // Build final message
        let message = input;
        
        // Add context if needed
        if (responseInstructions.contextString) {
            message += `\n\n[Context: ${responseInstructions.contextString}]`;
        }
        
        return {
            message,
            systemPrompt: enhancedSystemPrompt,
            instructions: responseInstructions.instructions,
            context: responseInstructions.context
        };
    }
}

module.exports = ResponseBuilder;





