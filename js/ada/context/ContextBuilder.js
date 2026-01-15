/**
 * AdaContextBuilder - Modular context builder for Ada inputs
 * Builds unified context from UI state, history, and model data
 * Note: Named AdaContextBuilder to avoid conflict with agent-enhanced/context-builder.js
 */

class AdaContextBuilder {
    constructor(appInstance) {
        this.app = appInstance;
    }

    /**
     * Build context for any input type
     */
    async buildContext(input) {
        const baseContext = {
            timestamp: Date.now(),
            inputType: input.type,
            uiState: await this.getUIState(),
            navigationHistory: this.getNavigationHistory(),
            modelData: await this.getModelData(),
            history: this.getChatHistory()
        };

        // Add input-specific context
        switch (input.type) {
            case 'click':
                return {
                    ...baseContext,
                    click: input.data,
                    coordinates: input.coordinates
                };
            case 'type':
                return {
                    ...baseContext,
                    text: input.text || input.command,
                    source: input.source
                };
            case 'voice':
                return {
                    ...baseContext,
                    transcript: input.transcript,
                    audio: input.audio
                };
            default:
                return baseContext;
        }
    }

    /**
     * Get current UI state
     */
    async getUIState() {
        if (!this.app) {
            return {};
        }

        return {
            currentView: this.app.currentView || 'unknown',
            currentTab: this.app.getCurrentTabInfo?.()?.tab || 'unknown',
            currentSubTab: this.app.getCurrentTabInfo?.()?.subTab || null,
            agentWindowOpen: this.isAgentWindowOpen(),
            voiceOutputEnabled: this.app.agentVoiceOutputEnabled || false,
            voiceInputEnabled: this.app.agentVoiceInputEnabled || false
        };
    }

    /**
     * Get navigation history
     */
    getNavigationHistory() {
        if (!this.app || !this.app.navigationHistory) {
            return [];
        }

        return this.app.navigationHistory.slice(-10); // Last 10 navigation steps
    }

    /**
     * Get model data
     */
    async getModelData() {
        if (!this.app) {
            return null;
        }

        try {
            const inputs = this.app.getInputs?.() || {};
            const allModels = await this.app.getAllModelsData?.() || [];

            return {
                currentModel: {
                    id: this.app.currentModelId,
                    name: this.app.currentModelName,
                    inputs: inputs,
                    valuationData: this.app.currentData
                },
                allModels: allModels.slice(0, 10), // First 10 models
                monteCarloSimulations: this.app.currentMonteCarloData ? {
                    statistics: this.app.currentMonteCarloData.statistics,
                    runs: this.app.currentMonteCarloData.runs
                } : null
            };
        } catch (error) {
            console.error('[ContextBuilder] Error getting model data:', error);
            return null;
        }
    }

    /**
     * Get chat history
     */
    getChatHistory() {
        if (!this.app || !this.app.getAgentChatHistory) {
            return [];
        }

        return this.app.getAgentChatHistory() || [];
    }

    /**
     * Check if agent window is open
     */
    isAgentWindowOpen() {
        const agentWindow = document.getElementById('agentWindow');
        return agentWindow && agentWindow.style.display !== 'none';
    }

    /**
     * Build system prompt
     */
    buildSystemPrompt(basePrompts = {}) {
        if (!basePrompts || typeof basePrompts !== 'object') {
            return '';
        }

        return Object.values(basePrompts)
            .filter(p => p && typeof p === 'string' && p.trim())
            .join('\n\n');
    }
}

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdaContextBuilder;
} else {
    window.AdaContextBuilder = AdaContextBuilder;
}

