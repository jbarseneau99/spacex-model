/**
 * Research Session Report Generator
 * Aggregates data from all agent systems to create comprehensive research session reports
 */

class ResearchSessionReportGenerator {
    constructor(agentSystem, redisService, mongoClient = null) {
        this.agentSystem = agentSystem;
        this.redis = redisService;
        this.mongo = mongoClient;
    }

    /**
     * Generate comprehensive research session report
     * Collects data from all agent systems and formats into structured report
     */
    async generateReport(sessionId = null, options = {}) {
        const {
            includeFullHistory = true,
            includePatterns = true,
            includeMetrics = true,
            includeNavigation = true,
            includeConversation = true,
            includeInteractions = true,
            includeState = true,
            includeRelationships = true,
            includeErrors = true,
            maxHistoryItems = 1000,
            maxRecentTurns = 50
        } = options;

        console.log('[ResearchSessionReport] Generating report for session:', sessionId);

        const report = {
            metadata: {
                generatedAt: new Date().toISOString(),
                sessionId: sessionId || this.agentSystem?.getSessionId() || 'unknown',
                reportVersion: '1.0',
                generator: 'ResearchSessionReportGenerator'
            },
            session: {},
            interactions: [],
            relationships: [],
            patterns: {},
            navigation: [],
            conversation: [],
            userInteractions: [],
            state: {},
            metrics: {},
            errors: [],
            summary: {}
        };

        try {
            // 1. Collect session data
            if (this.agentSystem) {
                report.session = await this.collectSessionData(sessionId);
            }

            // 2. Collect interaction history from ALL sources
            if (includeFullHistory) {
                report.interactions = await this.collectAllInteractions(maxHistoryItems, options.conversationHistory);
            }

            // 3. Collect relationship data
            if (includeRelationships && this.agentSystem) {
                report.relationships = await this.collectRelationshipData(report.interactions);
            }

            // 4. Collect pattern data
            if (includePatterns && this.agentSystem) {
                const memory = this.agentSystem.getMemory();
                if (memory) {
                    report.patterns = await memory.detectPatterns(report.interactions);
                    report.patterns.chains = await memory.inferChains(report.interactions);
                }
            }

            // 5. Collect navigation data (from enhanced agent)
            if (includeNavigation && window.agentSessionAwareness) {
                report.navigation = this.collectNavigationData();
            }

            // 6. Collect conversation data (from enhanced agent)
            if (includeConversation && window.agentSessionAwareness) {
                report.conversation = this.collectConversationData();
            }

            // 7. Collect interaction data (from enhanced agent)
            if (includeInteractions && window.agentSessionAwareness) {
                report.userInteractions = this.collectInteractionData();
            }

            // 8. Collect current state
            if (includeState && this.agentSystem) {
                report.state = await this.collectStateData();
            }

            // 9. Collect metrics
            if (includeMetrics && window.enhancedAgentMonitoring) {
                report.metrics = this.collectMetricsData();
            }

            // 10. Collect errors
            if (includeErrors && window.enhancedAgentMonitoring) {
                report.errors = this.collectErrorsData();
            }

            // 11. Generate summary
            report.summary = this.generateSummary(report);

            console.log('[ResearchSessionReport] Report generated successfully');
            return report;

        } catch (error) {
            console.error('[ResearchSessionReport] Error generating report:', error);
            report.error = {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            };
            return report;
        }
    }

    /**
     * Collect session data
     */
    async collectSessionData(sessionId) {
        const sessionData = {
            sessionId: sessionId || this.agentSystem?.getSessionId() || 'unknown',
            startTime: null,
            lastActivity: null,
            duration: null,
            interactionCount: 0
        };

        // Get from enhanced session awareness if available
        if (window.agentSessionAwareness && window.agentSessionAwareness.enabled) {
            const summary = window.agentSessionAwareness.getSessionSummary();
            sessionData.sessionId = summary.sessionId || sessionData.sessionId;
            sessionData.startTime = summary.startTime;
            sessionData.lastActivity = summary.lastActivity;
            sessionData.duration = summary.duration;
            sessionData.interactionCount = summary.conversationCount || 0;
            sessionData.navigationCount = summary.navigationCount || 0;
        }

        // Get from Redis if available
        if (this.redis && this.redis.isReady() && sessionId) {
            try {
                const redisSession = await this.redis.getSession(sessionId);
                if (redisSession) {
                    sessionData.startTime = redisSession.startTime || sessionData.startTime;
                    sessionData.lastActivity = redisSession.lastActivity || sessionData.lastActivity;
                }
            } catch (error) {
                console.warn('[ResearchSessionReport] Error getting Redis session:', error);
            }
        }

        return sessionData;
    }

