/**
 * Grok Voice Service - Socket.io Implementation
 * Uses Socket.io instead of raw WebSocket for Grok Voice API
 * Ada (Eve voice) is the default Mach33 Assistant
 */

class GrokVoiceSocketIOService {
    constructor() {
        this.socket = null;
        this.audioContext = null;
        this.isRecording = false;
        this.isSpeaking = false;
        this.sessionId = null;
        this.selectedMicrophoneId = null;
        this.onTranscriptCallback = null;
        this.onErrorCallback = null;
        this.onAudioChunkCallback = null;
        this.nextPlayTime = 0;
        this.audioQueue = [];
        this.isPlayingQueue = false;
        this.currentAudioSources = [];
        this.isConnected = false;
        this.addPauseBeforeNextChunk = false; // Flag to add pause before next chunk (for topic transitions)
        this.currentVoice = null; // Store current voice to ensure consistency
    }

    /**
     * Initialize audio context (no microphone needed for TTS)
     */
    async initialize(microphoneId = null) {
        this.selectedMicrophoneId = microphoneId;
        
        // Create AudioContext at 24kHz (Grok requirement)
        try {
            this.audioContext = new AudioContext({ sampleRate: 24000 });
            console.log('✅ AudioContext created at sample rate:', this.audioContext.sampleRate);
        } catch (error) {
            console.warn('Could not create AudioContext at 24kHz, using default:', error);
            this.audioContext = new AudioContext();
            console.log('✅ AudioContext created at default sample rate:', this.audioContext.sampleRate);
        }
        
        // Resume audio context if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        console.log('✅ Grok Voice Socket.io service initialized');
    }

