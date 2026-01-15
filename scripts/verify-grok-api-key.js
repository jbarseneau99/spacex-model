#!/usr/bin/env node
/**
 * Verify Grok API Key - Check if key is valid, rate limited, or has other issues
 */

require('dotenv').config();
const https = require('https');

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

if (!GROK_API_KEY) {
  console.error('❌ GROK_API_KEY or XAI_API_KEY not set');
  process.exit(1);
}

console.log('🔑 Verifying Grok API Key\n');
console.log('='.repeat(60));

// Test 1: Check API key via models endpoint (most reliable)
async function testModelsEndpoint() {
  console.log('\n📋 Test 1: Testing API Key via /v1/models endpoint');
  console.log('-'.repeat(60));
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.x.ai',
      path: '/v1/models',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status Code: ${res.statusCode}`);
        console.log(`   Headers:`, JSON.stringify(res.headers, null, 2));
        
        if (res.statusCode === 200) {
          console.log('   ✅ API Key is VALID and working');
          try {
            const models = JSON.parse(data);
            console.log(`   📊 Available models: ${models.data?.length || 0}`);
            if (models.data && models.data.length > 0) {
              console.log(`   Models: ${models.data.map(m => m.id).join(', ')}`);
            }
          } catch (e) {
            console.log('   ⚠️  Could not parse response');
          }
          resolve({ valid: true, status: 200 });
        } else if (res.statusCode === 401) {
          console.log('   ❌ API Key is INVALID (HTTP 401 Unauthorized)');
          console.log(`   Response: ${data.substring(0, 500)}`);
          resolve({ valid: false, status: 401, error: 'Invalid API key' });
        } else if (res.statusCode === 429) {
          console.log('   ⚠️  API Key is RATE LIMITED (HTTP 429)');
          console.log(`   Response: ${data.substring(0, 500)}`);
          
          // Check for rate limit headers
          const retryAfter = res.headers['retry-after'] || res.headers['Retry-After'];
          if (retryAfter) {
            console.log(`   ⏱️  Retry after: ${retryAfter} seconds`);
          }
          
          resolve({ valid: true, status: 429, error: 'Rate limited' });
        } else if (res.statusCode === 402 || res.statusCode === 403) {
          console.log(`   ❌ API Key has PERMISSION/PAYMENT issue (HTTP ${res.statusCode})`);
          console.log(`   Response: ${data.substring(0, 500)}`);
          resolve({ valid: false, status: res.statusCode, error: 'Payment/permission issue' });
        } else {
          console.log(`   ⚠️  Unexpected status: ${res.statusCode}`);
          console.log(`   Response: ${data.substring(0, 500)}`);
          resolve({ valid: null, status: res.statusCode, error: 'Unexpected status' });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`   ❌ Request error: ${error.message}`);
      resolve({ valid: null, status: null, error: error.message });
    });

    req.on('timeout', () => {
      console.error('   ❌ Request timeout');
      req.destroy();
      resolve({ valid: null, status: null, error: 'Timeout' });
    });

    req.end();
  });
}

// Test 2: Try a simple chat completion (if not rate limited)
async function testChatEndpoint() {
  console.log('\n📋 Test 2: Testing API Key via /v1/chat/completions endpoint');
  console.log('-'.repeat(60));
  
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      model: 'grok-beta',
      messages: [
        { role: 'user', content: 'Say "test" if you can read this.' }
      ],
      max_tokens: 10
    });

    const options = {
      hostname: 'api.x.ai',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status Code: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          console.log('   ✅ Chat endpoint works - API key is valid');
          try {
            const response = JSON.parse(data);
            if (response.choices && response.choices[0]) {
              console.log(`   Response: ${response.choices[0].message.content}`);
            }
          } catch (e) {
            // Ignore parse errors
          }
          resolve({ valid: true, status: 200 });
        } else if (res.statusCode === 401) {
          console.log('   ❌ Chat endpoint: API Key is INVALID');
          console.log(`   Response: ${data.substring(0, 500)}`);
          resolve({ valid: false, status: 401 });
        } else if (res.statusCode === 429) {
          console.log('   ⚠️  Chat endpoint: RATE LIMITED');
          console.log(`   Response: ${data.substring(0, 500)}`);
          resolve({ valid: true, status: 429 });
        } else {
          console.log(`   ⚠️  Chat endpoint: Status ${res.statusCode}`);
          console.log(`   Response: ${data.substring(0, 500)}`);
          resolve({ valid: null, status: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`   ❌ Request error: ${error.message}`);
      resolve({ valid: null, status: null });
    });

    req.on('timeout', () => {
      console.error('   ❌ Request timeout');
      req.destroy();
      resolve({ valid: null, status: null });
    });

    req.write(payload);
    req.end();
  });
}

// Test 3: Check WebSocket with detailed error capture
async function testWebSocketDetailed() {
  console.log('\n📋 Test 3: Testing WebSocket Connection (Detailed)');
  console.log('-'.repeat(60));
  
  const WebSocket = require('ws');
  
  return new Promise((resolve) => {
    console.log('   🔌 Attempting WebSocket connection to wss://api.x.ai/v1/realtime...');
    
    const ws = new WebSocket('wss://api.x.ai/v1/realtime', {
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`
      }
    });

    const timeout = setTimeout(() => {
      console.log('   ⏱️  Connection timeout (15s)');
      ws.close();
      resolve({ connected: false, error: 'Timeout' });
    }, 15000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('   ✅ WebSocket connection SUCCESSFUL');
      console.log('   ✅ API key is VALID for WebSocket');
      ws.close();
      resolve({ connected: true });
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.log('   ❌ WebSocket connection FAILED');
      console.log(`   Error message: ${error.message}`);
      console.log(`   Error code: ${error.code || 'N/A'}`);
      console.log(`   Error type: ${error.type || 'N/A'}`);
      console.log(`   Error name: ${error.name || 'N/A'}`);
      
      // Check error details
      const errorString = String(error);
      const errorLower = errorString.toLowerCase();
      
      console.log(`\n   Error Analysis:`);
      
      if (errorLower.includes('429') || errorLower.includes('rate limit') || errorLower.includes('too many requests')) {
        console.log('   → This is a RATE LIMIT (HTTP 429)');
        console.log('   → API key is VALID but temporarily blocked');
        console.log('   → Wait 5-10 minutes and try again');
        resolve({ connected: false, error: 'Rate limited', keyValid: true });
      } else if (errorLower.includes('401') || errorLower.includes('unauthorized') || errorLower.includes('invalid')) {
        console.log('   → This is an AUTHENTICATION ERROR (HTTP 401)');
        console.log('   → API key is INVALID or expired');
        console.log('   → Check your API key in xAI console');
        resolve({ connected: false, error: 'Invalid key', keyValid: false });
      } else if (errorLower.includes('403') || errorLower.includes('forbidden')) {
        console.log('   → This is a PERMISSION ERROR (HTTP 403)');
        console.log('   → API key may not have WebSocket permissions');
        console.log('   → Check your xAI account permissions');
        resolve({ connected: false, error: 'Permission denied', keyValid: null });
      } else if (errorLower.includes('402') || errorLower.includes('payment')) {
        console.log('   → This is a PAYMENT ERROR (HTTP 402)');
        console.log('   → Account may have reached spending limit');
        console.log('   → Check your xAI account billing');
        resolve({ connected: false, error: 'Payment required', keyValid: null });
      } else {
        console.log('   → Unknown error type');
        console.log('   → Full error:', errorString.substring(0, 300));
        resolve({ connected: false, error: 'Unknown', keyValid: null });
      }
    });

    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      console.log(`   🔌 WebSocket closed: ${code} - ${reason.toString()}`);
      
      if (code === 1008) {
        console.log('   → Close code 1008 = Policy violation (often rate limit or invalid key)');
      } else if (code === 1006) {
        console.log('   → Close code 1006 = Abnormal closure (often rate limit)');
      } else if (code === 1000) {
        console.log('   → Close code 1000 = Normal closure');
      }
      
      resolve({ connected: false, code, reason: reason.toString() });
    });
  });
}

