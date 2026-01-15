/**
 * Backend Test Script for Agent Enhancements
 * Tests embeddings, relationship detection, memory storage, and integration
 */

require('dotenv').config();
const { getRedisService } = require('../services/redis-service');

// Import agent components
const EmbeddingService = require('../js/agent/services/EmbeddingService');
const SemanticAnalyzer = require('../js/agent/relationship/SemanticAnalyzer');
const RelationshipDetector = require('../js/agent/relationship/RelationshipDetector');
const PermanentMemory = require('../js/agent/memory/PermanentMemory');
const AgentCommunicationSystem = require('../js/agent/AgentCommunicationSystem');

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${name}${message ? ' - ' + message : ''}`);
    testResults.tests.push({ name, passed, message });
    if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
}

async function testEmbeddingService() {
    console.log('\n📦 Testing EmbeddingService...\n');
    
    try {
        // Test 1: Service initialization
        const embeddingService = new EmbeddingService({
            provider: 'openai',
            model: 'text-embedding-3-small',
            apiKey: process.env.OPENAI_API_KEY
        });
        
        const isAvailable = embeddingService.isAvailable();
        logTest('EmbeddingService initialization', isAvailable, 
            isAvailable ? 'Service available' : 'Service not available (check OPENAI_API_KEY)');
        
        if (!isAvailable) {
            console.log('⚠️  Skipping embedding tests - service not available\n');
            return false;
        }
        
        // Test 2: Generate embedding
        try {
            const text1 = 'Starlink pricing';
            const embedding1 = await embeddingService.generateEmbedding(text1);
            logTest('Generate embedding', Array.isArray(embedding1) && embedding1.length > 0,
                `Generated ${embedding1.length} dimensions`);
        } catch (error) {
            logTest('Generate embedding', false, error.message);
        }
        
        // Test 3: Cache functionality
        try {
            const text = 'Test cache';
            const start1 = Date.now();
            const emb1 = await embeddingService.generateEmbedding(text);
            const time1 = Date.now() - start1;
            
            const start2 = Date.now();
            const emb2 = await embeddingService.generateEmbedding(text);
            const time2 = Date.now() - start2;
            
            const cacheWorking = time2 < time1 && JSON.stringify(emb1) === JSON.stringify(emb2);
            logTest('Embedding cache', cacheWorking,
                `First: ${time1}ms, Second: ${time2}ms (cached)`);
        } catch (error) {
            logTest('Embedding cache', false, error.message);
        }
        
        // Test 4: Semantic similarity
        try {
            const text1 = 'Starlink pricing';
            const text2 = 'satellite internet costs';
            const text3 = 'completely different topic';
            
            const emb1 = await embeddingService.generateEmbedding(text1);
            const emb2 = await embeddingService.generateEmbedding(text2);
            const emb3 = await embeddingService.generateEmbedding(text3);
            
            const sim12 = embeddingService.calculateSimilarity(emb1, emb2);
            const sim13 = embeddingService.calculateSimilarity(emb1, emb3);
            
            const similarityWorks = sim12 > sim13 && sim12 > 0.5;
            logTest('Semantic similarity', similarityWorks,
                `Similar: ${sim12.toFixed(3)}, Different: ${sim13.toFixed(3)}`);
        } catch (error) {
            logTest('Semantic similarity', false, error.message);
        }
        
        // Test 5: Cache stats
        try {
            const stats = embeddingService.getCacheStats();
            logTest('Cache stats', typeof stats.size === 'number',
                `Cache size: ${stats.size}/${stats.maxSize}`);
        } catch (error) {
            logTest('Cache stats', false, error.message);
        }
        
        return true;
    } catch (error) {
        logTest('EmbeddingService tests', false, error.message);
        return false;
    }
}

async function testSemanticAnalyzer() {
    console.log('\n🔍 Testing SemanticAnalyzer...\n');
    
    try {
        const embeddingService = new EmbeddingService({
            provider: 'openai',
            apiKey: process.env.OPENAI_API_KEY
        });
        
        const semanticAnalyzer = new SemanticAnalyzer(embeddingService);
        
        // Test 1: Similarity with embeddings
        try {
            const text1 = 'Starlink pricing';
            const text2 = 'satellite internet costs';
            const similarity = await semanticAnalyzer.calculateSimilarity(text1, text2);
            
            logTest('Semantic similarity (with embeddings)', 
                typeof similarity === 'number' && similarity >= 0 && similarity <= 1,
                `Similarity: ${similarity.toFixed(3)}`);
        } catch (error) {
            logTest('Semantic similarity (with embeddings)', false, error.message);
        }
        
        // Test 2: Fallback to Jaccard
        try {
            const analyzerNoEmbeddings = new SemanticAnalyzer(null);
            const similarity = await analyzerNoEmbeddings.calculateSimilarity('test', 'test');
            
            logTest('Jaccard fallback', 
                typeof similarity === 'number' && similarity >= 0 && similarity <= 1,
                `Jaccard similarity: ${similarity.toFixed(3)}`);
        } catch (error) {
            logTest('Jaccard fallback', false, error.message);
        }
        
        // Test 3: Topic extraction
        try {
            const topics = semanticAnalyzer.extractTopics('Starlink pricing and launch volume');
            logTest('Topic extraction', 
                Array.isArray(topics) && topics.length > 0,
                `Topics: ${topics.join(', ')}`);
        } catch (error) {
            logTest('Topic extraction', false, error.message);
        }
        
        // Test 4: Contradiction detection
        try {
            const text1 = 'Starlink is profitable';
            const text2 = 'Starlink is not profitable';
            const contradicts = await semanticAnalyzer.detectsContradiction(text1, text2);
            
            logTest('Contradiction detection', 
                typeof contradicts === 'boolean',
                `Detected contradiction: ${contradicts}`);
        } catch (error) {
            logTest('Contradiction detection', false, error.message);
        }
        
        return true;
    } catch (error) {
        logTest('SemanticAnalyzer tests', false, error.message);
        return false;
    }
}

async function testRelationshipDetector() {
    console.log('\n🔗 Testing RelationshipDetector...\n');
    
    try {
        const redisService = getRedisService();
        const embeddingService = new EmbeddingService({
            provider: 'openai',
            apiKey: process.env.OPENAI_API_KEY
        });
        
        const relationshipDetector = new RelationshipDetector(redisService, embeddingService);
        
        // Test 1: First interaction
        try {
            const relationship = await relationshipDetector.detectRelationship('Hello', {
                currentSentence: null,
                recentTurns: [],
                fullHistory: [],
                isFirstInteraction: true
            });
            
            logTest('First interaction detection', 
                relationship.category === 9,
                `Category: ${relationship.category}, Confidence: ${relationship.confidence.toFixed(2)}`);
        } catch (error) {
            logTest('First interaction detection', false, error.message);
        }
        
        // Test 2: Direct continuation
        try {
            const relationship = await relationshipDetector.detectRelationship('Tell me more about that', {
                currentSentence: 'Starlink pricing is $99 per month',
                recentTurns: [],
                fullHistory: [],
                isFirstInteraction: false
            });
            
            logTest('Direct continuation detection', 
                relationship.category >= 1 && relationship.category <= 9,
                `Category: ${relationship.category}, Confidence: ${relationship.confidence.toFixed(2)}`);
        } catch (error) {
            logTest('Direct continuation detection', false, error.message);
        }
        
        // Test 3: Topic shift
        try {
            const relationship = await relationshipDetector.detectRelationship('What about Mars transport?', {
                currentSentence: 'Starlink pricing is $99 per month',
                recentTurns: [],
                fullHistory: [],
                isFirstInteraction: false
            });
            
            logTest('Topic shift detection', 
                relationship.category >= 1 && relationship.category <= 9,
                `Category: ${relationship.category}, Similarity: ${relationship.similarity?.toFixed(3) || 'N/A'}`);
        } catch (error) {
            logTest('Topic shift detection', false, error.message);
        }
        
        return true;
    } catch (error) {
        logTest('RelationshipDetector tests', false, error.message);
        return false;
    }
}

async function testPermanentMemory() {
    console.log('\n💾 Testing PermanentMemory...\n');
    
    try {
        const redisService = getRedisService();
        
        if (!redisService.isReady()) {
            console.log('⚠️  Redis not ready, attempting connection...');
            await redisService.connect();
        }
        
        if (!redisService.isReady()) {
            logTest('Redis connection', false, 'Redis not available');
            return false;
        }
        
        logTest('Redis connection', true, 'Redis connected');
        
        const embeddingService = new EmbeddingService({
            provider: 'openai',
            apiKey: process.env.OPENAI_API_KEY
        });
        
        const memory = new PermanentMemory(redisService, null, embeddingService, null);
        
        // Test 1: Save interaction
        try {
            const interaction = {
                input: 'Tell me about Starlink',
                response: 'Starlink is SpaceX satellite internet service',
                relationship: 1,
                patterns: [],
                timestamp: Date.now(),
                sessionId: 'test-session',
                userId: null
            };
            
            const saved = await memory.saveInteraction(interaction);
            logTest('Save interaction', saved, 'Interaction saved');
        } catch (error) {
            logTest('Save interaction', false, error.message);
        }
        
        // Test 2: Load history
        try {
            const history = await memory.loadAllHistory(10);
            const hasHistory = Array.isArray(history) || (history.recent && Array.isArray(history.recent));
            logTest('Load history', hasHistory, 
                hasHistory ? `Loaded ${Array.isArray(history) ? history.length : history.recent?.length || 0} interactions` : 'No history');
        } catch (error) {
            logTest('Load history', false, error.message);
        }
        
        // Test 3: Check embeddings in saved interaction
        try {
            const history = await memory.loadAllHistory(1);
            const recent = Array.isArray(history) ? history : (history.recent || []);
            
            if (recent.length > 0) {
                const interaction = recent[0];
                const hasEmbedding = !!interaction.semantics?.embedding;
                logTest('Embedding storage', hasEmbedding,
                    hasEmbedding ? `Embedding dimensions: ${interaction.semantics.embedding.length}` : 'No embedding found');
            } else {
                logTest('Embedding storage', false, 'No interactions to check');
            }
        } catch (error) {
            logTest('Embedding storage', false, error.message);
        }
        
        // Test 4: Pattern detection
        try {
            const patterns = await memory.detectPatterns();
            logTest('Pattern detection', 
                typeof patterns === 'object',
                `Patterns detected: ${Object.keys(patterns).length}`);
        } catch (error) {
            logTest('Pattern detection', false, error.message);
        }
        
        return true;
    } catch (error) {
        logTest('PermanentMemory tests', false, error.message);
        return false;
    }
}

async function testAgentCommunicationSystem() {
    console.log('\n🤖 Testing AgentCommunicationSystem...\n');
    
    try {
        const redisService = getRedisService();
        
        if (!redisService.isReady()) {
            await redisService.connect();
        }
        
        if (!redisService.isReady()) {
            logTest('AgentCommunicationSystem initialization', false, 'Redis not available');
            return false;
        }
        
        // Mock voice service
        const mockVoiceService = {
            stop: () => Promise.resolve(),
            speak: () => Promise.resolve()
        };
        
        const embeddingService = new EmbeddingService({
            provider: 'openai',
            apiKey: process.env.OPENAI_API_KEY
        });
        
        const agentSystem = new AgentCommunicationSystem(
            redisService,
            mockVoiceService,
            null,
            {
                enableEmbeddings: true,
                embeddingConfig: {
                    provider: 'openai',
                    apiKey: process.env.OPENAI_API_KEY
                }
            }
        );
        
        logTest('AgentCommunicationSystem initialization', true, 'System initialized');
        
        // Test 1: Process input
        try {
            const result = await agentSystem.processInput('Hello, tell me about Starlink', {
                stockInfo: { ticker: 'SPACE' }
            });
            
            logTest('Process input', 
                result !== null && result.relationship !== undefined,
                `Relationship category: ${result?.relationship?.category || 'N/A'}`);
        } catch (error) {
            logTest('Process input', false, error.message);
        }
        
        // Test 2: Save interaction
        try {
            const relationship = {
                category: 1,
                confidence: 0.9,
                similarity: 0.8,
                transitionPhrase: 'Continuing'
            };
            
            const saved = await agentSystem.saveInteraction(
                'Tell me about Starlink',
                'Starlink is SpaceX satellite internet service',
                relationship,
                []
            );
            
            logTest('Save interaction via AgentSystem', saved, 'Interaction saved');
        } catch (error) {
            logTest('Save interaction via AgentSystem', false, error.message);
        }
        
        return true;
    } catch (error) {
        logTest('AgentCommunicationSystem tests', false, error.message);
        return false;
    }
}

async function testIntegration() {
    console.log('\n🔗 Testing Integration Flow...\n');
    
    try {
        const redisService = getRedisService();
        
        if (!redisService.isReady()) {
            await redisService.connect();
        }
        
        if (!redisService.isReady()) {
            logTest('Integration test', false, 'Redis not available');
            return false;
        }
        
        const embeddingService = new EmbeddingService({
            provider: 'openai',
            apiKey: process.env.OPENAI_API_KEY
        });
        
        if (!embeddingService.isAvailable()) {
            logTest('Integration test', false, 'Embedding service not available');
            return false;
        }
        
        // Full flow test
        try {
            const relationshipDetector = new RelationshipDetector(redisService, embeddingService);
            const memory = new PermanentMemory(redisService, null, embeddingService, null);
            
            // Step 1: Detect relationship
            const relationship = await relationshipDetector.detectRelationship('Tell me about Starlink pricing', {
                currentSentence: null,
                recentTurns: [],
                fullHistory: [],
                isFirstInteraction: true
            });
            
            logTest('Integration: Relationship detection', 
                relationship.category === 9,
                `Category: ${relationship.category}`);
            
            // Step 2: Save interaction
            const saved = await memory.saveInteraction({
                input: 'Tell me about Starlink pricing',
                response: 'Starlink pricing is $99 per month for residential service',
                relationship: relationship.category,
                patterns: [],
                timestamp: Date.now(),
                sessionId: 'integration-test',
                userId: null
            });
            
            logTest('Integration: Save interaction', saved, 'Saved');
            
            // Step 3: Load and verify
            const history = await memory.loadAllHistory(1);
            const recent = Array.isArray(history) ? history : (history.recent || []);
            
            if (recent.length > 0) {
                const interaction = recent[0];
                const hasEmbedding = !!interaction.semantics?.embedding;
                logTest('Integration: Verify embedding', hasEmbedding,
                    hasEmbedding ? 'Embedding found' : 'No embedding');
            }
            
            // Step 4: Detect relationship with history
            const relationship2 = await relationshipDetector.detectRelationship('What about business pricing?', {
                currentSentence: recent[0]?.response || null,
                recentTurns: recent,
                fullHistory: recent,
                isFirstInteraction: false
            });
            
            logTest('Integration: Relationship with history', 
                relationship2.category >= 1 && relationship2.category <= 9,
                `Category: ${relationship2.category}, Similarity: ${relationship2.similarity?.toFixed(3) || 'N/A'}`);
            
            return true;
        } catch (error) {
            logTest('Integration test', false, error.message);
            console.error('Integration error:', error);
            return false;
        }
    } catch (error) {
        logTest('Integration test', false, error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('🧪 Starting Backend Tests for Agent Enhancements\n');
    console.log('=' .repeat(60));
    
    // Check prerequisites
    console.log('\n📋 Checking Prerequisites...\n');
    
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    logTest('OPENAI_API_KEY configured', hasOpenAIKey,
        hasOpenAIKey ? 'Key found' : 'Key not found in .env');
    
    const redisService = getRedisService();
    const redisReady = redisService.isReady();
    logTest('Redis connection', redisReady,
        redisReady ? 'Connected' : 'Not connected (will attempt connection)');
    
    if (!redisReady) {
        try {
            await redisService.connect();
            logTest('Redis connection attempt', redisService.isReady(), 'Connection attempted');
        } catch (error) {
            console.log('⚠️  Redis connection failed:', error.message);
        }
    }
    
    // Run tests
    await testEmbeddingService();
    await testSemanticAnalyzer();
    await testRelationshipDetector();
    await testPermanentMemory();
    await testAgentCommunicationSystem();
    await testIntegration();
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Test Summary\n');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Total: ${testResults.passed + testResults.failed}`);
    console.log(`📊 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    // Failed tests details
    if (testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.tests
            .filter(t => !t.passed)
            .forEach(t => {
                console.log(`   - ${t.name}: ${t.message || 'No details'}`);
            });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Exit code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
});


