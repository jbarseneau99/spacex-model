# Ada Knowledge Tree: Hierarchical Topic Understanding

## Why a Knowledge Tree?

A knowledge tree would significantly enhance Ada's ability to:

1. **Understand Topic Hierarchies**: Know that "Starlink" is under "Earth Operations" → "Satellite Internet"
2. **Detect Conceptual Relationships**: Recognize when moving from general to specific (e.g., "SpaceX" → "Starlink" → "Bandwidth Pricing")
3. **Improve Pattern Detection**: Identify when users are exploring a topic tree (drilling down or branching out)
4. **Better Commentary**: Generate more contextually-aware commentary understanding topic relationships
5. **Smarter Navigation**: Suggest related topics at different levels of abstraction

## Current State: Flat Topic Extraction

### Current Approach
```javascript
// Topics extracted as flat list
semantics: {
  topics: ["starlink", "bandwidth", "pricing", "mars", "colonization"]
}
```

**Problems:**
- No understanding of topic relationships
- Can't distinguish between "Starlink" (specific) and "Earth Operations" (general)
- Can't detect when user is drilling down vs. branching out
- No way to suggest related topics at different abstraction levels

## Proposed Knowledge Tree Structure

### SpaceX Valuation Domain Tree

```
SpaceX Valuation
├── Earth Operations
│   ├── Starlink
│   │   ├── Satellite Internet
│   │   │   ├── Bandwidth Capacity
│   │   │   ├── Penetration Rate
│   │   │   ├── Pricing Model
│   │   │   └── Market Size (TAM)
│   │   ├── Technology
│   │   │   ├── Satellite Constellation
│   │   │   ├── Ground Infrastructure
│   │   │   └── Network Performance
│   │   └── Financials
│   │       ├── Revenue Model
│   │       ├── Cost Structure
│   │       └── Profitability
│   └── Launch Services
│       ├── Commercial Launches
│       │   ├── Launch Volume
│       │   ├── Launch Pricing
│       │   └── Market Share
│       ├── Government Contracts
│       └── Reusability
│           ├── Cost Reduction
│           └── Launch Cadence
├── Mars Operations
│   ├── Colonization
│   │   ├── First Colony Year
│   │   ├── Population Growth
│   │   └── Timeline Scenarios
│   ├── Transport Economics
│   │   ├── Cost Per Person
│   │   ├── Transport Cost Decline (Wright's Law)
│   │   └── Fleet Capacity
│   ├── Industrial Bootstrap
│   │   ├── Self-Sustaining Economy
│   │   ├── Resource Extraction
│   │   └── Manufacturing
│   └── Option Value
│       ├── Real Options Theory
│       ├── Scenario Weighting
│       └── Long-Horizon Valuation
├── Financial Framework
│   ├── Valuation Methodology
│   │   ├── DCF (Discounted Cash Flow)
│   │   ├── Terminal Value
│   │   └── Perpetuity Growth
│   ├── Risk Analysis
│   │   ├── Greeks
│   │   │   ├── Delta (Sensitivity)
│   │   │   ├── Gamma (Convexity)
│   │   │   ├── Theta (Time Decay)
│   │   │   ├── Vega (Volatility)
│   │   │   └── Rho (Interest Rate)
│   │   ├── Factor Models
│   │   │   ├── Market Factors
│   │   │   ├── Industry Factors
│   │   │   └── Style Factors
│   │   └── Stress Testing
│   ├── Monte Carlo Simulation
│   │   ├── Input Distributions
│   │   ├── Scenario Generation
│   │   └── Statistical Analysis
│   └── Discounting
│       ├── WACC (Weighted Average Cost of Capital)
│       ├── Discount Rate
│       └── Risk-Free Rate
└── Analysis Tools
    ├── Sensitivity Analysis
    ├── Scenario Analysis
    ├── Attribution Analysis
    └── Visualization
        ├── Charts
        ├── Dashboards
        └── Reports
```

## Knowledge Tree Data Structure

### Node Structure

