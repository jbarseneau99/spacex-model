/**
 * AdaInputSystem - Main orchestrator for Ada's input sensor system
 * Initializes and coordinates all sensors, handlers, and context builders
 */

class AdaInputSystem {
    constructor(appInstance) {
        this.app = appInstance;
        this.initialized = false;
        
        // Sensors
        this.clickSensor = null;
        this.typeSensor = null;
        this.voiceSensor = null;
        
        // Handlers
        this.voiceOutputHandler = null;
        this.unifiedInputHandler = null;
        
        // Context
        this.contextBuilder = null;
    }

    /**
     * Initialize Ada input system
     */
    async initialize() {
        if (this.initialized) {
            console.warn('[AdaInputSystem] Already initialized');
            return;
        }

        console.log('[AdaInputSystem] 🚀 Initializing Ada Input System...');

        try {
            // Initialize context builder (use AdaContextBuilder to avoid conflict)
            this.contextBuilder = new window.AdaContextBuilder(this.app);
            console.log('[AdaInputSystem] ✅ AdaContextBuilder initialized');

            // Initialize voice output handler (defer until grokVoiceService is ready)
            // grokVoiceService is initialized later in app.js, so we'll create handler lazily
            // Store reference to app for lazy initialization
            this.appInstance = this.app;
            console.log('[AdaInputSystem] ✅ VoiceOutputHandler will be initialized when grokVoiceService is ready');

            // Initialize sensors
            this.clickSensor = new window.ClickSensor();
            this.clickSensor.initialize();
            console.log('[AdaInputSystem] ✅ ClickSensor initialized');

            this.typeSensor = new window.TypeSensor();
            this.typeSensor.initialize();
            console.log('[AdaInputSystem] ✅ TypeSensor initialized');

            this.voiceSensor = new window.VoiceSensor();
            await this.voiceSensor.initialize();
            console.log('[AdaInputSystem] ✅ VoiceSensor initialized');

            // Initialize unified input handler
            this.unifiedInputHandler = new window.UnifiedInputHandler(
                this.app,
                this.contextBuilder,
                this.voiceOutputHandler
            );
            this.unifiedInputHandler.initialize();
            console.log('[AdaInputSystem] ✅ UnifiedInputHandler initialized');

            this.initialized = true;
            console.log('[AdaInputSystem] ✅✅✅ Ada Input System fully initialized ✅✅✅');

        } catch (error) {
            console.error('[AdaInputSystem] ❌ Error initializing:', error);
            throw error;
        }
    }

    /**
     * Get voice output handler (lazy initialization)
     * 
     * IMPORTANT VERBATIM READING NOTE:
     * - VoiceOutputHandler uses Grok Voice API for verbatim text reading
     * - Backend adds prefix "Read this aloud exactly as written:" for verbatim reading
     * - Backend does NOT send session.update before each message (prevents unwanted responses)
     * - Initial session.update (during connection) sets identity only (minimal)
     * - See server.js socket.on('grok-voice:text') for verbatim implementation
     * - See documentation/VERBATIM_READING_SOLUTION.md for details
     */
    getVoiceOutputHandler() {
        // Lazy initialization - create handler when grokVoiceService is available
        if (!this.voiceOutputHandler && this.appInstance && this.appInstance.grokVoiceService) {
            // Pass app instance so VoiceOutputHandler can pause/resume microphone
            this.voiceOutputHandler = new window.VoiceOutputHandler(this.appInstance.grokVoiceService, this.appInstance);
            console.log('[AdaInputSystem] ✅ VoiceOutputHandler initialized (lazy)');
        }
        return this.voiceOutputHandler;
    }

    /**
     * Get voice sensor
     */
    getVoiceSensor() {
        return this.voiceSensor;
    }

    /**
     * Start voice input
     */
    startVoiceInput() {
        if (this.voiceSensor) {
            return this.voiceSensor.startListening();
        }
        return false;
    }

    /**
     * Stop voice input
     */
    stopVoiceInput() {
        if (this.voiceSensor) {
            this.voiceSensor.stopListening();
        }
    }

    /**
     * Enable/disable sensors
     * NOTE: Text input (type) is ALWAYS enabled - it's the primary, non-intrusive way to interact with Ada
     */
    setSensorEnabled(sensorType, enabled) {
        switch (sensorType) {
            case 'click':
                if (this.clickSensor) {
                    this.clickSensor.setEnabled(enabled);
                }
                break;
            case 'type':
                // Text input is always enabled - ignore attempts to disable
                console.log('[AdaInputSystem] ⚠️ Attempt to disable text input ignored - text input is always enabled');
                if (this.typeSensor) {
                    this.typeSensor.setEnabled(true); // Force enabled
                }
                break;
            case 'voice':
                if (this.voiceSensor) {
                    this.voiceSensor.setEnabled(enabled);
                }
                break;
        }
    }
}

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdaInputSystem;
} else {
    window.AdaInputSystem = AdaInputSystem;
}

