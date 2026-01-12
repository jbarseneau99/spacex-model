/**
 * Test all three APIs and show actual data returned
 */

const http = require('http');

function testAPI(sector, apiProvider, alphaVantageKey = '', fmpKey = '') {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      sector: sector,
      apiProvider: apiProvider
    });
    
    if (alphaVantageKey) params.append('alphaVantageKey', alphaVantageKey);
    if (fmpKey) params.append('fmpKey', fmpKey);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/comparables?${params.toString()}`,
      method: 'GET',
      timeout: 35000
    };
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 Testing ${apiProvider.toUpperCase()} API`);
    console.log(`   Sector: ${sector}`);
    console.log(`   URL: http://localhost:3000${options.path}`);
    console.log('='.repeat(80));
    
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
            console.log(`   Fetched: ${result.fetched}/${result.total}`);
            
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
                
                // Count missing fields
                const missing = [];
                if (!company.marketCap) missing.push('marketCap');
                if (!company.evRevenue) missing.push('evRevenue');
                if (!company.evEbitda) missing.push('evEbitda');
                if (!company.peRatio) missing.push('peRatio');
                if (missing.length > 0) {
                  console.log(`   ⚠️ Missing fields: ${missing.join(', ')}`);
                }
              });
              
              // Summary
              const companiesWithMarketCap = result.data.filter(c => c.marketCap).length;
              const companiesWithEvRevenue = result.data.filter(c => c.evRevenue).length;
              const companiesWithEvEbitda = result.data.filter(c => c.evEbitda).length;
              const companiesWithPeRatio = result.data.filter(c => c.peRatio).length;
              
              console.log(`\n${'─'.repeat(80)}`);
              console.log(`DATA COMPLETENESS:`);
              console.log(`   Market Cap:    ${companiesWithMarketCap}/${result.data.length} companies`);
              console.log(`   EV/Revenue:    ${companiesWithEvRevenue}/${result.data.length} companies`);
              console.log(`   EV/EBITDA:     ${companiesWithEvEbitda}/${result.data.length} companies`);
              console.log(`   P/E Ratio:     ${companiesWithPeRatio}/${result.data.length} companies`);
            }
            
            if (result.errors && result.errors.length > 0) {
              console.log(`\n⚠️ ERRORS (${result.errors.length}):`);
              result.errors.forEach(err => console.log(`   - ${err}`));
            }
            
            if (result.note) {
              console.log(`\n📝 Note: ${result.note}`);
            }
          } else {
            console.log(`\n❌ FAILED`);
            console.log(`   Error: ${result.error || 'Unknown error'}`);
            if (result.errors && result.errors.length > 0) {
              console.log(`\n   Errors:`);
              result.errors.forEach(err => console.log(`     - ${err}`));
            }
            if (result.triedProviders) {
              console.log(`\n   Tried providers: ${result.triedProviders.join(', ')}`);
            }
          }
          
          resolve(result);
        } catch (err) {
          console.log(`\n❌ Parse error: ${err.message}`);
          console.log(`\nRaw response (first 1000 chars):`);
          console.log(data.substring(0, 1000));
          reject(err);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`\n❌ Connection error: ${err.message}`);
      reject(err);
    });
    
    req.on('timeout', () => {
      console.log(`\n⏱️ Request timeout after 35 seconds`);
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

async function runAllTests() {
  console.log('🚀 TESTING ALL COMPARABLES APIs');
  console.log('This will test each API and show you the actual data returned\n');
  
  // Check for API keys from localStorage (we'll need to get these from browser or env)
  const alphaVantageKey = process.env.ALPHA_VANTAGE_KEY || '';
  const fmpKey = process.env.FMP_KEY || '';
  
  console.log('API Keys configured:');
  console.log(`   Alpha Vantage: ${alphaVantageKey ? '✅ Yes' : '❌ No'}`);
  console.log(`   Financial Modeling Prep: ${fmpKey ? '✅ Yes' : '❌ No'}`);
  console.log(`   Yahoo Finance: ✅ No key needed`);
  
  const tests = [
    { provider: 'yahoo-finance', key: null },
  ];
  
  if (alphaVantageKey) {
    tests.push({ provider: 'alpha-vantage', key: alphaVantageKey });
  }
  
  if (fmpKey) {
    tests.push({ provider: 'financial-modeling-prep', key: fmpKey });
  }
  
  for (const test of tests) {
    try {
      await testAPI('tech', test.provider, alphaVantageKey, fmpKey);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between tests
    } catch (err) {
      console.log(`\n❌ Test failed: ${err.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ All tests completed');
  console.log('='.repeat(80));
}

runAllTests().catch(console.error);




