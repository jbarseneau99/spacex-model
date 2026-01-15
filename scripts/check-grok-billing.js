#!/usr/bin/env node
/**
 * Check Grok API Billing Status
 * Shows the actual error message from Grok API
 */

require('dotenv').config();
const https = require('https');

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

if (!GROK_API_KEY) {
  console.error('❌ GROK_API_KEY or XAI_API_KEY not set');
  process.exit(1);
}

console.log('💰 Checking Grok API Billing Status\n');
console.log('='.repeat(60));

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
    console.log(`Status Code: ${res.statusCode}\n`);
    
    if (res.statusCode === 429) {
      try {
        const error = JSON.parse(data);
        console.log('❌❌❌ BILLING LIMIT REACHED ❌❌❌\n');
        console.log('Error Code:', error.code || 'N/A');
        console.log('Error Message:', error.error || 'N/A');
        console.log('\n' + '='.repeat(60));
        console.log('💡 SOLUTION:');
        console.log('   1. Go to https://console.x.ai/');
        console.log('   2. Check your account billing/credits');
        console.log('   3. Add credits or raise spending limit');
        console.log('   4. This is NOT a code issue - your code is correct!');
        console.log('='.repeat(60));
      } catch (e) {
        console.log('Raw response:', data);
      }
    } else if (res.statusCode === 200) {
      console.log('✅ API is working - no billing issues');
    } else {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.end();










