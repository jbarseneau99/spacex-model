/**
 * Test Yahoo Finance API directly
 */

async function testYahooFinanceDirect(ticker) {
  console.log(`\n🧪 Testing Yahoo Finance directly for ${ticker}...`);
  
  try {
    const quoteUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryProfile,financialData,defaultKeyStatistics,keyStatistics`;
    
    console.log(`   URL: ${quoteUrl}`);
    console.log(`   Fetching...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const startTime = Date.now();
    const response = await fetch(quoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const duration = Date.now() - startTime;
    console.log(`   ✅ Response received (${duration}ms)`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`   ✅ Data parsed`);
    
    if (data.quoteSummary && data.quoteSummary.result && data.quoteSummary.result.length > 0) {
      const summary = data.quoteSummary.result[0];
      const profile = summary.summaryProfile || {};
      const keyStats = summary.defaultKeyStatistics || summary.keyStatistics || {};
      const financial = summary.financialData || {};
      
      console.log(`\n📊 DATA FOR ${ticker}:`);
      console.log(`   Name: ${profile.longName || profile.name || ticker}`);
      console.log(`   Market Cap: ${keyStats.marketCap?.raw ? `$${(keyStats.marketCap.raw / 1e9).toFixed(2)}B` : '❌ MISSING'}`);
      console.log(`   EV/Revenue: ${keyStats.enterpriseToRevenue?.raw ? keyStats.enterpriseToRevenue.raw.toFixed(2) + 'x' : '❌ MISSING'}`);
      console.log(`   EV/EBITDA: ${keyStats.enterpriseToEbitda?.raw ? keyStats.enterpriseToEbitda.raw.toFixed(2) + 'x' : '❌ MISSING'}`);
      console.log(`   P/E Ratio: ${keyStats.trailingPE?.raw || keyStats.forwardPE?.raw || '❌ MISSING'}`);
      console.log(`   PEG Ratio: ${keyStats.pegRatio?.raw || '❌ MISSING'}`);
      console.log(`   Revenue Growth: ${financial.revenueGrowth?.raw ? (financial.revenueGrowth.raw * 100).toFixed(1) + '%' : '❌ MISSING'}`);
      
      return {
        name: profile.longName || profile.name || ticker,
        ticker: ticker,
        marketCap: keyStats.marketCap?.raw || null,
        evRevenue: keyStats.enterpriseToRevenue?.raw || null,
        evEbitda: keyStats.enterpriseToEbitda?.raw || null,
        peRatio: keyStats.trailingPE?.raw || keyStats.forwardPE?.raw || null,
        pegRatio: keyStats.pegRatio?.raw || null,
        revenueGrowth: financial.revenueGrowth?.raw || null
      };
    } else {
      console.log(`   ❌ No data in response`);
      console.log(`   Response structure:`, Object.keys(data));
      return null;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`   ⏱️ TIMEOUT after 10 seconds`);
    } else {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    return null;
  }
}

async function runTest() {
  console.log('🚀 TESTING YAHOO FINANCE API DIRECTLY');
  console.log('='.repeat(80));
  
  const tickers = ['TSLA', 'AMZN', 'GOOGL'];
  
  for (const ticker of tickers) {
    const result = await testYahooFinanceDirect(ticker);
    if (result) {
      console.log(`\n✅ Successfully fetched data for ${ticker}`);
    } else {
      console.log(`\n❌ Failed to fetch data for ${ticker}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Test completed');
}

runTest().catch(console.error);



