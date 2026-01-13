/**
 * Grok Voice Service - Bidirectional Voice Conversation with Grok Voice API
 * Implements WebSocket-based real-time voice streaming
 */

class GrokVoiceService {
    constructor() {
        this.ws = null;
        this.audioContext = null;
        this.mediaStream = null;
        this.processor = null;
        this.isRecording = false;
        this.isSpeaking = false;
        this.sessionId = null;
        this.selectedMicrophoneId = null;
        this.onTranscriptCallback = null;
        this.onErrorCallback = null;
        this.nextPlayTime = 0; // For gapless audio playback
        this.audioQueue = []; // Queue for buffering audio chunks
        this.isPlayingQueue = false; // Track if queue is being processed
        this.currentAudioSources = []; // Track active audio sources for stopping
    }

    /**
     * Initialize microphone and audio context
     */
    async initialize(microphoneId = null) {
        this.selectedMicrophoneId = microphoneId;
        
        // Request microphone access
        const constraints = {
            audio: microphoneId ? {
                deviceId: { exact: microphoneId }
            } : true
        };
        
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Create AudioContext at 24kHz (Grok requirement)
        // Note: Some browsers may not support custom sample rates, will use closest supported
        try {
            this.audioContext = new AudioContext({ sampleRate: 24000 });
            console.log('✅ AudioContext created at sample rate:', this.audioContext.sampleRate);
        } catch (error) {
            // Fallback to default sample rate
            console.warn('Could not create AudioContext at 24kHz, using default:', error);
            this.audioContext = new AudioContext();
            console.log('✅ AudioContext created at default sample rate:', this.audioContext.sampleRate);
        }
        
        // Resume audio context if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        console.log('✅ Grok Voice initialized with microphone:', microphoneId || 'default');
    }

    /**
     * Connect to backend WebSocket proxy
     * REUSES existing connection if available, prevents duplicate connections
     */
    async connectWebSocket() {
        // If already connected, return immediately
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('✅ WebSocket already connected, reusing existing connection');
            return Promise.resolve();
        }
        
        // If connection is in progress, wait for it
        if (this.connectionPromise) {
            console.log('⏳ WebSocket connection already in progress, waiting...');
            return this.connectionPromise;
        }
        