    /**
     * Collect ALL interactions from multiple sources
     */
    async collectAllInteractions(maxItems = 10000, conversationHistory = []) {
        const allInteractions = [];
        
        // 1. Collect from provided conversation history (from client)
        if (conversationHistory && conversationHistory.length > 0) {
            console.log(`[ResearchSessionReport] Processing ${conversationHistory.length} messages from conversation history`);
            conversationHistory.forEach((msg, index) => {
                if (msg.role && msg.content) {
                    // Convert conversation format to interaction format
                    if (msg.role === 'user') {
                        // Find matching assistant response
                        const nextMsg = conversationHistory[index + 1];
                        allInteractions.push({
                            input: msg.content,
                            response: nextMsg && nextMsg.role === 'assistant' ? nextMsg.content : null,
                            timestamp: msg.timestamp || Date.now() - (conversationHistory.length - index) * 1000,
                            role: 'user',
                            source: 'conversationHistory'
                        });
                    } else if (msg.role === 'assistant' && index === 0) {
                        // First message is assistant (unlikely but handle it)
                        allInteractions.push({
                            input: null,
                            response: msg.content,
                            timestamp: msg.timestamp || Date.now() - conversationHistory.length * 1000,
                            role: 'assistant',
                            source: 'conversationHistory'
                        });
                    }
                }
            });
            console.log(`[ResearchSessionReport] Converted ${allInteractions.length} interactions from conversation history`);
        }
        
        // 2. Collect from Redis directly
        if (this.redis && this.redis.isReady()) {
            try {
                const redisInteractions = await this.redis.getAllInteractions(maxItems);
                console.log(`[ResearchSessionReport] Collected ${redisInteractions.length} interactions from Redis`);
                allInteractions.push(...redisInteractions.map(i => ({ ...i, source: 'redis' })));
            } catch (error) {
                console.warn('[ResearchSessionReport] Error collecting from Redis:', error);
            }
        }
        
        // 3. Collect from agent system memory
        if (this.agentSystem) {
            try {
                const memory = this.agentSystem.getMemory();
                if (memory) {
                    const memoryInteractions = await memory.loadAllHistory(maxItems);
                    console.log(`[ResearchSessionReport] Collected ${memoryInteractions.length} interactions from Memory`);
                    allInteractions.push(...memoryInteractions.map(i => ({ ...i, source: 'memory' })));
                }
            } catch (error) {
                console.warn('[ResearchSessionReport] Error collecting from Memory:', error);
            }
        }
        
        // Deduplicate by timestamp and input
        const seen = new Set();
        const unique = allInteractions.filter(interaction => {
            const inputKey = (interaction.input || '').substring(0, 200);
            const timestamp = interaction.timestamp || 0;
            const key = `${timestamp}-${inputKey}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
        
        // Sort by timestamp
        unique.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        
        console.log(`[ResearchSessionReport] Total unique interactions collected: ${unique.length}`);
        return unique.slice(-maxItems); // Return last maxItems
    }

    /**
     * Collect relationship data from interactions
     */
    async collectRelationshipData(interactions) {
        if (!interactions || interactions.length === 0) {
            return [];
        }

        const relationships = [];
        const relationshipStats = {
            byCategory: {},
            averageConfidence: 0,
            averageSimilarity: 0
        };

        interactions.forEach((interaction, index) => {
            if (interaction.relationship) {
                const relData = {
                    index: index,
                    timestamp: interaction.timestamp,
                    input: interaction.input?.substring(0, 200) || '',
                    relationship: interaction.relationship,
                    confidence: interaction.confidence || null,
                    similarity: interaction.similarity || null,
                    transitionPhrase: interaction.transitionPhrase || null
                };

                relationships.push(relData);

                // Update stats
                const category = interaction.relationship;
                relationshipStats.byCategory[category] = (relationshipStats.byCategory[category] || 0) + 1;
            }
        });

        // Calculate averages
        const withConfidence = relationships.filter(r => r.confidence !== null);
        const withSimilarity = relationships.filter(r => r.similarity !== null);

        if (withConfidence.length > 0) {
            relationshipStats.averageConfidence = withConfidence.reduce((sum, r) => sum + r.confidence, 0) / withConfidence.length;
        }

        if (withSimilarity.length > 0) {
            relationshipStats.averageSimilarity = withSimilarity.reduce((sum, r) => sum + r.similarity, 0) / withSimilarity.length;
        }

        return {
            relationships: relationships.slice(-100), // Last 100 relationships
            statistics: relationshipStats,
            categoryLabels: {
                1: 'Direct continuation',
                2: 'Strong topical relatedness',
                3: 'Moderate topical relatedness',
                4: 'Logical pattern reinforcement',
                5: 'Logical clarification/refinement',
                6: 'Weak/unrelated shift',
                7: 'Explicit resumption',
                8: 'Contradiction/challenge',
                9: 'First interaction'
            }
        };
    }

    /**
     * Collect navigation data
     */
    collectNavigationData() {
        if (!window.agentSessionAwareness || !window.agentSessionAwareness.enabled) {
            return [];
        }

        const navigation = window.agentSessionAwareness.enhancedNavigationHistory || [];
        
        return navigation.map(nav => ({
            timestamp: nav.timestamp,
            from: nav.from,
            to: nav.to,
            trigger: nav.trigger,
            duration: nav.duration,
            intent: nav.intent,
            dataState: nav.dataState
        }));
    }

    /**
     * Collect conversation data
     */
    collectConversationData() {
        if (!window.agentSessionAwareness || !window.agentSessionAwareness.enabled) {
            return [];
        }

        const conversation = window.agentSessionAwareness.enhancedConversationHistory || [];
        
        return conversation.map(conv => ({
            timestamp: conv.timestamp,
            role: conv.role,
            message: conv.message,
            context: conv.context,
            metadata: conv.metadata
        }));
    }

    /**
     * Collect interaction data
     */
    collectInteractionData() {
        if (!window.agentSessionAwareness || !window.agentSessionAwareness.enabled) {
            return [];
        }

        const interactions = window.agentSessionAwareness.interactionHistory || [];
        
        return interactions.map(interaction => ({
            timestamp: interaction.timestamp,
            type: interaction.type,
            action: interaction.action,
            target: interaction.target,
            context: interaction.context,
            metadata: interaction.metadata
        }));
    }

    /**
     * Collect state data
     */
    async collectStateData() {
        if (!this.agentSystem) {
            return {};
        }

        try {
            const currentState = await this.agentSystem.getCurrentState();
            const recentTurns = await this.agentSystem.state?.getRecentTurns(10) || [];

            return {
                current: currentState,
                recentTurns: recentTurns.map(turn => ({
                    input: turn.input?.substring(0, 200) || '',
                    response: turn.response?.substring(0, 200) || '',
                    relationship: turn.relationship,
                    timestamp: turn.timestamp
                }))
            };
        } catch (error) {
            console.warn('[ResearchSessionReport] Error collecting state:', error);
            return {};
        }
    }

    /**
     * Collect metrics data
     */
    collectMetricsData() {
        if (!window.enhancedAgentMonitoring) {
            return {};
        }

        const metrics = window.enhancedAgentMonitoring.getMetricsSummary();
        
        return {
            health: metrics.health,
            errors: metrics.errors,
            warnings: metrics.warnings,
            performance: metrics.performance,
            featureUsage: metrics.featureUsage
        };
    }

    /**
     * Collect errors data
     */
    collectErrorsData() {
        if (!window.enhancedAgentMonitoring) {
            return [];
        }

        const metrics = window.enhancedAgentMonitoring.getMetricsSummary();
        return metrics.errors || [];
    }

    /**
     * Generate summary statistics
     */
    generateSummary(report) {
        const summary = {
            session: {
                duration: report.session.duration || 0,
                interactionCount: report.interactions?.length || 0,
                conversationCount: report.conversation?.length || 0,
                navigationCount: report.navigation?.length || 0
            },
            relationships: {
                total: report.relationships?.relationships?.length || 0,
                byCategory: report.relationships?.statistics?.byCategory || {},
                averageConfidence: report.relationships?.statistics?.averageConfidence || 0,
                averageSimilarity: report.relationships?.statistics?.averageSimilarity || 0
            },
            patterns: {
                recurringThemes: report.patterns?.recurringThemes?.length || 0,
                contradictions: report.patterns?.contradictions?.length || 0,
                chains: report.patterns?.chains?.length || 0
            },
            performance: {
                errors: report.errors?.length || 0,
                warnings: report.metrics?.warnings?.length || 0,
                healthStatus: report.metrics?.health?.status || 'unknown'
            },
            topics: this.extractTopics(report),
            insights: this.generateInsights(report)
        };

        return summary;
    }

    /**
     * Extract topics from interactions and conversation
     */
    extractTopics(report) {
        const topics = new Map();

        // Extract from interactions
        if (report.interactions && report.interactions.length > 0) {
            report.interactions.forEach(interaction => {
                const text = (interaction.input || interaction.response || '').toLowerCase();
                const words = text.split(/\s+/).filter(w => w.length > 4);
                words.forEach(word => {
                    topics.set(word, (topics.get(word) || 0) + 1);
                });
            });
        }

        // Extract from conversation
        if (report.conversation && report.conversation.length > 0) {
            report.conversation.forEach(conv => {
                const text = (conv.message || '').toLowerCase();
                const words = text.split(/\s+/).filter(w => w.length > 4);
                words.forEach(word => {
                    topics.set(word, (topics.get(word) || 0) + 1);
                });
            });
        }

        // Return top 10 topics
        return Array.from(topics.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));
    }

    /**
     * Generate insights from report data
     */
    generateInsights(report) {
        const insights = [];

        // Relationship insights
        if (report.relationships?.statistics) {
            const stats = report.relationships.statistics;
            const total = Object.values(stats.byCategory).reduce((sum, count) => sum + count, 0);
            
            if (total > 0) {
                const continuationRate = ((stats.byCategory[1] || 0) / total) * 100;
                if (continuationRate > 50) {
                    insights.push({
                        type: 'relationship',
                        message: `High continuation rate (${continuationRate.toFixed(1)}%) - user maintained focused discussion`,
                        priority: 'high'
                    });
                }

                const shiftRate = ((stats.byCategory[6] || 0) / total) * 100;
                if (shiftRate > 30) {
                    insights.push({
                        type: 'relationship',
                        message: `High topic shift rate (${shiftRate.toFixed(1)}%) - user explored multiple topics`,
                        priority: 'medium'
                    });
                }
            }
        }

        // Pattern insights
        if (report.patterns?.recurringThemes && report.patterns.recurringThemes.length > 0) {
            insights.push({
                type: 'pattern',
                message: `Identified ${report.patterns.recurringThemes.length} recurring themes in conversation`,
                priority: 'medium',
                data: report.patterns.recurringThemes.slice(0, 5)
            });
        }

        // Performance insights
        if (report.metrics?.health) {
            const health = report.metrics.health;
            if (health.status === 'unhealthy') {
                insights.push({
                    type: 'performance',
                    message: `System health degraded - ${health.recentErrorCount} errors in last 5 minutes`,
                    priority: 'high'
                });
            }
        }

        // Navigation insights
        if (report.navigation && report.navigation.length > 0) {
            const views = report.navigation.map(n => n.to.view).filter(Boolean);
            const uniqueViews = new Set(views).size;
            
            if (uniqueViews > 5) {
                insights.push({
                    type: 'navigation',
                    message: `User explored ${uniqueViews} different views during session`,
                    priority: 'low'
                });
            }
        }

        return insights;
    }

    /**
     * Format report as text (for PDF generation) - Professional Format
     */
    formatAsText(report) {
        const lines = [];
        const interactionCount = report.interactions?.length || 0;
        const dateStr = new Date(report.metadata.generatedAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Professional Header
        lines.push('');
        lines.push('╔' + '═'.repeat(98) + '╗');
        lines.push('║' + ' '.repeat(30) + 'RESEARCH SESSION REPORT' + ' '.repeat(44) + '║');
        lines.push('╚' + '═'.repeat(98) + '╝');
        lines.push('');
        lines.push(`Report Generated: ${dateStr}`);
        lines.push(`Session ID: ${report.metadata.sessionId}`);
        lines.push('');
        lines.push('═'.repeat(100));
        lines.push('');

        // Executive Summary - Professional Format
        lines.push('EXECUTIVE SUMMARY');
        lines.push('═'.repeat(100));
        lines.push('');
        
        const summaryItems = [];
        if (report.session.startTime) {
            summaryItems.push(`Session Start: ${new Date(report.session.startTime).toLocaleString()}`);
        }
        if (report.session.lastActivity) {
            summaryItems.push(`Last Activity: ${new Date(report.session.lastActivity).toLocaleString()}`);
        }
        if (report.session.duration) {
            const minutes = Math.floor(report.session.duration / 60000);
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            if (hours > 0) {
                summaryItems.push(`Session Duration: ${hours} hour${hours > 1 ? 's' : ''} and ${mins} minute${mins !== 1 ? 's' : ''}`);
            } else {
                summaryItems.push(`Session Duration: ${minutes} minute${minutes !== 1 ? 's' : ''}`);
            }
        }
        summaryItems.push(`Total Interactions: ${interactionCount}`);
        summaryItems.push(`Conversation Messages: ${report.summary.session.conversationCount || 0}`);
        summaryItems.push(`Navigation Events: ${report.summary.session.navigationCount || 0}`);
        
        summaryItems.forEach(item => {
            lines.push(`  • ${item}`);
        });
        lines.push('');
        
        // Key Statistics - Professional Format
        lines.push('KEY STATISTICS');
        lines.push('═'.repeat(100));
        lines.push('');
        
        const stats = [];
        if (report.summary.relationships.total > 0) {
            stats.push(`Relationship Analysis: ${report.summary.relationships.total} relationships detected`);
            stats.push(`  └─ Average Confidence: ${(report.summary.relationships.averageConfidence * 100).toFixed(1)}%`);
            stats.push(`  └─ Average Similarity: ${(report.summary.relationships.averageSimilarity * 100).toFixed(1)}%`);
        }
        if (report.summary.patterns.recurringThemes > 0) {
            stats.push(`Pattern Detection: ${report.summary.patterns.recurringThemes} recurring themes identified`);
        }
        if (report.summary.patterns.contradictions > 0) {
            stats.push(`Contradictions: ${report.summary.patterns.contradictions} contradictions detected`);
        }
        if (report.summary.topics && report.summary.topics.length > 0) {
            stats.push(`Topics Discussed: ${report.summary.topics.length} distinct topics`);
        }
        
        stats.forEach(stat => lines.push(`  • ${stat}`));
        if (stats.length === 0) {
            lines.push('  No statistics available');
        }
        lines.push('');

        // Relationship Analysis - Professional Format
        if (report.relationships && report.relationships.relationships.length > 0) {
            lines.push('RELATIONSHIP ANALYSIS');
            lines.push('═'.repeat(100));
            lines.push('');
            lines.push(`Total Relationships Analyzed: ${report.relationships.relationships.length}`);
            lines.push(`Average Confidence Score: ${(report.summary.relationships.averageConfidence * 100).toFixed(1)}%`);
            lines.push(`Average Similarity Score: ${(report.summary.relationships.averageSimilarity * 100).toFixed(1)}%`);
            lines.push('');
            lines.push('Relationship Category Distribution:');
            lines.push('');
            const sortedCategories = Object.entries(report.relationships.statistics.byCategory)
                .sort((a, b) => b[1] - a[1]);
            sortedCategories.forEach(([category, count]) => {
                const label = report.relationships.categoryLabels[category] || `Category ${category}`;
                const percentage = ((count / report.relationships.relationships.length) * 100).toFixed(1);
                const bar = '█'.repeat(Math.floor(percentage / 2));
                lines.push(`  ${category}. ${label.padEnd(45)} ${count.toString().padStart(4)} (${percentage}%) ${bar}`);
            });
            lines.push('');
        }

        // Pattern Analysis - Professional Format
        if (report.patterns) {
            lines.push('PATTERN ANALYSIS');
            lines.push('═'.repeat(100));
            lines.push('');
            if (report.patterns.recurringThemes && report.patterns.recurringThemes.length > 0) {
                lines.push('Recurring Themes Identified:');
                lines.push('');
                report.patterns.recurringThemes.slice(0, 15).forEach((theme, idx) => {
                    lines.push(`  ${(idx + 1).toString().padStart(2)}. ${theme.word.padEnd(30)} ─ ${theme.count} occurrence${theme.count !== 1 ? 's' : ''}`);
                });
                lines.push('');
            }
            if (report.patterns.contradictions && report.patterns.contradictions.length > 0) {
                lines.push(`Contradictions Detected: ${report.patterns.contradictions.length}`);
                lines.push('');
            }
            if (report.patterns.chains && report.patterns.chains.length > 0) {
                lines.push(`Inferred Logical Chains: ${report.patterns.chains.length}`);
                lines.push('');
            }
        }

        // Topics Discussed - Professional Format
        if (report.summary.topics && report.summary.topics.length > 0) {
            lines.push('TOPICS DISCUSSED');
            lines.push('═'.repeat(100));
            lines.push('');
            report.summary.topics.forEach((topic, index) => {
                lines.push(`  ${(index + 1).toString().padStart(2)}. ${topic.word.padEnd(40)} ─ ${topic.count} mention${topic.count !== 1 ? 's' : ''}`);
            });
            lines.push('');
        }

        // Insights - Professional Format
        if (report.summary.insights && report.summary.insights.length > 0) {
            lines.push('KEY INSIGHTS');
            lines.push('═'.repeat(100));
            lines.push('');
            report.summary.insights.forEach((insight, idx) => {
                const priorityIcon = insight.priority === 'high' ? '⚠' : insight.priority === 'medium' ? '•' : '○';
                lines.push(`  ${priorityIcon} [${insight.type.toUpperCase()}] ${insight.message}`);
            });
            lines.push('');
        }

        // Complete Interaction History - Professional Format
        if (report.interactions && report.interactions.length > 0) {
            lines.push('COMPLETE INTERACTION HISTORY');
            lines.push('═'.repeat(100));
            lines.push(`Total Interactions Documented: ${report.interactions.length}`);
            lines.push('');
            
            report.interactions.forEach((interaction, index) => {
                lines.push('');
                lines.push('╔' + '═'.repeat(98) + '╗');
                lines.push(`║ INTERACTION #${(index + 1).toString().padStart(String(report.interactions.length).length)} of ${report.interactions.length}`.padEnd(99) + '║');
                lines.push('╚' + '═'.repeat(98) + '╝');
                lines.push('');
                
                // Metadata section
                const metadata = [];
                if (interaction.timestamp) {
                    const date = new Date(interaction.timestamp);
                    metadata.push(`Timestamp: ${date.toLocaleString()}`);
                }
                if (interaction.relationship) {
                    const label = report.relationships?.categoryLabels?.[interaction.relationship] || `Category ${interaction.relationship}`;
                    metadata.push(`Relationship: ${label}`);
                }
                if (metadata.length > 0) {
                    metadata.forEach(m => lines.push(`  ${m}`));
                    lines.push('');
                }
                
                // User Input - Professional Format
                if (interaction.input) {
                    lines.push('  ┌─ USER INPUT ────────────────────────────────────────────────────────────────────────────┐');
                    const inputLines = this.wrapText(interaction.input, 88);
                    inputLines.forEach(line => {
                        lines.push(`  │ ${line.padEnd(88)} │`);
                    });
                    lines.push('  └───────────────────────────────────────────────────────────────────────────────────────────┘');
                    lines.push('');
                }
                
                // Assistant Response - Professional Format
                if (interaction.response) {
                    lines.push('  ┌─ ASSISTANT RESPONSE ───────────────────────────────────────────────────────────────────┐');
                    const responseLines = this.wrapText(interaction.response, 88);
                    responseLines.forEach(line => {
                        lines.push(`  │ ${line.padEnd(88)} │`);
                    });
                    lines.push('  └───────────────────────────────────────────────────────────────────────────────────────────┘');
                    lines.push('');
                }
                
                // Patterns if available
                if (interaction.patterns && interaction.patterns.length > 0) {
                    lines.push(`  Patterns: ${interaction.patterns.join(', ')}`);
                    lines.push('');
                }
            });
            lines.push('');
            lines.push('═'.repeat(100));
            lines.push('');
        }

        // Performance Metrics
        if (report.metrics) {
            lines.push('PERFORMANCE METRICS');
            lines.push('-'.repeat(80));
            if (report.metrics.health) {
                lines.push(`System Health: ${report.metrics.health.status}`);
                lines.push(`Total Errors: ${report.metrics.health.errorCount}`);
                lines.push(`Recent Errors: ${report.metrics.health.recentErrorCount}`);
            }
            lines.push('');
        }

        // Footer
        lines.push('='.repeat(80));
        lines.push('End of Report');
        lines.push('='.repeat(80));

        return lines.join('\n');
    }

    /**
     * Wrap text to specified width
     */
    wrapText(text, width) {
        if (!text) return [];
        const words = text.split(/\s+/);
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            if ((currentLine + word).length <= width) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            }
        });
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    /**
     * Format report as JSON
     */
    formatAsJSON(report) {
        return JSON.stringify(report, null, 2);
    }
}

module.exports = ResearchSessionReportGenerator;

