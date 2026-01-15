/**
 * UnifiedInputHandler - Central handler for all Ada inputs
 * Routes clicks, types, and voice through unified processing pipeline
 */

class UnifiedInputHandler {
    constructor(appInstance, adaContextBuilder, voiceOutputHandler) {
        this.app = appInstance;
        this.contextBuilder = adaContextBuilder; // Use AdaContextBuilder
        this.voiceOutputHandler = voiceOutputHandler;
        this.isProcessing = false;
        this.inputQueue = [];
    }

    /**
     * Initialize unified input handler
     */
    initialize() {
        // Listen for all input events
        document.addEventListener('ada:click', (event) => {
            this.handleInput(event.detail);
        });

        document.addEventListener('ada:type', (event) => {
            this.handleInput(event.detail);
        });

        document.addEventListener('ada:voice', (event) => {
            this.handleInput(event.detail);
        });

        console.log('[UnifiedInputHandler] ✅ Initialized');
    }

    /**
     * Handle input from any sensor
     */
    async handleInput(input) {
        // CRITICAL: Log input type to debug routing
        console.log('[UnifiedInputHandler] 📥 Received input:', {
            type: input.type,
            hasText: !!input.text,
            hasTranscript: !!input.transcript,
            hasData: !!input.data,
            textPreview: input.text?.substring(0, 50),
            transcriptPreview: input.transcript?.substring(0, 50)
        });
        
        if (this.isProcessing) {
            // Queue input if already processing
            this.inputQueue.push(input);
            console.log('[UnifiedInputHandler] ⏳ Queuing input (already processing)');
            return;
        }

        this.isProcessing = true;

        try {
            // Build context
            const context = await this.contextBuilder.buildContext(input);
            
            // Build message from input
            const message = this.buildMessage(input, context);
            
            console.log('[UnifiedInputHandler] 📤 Sending message to agent:', {
                messagePreview: message.substring(0, 100),
                inputType: input.type,
                messageLength: message.length
            });
            
            // Prepare stimulus data for tracking
            const stimulus = input.type; // 'click', 'type', or 'voice'
            const stimulusData = this.buildStimulusData(input, context);
            
            // Add user message with stimulus tracking BEFORE sending to agent
            if (this.app && this.app.addAgentMessage) {
                this.app.addAgentMessage(message, 'user', stimulus, stimulusData);
            }
            
            // Send to agent
            const response = await this.sendToAgent(message, context);
            
            // Handle response
            await this.handleResponse(response, input, context);
            
        } catch (error) {
            console.error('[UnifiedInputHandler] ❌ Error processing input:', error);
            this.handleError(error, input);
        } finally {
            this.isProcessing = false;
            
            // Process queued inputs
            if (this.inputQueue.length > 0) {
                const nextInput = this.inputQueue.shift();
                setTimeout(() => this.handleInput(nextInput), 100);
            }
        }
    }

    /**
     * Build message from input
     * CRITICAL: Three distinct behaviors:
     * 1. Click - Ada CREATES the prompt based on what was clicked
     * 2. Text - Ada takes the EXACT text from the user (verbatim)
     * 3. Voice - Ada takes the EXACT transcript from the user (verbatim)
     */
    buildMessage(input, context) {
        console.log('[UnifiedInputHandler] 🔍 Building message, input type:', input.type, {
            hasText: !!input.text,
            hasTranscript: !!input.transcript,
            hasData: !!input.data
        });
        
        switch (input.type) {
            case 'click':
                console.log('[UnifiedInputHandler] 🖱️ Routing to buildClickMessage (Ada creates prompt)');
                return this.buildClickMessage(input, context);
            case 'type':
                console.log('[UnifiedInputHandler] ⌨️ Routing to buildTypeMessage (Ada takes text verbatim)');
                return this.buildTypeMessage(input, context);
            case 'voice':
                console.log('[UnifiedInputHandler] 🎤 Routing to buildVoiceMessage (Ada takes transcript verbatim)');
                return this.buildVoiceMessage(input, context);
            default:
                console.warn('[UnifiedInputHandler] ⚠️ Unknown input type:', input.type, 'defaulting to Hello');
                return 'Hello';
        }
    }

    /**
     * Build message from click
     * CRITICAL: For clicks, Ada CREATES the prompt based on what was clicked
     */
    buildClickMessage(input, context) {
        console.log('[UnifiedInputHandler] 🖱️ Building message from click input:', {
            hasData: !!input.data,
            dataKeys: input.data ? Object.keys(input.data) : []
        });
        
        const click = input.data || {};
        
        if (click.chartId) {
            return `Tell me about ${click.label || 'this data point'} in the ${click.chartName || 'chart'}`;
        }
        
        if (click.ticker) {
            return `Tell me about ${click.ticker}`;
        }
        
        if (click.text) {
            return `Tell me about: ${click.text}`;
        }
        
        return 'What is this?';
    }