```javascript
{
  id: string,                    // Unique node ID (e.g., "starlink", "bandwidth-pricing")
  label: string,                  // Human-readable label (e.g., "Starlink")
  path: string[],                 // Path from root (e.g., ["SpaceX Valuation", "Earth Operations", "Starlink"])
  level: number,                 // Depth in tree (0 = root, 1 = top-level, etc.)
  parentId: string | null,       // Parent node ID
  childrenIds: string[],         // Child node IDs
  synonyms: string[],            // Alternative names (e.g., ["satellite internet", "starlink service"])
  description: string,           // Description of the topic
  relatedNodeIds: string[],     // Related nodes (siblings, cousins, etc.)
  interactionIds: string[],     // Interactions that mention this topic
  frequency: number,             // How often this topic appears in conversations
  lastMentioned: number,         // Timestamp of last mention
  metadata: {
    domain: string,              // Domain (e.g., "earth-operations", "mars-operations")
    category: string,            // Category (e.g., "technology", "financials")
    importance: number,          // Importance score (0-1)
    isLeaf: boolean              // Is this a leaf node (no children)?
  }
}
```

### Tree Structure Storage

```javascript
// Redis structure for knowledge tree
{
  // Node storage
  "knowledge:node:{nodeId}": {
    // Hash with node data
    id: string,
    label: string,
    path: string[],
    level: number,
    parentId: string | null,
    childrenIds: string[],
    synonyms: string[],
    description: string,
    relatedNodeIds: string[],
    interactionIds: string[],
    frequency: number,
    lastMentioned: number,
    metadata: object
  },
  
  // Index: Children of a node
  "knowledge:children:{nodeId}": Set<nodeId>,
  
  // Index: Parents of a node (for reverse lookup)
  "knowledge:parents:{nodeId}": Set<nodeId>,
  
  // Index: Interactions by topic
  "knowledge:interactions:{nodeId}": SortedSet<interactionId> (by timestamp),
  
  // Index: Topics by frequency
  "knowledge:topics:by-frequency": SortedSet<nodeId> (by frequency),
  
  // Index: Topics by last mention
  "knowledge:topics:by-recent": SortedSet<nodeId> (by lastMentioned),
  
  // Root node reference
  "knowledge:root": "spacex-valuation"
}
```

## Knowledge Tree Integration

### 1. Topic Extraction with Tree Mapping

```javascript
class KnowledgeTreeManager {
    constructor(redisService) {
        this.redis = redisService;
        this.tree = null; // Loaded tree structure
    }
    
    /**
     * Extract topics from text and map to knowledge tree nodes
     */
    async extractTopicsWithTree(text) {
        const words = this.tokenize(text);
        const extractedTopics = [];
        
        // Match words/phrases to tree nodes
        for (const word of words) {
            const node = await this.findNodeBySynonym(word);
            if (node) {
                extractedTopics.push({
                    nodeId: node.id,
                    label: node.label,
                    path: node.path,
                    level: node.level,
                    confidence: this.calculateMatchConfidence(word, node)
                });
            }
        }
        
        // Also extract parent nodes (broader context)
        const parentNodes = await this.extractParentNodes(extractedTopics);
        
        // Also extract related nodes (siblings, cousins)
        const relatedNodes = await this.extractRelatedNodes(extractedTopics);
        
        return {
            primary: extractedTopics,
            parents: parentNodes,
            related: relatedNodes,
            treePath: this.buildTreePath(extractedTopics)
        };
    }
    
    /**
     * Find node by synonym (word matching)
     */
    async findNodeBySynonym(word) {
        // Check Redis for node with matching synonym
        const nodeIds = await this.redis.client.sMembers(`knowledge:synonym:${word.toLowerCase()}`);
        
        if (nodeIds.length > 0) {
            // Return most relevant node (could use frequency, recency, etc.)
            const nodeData = await this.redis.client.hGetAll(`knowledge:node:${nodeIds[0]}`);
            return this.deserializeNode(nodeData);
        }
        
        return null;
    }
    
    /**
     * Extract parent nodes (broader context)
     */
    async extractParentNodes(primaryNodes) {
        const parentNodes = new Set();
        
        for (const node of primaryNodes) {
            if (node.level > 0) {
                const parent = await this.getNode(node.parentId);
                if (parent) {
                    parentNodes.add(parent);
                }
            }
        }
        
        return Array.from(parentNodes);
    }
    
    /**
     * Extract related nodes (siblings, cousins)
     */
    async extractRelatedNodes(primaryNodes) {
        const relatedNodes = new Set();
        
        for (const node of primaryNodes) {
            // Get siblings (same parent)
            const siblings = await this.getSiblings(node.id);
            siblings.forEach(s => relatedNodes.add(s));
            
            // Get related nodes (explicitly linked)
            const related = await this.getRelatedNodes(node.id);
            related.forEach(r => relatedNodes.add(r));
        }
        
        return Array.from(relatedNodes);
    }
    
    /**
     * Build tree path from extracted topics
     */
    buildTreePath(extractedTopics) {
        // Find common ancestor
        if (extractedTopics.length === 0) return [];
        
        const paths = extractedTopics.map(t => t.path);
        const commonPath = this.findCommonPath(paths);
        
        return {
            root: commonPath[0] || null,
            branch: commonPath[1] || null,
            leaves: extractedTopics.map(t => t.label),
            depth: commonPath.length
        };
    }
}
```

