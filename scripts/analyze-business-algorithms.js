/**
 * Analyze formulas to map them to BUSINESS ALGORITHMS
 * Not Excel functions - actual business logic like revenue calculation, cost models, growth projections
 */

const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, '../FORMULA_INVENTORY.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const excelDataPath = path.join(__dirname, '../excel_parsed_detailed.json');
const excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf8'));

// Business algorithm categories
const businessAlgorithms = {
  // Revenue Algorithms
  revenue: {
    name: 'Revenue Calculation',
    patterns: [],
    formulas: [],
    description: 'How revenue is calculated from business drivers'
  },
  
  // Cost Algorithms
  costs: {
    name: 'Cost Calculation',
    patterns: [],
    formulas: [],
    description: 'How costs are calculated (operating costs, capital costs, etc.)'
  },
  
  // Growth Algorithms
  growth: {
    name: 'Growth Projection',
    patterns: [],
    formulas: [],
    description: 'How business grows over time (penetration curves, adoption rates)'
  },
  
  // Valuation Algorithms
  valuation: {
    name: 'Valuation Calculation',
    patterns: [],
    formulas: [],
    description: 'How final valuation is calculated (DCF, terminal value, etc.)'
  },
  
  // Discounting Algorithms
  discounting: {
    name: 'Present Value / Discounting',
    patterns: [],
    formulas: [],
    description: 'How future cash flows are discounted to present value'
  },
  
  // Market Size Algorithms
  marketSize: {
    name: 'Market Size / TAM',
    patterns: [],
    formulas: [],
    description: 'How Total Addressable Market is calculated'
  },
  
  // Penetration Algorithms
  penetration: {
    name: 'Market Penetration',
    patterns: [],
    formulas: [],
    description: 'How market penetration affects revenue (S-curves, adoption)'
  },
  
  // Launch Economics
  launchEconomics: {
    name: 'Launch Economics',
    patterns: [],
    formulas: [],
    description: 'How launch volume, cost/kg, pricing affects revenue'
  },
  
  // Mars Colonization
  marsColonization: {
    name: 'Mars Colonization Economics',
    patterns: [],
    formulas: [],
    description: 'How Mars colony value is calculated (population growth, bootstrap, etc.)'
  },
  
  // Milestone-Based Logic
  milestones: {
    name: 'Milestone-Based Calculations',
    patterns: [],
    formulas: [],
    description: 'How business milestones affect calculations (e.g., "Starlink Constellation Complete")'
  },
  
  // Time-Series Projections
  timeSeries: {
    name: 'Time-Series Projections',
    patterns: [],
    formulas: [],
    description: 'How values are projected year-over-year'
  },
  
  // Terminal Value
  terminalValue: {
    name: 'Terminal Value',
    patterns: [],
    formulas: [],
    description: 'How terminal value is calculated'
  },
  
  // Tax/Expense Calculations
  taxesExpenses: {
    name: 'Taxes & Expenses',
    patterns: [],
    formulas: [],
    description: 'How taxes and expenses are calculated'
  },
  
  // Option Value
  optionValue: {
    name: 'Option Value Calculation',
    patterns: [],
    formulas: [],
    description: 'How real option value is calculated (especially Mars)'
  }
};

