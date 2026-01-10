/**
 * Test terminalGrowth parameter wiring
 * 
 * This script tests how terminalGrowth affects the valuation
 * and compares against spreadsheet behavior.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const CalculationEngine = require('../calculation-engine');
const ValuationAlgorithms = require('../valuation-algorithms');

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

console.log('🧪 Testing terminalGrowth Parameter\n');
console.log('=' .repeat(60));

// Test different terminalGrowth values
const testCases = [
  { name: 'Base (0.03)', terminalGrowth: 0.03 },
  { name: 'Lower (0.02)', terminalGrowth: 0.02 },
  { name: 'Higher (0.04)', terminalGrowth: 0.04 },
  { name: 'Much Higher (0.05)', terminalGrowth: 0.05 }
];

// Base inputs
const baseInputs = {
  earth: {
    starlinkPenetration: 0.15,
    launchVolume: 150,
    bandwidthPriceDecline: 0.08,
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
    terminalGrowth: 0.03 // Will be overridden
  }
};

// Get base spreadsheet value
const baseSpreadsheetValue = getSpreadsheetCellValue('Earth', 'O153');
const baseSpreadsheetBillions = baseSpreadsheetValue ? baseSpreadsheetValue / 1e9 : null;

console.log(`\n📊 Base Spreadsheet Value (O153): ${baseSpreadsheetBillions?.toFixed(2)}B\n`);

// Test each case
testCases.forEach((testCase, index) => {
  const inputs = JSON.parse(JSON.stringify(baseInputs));
  inputs.financial.terminalGrowth = testCase.terminalGrowth;
  
  const calculatedValue = calculationEngine.calculateEarthValuation(inputs, null);
  
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  terminalGrowth: ${testCase.terminalGrowth}`);
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
console.log('Currently terminalGrowth is read but NOT used in calculations.');
console.log('We need to wire it up to affect terminal value calculations.\n');
console.log('Expected behavior:');
console.log('  - Higher terminalGrowth = higher terminal value = higher valuation');
console.log('  - Lower terminalGrowth = lower terminal value = lower valuation\n');

