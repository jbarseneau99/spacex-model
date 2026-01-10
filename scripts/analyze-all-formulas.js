/**
 * Comprehensive Formula Analysis Script
 * Analyzes all 8,890+ formulas and creates a detailed inventory table
 */

const fs = require('fs');
const path = require('path');

// Load Excel data - formulas are in model_structure.json
const structurePath = path.join(__dirname, '../model_structure.json');
const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
const excelDataPath = path.join(__dirname, '../excel_parsed_detailed.json');
const excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf8'));

// Formula pattern analysis
const formulaPatterns = new Map();
const formulaDetails = [];
const functionUsage = new Map();
const sheetUsage = new Map();

// Excel function patterns
const functionPatterns = {
  'IF': /IF\(/gi,
  'SUM': /SUM\(/gi,
  'INDEX': /INDEX\(/gi,
  'MATCH': /MATCH\(/gi,
  'AVERAGE': /AVERAGE\(/gi,
  'QUARTILE': /QUARTILE\(/gi,
  'MAX': /MAX\(/gi,
  'MIN': /MIN\(/gi,
  'AND': /AND\(/gi,
  'OR': /OR\(/gi,
  'IFERROR': /IFERROR\(/gi,
  'LN': /\bLN\(/gi,
  'LOG': /\bLOG\(/gi,
  'EXP': /\bEXP\(/gi,
  'IRR': /\bIRR\(/gi,
  'RRI': /RRI\(/gi,
  'OFFSET': /OFFSET\(/gi,
  'COLUMN': /COLUMN\(/gi,
  'ROUNDDOWN': /ROUNDDOWN\(/gi,
  'MOD': /\bMOD\(/gi,
  'COUNTA': /COUNTA\(/gi,
};

// Normalize formula to pattern (replace cell references with placeholders)
function normalizeFormula(formula) {
  if (!formula || !formula.startsWith('=')) return null;
  
  let normalized = formula;
  
  // Replace cell references with placeholders
  normalized = normalized.replace(/\$?[A-Z]+\$?\d+/g, 'CELL');
  
  // Replace sheet references
  normalized = normalized.replace(/['"]?[^'"]+['"]?!/g, 'SHEET!');
  
  // Replace numbers (but keep structure)
  normalized = normalized.replace(/\b\d+\.?\d*\b/g, 'NUM');
  
  // Replace string literals
  normalized = normalized.replace(/"[^"]*"/g, 'STR');
  
  return normalized;
}

// Extract functions from formula
function extractFunctions(formula) {
  const functions = [];
  for (const [funcName, pattern] of Object.entries(functionPatterns)) {
    const matches = formula.match(pattern);
    if (matches) {
      functions.push(funcName);
    }
  }
  return functions;
}

// Categorize formula complexity
function categorizeFormula(formula) {
  const funcCount = extractFunctions(formula).length;
  const cellRefCount = (formula.match(/\$?[A-Z]+\$?\d+/g) || []).length;
  const hasCrossSheet = /['"]?[^'"]+['"]?!/.test(formula);
  
  if (funcCount === 0 && cellRefCount <= 2) return 'Simple';
  if (funcCount <= 2 && cellRefCount <= 10) return 'Medium';
  return 'Complex';
}

// Analyze all formulas
console.log('Analyzing formulas...');

// First, get formulas from model_structure.json (has full formulas with =)
for (const sheet of structure.sheets || []) {
  const sheetName = sheet.name;
  if (!sheet.formulas || sheet.formulas.length === 0) continue;
  
  for (const formulaEntry of sheet.formulas) {
    const cellRef = formulaEntry.cell;
    let formula = formulaEntry.formula;
    
    // Ensure formula starts with =
    if (!formula.startsWith('=')) {
      formula = '=' + formula;
    }
    
    const normalized = normalizeFormula(formula);
    if (!normalized) continue;
    
    // Track pattern
    if (!formulaPatterns.has(normalized)) {
      formulaPatterns.set(normalized, {
        pattern: normalized,
        original: formula,
        count: 0,
        sheets: new Set(),
        cells: [],
        functions: new Set(),
        complexity: categorizeFormula(formula)
      });
    }
    
    const pattern = formulaPatterns.get(normalized);
    pattern.count++;
    pattern.sheets.add(sheetName);
    pattern.cells.push(`${sheetName}!${cellRef}`);
    
    // Track functions
    const functions = extractFunctions(formula);
    functions.forEach(f => pattern.functions.add(f));
    
    // Track function usage
    functions.forEach(f => {
      functionUsage.set(f, (functionUsage.get(f) || 0) + 1);
    });
    
    // Track sheet usage
    sheetUsage.set(sheetName, (sheetUsage.get(sheetName) || 0) + 1);
    
    // Store detail
    formulaDetails.push({
      sheet: sheetName,
      cell: cellRef,
      formula: formula,
      normalized: normalized,
      functions: functions,
      complexity: categorizeFormula(formula)
    });
  }
}

// Also check excel_parsed_detailed.json for any formulas not in structure
for (const [sheetName, sheetData] of Object.entries(excelData)) {
  if (!sheetData || !sheetData.cells) continue;
  
  for (const [cellRef, cell] of Object.entries(sheetData.cells)) {
    if (!cell || typeof cell !== 'object') continue;
    
    let formula = cell.formula;
    if (!formula) continue;
    
    // Add = if missing
    if (!formula.startsWith('=')) {
      formula = '=' + formula;
    }
    
    // Skip if already processed from structure.json
    const alreadyProcessed = formulaDetails.some(f => 
      f.sheet === sheetName && f.cell === cellRef
    );
    if (alreadyProcessed) continue;
    
    const normalized = normalizeFormula(formula);
    if (!normalized) continue;
    
    // Track pattern
    if (!formulaPatterns.has(normalized)) {
      formulaPatterns.set(normalized, {
        pattern: normalized,
        original: formula,
        count: 0,
        sheets: new Set(),
        cells: [],
        functions: new Set(),
        complexity: categorizeFormula(formula)
      });
    }
    
    const pattern = formulaPatterns.get(normalized);
    pattern.count++;
    pattern.sheets.add(sheetName);
    pattern.cells.push(`${sheetName}!${cellRef}`);
    
    // Track functions
    const functions = extractFunctions(formula);
    functions.forEach(f => pattern.functions.add(f));
    
    // Track function usage
    functions.forEach(f => {
      functionUsage.set(f, (functionUsage.get(f) || 0) + 1);
    });
    
    // Track sheet usage
    sheetUsage.set(sheetName, (sheetUsage.get(sheetName) || 0) + 1);
    
    // Store detail
    formulaDetails.push({
      sheet: sheetName,
      cell: cellRef,
      formula: formula,
      normalized: normalized,
      functions: functions,
      complexity: categorizeFormula(formula)
    });
  }
}

// Convert patterns to array and sort by count
const patternsArray = Array.from(formulaPatterns.values())
  .map(p => ({
    pattern: p.pattern,
    original: p.original,
    count: p.count,
    sheets: Array.from(p.sheets),
    cells: p.cells.slice(0, 5), // First 5 examples
    functions: Array.from(p.functions),
    complexity: p.complexity
  }))
  .sort((a, b) => b.count - a.count);

// Generate comprehensive report
const report = {
  summary: {
    totalFormulas: formulaDetails.length,
    uniquePatterns: patternsArray.length,
    sheets: Object.fromEntries(sheetUsage),
    functionUsage: Object.fromEntries(functionUsage),
    complexityBreakdown: {
      Simple: formulaDetails.filter(f => f.complexity === 'Simple').length,
      Medium: formulaDetails.filter(f => f.complexity === 'Medium').length,
      Complex: formulaDetails.filter(f => f.complexity === 'Complex').length
    }
  },
  patterns: patternsArray,
  allFormulas: formulaDetails
};

// Save report
const reportPath = path.join(__dirname, '../FORMULA_INVENTORY.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`✓ Saved detailed report to ${reportPath}`);

// Generate CSV table
const csvRows = [];
csvRows.push('Pattern,Count,Complexity,Sheets,Functions,Example Formula,Implementation Status,Priority');

patternsArray.forEach((pattern, index) => {
  const status = pattern.functions.length === 0 && pattern.complexity === 'Simple' ? 'Implemented' : 
                 pattern.functions.some(f => ['SUM', 'IF', 'ADD', 'MULTIPLY'].includes(f)) ? 'Partial' : 
                 'Not Implemented';
  
  const priority = pattern.count > 100 ? 'P0' :
                   pattern.count > 50 ? 'P1' :
                   pattern.count > 10 ? 'P2' : 'P3';
  
  csvRows.push([
    `"${pattern.pattern.replace(/"/g, '""')}"`,
    pattern.count,
    pattern.complexity,
    pattern.sheets.join('; '),
    pattern.functions.join(', '),
    `"${pattern.original.replace(/"/g, '""')}"`,
    status,
    priority
  ].join(','));
});

const csvPath = path.join(__dirname, '../FORMULA_INVENTORY.csv');
fs.writeFileSync(csvPath, csvRows.join('\n'));
console.log(`✓ Saved CSV table to ${csvPath}`);

// Print summary
console.log('\n=== FORMULA ANALYSIS SUMMARY ===');
console.log(`Total Formulas: ${report.summary.totalFormulas}`);
console.log(`Unique Patterns: ${report.summary.uniquePatterns}`);
console.log('\nBy Sheet:');
for (const [sheet, count] of Object.entries(report.summary.sheets)) {
  console.log(`  ${sheet}: ${count}`);
}
console.log('\nTop 10 Functions:');
const topFunctions = Array.from(functionUsage.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);
topFunctions.forEach(([func, count]) => {
  console.log(`  ${func}: ${count}`);
});
console.log('\nComplexity Breakdown:');
console.log(`  Simple: ${report.summary.complexityBreakdown.Simple}`);
console.log(`  Medium: ${report.summary.complexityBreakdown.Medium}`);
console.log(`  Complex: ${report.summary.complexityBreakdown.Complex}`);
console.log('\nTop 20 Patterns:');
patternsArray.slice(0, 20).forEach((p, i) => {
  console.log(`  ${i + 1}. [${p.count}x] ${p.pattern.substring(0, 60)}...`);
});

console.log('\n✓ Analysis complete!');