// Analyze formulas to categorize by business logic
function categorizeBusinessLogic(formula, cellRef, sheetName) {
  const formulaLower = formula.toLowerCase();
  const categories = [];
  
  // Revenue-related patterns
  if (formulaLower.includes('revenue') || 
      cellRef.match(/O11[6-9]/) || // O116-O119 are revenue components
      formulaLower.includes('penetration') ||
      formulaLower.includes('tam') ||
      formulaLower.includes('bandwidth')) {
    categories.push('revenue');
  }
  
  // Cost-related patterns
  if (formulaLower.includes('cost') ||
      cellRef.match(/O14[2-4]/) || // O142-O144 are cost components
      formulaLower.includes('expense') ||
      formulaLower.includes('capex') ||
      formulaLower.includes('opex')) {
    categories.push('costs');
  }
  
  // Growth patterns
  if (formulaLower.includes('growth') ||
      formulaLower.includes('^') || // Exponential growth
      formulaLower.includes('log') ||
      formulaLower.includes('exp') ||
      formulaLower.includes('(1+') || // Growth rate formulas
      formulaLower.includes('*(') && formulaLower.includes('+')) {
    categories.push('growth');
  }
  
  // Penetration/S-curve patterns
  if (formulaLower.includes('penetration') ||
      formulaLower.includes('saturation') ||
      formulaLower.includes('starlink constellation') ||
      formulaLower.includes('adoption')) {
    categories.push('penetration');
  }
  
  // Launch economics
  if (formulaLower.includes('launch') ||
      formulaLower.includes('kg') ||
      formulaLower.includes('upmass') ||
      formulaLower.includes('wright') ||
      cellRef.match(/J[2-3]\d{2}/)) { // J200-J399 range often has launch calcs
    categories.push('launchEconomics');
  }
  
  // Mars colonization
  if (sheetName === 'Mars' ||
      formulaLower.includes('mars') ||
      formulaLower.includes('colony') ||
      formulaLower.includes('population') ||
      cellRef.match(/K\d+/)) { // Mars K column
    categories.push('marsColonization');
  }
  
  // Milestone-based (IF statements with business milestones)
  if (formulaLower.includes('if') && (
      formulaLower.includes('starlink constellation complete') ||
      formulaLower.includes('launch') ||
      formulaLower.includes('go for launch') ||
      formulaLower.includes('milestone'))) {
    categories.push('milestones');
  }
  
  // Valuation (final calculation)
  if (cellRef.match(/O153/) || // Final Earth valuation
      cellRef.match(/K54/) || // Final Mars valuation
      formulaLower.includes('valuation') ||
      formulaLower.includes('pv') ||
      formulaLower.includes('present value')) {
    categories.push('valuation');
  }
  
  // Discounting
  if (formulaLower.includes('discount') ||
      formulaLower.includes('rri') ||
      formulaLower.includes('irr') ||
      formulaLower.includes('/(1+') || // Discount factor
      formulaLower.includes('^(') && formulaLower.includes('/')) {
    categories.push('discounting');
  }
  
  // Terminal value
  if (formulaLower.includes('terminal') ||
      cellRef.match(/O11[7-8]/) || // O117-O118 might be terminal value
      formulaLower.includes('perpetuity')) {
    categories.push('terminalValue');
  }
  
  // Taxes/expenses
  if (cellRef.match(/O14[6-9]|O15[0-2]/) || // O146-O152 are tax/expense
      formulaLower.includes('tax') ||
      formulaLower.includes('rate') && formulaLower.includes('*')) {
    categories.push('taxesExpenses');
  }
  
  // Option value
  if (formulaLower.includes('option') ||
      cellRef.match(/K8|K27/) || // Mars option components
      formulaLower.includes('k54+k8-k27')) {
    categories.push('optionValue');
  }
  
  // Time-series (year-over-year calculations)
  if (formulaLower.includes('+1') || // Incrementing years
      cellRef.match(/\d{3,4}/) && parseInt(cellRef.match(/\d+/)[0]) > 100) { // High row numbers = time series
    categories.push('timeSeries');
  }
  
  // Market size/TAM
  if (formulaLower.includes('tam') ||
      formulaLower.includes('total addressable') ||
      formulaLower.includes('market size') ||
      sheetName === 'Earth Bandwidth TAM') {
    categories.push('marketSize');
  }
  
  return categories.length > 0 ? categories : ['other'];
}

// Analyze all formulas
console.log('Analyzing business algorithms...');

const businessMapping = [];

inventory.allFormulas.forEach((formulaDetail) => {
  const { sheet, cell, formula, normalized, functions, complexity } = formulaDetail;
  
  const categories = categorizeBusinessLogic(formula, cell, sheet);
  
  categories.forEach(category => {
    if (businessAlgorithms[category]) {
      businessAlgorithms[category].formulas.push({
        sheet,
        cell,
        formula,
        normalized,
        complexity
      });
    }
  });
  
  businessMapping.push({
    sheet,
    cell,
    formula,
    businessCategories: categories,
    complexity
  });
});

