# Formula Reconciliation Implementation Guide

## Current Status ✅

**Fixed:**
- ✅ Mars Option Value: Now reads `K54+K8-K27` from spreadsheet (~$0.745B)
- ✅ Earth Value: Now reads from `O153` (~$124.48B)
- ✅ Mars Value: Now reads from `K54` (~$0.75B)
- ✅ Total Value: Correctly calculated from Earth + Mars

**Current Values (from Spreadsheet):**
- Earth: $124.48B
- Mars: $0.75B
- Mars Option: $0.75B
- Total: $125.23B

---

## The Challenge

**Spreadsheet has:**
- 7,705 formulas in Earth sheet
- 1,038 formulas in Mars sheet
- **Total: 8,743 formulas**

**We cannot execute all Excel formulas in JavaScript**, but we can:
1. ✅ Read calculated values (DONE)
2. Use those as base values (DONE)
3. Apply smart changes when inputs change (NEEDS IMPROVEMENT)

---

## Solution: Hybrid Approach

### Phase 1: Use Spreadsheet as Ground Truth ✅ (COMPLETE)

**What we did:**
- Created helper functions to read values from `excel_parsed_detailed.json`
- `getEarthValuesFromSpreadsheet()` - Reads Earth sheet outputs
- `getMarsValuesFromSpreadsheet()` - Reads Mars sheet outputs
- `getMarsOptionValueFromSpreadsheet()` - Calculates option value

**Result:**
- All base values now come from spreadsheet calculations
- No more hardcoded defaults

### Phase 2: Smart Input Changes (CURRENT FOCUS)

**Problem:** When inputs change, we still use simple multipliers.

**Solution Options:**

#### Option A: Sensitivity-Based Multipliers (Recommended - Short-term)
Use sensitivity analysis to build accurate relationships:

```javascript
// Instead of: earthMultiplier *= inputs.penetration / basePenetration
// Use: earthMultiplier *= calculateSensitivityImpact('penetration', inputs.penetration, basePenetration)

function calculateSensitivityImpact(inputName, newValue, baseValue) {
  // Use sensitivity curves to determine impact
  // This would be based on actual spreadsheet sensitivity analysis
  const sensitivity = getSensitivityForInput(inputName);
  return sensitivity.calculateMultiplier(newValue, baseValue);
}
```

**Pros:**
- More accurate than simple ratios
- Uses actual sensitivity relationships
- Can be built from existing sensitivity curves

**Cons:**
- Still an approximation
- Requires sensitivity data

#### Option B: Pre-calculated Scenarios (Medium-term)
Store multiple scenario calculations and interpolate:

```javascript
// Pre-calculate scenarios with different input combinations
const scenarios = {
  base: { inputs: {...}, results: {...} },
  optimistic: { inputs: {...}, results: {...} },
  bear: { inputs: {...}, results: {...} }
};

// When inputs change, interpolate between scenarios
function interpolateValuation(inputs) {
  // Find closest scenarios
  // Interpolate results
}
```

**Pros:**
- Uses actual spreadsheet calculations
- More accurate than multipliers
- Can handle complex relationships

**Cons:**
- Requires pre-calculating many scenarios
- Limited to scenarios we've calculated
- Interpolation may not capture all relationships

#### Option C: Formula Execution Library (Long-term)
Use `formulajs` or similar to execute critical formulas:

```javascript
const formulajs = require('formulajs');

// Execute critical formulas only
function executeCriticalFormulas(inputs) {
  // Focus on key output cells, not all 8,743
  // Execute formulas for: O153 (Earth), K54 (Mars), etc.
}
```

**Pros:**
- Most accurate
- Uses actual formula logic

**Cons:**
- formulajs supports ~100 functions, spreadsheet uses more
- Complex to implement
- Performance concerns with 8,743 formulas

#### Option D: Regression Model from Monte Carlo (Advanced)
Build a regression model from Monte Carlo results:

