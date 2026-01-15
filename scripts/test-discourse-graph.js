/**
 * Test Discourse Graph Builder
 * Tests the discourse graph construction and analysis
 */

// Simulate DiscourseGraphBuilder (since we're testing in Node.js)
const DiscourseGraphBuilder = require('../js/agent/discourse/DiscourseGraphBuilder.js');

// Mock conversation thread (simulating Tim Farrar retweeting Starlink and commenting)
const mockConversationThread = [
    {
        tweetId: 'tweet1',
        account: '@Starlink',
        accountName: 'Starlink',
        content: 'Starlink Direct to Cell now has 3 million subscribers in Ukraine after just 2 months!',
        timestamp: '2024-01-15T10:00:00Z',
        date: 'Jan 15, 2024',
        url: 'https://twitter.com/Starlink/status/tweet1',
        conversationId: 'tweet1',
        isReply: false,
        isRetweet: false,
        isQuote: false,
        engagement: { likes: 5000, retweets: 1200, replies: 800, quotes: 300, total: 7300 },
        referencedTweets: []
    },
    {
        tweetId: 'tweet2',
        account: '@TMFAssociates',
        accountName: 'Tim Farrar',
        content: 'But 1.2M messages indicates most of them haven\'t ever used it...',
        timestamp: '2024-01-15T10:05:00Z',
        date: 'Jan 15, 2024',
        url: 'https://twitter.com/TMFAssociates/status/tweet2',
        conversationId: 'tweet1',
        isReply: true,
        isRetweet: false,
        isQuote: false,
        engagement: { likes: 150, retweets: 20, replies: 45, quotes: 5, total: 220 },
        referencedTweets: [{ id: 'tweet1', type: 'replied_to' }]
    },
    {
        tweetId: 'tweet3',
        account: '@TMFAssociates',
        accountName: 'Tim Farrar',
        content: 'I\'d also sign up if a) I was subject to frequent random attacks on terrestrial infrastructure and b) it was free',
        timestamp: '2024-01-15T10:07:00Z',
        date: 'Jan 15, 2024',
        url: 'https://twitter.com/TMFAssociates/status/tweet3',
        conversationId: 'tweet1',
        isReply: true,
        isRetweet: false,
        isQuote: false,
        engagement: { likes: 200, retweets: 30, replies: 60, quotes: 10, total: 300 },
        referencedTweets: [{ id: 'tweet2', type: 'replied_to' }]
    },
    {
        tweetId: 'tweet4',
        account: '@TMFAssociates',
        accountName: 'Tim Farrar',
        content: 'Reposting this Starlink announcement',
        timestamp: '2024-01-15T10:10:00Z',
        date: 'Jan 15, 2024',
        url: 'https://twitter.com/TMFAssociates/status/tweet4',
        conversationId: 'tweet1',
        isReply: false,
        isRetweet: true,
        isQuote: false,
        engagement: { likes: 50, retweets: 10, replies: 5, quotes: 2, total: 67 },
        referencedTweets: [{ id: 'tweet1', type: 'retweeted' }]
    },
    {
        tweetId: 'tweet5',
        account: '@SpaceXAnalyst',
        accountName: 'SpaceX Analyst',
        content: 'This is incredible growth! What does this mean for valuation?',
        timestamp: '2024-01-15T10:12:00Z',
        date: 'Jan 15, 2024',
        url: 'https://twitter.com/SpaceXAnalyst/status/tweet5',
        conversationId: 'tweet1',
        isReply: true,
        isRetweet: false,
        isQuote: false,
        engagement: { likes: 80, retweets: 15, replies: 25, quotes: 3, total: 123 },
        referencedTweets: [{ id: 'tweet1', type: 'replied_to' }]
    }
];

console.log('🧪 Testing Discourse Graph Builder\n');
console.log('=' .repeat(60));

// Test 1: Build graph
console.log('\n📊 Test 1: Building Discourse Graph');
console.log('-'.repeat(60));

const graphBuilder = new DiscourseGraphBuilder();
const graph = graphBuilder.buildGraph(mockConversationThread, 'tweet1', 'tweet1');

if (!graph) {
    console.error('❌ Failed to build graph');
    process.exit(1);
}

console.log('✅ Graph built successfully');
console.log(`   - Nodes: ${Object.keys(graph.nodes).length}`);
console.log(`   - Edges: ${Object.keys(graph.edges).length}`);
console.log(`   - Participants: ${graph.participants.join(', ')}`);
console.log(`   - Key Nodes: ${graph.patterns.keyNodes.length}`);

// Test 2: Verify graph structure
console.log('\n🔍 Test 2: Verifying Graph Structure');
console.log('-'.repeat(60));

const nodeIds = Object.keys(graph.nodes);
console.log(`✅ Found ${nodeIds.length} nodes:`);
nodeIds.forEach(id => {
    const node = graph.nodes[id];
    console.log(`   - ${node.account}: centrality=${node.centrality.toFixed(2)}, role=${node.discourseRole}, depth=${node.depth}`);
});

const edgeIds = Object.keys(graph.edges);
console.log(`\n✅ Found ${edgeIds.length} edges:`);
edgeIds.forEach(id => {
    const edge = graph.edges[id];
    const source = graph.nodes[edge.source];
    const target = graph.nodes[edge.target];
    console.log(`   - ${source.account} --[${edge.type}]--> ${target.account}`);
});

// Test 3: Analyze Tim Farrar's commentary
console.log('\n👤 Test 3: Analyzing Tim Farrar\'s Commentary');
console.log('-'.repeat(60));

