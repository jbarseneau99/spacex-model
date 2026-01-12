/**
 * Enhanced Agent System Loader
 * Loads all enhanced agent modules in correct order
 * All features are disabled by default (feature flags)
 */

(function() {
    'use strict';
    
    console.log('[EnhancedAgent] Loading enhanced agent modules...');
    
    // Load modules in order
    const modules = [
        '/js/agent-enhanced/feature-flags.js',
        '/js/agent-enhanced/monitoring.js', // Load monitoring first
        '/js/agent-enhanced/selection-context-manager.js',
        '/js/agent-enhanced/session-awareness.js',
        '/js/agent-enhanced/unified-event-manager.js',
        '/js/agent-enhanced/context-builder.js',
        '/js/agent-enhanced/integration-layer.js'
    ];
    
    let loadedCount = 0;
    const totalModules = modules.length;
    
    function loadModule(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                loadedCount++;
                console.log(`[EnhancedAgent] Loaded ${loadedCount}/${totalModules}: ${src.split('/').pop()}`);
                resolve();
            };
            script.onerror = () => {
                console.error(`[EnhancedAgent] Failed to load: ${src}`);
                reject(new Error(`Failed to load ${src}`));
            };
            document.head.appendChild(script);
        });
    }
    
    // Load all modules sequentially
    async function loadAllModules() {
        try {
            for (const module of modules) {
                await loadModule(module);
            }
            
            console.log('[EnhancedAgent] All modules loaded successfully');
            console.log('[EnhancedAgent] Feature flags status:', window.featureFlags?.getAllFlags());
            console.log('[EnhancedAgent] Note: All features are DISABLED by default. Enable via feature flags.');
            
            // Check integration after a short delay (to ensure app.js is loaded)
            setTimeout(() => {
                if (window.agentIntegrationLayer) {
                    window.agentIntegrationLayer.checkAndInitialize();
                }
            }, 1000);
            
        } catch (error) {
            console.error('[EnhancedAgent] Error loading modules:', error);
            // Don't break the app if enhanced agent fails to load
        }
    }
    
    // Start loading when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAllModules);
    } else {
        loadAllModules();
    }
})();

