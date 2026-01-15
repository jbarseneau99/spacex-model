/**
 * History Data Collection Script
 * Collects and exports history functionality data for analysis
 */

require('dotenv').config();
const { getRedisService } = require('../services/redis-service');
const HistoryAnalytics = require('../js/agent/analytics/HistoryAnalytics');
const fs = require('fs');
const path = require('path');

async function collectHistoryData() {
    console.log('📊 Collecting History Functionality Data...\n');
    
    const redisService = getRedisService();
    
    if (!redisService.isReady()) {
        console.log('Connecting to Redis...');
        await redisService.connect();
    }
    
    if (!redisService.isReady()) {
        console.error('❌ Redis not available');
        process.exit(1);
    }
    
    const analytics = new HistoryAnalytics(redisService);
    
    // Collect all analytics data
    console.log('Collecting relationship detection data...');
    const relationships = await analytics.getAnalyticsData('relationship', 1000);
    
    console.log('Collecting embedding usage data...');
    const embeddings = await analytics.getAnalyticsData('embedding', 1000);
    
    console.log('Collecting memory operation data...');
    const memoryOps = await analytics.getAnalyticsData('memory', 1000);
    
    console.log('Collecting pattern detection data...');
    const patterns = await analytics.getAnalyticsData('pattern', 1000);
    
    console.log('Collecting similarity comparison data...');
    const similarities = await analytics.getAnalyticsData('similarity', 1000);
    
    // Collect interaction data
    console.log('Collecting interaction data...');
    const interactions = await redisService.getAllInteractions(1000);
    
    // Analyze data
    console.log('\n📈 Analyzing Data...\n');
    
    const analysis = {
        timestamp: new Date().toISOString(),
        summary: {
            totalInteractions: interactions.length,
            totalRelationships: relationships.length,
            totalEmbeddings: embeddings.length,
            totalMemoryOps: memoryOps.length,
            totalPatterns: patterns.length,
            totalSimilarities: similarities.length
        },
        relationshipDistribution: analyzeRelationships(relationships),
        embeddingStats: analyzeEmbeddings(embeddings),
        performanceStats: analyzePerformance(relationships, embeddings, memoryOps),
        similarityAnalysis: analyzeSimilarities(similarities),
        patternAnalysis: analyzePatterns(patterns),
        interactionAnalysis: analyzeInteractions(interactions)
    };
    
    // Export data
    const outputDir = path.join(__dirname, '../data/history-analytics');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `history-data-${timestamp}.json`);
    
    const exportData = {
        analysis: analysis,
        rawData: {
            relationships: relationships,
            embeddings: embeddings,
            memoryOps: memoryOps,
            patterns: patterns,
            similarities: similarities,
            interactions: interactions.slice(0, 100) // Limit interactions for file size
        }
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
    
    console.log('✅ Data collected and exported!');
    console.log(`📁 Output file: ${outputFile}`);
    console.log('\n📊 Summary:');
    console.log(JSON.stringify(analysis.summary, null, 2));
    console.log('\n📈 Relationship Distribution:');
    console.log(JSON.stringify(analysis.relationshipDistribution, null, 2));
    console.log('\n⚡ Performance Stats:');
    console.log(JSON.stringify(analysis.performanceStats, null, 2));
}

