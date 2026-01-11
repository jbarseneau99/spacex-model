/**
 * Test script to verify comparables API is working correctly
 */

const http = require('http');

const testSectors = ['space', 'tech', 'telecom', 'aerospace'];
const apiProviders = ['yahoo-finance', 'alpha-vantage', 'financial-modeling-prep'];

async function testComparablesAPI(sector = 'tech', apiProvider = 'yahoo-finance') {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      sector: sector,
      apiProvider: apiProvider
    });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/comparables?${params.toString()}`,
      method: 'GET'
    };
    
    console.log(`\n🧪 Testing: ${sector} sector with ${apiProvider} API`);
    console.log(`   URL: http://${options.hostname}:${options.port}${options.path}`);
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Success: ${result.success}`);
          
          if (result.success) {
            if (result.data && Array.isArray(result.data)) {
              console.log(`   ✅ Companies loaded: ${result.data.length}`);
              
              if (result.data.length > 0) {
                console.log(`\n   📊 Sample company data:`);
                const sample = result.data[0];
                console.log(`      Name: ${sample.name}`);
                console.log(`      Ticker: ${sample.ticker}`);
                console.log(`      Market Cap: ${sample.marketCap ? `$${(sample.marketCap / 1e9).toFixed(2)}B` : '--'}`);
                console.log(`      EV/Revenue: ${sample.evRevenue ? sample.evRevenue.toFixed(2) + 'x' : '--'}`);
                console.log(`      EV/EBITDA: ${sample.evEbitda ? sample.evEbitda.toFixed(2) + 'x' : '--'}`);
                console.log(`      P/E Ratio: ${sample.peRatio ? sample.peRatio.toFixed(2) + 'x' : '--'}`);
                console.log(`      PEG Ratio: ${sample.pegRatio ? sample.pegRatio.toFixed(2) : '--'}`);
                console.log(`      Revenue Growth: ${sample.revenueGrowth ? (sample.revenueGrowth * 100).toFixed(1) + '%' : '--'}`);
                
                // Check data completeness
                const companiesWithData = result.data.filter(c => 
                  c.marketCap || c.evRevenue || c.evEbitda || c.peRatio
                );
                console.log(`\n   📈 Data completeness: ${companiesWithData.length}/${result.data.length} companies have financial data`);
                
                if (result.errors && result.errors.length > 0) {
                  console.log(`\n   ⚠️ Errors: ${result.errors.length}`);
                  result.errors.forEach(err => console.log(`      - ${err}`));
                }
              } else {
                console.log(`   ⚠️ No companies returned`);
              }
            } else {
              console.log(`   ❌ Invalid data format`);
            }
            
            if (result.note) {
              console.log(`   📝 Note: ${result.note}`);
            }
          } else {
            console.log(`   ❌ Error: ${result.error || 'Unknown error'}`);
            if (result.errors) {
              result.errors.forEach(err => console.log(`      - ${err}`));
            }
          }
          
          resolve(result);
        } catch (err) {
          console.log(`   ❌ Parse error: ${err.message}`);
          console.log(`   Raw response: ${data.substring(0, 200)}...`);
          reject(err);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`   ❌ Request error: ${err.message}`);
      console.log(`   Make sure the server is running on port 3000`);
      reject(err);
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Comparables API Tests\n');
  console.log('='.repeat(60));
  
  // Test each sector with Yahoo Finance (default, no API key needed)
  for (const sector of testSectors) {
    try {
      await testComparablesAPI(sector, 'yahoo-finance');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    } catch (err) {
      console.error(`Failed to test ${sector}:`, err.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Tests completed');
}

// Run tests
runTests().catch(console.error);



