/**
 * Test optimusAnnualCostDecline parameter wiring
 * 
 * This script tests how optimusAnnualCostDecline affects the valuation
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

console.log('🧪 Testing optimusAnnualCostDecline Parameter\n');
console.log('=' .repeat(60));

// Test different optimusAnnualCostDecline values
const testCases = [
  { name: 'Base (0.05)', optimusAnnualCostDecline: 0.05 },
  { name: 'Lower (0.02)', optimusAnnualCostDecline: 0.02 },
  { name: 'Higher (0.10)', optimusAnnualCostDecline: 0.10 },
  { name: 'Much Higher (0.15)', optimusAnnualCostDecline: 0.15 }
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
    optimusAnnualCostDecline: 0.05 // Will be overridden
  },
  financial: {
    discountRate: 0.12,
    dilutionFactor: 0.15,
    terminalGrowth: 0.03
  }
};

// Get base spreadsheet Mars value
const baseMarsSpreadsheetValue = getSpreadsheetCellValue('Mars', 'K54');
const baseMarsSpreadsheetBillions = baseMarsSpreadsheetValue ? baseMarsSpreadsheetValue / 1e9 : null;

console.log(`\n📊 Base Spreadsheet Mars Value (K54): ${baseMarsSpreadsheetBillions?.toFixed(3)}B\n`);

// Test each case
testCases.forEach((testCase, index) => {
  const inputs = JSON.parse(JSON.stringify(baseInputs));
  inputs.mars.optimusAnnualCostDecline = testCase.optimusAnnualCostDecline;
  
  const marsValue = calculationEngine.calculateMarsValuation(inputs);
  
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  optimusAnnualCostDecline: ${testCase.optimusAnnualCostDecline}`);
  console.log(`  Calculated Mars Value: ${marsValue.toFixed(3)}B`);
  
  if (baseMarsSpreadsheetBillions && index === 0) {
    const diff = marsValue - baseMarsSpreadsheetBillions;
    const percentDiff = (diff / baseMarsSpreadsheetBillions) * 100;
    console.log(`  Difference from Spreadsheet: ${diff > 0 ? '+' : ''}${diff.toFixed(3)}B (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%)`);
  } else if (index > 0) {
    const baseCalculated = testCases[0].calculated || 0.745; // Use first test result
    const diff = marsValue - baseCalculated;
    const percentDiff = (diff / baseCalculated) * 100;
    console.log(`  Difference from Base: ${diff > 0 ? '+' : ''}${diff.toFixed(3)}B (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%)`);
  }
  console.log('');
  
  // Store result for comparison
  testCase.calculated = marsValue;
});

console.log('=' .repeat(60));
console.log('\n📝 Analysis:');
console.log('Currently optimusAnnualCostDecline is read but NOT used in calculations.');
console.log('We need to wire it up to affect Optimus cost reduction over time and Mars valuation.\n');
console.log('Expected behavior:');
console.log('  - Higher decline = faster cost reduction = lower Mars costs = higher Mars valuation');
console.log('  - Lower decline = slower cost reduction = higher Mars costs = lower Mars valuation\n');