    /**
     * Build message from type
     * CRITICAL: For text input, return the EXACT text the user typed - do NOT generate a prompt
     */
    buildTypeMessage(input, context) {
        console.log('[UnifiedInputHandler] 📝 Building message from text input:', {
            hasText: !!input.text,
            text: input.text?.substring(0, 50),
            hasCommand: !!input.command,
            inputType: input.type
        });
        
        if (input.command) {
            return this.handleCommand(input.command, input.args);
        }
        
        // CRITICAL: Return the EXACT text the user typed - this is TEXT input, not a click
        // Text input should be sent verbatim to Ada, not converted to a prompt
        const userText = input.text || '';
        console.log('[UnifiedInputHandler] ✅ Returning user text verbatim:', userText.substring(0, 50));
        return userText;
    }

    /**
     * Build message from voice
     * CRITICAL: For voice input, return the EXACT transcript - Ada takes the voice from the user
     */
    buildVoiceMessage(input, context) {
        console.log('[UnifiedInputHandler] 🎤 Building message from voice input:', {
            hasTranscript: !!input.transcript,
            transcript: input.transcript?.substring(0, 50)
        });
        
        // CRITICAL: Return the EXACT transcript - this is VOICE input, not a click
        // Voice input should be sent verbatim to Ada, not converted to a prompt
        const transcript = input.transcript || '';
        console.log('[UnifiedInputHandler] ✅ Returning voice transcript verbatim:', transcript.substring(0, 50));
        return transcript;
    }

    /**
     * Handle command
     */
    handleCommand(command, args) {
        switch (command) {
            case 'help':
                return 'Show me available commands';
            case 'clear':
                if (this.app && this.app.clearAgentChat) {
                    this.app.clearAgentChat();
                }
                return '';
            case 'voice':
                if (args[0] === 'on') {
                    if (this.app) {
                        this.app.agentVoiceOutputEnabled = true;
                    }
                } else if (args[0] === 'off') {
                    if (this.app) {
                        this.app.agentVoiceOutputEnabled = false;
                    }
                }
                return '';
            default:
                return `Command: ${command}`;
        }
    }

    /**
     * Send to agent
     */
    async sendToAgent(message, context) {
        if (!this.app || !this.app.sendAgentMessageSilent) {
            throw new Error('App instance not available');
        }

        // Build system prompt
        const systemPrompts = this.app.agentSystemPrompts || this.app.getDefaultAgentSystemPrompts?.() || {};
        const systemPrompt = this.contextBuilder.buildSystemPrompt(systemPrompts);

        // Send message
        return await this.app.sendAgentMessageSilent(message, context.stockInfo || null);
    }

    /**
     * Handle agent response
     */
    async handleResponse(response, input, context) {
        if (!response || !response.success) {
            return;
        }

        const responseText = response.response || '';

        // Display response
        if (this.app && this.app.addAgentMessage) {
            this.app.addAgentMessage(responseText, 'assistant');
        }

        // Speak response if voice output enabled
        if (this.voiceOutputHandler && 
            this.app && 
            this.app.agentVoiceOutputEnabled) {
            await this.voiceOutputHandler.speakVerbatim(responseText);
        }
    }

    /**
     * Build stimulus data for tracking
     */
    buildStimulusData(input, context) {
        const stimulusData = {};
        
        switch (input.type) {
            case 'click':
                if (input.data) {
                    stimulusData.label = input.data.label || input.data.text || input.data.ticker || 'Unknown';
                    stimulusData.chartId = input.data.chartId;
                    stimulusData.ticker = input.data.ticker;
                    stimulusData.category = input.data.category;
                }
                break;
            case 'type':
                stimulusData.text = input.text;
                stimulusData.source = input.source || 'input';
                break;
            case 'voice':
                stimulusData.transcript = input.transcript;
                stimulusData.isFinal = input.isFinal;
                break;
        }
        
        return stimulusData;
    }

    /**
     * Handle error
     */
    handleError(error, input) {
        console.error('[UnifiedInputHandler] Error:', error);
        
        const errorMessage = `Sorry, I encountered an error: ${error.message || 'Unknown error'}`;
        
        if (this.app && this.app.addAgentMessage) {
            this.app.addAgentMessage(errorMessage, 'assistant');
        }
        
        if (this.voiceOutputHandler && 
            this.app && 
            this.app.agentVoiceOutputEnabled) {
            this.voiceOutputHandler.speakVerbatim(errorMessage).catch(console.error);
        }
    }
}

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedInputHandler;
} else {
    window.UnifiedInputHandler = UnifiedInputHandler;
}