// Generate report
let markdown = `# Business Algorithm Mapping

**All 8,890 formulas mapped to BUSINESS ALGORITHMS (not Excel functions)**

**Generated**: ${new Date().toISOString()}

---

## 🎯 **Business Algorithm Categories**

`;

// Summary by category
Object.entries(businessAlgorithms).forEach(([key, algo]) => {
  const count = algo.formulas.length;
  if (count > 0) {
    markdown += `### ${algo.name}\n\n`;
    markdown += `**Description**: ${algo.description}\n\n`;
    markdown += `**Formulas**: ${count}\n\n`;
    
    // Group by pattern
    const patterns = new Map();
    algo.formulas.forEach(f => {
      const pattern = f.normalized;
      if (!patterns.has(pattern)) {
        patterns.set(pattern, []);
      }
      patterns.get(pattern).push(f);
    });
    
    markdown += `**Unique Patterns**: ${patterns.size}\n\n`;
    
    // Top patterns
    const topPatterns = Array.from(patterns.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);
    
    if (topPatterns.length > 0) {
      markdown += `**Top Patterns**:\n\n`;
      topPatterns.forEach(([pattern, formulas], i) => {
        markdown += `${i + 1}. \`${pattern.substring(0, 60)}\` (${formulas.length}x)\n`;
        markdown += `   Example: \`${formulas[0].formula.substring(0, 80)}\`\n`;
        markdown += `   Location: ${formulas[0].sheet}!${formulas[0].cell}\n\n`;
      });
    }
    
    markdown += `---\n\n`;
  }
});

// Complete mapping table
markdown += `## 📊 **Complete Formula-to-Business-Algorithm Mapping**

| Sheet | Cell | Formula | Business Algorithm(s) | Complexity |
|-------|------|---------|----------------------|------------|
`;

businessMapping.slice(0, 500).forEach((mapping) => {
  const categories = mapping.businessCategories.join(', ');
  const formulaDisplay = mapping.formula.substring(0, 60).replace(/\|/g, '\\|');
  markdown += `| ${mapping.sheet} | ${mapping.cell} | \`${formulaDisplay}\` | ${categories} | ${mapping.complexity} |\n`;
});

if (businessMapping.length > 500) {
  markdown += `\n*... and ${businessMapping.length - 500} more formulas*\n`;
}

// Summary statistics
markdown += `\n---\n\n## 📈 **Summary Statistics**\n\n`;

const categoryCounts = {};
businessMapping.forEach(m => {
  m.businessCategories.forEach(cat => {
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
});

markdown += `| Business Algorithm | Formula Count | % of Total |\n`;
markdown += `|-------------------|---------------|------------|\n`;

Object.entries(categoryCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    const percent = ((count / inventory.summary.totalFormulas) * 100).toFixed(1);
    const name = businessAlgorithms[cat]?.name || cat;
    markdown += `| ${name} | ${count} | ${percent}% |\n`;
  });

markdown += `\n---\n\n*Total Formulas Analyzed: ${inventory.summary.totalFormulas}*\n`;

// Save report
const reportPath = path.join(__dirname, '../BUSINESS_ALGORITHMS_MAPPING.md');
fs.writeFileSync(reportPath, markdown);
console.log(`✓ Generated business algorithms mapping: ${reportPath}`);

// Save JSON
const jsonPath = path.join(__dirname, '../BUSINESS_ALGORITHMS_MAPPING.json');
fs.writeFileSync(jsonPath, JSON.stringify({
  summary: {
    totalFormulas: inventory.summary.totalFormulas,
    categories: Object.keys(businessAlgorithms),
    categoryCounts
  },
  algorithms: businessAlgorithms,
  mappings: businessMapping
}, null, 2));
console.log(`✓ Generated JSON: ${jsonPath}`);

// Print summary
console.log('\n=== BUSINESS ALGORITHM SUMMARY ===');
Object.entries(categoryCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    const name = businessAlgorithms[cat]?.name || cat;
    console.log(`${name}: ${count} formulas`);
  });

console.log('\n✓ Analysis complete!');