// Main verification flow
async function verifyAPIKey() {
  const modelsResult = await testModelsEndpoint();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
  
  const chatResult = await testChatEndpoint();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
  
  const wsResult = await testWebSocketDetailed();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n🔑 API Key Status:');
  
  if (modelsResult.valid === true && modelsResult.status === 200) {
    console.log('   ✅ API Key is CONFIRMED VALID');
    console.log('   ✅ HTTP API is working');
  } else if (modelsResult.valid === true && modelsResult.status === 429) {
    console.log('   ✅ API Key is VALID (confirmed by 429 response)');
    console.log('   ⚠️  Currently RATE LIMITED');
    console.log('   💡 Rate limit means key is valid but temporarily blocked');
  } else if (modelsResult.valid === false) {
    console.log('   ❌ API Key is INVALID');
    console.log('   💡 Check your API key in xAI console');
    console.log('   💡 Regenerate key if needed');
  } else {
    console.log('   ⚠️  Could not determine API key validity');
  }
  
  console.log('\n🌐 WebSocket Status:');
  if (wsResult.connected) {
    console.log('   ✅ WebSocket is working');
  } else if (wsResult.keyValid === true) {
    console.log('   ⚠️  WebSocket is rate limited (but key is valid)');
  } else if (wsResult.keyValid === false) {
    console.log('   ❌ WebSocket failed - API key may be invalid');
  } else {
    console.log('   ⚠️  WebSocket status unclear');
  }
  
  console.log('\n💡 Conclusion:');
  if (modelsResult.status === 429 || wsResult.error === 'Rate limited') {
    console.log('   ✅ API Key is VALID');
    console.log('   ⚠️  Currently RATE LIMITED (temporary block)');
    console.log('   ⏱️  Wait 5-10 minutes and try again');
    console.log('   ✅ Your code is correct - this is just a temporary block');
  } else if (modelsResult.valid === false || wsResult.keyValid === false) {
    console.log('   ❌ API Key is INVALID');
    console.log('   💡 Check xAI console and regenerate key');
  } else {
    console.log('   ⚠️  Status unclear - check error messages above');
  }
  
  console.log('\n');
}

verifyAPIKey().catch(console.error);










