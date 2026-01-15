# History Functionality Data Collection

## Overview

The history system now collects comprehensive data on:
- Relationship detection patterns
- Embedding usage and performance
- Memory operations
- Similarity comparisons
- Pattern detection

## Data Collection

### Automatic Collection

Data is automatically collected during normal operation:

1. **Relationship Detection** - Every time a relationship is detected
2. **Embedding Usage** - Every embedding generation attempt
3. **Memory Operations** - Every save/load operation
4. **Pattern Detection** - When patterns are detected
5. **Similarity Comparisons** - When similarity is calculated

### Data Storage

All data is stored in Redis with 30-day expiration:
- `analytics:history:relationship:*` - Relationship detection data
- `analytics:history:embedding:*` - Embedding usage data
- `analytics:history:memory:*` - Memory operation data
- `analytics:history:pattern:*` - Pattern detection data
- `analytics:history:similarity:*` - Similarity comparison data

## Accessing Data

### Via API Endpoint

```bash
GET /api/agent/analytics/history
```

Returns current metrics summary.

### Via Collection Script

```bash
node scripts/collect-history-data.js
```

Exports comprehensive data to `data/history-analytics/history-data-{timestamp}.json`

## Metrics Collected

### Relationship Detection
- Category distribution (1-9)
- Confidence scores
- Similarity scores
- Detection timing
- Embedding usage vs fallback

### Embedding Usage
- Total attempts
- Success/failure rates
- Cache hit rates
- Fallback rates
- Generation timing

### Memory Operations
- Save/load operations
- Operation timing
- Embedding presence
- Pattern counts

### Similarity Comparisons
- Method used (embeddings vs Jaccard)
- Similarity scores
- Comparison timing

### Pattern Detection
- Patterns detected
- Pattern types
- Detection timing

## Circuit Breaker

The embedding service now includes a circuit breaker to prevent API spam:

- **Threshold**: 3 consecutive failures
- **Timeout**: 5 minutes
- **Behavior**: Automatically disables embedding API calls after threshold
- **Recovery**: Automatically resets after timeout

This prevents excessive API calls when quota is exceeded.

## Data Export Format

```json
{
  "analysis": {
    "summary": {
      "totalInteractions": 100,
      "totalRelationships": 100,
      "totalEmbeddings": 50,
      ...
    },
    "relationshipDistribution": {
      "distribution": { "1": 20, "2": 15, ... },
      "avgConfidence": 0.85,
      "avgSimilarity": 0.72,
      "avgTiming": "150ms"
    },
    "embeddingStats": {
      "total": 50,
      "successRate": "60%",
      "cacheHitRate": "30%",
      "fallbackRate": "40%"
    },
    "performanceStats": {
      "relationshipDetection": { "avg": "150ms", ... },
      "embeddingGeneration": { "avg": "300ms", ... },
      "memoryOperations": { "avg": "10ms", ... }
    }
  },
  "rawData": {
    "relationships": [...],
    "embeddings": [...],
    "memoryOps": [...],
    "patterns": [...],
    "similarities": [...],
    "interactions": [...]
  }
}
```

## Usage

### View Current Metrics

```bash
curl http://localhost:3333/api/agent/analytics/history
```

### Export Historical Data

```bash
node scripts/collect-history-data.js
```

### Analyze Exported Data

Data is exported to `data/history-analytics/` directory as JSON files.

## Integration

Analytics are automatically integrated into:
- `AgentCommunicationSystem` - Tracks relationship detection
- `PermanentMemory` - Tracks embedding usage and memory operations
- `RelationshipDetector` - Tracks relationship patterns

No additional configuration needed - data collection happens automatically!


