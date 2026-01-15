/**
 * SelectionContextManager - Manages text selection and chart datapoint clicks as active context
 * This is ADDITIVE - does not modify existing selection handling
 */

class SelectionContextManager {
    constructor() {
        this.activeTextSelection = null;
        this.activeDatapoint = null;
        this.selectionHistory = [];
        this.maxHistorySize = 50;
        
        // Event listeners (will be set up by integration layer)
        this.listeners = {
            onSelectionChanged: [],
            onDatapointClicked: [],
            onSelectionCleared: []
        };
        
        // Feature flag check
        this.enabled = window.featureFlags?.isSelectionContextEnabled() || false;
        
        if (this.enabled) {
            this.initialize();
        }
    }

    initialize() {
        console.log('[SelectionContextManager] Initialized (feature flag enabled)');
        // Setup will be done by integration layer to avoid conflicts
    }

    /**
     * Set active text selection
     */
    setTextSelection(selectionData) {
        if (!this.enabled) return null;
        
        const selection = {
            type: 'text',
            text: selectionData.text,
            source: selectionData.source || 'unknown',
            elementType: selectionData.elementType || 'text',
            elementId: selectionData.elementId || null,
            surroundingText: selectionData.surroundingText || null,
            context: selectionData.context || {},
            timestamp: new Date().toISOString(),
            metadata: {
                wordCount: selectionData.text?.split(/\s+/).length || 0,
                containsMetrics: /[\$%BMKT\d.,]+/.test(selectionData.text || ''),
                contentType: this.detectContentType(selectionData.text)
            }
        };

        this.activeTextSelection = selection;
        this.addToHistory(selection);
        this.notifyListeners('onSelectionChanged', selection);
        
        if (window.featureFlags?.isEnabled('debugEnhancedAgent')) {
            console.log('[SelectionContextManager] Text selection set:', selection);
        }
        
        return selection;
    }

    /**
     * Set active chart datapoint
     */
    setDatapoint(datapointData) {
        if (!this.enabled) return null;
        
        const datapoint = {
            type: 'datapoint',
            chartId: datapointData.chartId,
            chartName: datapointData.chartName || 'Unknown Chart',
            chartType: datapointData.chartType || 'unknown',
            label: datapointData.label,
            value: datapointData.value,
            index: datapointData.index,
            datasetIndex: datapointData.datasetIndex || 0,
            seriesName: datapointData.seriesName || null,
            timestamp: new Date().toISOString(),
            metadata: {
                xValue: datapointData.xValue || datapointData.label,
                yValue: datapointData.yValue || datapointData.value,
                previousValue: datapointData.previousValue || null,
                nextValue: datapointData.nextValue || null,
                trend: this.calculateTrend(datapointData),
                relativePosition: datapointData.relativePosition || null
            },
            context: {
                view: datapointData.view || null,
                tab: datapointData.tab || null,
                subTab: datapointData.subTab || null,
                chartContext: datapointData.chartContext || {}
            }
        };

        this.activeDatapoint = datapoint;
        this.addToHistory(datapoint);
        this.notifyListeners('onDatapointClicked', datapoint);
        
        if (window.featureFlags?.isEnabled('debugEnhancedAgent')) {
            console.log('[SelectionContextManager] Datapoint set:', datapoint);
        }
        
        return datapoint;
    }

    /**
     * Clear active selection
     */
    clearSelection(type = 'all') {
        if (!this.enabled) return;
        
        if (type === 'all' || type === 'text') {
            this.activeTextSelection = null;
        }
        if (type === 'all' || type === 'datapoint') {
            this.activeDatapoint = null;
        }
        
        this.notifyListeners('onSelectionCleared', { type });
    }

    /**
     * Get active context (both text and datapoint)
     */
    getActiveContext() {
        if (!this.enabled) return null;
        
        return {
            textSelection: this.activeTextSelection,
            datapoint: this.activeDatapoint,
            hasActiveContext: !!(this.activeTextSelection || this.activeDatapoint),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get selection history
     */
    getHistory(limit = 20) {
        return this.selectionHistory.slice(-limit);
    }

    /**
     * Add to history
     */
    addToHistory(selection) {
        this.selectionHistory.push(selection);
        if (this.selectionHistory.length > this.maxHistorySize) {
            this.selectionHistory.shift();
        }
    }

    /**
     * Detect content type of selected text
     */
    detectContentType(text) {
        if (!text) return 'unknown';
        
        if (/\$[\d.,]+[BMKT]?/.test(text)) return 'financial_value';
        if (/[\d.,]+%/.test(text)) return 'percentage';
        if (/\d+\.\d+/.test(text)) return 'numeric';
        if (text.split(/\s+/).length > 10) return 'paragraph';
        if (text.split(/\s+/).length > 3) return 'sentence';
        return 'phrase';
    }

    /**
     * Calculate trend for datapoint
     */
    calculateTrend(datapointData) {
        if (!datapointData.previousValue || !datapointData.nextValue) {
            return null;
        }
        
        const current = parseFloat(datapointData.value) || 0;
        const previous = parseFloat(datapointData.previousValue) || 0;
        const next = parseFloat(datapointData.nextValue) || 0;
        
        if (current > previous && current > next) return 'peak';
        if (current < previous && current < next) return 'trough';
        if (current > previous) return 'increasing';
        if (current < previous) return 'decreasing';
        return 'stable';
    }

    /**
     * Register listener
     */
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    /**
     * Notify listeners
     */
    notifyListeners(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[SelectionContextManager] Error in listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Enable/disable (for feature flag changes)
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.clearSelection('all');
        }
    }
}

// Export singleton instance
window.selectionContextManager = window.selectionContextManager || new SelectionContextManager();


















