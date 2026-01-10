/**
 * Identify missing business algorithms by analyzing "other" formulas
 */

const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, '../FORMULA_INVENTORY.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const excelDataPath = path.join(__dirname, '../excel_parsed_detailed.json');
const excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf8'));
const mappingPath = path.join(__dirname, '../BUSINESS_ALGORITHMS_COMPLETE.json');
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

// Get all "other" formulas
const otherFormulas = mapping.mappings.filter(m => m.businessAlgorithms.includes('other'));

console.log(`Analyzing ${otherFormulas.length} "other" formulas to identify missing business algorithms...\n`);

// Analyze patterns
const patterns = {
  monte_carlo: [],
  cumulative_calculations: [],
  present_value_components: [],
  depreciation: [],
  revenue_components: [],
  cost_components: [],
  ratio_calculations: [],
  time_series_aggregation: [],
  conditional_revenue: [],
  conditional_costs: [],
  lookup_interpolation: [],
  statistical_aggregation: []
};

otherFormulas.forEach(f => {
  const formula = f.formula.toLowerCase();
  const cell = f.cell;
  const sheet = f.sheet;
  
  // Monte Carlo Simulation
  if (formula.includes('rand()') || formula.includes('norm.inv')) {
    patterns.monte_carlo.push(f);
  }
  
  // Cumulative calculations (e.g., J172+(J190/J174))
  if (formula.match(/[a-z]\d+\+\([a-z]\d+\/[a-z]\d+\)/) || 
      formula.match(/[a-z]\d+\+\([a-z]\d+\*[a-z]\d+\)/) ||
      (formula.includes('+') && formula.includes('/') && cell.match(/[A-Z]\d{3,}/))) {
    patterns.cumulative_calculations.push(f);
  }
  
  // Present Value components (O58, O59, O61, O62)
  if (cell.match(/O5[89]|O6[12]/) || formula.includes('present') || formula.includes('pv')) {
    patterns.present_value_components.push(f);
  }
  
  // Depreciation (cumulative depreciation patterns)
  if (formula.includes('depreciation') || 
      (formula.includes('+') && cell.match(/[A-Z]17[0-9]/))) {
    patterns.depreciation.push(f);
  }
  
  // Revenue components (O95, O96, O99, O111, O112, O113, O116-O118)
  if (cell.match(/O9[569]|O11[1-9]|O11[6-8]/) || 
      formula.includes('revenue') ||
      (formula.includes('penetration') && formula.includes('*'))) {
    patterns.revenue_components.push(f);
  }
  
  // Cost components (O127, O128, O130, O134, O135, O137, O142-O143)
  if (cell.match(/O12[78]|O13[047]|O14[2-3]/) ||
      formula.includes('cost') ||
      formula.includes('expense')) {
    patterns.cost_components.push(f);
  }
  
  // Ratio calculations (O408/$I$408)
  if (formula.match(/\/\$[a-z]\$\d+/) || 
      (formula.includes('/') && formula.match(/\$[a-z]\$\d+/))) {
    patterns.ratio_calculations.push(f);
  }
  
  // Time-series aggregation (year-over-year)
  if (cell.match(/[A-Z]\d{3,}/) && 
      (formula.includes('sum') || formula.includes('max') || formula.includes('min'))) {
    patterns.time_series_aggregation.push(f);
  }
  
  // Conditional revenue (IF statements with revenue calculations)
  if (formula.includes('if') && 
      (formula.includes('revenue') || formula.includes('*') && formula.includes('j267') || formula.includes('j268'))) {
    patterns.conditional_revenue.push(f);
  }
  
  // Conditional costs (IF statements with cost calculations)
  if (formula.includes('if') && 
      (formula.includes('cost') || formula.includes('expense'))) {
    patterns.conditional_costs.push(f);
  }
  
  // Lookup/Interpolation (INDEX/MATCH, OFFSET)
  if (formula.includes('index') || formula.includes('match') || formula.includes('offset') || formula.includes('vlookup')) {
    patterns.lookup_interpolation.push(f);
  }
  
  // Statistical aggregation (QUARTILE, AVERAGE, etc.)
  if (formula.includes('quartile') || formula.includes('average') || formula.includes('percentile')) {
    patterns.statistical_aggregation.push(f);
  }
});

// Print findings
console.log('=== MISSING BUSINESS ALGORITHMS IDENTIFIED ===\n');

