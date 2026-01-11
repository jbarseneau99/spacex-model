/**
 * Test optimusCost2026 parameter wiring
 * 
 * This script tests how optimusCost2026 affects the valuation
 * and compares against spreadsheet behavior.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const CalculationEngine = require("../../lib/calculation-engine")');
const ValuationAlgorithms = require("../../lib/valuation-algorithms")');

// Load Excel data
const excelDataPath = path.join(__dirname, '..', 'excel_parsed_detailed.json');
if (!fs.existsSync(excelDataPath)) {
  console.error('❌ Excel data file not found:', excelDataPath);
  process.exit(1);
}

const excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf8'));
const calculationEngine = new CalculationEngine();
const valuationAlgorithms = new ValuationAlgorithms(excelData);

// Helper to get spreadsheet cell value
function getSpreadsheetCellValue(sheetName, cellRef) {
  try {
    const sheet = excelData[sheetName];
    if (!sheet || !sheet.cells) return null;
    const cell = sheet.cells[cellRef];
    if (!cell) return null;
    return typeof cell === 'object' && 'value' in cell ? cell.value : cell;
  } catch (error) {
    return null;
  }
}

console.log('🧪 Testing optimusCost2026 Parameter\n');
console.log('=' .repeat(60));

// Test different optimusCost2026 values
const testCases = [
  { name: 'Base (50000)', optimusCost2026: 50000 },
  { name: 'Lower (30000)', optimusCost2026: 30000 },
  { name: 'Higher (75000)', optimusCost2026: 75000 },
  { name: 'Much Higher (100000)', optimusCost2026: 100000 }
];

// Base inputs
const baseInputs = {
  earth: {
    starlinkPenetration: 0.15,
    launchVolume: 150,
    bandwidthPriceDecline: 0.08,
    launchPriceDecline: 0.08,
    starshipReusabilityYear: 2026,
    starshipCommercialViabilityYear: 2025,
    starshipPayloadCapacity: 75000,
    maxRocketProductionIncrease: 0.25,
    wrightsLawLaunchCost: 0.05,
    wrightsLawTurnaroundTime: 0.05,
    wrightsLawSatelliteGBPS: 0.07,
    realizedBandwidthTAMMultiplier: 0.5,
    starshipLaunchesForStarlink: 0.9,
    nonStarlinkLaunchMarketGrowth: 0.01
  },
  mars: {
    firstColonyYear: 2030,
    transportCostDecline: 0.20,
    populationGrowth: 0.50,
    industrialBootstrap: true,
    optimusCost2026: 50000 // Will be overridden
  },
  financial: {
    discountRate: 0.12,
    dilutionFactor: 0.15,
    terminalGrowth: 0.03
  }
};

// Get base spreadsheet value
const baseSpreadsheetValue = getSpreadsheetCellValue('Earth', 'O153');
const baseSpreadsheetBillions = baseSpreadsheetValue ? baseSpreadsheetValue / 1e9 : null;

console.log(`\n📊 Base Spreadsheet Value (O153): ${baseSpreadsheetBillions?.toFixed(2)}B\n`);

// Test each case - note: this affects Mars valuation, not Earth
console.log('Note: optimusCost2026 affects Mars valuation, not Earth valuation directly.');
console.log('Testing total enterprise value (Earth + Mars)...\n');

testCases.forEach((testCase, index) => {
  const inputs = JSON.parse(JSON.stringify(baseInputs));
  inputs.mars.optimusCost2026 = testCase.optimusCost2026;
  
  // Calculate both Earth and Mars to get total
  const earthValue = calculationEngine.calculateEarthValuation(inputs, null);
  const marsValue = calculationEngine.calculateMarsValuation(inputs);
  const totalValue = calculationEngine.calculateTotalEnterpriseValue(inputs, null);
  
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  optimusCost2026: $${testCase.optimusCost2026.toLocaleString()}`);
  console.log(`  Earth Value: ${earthValue.toFixed(2)}B`);
  console.log(`  Mars Value: ${marsValue.toFixed(2)}B`);
  console.log(`  Total Value: ${totalValue.toFixed(2)}B`);
  
  if (index > 0) {
    const baseTotal = testCases[0].total || 0;
    const diff = totalValue - baseTotal;
    const percentDiff = baseTotal > 0 ? (diff / baseTotal) * 100 : 0;
    console.log(`  Difference from Base Total: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}B (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%)`);
  }
  console.log('');
  
  // Store result for comparison
  testCase.earth = earthValue;
  testCase.mars = marsValue;
  testCase.total = totalValue;
});

console.log('=' .repeat(60));
console.log('\n📝 Analysis:');
console.log('Currently optimusCost2026 is read but NOT used in calculations.');
console.log('We need to wire it up to affect Mars colonization costs and valuation.\n');
console.log('Expected behavior:');
console.log('  - Higher cost = higher Mars costs = lower Mars valuation');
console.log('  - Lower cost = lower Mars costs = higher Mars valuation\n');

