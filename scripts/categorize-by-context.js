/**
 * Categorize "other" formulas based on ACTUAL context and patterns
 * No made-up categories - only real patterns we can identify
 */

const fs = require('fs');
const path = require('path');

const mappingPath = path.join(__dirname, '../BUSINESS_ALGORITHMS_COMPLETE.json');
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
const missingPath = path.join(__dirname, '../MISSING_BUSINESS_ALGORITHMS.json');
const missing = JSON.parse(fs.readFileSync(missingPath, 'utf8'));

// Get formulas still categorized as "other"
const otherFormulas = mapping.mappings.filter(m => m.businessAlgorithms.includes('other'));

// Get missing algorithm formulas to exclude
const missingFormulas = new Set();
Object.values(missing.patterns).forEach(pattern => {
  pattern.formulas.forEach(f => {
    missingFormulas.add(`${f.sheet}!${f.cell}`);
  });
});

// Remove missing ones
const stillOther = otherFormulas.filter(f => !missingFormulas.has(`${f.sheet}!${f.cell}`));

console.log(`Analyzing ${stillOther.length} formulas for context-based categorization...\n`);

// Categories based on ACTUAL patterns we can identify
const categories = {
  // Valuation output/display (O153 is final valuation)
  valuation_output: {
    name: 'Valuation Output/Display',
    description: 'Formulas that reference or display final valuation values',
    formulas: []
  },
  
  // Revenue component calculations (O116-O118 are revenue components)
  revenue_component_calc: {
    name: 'Revenue Component Calculations',
    description: 'Formulas calculating individual revenue components (O116-O118, O95-O99, O111-O113)',
    formulas: []
  },
  
  // Cost component calculations (O142-O143 are cost components)
  cost_component_calc: {
    name: 'Cost Component Calculations',
    description: 'Formulas calculating individual cost components (O142-O143, O127-O130, O134-O137)',
    formulas: []
  },
  
  // Present value calculations (O58, O59, O61, O62 are PV components)
  present_value_calc: {
    name: 'Present Value Calculations',
    description: 'Formulas calculating present value of cash flows (O58, O59, O61, O62)',
    formulas: []
  },
  
  // Time-series year-over-year (same pattern across columns I, J, K, L, etc.)
  time_series_replication: {
    name: 'Time-Series Replication',
    description: 'Same calculation pattern repeated across years (columns I→J→K→L...)',
    formulas: []
  },
  
  // Cross-sheet data linking
  cross_sheet_link: {
    name: 'Cross-Sheet Data Linking',
    description: 'Formulas linking data between sheets (Earth!O153, Mars!K54)',
    formulas: []
  },
  
  // Simple cell reference (just passing values)
  cell_reference: {
    name: 'Cell Reference',
    description: 'Simple cell references that pass values through',
    formulas: []
  },
  
  // Revenue aggregation (SUM of revenue components)
  revenue_aggregation: {
    name: 'Revenue Aggregation',
    description: 'SUM formulas aggregating revenue components',
    formulas: []
  },
  
  // Cost aggregation (SUM of cost components)
  cost_aggregation: {
    name: 'Cost Aggregation',
    description: 'SUM formulas aggregating cost components',
    formulas: []
  },
  
  // Probability/scenario weighting (B7*B8, C7*C8 patterns)
  scenario_weighting: {
    name: 'Scenario Weighting',
    description: 'Formulas weighting values by probability/scenario (valuation × probability)',
    formulas: []
  }
};

// Categorize based on ACTUAL patterns
stillOther.forEach(f => {
  const formula = f.formula.toLowerCase();
  const cell = f.cell;
  const sheet = f.sheet;
  
  // Valuation output (O153 is final valuation)
  if (cell === 'O153' || formula.includes('o153') || 
      (cell.match(/^[B-D]7$/) && formula.includes('o153')) ||
      (cell.match(/^[B-D]9$/) && formula.match(/[b-d]7\*[b-d]8/))) {
    categories.valuation_output.formulas.push(f);
    return;
  }
  
  // Revenue components (O116-O118, O95-O99, O111-O113)
  if (cell.match(/O11[6-9]|O9[5-9]|O11[1-3]/) ||
      formula.match(/o11[6-9]|o9[5-9]|o11[1-3]/) ||
      (formula.includes('penetration') && formula.includes('*')) ||
      (formula.includes('tam') && formula.includes('*'))) {
    categories.revenue_component_calc.formulas.push(f);
    return;
  }
  
  // Cost components (O142-O143, O127-O130, O134-O137)
  if (cell.match(/O14[2-3]|O12[7-9]|O13[0-7]/) ||
      formula.match(/o14[2-3]|o12[7-9]|o13[0-7]/)) {
    categories.cost_component_calc.formulas.push(f);
    return;
  }
  
  // Present value (O58, O59, O61, O62)
  if (cell.match(/O5[89]|O6[12]/) ||
      formula.match(/o5[89]|o6[12]/)) {
    categories.present_value_calc.formulas.push(f);
    return;
  }
  
  // Revenue aggregation (SUM of revenue ranges)
  if (formula.includes('sum') && (
      formula.match(/sum\([a-z]11[6-9]:[a-z]11[6-9]\)/) ||
      formula.match(/sum\([a-z]9[5-9]:[a-z]9[5-9]\)/) ||
      formula.match(/sum\([a-z]11[1-3]:[a-z]11[1-3]\)/))) {
    categories.revenue_aggregation.formulas.push(f);
    return;
  }
  
  // Cost aggregation (SUM of cost ranges)
  if (formula.includes('sum') && (
      formula.match(/sum\([a-z]14[2-3]:[a-z]14[2-3]\)/) ||
      formula.match(/sum\([a-z]12[7-9]:[a-z]12[7-9]\)/))) {
    categories.cost_aggregation.formulas.push(f);
    return;
  }
  
  // Cross-sheet links
  if (formula.includes('earth!') || formula.includes('mars!') || formula.includes('valuation outputs!')) {
    categories.cross_sheet_link.formulas.push(f);
    return;
  }
  
  // Scenario weighting (B7*B8, C7*C8, D7*D8 pattern)
  if (cell.match(/^[B-D]9$/) && formula.match(/[b-d]7\*[b-d]8/)) {
    categories.scenario_weighting.formulas.push(f);
    return;
  }
  
  // Time-series replication (same pattern across columns)
  // Pattern: I90+(J426*J428) → J90+(K426*K428) → K90+(L426*L428)
  if (cell.match(/^[J-Z][A-Z]?\d+$/) && 
      formula.match(/[a-z]\d+\+\([a-z]\d+\*[a-z]\d+\)/) &&
      !formula.includes('sum')) {
    // Check if previous column has similar pattern
    const prevCol = String.fromCharCode(cell.charCodeAt(0) - 1);
    const row = cell.match(/\d+/)[0];
    const prevCell = `${prevCol}${row}`;
    const prevFormula = stillOther.find(f2 => f2.cell === prevCell && f2.sheet === sheet);
    if (prevFormula && prevFormula.formula.match(/[a-z]\d+\+\([a-z]\d+\*[a-z]\d+\)/)) {
      categories.time_series_replication.formulas.push(f);
      return;
    }
  }
  
  // Simple cell reference (just =CELL pattern)
  if (formula.match(/^=[a-z]\d+$/)) {
    categories.cell_reference.formulas.push(f);
    return;
  }
  
  // Default: leave uncategorized (we'll handle these separately)
});

