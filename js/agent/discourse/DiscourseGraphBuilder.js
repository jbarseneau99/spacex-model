/**
 * Discourse Graph Builder
 * Builds a graph representation of Twitter conversation threads
 * to enable discourse analysis and pattern recognition
 */

class DiscourseGraphBuilder {
    constructor() {
        this.graph = null;
    }

    /**
     * Build discourse graph from conversation thread
     * @param {Array} conversationThread - Array of tweet objects
     * @param {string} conversationId - Root conversation ID
     * @param {string} rootTweetId - Root tweet ID
     * @returns {Object} Discourse graph structure
     */
    buildGraph(conversationThread, conversationId, rootTweetId) {
        if (!conversationThread || conversationThread.length === 0) {
            console.warn('[DiscourseGraphBuilder] No conversation thread provided');
            return null;
        }

        console.log(`[DiscourseGraphBuilder] Building graph from ${conversationThread.length} tweets`);
        console.log(`[DiscourseGraphBuilder] Conversation ID: ${conversationId}, Root Tweet ID: ${rootTweetId}`);

        const graph = {
            conversationId: conversationId,
            rootTweetId: rootTweetId,
            participants: new Set(),
            createdAt: null,
            updatedAt: null,
            nodes: {},
            edges: {},
            patterns: {
                threads: [],
                keyNodes: [],
                bridges: [],
                clusters: []
            }
        };

        // Step 1: Build nodes
        let nodesCreated = 0;
        conversationThread.forEach(tweet => {
            const tweetId = tweet.tweetId || tweet.id;
            if (!tweetId) return;

            const account = (tweet.account || tweet.accountName || '').replace(/^@/, '');
            graph.participants.add(account);

            const timestamp = new Date(tweet.timestamp || tweet.created_at);
            if (!graph.createdAt || timestamp < graph.createdAt) {
                graph.createdAt = timestamp;
            }
            if (!graph.updatedAt || timestamp > graph.updatedAt) {
                graph.updatedAt = timestamp;
            }

            // Determine tweet type
            let tweetType = 'tweet';
            if (tweet.isReply) tweetType = 'reply';
            else if (tweet.isRetweet) tweetType = 'retweet';
            else if (tweet.isQuote) tweetType = 'quote';

            graph.nodes[tweetId] = {
                id: tweetId,
                account: `@${account}`,
                accountName: tweet.accountName || account,
                content: tweet.content || tweet.text || '',
                timestamp: tweet.timestamp || tweet.created_at,
                url: tweet.url || `https://twitter.com/${account}/status/${tweetId}`,
                date: tweet.date,
                
                // Discourse properties
                type: tweetType,
                isRoot: tweetId === rootTweetId,
                depth: 0, // Will be computed later
                
                // Engagement metrics
                engagement: tweet.engagement || {
                    likes: 0,
                    retweets: 0,
                    replies: 0,
                    quotes: 0,
                    total: 0
                },
                
                // Graph metrics (computed)
                inDegree: 0,
                outDegree: 0,
                centrality: 0,
                betweenness: 0,
                
                // Discourse analysis
                discourseRole: null, // Will be computed
                sentiment: null,
                topicAlignment: null,
                
                // Relationships (outgoing edges)
                edges: {
                    replies: [],
                    retweets: [],
                    quotes: []
                },
                
                // Store original referenced tweets for edge building
                _referencedTweets: tweet.referencedTweets || []
            };

            // Calculate total engagement
            const eng = graph.nodes[tweetId].engagement;
            eng.total = (eng.likes || 0) + (eng.retweets || 0) + (eng.replies || 0) + (eng.quotes || 0);
            nodesCreated++;
        });

        console.log(`[DiscourseGraphBuilder] Created ${nodesCreated} nodes from ${conversationThread.length} tweets`);
        console.log(`[DiscourseGraphBuilder] Participants: ${Array.from(graph.participants).join(', ')}`);

        // Convert participants Set to Array
        graph.participants = Array.from(graph.participants);

        // Step 2: Build edges from relationships
        const edgesBefore = Object.keys(graph.edges).length;
        this.addEdges(graph, conversationThread);
        const edgesAfter = Object.keys(graph.edges).length;
        console.log(`[DiscourseGraphBuilder] Created ${edgesAfter - edgesBefore} edges (total: ${edgesAfter})`);

        // Step 3: Compute graph metrics
        this.computeGraphMetrics(graph);

        // Step 4: Identify discourse patterns
        this.identifyDiscoursePatterns(graph);

        // Step 5: Analyze discourse roles
        this.analyzeDiscourseRoles(graph);

        this.graph = graph;
        return graph;
    }

