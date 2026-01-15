#!/usr/bin/env node
/**
 * Check Grok Voice API Pricing Information
 * Shows pricing, usage estimates, and cost information
 */

require('dotenv').config();
const https = require('https');

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

console.log('💰 Grok Voice API Pricing Information\n');
console.log('='.repeat(60));

// Pricing information (from xAI documentation)
// Note: Pricing may vary - check xAI console for latest rates
const PRICING = {
  voice: {
    connectionTime: {
      perMinute: 0.05, // $0.05 per minute of connection time (bidirectional)
      description: 'Real-time voice connection (includes input + output)',
      source: 'xAI Voice API documentation'
    },
    // Alternative pricing model (if billed separately):
    input: {
      perMinute: 0.05, // Estimated if billed separately
      description: 'Audio input processing'
    },
    output: {
      perMinute: 0.05, // Estimated if billed separately
      description: 'Audio output generation'
    }
  },
  // Note: Grok Voice API pricing may vary - check xAI console for latest
  notes: [
    'Pricing is per minute of connection time (bidirectional)',
    'Current rate: ~$0.05 per minute',
    'Minimum charge may apply',
    'Pricing subject to change - verify in xAI console',
    'Billing is based on actual connection duration'
  ]
};

function calculateCost(connectionMinutes) {
  // Grok Voice API is billed per minute of connection time (bidirectional)
  const totalCost = connectionMinutes * PRICING.voice.connectionTime.perMinute;
  
  return {
    totalCost: totalCost.toFixed(4),
    connectionMinutes,
    ratePerMinute: PRICING.voice.connectionTime.perMinute
  };
}

function showPricingTable() {
  console.log('\n📊 Grok Voice API Pricing:');
  console.log('-'.repeat(60));
  console.log(`  Connection Time: $${PRICING.voice.connectionTime.perMinute} per minute`);
  console.log(`  Description: ${PRICING.voice.connectionTime.description}`);
  console.log(`  Note: Billed per minute of active connection (bidirectional)`);
  console.log('-'.repeat(60));
  
  console.log('\n💡 Cost Examples:');
  console.log('-'.repeat(60));
  
  const examples = [
    { minutes: 1, label: '1 minute conversation' },
    { minutes: 5, label: '5 minute conversation' },
    { minutes: 10, label: '10 minute conversation' },
    { minutes: 30, label: '30 minute conversation' },
    { minutes: 60, label: '1 hour conversation' },
    { minutes: 120, label: '2 hour conversation' }
  ];
  
  examples.forEach(example => {
    const cost = calculateCost(example.minutes);
    console.log(`  ${example.label.padEnd(25)}: $${cost.totalCost} (${cost.connectionMinutes} min)`);
  });
  
  console.log('-'.repeat(60));
  console.log(`\n  💰 Monthly Estimates:`);
  console.log(`  ${'Daily 30 min'.padEnd(25)}: $${calculateCost(30).totalCost} per day = $${(parseFloat(calculateCost(30).totalCost) * 30).toFixed(2)}/month`);
  console.log(`  ${'Daily 1 hour'.padEnd(25)}: $${calculateCost(60).totalCost} per day = $${(parseFloat(calculateCost(60).totalCost) * 30).toFixed(2)}/month`);
  console.log(`  ${'Daily 2 hours'.padEnd(25)}: $${calculateCost(120).totalCost} per day = $${(parseFloat(calculateCost(120).totalCost) * 30).toFixed(2)}/month`);
  console.log('-'.repeat(60));
}

async function checkCurrentUsage() {
  console.log('\n📈 Checking Current Account Status...');
  console.log('-'.repeat(60));
  
  if (!GROK_API_KEY) {
    console.log('  ⚠️  API key not configured');
    return;
  }
  
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
        if (res.statusCode === 200) {
          console.log('  ✅ API key is valid');
          console.log('  💡 Check xAI console for detailed usage and billing:');
          console.log('     https://console.x.ai/');
        } else if (res.statusCode === 429) {
          try {
            const error = JSON.parse(data);
            if (error.error && error.error.includes('credits')) {
              console.log('  ❌ Credits exhausted or spending limit reached');
              console.log(`  📋 ${error.error}`);
              console.log('  💡 Add credits at: https://console.x.ai/');
            } else {
              console.log('  ⚠️  Rate limited');
            }
          } catch (e) {
            console.log('  ⚠️  Rate limited (HTTP 429)');
          }
        } else if (res.statusCode === 401) {
          console.log('  ❌ API key is invalid');
        } else {
          console.log(`  ⚠️  Status: ${res.statusCode}`);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`  ❌ Error: ${error.message}`);
      resolve();
    });

    req.on('timeout', () => {
      console.log('  ⚠️  Request timeout');
      req.destroy();
      resolve();
    });

    req.end();
  });
}

function showUsageTips() {
  console.log('\n💡 Usage Tips:');
  console.log('-'.repeat(60));
  console.log('  1. Monitor usage in xAI console: https://console.x.ai/');
  console.log('  2. Set spending limits to avoid unexpected charges');
  console.log(`  3. Voice API is billed at $${PRICING.voice.connectionTime.perMinute} per minute of connection`);
  console.log('  4. Costs accumulate based on actual connection duration');
  console.log('  5. Check billing dashboard for detailed breakdown');
  console.log('  6. Connection time = total time WebSocket is open and active');
  console.log('-'.repeat(60));
}

function showCostCalculator() {
  console.log('\n🧮 Cost Calculator:');
  console.log('-'.repeat(60));
  console.log('  To estimate costs for your usage:');
  console.log('');
  console.log(`  Total Cost = Connection Minutes × $${PRICING.voice.connectionTime.perMinute}`);
  console.log('');
  console.log('  Example:');
  console.log('    - 10 minute voice conversation');
  console.log(`    - Cost = 10 × $${PRICING.voice.connectionTime.perMinute} = $${calculateCost(10).totalCost}`);
  console.log('');
  console.log('  Note: Connection time includes both input and output audio');
  console.log('        You are billed for the total duration of the connection');
  console.log('-'.repeat(60));
}

async function main() {
  showPricingTable();
  await checkCurrentUsage();
  showCostCalculator();
  showUsageTips();
  
  console.log('\n📋 Important Notes:');
  console.log('-'.repeat(60));
  PRICING.notes.forEach((note, i) => {
    console.log(`  ${i + 1}. ${note}`);
  });
  console.log('-'.repeat(60));
  console.log('\n🔗 Resources:');
  console.log('  - xAI Console: https://console.x.ai/');
  console.log('  - Billing Dashboard: https://console.x.ai/billing');
  console.log('  - API Documentation: https://docs.x.ai/');
  console.log('');
}

main().catch(console.error);

