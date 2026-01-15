/**
 * Agent Communication System
 * Main orchestrator for agent communication with relationship detection,
 * interruption handling, and permanent memory
 */

const AgentStateManager = require('./state/AgentStateManager');
const RelationshipDetector = require('./relationship/RelationshipDetector');
const InterruptionManager = require('./interruption/InterruptionManager');
const PermanentMemory = require('./memory/PermanentMemory');

// Services (optional)
const EmbeddingService = require('./services/EmbeddingService');

// Analytics
const HistoryAnalytics = require('./analytics/HistoryAnalytics');

class AgentCommunicationSystem {
    constructor(redisService, voiceService, mongoClient = null, config = {}) {
        // Initialize core components
        this.redis = redisService;
        this.voiceService = voiceService;
        this.mongo = mongoClient;
        
        // Configuration
        this.config = {
            enableEmbeddings: config.enableEmbeddings !== false,
            enableSummarization: config.enableSummarization !== false,
            ...config
        };
        
        // Initialize services (optional - can be disabled)
        this.embeddingService = this.config.enableEmbeddings
            ? new EmbeddingService(config.embeddingConfig || {})
            : null;
        
        this.summarizationService = this.config.enableSummarization && config.llmService
            ? config.summarizationService || null
            : null;
        
        // Initialize core components with services
        this.state = new AgentStateManager(redisService);
        
        // Inject embedding service into relationship detector
        this.relationshipDetector = new RelationshipDetector(
            redisService,
            this.embeddingService
        );
        
        this.interruption = new InterruptionManager(redisService, voiceService);
        
        // Inject services into memory (including analytics)
        this.memory = new PermanentMemory(
            redisService,
            mongoClient,
            this.embeddingService,
            this.summarizationService,
            this.analytics
        );
        
        // Track current processing
        this.isProcessing = false;
        this.currentRequestId = null;
        
        // Initialize analytics
        this.analytics = new HistoryAnalytics(redisService);
        this.analytics.setSessionId(this.getSessionId());
        
        // Log initialization
        if (this.embeddingService && this.embeddingService.isAvailable()) {
            console.log('✅ Embedding service enabled');
        }
        if (this.summarizationService) {
            console.log('✅ Summarization service enabled');
        }
    }
    
    /**
     * Process input - main entry point
     * Handles interruption detection, relationship detection, and response generation
     */
    async processInput(input, context = {}) {
        if (this.isProcessing) {
            console.warn('⚠️ Already processing input, queuing...');
            // Could implement queue here
            return null;
        }
        
        this.isProcessing = true;
        this.currentRequestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Get current state
            const currentState = await this.state.getAll();
            const isSpeaking = currentState.isSpeaking || false;
            const currentSentence = currentState.currentSentence || null;
            const recentTurns = await this.state.getRecentTurns(5);
            
            // Load history for relationship detection
            const fullHistory = await this.memory.loadAllHistory(1000);
            
            // Check if interrupting current speech
            if (isSpeaking) {
                console.log('⏸️ Interrupting current speech...');
                await this.interruption.interruptMidSentence();
            }
            
            // Detect relationship (<1 second target)
            const relationshipStartTime = Date.now();
            const relationship = await this.relationshipDetector.detectRelationship(input, {
                currentSentence,
                recentTurns,
                fullHistory,
                currentStock: currentState.currentStock || null,
                newStock: context.stockInfo?.ticker || null,
                isFirstInteraction: recentTurns.length === 0
            });
            const relationshipTime = Date.now() - relationshipStartTime;
            console.log(`✅ Relationship detected (${relationshipTime}ms): Category ${relationship.category}, Confidence: ${relationship.confidence.toFixed(2)}`);
            
            // Track relationship detection
            this.analytics.trackRelationshipDetection(relationship, relationshipTime, {
                usedEmbeddings: this.embeddingService?.isAvailable() || false,
                fallbackUsed: !this.embeddingService?.isAvailable(),
                inputLength: input.length,
                historyLength: fullHistory.length
            });
            
            // Handle transition if interrupting
            if (isSpeaking && relationship.category !== 9) {
                await this.interruption.handleTransition(relationship, relationship.transitionPhrase);
            }
            
            // Update state
            await this.state.update({
                isSpeaking: false, // Will be set to true when response starts
                currentSentence: null, // Will be updated with response
                isWaitingForNewAudio: false,
                pendingStockRequest: null,
                firstAudioChunkReceived: false
            });
            
            // Return relationship info for response generation
            return {
                relationship,
                context: {
                    currentState,
                    recentTurns,
                    fullHistory: fullHistory.slice(-20) // Last 20 for context
                },
                requestId: this.currentRequestId
            };
            
        } catch (error) {
            console.error('❌ Error processing input:', error);
            return null;
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Save interaction after response is generated
     * Enhanced to store embeddings and relationship details
     */
    async saveInteraction(input, response, relationship, patterns = [], context = {}) {
        const saveStartTime = Date.now();
        
        try {
            // Extract topics if knowledge graph available (future enhancement)
            let topics = [];
            if (context.topics) {
                topics = context.topics;
            }
            
            await this.memory.saveInteraction({
                input,
                response,
                relationship: relationship.category,
                patterns,
                timestamp: Date.now(),
                sessionId: this.getSessionId(),
                userId: context.userId || null,
                semantics: {
                    topics: topics,
                    keywords: [] // Could extract keywords here
                },
                // Store full relationship object (not just category)
                relationship: {
                    category: relationship.category,
                    confidence: relationship.confidence || null,
                    similarity: relationship.similarity || null,
                    transitionPhrase: relationship.transitionPhrase || null,
                    graphContext: relationship.graphContext || null
                }
            });
            
            // Track memory operation
            const saveTime = Date.now() - saveStartTime;
            this.analytics.trackMemoryOperation('saveInteraction', saveTime, {
                hasEmbeddings: !!context.hasEmbeddings,
                patternsCount: patterns.length
            });
            
            // Track pattern detection if patterns exist
            if (patterns.length > 0) {
                this.analytics.trackPatternDetection(patterns, 0);
            }
            
            // Update state with recent turn
            await this.state.addRecentTurn({
                input,
                response,
                relationship: relationship.category
            });
            
            // Update current sentence
            await this.state.update({
                currentSentence: response,
                isSpeaking: true
            });
            
            return true;
        } catch (error) {
            console.error('❌ Error saving interaction:', error);
            return false;
        }
    }
    
    /**
     * Get session ID
     */
    getSessionId() {
        // Could be passed from context or generated
        return `session-${Date.now()}`;
    }
    
    /**
     * Initialize system
     */
    async initialize() {
        console.log('🚀 Initializing Agent Communication System...');
        
        // Ensure Redis is connected
        if (this.redis && !this.redis.isReady()) {
            await this.redis.connect();
        }
        
        // Load initial state from Redis
        const initialState = await this.state.getAll();
        console.log('✅ Agent Communication System initialized');
        console.log('   State:', initialState);
        
        return true;
    }
    
    /**
     * Get current state
     */
    async getCurrentState() {
        return await this.state.getAll();
    }
    
    /**
     * Reset state
     */
    async reset() {
        await this.state.reset();
        console.log('✅ Agent state reset');
    }
    
    /**
     * Get relationship detector (for external use)
     */
    getRelationshipDetector() {
        return this.relationshipDetector;
    }
    
    /**
     * Get memory (for external use)
     */
    getMemory() {
        return this.memory;
    }
}

module.exports = AgentCommunicationSystem;