    /**
     * Add edges from tweet relationships
     */
    addEdges(graph, tweets) {
        let edgesCreated = 0;
        let tweetsWithoutRefs = 0;
        
        tweets.forEach(tweet => {
            const tweetId = tweet.tweetId || tweet.id;
            if (!tweetId || !graph.nodes[tweetId]) {
                console.warn(`[DiscourseGraphBuilder] Skipping tweet without ID or node:`, tweet);
                return;
            }

            // Check referenced tweets
            let referencedTweets = tweet.referencedTweets || tweet._referencedTweets || [];
            
            // FALLBACK: If no referencedTweets but we have conversationId and isReply/isRetweet/isQuote,
            // try to infer relationships from conversation structure
            if (referencedTweets.length === 0 && tweet.conversationId) {
                // If it's a reply, it likely replies to the root tweet or another tweet in the conversation
                if (tweet.isReply && tweet.conversationId !== tweetId) {
                    // Try to find the root tweet or most recent tweet in conversation
                    const rootTweet = graph.nodes[tweet.conversationId];
                    if (rootTweet) {
                        referencedTweets = [{ id: tweet.conversationId, type: 'replied_to' }];
                        console.log(`[DiscourseGraphBuilder] Inferred reply relationship: ${tweetId} -> ${tweet.conversationId}`);
                    }
                }
                // If it's a retweet, it retweets the root tweet
                if (tweet.isRetweet && tweet.conversationId !== tweetId) {
                    const rootTweet = graph.nodes[tweet.conversationId];
                    if (rootTweet) {
                        referencedTweets = [{ id: tweet.conversationId, type: 'retweeted' }];
                        console.log(`[DiscourseGraphBuilder] Inferred retweet relationship: ${tweetId} -> ${tweet.conversationId}`);
                    }
                }
            }
            
            if (referencedTweets.length === 0) {
                tweetsWithoutRefs++;
            }
            
            referencedTweets.forEach(ref => {
                const refId = ref.id || ref.tweet_id;
                if (!refId || !graph.nodes[refId]) {
                    console.warn(`[DiscourseGraphBuilder] Referenced tweet ${refId} not found in graph nodes`);
                    return;
                }

                const edgeId = `${refId}->${tweetId}`;
                const refType = ref.type || 'replied_to';
                
                // Map Twitter API types to our types
                let edgeType = 'reply';
                if (refType === 'retweeted') edgeType = 'retweet';
                else if (refType === 'quoted') edgeType = 'quote';
                else if (refType === 'replied_to') edgeType = 'reply';

                const sourceTimestamp = new Date(graph.nodes[refId].timestamp);
                const targetTimestamp = new Date(graph.nodes[tweetId].timestamp);
                const timeDelta = targetTimestamp - sourceTimestamp;

                graph.edges[edgeId] = {
                    id: edgeId,
                    source: refId,
                    target: tweetId,
                    type: edgeType,
                    direction: 'forward',
                    timeDelta: timeDelta,
                    relationship: null, // Will be analyzed
                    strength: 1.0,
                    semanticSimilarity: null,
                    topicOverlap: null
                };

                // Add to node edges
                if (edgeType === 'reply') {
                    graph.nodes[tweetId].edges.replies.push(refId);
                } else if (edgeType === 'retweet') {
                    graph.nodes[tweetId].edges.retweets.push(refId);
                } else if (edgeType === 'quote') {
                    graph.nodes[tweetId].edges.quotes.push(refId);
                }
                
                edgesCreated++;
            });
        });
        
        console.log(`[DiscourseGraphBuilder] Edge creation: ${edgesCreated} edges created, ${tweetsWithoutRefs} tweets without referencedTweets`);
    }

