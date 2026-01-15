# Research Session Report Generator

## Overview

The Research Session Report Generator aggregates data from all agent systems to create comprehensive research session reports. It collects data from:

- **AgentCommunicationSystem** - Core interaction tracking
- **AgentStateManager** - Current state and recent turns
- **PermanentMemory** - Full interaction history and patterns
- **RelationshipDetector** - Relationship analysis between interactions
- **SessionAwareness** - Navigation and conversation tracking
- **Monitoring** - Performance metrics and errors

## Features

### Data Collection

The report generator collects:

1. **Session Data**
   - Session ID, start time, last activity
   - Duration, interaction counts
   - Navigation and conversation counts

2. **Interaction History**
   - Full conversation history (input/response pairs)
   - Timestamps and relationship categories
   - Pattern detection results

3. **Relationship Analysis**
   - Relationship categories (1-9) for each interaction
   - Confidence and similarity scores
   - Transition phrases
   - Statistical analysis

4. **Pattern Detection**
   - Recurring themes
   - Contradictions
   - Inferred chains

5. **Navigation Tracking**
   - View transitions
   - Navigation triggers
   - Time spent in views
   - Intent signals

6. **Conversation Tracking**
   - Message history
   - Context snapshots
   - Message classification

7. **Performance Metrics**
   - System health status
   - Error counts
   - Performance metrics
   - Feature usage statistics

### Report Formats

The generator supports multiple output formats:

- **JSON** - Full structured data
- **Text** - Human-readable formatted text
- **PDF** - Professional PDF document

## Usage

### Server-Side API

```javascript
POST /api/agent/research-session-report

Request Body:
{
  "sessionId": "optional-session-id", // Auto-detected if not provided
  "options": {
    "includeFullHistory": true,
    "includePatterns": true,
    "includeMetrics": true,
    "includeNavigation": true,
    "includeConversation": true,
    "includeInteractions": true,
    "includeState": true,
    "includeRelationships": true,
    "includeErrors": true,
    "maxHistoryItems": 1000,
    "maxRecentTurns": 50
  }
}

Response:
{
  "success": true,
  "report": "formatted text report",
  "reportData": { /* full JSON report */ },
  "pdfUrl": "/temp/research-session-report-1234567890.pdf",
  "metadata": {
    "generatedAt": "2024-01-01T00:00:00.000Z",
    "sessionId": "session-1234567890",
    "interactionCount": 50,
    "conversationCount": 30,
    "navigationCount": 15
  }
}
```

### Client-Side Usage

```javascript
// Generate report from client
const response = await fetch('/api/agent/research-session-report', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId: window.agentSessionAwareness?.sessionId,
    options: {
      includeFullHistory: true,
      includePatterns: true,
      includeMetrics: true
    }
  })
});

const data = await response.json();

if (data.success) {
  // Display report text
  console.log(data.report);
  
  // Download PDF
  window.open(data.pdfUrl);
  
  // Access full report data
  console.log(data.reportData);
}
```

### Direct Module Usage

```javascript
const ResearchSessionReportGenerator = require('./js/agent/research-session-report');
const { getRedisService } = require('./services/redis-service');

const redisService = getRedisService();
const agentSystem = /* your agent system instance */;

const reportGenerator = new ResearchSessionReportGenerator(
  agentSystem,
  redisService,
  mongoClient // optional
);

// Generate report
const report = await reportGenerator.generateReport(sessionId, {
  includeFullHistory: true,
  includePatterns: true,
  maxHistoryItems: 1000
});

// Format as text
const reportText = reportGenerator.formatAsText(report);

// Format as JSON
const reportJSON = reportGenerator.formatAsJSON(report);
```

## Report Structure

### Metadata
- Generated timestamp
- Session ID
- Report version
- Generator information

### Session Summary
- Start time and duration
- Interaction counts
- Navigation counts
- Conversation counts

### Relationship Analysis
- Relationship distribution by category
- Average confidence scores
- Average similarity scores
- Category labels and descriptions

### Pattern Analysis
- Recurring themes (top keywords)
- Contradictions detected
- Inferred chains

### Topics Discussed
- Top 10 most mentioned topics
- Topic frequency counts

### Key Insights
- Relationship insights (continuation rates, shift rates)
- Pattern insights
- Performance insights
- Navigation insights

### Recent Interactions
- Last 20 interactions with:
  - Timestamps
  - Input text
  - Response text
  - Relationship categories

### Performance Metrics
- System health status
- Error counts
- Warning counts
- Performance metrics

## Relationship Categories

1. **Direct continuation** - Seamless continuation of current topic
2. **Strong topical relatedness** - Strongly related to previous discussion
3. **Moderate topical relatedness** - Moderately related
4. **Logical pattern reinforcement** - Follows established pattern
5. **Logical clarification/refinement** - Asking for clarification
6. **Weak/unrelated shift** - New topic shift
7. **Explicit resumption** - Resuming earlier topic
8. **Contradiction/challenge** - Challenges previous statement
9. **First interaction** - Initial interaction with no history

## Integration Points

The report generator integrates with:

- `AgentCommunicationSystem` - Core agent system
- `AgentStateManager` - State management
- `PermanentMemory` - Memory storage
- `RelationshipDetector` - Relationship analysis
- `SessionAwareness` (client-side) - Session tracking
- `EnhancedAgentMonitoring` (client-side) - Performance monitoring
- Redis Service - Data storage
- MongoDB (optional) - Persistent storage

## Error Handling

The report generator handles errors gracefully:

- Missing components return empty data
- Failed data collection doesn't stop report generation
- Errors are logged and included in report metadata
- Partial reports are generated even if some data is unavailable

## Performance Considerations

- History loading is limited (default: 1000 items)
- Recent turns are limited (default: 50)
- Pattern detection uses caching
- PDF generation is asynchronous
- Large reports may take time to generate

## Future Enhancements

- Export to other formats (CSV, Excel)
- Customizable report templates
- Scheduled report generation
- Email delivery
- Report comparison across sessions
- Advanced analytics and visualizations


