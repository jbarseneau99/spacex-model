/**
 * Test bandwidthPriceDecline against spreadsheet
 * 
 * This script tests how bandwidthPriceDecline affects valuation
 * and compares against spreadsheet behavior to verify correctness.
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

console.log('🧪 Testing bandwidthPriceDecline Against Spreadsheet\n');
console.log('=' .repeat(70));

// Base inputs matching spreadsheet base scenario
const baseInputs = {
  earth: {
    starlinkPenetration: 0.15,
    launchVolume: 150,
    bandwidthPriceDecline: 0.08, // Base value
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

// Get base spreadsheet value (O153)
const baseSpreadsheetValue = getSpreadsheetCellValue('Earth', 'O153');
const baseSpreadsheetBillions = baseSpreadsheetValue ? baseSpreadsheetValue / 1e9 : null;

console.log(`\n📊 Base Spreadsheet Value (O153): ${baseSpreadsheetBillions?.toFixed(2)}B\n`);

// Test different bandwidthPriceDecline values
const testCases = [
  { name: 'Base (0.08)', bandwidthPriceDecline: 0.08, expected: 'match base' },
  { name: 'Lower (0.05)', bandwidthPriceDecline: 0.05, expected: 'higher than base' },
  { name: 'Higher (0.10)', bandwidthPriceDecline: 0.10, expected: 'lower than base' },
  { name: 'Much Higher (0.15)', bandwidthPriceDecline: 0.15, expected: 'much lower than base' }
];

let allPassed = true;
const results = [];

testCases.forEach((testCase, index) => {
  const inputs = JSON.parse(JSON.stringify(baseInputs));
  inputs.earth.bandwidthPriceDecline = testCase.bandwidthPriceDecline;
  
  const calculatedValue = calculationEngine.calculateEarthValuation(inputs, null);
  
  let status = '✅';
  let note = '';
  
  if (index === 0) {
    // Base case: should match spreadsheet
    if (baseSpreadsheetBillions) {
      const diff = Math.abs(calculatedValue - baseSpreadsheetBillions);
      const percentDiff = (diff / baseSpreadsheetBillions) * 100;
      if (percentDiff > 5) {
        status = '❌';
        allPassed = false;
        note = ` (${percentDiff.toFixed(2)}% off - exceeds 5% tolerance)`;
      } else {
        note = ` (${percentDiff.toFixed(2)}% difference - within tolerance)`;
      }
    }
  } else {
    // Other cases: should show logical relationship
    const baseCalculated = results[0].calculated;
    const diff = calculatedValue - baseCalculated;
    const percentDiff = (diff / baseCalculated) * 100;
    
    if (testCase.bandwidthPriceDecline < 0.08 && diff <= 0) {
      status = '❌';
      allPassed = false;
      note = ` (Should be HIGHER than base, but is ${diff > 0 ? 'higher' : 'lower'})`;
    } else if (testCase.bandwidthPriceDecline > 0.08 && diff >= 0) {
      status = '❌';
      allPassed = false;
      note = ` (Should be LOWER than base, but is ${diff > 0 ? 'higher' : 'lower'})`;
    } else {
      note = ` (${diff > 0 ? '+' : ''}${percentDiff.toFixed(2)}% vs base)`;
    }
  }
  
  results.push({
    name: testCase.name,
    bandwidthPriceDecline: testCase.bandwidthPriceDecline,
    calculated: calculatedValue,
    status,
    note
  });
  
  console.log(`${status} Test ${index + 1}: ${testCase.name}`);
  console.log(`   bandwidthPriceDecline: ${testCase.bandwidthPriceDecline}`);
  console.log(`   Calculated Value: ${calculatedValue.toFixed(2)}B`);
  if (index === 0 && baseSpreadsheetBillions) {
    console.log(`   Spreadsheet Value: ${baseSpreadsheetBillions.toFixed(2)}B`);
  }
  console.log(`   ${note}`);
  console.log('');
});

console.log('=' .repeat(70));
console.log('\n📈 Summary:');
console.log(`   Base Spreadsheet: ${baseSpreadsheetBillions?.toFixed(2)}B`);
console.log(`   Base Calculated:  ${results[0].calculated.toFixed(2)}B`);

if (baseSpreadsheetBillions) {
  const baseDiff = Math.abs(results[0].calculated - baseSpreadsheetBillions);
  const basePercentDiff = (baseDiff / baseSpreadsheetBillions) * 100;
  console.log(`   Base Difference:  ${baseDiff.toFixed(2)}B (${basePercentDiff.toFixed(2)}%)`);
}

console.log(`\n   Parameter Impact:`);
console.log(`   - Lower decline (0.05): ${results[1].calculated.toFixed(2)}B (${((results[1].calculated - results[0].calculated) / results[0].calculated * 100).toFixed(2)}% vs base)`);
console.log(`   - Higher decline (0.10): ${results[2].calculated.toFixed(2)}B (${((results[2].calculated - results[0].calculated) / results[0].calculated * 100).toFixed(2)}% vs base)`);
console.log(`   - Much higher (0.15): ${results[3].calculated.toFixed(2)}B (${((results[3].calculated - results[0].calculated) / results[0].calculated * 100).toFixed(2)}% vs base)`);

console.log('\n' + '=' .repeat(70));

if (allPassed) {
  console.log('\n✅ RESULT: bandwidthPriceDecline is correctly wired!');
  console.log('   - Base case matches spreadsheet within tolerance');
  console.log('   - Parameter shows logical impact (lower decline = higher revenue)');
  console.log('   - Ready to move to next parameter\n');
  process.exit(0);
} else {
  console.log('\n❌ RESULT: Issues found with bandwidthPriceDecline wiring');
  console.log('   - Some tests failed - review needed before moving on\n');
  process.exit(1);
}

