/**
 * Feature Flags for Enhanced Agent System
 * All new features are disabled by default to preserve existing functionality
 */

class FeatureFlags {
    constructor() {
        // Load from localStorage with safe defaults (all OFF)
        this.flags = {
            // Core enhanced features - all disabled by default
            enableEnhancedSessionAwareness: this.getFlag('enableEnhancedSessionAwareness', false),
            enableUnifiedEventManager: this.getFlag('enableUnifiedEventManager', false),
            enableRichSelectionContext: this.getFlag('enableRichSelectionContext', false),
            enableDatapointContext: this.getFlag('enableDatapointContext', false),
            enableContextBuilder: this.getFlag('enableContextBuilder', false),
            enableSessionPersistence: this.getFlag('enableSessionPersistence', false),
            
            // Integration flags - disabled by default
            integrateWithExistingAgent: this.getFlag('integrateWithExistingAgent', false),
            
            // Debug flags
            debugEnhancedAgent: this.getFlag('debugEnhancedAgent', false)
        };
    }

    getFlag(name, defaultValue = false) {
        const stored = localStorage.getItem(`featureFlag_${name}`);
        if (stored === null) return defaultValue;
        return stored === 'true';
    }

    setFlag(name, value) {
        this.flags[name] = value;
        localStorage.setItem(`featureFlag_${name}`, value.toString());
        // Dispatch event for other modules to react
        window.dispatchEvent(new CustomEvent('featureFlagChanged', { 
            detail: { flag: name, value } 
        }));
    }

    isEnabled(name) {
        return this.flags[name] === true;
    }

    // Convenience methods
    isSessionAwarenessEnabled() {
        return this.isEnabled('enableEnhancedSessionAwareness');
    }

    isEventManagerEnabled() {
        return this.isEnabled('enableUnifiedEventManager');
    }

    isSelectionContextEnabled() {
        return this.isEnabled('enableRichSelectionContext');
    }

    isDatapointContextEnabled() {
        return this.isEnabled('enableDatapointContext');
    }

    isIntegrationEnabled() {
        return this.isEnabled('integrateWithExistingAgent');
    }

    // Get all flags (for debugging)
    getAllFlags() {
        return { ...this.flags };
    }
}

// Export singleton instance
window.featureFlags = window.featureFlags || new FeatureFlags();




