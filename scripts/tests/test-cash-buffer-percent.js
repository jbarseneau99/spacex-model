/**
 * Test cashBufferPercent parameter wiring
 * 
 * This script tests how cashBufferPercent affects the valuation
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

console.log('🧪 Testing cashBufferPercent Parameter\n');
console.log('=' .repeat(60));

// Test different cashBufferPercent values
const testCases = [
  { name: 'Base (0.10)', cashBufferPercent: 0.10 },
  { name: 'Lower (0.05)', cashBufferPercent: 0.05 },
  { name: 'Higher (0.20)', cashBufferPercent: 0.20 },
  { name: 'Much Higher (0.30)', cashBufferPercent: 0.30 }
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
    irrThresholdEarthToMars: 0.0,
    cashBufferPercent: 0.10 // Will be overridden
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

console.log(`\n📊 Base Spreadsheet Earth Value (O153): ${baseEarthSpreadsheetBillions?.toFixed(2)}B\n`);

// Test each case
testCases.forEach((testCase, index) => {
  const inputs = JSON.parse(JSON.stringify(baseInputs));
  inputs.earth.cashBufferPercent = testCase.cashBufferPercent;
  
  const earthValue = calculationEngine.calculateEarthValuation(inputs, null);
  
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  cashBufferPercent: ${testCase.cashBufferPercent}`);
  console.log(`  Calculated Earth Value: ${earthValue.toFixed(2)}B`);
  
  if (baseEarthSpreadsheetBillions && index === 0) {
    const diff = earthValue - baseEarthSpreadsheetBillions;
    const percentDiff = (diff / baseEarthSpreadsheetBillions) * 100;
    console.log(`  Difference from Spreadsheet: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}B (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%)`);
  } else if (index > 0) {
    const baseCalculated = testCases[0].calculated || 123.46; // Use first test result
    const diff = earthValue - baseCalculated;
    const percentDiff = (diff / baseCalculated) * 100;
    console.log(`  Difference from Base: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}B (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%)`);
  }
  console.log('');
  
  // Store result for comparison
  testCase.calculated = earthValue;
});

console.log('=' .repeat(60));
console.log('\n📝 Analysis:');
console.log('Currently cashBufferPercent is read but NOT used in calculations.');
console.log('We need to wire it up to affect cash flow and valuation.\n');
console.log('Expected behavior:');
console.log('  - Higher buffer = more cash held = lower available for investment = potentially lower valuation');
console.log('  - Lower buffer = less cash held = more available for investment = potentially higher valuation\n');
console.log('Note: Cash buffer affects cash flow constraints and opportunity costs.\n');

