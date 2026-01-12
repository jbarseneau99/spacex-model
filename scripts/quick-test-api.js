// Quick test - just one company
const http = require('http');

const req = http.get('http://localhost:3000/api/comparables?sector=tech&apiProvider=yahoo-finance', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('Status:', res.statusCode);
      console.log('Success:', result.success);
      if (result.success && result.data) {
        console.log(`\n✅ Got ${result.data.length} companies`);
        result.data.slice(0, 2).forEach(c => {
          console.log(`\n${c.name} (${c.ticker}):`);
          console.log(`  Market Cap: ${c.marketCap ? `$${(c.marketCap/1e9).toFixed(2)}B` : '--'}`);
          console.log(`  EV/Revenue: ${c.evRevenue || '--'}`);
          console.log(`  P/E: ${c.peRatio || '--'}`);
        });
      } else {
        console.log('Error:', result.error);
      }
    } catch (e) {
      console.log('Parse error:', e.message);
      console.log('Response:', data.substring(0, 200));
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.log('Error:', e.message);
  process.exit(1);
});

req.setTimeout(20000, () => {
  console.log('Timeout after 20s');
  req.destroy();
  process.exit(1);
});















