/**
 * ContextBuilder - Unified context construction for agent prompts
 * Builds comprehensive context from all sources (selection, navigation, conversation, etc.)
 * This is ADDITIVE - does not modify existing context building
 */

class ContextBuilder {
    constructor() {
        this.enabled = window.featureFlags?.isEnabled('enableContextBuilder') || false;
    }

    /**
     * Build comprehensive context for agent prompt
     */
    buildContext(options = {}) {
        if (!this.enabled) {
            // Fallback to basic context if disabled
            return this.buildBasicContext(options);
        }

        const context = {
            // Primary context (highest priority)
            activeContext: this.buildActiveContext(),
            
            // Current state
            currentState: this.buildCurrentState(options),
            
            // Session context
            sessionContext: this.buildSessionContext(),
            
            // Historical context
            historicalContext: this.buildHistoricalContext(options),
            
            // Intent context
            intentContext: this.buildIntentContext(),
            
            // Metadata
            metadata: {
                timestamp: new Date().toISOString(),
                contextVersion: '2.0'
            }
        };

        return context;
    }

    /**
     * Build active context (selection + datapoint)
     */
    buildActiveContext() {
        const selectionManager = window.selectionContextManager;
        if (!selectionManager || !selectionManager.enabled) {
            return null;
        }

        const activeContext = selectionManager.getActiveContext();
        if (!activeContext || !activeContext.hasActiveContext) {
            return null;
        }

        return {
            hasActiveSelection: !!activeContext.textSelection,
            hasActiveDatapoint: !!activeContext.datapoint,
            textSelection: activeContext.textSelection ? {
                text: activeContext.textSelection.text,
                source: activeContext.textSelection.source,
                contentType: activeContext.textSelection.metadata?.contentType,
                containsMetrics: activeContext.textSelection.metadata?.containsMetrics
            } : null,
            datapoint: activeContext.datapoint ? {
                chartName: activeContext.datapoint.chartName,
                label: activeContext.datapoint.label,
                value: activeContext.datapoint.value,
                trend: activeContext.datapoint.metadata?.trend
            } : null
        };
    }

    /**
     * Build current state context
     */
    buildCurrentState(options) {
        const app = window.app;
        if (!app) return null;

        return {
            view: app.currentView || null,
            tab: options.tab || null,
            subTab: options.subTab || null,
            modelId: app.currentModelId || null,
            modelName: app.currentModelName || null,
            hasData: !!app.currentData,
            data: options.includeData ? this.sanitizeData(app.currentData) : null
        };
    }

    /**
     * Build session context
     */
    buildSessionContext() {
        const sessionAwareness = window.agentSessionAwareness;
        if (!sessionAwareness || !sessionAwareness.enabled) {
            return null;
        }

        return {
            sessionId: sessionAwareness.sessionId,
            recentNavigation: sessionAwareness.getRecentNavigationPath(5),
            recentConversation: sessionAwareness.getRecentConversationSummary(3),
            sessionDuration: new Date(sessionAwareness.lastActivity) - new Date(sessionAwareness.startTime)
        };
    }

    /**
     * Build historical context
     */
    buildHistoricalContext(options) {
        const sessionAwareness = window.agentSessionAwareness;
        if (!sessionAwareness || !sessionAwareness.enabled) {
            return null;
        }

        return {
            navigationPattern: this.analyzeNavigationPattern(sessionAwareness.enhancedNavigationHistory),
            conversationPattern: this.analyzeConversationPattern(sessionAwareness.enhancedConversationHistory),
            interactionPattern: this.analyzeInteractionPattern(sessionAwareness.interactionHistory)
        };
    }

    /**
     * Build intent context
     */
    buildIntentContext() {
        const sessionAwareness = window.agentSessionAwareness;
        if (!sessionAwareness || !sessionAwareness.enabled) {
            return null;
        }

        return sessionAwareness.inferIntent();
    }

    /**
     * Build basic context (fallback)
     */
    buildBasicContext(options) {
        const app = window.app;
        return {
            view: app?.currentView || null,
            tab: options.tab || null,
            modelName: app?.currentModelName || null,
            hasData: !!app?.currentData
        };
    }

