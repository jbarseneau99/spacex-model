/**
 * Knowledge Graph
 * Manages graph structure for relationship tracking
 * Basic implementation - can be enhanced with full graph features
 */

class KnowledgeGraph {
    constructor(redisService) {
        this.redis = redisService;
        this.initialized = false;
        this.nodes = new Map();
        this.edges = [];
    }
    
    /**
     * Initialize graph with domain knowledge
     */
    async initialize() {
        if (this.initialized) return;
        
        if (!this.redis || !this.redis.isReady()) {
            console.warn('⚠️ Redis not ready, knowledge graph disabled');
            return;
        }
        
        // Load graph structure from Redis or build default
        await this.loadGraphStructure();
        this.initialized = true;
        console.log('✅ Knowledge graph initialized');
    }
    
    /**
     * Load graph structure
     * For now, returns empty - can be enhanced with domain knowledge
     */
    async loadGraphStructure() {
        // TODO: Load from Redis or build from domain knowledge
        // For now, graph is empty - will be populated as we add domain knowledge
        this.nodes = new Map();
        this.edges = [];
    }
    
    /**
     * Find nodes by synonym
     */
    async findNodesBySynonym(word) {
        if (!this.initialized) return [];
        
        try {
            const nodeIds = await this.redis.client.sMembers(`kg:synonym:${word.toLowerCase()}`);
            const nodes = [];
            
            for (const nodeId of nodeIds) {
                const nodeData = await this.redis.client.hGetAll(`kg:node:${nodeId}`);
                if (nodeData && nodeData.id) {
                    nodes.push(this.deserializeNode(nodeData));
                }
            }
            
            return nodes;
        } catch (error) {
            console.warn('⚠️ Error finding nodes by synonym:', error);
            return [];
        }
    }
    
    /**
     * Extract topics and map to graph nodes
     */
    async extractTopicsWithGraph(text) {
        if (!this.initialized) {
            return {
                primary: [],
                neighbors: [],
                paths: []
            };
        }
        
        const words = this.tokenize(text);
        const nodes = [];
        
        for (const word of words) {
            const matchedNodes = await this.findNodesBySynonym(word);
            nodes.push(...matchedNodes);
        }
        
        return {
            primary: nodes,
            neighbors: await this.findNeighbors(nodes),
            paths: await this.findPathsBetweenNodes(nodes)
        };
    }
    
    /**
     * Find neighbors of nodes
     */
    async findNeighbors(nodes) {
        if (!this.initialized || nodes.length === 0) return [];
        
        const neighborSet = new Set();
        
        for (const node of nodes) {
            try {
                const neighbors = await this.redis.client.sMembers(`kg:neighbors:${node.id}`);
                neighbors.forEach(n => neighborSet.add(n));
            } catch (error) {
                // Node might not exist yet
            }
        }
        
        // Remove primary nodes from neighbors
        nodes.forEach(n => neighborSet.delete(n.id));
        
        return await this.loadNodesByIds(Array.from(neighborSet));
    }
    
