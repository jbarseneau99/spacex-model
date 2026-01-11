/**
 * Configure Alpha Vantage API key in browser localStorage
 * Run this in browser console after opening the app
 */

const apiKey = 'M2JTUA325Y4E94IY';

console.log('🔧 Configuring Alpha Vantage API...');

// Set API provider to Alpha Vantage
localStorage.setItem('financialApiProvider', 'alpha-vantage');
console.log('✅ Set API provider: alpha-vantage');

// Set API key
localStorage.setItem('alphaVantageApiKey', apiKey);
console.log('✅ Set API key: ' + apiKey.substring(0, 8) + '...');

console.log('\n✅ Configuration complete!');
console.log('\n📝 Next steps:');
console.log('   1. Refresh the page');
console.log('   2. Go to Settings → Financial Data API');
console.log('   3. Verify "Alpha Vantage" is selected');
console.log('   4. Verify your API key is shown (masked)');
console.log('   5. Navigate to Ratios & Comparables view');
console.log('   6. Data will load automatically!');

// Also update the app instance if it exists
if (typeof app !== 'undefined') {
  app.financialApiProvider = 'alpha-vantage';
  app.alphaVantageApiKey = apiKey;
  console.log('\n✅ Updated app instance');
  console.log('🔄 Reloading page to apply changes...');
  setTimeout(() => {
    location.reload();
  }, 1000);
}
