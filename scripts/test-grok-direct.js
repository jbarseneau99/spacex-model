#!/usr/bin/env node

/**
 * Test direct connection to Grok Voice API (bypasses server)
 * This helps identify if the issue is with Grok API or our server
 */

require('dotenv').config();
const WebSocket = require('ws');

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

if (!GROK_API_KEY) {
    console.error('❌ GROK_API_KEY or XAI_API_KEY not found in .env');
    process.exit(1);
}

console.log('🧪 Testing Direct Grok Voice API Connection');
console.log('==========================================\n');
console.log('🔑 API Key:', GROK_API_KEY.substring(0, 10) + '...');
console.log('');

const grokUrl = 'wss://api.x.ai/v1/realtime';
console.log(`🔌 Connecting directly to: ${grokUrl}`);

const ws = new WebSocket(grokUrl, {
    headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`
    }
});

let sessionReady = false;
let testComplete = false;

const timeout = setTimeout(() => {
    if (!testComplete) {
        console.error('\n❌ Test timeout (15 seconds)');
        console.log(`   Session ready: ${sessionReady}`);
        ws.close();
        process.exit(1);
    }
}, 15000);

ws.on('open', () => {
    console.log('✅ Connected to Grok API');
    console.log('📤 Sending session configuration...');
    
    const sessionConfig = {
        type: 'session.update',
        session: {
            instructions: "You are a helpful voice assistant.",
            voice: "ara",
            turn_detection: { type: "server_vad" },
            audio: {
                input: { format: { type: "audio/pcm", rate: 24000 } },
                output: { format: { type: "audio/pcm", rate: 24000 } }
            }
        }
    };
    
    ws.send(JSON.stringify(sessionConfig));
    console.log('✅ Session config sent');
});

ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data.toString());
        const msgType = msg.type || 'unknown';
        
        console.log(`📨 Grok → Client: ${msgType}`);
        
        if (msgType === 'session.created' || msgType === 'session.updated') {
            sessionReady = true;
            console.log('✅ Session ready!');
            console.log('✅✅✅ DIRECT GROK CONNECTION WORKS ✅✅✅');
            testComplete = true;
            clearTimeout(timeout);
            ws.close();
            process.exit(0);
        } else if (msgType === 'error') {
            console.error('❌ Error from Grok:', JSON.stringify(msg, null, 2));
            testComplete = true;
            clearTimeout(timeout);
            ws.close();
            process.exit(1);
        } else if (msgType === 'ping') {
            // Ignore ping
        } else {
            console.log('📋 Message details:', JSON.stringify(msg, null, 2));
        }
    } catch (e) {
        console.log('📨 Received binary/non-JSON message');
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    if (error.message.includes('429')) {
        console.error('\n❌❌❌ GROK API RATE LIMITED ❌❌❌');
        console.error('Grok is rejecting connections due to rate limits.');
        console.error('Wait a few minutes and try again.');
    }
    testComplete = true;
    clearTimeout(timeout);
    process.exit(1);
});

ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket closed: ${code} - ${reason.toString()}`);
    if (code === 1006) {
        console.error('❌ Abnormal closure - Check if Grok API is accessible');
    }
    if (!testComplete) {
        testComplete = true;
        clearTimeout(timeout);
        process.exit(1);
    }
});


