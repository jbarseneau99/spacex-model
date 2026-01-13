#!/usr/bin/env node

/**
 * Test Grok API Rate Limiting
 * Connects directly to Grok API to see the actual error response
 */

require('dotenv').config();
const WebSocket = require('ws');

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

if (!GROK_API_KEY) {
  console.error('❌ Grok API key not configured');
  process.exit(1);
}

console.log('🔌 Testing Grok Voice API Connection...');
console.log(`API Key: ${GROK_API_KEY.substring(0, 10)}...${GROK_API_KEY.substring(GROK_API_KEY.length - 4)}`);
console.log('');

let connectionAttempts = 0;
const MAX_ATTEMPTS = 3;

function testConnection() {
  connectionAttempts++;
  console.log(`\n📡 Attempt ${connectionAttempts}/${MAX_ATTEMPTS}`);
  console.log('─'.repeat(60));
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://api.x.ai/v1/realtime', {
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`
      }
    });

    const timeout = setTimeout(() => {
      ws.removeAllListeners();
      ws.close();
      reject(new Error('Connection timeout (10s)'));
    }, 10000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket connection opened successfully!');
      console.log('✅ Ready state:', ws.readyState);
      ws.close();
      resolve({ success: true, message: 'Connected successfully' });
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.error('❌ WebSocket error occurred:');
      console.error('   Error message:', error.message);
      console.error('   Error code:', error.code);
      console.error('   Error type:', error.type);
      console.error('   Error name:', error.name);
      console.error('   Full error:', error);
      
      // Check if it's a rate limit
      const errorString = String(error);
      const isRateLimit = errorString.includes('429') || 
                         errorString.includes('Unexpected server response: 429') ||
                         errorString.includes('Too Many Requests');
      
      if (isRateLimit) {
        console.error('\n⚠️  RATE LIMIT DETECTED');
        console.error('   This indicates Grok API is rate limiting your connection attempts.');
        console.error('   Possible causes:');
        console.error('   1. Too many connection attempts in a short time');
        console.error('   2. API key has reached spending limit');
        console.error('   3. Account has hit rate limit threshold');
        console.error('   4. API key is invalid or expired');
        console.error('\n   Solutions:');
        console.error('   1. Wait 5-10 minutes before trying again');
        console.error('   2. Check your xAI console for account status');
        console.error('   3. Verify API key is valid and has credits');
        console.error('   4. Check if you have multiple connections open');
      }
      
      ws.removeAllListeners();
      ws.close();
      reject(error);
    });

    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      console.log(`\n🔌 WebSocket closed:`);
      console.log(`   Close code: ${code}`);
      console.log(`   Close reason: ${reason.toString()}`);
      
      // WebSocket close codes
      const closeCodeMeanings = {
        1000: 'Normal closure',
        1001: 'Going away',
        1002: 'Protocol error',
        1003: 'Unsupported data',
        1006: 'Abnormal closure',
        1008: 'Policy violation (often rate limit)',
        1009: 'Message too big',
        1011: 'Internal error',
        1012: 'Service restart',
        1013: 'Try again later',
        1014: 'Bad gateway',
        1015: 'TLS handshake failure'
      };
      
      if (closeCodeMeanings[code]) {
        console.log(`   Meaning: ${closeCodeMeanings[code]}`);
      }
      
      if (code === 1008) {
        console.error('\n⚠️  CLOSE CODE 1008 = POLICY VIOLATION');
        console.error('   This usually means rate limiting or authentication failure');
      }
      
      if (code !== 1000 && code !== 1001) {
        reject(new Error(`WebSocket closed with error code: ${code} - ${reason.toString()}`));
      } else {
        resolve({ success: true, message: 'Closed normally' });
      }
    });

    ws.on('unexpected-response', (request, response) => {
      clearTimeout(timeout);
      console.error('\n❌ Unexpected HTTP response:');
      console.error(`   Status code: ${response.statusCode}`);
      console.error(`   Status message: ${response.statusMessage}`);
      console.error(`   Headers:`, response.headers);
      
      // Read response body
      let body = '';
      response.on('data', (chunk) => {
        body += chunk.toString();
      });
      response.on('end', () => {
        console.error(`   Response body: ${body}`);
        
        if (response.statusCode === 429) {
          console.error('\n⚠️  HTTP 429 = TOO MANY REQUESTS');
          console.error('   This is a rate limit error from Grok API');
          console.error('   Response body:', body);
        }
        
        ws.removeAllListeners();
        ws.close();
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage} - ${body}`));
      });
    });
  });
}

async function runTests() {
  console.log('🧪 Grok API Rate Limit Test');
  console.log('='.repeat(60));
  
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const result = await testConnection();
      console.log('\n✅ SUCCESS:', result.message);
      process.exit(0);
    } catch (error) {
      console.error(`\n❌ Attempt ${i + 1} failed:`, error.message);
      
      if (i < MAX_ATTEMPTS - 1) {
        const waitTime = 2000 * (i + 1); // 2s, 4s, 6s
        console.log(`\n⏳ Waiting ${waitTime/1000}s before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('❌ All connection attempts failed');
  console.log('='.repeat(60));
  console.log('\n💡 Summary:');
  console.log('   The error "Unexpected server response: 429" is CORRECT');
  console.log('   This is how Node.js WebSocket library reports HTTP 429 errors');
  console.log('   Grok API is rate limiting your connection attempts');
  console.log('\n   Next steps:');
  console.log('   1. Wait 5-10 minutes');
  console.log('   2. Check xAI console: https://console.x.ai/');
  console.log('   3. Verify API key has credits');
  console.log('   4. Check account spending limits');
  console.log('');
  
  process.exit(1);
}

runTests().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});

