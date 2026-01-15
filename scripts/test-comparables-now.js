/**
 * Quick test of comparables API - shows actual data
 */

const http = require('http');

function testAPI(sector = 'tech') {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      sector: sector,
      apiProvider: 'yahoo-finance'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/comparables?${params.toString()}`,
      method: 'GET'
    };
    
    console.log(`\n🧪 Testing ${sector} sector...`);
    console.log(`   GET http://localhost:3000${options.path}\n`);
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.success && result.data) {
            console.log(`✅ SUCCESS! Loaded ${result.data.length} companies using ${result.apiProvider}`);
            console.log(`\n${'='.repeat(80)}`);
            console.log(`COMPARABLE COMPANIES DATA - ${sector.toUpperCase()} SECTOR`);
            console.log('='.repeat(80));
            
            result.data.forEach((company, index) => {
              console.log(`\n${index + 1}. ${company.name} (${company.ticker})`);
              console.log(`   Market Cap:    ${company.marketCap ? `$${(company.marketCap / 1e9).toFixed(2)}B` : '--'}`);
              console.log(`   EV/Revenue:    ${company.evRevenue ? company.evRevenue.toFixed(2) + 'x' : '--'}`);
              console.log(`   EV/EBITDA:     ${company.evEbitda ? company.evEbitda.toFixed(2) + 'x' : '--'}`);
              console.log(`   P/E Ratio:     ${company.peRatio ? company.peRatio.toFixed(2) + 'x' : '--'}`);
              console.log(`   PEG Ratio:     ${company.pegRatio ? company.pegRatio.toFixed(2) : '--'}`);
              console.log(`   Rev Growth:    ${company.revenueGrowth ? (company.revenueGrowth * 100).toFixed(1) + '%' : '--'}`);
            });
            
            console.log(`\n${'='.repeat(80)}`);
            console.log(`Summary: ${result.fetched}/${result.total} companies loaded`);
            if (result.errors && result.errors.length > 0) {
              console.log(`Errors: ${result.errors.length}`);
              result.errors.forEach(e => console.log(`  - ${e}`));
            }
            if (result.note) {
              console.log(`Note: ${result.note}`);
            }
          } else {
            console.log(`❌ FAILED: ${result.error || 'Unknown error'}`);
            if (result.errors) {
              result.errors.forEach(e => console.log(`   - ${e}`));
            }
          }
          
          resolve(result);
        } catch (err) {
          console.log(`❌ Parse error: ${err.message}`);
          console.log(`Raw response (first 500 chars):`);
          console.log(data.substring(0, 500));
          reject(err);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ Connection error: ${err.message}`);
      console.log(`   Make sure server is running: npm start or node server.js`);
      reject(err);
    });
    
    req.setTimeout(60000, () => {
      console.log(`❌ Request timeout after 60 seconds`);
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

async function runTest() {
  console.log('🚀 TESTING COMPARABLES API');
  console.log('='.repeat(80));
  
  try {
    await testAPI('tech');
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

runTest();





























