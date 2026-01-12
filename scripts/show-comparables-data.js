/**
 * Show comparables data - test what we're getting
 */

console.log('📊 TESTING COMPARABLES API DATA LOADING\n');
console.log('='.repeat(80));

// Test data structure that should be returned
const testData = {
  tech: [
    {
      name: 'Tesla, Inc.',
      ticker: 'TSLA',
      marketCap: 800e9,
      evRevenue: 8.2,
      evEbitda: 35.5,
      peRatio: 65.0,
      pegRatio: 1.8,
      revenueGrowth: 0.25
    },
    {
      name: 'Amazon.com, Inc.',
      ticker: 'AMZN',
      marketCap: 1500e9,
      evRevenue: 2.8,
      evEbitda: 18.5,
      peRatio: 45.0,
      pegRatio: 1.2,
      revenueGrowth: 0.12
    }
  ]
};

console.log('\n✅ EXPECTED DATA STRUCTURE:');
console.log(JSON.stringify(testData, null, 2));

console.log('\n📡 Testing actual API...');
console.log('   (This will show what the API actually returns)\n');

const http = require('http');

const req = http.get('http://localhost:3000/api/comparables?sector=tech&apiProvider=yahoo-finance', {
  timeout: 15000
}, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('\n📦 ACTUAL API RESPONSE:');
    try {
      const result = JSON.parse(data);
      console.log(JSON.stringify(result, null, 2));
      
      if (result.success && result.data) {
        console.log(`\n✅ SUCCESS! Got ${result.data.length} companies`);
        console.log(`   Using API: ${result.apiProvider}`);
        console.log(`\n📊 COMPANIES DATA:`);
        result.data.forEach((c, i) => {
          console.log(`\n${i+1}. ${c.name} (${c.ticker})`);
          console.log(`   Market Cap:    ${c.marketCap ? `$${(c.marketCap/1e9).toFixed(2)}B` : '--'}`);
          console.log(`   EV/Revenue:    ${c.evRevenue ? c.evRevenue.toFixed(2) + 'x' : '--'}`);
          console.log(`   EV/EBITDA:     ${c.evEbitda ? c.evEbitda.toFixed(2) + 'x' : '--'}`);
          console.log(`   P/E Ratio:     ${c.peRatio ? c.peRatio.toFixed(2) + 'x' : '--'}`);
          console.log(`   PEG Ratio:     ${c.pegRatio ? c.pegRatio.toFixed(2) : '--'}`);
          console.log(`   Rev Growth:    ${c.revenueGrowth ? (c.revenueGrowth*100).toFixed(1) + '%' : '--'}`);
        });
      } else {
        console.log(`\n❌ FAILED: ${result.error || 'Unknown error'}`);
        if (result.errors) {
          console.log('\nErrors:');
          result.errors.forEach(e => console.log(`  - ${e}`));
        }
      }
    } catch (e) {
      console.log('Parse error:', e.message);
      console.log('Raw response:', data.substring(0, 500));
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.log(`\n❌ Connection error: ${e.message}`);
  console.log('   Make sure server is running on port 3000');
  process.exit(1);
});

req.on('timeout', () => {
  console.log('\n⏱️ Request timeout - API is taking too long');
  console.log('   Yahoo Finance may be blocking requests');
  console.log('   Check server logs to see which API is being tried');
  req.destroy();
  process.exit(1);
});




