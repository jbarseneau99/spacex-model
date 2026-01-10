/**
 * Generate comprehensive markdown table of all formulas
 */

const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, '../FORMULA_INVENTORY.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

// Implementation status mapping
function getImplementationStatus(pattern) {
  const funcs = pattern.functions;
  const patternStr = pattern.pattern.toLowerCase();
  
  // Fully implemented
  if (funcs.length === 0 && pattern.complexity === 'Simple') {
    if (patternStr.includes('cell') && !patternStr.includes('sum') && !patternStr.includes('if')) {
      return '✅ Implemented';
    }
  }
  
  // Partially implemented
  if (funcs.some(f => ['SUM', 'IF', 'MAX', 'MIN'].includes(f))) {
    return '🟡 Partial';
  }
  
  // Not implemented
  if (funcs.some(f => ['INDEX', 'MATCH', 'IRR', 'OFFSET', 'QUARTILE'].includes(f))) {
    return '❌ Not Implemented';
  }
  
  return '🟡 Partial';
}

// Priority mapping
function getPriority(pattern) {
  if (pattern.count > 100) return 'P0 - Critical';
  if (pattern.count > 50) return 'P1 - High';
  if (pattern.count > 10) return 'P2 - Medium';
  return 'P3 - Low';
}

// Generate markdown table
let markdown = `# Complete Formula Inventory

**Total Formulas**: ${inventory.summary.totalFormulas}  
**Unique Patterns**: ${inventory.summary.uniquePatterns}  
**Generated**: ${new Date().toISOString()}

## Summary Statistics

### By Sheet
${Object.entries(inventory.summary.sheets).map(([sheet, count]) => 
  `- **${sheet}**: ${count} formulas`
).join('\n')}

### Top Functions
${Object.entries(inventory.summary.functionUsage)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([func, count]) => `- **${func}**: ${count} uses`)
  .join('\n')}

### Complexity Breakdown
- **Simple**: ${inventory.summary.complexityBreakdown.Simple} (${Math.round(inventory.summary.complexityBreakdown.Simple / inventory.summary.totalFormulas * 100)}%)
- **Medium**: ${inventory.summary.complexityBreakdown.Medium} (${Math.round(inventory.summary.complexityBreakdown.Medium / inventory.summary.totalFormulas * 100)}%)
- **Complex**: ${inventory.summary.complexityBreakdown.Complex} (${Math.round(inventory.summary.complexityBreakdown.Complex / inventory.summary.totalFormulas * 100)}%)

---

## Complete Formula Pattern Inventory

| # | Pattern | Count | Complexity | Sheets | Functions | Example | Status | Priority |
|---|---------|-------|------------|--------|-----------|---------|--------|----------|
`;

inventory.patterns.forEach((pattern, index) => {
  const status = getImplementationStatus(pattern);
  const priority = getPriority(pattern);
  const example = pattern.original.substring(0, 60).replace(/\|/g, '\\|');
  const functions = pattern.functions.length > 0 ? pattern.functions.join(', ') : 'None';
  const sheets = pattern.sheets.join(', ');
  
  markdown += `| ${index + 1} | \`${pattern.pattern.substring(0, 50)}\` | ${pattern.count} | ${pattern.complexity} | ${sheets.substring(0, 30)} | ${functions.substring(0, 30)} | \`${example}\` | ${status} | ${priority} |\n`;
});

markdown += `\n---

## Implementation Legend

- ✅ **Implemented**: Fully working in valuation-algorithms.js
- 🟡 **Partial**: Some functions implemented, needs completion
- ❌ **Not Implemented**: Missing critical functions

## Priority Legend

- **P0 - Critical**: Used 100+ times, must implement
- **P1 - High**: Used 50-99 times, should implement soon
- **P2 - Medium**: Used 10-49 times, implement when time allows
- **P3 - Low**: Used <10 times, low priority

---

## Notes

1. Patterns are normalized (cell references → CELL, numbers → NUM, strings → STR)
2. Example formulas show the first occurrence found
3. Function counts include all occurrences across all formulas
4. Implementation status is based on current valuation-algorithms.js capabilities

---

*This inventory accounts for all ${inventory.summary.totalFormulas} formulas across ${inventory.patterns.length} unique patterns.*
`;

// Save markdown
const mdPath = path.join(__dirname, '../FORMULA_INVENTORY_TABLE.md');
fs.writeFileSync(mdPath, markdown);
console.log(`✓ Generated markdown table: ${mdPath}`);

// Also create a detailed breakdown by sheet
let sheetBreakdown = `# Formula Breakdown by Sheet\n\n`;
for (const [sheetName, count] of Object.entries(inventory.summary.sheets)) {
  const sheetFormulas = inventory.allFormulas.filter(f => f.sheet === sheetName);
  const sheetPatterns = inventory.patterns.filter(p => p.sheets.includes(sheetName));
  
  sheetBreakdown += `## ${sheetName} (${count} formulas, ${sheetPatterns.length} unique patterns)\n\n`;
  sheetBreakdown += `### Top Patterns\n\n`;
  sheetPatterns.slice(0, 10).forEach((p, i) => {
    sheetBreakdown += `${i + 1}. **${p.count}x** - \`${p.pattern.substring(0, 60)}\`\n`;
  });
  sheetBreakdown += `\n---\n\n`;
}

const breakdownPath = path.join(__dirname, '../FORMULA_BREAKDOWN_BY_SHEET.md');
fs.writeFileSync(breakdownPath, sheetBreakdown);
console.log(`✓ Generated sheet breakdown: ${breakdownPath}`);

console.log('\n✓ Table generation complete!');





