# Valuation Algorithm Implementation

## Approach

We're **reverse-engineering** the unique formula patterns from the spreadsheet and converting them into JavaScript algorithms. This ensures we capture all logical steps without missing anything.

## Key Patterns Identified

### Earth Sheet (7,705 formulas → 100 unique templates)

**Core Valuation Formula:**
```
O153 = O119 - O144 - O152
  O119 = SUM(O116:O118)  [Total Revenue Components]
  O144 = SUM(O142:O143)  [Total Cost Components]
  O152 = (O146 + O150) * O119  [Tax/Expense Rate × Revenue]
```

**Most Common Patterns:**
1. Direct Reference: `=O153` (2,124 times)
2. Simple Arithmetic: `=B7*B8` (697 times)
3. SUM: `=SUM(I20:I21)` (375 times)
4. IF statements: `=IF(J245="Starlink Constellation Complete",J267,J398)` (260 times)

### Mars Sheet (1,038 formulas → 37 unique templates)

**Core Valuation Formula:**
```
K54 = K53 + J54 * (1 - 1/$B54)
  K53 = K44 * K52
    K44 = $F44 * (1 + $B52)^(LOG(COLUMN()-COLUMN($F44)+1, 2))
    K52 = SUM($F47:K47) - OFFSET(...)
```

**Option Value Formula:**
```
Option Value = K54 + K8 - K27
  (Cumulative Value + Revenue - Costs)
```

**Most Common Patterns:**
1. Direct Reference: `=G31` (105 times)
2. Multiplication: `=F16*F11` (78 times)
3. Addition: `=F26+F18` (52 times)
4. Cross-sheet: `=Earth!I203` (26 times)

## Implementation Strategy

### Phase 1: Core Algorithms ✅
- Implement `calculateEarthValuation()` - Uses O153 formula pattern
- Implement `calculateMarsValuation()` - Uses K54 formula pattern
- Implement `calculateMarsOptionValue()` - Uses K54+K8-K27 pattern

### Phase 2: Input Sensitivity
- When inputs change, we need to:
  1. Use base values from spreadsheet (ground truth)
  2. Apply sensitivity adjustments based on input changes
  3. Use algorithms to recalculate intermediate values

### Phase 3: Full Formula Patterns
- Implement remaining unique patterns:
  - INDEX/MATCH lookups
  - Complex IF statements
  - Time-series calculations
  - Growth formulas

## Usage in Server

```javascript
// Initialize with Excel data
const algorithms = new ValuationAlgorithms(excelData);

// Calculate base values
const earthValue = algorithms.calculateEarthValuation('base');
const marsValue = algorithms.calculateMarsValuation('base');
const optionValue = algorithms.calculateMarsOptionValue('base');

// For input changes, we still use multipliers but based on algorithm-calculated base values
```

## Benefits

1. **Accuracy**: Captures all logical steps from spreadsheet
2. **Maintainability**: Clean JavaScript code, not Excel formula execution
3. **Performance**: Can optimize and cache calculations
4. **Extensibility**: Easy to add new patterns as we discover them

## Next Steps

1. ✅ Create `valuation-algorithms.js` with core patterns
2. ⏳ Integrate into `/api/calculate` endpoint
3. ⏳ Test against spreadsheet values
4. ⏳ Add more formula patterns as needed
5. ⏳ Implement input sensitivity calculations using algorithms




