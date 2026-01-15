/**
 * Interruption Manager
 * Handles mid-sentence interruption, pause coordination, and transition management
 */

class InterruptionManager {
    constructor(redisService, voiceService) {
        this.redis = redisService;
        this.voiceService = voiceService;
    }
    
    /**
     * Interrupt current speech mid-sentence
     */
    async interruptMidSentence() {
        try {
            // Get current position from voice service
            const currentPosition = await this.getCurrentSentencePosition();
            
            // Save interrupted position to Redis (for potential resumption)
            if (this.redis && this.redis.isReady() && currentPosition) {
                await this.redis.saveInterruptedPosition(currentPosition, 300); // 5 min TTL
            }
            
            // Pause voice immediately
            await this.pauseCurrent();
            
            console.log('⏸️ Interrupted mid-sentence at position:', currentPosition);
            return true;
        } catch (error) {
            console.error('❌ Error interrupting mid-sentence:', error);
            return false;
        }
    }
    
    /**
     * Pause current audio playback
     */
    async pauseCurrent() {
        try {
            // Coordinate pause across instances via Redis
            if (this.redis && this.redis.isReady()) {
                await this.redis.updateState({ pauseRequested: true, pauseTimestamp: Date.now() });
            }
            
            // Stop voice service - handle both app.js stopVoiceAudio and grokVoiceService stopAudio
            if (this.voiceService) {
                // If voiceService is the app instance (has stopVoiceAudio)
                if (this.voiceService.stopVoiceAudio) {
                    this.voiceService.stopVoiceAudio();
                    // Wait for audio to fully stop
                    await new Promise(resolve => setTimeout(resolve, 500));
                    // Double-check
                    this.voiceService.stopVoiceAudio();
                    await new Promise(resolve => setTimeout(resolve, 200));
                } 
                // If voiceService is grokVoiceService (has stopAudio)
                else if (this.voiceService.stopAudio) {
                    this.voiceService.stopAudio();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    this.voiceService.stopAudio();
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                // If voiceService is grokVoiceSocketIOService
                else if (this.voiceService.stopAudio) {
                    this.voiceService.stopAudio();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    this.voiceService.stopAudio();
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            
            console.log('⏸️ Paused current audio');
            return true;
        } catch (error) {
            console.error('❌ Error pausing current audio:', error);
            return false;
        }
    }
    
    /**
     * Handle transition after interruption
     */
    async handleTransition(relationship, transitionPhrase) {
        try {
            // Queue transition in Redis
            if (this.redis && this.redis.isReady()) {
                await this.redis.queueTransition({
                    relationship: relationship.category,
                    transitionPhrase,
                    timestamp: Date.now()
                });
            }
            
            // Add brief pause before transition
            await this.addPause(500); // 500ms pause
            
            // Speak transition phrase
            if (this.voiceService && transitionPhrase) {
                await this.speakTransition(transitionPhrase);
            }
            
            // Add pause after transition
            await this.addPause(1000); // 1 second pause
            
            console.log('✅ Transition handled:', transitionPhrase);
            return true;
        } catch (error) {
            console.error('❌ Error handling transition:', error);
            return false;
        }
    }
    
    /**
     * Get current sentence position
     */
    async getCurrentSentencePosition() {
        try {
            // Try to get from Redis first
            if (this.redis && this.redis.isReady()) {
                const position = await this.redis.getState('currentSentencePosition');
                if (position) return position;
            }
            
            // Fallback: estimate from voice service if available
            if (this.voiceService && this.voiceService.getCurrentPosition) {
                return await this.voiceService.getCurrentPosition();
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error getting current sentence position:', error);
            return null;
        }
    }
    
    /**
     * Get interrupted position (for resumption)
     */
    async getInterruptedPosition() {
        if (this.redis && this.redis.isReady()) {
            return await this.redis.getInterruptedPosition();
        }
        return null;
    }
    
    /**
     * Clear interrupted position
     */
    async clearInterruptedPosition() {
        if (this.redis && this.redis.isReady()) {
            return await this.redis.clearInterruptedPosition();
        }
        return false;
    }
    
    /**
     * Add pause (milliseconds)
     */
    async addPause(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Speak transition phrase
     */
    async speakTransition(transitionPhrase) {
        if (!this.voiceService) {
            console.warn('⚠️ No voice service available for transition');
            return false;
        }
        
        try {
            // Use voice service to speak transition
            if (this.voiceService.speakText) {
                await this.voiceService.speakText(transitionPhrase);
            } else if (this.voiceService.speak) {
                await this.voiceService.speak(transitionPhrase);
            }
            return true;
        } catch (error) {
            console.error('❌ Error speaking transition:', error);
            return false;
        }
    }
    
    /**
     * Check if pause was requested (from Redis)
     */
    async wasPauseRequested() {
        if (this.redis && this.redis.isReady()) {
            const pauseRequested = await this.redis.getState('pauseRequested');
            return pauseRequested === true;
        }
        return false;
    }
    
    /**
     * Clear pause request
     */
    async clearPauseRequest() {
        if (this.redis && this.redis.isReady()) {
            await this.redis.updateState({ pauseRequested: false });
        }
    }
}

module.exports = InterruptionManager;