        // Rate limit: Don't connect more than once per second
        const now = Date.now();
        const timeSinceLastAttempt = now - this.lastConnectionAttempt;
        if (timeSinceLastAttempt < 1000) {
            const waitTime = 1000 - timeSinceLastAttempt;
            console.log(`⏳ Rate limiting: Waiting ${waitTime}ms before connecting (prevent Grok rate limits)`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.lastConnectionAttempt = Date.now();
        
        // Create connection promise
        this.connectionPromise = new Promise((resolve, reject) => {
            // Initialize AudioContext if not already initialized (needed for playback)
            if (!this.audioContext) {
                try {
                    this.audioContext = new AudioContext({ sampleRate: 24000 });
                    console.log('✅ AudioContext created for playback (24kHz)');
                } catch (error) {
                    console.warn('Could not create AudioContext at 24kHz, using default:', error);
                    this.audioContext = new AudioContext();
                    console.log('✅ AudioContext created with default sample rate:', this.audioContext.sampleRate);
                }
                
                // Resume if suspended (browser autoplay policy)
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume().then(() => {
                        console.log('✅ AudioContext resumed');
                    }).catch(err => {
                        console.error('Failed to resume AudioContext:', err);
                    });
                }
            }
            
            // Determine WebSocket URL
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const hostname = window.location.hostname;
            const currentPort = window.location.port || (protocol === 'wss:' ? '443' : '80');
            
            // Use the same port as the current page (server runs WebSocket on same port as HTTP)
            // Only special case: if accessing via port 1999 (proxy), connect to 1998 (backend)
            let analystPort = currentPort;
            if (currentPort === '1999') {
                analystPort = '1998'; // Proxy scenario: frontend on 1999, backend on 1998
            }
            // For port 3333 or any other port, use the same port (server handles both HTTP and WebSocket)

            const proxyUrl = `${protocol}//${hostname}:${analystPort}/api/analyst/ws/grok-voice`;

            console.log('🔌 Connecting to Grok Voice WebSocket:', proxyUrl);
            
            // Connect to backend proxy
            this.ws = new WebSocket(proxyUrl);
            
            // CRITICAL: Set binaryType to 'blob' so binary messages are received as Blob
            // Default is 'blob' but let's be explicit
            this.ws.binaryType = 'blob';
            console.log('🔧 WebSocket binaryType set to:', this.ws.binaryType);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket connected to proxy');
                console.log('🔧 WebSocket binaryType:', this.ws.binaryType);
                console.log('🔧 WebSocket readyState:', this.ws.readyState, '(should be 1=OPEN)');
                console.log('🔧 WebSocket protocol:', this.ws.protocol);
                console.log('🔧 WebSocket extensions:', this.ws.extensions);
                
                // Clear connection promise since we're now connected
                this.connectionPromise = null;
                
                // Test: Send a test message to verify connection works
                console.log('🧪 Testing WebSocket connection...');
                try {
                    this.ws.send(JSON.stringify({ type: 'test', message: 'connection test' }));
                    console.log('🧪 Test message sent');
                } catch (e) {
                    console.error('❌ Failed to send test message:', e);
                }
                
                // Send session config (don't await - it's async)
                this.sendSessionConfig().catch(err => {
                    console.error('Failed to send initial session config:', err);
                });
                resolve();
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                console.error('❌ WebSocket error details:', error.message, error.type);
                console.error('❌ Attempted to connect to:', proxyUrl);
                console.error('❌ Current page URL:', window.location.href);
                console.error('❌ Current port:', window.location.port);
                console.error('❌ Detected analyst port:', analystPort);
                console.error('❌ If connection failed, check:');
                console.error('   1. Server is running on port', analystPort);
                console.error('   2. WebSocket path is correct: /api/analyst/ws/grok-voice');
                console.error('   3. CORS allows WebSocket connections');
                // Clear connection promise on error
                this.connectionPromise = null;
                reject(error);
            };
            
            this.ws.onclose = (event) => {
                console.log('🔌 WebSocket closed:', event.code, event.reason);
                console.log('🔌 Was clean close?', event.wasClean);
                // Clear connection promise on close
                this.connectionPromise = null;
                
                if (!event.wasClean && event.code !== 1000) {
                    console.error('❌ WebSocket closed unexpectedly!');
                    console.error('❌ Close code:', event.code);
                    console.error('❌ Close reason:', event.reason?.toString() || 'no reason');
                    console.error('❌ Close code meanings:');
                    console.error('   1000 = Normal closure');
                    console.error('   1001 = Going away');
                    console.error('   1006 = Abnormal closure (no close frame)');
                    console.error('   1008 = Policy violation');
                    console.error('   1011 = Internal server error');
                    console.error('   4000+ = Application-specific errors');
                    console.error('❌ This usually means:');
                    console.error('   - Server is not running');
                    console.error('   - Port is incorrect');
                    console.error('   - WebSocket path is wrong');
                    console.error('   - Connection was refused');
                    console.error('   - API key is invalid');
                    console.error('   - Rate limit exceeded');
                }
                this.ws = null;
            };
            
            this.ws.onmessage = (event) => {
                // Handle both binary (audio) and text (JSON) messages - like working implementation
                if (event.data instanceof Blob) {
                    // Binary audio data from Grok (raw PCM)
                    console.log('📥 WebSocket received Blob (binary audio), size:', event.data.size, 'bytes');
                    this.handleBinaryMessage(event.data);
                } else if (event.data instanceof ArrayBuffer) {
                    // ArrayBuffer binary data
                    console.log('📥 WebSocket received ArrayBuffer (binary audio), size:', event.data.byteLength, 'bytes');
                    const blob = new Blob([event.data]);
                    this.handleBinaryMessage(blob);
                } else if (typeof event.data === 'string') {
                    // JSON text message
                    console.log('📥 WebSocket received string (JSON), length:', event.data.length);
                    this.handleWebSocketMessage(event);
                } else {
                    console.log('📥 WebSocket received unknown data type:', typeof event.data);
                    // Try to handle anyway
                    this.handleWebSocketMessage(event);
                }
            };
        });
    }

    /**
     * Send session configuration to Grok
     * Returns a promise that resolves when session.updated is received
     */
    sendSessionConfig() {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                console.error('WebSocket not open');
                reject(new Error('WebSocket not open'));
                return;
            }
            
            // Official format from xAI docs
            // Voice names should be lowercase: 'ara', 'rex', 'sal', 'eve', 'leo'
            const config = {
                type: 'session.update',
                session: {
                    instructions: 'You are a helpful voice assistant named Ara. Respond naturally and conversationally.',
                    voice: 'ara', // lowercase: ara, rex, sal, eve, or leo
                    turn_detection: {
                        type: 'server_vad' // Server-side voice activity detection
                    },
                    audio: {
                        input: {
                            format: {
                                type: 'audio/pcm', // PCM format
                                rate: 24000 // 24kHz sample rate (required)
                            }
                        },
                        output: {
                            format: {
                                type: 'audio/pcm',
                                rate: 24000
                            }
                        }
                    }
                }
            };
            
            console.log('📤 Sending session config with voice: ara');
            console.log('📤 Full config:', JSON.stringify(config, null, 2));
            
            // Set up one-time listener for session.updated
            // We'll use a flag to track if we're waiting for session.updated
            // Increase timeout to 5 seconds - Grok may take time to respond
            const timeout = setTimeout(() => {
                console.warn('⚠️ Session update timeout - session.updated not received within 5 seconds');
                console.warn('⚠️ This may be normal - Grok may not always send session.updated');
                console.warn('⚠️ Proceeding anyway since we sent voice: "ara" in config');
                this.pendingSessionConfig = null;
                // Resolve instead of reject - we'll trust that the config was accepted
                resolve();
            }, 5000);
            
            // Store the promise callbacks so handleWebSocketMessage can resolve it
            this.pendingSessionConfig = { resolve, timeout };
            
            // Send config
            this.ws.send(JSON.stringify(config));
        });
    }

    /**
     * Start audio recording and streaming
     */
    async startAudioRecording() {
        if (!this.mediaStream) {
            throw new Error('Media stream not initialized');
        }

        // Grok Voice API requires PCM audio at 24kHz (Int16)
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        
        // Use ScriptProcessorNode for audio processing
        const bufferSize = 4096;
        const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
        
        processor.onaudioprocess = (event) => {
            // CRITICAL: Don't send audio if not recording
            if (!this.isRecording) {
                return; // Stop processing if not recording
            }
            
            const inputData = event.inputBuffer.getChannelData(0); // Float32Array [-1, 1]
            
            // Check for silence (optional optimization)
            const maxAmplitude = Math.max(...Array.from(inputData).map(Math.abs));
            if (maxAmplitude < 0.01) {
                return; // Skip silent chunks
            }
            
            // Convert Float32Array to Int16Array (PCM)
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                // Clamp to [-1, 1] range
                const sample = Math.max(-1, Math.min(1, inputData[i]));
                // Convert to 16-bit PCM: multiply by 32767 for positive, 32768 for negative
                pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            }
            
            // Convert Int16Array to base64 string
            const bytes = new Uint8Array(pcmData.buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64Audio = btoa(binary);
            
            // Send to Grok via WebSocket (only if recording)
            if (this.isRecording) {
                this.sendAudioData(base64Audio);
            } else {
                // Log occasionally if processor is running but not recording
                if (!this._processorWarningCount) this._processorWarningCount = 0;
                this._processorWarningCount++;
                if (this._processorWarningCount === 1 || this._processorWarningCount % 100 === 0) {
                    console.warn('⚠️ Audio processor running but isRecording=false, not sending audio');
                }
            }
        };
        
        source.connect(processor);
        processor.connect(this.audioContext.destination);
        this.processor = processor;
        
        console.log('✅ Audio recording started (PCM 24kHz Int16)');
    }

    /**
     * Send audio data to Grok
     */
    sendAudioData(base64Audio) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not open, cannot send audio');
            return;
        }
        
        if (!base64Audio || base64Audio.length === 0) {
            return;
        }
        
        // Official format from xAI docs
        const message = {
            type: 'input_audio_buffer.append',
            audio: base64Audio // Base64 encoded PCM audio (Int16)
        };
        
        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('Error sending audio:', error);
        }
    }

    /**
     * Commit audio buffer (signal end of input)
     */
    commitAudioBuffer() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not open, cannot commit buffer');
            return;
        }
        
        const commitMessage = {
            type: 'input_audio_buffer.commit'
        };
        
        console.log('📤 Committing audio buffer');
        this.ws.send(JSON.stringify(commitMessage));
        
        // CRITICAL: After committing audio input, request audio response from Grok
        // Wait 500ms after commit (same delay as TTS mode) then send response.create
        setTimeout(() => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                console.warn('WebSocket closed before sending response.create');
                return;
            }
            
            const responseMessage = {
                type: 'response.create',
                response: {
                    modalities: ['audio', 'text'] // Request both audio and text response
                }
            };
            
            console.log('📤 Requesting audio response from Grok (response.create)');
            console.log('📋 response.create message:', JSON.stringify(responseMessage, null, 2));
            
            try {
                this.ws.send(JSON.stringify(responseMessage));
                console.log('✅ response.create sent - Grok will now generate audio response');
            } catch (error) {
                console.error('❌ Error sending response.create:', error);
            }
        }, 500); // 500ms delay after commit (same as TTS mode)
    }

    /**
     * Handle WebSocket messages from Grok
     */
    handleWebSocketMessage(event) {
        try {
            console.log('🔍 handleWebSocketMessage called');
            console.log('🔍 Event data type:', typeof event.data);
            console.log('🔍 Event data constructor:', event.data?.constructor?.name);
            
            // Handle binary audio (PCM) - Grok sends audio as raw binary!
            // Browser WebSocket receives binary as Blob
            if (event.data instanceof Blob) {
                console.log('📦 Received binary Blob audio data, size:', event.data.size, 'bytes');
                console.log('📦 Calling handleBinaryMessage with Blob...');
                this.handleBinaryMessage(event.data);
                return;
            }
            
            // Handle ArrayBuffer (shouldn't happen with browser WebSocket, but handle it)
            if (event.data instanceof ArrayBuffer) {
                console.log('📦 Received binary ArrayBuffer audio data, size:', event.data.byteLength, 'bytes');
                const blob = new Blob([event.data]);
                this.handleBinaryMessage(blob);
                return;
            }
            
            // Check if it's a binary string (base64 encoded)
            if (typeof event.data === 'string' && event.data.length > 0) {
                // Try to detect if it's base64 binary data
                const firstChar = event.data[0];
                if (firstChar !== '{' && firstChar !== '[') {
                    // Might be base64 encoded binary
                    console.log('⚠️ Received string that might be base64 binary, length:', event.data.length);
                    // Try to decode as base64
                    try {
                        const binaryString = atob(event.data);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        const blob = new Blob([bytes.buffer]);
                        console.log('✅ Decoded base64 to binary, size:', blob.size, 'bytes');
                        this.handleBinaryMessage(blob);
                        return;
                    } catch (e) {
                        console.log('⚠️ Not base64, treating as JSON string');
                    }
                }
            }
            
            // Handle JSON messages
            if (typeof event.data === 'string') {
                try {
                    const message = JSON.parse(event.data);
                    console.log('📥 WebSocket message type:', message.type);
                    // Log ALL messages for debugging
                    if (message.type && !message.type.includes('delta')) {
                        console.log('📋 Full message:', JSON.stringify(message, null, 2));
                    }
                    
                    try {
                        switch (message.type) {
                        case 'session.created':
                            this.sessionId = message.session_id;
                            console.log('✅ Session created:', this.sessionId);
                            console.log('📋 Full session.created message:', JSON.stringify(message, null, 2));
                            // Re-send session config to ensure Ara voice is set
                            setTimeout(() => {
                                this.sendSessionConfig();
                            }, 100);
                            break;
                        
                        case 'session.updated':
                            console.log('✅ Session updated');
                            console.log('📋 Full session.updated message:', JSON.stringify(message, null, 2));
                            
                            // Resolve pending session config promise if waiting
                            if (this.pendingSessionConfig) {
                                clearTimeout(this.pendingSessionConfig.timeout);
                                this.pendingSessionConfig.resolve();
                                this.pendingSessionConfig = null;
                                console.log('✅ Session config promise resolved');
                            }
                            
                            // Verify voice is set correctly (if provided in response)
                            if (message.session) {
                                const voice = message.session.voice || 'unknown';
                                console.log('✅ Voice confirmed in session:', voice);
                                if (voice && voice.toLowerCase() !== 'ara') {
                                    console.warn('⚠️ WARNING: Voice in response is not Ara! Current voice:', voice);
                                    console.warn('⚠️ However, we sent voice: "ara" in config, so Ara should be active');
                                } else {
                                    console.log('✅ Ara voice confirmed active!');
                                }
                            } else {
                                // No session data in response - this is normal, Grok doesn't always echo back
                                console.log('✅ Session updated received (no session data in response - this is normal)');
                            }
                            break;
                        
                        case 'response.output_audio.delta':
                            // CORRECT message type (Grok only sends this, NOT response.audio.delta)
                            console.log('🎵🎵🎵 AUDIO CHUNK RECEIVED: response.output_audio.delta 🎵🎵🎵');
                            if (message.delta) {
                                console.log('📥 Audio chunk delta length:', message.delta.length, 'characters (base64)');
                                console.log('📥 Estimated audio bytes:', Math.floor(message.delta.length * 3 / 4));
                                console.log('📥 Calling playAudioChunk...');
                                this.playAudioChunk(message.delta);
                                console.log('✅ playAudioChunk called successfully');
                            } else {
                                console.warn('⚠️ response.output_audio.delta received but no delta data');
                            }
                            break;
                            
                        case 'response.audio.done':
                        case 'response.output_audio.done':
                            console.log('✅ Audio response complete');
                            console.log('📋 Full message:', JSON.stringify(message, null, 2));
                            // Don't set isSpeaking to false here - let the queue finish
                            // The queue processor will set it to false when done
                            break;
                            
                        case 'response.create':
                            console.log('🎬🎬🎬 response.create CONFIRMATION received from Grok! 🎬🎬🎬');
                            console.log('📋 Full response.create message:', JSON.stringify(message, null, 2));
                            console.log('✅ Grok is now generating audio response...');
                            if (message.response) {
                                console.log('📋 Response ID:', message.response.id || 'no ID');
                                console.log('📋 Response status:', message.response.status || 'no status');
                                console.log('📋 Response modalities:', message.response.modalities || 'no modalities');
                            }
                            break;
                        
                        case 'response.output_item.added':
                        case 'response.output_item.done':
                            console.log('📋 Response output item:', message.type);
                            console.log('📋 Full message:', JSON.stringify(message, null, 2));
                            break;
                            
                        case 'response.done':
                            console.log('✅ Response complete (response.done)');
                            console.log('📋 Full response.done message:', JSON.stringify(message, null, 2));
                            break;
                            
                        case 'response.output_item.added':
                            console.log('📋 response.output_item.added:', JSON.stringify(message, null, 2));
                            break;
                            
                        case 'response.output_item.done':
                            console.log('📋 response.output_item.done:', JSON.stringify(message, null, 2));
                            break;
                            
                        case 'response.output_audio_transcript.delta':
                            // Text transcript chunk (streaming) - CORRECT message type!
                            console.log('📝 Transcript delta received');
                            if (message.delta && this.onTranscriptCallback) {
                                this.onTranscriptCallback({
                                    interim: message.delta,
                                    final: '',
                                    isFinal: false
                                });
                            }
                            break;
                            
                        case 'response.output_audio_transcript.done':
                            // Final transcript - CORRECT message type!
                            console.log('📝 Transcript complete');
                            if (message.transcript && this.onTranscriptCallback) {
                                console.log('📝 Transcript complete:', message.transcript);
                                this.onTranscriptCallback({
                                    interim: '',
                                    final: message.transcript,
                                    isFinal: true
                                });
                            }
                            break;
                            
                        case 'response.text.delta':
                            // Text transcript chunk (streaming) - Working implementation uses this!
                            console.log('📝 Transcript delta received (response.text.delta)');
                            if (message.delta && this.onTranscriptCallback) {
                                this.onTranscriptCallback({
                                    interim: message.delta,
                                    final: '',
                                    isFinal: false
                                });
                            }
                            break;
                            
                        case 'response.text.done':
                            // Final transcript - Working implementation uses this!
                            console.log('📝 Transcript complete (response.text.done)');
                            if (message.text && this.onTranscriptCallback) {
                                console.log('📝 Transcript complete:', message.text);
                                this.onTranscriptCallback({
                                    interim: '',
                                    final: message.text,
                                    isFinal: true
                                });
                            }
                            break;
                            
                        case 'response.done':
                            // Entire response (audio + text) is complete
                            console.log('✅ Response complete (response.done)');
                            // Wait for audio queue to finish
                            setTimeout(() => {
                                if (this.audioQueue.length === 0 && !this.isPlayingQueue) {
                                    this.isSpeaking = false;
                                }
                            }, 500);
                            break;
                            
                        case 'conversation.item.created':
                            console.log('✅✅✅ CONVERSATION ITEM CREATED ✅✅✅');
                            console.log('📋 Item ID:', message.item?.id || 'no ID');
                            console.log('📋 Item type:', message.item?.type || 'no type');
                            console.log('📋 Full message:', JSON.stringify(message, null, 2));
                            console.log('✅ This confirms Grok received the text message!');
                            break;
                            
                        case 'error':
                            console.error('❌❌❌ GROK VOICE API ERROR ❌❌❌');
                            console.error('❌ Error type:', message.type);
                            console.error('❌ Error code:', message.error?.code || 'no code');
                            console.error('❌ Error message:', message.error?.message || message.error || 'no message');
                            console.error('❌ Full error message:', JSON.stringify(message, null, 2));
                            if (this.onErrorCallback) {
                                this.onErrorCallback(message.error?.message || message.error || 'Grok Voice API error');
                            }
                            break;
                            
                        case 'ping':
                            // Ping messages are keepalive - ignore them silently
                            // Don't log every ping to reduce noise
                            break;
                            
                        default:
                            console.log('⚠️ Unhandled message type:', message.type);
                            console.log('📋 Full unhandled message:', JSON.stringify(message, null, 2));
                    }
                    } catch (switchError) {
                        console.error('❌ Error handling message type:', switchError);
                        console.error('❌ Message type was:', message.type);
                    }
                } catch (parseError) {
                    console.error('❌ Error parsing WebSocket message as JSON:', parseError);
                    console.error('❌ Event data:', event.data);
                }
            }
        } catch (error) {
            console.error('❌ Fatal error in handleWebSocketMessage:', error);
            console.error('❌ Error stack:', error.stack);
        }
    }

    /**
     * Handle binary audio messages
     */
    async handleBinaryMessage(blob) {
        try {
            console.log('🎵 Processing binary audio data, blob size:', blob.size, 'bytes');
            
            // Read Blob as ArrayBuffer (raw PCM data)
            const arrayBuffer = await blob.arrayBuffer();
            
            console.log('🎵 ArrayBuffer size:', arrayBuffer.byteLength, 'bytes');
            console.log('🎵 This should be PCM Int16 audio data (24kHz, mono)');
            
            // Convert ArrayBuffer directly to Int16Array (PCM)
            if (arrayBuffer.byteLength % 2 !== 0) {
                // Pad with zero if odd length
                console.log('⚠️ Odd byte length, padding...');
                const paddedBuffer = new ArrayBuffer(arrayBuffer.byteLength + 1);
                new Uint8Array(paddedBuffer).set(new Uint8Array(arrayBuffer));
                this.playAudioFromBuffer(paddedBuffer);
            } else {
                this.playAudioFromBuffer(arrayBuffer);
            }
        } catch (error) {
            console.error('❌ Error handling binary message:', error);
        }
    }

    /**
     * Add audio buffer to queue and process queue
     */
    playAudioFromBuffer(arrayBuffer) {
        console.log('🔊 Adding audio buffer to queue, size:', arrayBuffer.byteLength, 'bytes');
        console.log('🔊 Estimated samples:', arrayBuffer.byteLength / 2, '(Int16 PCM)');
        console.log('🔊 Estimated duration:', (arrayBuffer.byteLength / 2) / 24000, 'seconds (at 24kHz)');
        
        // Add to queue
        this.audioQueue.push(arrayBuffer);
        
        // Start processing queue if not already processing
        if (!this.isPlayingQueue) {
            console.log('🎵 Starting audio queue processing...');
            this.processAudioQueue();
        } else {
            console.log('⏳ Audio queue already processing, added to queue (queue length:', this.audioQueue.length, ')');
        }
    }

    /**
     * Stop all audio playback
     */
    stopAudio() {
        console.log('🛑 Stopping Grok Voice audio playback...');
        
        // Stop all active audio sources
        if (this.currentAudioSources && this.currentAudioSources.length > 0) {
            this.currentAudioSources.forEach(sourceRef => {
                if (!sourceRef.stopped && sourceRef.source) {
                    try {
                        sourceRef.source.stop();
                        sourceRef.stopped = true;
                    } catch (error) {
                        // Source may have already ended or not started yet
                        console.log('Audio source stop error (may already be stopped):', error.message);
                    }
                }
            });
            this.currentAudioSources = [];
        }
        
        // Clear audio queue
        this.audioQueue = [];
        this.isPlayingQueue = false;
        this.isSpeaking = false;
        this.nextPlayTime = 0;
        
        console.log('✅ Grok Voice audio stopped');
    }

    /**
     * Process audio queue for smooth playback
     */
    async processAudioQueue() {
        if (this.isPlayingQueue || this.audioQueue.length === 0) {
            return;
        }

        this.isPlayingQueue = true;
        this.isSpeaking = true;

        try {
            // Ensure audio context exists
            if (!this.audioContext) {
                console.error('❌ AudioContext not initialized! Creating now...');
                try {
                    this.audioContext = new AudioContext({ sampleRate: 24000 });
                } catch (error) {
                    this.audioContext = new AudioContext();
                }
            }
            
            // Ensure audio context is running
            if (this.audioContext.state === 'suspended') {
                console.log('⏸️ AudioContext suspended, resuming...');
                await this.audioContext.resume();
                console.log('✅ AudioContext resumed, state:', this.audioContext.state);
            }
            
            if (this.audioContext.state === 'closed') {
                console.error('❌ AudioContext is closed! Cannot play audio.');
                this.isPlayingQueue = false;
                this.isSpeaking = false;
                return;
            }

            while (this.audioQueue.length > 0) {
                const arrayBuffer = this.audioQueue.shift();
                
                if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                    continue;
                }

                // Ensure buffer length is even (Int16 needs 2 bytes per sample)
                let buffer = arrayBuffer;
                if (buffer.byteLength % 2 !== 0) {
                    const paddedBuffer = new ArrayBuffer(buffer.byteLength + 1);
                    new Uint8Array(paddedBuffer).set(new Uint8Array(buffer));
                    buffer = paddedBuffer;
                }

                // Convert ArrayBuffer to Int16Array (PCM)
                const pcmData = new Int16Array(buffer);
                
                if (pcmData.length === 0) {
                    continue;
                }
                
                // Convert Int16Array to Float32Array for Web Audio API
                const floatData = new Float32Array(pcmData.length);
                for (let i = 0; i < pcmData.length; i++) {
                    // Normalize: Int16 [-32768, 32767] → Float32 [-1.0, 1.0]
                    floatData[i] = Math.max(-1.0, Math.min(1.0, pcmData[i] / 32768.0));
                }
                
                // Grok Voice API sends audio at 24kHz
                const grokSampleRate = 24000;
                const audioContextSampleRate = this.audioContext.sampleRate;
                
                let audioBuffer;
                let finalFloatData = floatData;
                
                // If sample rates differ, we need to resample
                if (Math.abs(audioContextSampleRate - grokSampleRate) > 100) {
                    // Resample from 24kHz to AudioContext sample rate
                    const ratio = audioContextSampleRate / grokSampleRate;
                    const newLength = Math.round(floatData.length * ratio);
                    finalFloatData = new Float32Array(newLength);
                    
                    // Simple linear interpolation resampling
                    for (let i = 0; i < newLength; i++) {
                        const srcIndex = i / ratio;
                        const srcIndexFloor = Math.floor(srcIndex);
                        const srcIndexCeil = Math.min(srcIndexFloor + 1, floatData.length - 1);
                        const t = srcIndex - srcIndexFloor;
                        
                        if (srcIndexFloor < floatData.length) {
                            finalFloatData[i] = floatData[srcIndexFloor] * (1 - t) + floatData[srcIndexCeil] * t;
                        }
                    }
                    
                    console.log(`Resampled audio: ${grokSampleRate}Hz → ${audioContextSampleRate}Hz (${floatData.length} → ${finalFloatData.length} samples)`);
                }
                
                // Create audio buffer at AudioContext sample rate
                audioBuffer = this.audioContext.createBuffer(1, finalFloatData.length, audioContextSampleRate);
                const channelData = audioBuffer.getChannelData(0);
                channelData.set(finalFloatData);
                
                // Schedule playback for gapless audio
                const now = this.audioContext.currentTime;
                let startTime = Math.max(now, this.nextPlayTime);
                
                // Small delay to prevent clicks
                if (startTime <= now + 0.005) {
                    startTime = now + 0.005; // 5ms delay
                }
                
                console.log('🔊 Scheduling audio playback:', {
                    samples: finalFloatData.length,
                    duration: audioBuffer.duration.toFixed(3) + 's',
                    startTime: startTime.toFixed(3),
                    sampleRate: audioContextSampleRate
                });
                
                // Play audio
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.audioContext.destination);
                
                // Store source reference so we can stop it if needed
                this.currentAudioSources = this.currentAudioSources || [];
                const sourceRef = { source: source, stopped: false };
                this.currentAudioSources.push(sourceRef);
                
                // Wait for this chunk to finish before playing next
                await new Promise((resolve) => {
                    source.onended = () => {
                        sourceRef.stopped = true;
                        // Remove from sources array
                        const index = this.currentAudioSources.indexOf(sourceRef);
                        if (index > -1) {
                            this.currentAudioSources.splice(index, 1);
                        }
                        console.log('✅ Audio chunk finished playing');
                        resolve();
                    };
                    
                    try {
                        source.start(startTime);
                        console.log('▶️ Audio chunk started playing');
                    } catch (error) {
                        console.error('❌ Error starting audio source:', error);
                        sourceRef.stopped = true;
                        resolve();
                    }
                    
                    // Update next play time for gapless playback
                    this.nextPlayTime = startTime + audioBuffer.duration;
                });
            }
        } catch (error) {
            console.error('Error processing audio queue:', error);
        } finally {
            this.isPlayingQueue = false;
            if (this.audioQueue.length === 0) {
                this.isSpeaking = false;
            }
        }
    }

    /**
     * Play audio chunk from base64
     */
    async playAudioChunk(base64Audio) {
        try {
            console.log('🔊 playAudioChunk called');
            console.log('🔊 Base64 audio length:', base64Audio?.length || 0);
            
            if (!base64Audio || base64Audio.length === 0) {
                console.warn('⚠️ Empty base64 audio, skipping');
                return;
            }
            
            // Ensure audio context is initialized
            if (!this.audioContext) {
                console.warn('⚠️ Audio context not initialized, creating new one');
                try {
                    this.audioContext = new AudioContext({ sampleRate: 24000 });
                    console.log('✅ AudioContext created');
                } catch (error) {
                    console.error('❌ Failed to create AudioContext:', error);
                    this.audioContext = new AudioContext();
                }
            }
            
            console.log('🔊 AudioContext state:', this.audioContext.state);
            
            // Resume audio context if suspended (browser autoplay policy)
            if (this.audioContext.state === 'suspended') {
                console.log('⏸️ AudioContext suspended, resuming...');
                await this.audioContext.resume();
                console.log('✅ AudioContext resumed, state:', this.audioContext.state);
            }
            
            if (this.audioContext.state === 'closed') {
                console.error('❌ AudioContext is closed! Cannot play audio.');
                return;
            }
            
            // Convert base64 to ArrayBuffer
            console.log('🔊 Converting base64 to ArrayBuffer...');
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            console.log('🔊 Converted to ArrayBuffer, size:', bytes.buffer.byteLength, 'bytes');
            console.log('🔊 Calling playAudioFromBuffer...');
            
            // Play from buffer
            this.playAudioFromBuffer(bytes.buffer);
            
            console.log('✅ playAudioChunk completed');
        } catch (error) {
            console.error('❌ Error playing audio chunk:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
            console.error('❌ Base64 length:', base64Audio?.length);
        }
    }

    /**
     * Start voice conversation
     */
    async startVoiceConversation(onTranscript, onError) {
        if (this.isRecording) {
            console.warn('Already recording, stopping previous session first');
            await this.stopVoiceConversation();
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        this.onTranscriptCallback = onTranscript;
        this.onErrorCallback = onError;
        
        try {
            // Initialize if needed
            if (!this.mediaStream || !this.audioContext) {
                await this.initialize();
            }
            
            // Connect WebSocket first
            await this.connectWebSocket();
            
            // Wait for session to be configured
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Start recording audio
            await this.startAudioRecording();
            
            this.isRecording = true;
            console.log('✅ Voice conversation started');
            
            return true;
        } catch (error) {
            console.error('Failed to start voice conversation:', error);
            this.isRecording = false;
            if (onError) onError(error.message || 'Failed to start voice conversation');
            return false;
        }
    }

    /**
     * Stop voice conversation
     */
    async stopVoiceConversation() {
        if (!this.isRecording && !this.ws) {
            return false;
        }

        try {
            console.log('Stopping voice conversation...');
            
            // Commit any pending audio buffer BEFORE stopping
            this.commitAudioBuffer();
            
            // Wait a moment for commit to be sent
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Stop audio processor
            if (this.processor) {
                this.processor.disconnect();
                this.processor = null;
            }
            
            // Stop media stream tracks
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => {
                    track.stop();
                });
            }

            // Close WebSocket after a delay to allow responses
            setTimeout(() => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.close();
                }
                this.ws = null;
            }, 2000); // Wait 2 seconds for Grok to respond

            this.isRecording = false;
            this.isSpeaking = false;
            this.nextPlayTime = 0;
            
            console.log('✅ Voice conversation stopped');
            return true;
        } catch (error) {
            console.error('Failed to stop voice conversation:', error);
            this.isRecording = false;
            return false;
        }
    }
}