### 2. Enhanced Relationship Detection with Tree

```javascript
class RelationshipDetector {
    constructor(redisService, knowledgeTree) {
        this.semanticAnalyzer = new SemanticAnalyzer();
        this.knowledgeTree = knowledgeTree;
    }
    
    /**
     * Detect relationship with tree-aware analysis
     */
    async detectRelationship(newInput, context) {
        // Extract topics with tree mapping
        const newTopics = await this.knowledgeTree.extractTopicsWithTree(newInput);
        const currentTopics = await this.knowledgeTree.extractTopicsWithTree(context.currentSentence || '');
        
        // Calculate tree-based similarity
        const treeSimilarity = this.calculateTreeSimilarity(newTopics, currentTopics);
        
        // Detect relationship type based on tree structure
        const relationshipType = this.detectTreeRelationship(newTopics, currentTopics);
        
        return {
            category: relationshipType.category,
            confidence: relationshipType.confidence,
            similarity: treeSimilarity,
            transitionPhrase: this.selectTransition(relationshipType),
            treeContext: {
                newPath: newTopics.treePath,
                currentPath: currentTopics.treePath,
                relationshipType: relationshipType.type // "drill-down", "branch-out", "sibling", "parent", "unrelated"
            }
        };
    }
    
    /**
     * Calculate similarity based on tree structure
     */
    calculateTreeSimilarity(newTopics, currentTopics) {
        // Exact match
        const newNodeIds = new Set(newTopics.primary.map(t => t.nodeId));
        const currentNodeIds = new Set(currentTopics.primary.map(t => t.nodeId));
        const exactMatch = this.setIntersection(newNodeIds, currentNodeIds).size;
        
        if (exactMatch > 0) return 1.0;
        
        // Parent-child relationship
        const parentMatch = this.checkParentChild(newTopics, currentTopics);
        if (parentMatch) return 0.8;
        
        // Sibling relationship
        const siblingMatch = this.checkSiblings(newTopics, currentTopics);
        if (siblingMatch) return 0.6;
        
        // Same branch (cousins)
        const branchMatch = this.checkSameBranch(newTopics, currentTopics);
        if (branchMatch) return 0.4;
        
        // Unrelated
        return 0.0;
    }
    
    /**
     * Detect relationship type based on tree structure
     */
    detectTreeRelationship(newTopics, currentTopics) {
        const newPath = newTopics.treePath;
        const currentPath = currentTopics.treePath;
        
        // Drill-down: Moving from general to specific
        if (newPath.depth > currentPath.depth && 
            newPath.path.slice(0, currentPath.depth).join('/') === currentPath.path.join('/')) {
            return {
                category: 1, // Direct continuation
                type: 'drill-down',
                confidence: 0.9
            };
        }
        
        // Branch-out: Moving from specific to general
        if (newPath.depth < currentPath.depth && 
            currentPath.path.slice(0, newPath.depth).join('/') === newPath.path.join('/')) {
            return {
                category: 3, // Moderate relatedness
                type: 'branch-out',
                confidence: 0.75
            };
        }
        
        // Sibling: Same parent, different children
        if (newPath.branch === currentPath.branch && newPath.depth === currentPath.depth) {
            return {
                category: 2, // Strong relatedness
                type: 'sibling',
                confidence: 0.85
            };
        }
        
        // Same branch: Related but not direct
        if (newPath.root === currentPath.root) {
            return {
                category: 3, // Moderate relatedness
                type: 'same-branch',
                confidence: 0.7
            };
        }
        
        // Unrelated
        return {
            category: 6, // Weak shift
            type: 'unrelated',
            confidence: 0.6
        };
    }
}
```

### 3. Enhanced Pattern Detection with Tree

