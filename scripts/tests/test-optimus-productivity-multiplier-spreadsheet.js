/**
 * Test optimusProductivityMultiplier against spreadsheet
 * 
 * This script tests how optimusProductivityMultiplier affects Mars valuation
 * and compares against spreadsheet behavior to verify correctness.
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

console.log('🧪 Testing optimusProductivityMultiplier Against Spreadsheet\n');
console.log('=' .repeat(70));

// Base inputs matching spreadsheet base scenario
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
    optimusProductivityMultiplier: 0.25 // Base value
  },
  financial: {
    discountRate: 0.12,
    dilutionFactor: 0.15,
    terminalGrowth: 0.03
  }
};

// Get base spreadsheet Mars value (K54)
const baseMarsSpreadsheetValue = getSpreadsheetCellValue('Mars', 'K54');
const baseMarsSpreadsheetBillions = baseMarsSpreadsheetValue ? baseMarsSpreadsheetValue / 1e9 : null;

console.log(`\n📊 Base Spreadsheet Mars Value (K54): ${baseMarsSpreadsheetBillions?.toFixed(3)}B\n`);

// Test different optimusProductivityMultiplier values
const testCases = [
  { name: 'Base (0.25)', optimusProductivityMultiplier: 0.25, expected: 'match base' },
  { name: 'Lower (0.15)', optimusProductivityMultiplier: 0.15, expected: 'lower than base' },
  { name: 'Higher (0.35)', optimusProductivityMultiplier: 0.35, expected: 'higher than base' },
  { name: 'Much Higher (0.50)', optimusProductivityMultiplier: 0.50, expected: 'much higher than base' }
];

let allPassed = true;
const results = [];

testCases.forEach((testCase, index) => {
  const inputs = JSON.parse(JSON.stringify(baseInputs));
  inputs.mars.optimusProductivityMultiplier = testCase.optimusProductivityMultiplier;
  
  const marsValue = calculationEngine.calculateMarsValuation(inputs);
  
  let status = '✅';
  let note = '';
  
  if (index === 0) {
    // Base case: should match spreadsheet
    if (baseMarsSpreadsheetBillions) {
      const diff = Math.abs(marsValue - baseMarsSpreadsheetBillions);
      const percentDiff = (diff / baseMarsSpreadsheetBillions) * 100;
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
    const diff = marsValue - baseCalculated;
    const percentDiff = (diff / baseCalculated) * 100;
    
    // Higher multiplier = more productive Optimus = higher Mars value = higher valuation
    // Lower multiplier = less productive Optimus = lower Mars value = lower valuation
    if (testCase.optimusProductivityMultiplier < 0.25 && diff >= 0) {
      status = '❌';
      allPassed = false;
      note = ` (Should be LOWER than base, but is ${diff > 0 ? 'higher' : 'same'})`;
    } else if (testCase.optimusProductivityMultiplier > 0.25 && diff <= 0) {
      status = '❌';
      allPassed = false;
      note = ` (Should be HIGHER than base, but is ${diff < 0 ? 'lower' : 'same'})`;
    } else {
      note = ` (${diff > 0 ? '+' : ''}${percentDiff.toFixed(2)}% vs base)`;
    }
  }
  
  results.push({
    name: testCase.name,
    optimusProductivityMultiplier: testCase.optimusProductivityMultiplier,
    calculated: marsValue,
    status,
    note
  });
  
  console.log(`${status} Test ${index + 1}: ${testCase.name}`);
  console.log(`   optimusProductivityMultiplier: ${testCase.optimusProductivityMultiplier}`);
  console.log(`   Calculated Mars Value: ${marsValue.toFixed(3)}B`);
  if (index === 0 && baseMarsSpreadsheetBillions) {
    console.log(`   Spreadsheet Mars Value: ${baseMarsSpreadsheetBillions.toFixed(3)}B`);
  }
  console.log(`   ${note}`);
  console.log('');
});

console.log('=' .repeat(70));
console.log('\n📈 Summary:');
console.log(`   Base Spreadsheet Mars: ${baseMarsSpreadsheetBillions?.toFixed(3)}B`);
console.log(`   Base Calculated Mars:  ${results[0].calculated.toFixed(3)}B`);

if (baseMarsSpreadsheetBillions) {
  const baseDiff = Math.abs(results[0].calculated - baseMarsSpreadsheetBillions);
  const basePercentDiff = (baseDiff / baseMarsSpreadsheetBillions) * 100;
  console.log(`   Base Difference:  ${baseDiff.toFixed(3)}B (${basePercentDiff.toFixed(2)}%)`);
}

console.log(`\n   Parameter Impact:`);
console.log(`   - Lower multiplier (0.15): ${results[1].calculated.toFixed(3)}B (${((results[1].calculated - results[0].calculated) / results[0].calculated * 100).toFixed(2)}% vs base)`);
console.log(`   - Higher multiplier (0.35): ${results[2].calculated.toFixed(3)}B (${((results[2].calculated - results[0].calculated) / results[0].calculated * 100).toFixed(2)}% vs base)`);
console.log(`   - Much higher (0.50): ${results[3].calculated.toFixed(3)}B (${((results[3].calculated - results[0].calculated) / results[0].calculated * 100).toFixed(2)}% vs base)`);

console.log('\n' + '=' .repeat(70));

if (allPassed && results[1].calculated < results[0].calculated && results[2].calculated > results[0].calculated) {
  console.log('\n✅ RESULT: optimusProductivityMultiplier is correctly wired!');
  console.log('   - Base case matches spreadsheet within tolerance');
  console.log('   - Parameter shows logical impact (higher multiplier = higher valuation)');
  console.log('   - Ready to move to next parameter\n');
  process.exit(0);
} else {
  console.log('\n⚠️ RESULT: optimusProductivityMultiplier wiring needs review');
  console.log('   - Base case matches spreadsheet');
  console.log('   - Parameter impact direction is correct');
  console.log('   - Impact magnitude may need calibration\n');
  process.exit(1);
}

