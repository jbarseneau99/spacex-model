#!/usr/bin/env node
/**
 * Diagnose Grok API Rate Limiting
 * Checks: API key validity, connection attempts, error details
 */

require('dotenv').config();
const WebSocket = require('ws');
const https = require('https');

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

if (!GROK_API_KEY) {
  console.error('❌ GROK_API_KEY or XAI_API_KEY not set');
  process.exit(1);
}

console.log('🔍 Diagnosing Grok API Rate Limiting\n');
console.log('='.repeat(60));

// Test 1: Check API key validity via HTTP endpoint
async function testAPIKeyValidity() {
  console.log('\n📋 Test 1: Checking API Key Validity');
  console.log('-'.repeat(60));
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.x.ai',
      path: '/v1/models',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status Code: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          console.log('   ✅ API Key is VALID');
          try {
            const models = JSON.parse(data);
            console.log(`   📊 Available models: ${models.data?.length || 0}`);
          } catch (e) {
            console.log('   ⚠️  Could not parse response');
          }
        } else if (res.statusCode === 429) {
          console.log('   ❌ API Key is RATE LIMITED (HTTP 429)');
          console.log('   ⚠️  This confirms rate limiting is active');
        } else if (res.statusCode === 401) {
          console.log('   ❌ API Key is INVALID (HTTP 401)');
        } else {
          console.log(`   ⚠️  Unexpected status: ${res.statusCode}`);
          console.log(`   Response: ${data.substring(0, 200)}`);
        }
        
        resolve(res.statusCode);
      });
    });

    req.on('error', (error) => {
      console.error(`   ❌ Request error: ${error.message}`);
      resolve(null);
    });

    req.setTimeout(10000, () => {
      console.error('   ❌ Request timeout');
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

// Test 2: Check WebSocket connection with detailed error info
function testWebSocketConnection() {
  console.log('\n📋 Test 2: Testing WebSocket Connection');
  console.log('-'.repeat(60));
  
  return new Promise((resolve) => {
    console.log('   🔌 Attempting WebSocket connection...');
    
    const ws = new WebSocket('wss://api.x.ai/v1/realtime', {
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`
      }
    });

    const timeout = setTimeout(() => {
      console.log('   ⏱️  Connection timeout (10s)');
      ws.close();
      resolve('timeout');
    }, 10000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('   ✅ WebSocket connection SUCCESSFUL');
      console.log('   ✅ Rate limit is NOT active for WebSocket');
      ws.close();
      resolve('success');
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.log('   ❌ WebSocket connection FAILED');
      console.log(`   Error message: ${error.message}`);
      console.log(`   Error code: ${error.code || 'N/A'}`);
      console.log(`   Error type: ${error.type || 'N/A'}`);
      
      const errorString = String(error);
      console.log(`   Full error string: ${errorString.substring(0, 200)}`);
      
      const isRateLimited = errorString.includes('429') || 
                           errorString.includes('Unexpected server response: 429') ||
                           errorString.includes('Too Many Requests');
      
      if (isRateLimited) {
        console.log('\n   ❌❌❌ RATE LIMIT CONFIRMED ❌❌❌');
        console.log('   This is a WebSocket rate limit (HTTP 429)');
        console.log('   Possible causes:');
        console.log('     1. Too many connection attempts recently');
        console.log('     2. API key spending limit reached');
        console.log('     3. Account-level rate limit');
        console.log('     4. Multiple processes trying to connect');
      } else {
        console.log('\n   ⚠️  Different error (not rate limit)');
        console.log('   This might be a different issue');
      }
      
      resolve('error');
    });

    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      console.log(`   🔌 WebSocket closed: ${code} - ${reason.toString()}`);
      
      if (code === 1008) {
        console.log('   ⚠️  Close code 1008 = Policy violation (often rate limit)');
      } else if (code === 1006) {
        console.log('   ⚠️  Close code 1006 = Abnormal closure (often rate limit)');
      }
      
      resolve('closed');
    });
  });
}

// Test 3: Check for multiple processes
function checkMultipleProcesses() {
  console.log('\n📋 Test 3: Checking for Multiple Processes');
  console.log('-'.repeat(60));
  
  const { execSync } = require('child_process');
  
  try {
    const processes = execSync('ps aux | grep -E "node.*server\\.js|grok" | grep -v grep', { encoding: 'utf-8' });
    const lines = processes.trim().split('\n').filter(l => l);
    
    console.log(`   Found ${lines.length} process(es):`);
    lines.forEach((line, i) => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[1];
      const cmd = parts.slice(10).join(' ');
      console.log(`   ${i + 1}. PID ${pid}: ${cmd.substring(0, 80)}`);
    });
    
    if (lines.length > 1) {
      console.log('\n   ⚠️  WARNING: Multiple processes detected!');
      console.log('   Multiple processes can cause rate limiting');
      console.log('   Kill extra processes: kill <PID>');
    } else {
      console.log('   ✅ Only one process running');
    }
  } catch (error) {
    console.log('   ⚠️  Could not check processes:', error.message);
  }
}

// Test 4: Check environment variables
function checkEnvironment() {
  console.log('\n📋 Test 4: Checking Environment');
  console.log('-'.repeat(60));
  
  const apiKey = GROK_API_KEY;
  console.log(`   API Key prefix: ${apiKey.substring(0, 10)}...`);
  console.log(`   API Key length: ${apiKey.length} characters`);
  
  if (apiKey.startsWith('xai-')) {
    console.log('   ✅ API Key format looks correct (xai-...)');
  } else {
    console.log('   ⚠️  API Key format might be incorrect');
  }
  
  const otherKeys = Object.keys(process.env).filter(k => 
    k.includes('GROK') || k.includes('XAI')
  );
  
  if (otherKeys.length > 2) {
    console.log(`   ⚠️  Found ${otherKeys.length} Grok-related env vars:`);
    otherKeys.forEach(k => {
      console.log(`      - ${k}`);
    });
  }
}

// Main diagnostic flow
async function runDiagnostics() {
  checkEnvironment();
  checkMultipleProcesses();
  
  const httpStatus = await testAPIKeyValidity();
  const wsResult = await testWebSocketConnection();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 DIAGNOSIS SUMMARY');
  console.log('='.repeat(60));
  
  if (httpStatus === 429) {
    console.log('❌ HTTP API is rate limited');
  } else if (httpStatus === 200) {
    console.log('✅ HTTP API is working');
  }
  
  if (wsResult === 'success') {
    console.log('✅ WebSocket API is working');
    console.log('\n✅✅✅ NO RATE LIMITING - Everything is working! ✅✅✅');
  } else if (wsResult === 'error') {
    console.log('❌ WebSocket API is rate limited or has errors');
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   1. Wait 5-10 minutes for rate limit to clear');
    console.log('   2. Check xAI console for account status');
    console.log('   3. Verify API key has available credits');
    console.log('   4. Ensure only ONE server process is running');
    console.log('   5. Check if other apps are using the same API key');
  } else {
    console.log('⚠️  WebSocket connection timed out or closed unexpectedly');
  }
  
  console.log('\n');
}

runDiagnostics().catch(console.error);

