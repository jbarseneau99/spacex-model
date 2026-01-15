/**
 * Graph Builder
 * Builds knowledge graph from domain knowledge
 * Separated for maintainability
 */

class GraphBuilder {
    constructor() {
        this.nodes = [];
        this.edges = [];
    }
    
    /**
     * Build SpaceX valuation domain graph
     * This is a basic structure - can be expanded with full domain knowledge
     */
    buildSpaceXGraph() {
        // Clear previous data
        this.nodes = [];
        this.edges = [];
        
        // Model Inputs (Greeks)
        this.addNode({
            id: "starlink-penetration",
            label: "Starlink Penetration Rate",
            type: "input",
            domain: "earth-operations",
            synonyms: ["penetration", "starlink penetration", "penetration rate", "market penetration"],
            metadata: { greekType: "Delta", sensitivity: 50, unit: "percentage" }
        });
        
        this.addNode({
            id: "discount-rate",
            label: "Discount Rate",
            type: "input",
            domain: "financial",
            synonyms: ["discount rate", "wacc", "discount", "rate"],
            metadata: { greekType: "Rho", sensitivity: -80, unit: "percentage" }
        });
        
        this.addNode({
            id: "launch-volume",
            label: "Launch Volume",
            type: "input",
            domain: "earth-operations",
            synonyms: ["launch volume", "launches", "launch count", "launch cadence"],
            metadata: { greekType: "Delta", sensitivity: 2.5, unit: "launches/year" }
        });
        
        // Market Factors
        this.addNode({
            id: "tech-sector-growth",
            label: "Tech Sector Growth",
            type: "factor",
            domain: "market",
            synonyms: ["tech sector", "tech growth", "technology sector"],
            metadata: { exposure: 0.75, beta: 0.75 }
        });
        
        // Algorithms/Principles
        this.addNode({
            id: "wrights-law",
            label: "Wright's Law (Learning Curve)",
            type: "algorithm",
            domain: "financial",
            synonyms: ["wrights law", "learning curve", "cost reduction", "wright's law"],
            description: "Cost reduction based on cumulative production"
        });
        
        // Outputs
        this.addNode({
            id: "starlink-revenue",
            label: "Starlink Revenue",
            type: "output",
            domain: "earth-operations",
            synonyms: ["starlink revenue", "revenue", "starlink income"]
        });
        
        this.addNode({
            id: "total-valuation",
            label: "Total Enterprise Value",
            type: "output",
            domain: "financial",
            synonyms: ["valuation", "enterprise value", "total value", "ev"]
        });
        
        // Relationships
        this.addEdge({
            sourceId: "starlink-penetration",
            targetId: "starlink-revenue",
            type: "influences",
            direction: "forward",
            strength: 0.9,
            confidence: 0.95,
            metadata: { impactMagnitude: 50, impactType: "direct" }
        });
        
        this.addEdge({
            sourceId: "tech-sector-growth",
            targetId: "starlink-penetration",
            type: "influences",
            direction: "forward",
            strength: 0.75,
            confidence: 0.8,
            metadata: { correlation: 0.75, impactType: "indirect" }
        });
        
        this.addEdge({
            sourceId: "discount-rate",
            targetId: "total-valuation",
            type: "affects",
            direction: "forward",
            strength: 0.9,
            confidence: 1.0,
            metadata: { impactMagnitude: -80, impactType: "direct" }
        });
        
        this.addEdge({
            sourceId: "wrights-law",
            targetId: "launch-volume",
            type: "applies-to",
            direction: "forward",
            strength: 0.95,
            confidence: 1.0,
            metadata: { description: "Launch volume enables cost reduction via Wright's Law" }
        });
        
        return {
            nodes: this.nodes,
            edges: this.edges
        };
    }
    
    /**
     * Add node to graph
     */
    addNode(node) {
        this.nodes.push(node);
    }
    
    /**
     * Add edge to graph
     */
    addEdge(edge) {
        this.edges.push(edge);
    }
}

module.exports = GraphBuilder;


