/**
 * Test Alpha Vantage API directly
 */

const apiKey = 'M2JTUA325Y4E94IY';
const ticker = 'TSLA';

console.log('🧪 Testing Alpha Vantage API directly...');
console.log(`   Ticker: ${ticker}`);
console.log(`   API Key: ${apiKey.substring(0, 8)}...`);

const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${apiKey}`;

console.log(`\n   Fetching: ${url.substring(0, 80)}...`);

fetch(url)
  .then(response => {
    console.log(`   Status: ${response.status} ${response.statusText}`);
    return response.json();
  })
  .then(data => {
    console.log('\n📊 RESPONSE:');
    
    if (data.Note && data.Note.includes('API call frequency')) {
      console.log('❌ Rate limit exceeded');
      console.log('   Note:', data.Note);
    } else if (data.Information && data.Information.includes('API call frequency')) {
      console.log('❌ Rate limit exceeded');
      console.log('   Information:', data.Information);
    } else if (data.Symbol) {
      console.log('✅ SUCCESS! API key is valid');
      console.log(`\n   Company: ${data.Name || 'N/A'}`);
      console.log(`   Symbol: ${data.Symbol}`);
      console.log(`   Market Cap: ${data.MarketCapitalization ? `$${(parseFloat(data.MarketCapitalization) / 1e9).toFixed(2)}B` : 'N/A'}`);
      console.log(`   EV/Revenue: ${data.EVToRevenue || 'N/A'}`);
      console.log(`   EV/EBITDA: ${data.EVToEBITDA || 'N/A'}`);
      console.log(`   P/E Ratio: ${data.PERatio || 'N/A'}`);
      console.log(`   PEG Ratio: ${data.PEGRatio || 'N/A'}`);
      console.log(`   Revenue Growth: ${data.RevenueGrowth ? (parseFloat(data.RevenueGrowth) / 100).toFixed(2) + '%' : 'N/A'}`);
      
      console.log('\n✅ Your Alpha Vantage API key is working!');
      console.log('\n📝 Next steps:');
      console.log('   1. Open the app in your browser');
      console.log('   2. Go to Settings → Financial Data API');
      console.log('   3. Select "Alpha Vantage"');
      console.log('   4. Enter your API key: M2JTUA325Y4E94IY');
      console.log('   5. Save settings');
      console.log('   6. Navigate to Ratios & Comparables view');
      console.log('   7. Data will load automatically!');
    } else {
      console.log('❌ Unexpected response format');
      console.log('   Response keys:', Object.keys(data));
      console.log('   Full response:', JSON.stringify(data, null, 2));
    }
  })
  .catch(error => {
    console.log(`\n❌ Error: ${error.message}`);
  });




