```javascript
class PatternDetector {
    constructor(knowledgeTree) {
        this.knowledgeTree = knowledgeTree;
    }
    
    /**
     * Detect patterns using tree structure
     */
    async detectTreePatterns(history) {
        const patterns = {
            explorationPaths: [],      // Paths users take through the tree
            drillDownPatterns: [],    // Moving from general to specific
            branchOutPatterns: [],     // Moving from specific to general
            topicClusters: [],         // Clusters of related topics
            recurringBranches: []     // Branches frequently visited
        };
        
        // Extract tree paths from history
        const treePaths = [];
        for (const interaction of history) {
            const topics = await this.knowledgeTree.extractTopicsWithTree(
                interaction.input + ' ' + interaction.response
            );
            treePaths.push(topics.treePath);
        }
        
        // Detect exploration patterns
        patterns.explorationPaths = this.detectExplorationPaths(treePaths);
        
        // Detect drill-down patterns (general → specific)
        patterns.drillDownPatterns = this.detectDrillDownPatterns(treePaths);
        
        // Detect branch-out patterns (specific → general)
        patterns.branchOutPatterns = this.detectBranchOutPatterns(treePaths);
        
        // Detect topic clusters
        patterns.topicClusters = this.detectTopicClusters(treePaths);
        
        // Detect recurring branches
        patterns.recurringBranches = this.detectRecurringBranches(treePaths);
        
        return patterns;
    }
    
    /**
     * Detect exploration paths through the tree
     */
    detectExplorationPaths(treePaths) {
        const paths = [];
        
        for (let i = 0; i < treePaths.length - 1; i++) {
            const current = treePaths[i];
            const next = treePaths[i + 1];
            
            // Check if moving deeper (drill-down)
            if (next.depth > current.depth) {
                paths.push({
                    type: 'drill-down',
                    from: current.path.join(' → '),
                    to: next.path.join(' → '),
                    depthChange: next.depth - current.depth
                });
            }
            // Check if moving up (branch-out)
            else if (next.depth < current.depth) {
                paths.push({
                    type: 'branch-out',
                    from: current.path.join(' → '),
                    to: next.path.join(' → '),
                    depthChange: next.depth - current.depth
                });
            }
            // Check if moving sideways (sibling)
            else if (next.branch === current.branch) {
                paths.push({
                    type: 'sibling',
                    from: current.path.join(' → '),
                    to: next.path.join(' → '),
                    branch: current.branch
                });
            }
        }
        
        return paths;
    }
}
```

### 4. Enhanced Commentary Generation with Tree

```javascript
class ResponseBuilder {
    constructor(knowledgeTree) {
        this.knowledgeTree = knowledgeTree;
    }
    
    /**
     * Build response with tree-aware commentary
     */
    async buildResponse(input, relationship, context) {
        const topics = await this.knowledgeTree.extractTopicsWithTree(input);
        
        // Add tree context to instructions
        const instructions = [];
        
        if (relationship.treeContext) {
            const treeContext = relationship.treeContext;
            
            switch (treeContext.relationshipType) {
                case 'drill-down':
                    instructions.push(`User is drilling down from "${treeContext.currentPath.branch}" to more specific topic "${topics.treePath.leaves.join(', ')}".`);
                    instructions.push('Provide detailed, specific information about this topic.');
                    instructions.push(`Consider mentioning related subtopics: ${topics.related.map(n => n.label).join(', ')}`);
                    break;
                    
                case 'branch-out':
                    instructions.push(`User is branching out from specific topic to broader context "${topics.treePath.branch}".`);
                    instructions.push('Provide broader context and connections to related topics.');
                    instructions.push(`Consider mentioning parent topics: ${topics.parents.map(n => n.label).join(', ')}`);
                    break;
                    
                case 'sibling':
                    instructions.push(`User is exploring related topic "${topics.treePath.leaves.join(', ')}" within same branch "${topics.treePath.branch}".`);
                    instructions.push('Draw connections to previously discussed sibling topics.');
                    instructions.push(`Consider mentioning other siblings: ${topics.related.map(n => n.label).join(', ')}`);
                    break;
                    
                case 'same-branch':
                    instructions.push(`User is exploring different part of same domain "${topics.treePath.root}".`);
                    instructions.push('Maintain context of the broader domain while focusing on new topic.');
                    break;
            }
        }
        
        // Suggest related topics at different levels
        const suggestions = await this.generateTopicSuggestions(topics, relationship);
        if (suggestions.length > 0) {
            instructions.push(`Consider suggesting related topics: ${suggestions.map(s => s.label).join(', ')}`);
        }
        
        return instructions;
    }
    
    /**
     * Generate topic suggestions based on tree structure
     */
    async generateTopicSuggestions(currentTopics, relationship) {
        const suggestions = [];
        
        // Suggest children (more specific topics)
        if (currentTopics.primary.length > 0) {
            const primaryNode = currentTopics.primary[0];
            const children = await this.knowledgeTree.getChildren(primaryNode.nodeId);
            suggestions.push(...children.slice(0, 3).map(c => ({
                label: c.label,
                type: 'more-specific',
                path: c.path
            })));
        }
        
        // Suggest siblings (related topics at same level)
        suggestions.push(...currentTopics.related.slice(0, 3).map(r => ({
            label: r.label,
            type: 'related',
            path: r.path
        })));
        
        // Suggest parent (broader context)
        if (currentTopics.parents.length > 0) {
            suggestions.push({
                label: currentTopics.parents[0].label,
                type: 'broader',
                path: currentTopics.parents[0].path
            });
        }
        
        return suggestions;
    }
}
```

