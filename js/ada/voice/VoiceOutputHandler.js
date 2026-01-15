/**
 * VoiceOutputHandler - Modular handler for Ada's voice output (TTS)
 * Handles verbatim text reading via Grok Voice API
 * 
 * IMPORTANT VERBATIM READING IMPLEMENTATION:
 * 
 * How verbatim reading works:
 * 1. Initial session.update (during connection) sets identity only (minimal)
 * 2. Backend adds prefix "Read this aloud exactly as written:" to text
 * 3. NO session.update sent before each message (prevents unwanted responses)
 * 4. Simple prefix approach is more effective than complex instructions
 * 
 * Key principles:
 * - Less is more: Too many instructions confuse Grok
 * - Prefix works: Simple prefix signals verbatim reading
 * - No extra session.update: Prevents unwanted responses
 * 
 * See documentation/VERBATIM_READING_SOLUTION.md for complete details
 */

class VoiceOutputHandler {
    constructor(grokVoiceService, app = null) {
        this.grokVoiceService = grokVoiceService;
        this.app = app; // Reference to app instance for accessing VoiceSensor
        this.isSpeaking = false;
        this.currentText = null;
        this.wasMicrophoneListening = false; // Track if microphone was listening before we paused it
    }

    /**
     * Speak text verbatim (TTS mode)
     * Ensures Grok reads text exactly as written, not creating its own narrative
     * 
     * VERBATIM READING IMPLEMENTATION:
     * - Cleans text (removes markdown, HTML, "Learn more" sections)
     * - Sends to backend via GrokVoiceService.speakText()
     * - Backend adds prefix "Read this aloud exactly as written:" for verbatim reading
     * - Backend does NOT send session.update before each message (prevents unwanted responses)
     * 
     * See server.js socket.on('grok-voice:text') for backend verbatim implementation
     */
    async speakVerbatim(text) {
        if (!text || !text.trim()) {
            console.warn('[VoiceOutputHandler] Empty text, skipping');
            return;
        }

        console.log('[VoiceOutputHandler] 📢 Speaking verbatim text:', {
            length: text.length,
            preview: text.substring(0, 100) + '...'
        });

        this.isSpeaking = true;
        this.currentText = text;

        try {
            // CRITICAL: Pause microphone (Web Speech API) when voice output starts
            // This prevents microphone conflicts with audio playback
            this.pauseMicrophoneIfListening();

            // Ensure Grok Voice service is connected
            if (!this.grokVoiceService) {
                throw new Error('Grok Voice service not available');
            }

            if (!this.grokVoiceService.isConnected) {
                console.log('[VoiceOutputHandler] Connecting to Grok Voice...');
                await this.grokVoiceService.connectSocketIO();
            }

            // Set up callback to resume microphone when audio playback completes
            this.setupAudioCompletionCallback();

            // Clean text - remove markdown, HTML, etc. for verbatim reading
            const cleanText = this.cleanTextForVerbatim(text);

            // Send text for verbatim reading via Socket.io
            // The backend will handle session.update for verbatim reading
            await this.grokVoiceService.speakText(cleanText);
            
            console.log('[VoiceOutputHandler] ✅ Text sent for verbatim reading');
        } catch (error) {
            console.error('[VoiceOutputHandler] ❌ Error speaking text:', error);
            this.isSpeaking = false;
            // Resume microphone on error
            this.resumeMicrophoneIfWasListening();
            throw error;
        }
    }

    /**
     * Clean text for verbatim reading
     * Removes markdown, HTML tags, but preserves the actual text content
     * Also removes bullet points formatting for better voice reading
     */
    cleanTextForVerbatim(text) {
        if (!text) return '';
        
        // Remove markdown links but keep text: [text](url) -> text
        let cleaned = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        
        // Remove markdown bold/italic but keep text: **text** -> text, *text* -> text
        cleaned = cleaned.replace(/\*\*([^\*]+)\*\*/g, '$1');
        cleaned = cleaned.replace(/\*([^\*]+)\*/g, '$1');
        
        // Remove entity links but keep text: <span class="ada-entity-link">text</span> -> text
        cleaned = cleaned.replace(/<span[^>]*class="ada-entity-link"[^>]*>([^<]+)<\/span>/gi, '$1');
        
        // Remove HTML tags but keep content
        cleaned = cleaned.replace(/<[^>]+>/g, '');
        
        // Remove "Learn more:" sections (these are UI-only, not for voice)
        cleaned = cleaned.replace(/Learn more:.*$/im, '').trim();
        
        // Convert bullet points to natural speech: "• item" -> "item"
        cleaned = cleaned.replace(/^[\s•\-\*]+\s*/gm, '');
        
        // Clean up extra whitespace and newlines
        cleaned = cleaned.replace(/\n\s*\n/g, '\n'); // Multiple newlines to single
        cleaned = cleaned.replace(/\s+/g, ' '); // Multiple spaces to single
        cleaned = cleaned.trim();
        
        return cleaned;
    }

