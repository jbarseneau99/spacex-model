/**
 * Comprehensive Excel Input Analysis
 * 
 * Analyzes the Excel spreadsheet to identify ALL input parameters
 * and compares them with what we're currently using in the codebase.
 */

const fs = require('fs');
const path = require('path');

// Load Excel data
const excelDataPath = path.join(__dirname, '../excel_parsed_detailed.json');
let excelData = {};
try {
  excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf8'));
} catch (error) {
  console.error('Error loading Excel data:', error.message);
  process.exit(1);
}

// Load current implementation
const appJsPath = path.join(__dirname, '../js/app.js');
const appJs = fs.readFileSync(appJsPath, 'utf8');

const calcEnginePath = path.join(__dirname, '../calculation-engine.js');
const calcEngine = fs.readFileSync(calcEnginePath, 'utf8');

// Extract inputs from getInputs() function
const getInputsMatch = appJs.match(/getInputs\(\)\s*\{[\s\S]*?return\s*\{[\s\S]*?\}\s*;\s*\}/);
const currentInputs = {
  earth: [],
  mars: [],
  financial: []
};

if (getInputsMatch) {
  const getInputsCode = getInputsMatch[0];
  
  // Extract Earth inputs
  const earthMatch = getInputsCode.match(/earth:\s*\{([\s\S]*?)\}/);
  if (earthMatch) {
    const earthCode = earthMatch[1];
    const earthInputs = earthCode.match(/(\w+):\s*getValue\(/g) || [];
    currentInputs.earth = earthInputs.map(m => m.match(/(\w+):/)[1]);
  }
  
  // Extract Mars inputs
  const marsMatch = getInputsCode.match(/mars:\s*\{([\s\S]*?)\}/);
  if (marsMatch) {
    const marsCode = marsMatch[1];
    const marsInputs = marsCode.match(/(\w+):\s*getValue\(/g) || [];
    currentInputs.mars = marsInputs.map(m => m.match(/(\w+):/)[1]);
  }
  
  // Extract Financial inputs
  const financialMatch = getInputsCode.match(/financial:\s*\{([\s\S]*?)\}/);
  if (financialMatch) {
    const financialCode = financialMatch[1];
    const financialInputs = financialCode.match(/(\w+):\s*getValue\(/g) || [];
    currentInputs.financial = financialInputs.map(m => m.match(/(\w+):/)[1]);
  }
}

// Extract inputs used in calculation-engine.js
const calcEngineInputs = {
  earth: [],
  mars: [],
  financial: []
};

// Find all input references in calculation-engine.js
const earthInputs = calcEngine.match(/earth\.(\w+)/g) || [];
const marsInputs = calcEngine.match(/mars\.(\w+)/g) || [];
const financialInputs = calcEngine.match(/financial\.(\w+)/g) || [];

calcEngineInputs.earth = [...new Set(earthInputs.map(m => m.match(/earth\.(\w+)/)[1]))];
calcEngineInputs.mars = [...new Set(marsInputs.map(m => m.match(/mars\.(\w+)/)[1]))];
calcEngineInputs.financial = [...new Set(financialInputs.map(m => m.match(/financial\.(\w+)/)[1]))];

// Analyze Excel spreadsheet for input parameters
// Look for cells in "Valuation Inputs & Logic" sheet that are likely inputs (not formulas)
const inputsSheet = excelData['Valuation Inputs & Logic'] || {};
const excelInputs = {
  earth: [],
  mars: [],
  financial: [],
  other: []
};

// Check all cells in the inputs sheet
if (inputsSheet.cells) {
  for (const [cellRef, cellData] of Object.entries(inputsSheet.cells)) {
    // Skip cells with formulas (they're calculated, not inputs)
    if (cellData.formula) continue;
    
    // Look for numeric values or text that might be parameter names
    const value = cellData.value;
    if (value === null || value === undefined) continue;
    
    // Check if this cell is referenced by formulas in other sheets
    // If it's referenced, it's likely an input parameter
    const isReferenced = checkIfCellIsReferenced(cellRef, 'Valuation Inputs & Logic', excelData);
    
    if (isReferenced) {
      // Try to infer parameter name from nearby cells or context
      const paramName = inferParameterName(cellRef, inputsSheet);
      if (paramName) {
        // Categorize based on parameter name patterns
        if (paramName.toLowerCase().includes('earth') || 
            paramName.toLowerCase().includes('starlink') ||
            paramName.toLowerCase().includes('launch') ||
            paramName.toLowerCase().includes('bandwidth') ||
            paramName.toLowerCase().includes('starship')) {
          excelInputs.earth.push({ cell: cellRef, name: paramName, value: value });
        } else if (paramName.toLowerCase().includes('mars') ||
                   paramName.toLowerCase().includes('colony') ||
                   paramName.toLowerCase().includes('transport') ||
                   paramName.toLowerCase().includes('population') ||
                   paramName.toLowerCase().includes('optimus')) {
          excelInputs.mars.push({ cell: cellRef, name: paramName, value: value });
        } else if (paramName.toLowerCase().includes('discount') ||
                   paramName.toLowerCase().includes('dilution') ||
                   paramName.toLowerCase().includes('terminal') ||
                   paramName.toLowerCase().includes('growth') ||
                   paramName.toLowerCase().includes('financial')) {
          excelInputs.financial.push({ cell: cellRef, name: paramName, value: value });
        } else {
          excelInputs.other.push({ cell: cellRef, name: paramName, value: value });
        }
      }
    }
  }
}

// Also check Earth and Mars sheets for hardcoded input values
const earthSheet = excelData.Earth || {};
const marsSheet = excelData.Mars || {};

// Look for cells in Earth sheet that are referenced but not formulas
if (earthSheet.cells) {
  for (const [cellRef, cellData] of Object.entries(earthSheet.cells)) {
    if (cellData.formula) continue;
    const value = cellData.value;
    if (typeof value === 'number' && Math.abs(value) > 0.001 && Math.abs(value) < 1e15) {
      const isReferenced = checkIfCellIsReferenced(cellRef, 'Earth', excelData);
      if (isReferenced) {
        const paramName = `Earth_${cellRef}`;
        excelInputs.earth.push({ cell: cellRef, name: paramName, value: value, sheet: 'Earth' });
      }
    }
  }
}

if (marsSheet.cells) {
  for (const [cellRef, cellData] of Object.entries(marsSheet.cells)) {
    if (cellData.formula) continue;
    const value = cellData.value;
    if (typeof value === 'number' && Math.abs(value) > 0.001 && Math.abs(value) < 1e15) {
      const isReferenced = checkIfCellIsReferenced(cellRef, 'Mars', excelData);
      if (isReferenced) {
        const paramName = `Mars_${cellRef}`;
        excelInputs.mars.push({ cell: cellRef, name: paramName, value: value, sheet: 'Mars' });
      }
    }
  }
}

// Helper function to check if a cell is referenced by formulas
function checkIfCellIsReferenced(cellRef, sheetName, excelData) {
  // Check all sheets for references to this cell
  for (const [sheet, sheetData] of Object.entries(excelData)) {
    if (!sheetData.cells) continue;
    for (const [otherCellRef, cellData] of Object.entries(sheetData.cells)) {
      if (cellData.formula) {
        // Check if formula references our cell
        const refPattern = new RegExp(`['"]?${sheetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]?!\\$?${cellRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
        if (refPattern.test(cellData.formula)) {
          return true;
        }
        // Also check for relative references
        if (cellData.formula.includes(cellRef)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Helper function to infer parameter name from cell context
function inferParameterName(cellRef, sheet) {
  // Try to find label in nearby cells (usually to the left or above)
  const col = cellRef.match(/^([A-Z]+)/)[1];
  const row = parseInt(cellRef.match(/(\d+)$/)[1]);
  
  // Check cell to the left (previous column)
  const prevCol = getPreviousColumn(col);
  if (prevCol) {
    const leftCell = `${prevCol}${row}`;
    if (sheet.cells[leftCell] && sheet.cells[leftCell].value) {
      const leftValue = sheet.cells[leftCell].value;
      if (typeof leftValue === 'string' && leftValue.length > 0 && leftValue.length < 50) {
        return leftValue.trim();
      }
    }
  }
  
  // Check cell above (previous row)
  if (row > 1) {
    const aboveCell = `${col}${row - 1}`;
    if (sheet.cells[aboveCell] && sheet.cells[aboveCell].value) {
      const aboveValue = sheet.cells[aboveCell].value;
      if (typeof aboveValue === 'string' && aboveValue.length > 0 && aboveValue.length < 50) {
        return aboveValue.trim();
      }
    }
  }
  
  return null;
}

// Helper function to get previous column
function getPreviousColumn(col) {
  if (col === 'A') return null;
  if (col.length === 1) {
    return String.fromCharCode(col.charCodeAt(0) - 1);
  }
  // Handle multi-character columns (AA, AB, etc.)
  // Simplified: just return null for now
  return null;
}

// Compare and generate report
console.log('='.repeat(80));
console.log('EXCEL INPUT ANALYSIS REPORT');
console.log('='.repeat(80));
console.log('\n');

console.log('CURRENT IMPLEMENTATION INPUTS:');
console.log('-'.repeat(80));
console.log(`Earth (${currentInputs.earth.length}):`, currentInputs.earth.join(', '));
console.log(`Mars (${currentInputs.mars.length}):`, currentInputs.mars.join(', '));
console.log(`Financial (${currentInputs.financial.length}):`, currentInputs.financial.join(', '));
console.log('\n');

console.log('INPUTS USED IN CALCULATION ENGINE:');
console.log('-'.repeat(80));
console.log(`Earth (${calcEngineInputs.earth.length}):`, calcEngineInputs.earth.join(', '));
console.log(`Mars (${calcEngineInputs.mars.length}):`, calcEngineInputs.mars.join(', '));
console.log(`Financial (${calcEngineInputs.financial.length}):`, calcEngineInputs.financial.join(', '));
console.log('\n');

console.log('EXCEL SPREADSHEET INPUTS FOUND:');
console.log('-'.repeat(80));
console.log(`Earth (${excelInputs.earth.length}):`);
excelInputs.earth.forEach(input => {
  console.log(`  - ${input.cell} (${input.sheet || 'Valuation Inputs & Logic'}): ${input.name} = ${input.value}`);
});
console.log(`\nMars (${excelInputs.mars.length}):`);
excelInputs.mars.forEach(input => {
  console.log(`  - ${input.cell} (${input.sheet || 'Valuation Inputs & Logic'}): ${input.name} = ${input.value}`);
});
console.log(`\nFinancial (${excelInputs.financial.length}):`);
excelInputs.financial.forEach(input => {
  console.log(`  - ${input.cell} (${input.sheet || 'Valuation Inputs & Logic'}): ${input.name} = ${input.value}`);
});
console.log(`\nOther (${excelInputs.other.length}):`);
excelInputs.other.forEach(input => {
  console.log(`  - ${input.cell} (${input.sheet || 'Valuation Inputs & Logic'}): ${input.name} = ${input.value}`);
});
console.log('\n');

// Find missing inputs
const allCurrentInputs = [
  ...currentInputs.earth,
  ...currentInputs.mars,
  ...currentInputs.financial
];

const allCalcEngineInputs = [
  ...calcEngineInputs.earth,
  ...calcEngineInputs.mars,
  ...calcEngineInputs.financial
];

// Check for inputs in Excel that might not be in our code
console.log('ANALYSIS:');
console.log('-'.repeat(80));
console.log(`Total inputs in UI: ${allCurrentInputs.length}`);
console.log(`Total inputs used in calculation engine: ${allCalcEngineInputs.length}`);
console.log(`Total inputs found in Excel: ${excelInputs.earth.length + excelInputs.mars.length + excelInputs.financial.length + excelInputs.other.length}`);
console.log('\n');

// Check if all UI inputs are used in calculation engine
const unusedUIInputs = allCurrentInputs.filter(input => !allCalcEngineInputs.includes(input));
if (unusedUIInputs.length > 0) {
  console.log('⚠️  WARNING: UI inputs NOT used in calculation engine:');
  unusedUIInputs.forEach(input => console.log(`  - ${input}`));
  console.log('\n');
}

// Save detailed report to file
const report = {
  timestamp: new Date().toISOString(),
  currentInputs: currentInputs,
  calcEngineInputs: calcEngineInputs,
  excelInputs: excelInputs,
  unusedUIInputs: unusedUIInputs,
  summary: {
    totalUIInputs: allCurrentInputs.length,
    totalCalcEngineInputs: allCalcEngineInputs.length,
    totalExcelInputs: excelInputs.earth.length + excelInputs.mars.length + excelInputs.financial.length + excelInputs.other.length
  }
};

const reportPath = path.join(__dirname, '../excel-inputs-analysis.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`✅ Detailed report saved to: ${reportPath}`);