## Benefits of Knowledge Tree

### 1. **Better Relationship Detection**
- Understands when user is drilling down (general → specific)
- Recognizes when user is branching out (specific → general)
- Detects sibling relationships (related topics at same level)
- Identifies same-branch exploration (related but not direct)

### 2. **Smarter Pattern Detection**
- Tracks exploration paths through the tree
- Identifies common navigation patterns
- Detects topic clusters and recurring branches
- Understands user's learning/exploration style

### 3. **Enhanced Commentary**
- Can reference parent topics for context
- Can suggest related subtopics
- Can acknowledge topic transitions ("Moving from Starlink to broader Earth Operations...")
- Can suggest exploration paths ("You might also want to explore...")

### 4. **Better Topic Suggestions**
- Suggests children (more specific topics)
- Suggests siblings (related topics)
- Suggests parents (broader context)
- Suggests based on exploration pattern

### 5. **Improved Queryability**
- Query by tree path ("All interactions about Starlink → Bandwidth Pricing")
- Query by branch ("All interactions about Earth Operations")
- Query by level ("All top-level topics")
- Query by relationship ("All drill-down patterns")

## Implementation Plan

### Phase 1: Build Knowledge Tree Structure
1. Define tree structure for SpaceX valuation domain
2. Create node data structures
3. Build Redis storage for tree
4. Create tree loading/initialization

### Phase 2: Integrate Topic Extraction
1. Update topic extraction to map to tree nodes
2. Extract parent/child/related nodes
3. Build tree paths from topics
4. Store topic mappings in interactions

### Phase 3: Enhance Relationship Detection
1. Add tree-based similarity calculation
2. Detect tree relationship types (drill-down, branch-out, etc.)
3. Update relationship categories with tree context
4. Test with real conversations

### Phase 4: Enhance Pattern Detection
1. Detect exploration paths through tree
2. Identify drill-down/branch-out patterns
3. Detect topic clusters
4. Track recurring branches

### Phase 5: Enhance Commentary Generation
1. Add tree-aware instructions
2. Generate topic suggestions
3. Reference tree paths in commentary
4. Test and refine

## Example: Tree-Aware Commentary

### Without Tree:
```
User: "Tell me about Starlink"
Ada: "Starlink is SpaceX's satellite internet service..."
```

### With Tree:
```
User: "Tell me about Starlink"
Ada: "Starlink is SpaceX's satellite internet service, part of Earth Operations. 
      Key areas include bandwidth capacity, penetration rates, and pricing models. 
      Would you like to explore bandwidth capacity, pricing, or market size?"
      
[Tree context: Detected top-level topic "Starlink", suggesting children: 
 "Bandwidth Capacity", "Pricing Model", "Market Size"]
```

### With Tree (Drill-Down):
```
User: "Tell me about Starlink"
Ada: "Starlink is SpaceX's satellite internet service..."
User: "What about bandwidth pricing?"
Ada: "Drilling down into bandwidth pricing - this is a key component of Starlink's 
      revenue model. Pricing affects penetration rates and market size. 
      Related topics include penetration rate sensitivity and market TAM analysis."
      
[Tree context: Detected drill-down from "Starlink" → "Bandwidth Pricing", 
 suggesting siblings: "Penetration Rate", "Market Size"]
```

## Conclusion

A knowledge tree would significantly enhance Ada's understanding by:

1. **Understanding Topic Hierarchies**: Know relationships between topics
2. **Detecting Exploration Patterns**: Recognize drill-down, branch-out, sibling navigation
3. **Generating Better Commentary**: Context-aware responses with topic suggestions
4. **Improving Pattern Detection**: Track how users explore the domain
5. **Enabling Smarter Queries**: Query by tree path, branch, level, relationship

This would make Ada's commentary more intelligent, contextual, and helpful by understanding not just what topics are discussed, but how they relate to each other in a hierarchical knowledge structure.