Object.entries(patterns).forEach(([key, formulas]) => {
  if (formulas.length > 0) {
    console.log(`${key.toUpperCase().replace(/_/g, ' ')}: ${formulas.length} formulas`);
    
    // Show examples
    const examples = formulas.slice(0, 3);
    examples.forEach((ex, i) => {
      console.log(`  ${i+1}. ${ex.sheet}!${ex.cell}: ${ex.formula.substring(0, 80)}`);
    });
    console.log('');
  }
});

// Generate missing algorithms document
let markdown = `# Missing Business Algorithms - Deep Analysis

**Analysis Date**: ${new Date().toISOString()}

**Total "Other" Formulas Analyzed**: ${otherFormulas.length}

---

## 🔍 **Missing Business Algorithms Identified**

`;

Object.entries(patterns).forEach(([key, formulas]) => {
  if (formulas.length > 0) {
    const name = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    markdown += `### ${name}\n\n`;
    markdown += `**Count**: ${formulas.length} formulas\n\n`;
    markdown += `**Description**: \n\n`;
    
    // Add description based on pattern
    const descriptions = {
      monte_carlo: 'Monte Carlo simulation using RAND() and NORM.INV for probabilistic modeling',
      cumulative_calculations: 'Cumulative calculations (year-over-year accumulation)',
      present_value_components: 'Present value calculations for individual revenue/cost components',
      depreciation: 'Depreciation calculations (cumulative depreciation over time)',
      revenue_components: 'Individual revenue component calculations (Starlink, Launch, etc.)',
      cost_components: 'Individual cost component calculations (OpEx, CapEx, etc.)',
      ratio_calculations: 'Ratio and percentage calculations (normalization, scaling)',
      time_series_aggregation: 'Time-series aggregations (SUM, MAX, MIN over periods)',
      conditional_revenue: 'Conditional revenue calculations based on milestones/conditions',
      conditional_costs: 'Conditional cost calculations based on milestones/conditions',
      lookup_interpolation: 'Lookup and interpolation functions (INDEX/MATCH, OFFSET)',
      statistical_aggregation: 'Statistical aggregations (QUARTILE, AVERAGE, PERCENTILE)'
    };
    
    markdown += `${descriptions[key] || 'To be defined'}\n\n`;
    
    markdown += `**Example Formulas**:\n\n`;
    formulas.slice(0, 10).forEach((ex, i) => {
      markdown += `${i+1}. \`${ex.formula}\`\n`;
      markdown += `   Location: ${ex.sheet}!${ex.cell}\n\n`;
    });
    
    if (formulas.length > 10) {
      markdown += `*... and ${formulas.length - 10} more formulas*\n\n`;
    }
    
    markdown += `---\n\n`;
  }
});

// Summary
markdown += `## 📊 **Summary**\n\n`;
markdown += `| Algorithm Category | Formula Count | Status |\n`;
markdown += `|-------------------|---------------|--------|\n`;

Object.entries(patterns).forEach(([key, formulas]) => {
  if (formulas.length > 0) {
    const name = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    markdown += `| ${name} | ${formulas.length} | ⚠️ Missing |\n`;
  }
});

const totalMissing = Object.values(patterns).reduce((sum, arr) => sum + arr.length, 0);
markdown += `\n**Total Formulas in Missing Algorithms**: ${totalMissing}\n`;
markdown += `**Remaining "Other" Formulas**: ${otherFormulas.length - totalMissing}\n`;

// Save
const reportPath = path.join(__dirname, '../MISSING_BUSINESS_ALGORITHMS.md');
fs.writeFileSync(reportPath, markdown);
console.log(`\n✓ Generated: ${reportPath}`);

// Save JSON
const jsonPath = path.join(__dirname, '../MISSING_BUSINESS_ALGORITHMS.json');
fs.writeFileSync(jsonPath, JSON.stringify({
  summary: {
    totalOtherFormulas: otherFormulas.length,
    missingAlgorithms: Object.keys(patterns).filter(k => patterns[k].length > 0).length,
    totalMissingFormulas: totalMissing
  },
  patterns: Object.fromEntries(
    Object.entries(patterns).map(([k, v]) => [k, {
      count: v.length,
      formulas: v.slice(0, 50) // Limit to first 50 for size
    }])
  )
}, null, 2));
console.log(`✓ Generated JSON: ${jsonPath}`);

console.log(`\n✓ Analysis complete!`);





