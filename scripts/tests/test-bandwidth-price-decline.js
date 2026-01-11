/**
 * Test bandwidthPriceDecline parameter wiring
 * 
 * This script tests how bandwidthPriceDecline affects the valuation
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

console.log('🧪 Testing bandwidthPriceDecline Parameter\n');
console.log('=' .repeat(60));

// Test different bandwidthPriceDecline values
const testCases = [
  { name: 'Base (0.08)', bandwidthPriceDecline: 0.08 },
  { name: 'Lower (0.05)', bandwidthPriceDecline: 0.05 },
  { name: 'Higher (0.10)', bandwidthPriceDecline: 0.10 },
  { name: 'Much Higher (0.15)', bandwidthPriceDecline: 0.15 }
];

// Base inputs
const baseInputs = {
  earth: {
    starlinkPenetration: 0.15,
    launchVolume: 150,
    bandwidthPriceDecline: 0.08, // Will be overridden
    launchPriceDecline: 0.08
  },
  mars: {
    firstColonyYear: 2030,
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
  inputs.earth.bandwidthPriceDecline = testCase.bandwidthPriceDecline;
  
  const calculatedValue = calculationEngine.calculateEarthValuation(inputs, null);
  
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  bandwidthPriceDecline: ${testCase.bandwidthPriceDecline}`);
  console.log(`  Calculated Value: ${calculatedValue.toFixed(2)}B`);
  
  if (baseSpreadsheetBillions) {
    const diff = calculatedValue - baseSpreadsheetBillions;
    const percentDiff = (diff / baseSpreadsheetBillions) * 100;
    console.log(`  Difference from Base: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}B (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%)`);
  }
  console.log('');
});

console.log('=' .repeat(60));
console.log('\n📝 Analysis:');
console.log('Currently bandwidthPriceDecline is read but NOT used in calculations.');
console.log('We need to wire it up to affect pricing/revenue calculations.\n');