    /**
     * Pause microphone (Web Speech API) if it's currently listening
     * This prevents microphone conflicts with audio playback
     */
    pauseMicrophoneIfListening() {
        if (!this.app || !this.app.adaInputSystem) {
            return;
        }

        try {
            const voiceSensor = this.app.adaInputSystem.getVoiceSensor();
            if (voiceSensor && voiceSensor.getIsListening()) {
                console.log('[VoiceOutputHandler] 🎤 Pausing microphone for voice output');
                this.wasMicrophoneListening = true;
                voiceSensor.stopListening();
            } else {
                this.wasMicrophoneListening = false;
            }
        } catch (error) {
            console.warn('[VoiceOutputHandler] ⚠️ Could not pause microphone:', error);
            this.wasMicrophoneListening = false;
        }
    }

    /**
     * Resume microphone (Web Speech API) if it was listening before we paused it
     */
    resumeMicrophoneIfWasListening() {
        if (!this.wasMicrophoneListening) {
            return;
        }

        if (!this.app || !this.app.adaInputSystem) {
            return;
        }

        try {
            const voiceSensor = this.app.adaInputSystem.getVoiceSensor();
            if (voiceSensor && this.app.agentVoiceInputEnabled) {
                console.log('[VoiceOutputHandler] 🎤 Resuming microphone after voice output');
                // Small delay to ensure audio playback has fully stopped
                setTimeout(() => {
                    if (this.app.agentVoiceInputEnabled && voiceSensor) {
                        voiceSensor.startListening();
                    }
                    this.wasMicrophoneListening = false;
                }, 500);
            } else {
                this.wasMicrophoneListening = false;
            }
        } catch (error) {
            console.warn('[VoiceOutputHandler] ⚠️ Could not resume microphone:', error);
            this.wasMicrophoneListening = false;
        }
    }

    /**
     * Set up callback to resume microphone when audio playback completes
     */
    setupAudioCompletionCallback() {
        if (!this.grokVoiceService) {
            return;
        }

        // Listen for response completion event
        if (this.grokVoiceService.socket) {
            // Remove any existing listener to avoid duplicates
            this.grokVoiceService.socket.off('grok-voice:response-complete', this._audioCompletionHandler);
            
            // Create bound handler
            this._audioCompletionHandler = () => {
                console.log('[VoiceOutputHandler] ✅ Audio playback complete, resuming microphone');
                this.isSpeaking = false;
                this.currentText = null;
                this.resumeMicrophoneIfWasListening();
            };
            
            // Add listener
            this.grokVoiceService.socket.on('grok-voice:response-complete', this._audioCompletionHandler);
        }
    }

    /**
     * Stop current speech
     */
    stop() {
        if (this.grokVoiceService && this.isSpeaking) {
            console.log('[VoiceOutputHandler] 🛑 Stopping speech');
            // Stop audio playback
            if (this.grokVoiceService.stopAudio) {
                this.grokVoiceService.stopAudio();
            }
            this.isSpeaking = false;
            this.currentText = null;
            
            // Resume microphone immediately when stopping
            this.resumeMicrophoneIfWasListening();
        }
    }

    /**
     * Check if currently speaking
     */
    getIsSpeaking() {
        return this.isSpeaking;
    }

    /**
     * Get current text being spoken
     */
    getCurrentText() {
        return this.currentText;
    }
}

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceOutputHandler;
} else {
    window.VoiceOutputHandler = VoiceOutputHandler;
}