    /**
     * Compute graph metrics (centrality, degree, etc.)
     */
    computeGraphMetrics(graph) {
        // Compute in-degree and out-degree
        Object.values(graph.nodes).forEach(node => {
            node.inDegree = Object.values(graph.edges)
                .filter(edge => edge.target === node.id).length;
            
            node.outDegree = Object.values(graph.edges)
                .filter(edge => edge.source === node.id).length;
        });

        // Compute depth (distance from root)
        const computeDepth = (nodeId, visited = new Set()) => {
            if (visited.has(nodeId)) return 0;
            visited.add(nodeId);

            const node = graph.nodes[nodeId];
            if (node.isRoot) return 0;

            // Find edges pointing to this node
            const incomingEdges = Object.values(graph.edges)
                .filter(edge => edge.target === nodeId);

            if (incomingEdges.length === 0) return 0;

            // Depth is max depth of sources + 1
            const depths = incomingEdges.map(edge => 
                computeDepth(edge.source, visited)
            );
            return Math.max(...depths, 0) + 1;
        };

        Object.keys(graph.nodes).forEach(nodeId => {
            graph.nodes[nodeId].depth = computeDepth(nodeId);
        });

        // Compute centrality (simplified - use in-degree + engagement as proxy)
        const maxInDegree = Math.max(...Object.values(graph.nodes).map(n => n.inDegree), 1);
        const maxEngagement = Math.max(...Object.values(graph.nodes).map(n => n.engagement.total), 1);

        Object.values(graph.nodes).forEach(node => {
            const inDegreeScore = maxInDegree > 0 ? node.inDegree / maxInDegree : 0;
            const engagementScore = maxEngagement > 0 ? node.engagement.total / maxEngagement : 0;
            node.centrality = (inDegreeScore * 0.6 + engagementScore * 0.4); // Weighted combination
        });

        // Identify key nodes (high centrality + high engagement)
        graph.patterns.keyNodes = Object.values(graph.nodes)
            .filter(node => node.centrality > 0.3 || node.engagement.total > 50)
            .sort((a, b) => b.centrality - a.centrality)
            .map(node => node.id);
    }

    /**
     * Identify discourse patterns (threads, clusters)
     */
    identifyDiscoursePatterns(graph) {
        // Identify threads (conversation branches from root)
        const visited = new Set();
        
        const traverseThread = (nodeId, depth, participants, engagement) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);

            const node = graph.nodes[nodeId];
            participants.add(node.account);
            engagement += node.engagement.total;

            // Find replies to this tweet
            const replies = Object.values(graph.edges)
                .filter(edge => edge.source === nodeId && edge.type === 'reply')
                .map(edge => edge.target);

            let maxDepth = depth;
            replies.forEach(replyId => {
                const d = traverseThread(replyId, depth + 1, participants, 0);
                maxDepth = Math.max(maxDepth, d);
            });

