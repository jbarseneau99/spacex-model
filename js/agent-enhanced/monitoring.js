/**
 * Monitoring and Rollback System for Enhanced Agent
 * Monitors system health and provides rollback capabilities
 */

class EnhancedAgentMonitoring {
    constructor() {
        this.metrics = {
            errors: [],
            warnings: [],
            performance: [],
            featureUsage: {}
        };
        
        this.maxMetrics = 100;
        this.enabled = true;
        
        this.setupErrorHandling();
        this.setupPerformanceMonitoring();
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // Monitor for errors in enhanced agent modules
        window.addEventListener('error', (event) => {
            if (event.filename && event.filename.includes('agent-enhanced')) {
                this.recordError({
                    type: 'javascript_error',
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Monitor unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.stack) {
                const stack = event.reason.stack.toString();
                if (stack.includes('agent-enhanced')) {
                    this.recordError({
                        type: 'unhandled_promise_rejection',
                        message: event.reason.message || String(event.reason),
                        stack: stack,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        });
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor module load times
        const loadStartTimes = new Map();
        const monitoringInstance = this; // Capture 'this' for use in event listener
        
        const originalAppendChild = document.head.appendChild.bind(document.head);
        document.head.appendChild = function(node) {
            if (node.tagName === 'SCRIPT' && node.src && node.src.includes('agent-enhanced')) {
                const moduleName = node.src.split('/').pop();
                loadStartTimes.set(moduleName, performance.now());
                
                node.addEventListener('load', () => {
                    const loadTime = performance.now() - loadStartTimes.get(moduleName);
                    monitoringInstance.recordPerformance({
                        type: 'module_load',
                        module: moduleName,
                        duration: loadTime,
                        timestamp: new Date().toISOString()
                    });
                });
            }
            return originalAppendChild(node);
        };
    }

    /**
     * Record error
     */
    recordError(error) {
        this.metrics.errors.push(error);
        if (this.metrics.errors.length > this.maxMetrics) {
            this.metrics.errors.shift();
        }
        
        console.error('[EnhancedAgentMonitoring] Error recorded:', error);
        
        // Auto-disable features if too many errors
        if (this.metrics.errors.length > 10) {
            this.suggestRollback('Too many errors detected');
        }
    }

    /**
     * Record warning
     */
    recordWarning(warning) {
        this.metrics.warnings.push({
            ...warning,
            timestamp: new Date().toISOString()
        });
        
        if (this.metrics.warnings.length > this.maxMetrics) {
            this.metrics.warnings.shift();
        }
        
        console.warn('[EnhancedAgentMonitoring] Warning recorded:', warning);
    }

    /**
     * Record performance metric
     */
    recordPerformance(metric) {
        this.metrics.performance.push(metric);
        if (this.metrics.performance.length > this.maxMetrics) {
            this.metrics.performance.shift();
        }
    }

    /**
     * Record feature usage
     */
    recordFeatureUsage(featureName) {
        if (!this.metrics.featureUsage[featureName]) {
            this.metrics.featureUsage[featureName] = {
                count: 0,
                firstUsed: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            };
        }
        
        this.metrics.featureUsage[featureName].count++;
        this.metrics.featureUsage[featureName].lastUsed = new Date().toISOString();
    }

    /**
     * Get health status
     */
    getHealthStatus() {
        const recentErrors = this.metrics.errors.filter(e => {
            const errorTime = new Date(e.timestamp);
            const minutesAgo = (Date.now() - errorTime.getTime()) / (1000 * 60);
            return minutesAgo < 5; // Last 5 minutes
        });

        return {
            status: recentErrors.length > 5 ? 'unhealthy' : recentErrors.length > 2 ? 'degraded' : 'healthy',
            errorCount: this.metrics.errors.length,
            recentErrorCount: recentErrors.length,
            warningCount: this.metrics.warnings.length,
            performanceMetrics: this.metrics.performance.slice(-10)
        };
    }

    /**
     * Suggest rollback
     */
    suggestRollback(reason) {
        console.warn('[EnhancedAgentMonitoring] Rollback suggested:', reason);
        
        // Show user notification (non-intrusive)
        if (window.featureFlags) {
            const enabledFeatures = Object.entries(window.featureFlags.flags)
                .filter(([_, enabled]) => enabled)
                .map(([name, _]) => name);
            
            if (enabledFeatures.length > 0) {
                console.warn('[EnhancedAgentMonitoring] Consider disabling:', enabledFeatures);
                // Could show UI notification here if needed
            }
        }
    }

    /**
     * Rollback all features
     */
    rollbackAll() {
        console.log('[EnhancedAgentMonitoring] Rolling back all enhanced agent features...');
        
        if (window.featureFlags) {
            Object.keys(window.featureFlags.flags).forEach(flag => {
                if (flag !== 'debugEnhancedAgent') { // Keep debug flag
                    window.featureFlags.setFlag(flag, false);
                }
            });
        }
        
        // Clear session data
        if (window.agentSessionAwareness) {
            window.agentSessionAwareness.events = [];
            window.agentSessionAwareness.enhancedNavigationHistory = [];
            window.agentSessionAwareness.enhancedConversationHistory = [];
        }
        
        // Clear selection context
        if (window.selectionContextManager) {
            window.selectionContextManager.clearSelection('all');
            window.selectionContextManager.selectionHistory = [];
        }
        
        // Clear event manager
        if (window.unifiedEventManager) {
            window.unifiedEventManager.clearHistory();
        }
        
        console.log('[EnhancedAgentMonitoring] Rollback complete');
    }

    /**
     * Get metrics summary
     */
    getMetricsSummary() {
        return {
            health: this.getHealthStatus(),
            errors: this.metrics.errors.slice(-10),
            warnings: this.metrics.warnings.slice(-10),
            performance: this.metrics.performance.slice(-10),
            featureUsage: this.metrics.featureUsage
        };
    }

    /**
     * Clear metrics
     */
    clearMetrics() {
        this.metrics = {
            errors: [],
            warnings: [],
            performance: [],
            featureUsage: {}
        };
    }
}

// Export singleton instance
window.enhancedAgentMonitoring = window.enhancedAgentMonitoring || new EnhancedAgentMonitoring();

// Add to loader
if (typeof window !== 'undefined') {
    // Monitor health periodically
    setInterval(() => {
        if (window.enhancedAgentMonitoring) {
            const health = window.enhancedAgentMonitoring.getHealthStatus();
            if (health.status === 'unhealthy') {
                window.enhancedAgentMonitoring.suggestRollback('System health degraded');
            }
        }
    }, 60000); // Check every minute
}