    /**
     * Build context string for agent prompt
     */
    buildContextString(context) {
        if (!context) {
            context = this.buildContext();
        }

        let contextString = '';

        // Active context (highest priority)
        if (context.activeContext) {
            contextString += '=== ACTIVE CONTEXT ===\n';
            
            if (context.activeContext.textSelection) {
                contextString += `User has selected text: "${context.activeContext.textSelection.text}"\n`;
                contextString += `Source: ${context.activeContext.textSelection.source}\n`;
            }
            
            if (context.activeContext.datapoint) {
                contextString += `User clicked chart datapoint:\n`;
                contextString += `- Chart: ${context.activeContext.datapoint.chartName}\n`;
                contextString += `- Label: ${context.activeContext.datapoint.label}\n`;
                contextString += `- Value: ${context.activeContext.datapoint.value}\n`;
                if (context.activeContext.datapoint.trend) {
                    contextString += `- Trend: ${context.activeContext.datapoint.trend}\n`;
                }
            }
            
            contextString += '\n';
        }

        // Current state
        if (context.currentState) {
            contextString += '=== CURRENT APPLICATION STATE ===\n';
            contextString += `View: ${context.currentState.view || 'Unknown'}\n`;
            if (context.currentState.tab) {
                contextString += `Tab: ${context.currentState.tab}\n`;
            }
            if (context.currentState.subTab) {
                contextString += `Sub-Tab: ${context.currentState.subTab}\n`;
            }
            if (context.currentState.modelName) {
                contextString += `Model: ${context.currentState.modelName}\n`;
            }
            contextString += '\n';
        }

        // Session context
        if (context.sessionContext && context.sessionContext.recentNavigation?.length > 0) {
            contextString += '=== RECENT NAVIGATION ===\n';
            context.sessionContext.recentNavigation.forEach((nav, index) => {
                const timeAgo = index === context.sessionContext.recentNavigation.length - 1 ? 'just now' : 
                               `${context.sessionContext.recentNavigation.length - index - 1} steps ago`;
                contextString += `${timeAgo}: ${nav.view}${nav.tab ? ` > ${nav.tab}` : ''}${nav.subTab ? ` > ${nav.subTab}` : ''}\n`;
            });
            contextString += '\n';
        }

        // Intent context
        if (context.intentContext) {
            contextString += '=== INFERRED USER INTENT ===\n';
            contextString += `Primary Intent: ${context.intentContext.primary}\n`;
            contextString += `Confidence: ${(context.intentContext.confidence * 100).toFixed(0)}%\n`;
            contextString += '\n';
        }

        return contextString;
    }

    /**
     * Analyze navigation pattern
     */
    analyzeNavigationPattern(navigationHistory) {
        if (!navigationHistory || navigationHistory.length === 0) return null;

        const views = navigationHistory.map(n => n.to.view).filter(Boolean);
        const mostCommonView = views.reduce((a, b, _, arr) => 
            arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        );

        return {
            totalNavigations: navigationHistory.length,
            mostCommonView: mostCommonView,
            isExploring: views.length > 3,
            isDeepDiving: views.filter(v => v === mostCommonView).length > 2
        };
    }

    /**
     * Analyze conversation pattern
     */
    analyzeConversationPattern(conversationHistory) {
        if (!conversationHistory || conversationHistory.length === 0) return null;

        const questions = conversationHistory.filter(c => c.metadata?.messageType === 'question');
        return {
            totalMessages: conversationHistory.length,
            questionCount: questions.length,
            isInformationSeeking: questions.length > 0
        };
    }

    /**
     * Analyze interaction pattern
     */
    analyzeInteractionPattern(interactionHistory) {
        if (!interactionHistory || interactionHistory.length === 0) return null;

        const tileClicks = interactionHistory.filter(i => i.type === 'tile-click');
        return {
            totalInteractions: interactionHistory.length,
            tileClickCount: tileClicks.length,
            isExploring: interactionHistory.length > 10
        };
    }

    /**
     * Sanitize data for context (remove large objects)
     */
    sanitizeData(data) {
        if (!data) return null;

        return {
            totalValue: data.total?.value || null,
            earthValue: data.earth?.adjustedValue || null,
            marsValue: data.mars?.adjustedValue || null,
            hasDetailedData: true
        };
    }

    /**
     * Enable/disable (for feature flag changes)
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

// Export singleton instance
window.contextBuilder = window.contextBuilder || new ContextBuilder();

