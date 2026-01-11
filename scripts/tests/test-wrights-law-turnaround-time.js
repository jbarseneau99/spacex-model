/**
 * Test wrightsLawTurnaroundTime parameter wiring
 * 
 * This script tests how wrightsLawTurnaroundTime affects the valuation
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

console.log('🧪 Testing wrightsLawTurnaroundTime Parameter\n');
console.log('=' .repeat(60));

// Test different wrightsLawTurnaroundTime values
const testCases = [
  { name: 'Base (0.05)', wrightsLawTurnaroundTime: 0.05 },
  { name: 'Lower (0.02)', wrightsLawTurnaroundTime: 0.02 },
  { name: 'Higher (0.10)', wrightsLawTurnaroundTime: 0.10 },
  { name: 'Much Higher (0.15)', wrightsLawTurnaroundTime: 0.15 }
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
    wrightsLawTurnaroundTime: 0.05 // Will be overridden
  },
  mars: {
    firstColonyYear: 2030,
    transportCostDecline: 0.20,
    populationGrowth: 0.50,
    industrialBootstrap: true
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

// Test each case
testCases.forEach((testCase, index) => {
  const inputs = JSON.parse(JSON.stringify(baseInputs));
  inputs.earth.wrightsLawTurnaroundTime = testCase.wrightsLawTurnaroundTime;
  
  const calculatedValue = calculationEngine.calculateEarthValuation(inputs, null);
  
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  wrightsLawTurnaroundTime: ${testCase.wrightsLawTurnaroundTime}`);
  console.log(`  Calculated Value: ${calculatedValue.toFixed(2)}B`);
  
  if (baseSpreadsheetBillions && index === 0) {
    const diff = calculatedValue - baseSpreadsheetBillions;
    const percentDiff = (diff / baseSpreadsheetBillions) * 100;
    console.log(`  Difference from Spreadsheet: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}B (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%)`);
  } else if (index > 0) {
    const baseCalculated = testCases[0].calculated || 123.46; // Use first test result
    const diff = calculatedValue - baseCalculated;
    const percentDiff = (diff / baseCalculated) * 100;
    console.log(`  Difference from Base: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}B (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%)`);
  }
  console.log('');
  
  // Store result for comparison
  testCase.calculated = calculatedValue;
});

console.log('=' .repeat(60));
console.log('\n📝 Analysis:');
console.log('Currently wrightsLawTurnaroundTime is read but NOT used in calculations.');
console.log('We need to wire it up to affect launch frequency and capacity.\n');
console.log('Expected behavior:');
console.log('  - Higher Wright\'s Law % = faster turnaround = more launches = higher revenue');
console.log('  - Lower Wright\'s Law % = slower turnaround = fewer launches = lower revenue\n');

