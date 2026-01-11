/**
 * Test irrThresholdEarthToMars parameter wiring
 * 
 * This script tests how irrThresholdEarthToMars affects the valuation
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

console.log('🧪 Testing irrThresholdEarthToMars Parameter\n');
console.log('=' .repeat(60));

// Test different irrThresholdEarthToMars values
const testCases = [
  { name: 'Base (0.0)', irrThresholdEarthToMars: 0.0 },
  { name: 'Lower (-0.05)', irrThresholdEarthToMars: -0.05 },
  { name: 'Higher (0.05)', irrThresholdEarthToMars: 0.05 },
  { name: 'Much Higher (0.10)', irrThresholdEarthToMars: 0.10 }
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
    nonStarlinkLaunchMarketGrowth: 0.01,
    irrThresholdEarthToMars: 0.0 // Will be overridden
  },
  mars: {
    firstColonyYear: 2030,
    transportCostDecline: 0.20,
    populationGrowth: 0.50,
    industrialBootstrap: true,
    optimusCost2026: 50000,
    optimusAnnualCostDecline: 0.05,
    optimusProductivityMultiplier: 0.25,
    optimusLearningRate: 0.05,
    marsPayloadOptimusVsTooling: 0.01
  },
  financial: {
    discountRate: 0.12,
    dilutionFactor: 0.15,
    terminalGrowth: 0.03
  }
};

// Get base spreadsheet values
const baseEarthSpreadsheetValue = getSpreadsheetCellValue('Earth', 'O153');
const baseEarthSpreadsheetBillions = baseEarthSpreadsheetValue ? baseEarthSpreadsheetValue / 1e9 : null;
const baseB13SpreadsheetValue = getSpreadsheetCellValue('Earth', 'B13');
const baseB13SpreadsheetBillions = baseB13SpreadsheetValue ? baseB13SpreadsheetValue / 1e9 : null;

console.log(`\n📊 Base Spreadsheet Values:`);
console.log(`  Earth (O153): ${baseEarthSpreadsheetBillions?.toFixed(2)}B`);
console.log(`  Total Enterprise (B13): ${baseB13SpreadsheetBillions?.toFixed(2)}B\n`);

// Test each case
console.log('Note: irrThresholdEarthToMars affects decision logic for resource allocation.\n');
console.log('Lower threshold = switch to Mars earlier = potentially higher Mars value');
console.log('Higher threshold = stay on Earth longer = potentially higher Earth value\n');

testCases.forEach((testCase, index) => {
  const inputs = JSON.parse(JSON.stringify(baseInputs));
  inputs.earth.irrThresholdEarthToMars = testCase.irrThresholdEarthToMars;
  
  // Calculate both Earth and total to see impact
  const earthValue = calculationEngine.calculateEarthValuation(inputs, null);
  const marsValue = calculationEngine.calculateMarsValuation(inputs);
  const totalValue = calculationEngine.calculateTotalEnterpriseValue(inputs, null);
  
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  irrThresholdEarthToMars: ${testCase.irrThresholdEarthToMars}`);
  console.log(`  Earth Value: ${earthValue.toFixed(2)}B`);
  console.log(`  Mars Value: ${marsValue.toFixed(3)}B`);
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
console.log('Currently irrThresholdEarthToMars is read but NOT used in calculations.');
console.log('We need to wire it up to affect resource allocation between Earth and Mars.\n');
console.log('Expected behavior:');
console.log('  - Lower threshold = switch to Mars earlier = potentially higher Mars value');
console.log('  - Higher threshold = stay on Earth longer = potentially higher Earth value\n');
console.log('Note: This parameter affects strategic decision-making, not direct valuation.\n');
console.log('It may have minimal direct impact on valuation calculations.\n');

