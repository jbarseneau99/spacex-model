/**
 * Test dilutionFactor parameter wiring
 * 
 * This script tests how dilutionFactor affects the valuation
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

console.log('🧪 Testing dilutionFactor Parameter\n');
console.log('=' .repeat(60));

// Test different dilutionFactor values
const testCases = [
  { name: 'Base (0.15)', dilutionFactor: 0.15 },
  { name: 'Lower (0.10)', dilutionFactor: 0.10 },
  { name: 'Higher (0.20)', dilutionFactor: 0.20 },
  { name: 'Much Higher (0.30)', dilutionFactor: 0.30 }
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
    optimusCost2026: 50000,
    optimusAnnualCostDecline: 0.05,
    optimusProductivityMultiplier: 0.25,
    optimusLearningRate: 0.05,
    marsPayloadOptimusVsTooling: 0.01
  },
  financial: {
    discountRate: 0.12,
    dilutionFactor: 0.15, // Will be overridden
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

// Test each case - note: dilutionFactor affects total enterprise value (B13)
console.log('Note: dilutionFactor affects total enterprise value (B13), not Earth valuation directly.\n');

testCases.forEach((testCase, index) => {
  const inputs = JSON.parse(JSON.stringify(baseInputs));
  inputs.financial.dilutionFactor = testCase.dilutionFactor;
  
  // Calculate total enterprise value
  const totalValue = calculationEngine.calculateTotalEnterpriseValue(inputs, null);
  
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  dilutionFactor: ${testCase.dilutionFactor}`);
  console.log(`  Calculated Total Value: ${totalValue.toFixed(2)}B`);
  
  if (baseB13SpreadsheetBillions && index === 0) {
    const diff = totalValue - baseB13SpreadsheetBillions;
    const percentDiff = (diff / baseB13SpreadsheetBillions) * 100;
    console.log(`  Difference from Spreadsheet: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}B (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%)`);
  } else if (index > 0) {
    const baseCalculated = testCases[0].calculated || 0; // Use first test result
    const diff = totalValue - baseCalculated;
    const percentDiff = baseCalculated > 0 ? (diff / baseCalculated) * 100 : 0;
    console.log(`  Difference from Base: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}B (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%)`);
  }
  console.log('');
  
  // Store result for comparison
  testCase.calculated = totalValue;
});

console.log('=' .repeat(60));
console.log('\n📝 Analysis:');
console.log('Currently dilutionFactor is read but NOT used in calculations.');
console.log('We need to wire it up to affect total enterprise value (B13).\n');
console.log('Expected behavior:');
console.log('  - Higher dilution = lower value per share = lower total enterprise value');
console.log('  - Lower dilution = higher value per share = higher total enterprise value\n');
console.log('Note: Dilution factor typically reduces enterprise value proportionally.\n');

