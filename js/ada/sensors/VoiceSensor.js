/**
 * VoiceSensor - Modular handler for voice input detection
 * Wraps VoiceInputHandler and provides sensor interface
 */

class VoiceSensor {
    constructor() {
        this.voiceInputHandler = null;
        this.enabled = false;
        this.isListening = false;
    }

    /**
     * Initialize voice sensor
     */
    async initialize() {
        if (!window.VoiceInputHandler) {
            console.error('[VoiceSensor] VoiceInputHandler not available');
            return false;
        }

        this.voiceInputHandler = new window.VoiceInputHandler();
        
        if (!this.voiceInputHandler.initialize()) {
            console.error('[VoiceSensor] Speech recognition not supported');
            return false;
        }

        // Set up callbacks
        this.voiceInputHandler.onTranscript((transcript) => {
            this.handleTranscript(transcript);
        });

        this.voiceInputHandler.onError((error) => {
            console.error('[VoiceSensor] Speech recognition error:', error);
            this.emitVoiceEvent({
                type: 'error',
                error: error
            });
        });

        this.voiceInputHandler.onStart(() => {
            this.isListening = true;
            this.emitVoiceEvent({
                type: 'start'
            });
        });

        this.voiceInputHandler.onEnd(() => {
            this.isListening = false;
            this.emitVoiceEvent({
                type: 'end'
            });
            
            // CONSOLIDATED: Restart recognition if voice input is still enabled (matches old behavior)
            // Check if voice input toggle is still enabled
            const voiceInputEnabled = localStorage.getItem('agentVoiceInputEnabled') === 'true';
            if (voiceInputEnabled && this.enabled) {
                // Small delay before restarting to avoid immediate restart
                setTimeout(() => {
                    if (this.enabled && voiceInputEnabled) {
                        try {
                            this.voiceInputHandler.startListening();
                        } catch (error) {
                            console.error('[VoiceSensor] Failed to restart recognition:', error);
                        }
                    }
                }, 100);
            }
        });

        console.log('[VoiceSensor] ✅ Initialized');
        return true;
    }

    /**
     * Handle transcript from speech recognition
     * CONSOLIDATED: Routes voice input through UnifiedInputHandler
     */
    handleTranscript(transcript) {
        if (!transcript.final && transcript.interim) {
            // Interim result - just update UI (could show in chat if needed)
            this.emitVoiceEvent({
                type: 'interim',
                transcript: transcript.interim
            });
            return;
        }

        if (transcript.final) {
            // Final result - process as input through UnifiedInputHandler
            console.log('[VoiceSensor] 🎤 Voice input detected:', transcript.final);
            
            // Emit voice event - UnifiedInputHandler will process it
            this.emitVoiceEvent({
                type: 'voice',
                transcript: transcript.final,
                isFinal: true
            });
        }
    }

    /**
     * Start listening for voice input
     * CONSOLIDATED: Replaces old startVoiceRecording() method
     */
    startListening() {
        if (!this.voiceInputHandler) {
            console.error('[VoiceSensor] Not initialized');
            return false;
        }

        if (this.isListening) {
            console.warn('[VoiceSensor] Already listening');
            return true;
        }

        try {
            this.voiceInputHandler.startListening();
            this.enabled = true;
            
            // Update UI to match old behavior
            const recordBtn = document.getElementById('agentVoiceRecordBtn');
            const recordIcon = document.getElementById('agentVoiceRecordIcon');
            if (recordBtn) {
                recordBtn.classList.add('recording');
            }
            if (recordIcon) {
                recordIcon.setAttribute('data-lucide', 'square');
                if (window.lucide) window.lucide.createIcons();
            }
            
            // Show listening message (if app instance available)
            if (window.app && window.app.addAgentMessage) {
                window.app.addAgentMessage('🎤 Listening...', 'system');
            }
            
            return true;
        } catch (error) {
            console.error('[VoiceSensor] Error starting listening:', error);
            if (window.app && window.app.addAgentMessage) {
                window.app.addAgentMessage('Failed to start voice recording. Please try again.', 'system');
            }
            return false;
        }
    }

    /**
     * Stop listening for voice input
     * CONSOLIDATED: Replaces old stopVoiceRecording() method
     */
    stopListening() {
        if (this.voiceInputHandler && this.isListening) {
            this.voiceInputHandler.stopListening();
            this.isListening = false;
            
            // Update UI to match old behavior
            const recordBtn = document.getElementById('agentVoiceRecordBtn');
            const recordIcon = document.getElementById('agentVoiceRecordIcon');
            if (recordBtn) {
                recordBtn.classList.remove('recording');
            }
            if (recordIcon) {
                recordIcon.setAttribute('data-lucide', 'mic');
                if (window.lucide) window.lucide.createIcons();
            }
        }
    }

    /**
     * Emit voice event
     */
    emitVoiceEvent(context) {
        // Dispatch custom event
        const voiceEvent = new CustomEvent('ada:voice', {
            detail: {
                type: 'voice',
                timestamp: Date.now(),
                ...context
            },
            bubbles: true
        });
        document.dispatchEvent(voiceEvent);
    }

    /**
     * Check if currently listening
     */
    getIsListening() {
        return this.isListening;
    }

    /**
     * Enable/disable voice sensor
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled && this.isListening) {
            this.stopListening();
        }
    }
}

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceSensor;
} else {
    window.VoiceSensor = VoiceSensor;
}

