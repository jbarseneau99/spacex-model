/**
 * AgentSessionAwareness - Comprehensive session awareness system
 * Tracks navigation, conversation, interactions, and context
 * This is ADDITIVE - does not modify existing session tracking
 */

class AgentSessionAwareness {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = new Date().toISOString();
        this.lastActivity = new Date().toISOString();
        
        // Enhanced tracking (parallel to existing navigationHistory)
        this.enhancedNavigationHistory = [];
        this.enhancedConversationHistory = [];
        this.interactionHistory = [];
        this.contextSnapshots = [];
        this.intentSignals = [];
        
        // Session metadata
        this.sessionMetadata = {
            userPreferences: {},
            settings: {},
            featureUsage: {}
        };
        
        // Limits
        this.maxNavigationHistory = 100;
        this.maxConversationHistory = 100;
        this.maxInteractionHistory = 200;
        this.maxContextSnapshots = 50;
        
        // Feature flag check
        this.enabled = window.featureFlags?.isSessionAwarenessEnabled() || false;
        
        if (this.enabled) {
            this.initialize();
        }
    }

    initialize() {
        console.log('[AgentSessionAwareness] Initialized (feature flag enabled)');
        this.loadSessionFromStorage();
        this.setupActivityTracking();
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Track navigation event (enhanced version)
     */
    trackNavigation(navigationData) {
        if (!this.enabled) return;
        
        const navigationEvent = {
            timestamp: new Date().toISOString(),
            type: 'navigation',
            from: {
                view: navigationData.fromView || null,
                tab: navigationData.fromTab || null,
                subTab: navigationData.fromSubTab || null
            },
            to: {
                view: navigationData.toView || null,
                tab: navigationData.toTab || null,
                subTab: navigationData.toSubTab || null
            },
            trigger: navigationData.trigger || 'unknown', // 'click', 'agent-suggestion', 'auto'
            duration: navigationData.duration || null, // Time spent in previous view
            dataState: {
                modelId: navigationData.modelId || null,
                modelName: navigationData.modelName || null,
                hasData: navigationData.hasData || false
            },
            intent: navigationData.intent || null // Inferred intent
        };

        this.enhancedNavigationHistory.push(navigationEvent);
        if (this.enhancedNavigationHistory.length > this.maxNavigationHistory) {
            this.enhancedNavigationHistory.shift();
        }

        this.updateLastActivity();
        this.saveSessionToStorage();
        
        if (window.featureFlags?.isEnabled('debugEnhancedAgent')) {
            console.log('[AgentSessionAwareness] Navigation tracked:', navigationEvent);
        }
    }

    /**
     * Track conversation event (enhanced version)
     */
    trackConversation(conversationData) {
        if (!this.enabled) return;
        
        const conversationEvent = {
            timestamp: new Date().toISOString(),
            type: 'conversation',
            role: conversationData.role, // 'user' or 'assistant'
            message: conversationData.message,
            context: {
                view: conversationData.view || null,
                tab: conversationData.tab || null,
                subTab: conversationData.subTab || null,
                hasActiveSelection: conversationData.hasActiveSelection || false,
                hasActiveDatapoint: conversationData.hasActiveDatapoint || false
            },
            metadata: {
                messageType: this.classifyMessage(conversationData.message),
                intent: conversationData.intent || null,
                responseQuality: conversationData.responseQuality || null
            }
        };

        this.enhancedConversationHistory.push(conversationEvent);
        if (this.enhancedConversationHistory.length > this.maxConversationHistory) {
            this.enhancedConversationHistory.shift();
        }

        this.updateLastActivity();
        this.saveSessionToStorage();
    }

    /**
     * Track user interaction
     */
    trackInteraction(interactionData) {
        if (!this.enabled) return;
        
        const interaction = {
            timestamp: new Date().toISOString(),
            type: interactionData.type, // 'tile-click', 'link-click', 'input-change', etc.
            action: interactionData.action,
            target: interactionData.target,
            context: {
                view: interactionData.view || null,
                tab: interactionData.tab || null,
                data: interactionData.data || null
            },
            metadata: interactionData.metadata || {}
        };

        this.interactionHistory.push(interaction);
        if (this.interactionHistory.length > this.maxInteractionHistory) {
            this.interactionHistory.shift();
        }

        this.updateLastActivity();
    }

    /**
     * Create context snapshot
     */
    createSnapshot(snapshotData) {
        if (!this.enabled) return;
        
        const snapshot = {
            timestamp: new Date().toISOString(),
            view: snapshotData.view || null,
            tab: snapshotData.tab || null,
            subTab: snapshotData.subTab || null,
            modelId: snapshotData.modelId || null,
            modelName: snapshotData.modelName || null,
            data: snapshotData.data || null,
            activeSelection: snapshotData.activeSelection || null,
            activeDatapoint: snapshotData.activeDatapoint || null,
            navigationPath: this.getRecentNavigationPath(5),
            conversationSummary: this.getRecentConversationSummary(3)
        };

        this.contextSnapshots.push(snapshot);
        if (this.contextSnapshots.length > this.maxContextSnapshots) {
            this.contextSnapshots.shift();
        }

        this.saveSessionToStorage();
    }

    /**
     * Infer user intent from patterns
     */
    inferIntent() {
        if (!this.enabled) return null;
        
        const recentNavigation = this.enhancedNavigationHistory.slice(-10);
        const recentConversation = this.enhancedConversationHistory.slice(-5);
        const recentInteractions = this.interactionHistory.slice(-20);

        // Simple intent inference (can be enhanced)
        const intents = {
            exploration: recentNavigation.length > 3,
            deepAnalysis: recentNavigation.filter(n => n.to.view === recentNavigation[0]?.to.view).length > 2,
            comparison: recentNavigation.filter(n => n.to.view === 'ratios' || n.to.view === 'scenarios').length > 0,
            informationSeeking: recentConversation.filter(c => c.role === 'user' && c.message.includes('?')).length > 0
        };

        const primaryIntent = Object.entries(intents)
            .filter(([_, value]) => value)
            .map(([key, _]) => key)[0] || 'general';

        return {
            primary: primaryIntent,
            confidence: 0.7, // Can be enhanced with ML
            signals: intents
        };
    }

    /**
     * Get recent navigation path
     */
    getRecentNavigationPath(limit = 5) {
        return this.enhancedNavigationHistory.slice(-limit).map(n => ({
            view: n.to.view,
            tab: n.to.tab,
            subTab: n.to.subTab
        }));
    }

    /**
     * Get recent conversation summary
     */
    getRecentConversationSummary(limit = 3) {
        return this.enhancedConversationHistory.slice(-limit).map(c => ({
            role: c.role,
            message: c.message.substring(0, 100)
        }));
    }

    /**
     * Classify message type
     */
    classifyMessage(message) {
        if (!message) return 'unknown';
        if (message.includes('?')) return 'question';
        if (message.includes('explain') || message.includes('what') || message.includes('how')) return 'information_seeking';
        if (message.includes('compare') || message.includes('vs')) return 'comparison';
        if (message.includes('why')) return 'explanation';
        return 'statement';
    }

    /**
     * Update last activity timestamp
     */
    updateLastActivity() {
        this.lastActivity = new Date().toISOString();
    }

    /**
     * Get session summary
     */
    getSessionSummary() {
        return {
            sessionId: this.sessionId,
            startTime: this.startTime,
            lastActivity: this.lastActivity,
            duration: new Date(this.lastActivity) - new Date(this.startTime),
            navigationCount: this.enhancedNavigationHistory.length,
            conversationCount: this.enhancedConversationHistory.length,
            interactionCount: this.interactionHistory.length,
            intent: this.inferIntent()
        };
    }

    /**
     * Save session to storage
     */
    saveSessionToStorage() {
        if (!this.enabled) return;
        
        try {
            const sessionData = {
                sessionId: this.sessionId,
                startTime: this.startTime,
                lastActivity: this.lastActivity,
                enhancedNavigationHistory: this.enhancedNavigationHistory.slice(-50), // Limit storage
                enhancedConversationHistory: this.enhancedConversationHistory.slice(-50),
                interactionHistory: this.interactionHistory.slice(-100),
                contextSnapshots: this.contextSnapshots.slice(-20),
                sessionMetadata: this.sessionMetadata
            };
            
            localStorage.setItem('agentSessionData', JSON.stringify(sessionData));
        } catch (error) {
            console.error('[AgentSessionAwareness] Error saving session:', error);
        }
    }

    /**
     * Load session from storage
     */
    loadSessionFromStorage() {
        if (!this.enabled) return;
        
        try {
            const stored = localStorage.getItem('agentSessionData');
            if (stored) {
                const sessionData = JSON.parse(stored);
                // Restore if same session or recent
                const storedTime = new Date(sessionData.lastActivity);
                const hoursSince = (Date.now() - storedTime.getTime()) / (1000 * 60 * 60);
                
                if (hoursSince < 24) { // Restore if less than 24 hours old
                    this.sessionId = sessionData.sessionId;
                    this.startTime = sessionData.startTime;
                    this.enhancedNavigationHistory = sessionData.enhancedNavigationHistory || [];
                    this.enhancedConversationHistory = sessionData.enhancedConversationHistory || [];
                    this.interactionHistory = sessionData.interactionHistory || [];
                    this.contextSnapshots = sessionData.contextSnapshots || [];
                    this.sessionMetadata = sessionData.sessionMetadata || {};
                }
            }
        } catch (error) {
            console.error('[AgentSessionAwareness] Error loading session:', error);
        }
    }

    /**
     * Setup activity tracking
     */
    setupActivityTracking() {
        // Track user activity to update lastActivity
        ['mousedown', 'keydown', 'scroll'].forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.updateLastActivity();
            }, { passive: true });
        });
    }

    /**
     * Enable/disable (for feature flag changes)
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled) {
            this.initialize();
        }
    }
}

// Export singleton instance
window.agentSessionAwareness = window.agentSessionAwareness || new AgentSessionAwareness();