// Generate report
let markdown = `# Context-Based Formula Categorization

**Categorizing formulas based on ACTUAL patterns and cell locations**

**Generated**: ${new Date().toISOString()}

---

## 📊 **Categorization Results**

`;

// Summary table
markdown += `| Category | Count | % of "Other" | Description |\n`;
markdown += `|----------|-------|---------------|-------------|\n`;

const totalCategorized = Object.values(categories).reduce((sum, cat) => sum + cat.formulas.length, 0);
const uncategorized = stillOther.length - totalCategorized;

Object.entries(categories)
  .sort((a, b) => b[1].formulas.length - a[1].formulas.length)
  .forEach(([key, cat]) => {
    if (cat.formulas.length > 0) {
      const percent = ((cat.formulas.length / stillOther.length) * 100).toFixed(1);
      markdown += `| ${cat.name} | ${cat.formulas.length} | ${percent}% | ${cat.description} |\n`;
    }
  });

markdown += `| **Still Uncategorized** | ${uncategorized} | ${((uncategorized / stillOther.length) * 100).toFixed(1)}% | Formulas that don't match known patterns |\n`;
markdown += `| **TOTAL** | **${stillOther.length}** | **100%** | |\n\n`;

markdown += `---\n\n## 📋 **Detailed Categories**\n\n`;

Object.entries(categories)
  .sort((a, b) => b[1].formulas.length - a[1].formulas.length)
  .forEach(([key, cat]) => {
    if (cat.formulas.length > 0) {
      markdown += `### ${cat.name}\n\n`;
      markdown += `**Description**: ${cat.description}\n\n`;
      markdown += `**Count**: ${cat.formulas.length} formulas\n\n`;
      
      // Show examples
      const examples = cat.formulas.slice(0, 10);
      markdown += `**Example Formulas**:\n\n`;
      examples.forEach((ex, i) => {
        markdown += `${i + 1}. \`${ex.formula}\`\n`;
        markdown += `   Location: ${ex.sheet}!${ex.cell}\n\n`;
      });
      
      if (cat.formulas.length > 10) {
        markdown += `*... and ${cat.formulas.length - 10} more formulas*\n\n`;
      }
      
      markdown += `---\n\n`;
    }
  });

// Save
const reportPath = path.join(__dirname, '../CONTEXT_BASED_CATEGORIZATION.md');
fs.writeFileSync(reportPath, markdown);
console.log(`✓ Generated: ${reportPath}`);

// Save JSON
const jsonPath = path.join(__dirname, '../CONTEXT_BASED_CATEGORIZATION.json');
fs.writeFileSync(jsonPath, JSON.stringify({
  summary: {
    totalOtherFormulas: stillOther.length,
    categorized: totalCategorized,
    uncategorized: uncategorized,
    categories: Object.keys(categories).filter(k => categories[k].formulas.length > 0)
  },
  categories: Object.fromEntries(
    Object.entries(categories).map(([k, v]) => [k, {
      name: v.name,
      description: v.description,
      count: v.formulas.length,
      formulas: v.formulas.slice(0, 100) // Limit for size
    }])
  )
}, null, 2));
console.log(`✓ Generated JSON: ${jsonPath}`);

// Print summary
console.log('\n=== CATEGORIZATION SUMMARY ===');
Object.entries(categories)
  .filter(([k, v]) => v.formulas.length > 0)
  .sort((a, b) => b[1].formulas.length - a[1].formulas.length)
  .forEach(([key, cat]) => {
    console.log(`${cat.name}: ${cat.formulas.length} formulas`);
  });
console.log(`\nStill uncategorized: ${uncategorized} formulas`);
console.log(`\nTotal categorized: ${totalCategorized} / ${stillOther.length} (${((totalCategorized / stillOther.length) * 100).toFixed(1)}%)`);