```javascript
// Use Monte Carlo results to build a model
// Train regression: valuation = f(inputs)
function predictValuation(inputs) {
  return regressionModel.predict(inputs);
}
```

**Pros:**
- Learns from actual spreadsheet calculations
- Can handle complex relationships
- Fast execution

**Cons:**
- Requires large Monte Carlo dataset
- Model training complexity
- May not capture all relationships

---

## Recommended Implementation Path

### Immediate (This Week)
1. ✅ **Use spreadsheet values as base** (DONE)
2. **Improve multipliers using sensitivity curves**
   - Read sensitivity data from existing sensitivity analysis
   - Use curve relationships instead of simple ratios
   - Apply to all input changes

### Short-term (This Month)
3. **Pre-calculate key scenarios**
   - Calculate base, optimistic, bear scenarios from spreadsheet
   - Store results in database
   - Use interpolation for input changes

4. **Build sensitivity lookup tables**
   - Run sensitivity analysis for each input
   - Store sensitivity relationships
   - Use for accurate multiplier calculation

### Long-term (Future)
5. **Consider formula execution for critical paths**
   - Identify ~50-100 critical formulas
   - Use formulajs for those only
   - Keep rest as pre-calculated values

---

## Implementation: Sensitivity-Based Multipliers

### Step 1: Read Sensitivity Curves

We already have sensitivity analysis. Use those curves:

```javascript
// When calculating multipliers, use sensitivity curve data
function getSensitivityMultiplier(inputName, newValue, baseValue) {
  // Get sensitivity curve for this input
  const curve = sensitivityCurves[inputName];
  
  // Find impact on valuation
  const impact = curve.getImpact(newValue, baseValue);
  
  return impact;
}
```

### Step 2: Apply to Calculation

```javascript
// Instead of:
earthMultiplier *= inputs.penetration / basePenetration;

// Use:
const penetrationImpact = getSensitivityMultiplier(
  'starlinkPenetration',
  inputs.penetration,
  basePenetration
);
earthMultiplier *= penetrationImpact;
```

---

## Testing & Validation

### Validation Checklist

- [x] Mars option value matches spreadsheet (`K54+K8-K27`)
- [x] Earth value matches spreadsheet (`O153`)
- [x] Mars value matches spreadsheet (`K54`)
- [ ] Input changes produce accurate results (needs sensitivity-based multipliers)
- [ ] Scenarios match spreadsheet calculations
- [ ] Monte Carlo results align with spreadsheet

### Test Cases

1. **Base Case**
   - Inputs: Default spreadsheet inputs
   - Expected: Earth=$124.48B, Mars=$0.75B, Option=$0.75B
   - Status: ✅ PASSING

2. **Input Changes**
   - Change Starlink Penetration: 15% → 20%
   - Expected: Earth value increases proportionally
   - Status: ⚠️ NEEDS IMPROVEMENT (using simple multiplier)

3. **Scenario Comparison**
   - Compare Base vs Optimistic vs Bear
   - Expected: Match spreadsheet scenarios
   - Status: ⚠️ NEEDS IMPROVEMENT

---

## Next Steps

1. **Immediate:** Implement sensitivity-based multipliers
2. **This Week:** Pre-calculate key scenarios from spreadsheet
3. **This Month:** Build comprehensive sensitivity lookup tables
4. **Future:** Consider formula execution for critical paths

---

## Code Changes Made

### New Functions Added

1. `getSpreadsheetCellValue(sheetName, cellRef)` - Generic cell reader
2. `getMarsOptionValueFromSpreadsheet(scenario)` - Mars option value
3. `getEarthValuesFromSpreadsheet(scenario)` - Earth values
4. `getMarsValuesFromSpreadsheet(scenario)` - Mars values

### Updated Logic

- `/api/calculate` now uses spreadsheet values as base
- Falls back to database, then hardcoded defaults
- Total value calculation fixed

---

*Last Updated: 2025-01-XX*
*Status: Phase 1 Complete, Phase 2 In Progress*




