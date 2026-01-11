/**
 * Test transportCostDecline parameter wiring
 * 
 * This script tests how transportCostDecline affects Mars valuation
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

console.log('🧪 Testing transportCostDecline Parameter (Mars)\n');
console.log('=' .repeat(60));

// Test different transportCostDecline values
const testCases = [
  { name: 'Base (0.20)', transportCostDecline: 0.20 },
  { name: 'Lower (0.15)', transportCostDecline: 0.15 },
  { name: 'Higher (0.25)', transportCostDecline: 0.25 },
  { name: 'Much Higher (0.30)', transportCostDecline: 0.30 }
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
    transportCostDecline: 0.20, // Will be overridden
    populationGrowth: 0.50,
    industrialBootstrap: true
  },
  financial: {
    discountRate: 0.12,
    dilutionFactor: 0.15,
    terminalGrowth: 0.03
  }
};

// Get base spreadsheet value (K54 - Mars valuation)
const baseSpreadsheetValue = getSpreadsheetCellValue('Mars', 'K54');
const baseSpreadsheetBillions = baseSpreadsheetValue ? baseSpreadsheetValue / 1e9 : null;

console.log(`\n📊 Base Spreadsheet Mars Value (K54): ${baseSpreadsheetBillions?.toFixed(3)}B\n`);

// Test each case
testCases.forEach((testCase, index) => {
  const inputs = JSON.parse(JSON.stringify(baseInputs));
  inputs.mars.transportCostDecline = testCase.transportCostDecline;
  
  const calculatedValue = calculationEngine.calculateMarsValuation(inputs);
  
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  transportCostDecline: ${testCase.transportCostDecline}`);
  console.log(`  Calculated Mars Value: ${calculatedValue.toFixed(3)}B`);
  
  if (baseSpreadsheetBillions && index === 0) {
    const diff = calculatedValue - baseSpreadsheetBillions;
    const percentDiff = (diff / baseSpreadsheetBillions) * 100;
    console.log(`  Difference from Spreadsheet: ${diff > 0 ? '+' : ''}${diff.toFixed(3)}B (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%)`);
  } else if (index > 0) {
    const baseCalculated = testCases[0].calculated || 0.745; // Use first test result
    const diff = calculatedValue - baseCalculated;
    const percentDiff = (diff / baseCalculated) * 100;
    console.log(`  Difference from Base: ${diff > 0 ? '+' : ''}${diff.toFixed(3)}B (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%)`);
  }
  console.log('');
  
  // Store result for comparison
  testCase.calculated = calculatedValue;
});

console.log('=' .repeat(60));
console.log('\n📝 Analysis:');
console.log('Currently transportCostDecline is read but NOT used in Mars calculations.');
console.log('We need to wire it up to affect Mars valuation.\n');
console.log('Expected behavior:');
console.log('  - Higher transportCostDecline = lower transport costs = higher Mars valuation');
console.log('  - Lower transportCostDecline = higher transport costs = lower Mars valuation\n');

