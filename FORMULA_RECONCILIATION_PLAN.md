# Formula Reconciliation Plan

## Problem Statement

- **Spreadsheet**: 7,705 formulas in Earth sheet, 1,038 formulas in Mars sheet
- **Current System**: Simplified multiplier-based approximations
- **Gap**: Values don't match spreadsheet calculations

## Solution Strategy: Hybrid Approach

Since executing 8,743 Excel formulas in JavaScript is impractical, we'll use a **hybrid approach**:

### Phase 1: Read Calculated Values (Immediate)
- Read all calculated values from `excel_parsed_detailed.json`
- Use these as "ground truth" base values
- Map spreadsheet outputs to web app structure

### Phase 2: Smart Input Changes (Short-term)
- Use sensitivity analysis to build relationships
- Pre-calculate key scenarios
- Use interpolation for input changes

### Phase 3: Formula Execution (Long-term - Optional)
- Consider formula execution library for critical paths only
- Focus on key output cells, not all 8,743 formulas

---

## Implementation Plan

### Step 1: Read Spreadsheet Calculated Values

Create a function to read key calculated values from the spreadsheet:

**Earth Sheet Key Outputs:**
- O59, O62, O58, O61 (scenario values)
- O116-O119 (various metrics)
- O144, O153 (final values)

**Mars Sheet Key Outputs:**
- K54, K8, K27 (base case)
- U54, U8, U27 (optimistic case)

### Step 2: Use Spreadsheet Values as Base

Replace hardcoded defaults with spreadsheet values:
- Earth: Read from Earth sheet outputs
- Mars: Read from Mars sheet outputs
- Option Value: Already fixed (K54+K8-K27)

### Step 3: Smart Multipliers Based on Sensitivity

Instead of simple multipliers, use sensitivity curves:
- Pre-calculate sensitivity for each input
- Use curve fitting or lookup tables
- Apply changes based on actual sensitivity relationships

### Step 4: Pre-calculate Scenarios

Store multiple scenario calculations:
- Base case (current spreadsheet state)
- Optimistic case
- Bear case
- Interpolate between scenarios for input changes

---

## Recommended Libraries

1. **formulajs** - Excel formula execution (supports ~100 functions)
   - `npm install formulajs`
   - Can execute common Excel functions
   - Limited compared to full Excel

2. **xlsx-populate** - Read/write Excel with formula support
   - `npm install xlsx-populate`
   - Can read formulas but execution is limited

3. **exceljs** - Excel file manipulation
   - `npm install exceljs`
   - Good for reading/writing but formula execution requires external engine

**Best Approach**: Use formulajs for critical formulas, read pre-calculated values for everything else.