            return maxDepth;
        };

        // Find root tweets (no incoming edges or isRoot flag)
        const rootTweets = Object.values(graph.nodes)
            .filter(node => node.isRoot || node.inDegree === 0);

        rootTweets.forEach(root => {
            const participants = new Set();
            let engagement = 0;
            const depth = traverseThread(root.id, 0, participants, 0);

            graph.patterns.threads.push({
                rootTweetId: root.id,
                participants: Array.from(participants),
                depth: depth,
                engagement: engagement
            });
        });
    }

    /**
     * Detect skepticism/challenge language in content
     */
    detectSkepticism(content) {
        if (!content || typeof content !== 'string') return false;
        
        const contentLower = content.toLowerCase();
        
        // Skeptical language patterns
        const skepticalPatterns = [
            /^but\s/i,                    // Starts with "But"
            /however/i,                    // "However"
            /actually/i,                   // "Actually"
            /indicates/i,                  // "Indicates" (often used to point out discrepancies)
            /suggests/i,                   // "Suggests" (often skeptical)
            /most.*haven't/i,             // "Most haven't"
            /most.*haven\s/i,             // "Most haven"
            /question/i,                   // "Question"
            /doubt/i,                      // "Doubt"
            /if\s+(a|b|i|you)/i,          // Conditional statements "if a)..., if b)..."
            /would.*if/i,                  // "Would...if" (conditional)
            /only.*if/i,                   // "Only if"
            /not.*sustainable/i,          // "Not sustainable"
            /caution/i,                    // "Caution"
            /concern/i,                    // "Concern"
            /worry/i,                      // "Worry"
            /discrepancy/i,                // "Discrepancy"
            /vs\s/i,                       // "vs" (comparison often indicates challenge)
            /\d+.*vs\s*\d+/i,             // Numbers with "vs" (e.g., "1.2M vs 3M")
        ];
        
        // Check for skeptical patterns
        const hasSkepticalPattern = skepticalPatterns.some(pattern => pattern.test(contentLower));
        
        // Check for conditional language (often indicates skepticism)
        const conditionalPatterns = [
            /if\s+(a|b|c|i|you|they)/i,
            /would.*if/i,
            /only.*if/i,
            /unless/i
        ];
        const hasConditional = conditionalPatterns.some(pattern => pattern.test(contentLower));
        
        // Check for contradiction indicators
        const contradictionIndicators = [
            /^but\s/i,
            /however/i,
            /actually/i,
            /in reality/i,
            /the reality is/i
        ];
        const hasContradiction = contradictionIndicators.some(pattern => pattern.test(contentLower));
        
        return {
            isSkeptical: hasSkepticalPattern || hasConditional || hasContradiction,
            hasConditional: hasConditional,
            hasContradiction: hasContradiction,
            confidence: (hasSkepticalPattern ? 0.4 : 0) + (hasConditional ? 0.3 : 0) + (hasContradiction ? 0.3 : 0)
        };
    }

    /**
     * Analyze discourse roles for each node
     */
    analyzeDiscourseRoles(graph) {
        Object.values(graph.nodes).forEach(node => {
            // First detect skepticism
            const skepticism = this.detectSkepticism(node.content);
            node.skepticism = skepticism;
            
            if (node.isRoot) {
                node.discourseRole = 'initiator';
            } else if (node.type === 'reply') {
                // If skeptical, prioritize challenger role
                if (skepticism.isSkeptical) {
                    node.discourseRole = 'challenger';
                } else if (node.outDegree > 0) {
                    node.discourseRole = 'elaborator';
                } else {
                    node.discourseRole = 'responder';
                }
            } else if (node.type === 'retweet') {
                // Check if retweet has skeptical context (replies before/after)
                const hasSkepticalContext = skepticism.isSkeptical;
                node.discourseRole = hasSkepticalContext ? 'challenger' : 'amplifier';
            } else if (node.type === 'quote') {
                node.discourseRole = 'challenger'; // Often used for disagreement
            } else {
                node.discourseRole = skepticism.isSkeptical ? 'challenger' : 'responder';
            }
        });
    }

    /**
     * Analyze account's commentary in the discourse graph
     * @param {string} accountName - Account name to analyze (with or without @)
     * @returns {Object} Account discourse analysis
     */
    analyzeAccountCommentary(accountName) {
        if (!this.graph) return null;

        const normalizedAccount = accountName.replace(/^@/, '').toLowerCase();
        const accountTweets = Object.values(this.graph.nodes)
            .filter(node => {
                const nodeAccount = (node.account || node.accountName || '').replace(/^@/, '').toLowerCase();
                return nodeAccount === normalizedAccount;
            });

        if (accountTweets.length === 0) return null;

        // Calculate roles
        const roles = {
            initiator: accountTweets.filter(t => t.discourseRole === 'initiator').length,
            responder: accountTweets.filter(t => t.discourseRole === 'responder').length,
            amplifier: accountTweets.filter(t => t.discourseRole === 'amplifier').length,
            elaborator: accountTweets.filter(t => t.discourseRole === 'elaborator').length,
            challenger: accountTweets.filter(t => t.discourseRole === 'challenger').length
        };

        // Calculate metrics
        const totalEngagement = accountTweets.reduce((sum, t) => sum + t.engagement.total, 0);
        const avgEngagement = totalEngagement / accountTweets.length;
        const avgCentrality = accountTweets.reduce((sum, t) => sum + t.centrality, 0) / accountTweets.length;
        const maxCentrality = Math.max(...accountTweets.map(t => t.centrality));

        // Build discourse flow (chronological)
        const discourseFlow = accountTweets
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map(tweet => ({
                timestamp: tweet.timestamp,
                content: tweet.content,
                type: tweet.type,
                discourseRole: tweet.discourseRole,
                engagement: tweet.engagement.total,
                centrality: tweet.centrality,
                depth: tweet.depth,
                repliesTo: tweet.edges.replies,
                retweets: tweet.edges.retweets,
                quotes: tweet.edges.quotes
            }));

        // Analyze overall skepticism
        const skepticalTweets = accountTweets.filter(t => t.skepticism?.isSkeptical);
        const isSkeptical = skepticalTweets.length > 0;
        const avgSkepticismConfidence = skepticalTweets.length > 0
            ? skepticalTweets.reduce((sum, t) => sum + (t.skepticism?.confidence || 0), 0) / skepticalTweets.length
            : 0;

        return {
            account: accountName,
            tweetCount: accountTweets.length,
            roles: roles,
            totalEngagement: totalEngagement,
            avgEngagement: avgEngagement,
            avgCentrality: avgCentrality,
            maxCentrality: maxCentrality,
            isSkeptical: isSkeptical,
            skepticalTweetCount: skepticalTweets.length,
            avgSkepticismConfidence: avgSkepticismConfidence,
            primaryDiscourseRole: Object.entries(roles)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || 'responder',
            tweets: accountTweets.map(tweet => ({
                id: tweet.id,
                content: tweet.content,
                timestamp: tweet.timestamp,
                date: tweet.date,
                engagement: tweet.engagement,
                centrality: tweet.centrality,
                type: tweet.type,
                discourseRole: tweet.discourseRole,
                depth: tweet.depth,
                skepticism: tweet.skepticism,
                repliesTo: tweet.edges.replies,
                retweets: tweet.edges.retweets,
                quotes: tweet.edges.quotes,
                url: tweet.url
            })),
            discourseFlow: discourseFlow
        };
    }

    /**
     * Get graph summary for Ada
     */
    getGraphSummary() {
        if (!this.graph) return null;

        return {
            conversationId: this.graph.conversationId,
            rootTweetId: this.graph.rootTweetId,
            participantCount: this.graph.participants.length,
            participants: this.graph.participants,
            tweetCount: Object.keys(this.graph.nodes).length,
            edgeCount: Object.keys(this.graph.edges).length,
            keyNodes: this.graph.patterns.keyNodes.slice(0, 5),
            threadCount: this.graph.patterns.threads.length,
            createdAt: this.graph.createdAt,
            updatedAt: this.graph.updatedAt
        };
    }
}

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiscourseGraphBuilder;
} else {
    window.DiscourseGraphBuilder = DiscourseGraphBuilder;
}

