/**
 * Map all unique formula patterns to algorithms
 * Ensures every pattern is accounted for
 */

const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, '../FORMULA_INVENTORY.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

// Read existing algorithms
const algorithmsPath = path.join(__dirname, '../valuation-algorithms.js');
const algorithmsCode = fs.readFileSync(algorithmsPath, 'utf8');

// Extract existing algorithm methods
const existingMethods = [];
const methodPattern = /(?:function\s+)?(\w+)\s*\(/g;
let match;
while ((match = methodPattern.exec(algorithmsCode)) !== null) {
  if (!['constructor', 'getCellValue', 'setCellValue', 'parseCellRef', 'cellRefFromColRow', 'clearCache'].includes(match[1])) {
    existingMethods.push(match[1]);
  }
}

// Pattern to algorithm mapping logic
function mapPatternToAlgorithm(pattern) {
  const patternLower = pattern.pattern.toLowerCase();
  const funcs = pattern.functions;
  const complexity = pattern.complexity;
  
  // Direct cell reference
  if (patternLower === '=cell' || patternLower === 'cell') {
    return {
      algorithm: 'directReference',
      status: '✅ Implemented',
      method: 'directReference(sourceCell)',
      needsUpdate: false
    };
  }
  
  // Simple arithmetic
  if (patternLower.includes('cell*cell') && funcs.length === 0) {
    return {
      algorithm: 'multiply',
      status: '✅ Implemented',
      method: 'multiply(a, b)',
      needsUpdate: false
    };
  }
  
  if (patternLower.includes('cell+cell') && funcs.length === 0 && !patternLower.includes('sum(')) {
    return {
      algorithm: 'add',
      status: '✅ Implemented',
      method: 'add(a, b)',
      needsUpdate: false
    };
  }
  
  if (patternLower.includes('cell-cell') && funcs.length === 0) {
    return {
      algorithm: 'subtract',
      status: '✅ Implemented',
      method: 'subtract(a, b)',
      needsUpdate: false
    };
  }
  
  if (patternLower.includes('cell/cell') && funcs.length === 0) {
    return {
      algorithm: 'divide',
      status: '✅ Implemented',
      method: 'divide(a, b)',
      needsUpdate: false
    };
  }
  
  // SUM function
  if (funcs.includes('SUM')) {
    if (patternLower.includes('sum(cell:cell)')) {
      return {
        algorithm: 'sumRange',
        status: '✅ Implemented',
        method: 'sumRange(sheetName, startCell, endCell)',
        needsUpdate: false
      };
    }
    // SUM with multiple ranges
    return {
      algorithm: 'sumRange',
      status: '🟡 Partial - Needs multi-range support',
      method: 'sumRange(sheetName, startCell, endCell)',
      needsUpdate: true,
      note: 'May need sumRangeMultiple() for multiple ranges'
    };
  }
  
  // IF statements
  if (funcs.includes('IF')) {
    return {
      algorithm: 'ifStatement',
      status: '✅ Implemented',
      method: 'ifStatement(condition, trueValue, falseValue)',
      needsUpdate: false,
      note: 'May need enhanced IF for complex conditions'
    };
  }
  
  // Cross-sheet reference
  if (patternLower.includes('sheet!cell')) {
    return {
      algorithm: 'crossSheetReference',
      status: '✅ Implemented',
      method: 'crossSheetReference(sheetName, cellRef)',
      needsUpdate: false
    };
  }
  
  // MAX/MIN
  if (funcs.includes('MAX')) {
    if (patternLower.includes('max(cell:cell)')) {
      return {
        algorithm: 'maxRange',
        status: '✅ Implemented',
        method: 'maxRange(sheetName, startCell, endCell)',
        needsUpdate: false
      };
    }
    return {
      algorithm: 'maxRange',
      status: '🟡 Partial - Needs multi-arg support',
      method: 'maxRange(sheetName, startCell, endCell)',
      needsUpdate: true,
      note: 'May need max(...values) for multiple arguments'
    };
  }
  
  if (funcs.includes('MIN')) {
    if (patternLower.includes('min(cell:cell)')) {
      return {
        algorithm: 'minRange',
        status: '✅ Implemented',
        method: 'minRange(sheetName, startCell, endCell)',
        needsUpdate: false
      };
    }
    return {
      algorithm: 'minRange',
      status: '🟡 Partial - Needs multi-arg support',
      method: 'minRange(sheetName, startCell, endCell)',
      needsUpdate: true,
      note: 'May need min(...values) for multiple arguments'
    };
  }
  
  // IFERROR
  if (funcs.includes('IFERROR')) {
    return {
      algorithm: 'ifError',
      status: '✅ Implemented',
      method: 'ifError(value, defaultValue)',
      needsUpdate: false
    };
  }
  
  // LOG/EXP
  if (funcs.includes('LOG') || funcs.includes('LN')) {
    return {
      algorithm: 'log',
      status: '✅ Implemented',
      method: 'log(value, base = Math.E)',
      needsUpdate: false
    };
  }
  
  if (funcs.includes('EXP')) {
    return {
      algorithm: 'exp',
      status: '✅ Implemented',
      method: 'exp(value)',
      needsUpdate: false
    };
  }
  
  // RRI
  if (funcs.includes('RRI')) {
    return {
      algorithm: 'rri',
      status: '✅ Implemented',
      method: 'rri(nper, pv, fv)',
      needsUpdate: false
    };
  }
  
  // INDEX/MATCH
  if (funcs.includes('INDEX') || funcs.includes('MATCH')) {
    return {
      algorithm: 'indexMatch',
      status: '❌ Not Implemented',
      method: 'indexMatch(lookupValue, lookupRange, returnRange, exactMatch)',
      needsUpdate: true,
      priority: 'P0'
    };
  }
  
  // IRR
  if (funcs.includes('IRR')) {
    return {
      algorithm: 'irr',
      status: '❌ Not Implemented',
      method: 'irr(values, guess)',
      needsUpdate: true,
      priority: 'P1'
    };
  }
  
  // OFFSET
  if (funcs.includes('OFFSET')) {
    return {
      algorithm: 'offset',
      status: '❌ Not Implemented',
      method: 'offset(reference, rows, cols, height, width)',
      needsUpdate: true,
      priority: 'P2'
    };
  }
  
  // QUARTILE
  if (funcs.includes('QUARTILE')) {
    return {
      algorithm: 'quartile',
      status: '❌ Not Implemented',
      method: 'quartile(array, quart)',
      needsUpdate: true,
      priority: 'P0'
    };
  }
  
  // AVERAGE
  if (funcs.includes('AVERAGE')) {
    return {
      algorithm: 'average',
      status: '❌ Not Implemented',
      method: 'average(sheetName, startCell, endCell)',
      needsUpdate: true,
      priority: 'P1'
    };
  }
  
  // AND/OR
  if (funcs.includes('AND')) {
    return {
      algorithm: 'and',
      status: '❌ Not Implemented',
      method: 'and(...conditions)',
      needsUpdate: true,
      priority: 'P1'
    };
  }
  
  if (funcs.includes('OR')) {
    return {
      algorithm: 'or',
      status: '❌ Not Implemented',
      method: 'or(...conditions)',
      needsUpdate: true,
      priority: 'P1'
    };
  }
  
  // COLUMN
  if (funcs.includes('COLUMN')) {
    return {
      algorithm: 'column',
      status: '❌ Not Implemented',
      method: 'column(cellRef)',
      needsUpdate: true,
      priority: 'P2'
    };
  }
  
  // ROUNDDOWN
  if (funcs.includes('ROUNDDOWN')) {
    return {
      algorithm: 'roundDown',
      status: '❌ Not Implemented',
      method: 'roundDown(number, numDigits)',
      needsUpdate: true,
      priority: 'P2'
    };
  }
  
  // MOD
  if (funcs.includes('MOD')) {
    return {
      algorithm: 'mod',
      status: '❌ Not Implemented',
      method: 'mod(number, divisor)',
      needsUpdate: true,
      priority: 'P2'
    };
  }
  
  // COUNTA
  if (funcs.includes('COUNTA')) {
    return {
      algorithm: 'countA',
      status: '❌ Not Implemented',
      method: 'countA(sheetName, startCell, endCell)',
      needsUpdate: true,
      priority: 'P2'
    };
  }
  
  // RAND (random number generation) - check early before AND
  if (patternLower.includes('rand()') || patternLower === '=rand()') {
    return {
      algorithm: 'random',
      status: '❌ Not Implemented',
      method: 'random()',
      needsUpdate: true,
      priority: 'P1',
      note: 'Used for Monte Carlo simulation'
    };
  }
  
  // NORM.INV (normal distribution inverse)
  if (patternLower.includes('norm.inv')) {
    return {
      algorithm: 'normInv',
      status: '❌ Not Implemented',
      method: 'normInv(probability, mean, stdDev)',
      needsUpdate: true,
      priority: 'P1',
      note: 'Used for Monte Carlo random number generation'
    };
  }
  
  // Complex nested division/multiplication patterns
  if (patternLower.includes('(cell/(cell*(num-cell)))*(cell/(cell/(cell*(num-c')) {
    return {
      algorithm: 'composite',
      status: '✅ Implemented via basic operations',
      method: 'divide/multiply combined',
      needsUpdate: false,
      note: 'Complex arithmetic pattern - uses divide and multiply'
    };
  }
  
  // Complex nested patterns - need composite algorithms
  if (complexity === 'Complex') {
    return {
      algorithm: 'composite',
      status: '🟡 Needs Analysis',
      method: 'Multiple algorithms combined',
      needsUpdate: true,
      note: 'Complex pattern requiring multiple algorithm calls',
      priority: 'P1'
    };
  }
  
  // Default: simple arithmetic pattern
  if (complexity === 'Simple' && funcs.length === 0) {
    return {
      algorithm: 'arithmetic',
      status: '✅ Implemented via basic operations',
      method: 'add/subtract/multiply/divide',
      needsUpdate: false
    };
  }
  
  // Unknown pattern
  return {
    algorithm: 'UNMAPPED',
    status: '⚠️ Needs Mapping',
    method: 'TBD',
    needsUpdate: true,
    priority: 'P2',
    note: 'Pattern not yet mapped to algorithm'
  };
}

// Map all patterns
const mappings = [];
const algorithmCoverage = new Map();
const missingAlgorithms = new Set();

inventory.patterns.forEach((pattern, index) => {
  const mapping = mapPatternToAlgorithm(pattern);
  mappings.push({
    patternIndex: index + 1,
    pattern: pattern.pattern,
    count: pattern.count,
    complexity: pattern.complexity,
    functions: pattern.functions,
    sheets: pattern.sheets,
    example: pattern.original,
    ...mapping
  });
  
  // Track algorithm usage
  const algo = mapping.algorithm;
  if (!algorithmCoverage.has(algo)) {
    algorithmCoverage.set(algo, {
      algorithm: algo,
      patterns: [],
      totalCount: 0,
      status: mapping.status
    });
  }
  algorithmCoverage.get(algo).patterns.push(pattern.pattern);
  algorithmCoverage.get(algo).totalCount += pattern.count;
  
  // Track missing algorithms
  if (mapping.status.includes('Not Implemented') || mapping.status.includes('Needs')) {
    missingAlgorithms.add(algo);
  }
});

// Generate markdown mapping document
let markdown = `# Pattern-to-Algorithm Mapping

**Total Patterns**: ${inventory.patterns.length}  
**Total Formulas**: ${inventory.summary.totalFormulas}  
**Generated**: ${new Date().toISOString()}

## Summary

- **✅ Fully Implemented**: ${mappings.filter(m => m.status.includes('✅')).length} patterns
- **🟡 Partial/Needs Update**: ${mappings.filter(m => m.status.includes('🟡')).length} patterns
- **❌ Not Implemented**: ${mappings.filter(m => m.status.includes('❌')).length} patterns
- **⚠️ Unmapped**: ${mappings.filter(m => m.status.includes('⚠️')).length} patterns

---

## Complete Pattern-to-Algorithm Mapping

| # | Pattern | Count | Algorithm | Method | Status | Priority | Notes |
|---|---------|-------|-----------|--------|--------|----------|-------|
`;

mappings.forEach((mapping) => {
  const priority = mapping.priority || (mapping.count > 100 ? 'P0' : mapping.count > 50 ? 'P1' : mapping.count > 10 ? 'P2' : 'P3');
  const note = mapping.note || '';
  const patternDisplay = mapping.pattern.substring(0, 50).replace(/\|/g, '\\|');
  const exampleDisplay = mapping.example.substring(0, 40).replace(/\|/g, '\\|');
  
  markdown += `| ${mapping.patternIndex} | \`${patternDisplay}\` | ${mapping.count} | **${mapping.algorithm}** | \`${mapping.method}\` | ${mapping.status} | ${priority} | ${note} |\n`;
});

markdown += `\n---

## Algorithm Coverage Summary

| Algorithm | Patterns Covered | Total Formulas | Status |
|-----------|------------------|----------------|--------|
`;

const sortedCoverage = Array.from(algorithmCoverage.values())
  .sort((a, b) => b.totalCount - a.totalCount);

sortedCoverage.forEach((coverage) => {
  markdown += `| **${coverage.algorithm}** | ${coverage.patterns.length} | ${coverage.totalCount} | ${coverage.status} |\n`;
});

markdown += `\n---

## Missing Algorithms (Need Implementation)

`;

if (missingAlgorithms.size > 0) {
  Array.from(missingAlgorithms).sort().forEach((algo) => {
    const patterns = mappings.filter(m => m.algorithm === algo);
    markdown += `### ${algo}\n\n`;
    markdown += `**Patterns**: ${patterns.length}\n`;
    markdown += `**Total Formulas**: ${patterns.reduce((sum, p) => sum + p.count, 0)}\n\n`;
    markdown += `Patterns using this algorithm:\n`;
    patterns.slice(0, 5).forEach((p, i) => {
      markdown += `${i + 1}. \`${p.pattern.substring(0, 60)}\` (${p.count}x)\n`;
    });
    if (patterns.length > 5) {
      markdown += `... and ${patterns.length - 5} more\n`;
    }
    markdown += `\n`;
  });
} else {
  markdown += `*All algorithms are mapped!*\n`;
}

markdown += `\n---

## Implementation Checklist

### P0 - Critical (Must Implement)
`;

const p0Patterns = mappings.filter(m => m.count > 100 && (m.status.includes('❌') || m.status.includes('⚠️')));
if (p0Patterns.length > 0) {
  p0Patterns.forEach((p) => {
    markdown += `- [ ] **${p.algorithm}** - \`${p.pattern.substring(0, 50)}\` (${p.count} formulas)\n`;
  });
} else {
  markdown += `*All P0 patterns are implemented!*\n`;
}

markdown += `\n### P1 - High Priority\n`;

const p1Patterns = mappings.filter(m => m.count > 50 && m.count <= 100 && (m.status.includes('❌') || m.status.includes('⚠️')));
if (p1Patterns.length > 0) {
  p1Patterns.forEach((p) => {
    markdown += `- [ ] **${p.algorithm}** - \`${p.pattern.substring(0, 50)}\` (${p.count} formulas)\n`;
  });
} else {
  markdown += `*All P1 patterns are implemented!*\n`;
}

markdown += `\n---

## Notes

1. **Pattern Normalization**: Patterns are normalized (CELL = cell reference, NUM = number, STR = string)
2. **Composite Patterns**: Complex patterns may require multiple algorithm calls
3. **Status Legend**:
   - ✅ Implemented: Fully working
   - 🟡 Partial: Partially implemented, may need enhancements
   - ❌ Not Implemented: Missing algorithm
   - ⚠️ Unmapped: Pattern not yet analyzed

---

*This mapping ensures all ${inventory.summary.totalFormulas} formulas across ${inventory.patterns.length} unique patterns are accounted for.*
`;

// Save mapping
const mappingPath = path.join(__dirname, '../PATTERN_TO_ALGORITHM_MAPPING.md');
fs.writeFileSync(mappingPath, markdown);
console.log(`✓ Generated mapping: ${mappingPath}`);

// Save JSON mapping
const jsonMappingPath = path.join(__dirname, '../PATTERN_TO_ALGORITHM_MAPPING.json');
fs.writeFileSync(jsonMappingPath, JSON.stringify({
  summary: {
    totalPatterns: inventory.patterns.length,
    totalFormulas: inventory.summary.totalFormulas,
    implemented: mappings.filter(m => m.status.includes('✅')).length,
    partial: mappings.filter(m => m.status.includes('🟡')).length,
    notImplemented: mappings.filter(m => m.status.includes('❌')).length,
    unmapped: mappings.filter(m => m.status.includes('⚠️')).length
  },
  mappings: mappings,
  algorithmCoverage: Array.from(algorithmCoverage.values())
}, null, 2));
console.log(`✓ Generated JSON mapping: ${jsonMappingPath}`);

console.log('\n=== MAPPING SUMMARY ===');
console.log(`Total Patterns: ${inventory.patterns.length}`);
console.log(`✅ Implemented: ${mappings.filter(m => m.status.includes('✅')).length}`);
console.log(`🟡 Partial: ${mappings.filter(m => m.status.includes('🟡')).length}`);
console.log(`❌ Not Implemented: ${mappings.filter(m => m.status.includes('❌')).length}`);
console.log(`⚠️ Unmapped: ${mappings.filter(m => m.status.includes('⚠️')).length}`);
console.log(`\nMissing Algorithms: ${Array.from(missingAlgorithms).join(', ')}`);