function analyzeRelationships(relationships) {
    const distribution = {};
    const confidences = [];
    const similarities = [];
    const timings = [];
    
    relationships.forEach(rel => {
        distribution[rel.category] = (distribution[rel.category] || 0) + 1;
        if (rel.confidence !== null && rel.confidence !== undefined) {
            confidences.push(rel.confidence);
        }
        if (rel.similarity !== null && rel.similarity !== undefined) {
            similarities.push(rel.similarity);
        }
        if (rel.timing !== null && rel.timing !== undefined) {
            timings.push(rel.timing);
        }
    });
    
    return {
        distribution: distribution,
        avgConfidence: confidences.length > 0 
            ? (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(3)
            : null,
        avgSimilarity: similarities.length > 0
            ? (similarities.reduce((a, b) => a + b, 0) / similarities.length).toFixed(3)
            : null,
        avgTiming: timings.length > 0
            ? (timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(2) + 'ms'
            : null,
        total: relationships.length
    };
}

function analyzeEmbeddings(embeddings) {
    const stats = {
        total: embeddings.length,
        successful: 0,
        failed: 0,
        cached: 0,
        fallback: 0,
        timings: []
    };
    
    embeddings.forEach(emb => {
        if (emb.success) {
            stats.successful++;
            if (emb.cached) stats.cached++;
        } else {
            stats.failed++;
            if (emb.fallback) stats.fallback++;
        }
        if (emb.timing !== null && emb.timing !== undefined) {
            stats.timings.push(emb.timing);
        }
    });
    
    return {
        ...stats,
        successRate: stats.total > 0 
            ? ((stats.successful / stats.total) * 100).toFixed(2) + '%'
            : '0%',
        cacheHitRate: stats.successful > 0
            ? ((stats.cached / stats.successful) * 100).toFixed(2) + '%'
            : '0%',
        avgTiming: stats.timings.length > 0
            ? (stats.timings.reduce((a, b) => a + b, 0) / stats.timings.length).toFixed(2) + 'ms'
            : null
    };
}

function analyzePerformance(relationships, embeddings, memoryOps) {
    const relTimings = relationships
        .map(r => r.timing)
        .filter(t => t !== null && t !== undefined);
    const embTimings = embeddings
        .map(e => e.timing)
        .filter(t => t !== null && t !== undefined);
    const memTimings = memoryOps
        .map(m => m.timing)
        .filter(t => t !== null && t !== undefined);
    
    return {
        relationshipDetection: {
            avg: relTimings.length > 0
                ? (relTimings.reduce((a, b) => a + b, 0) / relTimings.length).toFixed(2) + 'ms'
                : 'N/A',
            min: relTimings.length > 0 ? Math.min(...relTimings) + 'ms' : 'N/A',
            max: relTimings.length > 0 ? Math.max(...relTimings) + 'ms' : 'N/A',
            count: relTimings.length
        },
        embeddingGeneration: {
            avg: embTimings.length > 0
                ? (embTimings.reduce((a, b) => a + b, 0) / embTimings.length).toFixed(2) + 'ms'
                : 'N/A',
            min: embTimings.length > 0 ? Math.min(...embTimings) + 'ms' : 'N/A',
            max: embTimings.length > 0 ? Math.max(...embTimings) + 'ms' : 'N/A',
            count: embTimings.length
        },
        memoryOperations: {
            avg: memTimings.length > 0
                ? (memTimings.reduce((a, b) => a + b, 0) / memTimings.length).toFixed(2) + 'ms'
                : 'N/A',
            min: memTimings.length > 0 ? Math.min(...memTimings) + 'ms' : 'N/A',
            max: memTimings.length > 0 ? Math.max(...memTimings) + 'ms' : 'N/A',
            count: memTimings.length
        }
    };
}

function analyzeSimilarities(similarities) {
    const byMethod = {
        embeddings: [],
        jaccard: []
    };
    
    similarities.forEach(sim => {
        if (sim.method === 'embeddings') {
            byMethod.embeddings.push(sim.similarity);
        } else {
            byMethod.jaccard.push(sim.similarity);
        }
    });
    
    return {
        total: similarities.length,
        byMethod: {
            embeddings: {
                count: byMethod.embeddings.length,
                avg: byMethod.embeddings.length > 0
                    ? (byMethod.embeddings.reduce((a, b) => a + b, 0) / byMethod.embeddings.length).toFixed(3)
                    : null
            },
            jaccard: {
                count: byMethod.jaccard.length,
                avg: byMethod.jaccard.length > 0
                    ? (byMethod.jaccard.reduce((a, b) => a + b, 0) / byMethod.jaccard.length).toFixed(3)
                    : null
            }
        }
    };
}

function analyzePatterns(patterns) {
    const typeCounts = {};
    
    patterns.forEach(pattern => {
        if (pattern.patterns && Array.isArray(pattern.patterns)) {
            pattern.patterns.forEach(p => {
                const type = p.type || 'unknown';
                typeCounts[type] = (typeCounts[type] || 0) + 1;
            });
        }
    });
    
    return {
        totalDetected: patterns.length,
        typeDistribution: typeCounts
    };
}

function analyzeInteractions(interactions) {
    const withEmbeddings = interactions.filter(i => 
        i.semantics?.embedding && Array.isArray(i.semantics.embedding)
    ).length;
    
    const withRelationships = interactions.filter(i => 
        i.relationship && typeof i.relationship === 'object'
    ).length;
    
    const relationshipCategories = {};
    interactions.forEach(i => {
        const cat = i.relationship?.category || i.relationship;
        if (cat) {
            relationshipCategories[cat] = (relationshipCategories[cat] || 0) + 1;
        }
    });
    
    return {
        total: interactions.length,
        withEmbeddings: withEmbeddings,
        withRelationships: withRelationships,
        embeddingRate: interactions.length > 0
            ? ((withEmbeddings / interactions.length) * 100).toFixed(2) + '%'
            : '0%',
        relationshipDistribution: relationshipCategories
    };
}

// Run collection
collectHistoryData().catch(error => {
    console.error('❌ Error collecting data:', error);
    process.exit(1);
});