    /**
     * Connect to Grok Voice via Socket.io
     */
    async connectSocketIO() {
        // If already connected with the same voice, return immediately
        const requestedVoice = localStorage.getItem('adaVoice') || 'eve';
        if (this.socket && this.socket.connected && this.currentVoice === requestedVoice) {
            console.log(`✅ Socket.io already connected with voice ${this.currentVoice}, reusing connection`);
            return Promise.resolve();
        }
        
        // If voice changed, disconnect and reconnect with new voice
        if (this.socket && this.socket.connected && this.currentVoice !== requestedVoice) {
            console.log(`🔄 Voice changed from ${this.currentVoice} to ${requestedVoice}, reconnecting...`);
            this.socket.disconnect();
            this.socket.removeAllListeners();
            this.socket = null;
            this.isConnected = false;
        }
        
        // If socket exists but not connected, disconnect it first to avoid conflicts
        if (this.socket && !this.socket.connected) {
            console.log('🔌 Disconnecting existing socket before reconnecting...');
            this.socket.disconnect();
            this.socket.removeAllListeners();
            this.socket = null;
        }

        return new Promise((resolve, reject) => {
            // Determine Socket.io URL
            const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
            const hostname = window.location.hostname;
            const currentPort = window.location.port || (protocol === 'https:' ? '443' : '80');
            
            // Use the same port as the current page
            let analystPort = currentPort;
            if (currentPort === '1999') {
                analystPort = '1998'; // Proxy scenario
            }

            const socketUrl = `${protocol}//${hostname}:${analystPort}`;
            const socketPath = '/api/analyst/socket.io';
            
            console.log(`🔌 Connecting to Socket.io: ${socketUrl}${socketPath}`);

            // Connect to Socket.io server
            // Start with polling only to avoid WebSocket frame header issues
            // Will upgrade to websocket after successful connection
            this.socket = io(socketUrl, {
                path: socketPath,
                transports: ['polling'], // Start with polling only - more reliable
                upgrade: true, // Allow upgrade to WebSocket after connection established
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
                reconnectionDelayMax: 5000,
                timeout: 20000, // 20 second timeout
                forceNew: false, // Reuse existing connection if available
                rememberUpgrade: false, // Don't remember upgrade to avoid conflicts
                autoConnect: true,
                withCredentials: false
            });

            this.socket.on('connect', () => {
                console.log('✅ Socket.io connected');
                console.log(`   Socket ID: ${this.socket.id}`);
                console.log(`   Transport: ${this.socket.io.engine.transport.name}`);
                
                // Generate session ID
                this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                // Small delay before sending connect event to ensure connection is stable
                setTimeout(() => {
                    // Get voice setting from localStorage (default to 'eve' for Ada)
                    // User can change this in settings, and it will be used for all connections
                    const adaVoice = localStorage.getItem('adaVoice') || 'eve';
                    
                    // Store voice in instance to ensure consistency
                    this.currentVoice = adaVoice;
                    
                    // Connect to Grok Voice with user's voice preference from settings
                    this.socket.emit('grok-voice:connect', {
                        sessionId: this.sessionId,
                        voice: adaVoice
                    });
                    
                    console.log(`📤 Sent grok-voice:connect (Ada - ${adaVoice} voice from settings)`);
                }, 100);
            });
            
            // Handle transport upgrade (polling -> websocket)
            this.socket.io.on('upgrade', () => {
                console.log('🔄 Socket.io transport upgraded to:', this.socket.io.engine.transport.name);
            });
            
            this.socket.io.on('upgradeError', (error) => {
                console.warn('⚠️ Socket.io upgrade error (staying on polling):', error.message);
                // Don't fail - polling works fine
            });

            this.socket.on('grok-voice:connected', (data) => {
                console.log('✅ Grok Voice connected via Socket.io');
                console.log(`   Session ID: ${data.sessionId}`);
                console.log(`   Voice: ${data.voice} (Ada)`);
                this.isConnected = true;
                resolve();
            });

            this.socket.on('grok-voice:error', (error) => {
                console.error('❌ Grok Voice error:', error);
                if (this.onErrorCallback) {
                    this.onErrorCallback(error);
                }
                reject(new Error(error.error || 'Grok Voice connection error'));
            });

            this.socket.on('grok-voice:audio', (data) => {
                console.log('🔊 Received audio chunk from server:', {
                    sessionId: data.sessionId,
                    expectedSessionId: this.sessionId,
                    audioLength: data.audio?.length || 0,
                    hasAudio: !!data.audio
                });
                
                if (data.sessionId === this.sessionId && data.audio) {
                    this.isSpeaking = true;
                    // Trigger audio chunk callback before playing
                    if (this.onAudioChunkCallback) {
                        this.onAudioChunkCallback(data.audio);
                    }
                    this.playAudioChunk(data.audio);
                } else {
                    console.warn('⚠️ Audio chunk session mismatch or missing audio:', {
                        receivedSessionId: data.sessionId,
                        expectedSessionId: this.sessionId,
                        hasAudio: !!data.audio
                    });
                }
            });

            this.socket.on('grok-voice:transcript-delta', (data) => {
                if (data.sessionId === this.sessionId && data.transcript) {
                    if (this.onTranscriptCallback) {
                        this.onTranscriptCallback(data.transcript, false);
                    }
                }
            });

            this.socket.on('grok-voice:transcript-complete', (data) => {
                if (data.sessionId === this.sessionId && data.transcript) {
                    if (this.onTranscriptCallback) {
                        this.onTranscriptCallback(data.transcript, true);
                    }
                }
            });

            this.socket.on('grok-voice:response-complete', (data) => {
                if (data.sessionId === this.sessionId) {
                    console.log('✅ Grok Voice response complete');
                    this.isSpeaking = false;
                    
                    // Trigger callback if set
                    if (this.onTranscriptCallback) {
                        this.onTranscriptCallback({ isFinal: true, complete: true }, true);
                    }
                }
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 Socket.io disconnected');
                this.isConnected = false;
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Socket.io connection error:', error);
                console.error('❌ Error details:', error.message, error.type);
                // Don't reject on connect_error - let reconnection handle it
                // reject(error);
            });
            
            this.socket.on('error', (error) => {
                console.error('❌ Socket.io error event:', error);
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Socket.io connection timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Send text to Grok Voice (TTS)
     * 
     * IMPORTANT VERBATIM READING NOTE:
     * - The backend adds prefix "Read this aloud exactly as written:" for verbatim reading
     * - Do NOT send session.update before each message (handled by backend)
     * - Initial session.update (during connection) sets identity only
     * - See server.js socket.on('grok-voice:text') for verbatim implementation
     * - See documentation/VERBATIM_READING_SOLUTION.md for details
     */
    async speakText(text) {
        console.log('📤 speakText called:', {
            textLength: text?.length || 0,
            socketExists: !!this.socket,
            socketConnected: this.socket?.connected || false,
            isConnected: this.isConnected,
            sessionId: this.sessionId,
            audioContextState: this.audioContext?.state || 'none'
        });
        
        if (!this.socket || !this.socket.connected) {
            console.log('🔌 Socket not connected, connecting...');
            await this.connectSocketIO();
        }

        if (!this.isConnected) {
            console.error('❌ Socket.io not connected after connect attempt');
            throw new Error('Socket.io not connected to Grok Voice');
        }

        // CRITICAL: Ensure AudioContext is ready before sending text
        if (!this.audioContext) {
            console.warn('⚠️ AudioContext not initialized before speakText, initializing now...');
            await this.initialize();
        }
        
        // CRITICAL: Resume AudioContext if suspended (required for remote machines)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            console.log('⏸️ AudioContext suspended before speakText, attempting to resume...');
            try {
                await this.audioContext.resume();
                console.log('✅ AudioContext resumed before sending text, state:', this.audioContext.state);
            } catch (error) {
                console.error('❌ Failed to resume AudioContext before speakText:', error);
                console.error('⚠️ Audio may not play - user interaction required');
            }
        }

        console.log(`📤 Sending text to Grok Voice (Ada): "${text.substring(0, 50)}..."`);
        console.log('📤 Sending with sessionId:', this.sessionId);
        this.isSpeaking = true;

        // Send text via Socket.io
        this.socket.emit('grok-voice:text', {
            sessionId: this.sessionId,
            text: text
        });
        
        console.log('✅ Text sent to server, waiting for audio chunks...');
    }

    /**
     * Play audio chunk (PCM base64)
     */
    async playAudioChunk(base64Audio) {
        console.log('🔊 playAudioChunk called:', {
            audioLength: base64Audio?.length || 0,
            hasAudio: !!base64Audio,
            audioContextExists: !!this.audioContext,
            audioContextState: this.audioContext?.state || 'none'
        });
        
        if (!base64Audio || base64Audio.length === 0) {
            console.error('❌ No audio data provided to playAudioChunk');
            return;
        }
        
        // Ensure AudioContext is initialized
        if (!this.audioContext) {
            console.warn('⚠️ AudioContext not initialized, creating now...');
            try {
                this.audioContext = new AudioContext({ sampleRate: 24000 });
                console.log('✅ AudioContext created at sample rate:', this.audioContext.sampleRate, 'State:', this.audioContext.state);
            } catch (error) {
                console.warn('⚠️ Could not create AudioContext at 24kHz, using default:', error);
                this.audioContext = new AudioContext();
                console.log('✅ AudioContext created at default sample rate:', this.audioContext.sampleRate, 'State:', this.audioContext.state);
            }
        }

        // CRITICAL: Resume AudioContext if suspended (browser autoplay policy)
        // This is especially important for remote machines or when page loads without user interaction
        if (this.audioContext.state === 'suspended') {
            console.log('⏸️ AudioContext suspended, attempting to resume...');
            console.log('⚠️ REMOTE MACHINE: AudioContext requires user interaction to resume');
            try {
                await this.audioContext.resume();
                console.log('✅ AudioContext resumed, state:', this.audioContext.state);
            } catch (error) {
                console.error('❌ Failed to resume AudioContext:', error);
                console.error('⚠️ Audio playback requires user interaction (click/tap) to start');
                console.error('💡 SOLUTION: User must click anywhere on the page to enable audio');
                // Don't return - try to play anyway, might work after user interaction
            }
        }

        if (this.audioContext.state === 'closed') {
            console.error('❌ AudioContext is closed! Re-creating...');
            try {
                this.audioContext = new AudioContext({ sampleRate: 24000 });
                console.log('✅ AudioContext re-created, state:', this.audioContext.state);
            } catch (error) {
                console.error('❌ Failed to re-create AudioContext:', error);
                return;
            }
        }

        // Final check - if still suspended, log warning but try to play
        if (this.audioContext.state === 'suspended') {
            console.warn('⚠️ AudioContext still suspended - audio may not play until user interacts');
            console.warn('💡 User must click/tap anywhere on the page to enable audio');
        }

        try {
            console.log('🔊 Starting audio playback, AudioContext state:', this.audioContext.state);
            // Convert base64 to ArrayBuffer
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Convert PCM Int16 to Float32
            const pcmData = new Int16Array(bytes.buffer);
            const floatData = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
                floatData[i] = pcmData[i] / 32768.0;
            }

            // Create audio buffer and play at original sample rate
            // Note: Speed adjustment removed - Web Audio API's playbackRate changes pitch
            // For pitch-preserving speed changes, a complex time-stretching algorithm would be needed
            const audioBuffer = this.audioContext.createBuffer(1, floatData.length, 24000);
            audioBuffer.getChannelData(0).set(floatData);
            
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            
            // Schedule playback for gapless audio
            const now = this.audioContext.currentTime;
            let playTime = Math.max(now, this.nextPlayTime);
            
            // Add pause before first chunk if flag is set (for topic transitions)
            if (this.addPauseBeforeNextChunk) {
                console.log('⏸️ Adding 500ms pause before topic transition acknowledgment');
                playTime = Math.max(now, this.nextPlayTime) + 0.5; // Add 500ms pause
                this.addPauseBeforeNextChunk = false; // Clear flag after first use
            }
            
            source.start(playTime);
            console.log('✅ Audio source started at time:', playTime, 'Duration:', audioBuffer.duration, 'AudioContext state:', this.audioContext.state);
            
            // Update next play time - duration is already adjusted by time-stretching
            // The buffer duration reflects the stretched length, so it's correct
            this.nextPlayTime = playTime + audioBuffer.duration;
            
            // Track source for stopping
            this.currentAudioSources.push(source);
            
            source.onended = () => {
                const index = this.currentAudioSources.indexOf(source);
                if (index > -1) {
                    this.currentAudioSources.splice(index, 1);
                }
                console.log('✅ Audio chunk playback completed, remaining sources:', this.currentAudioSources.length);
            };
            
            source.onerror = (error) => {
                console.error('❌ Audio source error:', error);
            };
            
        } catch (error) {
            console.error('❌ Error playing audio chunk:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                audioContextState: this.audioContext?.state || 'none',
                audioLength: base64Audio?.length || 0
            });
        }
    }

    /**
     * Stop audio playback
     */
    stopAudio() {
        console.log('🛑 Stopping audio playback');
        // Stop all audio sources
        this.currentAudioSources.forEach(source => {
            try {
                if (source && typeof source.stop === 'function') {
                    source.stop();
                }
            } catch (e) {
                // Source may already be stopped
            }
        });
        this.currentAudioSources = [];
        this.nextPlayTime = 0;
        this.isPlayingQueue = false;
        // Clear audio queue to prevent queued chunks from playing
        if (this.audioQueue) {
            this.audioQueue = [];
        }
        this.isSpeaking = false;
        console.log('✅ Audio playback stopped, queue cleared');
    }

    /**
     * Disconnect Socket.io
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.stopAudio();
    }

    /**
     * Set transcript callback
     */
    onTranscript(callback) {
        this.onTranscriptCallback = callback;
    }

    /**
     * Set audio chunk callback (called when audio chunk arrives)
     */
    onAudioChunk(callback) {
        this.onAudioChunkCallback = callback;
    }

    /**
     * Set error callback
     */
    onError(callback) {
        this.onErrorCallback = callback;
    }
}


