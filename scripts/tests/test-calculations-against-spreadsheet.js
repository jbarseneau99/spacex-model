/**
 * Test Calculation Engine Against Spreadsheet
 * 
 * This script validates that our calculation engine produces the same results
 * as the spreadsheet for various scenarios and inputs.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const CalculationEngine = require('../../lib/calculation-engine');
const ValuationAlgorithms = require('../../lib/valuation-algorithms');

// Load Excel data
const excelDataPath = path.join(__dirname, '..', 'excel_parsed_detailed.json');
if (!fs.existsSync(excelDataPath)) {
  console.error('❌ Excel data file not found:', excelDataPath);
  process.exit(1);
}

const excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf8'));
const calculationEngine = new CalculationEngine();
const valuationAlgorithms = new ValuationAlgorithms(excelData); // For comparison

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

// Test cases
const testCases = [
  {
    name: 'Base Scenario - Earth Valuation (O153)',
    test: () => {
      const spreadsheetValue = getSpreadsheetCellValue('Earth', 'O153');
      const spreadsheetBillions = spreadsheetValue ? spreadsheetValue / 1e9 : null;
      
      // Base inputs
      const inputs = {
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
          terminalGrowth: 0.03
        }
      };
      
      const calculatedValue = calculationEngine.calculateEarthValuation(inputs, null);
      
      return {
        spreadsheet: spreadsheetBillions,
        calculated: calculatedValue,
        difference: spreadsheetBillions ? Math.abs(spreadsheetBillions - calculatedValue) : null,
        percentDiff: spreadsheetBillions ? ((Math.abs(spreadsheetBillions - calculatedValue) / spreadsheetBillions) * 100) : null
      };
    }
  },
  {
    name: 'Base Scenario - Mars Valuation (K54)',
    test: () => {
      const spreadsheetValue = getSpreadsheetCellValue('Mars', 'K54');
      const spreadsheetBillions = spreadsheetValue ? spreadsheetValue / 1e9 : null;
      
      const inputs = {
        earth: {
          starlinkPenetration: 0.15,
          launchVolume: 150,
          bandwidthPriceDecline: 0.08
        },
        mars: {
          firstColonyYear: 2030,
          populationGrowth: 0.50,
          industrialBootstrap: true
        },
        financial: {
          discountRate: 0.12
        }
      };
      
      const calculatedValue = calculationEngine.calculateMarsValuation(inputs);
      
      return {
        spreadsheet: spreadsheetBillions,
        calculated: calculatedValue,
        difference: spreadsheetBillions ? Math.abs(spreadsheetBillions - calculatedValue) : null,
        percentDiff: spreadsheetBillions ? ((Math.abs(spreadsheetBillions - calculatedValue) / spreadsheetBillions) * 100) : null
      };
    }
  },
  {
    name: 'Base Scenario - Total Enterprise Value (B13)',
    test: () => {
      const spreadsheetValue = getSpreadsheetCellValue('Earth', 'B13');
      const spreadsheetBillions = spreadsheetValue ? spreadsheetValue / 1e9 : null;
      
      const inputs = {
        earth: {
          starlinkPenetration: 0.15,
          launchVolume: 150,
          bandwidthPriceDecline: 0.08
        },
        mars: {
          firstColonyYear: 2030,
          populationGrowth: 0.50,
          industrialBootstrap: true
        },
        financial: {
          discountRate: 0.12,
          terminalGrowth: 0.03
        }
      };
      
      const calculatedValue = calculationEngine.calculateTotalEnterpriseValue(inputs, null);
      
      return {
        spreadsheet: spreadsheetBillions,
        calculated: calculatedValue,
        difference: spreadsheetBillions ? Math.abs(spreadsheetBillions - calculatedValue) : null,
        percentDiff: spreadsheetBillions ? ((Math.abs(spreadsheetBillions - calculatedValue) / spreadsheetBillions) * 100) : null
      };
    }
  },
  {
    name: 'Optimistic Scenario - Earth Valuation (Y153)',
    test: () => {
      // Y153 is the optimistic Earth valuation (column Y)
      const spreadsheetValue = getSpreadsheetCellValue('Earth', 'Y153');
      const spreadsheetBillions = spreadsheetValue ? spreadsheetValue / 1e9 : null;
      
      // Note: The spreadsheet's optimistic scenario may use different inputs
      // For now, test with optimistic inputs and see how close we get
      const inputs = {
        earth: {
          starlinkPenetration: 0.25, // Higher penetration
          launchVolume: 200, // Higher volume
          bandwidthPriceDecline: 0.05 // Lower decline
        },
        mars: {
          firstColonyYear: 2028, // Earlier
          populationGrowth: 0.70, // Higher growth
          industrialBootstrap: true
        },
        financial: {
          discountRate: 0.10,
          terminalGrowth: 0.035
        }
      };
      
      const calculatedValue = calculationEngine.calculateEarthValuation(inputs, null);
      
      return {
        spreadsheet: spreadsheetBillions,
        calculated: calculatedValue,
        difference: spreadsheetBillions ? Math.abs(spreadsheetBillions - calculatedValue) : null,
        percentDiff: spreadsheetBillions ? ((Math.abs(spreadsheetBillions - calculatedValue) / spreadsheetBillions) * 100) : null,
        note: 'Y153 is optimistic Earth value - inputs may not match spreadsheet optimistic scenario exactly'
      };
    }
  },
  {
    name: 'Optimistic Scenario - Total Enterprise Value (D13)',
    test: () => {
      // D13 should be optimistic total (D7 = Y153)
      const spreadsheetValue = getSpreadsheetCellValue('Earth', 'D13');
      const spreadsheetBillions = spreadsheetValue ? spreadsheetValue / 1e9 : null;
      
      const inputs = {
        earth: {
          starlinkPenetration: 0.25,
          launchVolume: 200,
          bandwidthPriceDecline: 0.05
        },
        mars: {
          firstColonyYear: 2028,
          populationGrowth: 0.70,
          industrialBootstrap: true
        },
        financial: {
          discountRate: 0.10,
          terminalGrowth: 0.035
        }
      };
      
      const calculatedValue = calculationEngine.calculateTotalEnterpriseValue(inputs, null);
      
      return {
        spreadsheet: spreadsheetBillions,
        calculated: calculatedValue,
        difference: spreadsheetBillions ? Math.abs(spreadsheetBillions - calculatedValue) : null,
        percentDiff: spreadsheetBillions ? ((Math.abs(spreadsheetBillions - calculatedValue) / spreadsheetBillions) * 100) : null,
        note: 'D13 is optimistic total - inputs may not match spreadsheet optimistic scenario exactly'
      };
    }
  },
  {
    name: 'Mars Option Value (K54+K8-K27)',
    test: () => {
      const k54 = getSpreadsheetCellValue('Mars', 'K54');
      const k8 = getSpreadsheetCellValue('Mars', 'K8');
      const k27 = getSpreadsheetCellValue('Mars', 'K27');
      const spreadsheetValue = k54 && k8 && k27 ? k54 + k8 - k27 : null;
      const spreadsheetBillions = spreadsheetValue ? spreadsheetValue / 1e9 : null;
      
      const inputs = {
        earth: {
          starlinkPenetration: 0.15,
          launchVolume: 150
        },
        mars: {
          firstColonyYear: 2030,
          populationGrowth: 0.50,
          industrialBootstrap: true
        },
        financial: {
          discountRate: 0.12
        }
      };
      
      const calculatedValue = calculationEngine.calculateMarsOptionValue(inputs);
      
      return {
        spreadsheet: spreadsheetBillions,
        calculated: calculatedValue,
        difference: spreadsheetBillions ? Math.abs(spreadsheetBillions - calculatedValue) : null,
        percentDiff: spreadsheetBillions ? ((Math.abs(spreadsheetBillions - calculatedValue) / spreadsheetBillions) * 100) : null
      };
    }
  },
  {
    name: 'Bear Scenario - Earth Valuation',
    test: () => {
      // Bear scenario uses lower inputs
      const inputs = {
        earth: {
          starlinkPenetration: 0.10, // Lower penetration
          launchVolume: 100, // Lower volume
          bandwidthPriceDecline: 0.10 // Higher decline
        },
        mars: {
          firstColonyYear: 2035, // Later
          populationGrowth: 0.30, // Lower growth
          industrialBootstrap: false // No bootstrap
        },
        financial: {
          discountRate: 0.15,
          terminalGrowth: 0.025
        }
      };
      
      const calculatedValue = calculationEngine.calculateEarthValuation(inputs, null);
      
      // Bear scenario should be lower than base
      const baseValue = 124.48;
      const isLower = calculatedValue < baseValue;
      
      return {
        spreadsheet: null, // No specific bear cell to compare against
        calculated: calculatedValue,
        difference: null,
        percentDiff: null,
        note: `Bear scenario: ${calculatedValue.toFixed(2)}B (should be < base ${baseValue}B) - ${isLower ? '✅ Lower' : '❌ Not lower'}`
      };
    }
  },
  {
    name: 'Bear Scenario - Mars Valuation',
    test: () => {
      const inputs = {
        earth: {
          starlinkPenetration: 0.10,
          launchVolume: 100
        },
        mars: {
          firstColonyYear: 2035,
          populationGrowth: 0.30,
          industrialBootstrap: false // No bootstrap = massive reduction
        },
        financial: {
          discountRate: 0.15
        }
      };
      
      const calculatedValue = calculationEngine.calculateMarsValuation(inputs);
      const baseValue = 0.745;
      const isLower = calculatedValue < baseValue;
      
      return {
        spreadsheet: null,
        calculated: calculatedValue,
        difference: null,
        percentDiff: null,
        note: `Bear scenario: ${calculatedValue.toFixed(2)}B (should be < base ${baseValue}B) - ${isLower ? '✅ Lower' : '❌ Not lower'}`
      };
    }
  },
  {
    name: 'Input Sensitivity - Penetration Change',
    test: () => {
      const baseInputs = {
        earth: { starlinkPenetration: 0.15, launchVolume: 150, bandwidthPriceDecline: 0.08 },
        mars: { firstColonyYear: 2030, populationGrowth: 0.50, industrialBootstrap: true },
        financial: { discountRate: 0.12 }
      };
      
      const highPenetrationInputs = {
        ...baseInputs,
        earth: { ...baseInputs.earth, starlinkPenetration: 0.20 }
      };
      
      const baseValue = calculationEngine.calculateEarthValuation(baseInputs, null);
      const highValue = calculationEngine.calculateEarthValuation(highPenetrationInputs, null);
      const increase = ((highValue - baseValue) / baseValue) * 100;
      
      return {
        spreadsheet: null,
        calculated: increase,
        difference: null,
        percentDiff: null,
        note: `Penetration 0.15→0.20: Value increases ${increase.toFixed(1)}% (${baseValue.toFixed(2)}B → ${highValue.toFixed(2)}B)`
      };
    }
  },
  {
    name: 'Input Sensitivity - Launch Volume Change',
    test: () => {
      const baseInputs = {
        earth: { starlinkPenetration: 0.15, launchVolume: 150, bandwidthPriceDecline: 0.08 },
        mars: { firstColonyYear: 2030, populationGrowth: 0.50, industrialBootstrap: true },
        financial: { discountRate: 0.12 }
      };
      
      const highVolumeInputs = {
        ...baseInputs,
        earth: { ...baseInputs.earth, launchVolume: 200 }
      };
      
      const baseValue = calculationEngine.calculateEarthValuation(baseInputs, null);
      const highValue = calculationEngine.calculateEarthValuation(highVolumeInputs, null);
      const increase = ((highValue - baseValue) / baseValue) * 100;
      
      return {
        spreadsheet: null,
        calculated: increase,
        difference: null,
        percentDiff: null,
        note: `Launch volume 150→200: Value increases ${increase.toFixed(1)}% (${baseValue.toFixed(2)}B → ${highValue.toFixed(2)}B)`
      };
    }
  },
  {
    name: 'Input Sensitivity - Colony Year Change',
    test: () => {
      const baseInputs = {
        earth: { starlinkPenetration: 0.15, launchVolume: 150 },
        mars: { firstColonyYear: 2030, populationGrowth: 0.50, industrialBootstrap: true },
        financial: { discountRate: 0.12 }
      };
      
      const earlyColonyInputs = {
        ...baseInputs,
        mars: { ...baseInputs.mars, firstColonyYear: 2028 }
      };
      
      const baseValue = calculationEngine.calculateMarsValuation(baseInputs);
      const earlyValue = calculationEngine.calculateMarsValuation(earlyColonyInputs);
      const increase = ((earlyValue - baseValue) / baseValue) * 100;
      
      return {
        spreadsheet: null,
        calculated: increase,
        difference: null,
        percentDiff: null,
        note: `Colony year 2030→2028: Value increases ${increase.toFixed(1)}% (${baseValue.toFixed(2)}B → ${earlyValue.toFixed(2)}B)`
      };
    }
  },
  {
    name: 'Input Sensitivity - No Industrial Bootstrap',
    test: () => {
      const baseInputs = {
        earth: { starlinkPenetration: 0.15, launchVolume: 150 },
        mars: { firstColonyYear: 2030, populationGrowth: 0.50, industrialBootstrap: true },
        financial: { discountRate: 0.12 }
      };
      
      const noBootstrapInputs = {
        ...baseInputs,
        mars: { ...baseInputs.mars, industrialBootstrap: false }
      };
      
      const baseValue = calculationEngine.calculateMarsValuation(baseInputs);
      const noBootstrapValue = calculationEngine.calculateMarsValuation(noBootstrapInputs);
      const decrease = ((baseValue - noBootstrapValue) / baseValue) * 100;
      
      return {
        spreadsheet: null,
        calculated: decrease,
        difference: null,
        percentDiff: null,
        note: `No bootstrap: Value decreases ${decrease.toFixed(1)}% (${baseValue.toFixed(2)}B → ${noBootstrapValue.toFixed(2)}B) - ${decrease > 80 ? '✅ Massive reduction' : '❌ Should be ~90% reduction'}`
      };
    }
  },
  {
    name: 'Consistency Check - B13 = (O153 * B8 + Mars) / B12',
    test: () => {
      const inputs = {
        earth: {
          starlinkPenetration: 0.15,
          launchVolume: 150,
          bandwidthPriceDecline: 0.08
        },
        mars: {
          firstColonyYear: 2030,
          populationGrowth: 0.50,
          industrialBootstrap: true
        },
        financial: {
          discountRate: 0.12,
          terminalGrowth: 0.03
        }
      };
      
      const earthComponent = calculationEngine.calculateEarthValuation(inputs, null);
      const marsComponent = calculationEngine.calculateMarsValuation(inputs);
      const totalValue = calculationEngine.calculateTotalEnterpriseValue(inputs, null);
      
      // B13 = (O153 * B8 + Mars) / B12
      // B8 = 18, B12 = 1
      const b8 = 18;
      const b12 = 1;
      const calculatedB13 = (earthComponent * b8 + marsComponent) / b12;
      
      const difference = Math.abs(totalValue - calculatedB13);
      const percentDiff = (difference / totalValue) * 100;
      
      return {
        spreadsheet: null,
        calculated: percentDiff,
        difference: difference,
        percentDiff: percentDiff,
        note: `B13 formula check: ${totalValue.toFixed(2)}B vs calculated ${calculatedB13.toFixed(2)}B - ${percentDiff < 0.1 ? '✅ Consistent' : '❌ Inconsistent'}`
      };
    }
  },
  {
    name: 'Edge Case - Zero Penetration',
    test: () => {
      const inputs = {
        earth: {
          starlinkPenetration: 0.0, // Zero penetration
          launchVolume: 150,
          bandwidthPriceDecline: 0.08
        },
        mars: {
          firstColonyYear: 2030,
          populationGrowth: 0.50,
          industrialBootstrap: true
        },
        financial: {
          discountRate: 0.12
        }
      };
      
      const calculatedValue = calculationEngine.calculateEarthValuation(inputs, null);
      const isValid = calculatedValue >= 0 && isFinite(calculatedValue);
      const isZero = calculatedValue === 0 || calculatedValue < 0.01;
      
      return {
        spreadsheet: null,
        calculated: calculatedValue,
        difference: null,
        percentDiff: null,
        note: `Zero penetration: ${calculatedValue.toFixed(2)}B - ${isValid ? (isZero ? '✅ Valid (zero)' : '⚠️ Valid but non-zero') : '❌ Invalid'}`
      };
    }
  },
  {
    name: 'Edge Case - Very High Penetration',
    test: () => {
      const inputs = {
        earth: {
          starlinkPenetration: 0.50, // Very high
          launchVolume: 150,
          bandwidthPriceDecline: 0.08
        },
        mars: {
          firstColonyYear: 2030,
          populationGrowth: 0.50,
          industrialBootstrap: true
        },
        financial: {
          discountRate: 0.12
        }
      };
      
      const calculatedValue = calculationEngine.calculateEarthValuation(inputs, null);
      const isValid = calculatedValue >= 0 && isFinite(calculatedValue) && calculatedValue < 10000; // Reasonable upper bound
      
      return {
        spreadsheet: null,
        calculated: calculatedValue,
        difference: null,
        percentDiff: null,
        note: `High penetration (0.50): ${calculatedValue.toFixed(2)}B - ${isValid ? '✅ Valid' : '❌ Invalid'}`
      };
    }
  }
];

// Run tests
console.log('🧪 Testing Calculation Engine Against Spreadsheet\n');
console.log('='.repeat(80));

let passedTests = 0;
let failedTests = 0;
let warnings = 0;

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log('-'.repeat(80));
  
  try {
    const result = testCase.test();
    
    // Handle tests with spreadsheet comparison
    if (result.spreadsheet !== null && result.spreadsheet !== undefined) {
      console.log(`   Spreadsheet: ${result.spreadsheet?.toFixed(2)}B`);
      console.log(`   Calculated:  ${result.calculated?.toFixed(2)}B`);
      if (result.difference !== null && result.difference !== undefined) {
        console.log(`   Difference:  ${result.difference?.toFixed(2)}B`);
      }
      if (result.percentDiff !== null && result.percentDiff !== undefined) {
        console.log(`   % Difference: ${result.percentDiff?.toFixed(2)}%`);
      }
      if (result.note) {
        console.log(`   Note: ${result.note}`);
      }
      
      // Tolerance: 5% difference is acceptable for now
      const tolerance = 5.0;
      if (result.percentDiff !== null && result.percentDiff !== undefined) {
        if (result.percentDiff <= tolerance) {
          console.log(`   ✅ PASS (within ${tolerance}% tolerance)`);
          passedTests++;
        } else {
          console.log(`   ❌ FAIL (exceeds ${tolerance}% tolerance)`);
          failedTests++;
        }
      } else {
        console.log(`   ⚠️  Cannot compare (no percentDiff)`);
        warnings++;
      }
    } 
    // Handle tests without spreadsheet comparison (logic/consistency tests)
    else {
      if (result.note) {
        console.log(`   ${result.note}`);
        if (result.note.includes('✅')) {
          passedTests++;
        } else if (result.note.includes('❌')) {
          failedTests++;
        } else {
          warnings++;
        }
      } else {
        console.log(`   Calculated: ${result.calculated !== null && result.calculated !== undefined ? result.calculated.toFixed(2) + 'B' : 'N/A'}`);
        if (result.percentDiff !== null && result.percentDiff !== undefined) {
          console.log(`   % Difference: ${result.percentDiff.toFixed(2)}%`);
        }
        console.log(`   ⚠️  No spreadsheet comparison available`);
        warnings++;
      }
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    console.error(error.stack);
    failedTests++;
  }
});

// Summary
console.log('\n' + '='.repeat(80));
console.log('\n📊 Test Summary:');
console.log(`   ✅ Passed: ${passedTests}`);
console.log(`   ❌ Failed: ${failedTests}`);
console.log(`   ⚠️  Warnings: ${warnings}`);
console.log(`   Total: ${testCases.length}`);

if (failedTests === 0 && warnings === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed or have warnings. Review the results above.');
  process.exit(1);
}

