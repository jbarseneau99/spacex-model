/**
 * VoiceInputHandler - Modular handler for Ada's voice input (Speech Recognition)
 * Handles speech-to-text conversion and bidirectional voice conversations
 */

class VoiceInputHandler {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.onTranscriptCallback = null;
        this.onErrorCallback = null;
        this.onStartCallback = null;
        this.onEndCallback = null;
    }

    /**
     * Initialize Web Speech API recognition
     */
    initialize() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('[VoiceInputHandler] Speech recognition not supported');
            return false;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition
        this.recognition.continuous = true; // Keep listening
        this.recognition.interimResults = true; // Show interim results
        this.recognition.lang = 'en-US';

        // Set up event handlers
        this.recognition.onstart = () => {
            console.log('[VoiceInputHandler] 🎤 Speech recognition started');
            this.isListening = true;
            if (this.onStartCallback) {
                this.onStartCallback();
            }
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            if (this.onTranscriptCallback) {
                this.onTranscriptCallback({
                    final: finalTranscript.trim(),
                    interim: interimTranscript,
                    isFinal: finalTranscript.length > 0
                });
            }
        };

        this.recognition.onerror = (event) => {
            console.error('[VoiceInputHandler] ❌ Speech recognition error:', event.error);
            this.isListening = false;
            if (this.onErrorCallback) {
                this.onErrorCallback(event.error);
            }
        };

        this.recognition.onend = () => {
            console.log('[VoiceInputHandler] 🎤 Speech recognition ended');
            this.isListening = false;
            
            // CONSOLIDATED: Restart recognition if still listening (matches old behavior)
            // VoiceSensor will handle restart logic via onEnd callback
            if (this.onEndCallback) {
                this.onEndCallback();
            }
        };

        return true;
    }

    /**
     * Start listening for voice input
     */
    startListening() {
        if (!this.recognition) {
            if (!this.initialize()) {
                throw new Error('Speech recognition not available');
            }
        }

        if (this.isListening) {
            console.warn('[VoiceInputHandler] Already listening');
            return;
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.error('[VoiceInputHandler] Error starting recognition:', error);
            throw error;
        }
    }

    /**
     * Stop listening for voice input
     */
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    /**
     * Set callback for transcript updates
     */
    onTranscript(callback) {
        this.onTranscriptCallback = callback;
    }

    /**
     * Set callback for errors
     */
    onError(callback) {
        this.onErrorCallback = callback;
    }

    /**
     * Set callback for recognition start
     */
    onStart(callback) {
        this.onStartCallback = callback;
    }

    /**
     * Set callback for recognition end
     */
    onEnd(callback) {
        this.onEndCallback = callback;
    }

    /**
     * Check if currently listening
     */
    getIsListening() {
        return this.isListening;
    }
}

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceInputHandler;
} else {
    window.VoiceInputHandler = VoiceInputHandler;
}

