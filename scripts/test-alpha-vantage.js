/**
 * Test Alpha Vantage API with your paid key
 */

const http = require('http');

// Get API key from command line or environment
const apiKey = process.argv[2] || process.env.ALPHA_VANTAGE_KEY || '';

if (!apiKey) {
  console.log('❌ Please provide Alpha Vantage API key:');
  console.log('   node scripts/test-alpha-vantage.js YOUR_API_KEY');
  console.log('   OR set ALPHA_VANTAGE_KEY environment variable');
  process.exit(1);
}

function testAlphaVantage(ticker, apiKey) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      sector: 'tech',
      apiProvider: 'alpha-vantage',
      alphaVantageKey: apiKey
    });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/comparables?${params.toString()}`,
      method: 'GET',
      timeout: 60000
    };
    
    console.log(`\n🧪 Testing Alpha Vantage API with paid key`);
    console.log(`   Ticker: ${ticker}`);
    console.log(`   URL: http://localhost:3000${options.path.substring(0, 100)}...`);
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          console.log(`\n📊 RESPONSE:`);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Success: ${result.success}`);
          
          if (result.success && result.data && Array.isArray(result.data)) {
            console.log(`\n✅ SUCCESS! Got ${result.data.length} companies`);
            console.log(`   API Used: ${result.apiProvider}`);
            
            if (result.data.length > 0) {
              console.log(`\n${'─'.repeat(80)}`);
              console.log(`COMPANY DATA:`);
              console.log('─'.repeat(80));
              
              result.data.forEach((company, index) => {
                console.log(`\n${index + 1}. ${company.name || 'Unknown'} (${company.ticker || 'N/A'})`);
                console.log(`   Market Cap:    ${company.marketCap ? `$${(company.marketCap / 1e9).toFixed(2)}B` : '❌ MISSING'}`);
                console.log(`   EV/Revenue:    ${company.evRevenue ? company.evRevenue.toFixed(2) + 'x' : '❌ MISSING'}`);
                console.log(`   EV/EBITDA:     ${company.evEbitda ? company.evEbitda.toFixed(2) + 'x' : '❌ MISSING'}`);
                console.log(`   P/E Ratio:     ${company.peRatio ? company.peRatio.toFixed(2) + 'x' : '❌ MISSING'}`);
                console.log(`   PEG Ratio:     ${company.pegRatio ? company.pegRatio.toFixed(2) : '❌ MISSING'}`);
                console.log(`   Rev Growth:    ${company.revenueGrowth ? (company.revenueGrowth * 100).toFixed(1) + '%' : '❌ MISSING'}`);
              });
              
              console.log(`\n${'─'.repeat(80)}`);
              console.log(`✅ Alpha Vantage API is working!`);
              console.log(`   Configure this key in Settings → Financial Data API`);
            }
          } else {
            console.log(`\n❌ FAILED`);
            console.log(`   Error: ${result.error || 'Unknown error'}`);
            if (result.errors && result.errors.length > 0) {
              console.log(`\n   Errors:`);
              result.errors.forEach(err => console.log(`     - ${err}`));
            }
          }
          
          resolve(result);
        } catch (err) {
          console.log(`\n❌ Parse error: ${err.message}`);
          console.log(`\nRaw response (first 500 chars):`);
          console.log(data.substring(0, 500));
          reject(err);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`\n❌ Connection error: ${err.message}`);
      console.log('   Make sure server is running on port 3000');
      reject(err);
    });
    
    req.on('timeout', () => {
      console.log(`\n⏱️ Request timeout after 60 seconds`);
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

async function runTest() {
  console.log('🚀 TESTING ALPHA VANTAGE API (PAID KEY)');
  console.log('='.repeat(80));
  
  try {
    await testAlphaVantage('TSLA', apiKey);
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

runTest();








