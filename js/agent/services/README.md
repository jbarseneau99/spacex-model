# Agent Services

Infrastructure services for the agent communication system.

## Services

### EmbeddingService
Generates vector embeddings for semantic similarity analysis.

**Usage:**
```javascript
const EmbeddingService = require('./services/EmbeddingService');

const embeddingService = new EmbeddingService({
    provider: 'openai',
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY
});

const embedding = await embeddingService.generateEmbedding('text to embed');
const similarity = embeddingService.calculateSimilarity(embedding1, embedding2);
```

**Features:**
- OpenAI API support
- Local model support (placeholder for future)
- Caching for performance
- Automatic fallback handling

### SummarizationService
Summarizes conversations for efficient storage.

**Usage:**
```javascript
const SummarizationService = require('./services/SummarizationService');

const summarizationService = new SummarizationService(llmService, {
    enabled: true,
    batchSize: 10,
    maxLength: 200
});

const summary = await summarizationService.summarizeTurn(interaction);
const batchSummary = await summarizationService.summarizeInteractions(interactions);
```

**Features:**
- Single turn summarization
- Batch summarization
- Configurable length
- LLM service abstraction

## Integration

Services are injected into core components via constructor:

```javascript
// In AgentCommunicationSystem
this.embeddingService = new EmbeddingService(config);
this.relationshipDetector = new RelationshipDetector(redisService, this.embeddingService);
this.memory = new PermanentMemory(redisService, mongoClient, this.embeddingService, this.summarizationService);
```

## Configuration

Services can be disabled via configuration:

```javascript
const agentSystem = new AgentCommunicationSystem(
    redisService,
    voiceService,
    mongoClient,
    {
        enableEmbeddings: false,  // Disable embeddings
        enableSummarization: false // Disable summarization
    }
);
```