    /**
     * Find paths between nodes
     */
    async findPathsBetweenNodes(nodes) {
        if (!this.initialized || nodes.length < 2) return [];
        
        const paths = [];
        
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const path = await this.findShortestPath(nodes[i].id, nodes[j].id);
                if (path) {
                    paths.push({
                        from: nodes[i],
                        to: nodes[j],
                        path: path,
                        length: path.length
                    });
                }
            }
        }
        
        return paths;
    }
    
    /**
     * Find shortest path between two nodes (BFS)
     */
    async findShortestPath(sourceId, targetId, maxDepth = 3) {
        if (!this.initialized) return null;
        
        const queue = [[sourceId]];
        const visited = new Set([sourceId]);
        
        while (queue.length > 0) {
            const path = queue.shift();
            const currentNode = path[path.length - 1];
            
            if (currentNode === targetId) {
                return path;
            }
            
            if (path.length >= maxDepth) continue;
            
            try {
                const neighbors = await this.redis.client.sMembers(`kg:neighbors:${currentNode}`);
                
                for (const neighbor of neighbors) {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push([...path, neighbor]);
                    }
                }
            } catch (error) {
                // Node might not exist
                continue;
            }
        }
        
        return null;
    }
    
    /**
     * Load nodes by IDs
     */
    async loadNodesByIds(nodeIds) {
        if (!this.initialized || nodeIds.length === 0) return [];
        
        const nodes = [];
        
        for (const nodeId of nodeIds) {
            try {
                const nodeData = await this.redis.client.hGetAll(`kg:node:${nodeId}`);
                if (nodeData && nodeData.id) {
                    nodes.push(this.deserializeNode(nodeData));
                }
            } catch (error) {
                // Node might not exist
            }
        }
        
        return nodes;
    }
    
    /**
     * Load graph from structure
     */
    async loadGraph(graph) {
        if (!this.redis || !this.redis.isReady()) return;
        
        try {
            // Load nodes
            for (const node of graph.nodes || []) {
                await this.saveNode(node);
            }
            
            // Load edges
            for (const edge of graph.edges || []) {
                await this.saveEdge(edge);
            }
        } catch (error) {
            console.error('❌ Error loading graph:', error);
        }
    }
    
    /**
     * Save node to Redis
     */
    async saveNode(node) {
        if (!this.redis || !this.redis.isReady()) return;
        
        try {
            await this.redis.client.hSet(`kg:node:${node.id}`, {
                id: node.id,
                label: node.label || '',
                type: node.type || '',
                domain: node.domain || '',
                description: node.description || '',
                synonyms: JSON.stringify(node.synonyms || []),
                metadata: JSON.stringify(node.metadata || {})
            });
            
            // Index by synonyms
            if (node.synonyms) {
                for (const synonym of node.synonyms) {
                    await this.redis.client.sAdd(`kg:synonym:${synonym.toLowerCase()}`, node.id);
                }
            }
        } catch (error) {
            console.error(`❌ Error saving node ${node.id}:`, error);
        }
    }
    
    /**
     * Save edge to Redis
     */
    async saveEdge(edge) {
        if (!this.redis || !this.redis.isReady()) return;
        
        try {
            const edgeId = `${edge.sourceId}-${edge.targetId}-${edge.type}`;
            
            await this.redis.client.hSet(`kg:edge:${edgeId}`, {
                id: edgeId,
                sourceId: edge.sourceId,
                targetId: edge.targetId,
                type: edge.type || '',
                direction: edge.direction || 'forward',
                strength: (edge.strength || 0).toString(),
                confidence: (edge.confidence || 0).toString(),
                metadata: JSON.stringify(edge.metadata || {})
            });
            
            // Index neighbors
            await this.redis.client.sAdd(`kg:neighbors:${edge.sourceId}`, edge.targetId);
            await this.redis.client.sAdd(`kg:neighbors:${edge.targetId}`, edge.sourceId);
            
            // Index edges by source/target
            await this.redis.client.sAdd(`kg:edges:from:${edge.sourceId}`, edgeId);
            await this.redis.client.sAdd(`kg:edges:to:${edge.targetId}`, edgeId);
        } catch (error) {
            console.error(`❌ Error saving edge:`, error);
        }
    }
    
    /**
     * Deserialize node from Redis data
     */
    deserializeNode(nodeData) {
        return {
            id: nodeData.id,
            label: nodeData.label,
            type: nodeData.type,
            domain: nodeData.domain,
            description: nodeData.description,
            synonyms: JSON.parse(nodeData.synonyms || '[]'),
            metadata: JSON.parse(nodeData.metadata || '{}')
        };
    }
    
    /**
     * Tokenize text
     */
    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3);
    }
}

module.exports = KnowledgeGraph;