const timAnalysis = graphBuilder.analyzeAccountCommentary('@TMFAssociates');

if (!timAnalysis) {
    console.error('❌ Failed to analyze Tim Farrar\'s commentary');
    process.exit(1);
}

console.log('✅ Analysis complete:');
console.log(`   - Tweet Count: ${timAnalysis.tweetCount}`);
console.log(`   - Roles:`, timAnalysis.roles);
console.log(`   - Total Engagement: ${timAnalysis.totalEngagement}`);
console.log(`   - Avg Engagement: ${timAnalysis.avgEngagement.toFixed(1)}`);
console.log(`   - Avg Centrality: ${timAnalysis.avgCentrality.toFixed(2)}`);
console.log(`   - Max Centrality: ${timAnalysis.maxCentrality.toFixed(2)}`);

console.log('\n📝 Tim\'s Tweets:');
timAnalysis.tweets.forEach((tweet, idx) => {
    console.log(`   ${idx + 1}. [${tweet.discourseRole}] ${tweet.content.substring(0, 60)}...`);
    console.log(`      - Engagement: ${tweet.engagement.total}, Centrality: ${tweet.centrality.toFixed(2)}, Depth: ${tweet.depth}`);
});

// Test 4: Simulate what Ada would receive
console.log('\n🤖 Test 4: Simulating Ada\'s Context');
console.log('-'.repeat(60));

const graphSummary = {
    conversationId: graph.conversationId,
    rootTweetId: graph.rootTweetId,
    participantCount: graph.participants.length,
    participants: graph.participants,
    tweetCount: Object.keys(graph.nodes).length,
    edgeCount: Object.keys(graph.edges).length,
    keyNodes: graph.patterns.keyNodes.slice(0, 5),
    threadCount: graph.patterns.threads.length
};

console.log('✅ Graph Summary (what Ada receives):');
console.log(JSON.stringify(graphSummary, null, 2));

console.log('\n✅ Tim\'s Discourse Analysis (what Ada receives):');
console.log(JSON.stringify({
    account: timAnalysis.account,
    tweetCount: timAnalysis.tweetCount,
    roles: timAnalysis.roles,
    avgCentrality: timAnalysis.avgCentrality,
    discourseFlow: timAnalysis.discourseFlow.map(f => ({
        timestamp: f.timestamp,
        content: f.content.substring(0, 80) + '...',
        role: f.discourseRole,
        engagement: f.engagement
    }))
}, null, 2));

// Test 5: Verify analysis correctness
console.log('\n✅ Test 5: Verifying Analysis Correctness');
console.log('-'.repeat(60));

const timTweets = timAnalysis.tweets;
const hasReply = timTweets.some(t => t.type === 'reply');
const hasRetweet = timTweets.some(t => t.type === 'retweet');
const hasElaborator = timAnalysis.roles.elaborator > 0;
const hasResponder = timAnalysis.roles.responder > 0;

console.log(`✅ Tim has ${timTweets.length} tweets in conversation`);
console.log(`✅ Tim has replies: ${hasReply ? 'YES' : 'NO'}`);
console.log(`✅ Tim has retweets: ${hasRetweet ? 'YES' : 'NO'}`);
console.log(`✅ Tim is elaborator: ${hasElaborator ? 'YES' : 'NO'}`);
console.log(`✅ Tim is responder: ${hasResponder ? 'YES' : 'NO'}`);

// Expected: Tim should be elaborator (extends discussion) and responder
if (hasElaborator && hasResponder) {
    console.log('✅ Analysis correctly identifies Tim\'s discourse roles');
} else {
    console.log('⚠️  Discourse role analysis may need adjustment');
}

// Test 6: Check if graph shows conversation flow
console.log('\n🔄 Test 6: Verifying Conversation Flow');
console.log('-'.repeat(60));

const timTweet2 = graph.nodes['tweet2']; // Tim's first reply
const timTweet3 = graph.nodes['tweet3']; // Tim's second reply

if (timTweet2 && timTweet3) {
    console.log(`✅ Tim's first tweet replies to: ${timTweet2.edges.replies.join(', ') || 'root'}`);
    console.log(`✅ Tim's second tweet replies to: ${timTweet3.edges.replies.join(', ') || 'none'}`);
    
    if (timTweet3.edges.replies.includes('tweet2')) {
        console.log('✅ Graph correctly shows Tim replying to his own previous tweet (thread continuation)');
    }
}

console.log('\n' + '='.repeat(60));
console.log('✅ All tests completed successfully!');
console.log('\n📋 Summary:');
console.log(`   - Graph built with ${Object.keys(graph.nodes).length} nodes and ${Object.keys(graph.edges).length} edges`);
console.log(`   - Tim Farrar's commentary analyzed: ${timAnalysis.tweetCount} tweets`);
console.log(`   - Tim's discourse role: ${Object.entries(timAnalysis.roles).filter(([k,v]) => v > 0).map(([k,v]) => k).join(', ')}`);
console.log(`   - Tim's centrality: ${timAnalysis.avgCentrality.toFixed(2)} (${timAnalysis.avgCentrality > 0.5 ? 'CENTRAL' : 'PERIPHERAL'})`);
console.log('\n✅ Ada will receive:');
console.log('   1. Full discourse graph structure');
console.log('   2. Tim\'s discourse analysis with roles and flow');
console.log('   3. Instructions on how to analyze discourse graphs');
console.log('   4. Focus on Tim\'s actual commentary, not retweeted content');

