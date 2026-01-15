/**
 * UnifiedEventManager - Centralized event handling for agent interactions
 * This is ADDITIVE - does not replace existing event handling
 */

class UnifiedEventManager {
    constructor() {
        this.events = [];
        this.listeners = new Map();
        this.eventQueue = [];
        this.processing = false;
        this.maxEvents = 1000;
        
        // Event type registry
        this.eventTypes = {
            // User Interaction Events
            TILE_CLICK: 'tile:click',
            LINK_CLICK: 'link:click',
            BUTTON_CLICK: 'button:click',
            INPUT_CHANGE: 'input:change',
            VIEW_SWITCH: 'view:switch',
            
            // Context Change Events
            MODEL_LOAD: 'model:load',
            DATA_UPDATE: 'data:update',
            TAB_CHANGE: 'tab:change',
            
            // AI Operation Events
            AI_REQUEST: 'ai:request',
            AI_RESPONSE: 'ai:response',
            AI_ERROR: 'ai:error',
            AI_PROGRESS: 'ai:progress',
            
            // Selection Events
            TEXT_SELECTION: 'selection:text',
            DATAPOINT_CLICK: 'selection:datapoint',
            SELECTION_CLEARED: 'selection:cleared',
            
            // Voice Events
            VOICE_START: 'voice:start',
            VOICE_STOP: 'voice:stop',
            VOICE_TRANSCRIPT: 'voice:transcript',
            VOICE_ERROR: 'voice:error'
        };
        
        // Priority levels
        this.priorities = {
            HIGH: 1,
            MEDIUM: 2,
            LOW: 3
        };
        
        this.enabled = window.featureFlags?.isEventManagerEnabled() || false;
        
        if (this.enabled) {
            this.initialize();
        }
    }

    initialize() {
        console.log('[UnifiedEventManager] Initialized (feature flag enabled)');
        this.startProcessing();
    }

    /**
     * Emit an event
     */
    emit(eventType, data, priority = this.priorities.MEDIUM) {
        if (!this.enabled) return;
        
        const event = {
            id: this.generateEventId(),
            type: eventType,
            data: data,
            priority: priority,
            timestamp: new Date().toISOString(),
            metadata: {
                view: window.app?.currentView || null,
                modelId: window.app?.currentModelId || null
            }
        };
        
        this.events.push(event);
        if (this.events.length > this.maxEvents) {
            this.events.shift();
        }
        
        // Add to processing queue
        this.eventQueue.push(event);
        this.eventQueue.sort((a, b) => a.priority - b.priority);
        
        // Process queue
        this.processQueue();
        
        if (window.featureFlags?.isEnabled('debugEnhancedAgent')) {
            console.log('[UnifiedEventManager] Event emitted:', event);
        }
    }

    /**
     * Register event listener
     */
    on(eventType, callback, options = {}) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        
        this.listeners.get(eventType).push({
            callback: callback,
            once: options.once || false,
            priority: options.priority || this.priorities.MEDIUM
        });
    }

    /**
     * Remove event listener
     */
    off(eventType, callback) {
        if (!this.listeners.has(eventType)) return;
        
        const callbacks = this.listeners.get(eventType);
        const index = callbacks.findIndex(l => l.callback === callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Process event queue
     */
    async processQueue() {
        if (this.processing || this.eventQueue.length === 0) return;
        
        this.processing = true;
        
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            await this.processEvent(event);
        }
        
        this.processing = false;
    }

    /**
     * Process a single event
     */
    async processEvent(event) {
        const listeners = this.listeners.get(event.type) || [];
        
        // Sort listeners by priority
        listeners.sort((a, b) => a.priority - b.priority);
        
        for (const listener of listeners) {
            try {
                await listener.callback(event);
                
                // Remove if once listener
                if (listener.once) {
                    this.off(event.type, listener.callback);
                }
            } catch (error) {
                console.error(`[UnifiedEventManager] Error in listener for ${event.type}:`, error);
            }
        }
    }

    /**
     * Generate unique event ID
     */
    generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get event history
     */
    getHistory(filter = {}) {
        let filtered = [...this.events];
        
        if (filter.type) {
            filtered = filtered.filter(e => e.type === filter.type);
        }
        
        if (filter.since) {
            const sinceTime = new Date(filter.since);
            filtered = filtered.filter(e => new Date(e.timestamp) >= sinceTime);
        }
        
        if (filter.limit) {
            filtered = filtered.slice(-filter.limit);
        }
        
        return filtered;
    }

    /**
     * Clear event history
     */
    clearHistory() {
        this.events = [];
        this.eventQueue = [];
    }

    /**
     * Start processing
     */
    startProcessing() {
        // Process queue periodically
        setInterval(() => {
            this.processQueue();
        }, 100);
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
window.unifiedEventManager = window.unifiedEventManager || new UnifiedEventManager();


















