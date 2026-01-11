# Valuation Algorithms Explained

This document explains each algorithm pattern reverse-engineered from the spreadsheet formulas.

---

## 🔧 **Utility Algorithms**

### 1. **Cell Value Management**
```javascript
getCellValue(sheetName, cellRef)
setCellValue(sheetName, cellRef, value)
```
**Purpose**: Read/write cell values from Excel data with caching  
**How it works**: 
- Looks up cell in parsed Excel JSON
- Caches results for performance
- Handles missing cells gracefully

**Example**: `getCellValue('Earth', 'O153')` → Returns the Earth valuation value

---

## 📊 **Core Calculation Algorithms**

### 2. **Earth Valuation Algorithm** ⭐
```javascript
calculateEarthValuation(scenario = 'base')
```

**Purpose**: Calculate the total Earth business valuation using the spreadsheet's exact formula pattern.

**Formula Breakdown**:
```
O153 = O119 - O144 - O152
  ├─ O119 = SUM(O116:O118)  [Total Revenue Components]
  ├─ O144 = SUM(O142:O143)  [Total Cost Components]
  └─ O152 = (O146 + O150) × O119  [Tax/Expense Rate × Revenue]
```

**What it does**:
1. **Revenue (O119)**: Sums three revenue components (O116 + O117 + O118)
2. **Costs (O144)**: Sums two cost components (O142 + O143)
3. **Taxes/Expenses (O152)**: Calculates tax rate × revenue
4. **Final Value (O153)**: Revenue - Costs - Taxes = Net Valuation

**Why it matters**: This is the **primary output** of the Earth sheet, referenced 2,124 times throughout the spreadsheet.

**Example Output**: `6739.234` (billions)

---

### 3. **Mars Valuation Algorithm** ⭐
```javascript
calculateMarsValuation(scenario = 'base')
```

**Purpose**: Calculate the Mars colony valuation using cumulative growth formulas.

**Formula Breakdown**:
```
K54 = K53 + J54 × (1 - 1/B54)
  └─ K53 = K44 × K52
      ├─ K44 = F44 × (1 + B52)^(LOG(COLUMN()-COLUMN(F44)+1, 2))
      └─ K52 = SUM(F47:K47) - OFFSET(...)
```

**What it does**:
1. **Growth Factor (K44)**: Exponential growth based on time period and growth rate
2. **Multiplier (K52)**: Cumulative sum of factors over time
3. **Base Value (K53)**: Growth factor × multiplier
4. **Discount Adjustment (J54 × (1 - 1/B54))**: Applies discount rate to future value
5. **Final Value (K54)**: Base value + discounted adjustment

**Why it matters**: Mars valuation uses **compound growth** and **time discounting** - much more complex than Earth's linear calculation.

**Example Output**: `8.745` (billions)

---

### 4. **Mars Option Value Algorithm** ⭐
```javascript
calculateMarsOptionValue(scenario = 'base')
```

**Purpose**: Calculate the Mars option value (the value of the "option" to colonize Mars).

**Formula**: `K54 + K8 - K27` (base case) or `U54 + U8 - U27` (optimistic)

**What it represents**:
- **K54**: Cumulative Mars value
- **K8**: Cumulative revenue from Mars operations
- **K27**: Cumulative costs of Mars operations
- **Option Value**: Value + Revenue - Costs = Net Option Value

**Why it matters**: This represents the **real option** value of Mars colonization - the value of having the option to expand, not just the current operations.

**Example Output**: `0.745` (billions)

---

## 🧮 **Basic Pattern Algorithms**

### 5. **Arithmetic Operations**
```javascript
multiply(a, b)
add(a, b)
subtract(a, b)
divide(a, b)
```

**Purpose**: Basic math operations with null-safety  
**Usage**: Used 697 times (multiply), 296 times (add) in Earth sheet  
**Why needed**: Handles missing values gracefully (returns 0 instead of NaN)

---

### 6. **SUM Range**
```javascript
sumRange(sheetName, startCell, endCell)
```

**Purpose**: Sum all numeric values in a cell range  
**Usage**: 375 times in Earth, 130 times in Mars  
**Example**: `sumRange('Earth', 'O116', 'O118')` → Sums O116 + O117 + O118

**How it works**:
1. Parses cell references (e.g., "O116" → column 15, row 116)
2. Iterates through all cells in range
3. Sums numeric values only
4. Returns total

---

### 7. **IF Statement**
```javascript
ifStatement(condition, trueValue, falseValue)
```

**Purpose**: Conditional logic  
**Usage**: 1,692 times in Earth, 130 times in Mars  
**Example**: `=IF(J245="Starlink Constellation Complete", J267, J398)`

**Why needed**: Spreadsheet uses many conditional calculations based on milestones, dates, or thresholds.

---

### 8. **Cross-Sheet Reference**
```javascript
crossSheetReference(sheetName, cellRef)
```

**Purpose**: Read values from other sheets  
**Usage**: Common pattern (e.g., `=Mars!K54` in Earth sheet)  
**Example**: `crossSheetReference('Mars', 'K54')` → Gets Mars valuation from Earth sheet

---

## 📈 **Statistical & Lookup Algorithms**

### 9. **MAX/MIN Range**
```javascript
maxRange(sheetName, startCell, endCell)
minRange(sheetName, startCell, endCell)
```

**Purpose**: Find maximum/minimum value in a range  
**Usage**: 419 times (MAX), 287 times (MIN) in Earth  
**Example**: `maxRange('Earth', 'A1', 'A100')` → Finds highest value in column A rows 1-100

**Use cases**: 
- Finding peak revenue years
- Identifying worst-case scenarios
- Range validation

---

### 10. **INDEX/MATCH Lookup**
```javascript
indexMatch(lookupValue, lookupRange, returnRange, exactMatch)
```

**Purpose**: Lookup values in tables (like VLOOKUP but more flexible)  
**Usage**: 631 times in Earth  
**Status**: ⚠️ **Placeholder** - needs full implementation

**Why needed**: Spreadsheet uses many lookup tables for:
- Finding revenue by year
- Matching milestones to dates
- Cross-referencing scenarios

---

## 🛡️ **Error Handling Algorithms**

### 11. **IFERROR**
```javascript
ifError(value, defaultValue)
```

**Purpose**: Return default value if calculation fails  
**Usage**: 207 times in Earth, 26 times in Mars  
**Example**: `ifError(divide(a, b), 0)` → Returns 0 if division by zero

**Why needed**: Prevents errors from propagating through calculations.

---

## 📐 **Mathematical Functions**

### 12. **LOG/EXP**
```javascript
log(value, base = Math.E)
exp(value)
```

**Purpose**: Logarithmic and exponential functions  
**Usage**: 156 times (LN) in Earth, 51 times (LOG) in Mars, 26 times (EXP) in Mars

**Use cases**:
- **LOG**: Growth rate calculations, time-based scaling
- **EXP**: Compound growth, exponential projections

**Example**: Mars growth uses `LOG(COLUMN()-COLUMN(F44)+1, 2)` for time-based scaling

---

### 13. **RRI (Rate of Return)**
```javascript
rri(nper, pv, fv)
```

**Purpose**: Calculate rate of return over a period  
**Usage**: 4 times in Valuation Inputs & Logic  
**Formula**: `(fv/pv)^(1/nper) - 1`

**What it does**: 
- **nper**: Number of periods
- **pv**: Present value
- **fv**: Future value
- **Returns**: Annualized rate of return

**Example**: If $100 becomes $150 over 5 years → `rri(5, 100, 150)` = 8.45% annual return

---

## 🔄 **Helper Functions**

### 14. **Cell Reference Parsing**
```javascript
parseCellRef(cellRef)        // "O153" → [15, 153]
cellRefFromColRow(col, row)  // [15, 153] → "O153"
```

**Purpose**: Convert between Excel cell notation and numeric coordinates  
**How it works**:
- Parses "O153" into column 15, row 153
- Converts column numbers back to letters (A=1, B=2, ..., Z=26, AA=27, etc.)

**Why needed**: Required for range operations (SUM, MAX, MIN, etc.)

---

### 15. **Cache Management**
```javascript
clearCache()
```

**Purpose**: Clear cached cell values when inputs change  
**Why needed**: When user changes inputs, we need to recalculate everything fresh.

---

## 🎯 **Algorithm Usage Summary**

### Most Critical (Core Calculations):
1. ✅ **Earth Valuation** - Primary output
2. ✅ **Mars Valuation** - Primary output  
3. ✅ **Mars Option Value** - Key metric

### Most Common Patterns:
1. **Direct Reference** (2,124 uses) - Just copying values
2. **Arithmetic** (993 uses) - Basic math
3. **SUM** (505 uses) - Aggregating values
4. **IF** (1,822 uses) - Conditional logic
5. **MAX/MIN** (706 uses) - Finding extremes

### Most Complex:
1. **Mars Valuation** - Uses exponential growth, logarithms, time discounting
2. **INDEX/MATCH** - Table lookups (needs full implementation)
3. **Cross-sheet references** - Linking multiple sheets

---

## 🔍 **How Algorithms Work Together**

**Example: Calculating Earth Valuation**

```javascript
// Step 1: Get revenue components
const o116 = getCellValue('Earth', 'O116');  // Revenue component 1
const o117 = getCellValue('Earth', 'O117');  // Revenue component 2
const o118 = getCellValue('Earth', 'O118');  // Revenue component 3

// Step 2: Sum revenue (using add pattern)
const o119 = add(add(o116, o117), o118);  // Total revenue

// Step 3: Get cost components
const o142 = getCellValue('Earth', 'O142');  // Cost component 1
const o143 = getCellValue('Earth', 'O143');  // Cost component 2

// Step 4: Sum costs
const o144 = add(o142, o143);  // Total costs

// Step 5: Calculate taxes/expenses
const o146 = getCellValue('Earth', 'O146');  // Tax rate component 1
const o150 = getCellValue('Earth', 'O150');  // Tax rate component 2
const o152 = multiply(add(o146, o150), o119);  // Taxes = rate × revenue

// Step 6: Final valuation
const o153 = subtract(subtract(o119, o144), o152);  // Revenue - Costs - Taxes

// Step 7: Convert to billions
return o153 / 1e9;
```

---

## ✅ **Current Status**

**Fully Implemented**:
- ✅ Earth Valuation
- ✅ Mars Valuation  
- ✅ Mars Option Value
- ✅ Basic arithmetic
- ✅ SUM ranges
- ✅ MAX/MIN ranges
- ✅ IF statements
- ✅ Error handling
- ✅ Mathematical functions

**Needs Implementation**:
- ⚠️ INDEX/MATCH lookup (placeholder)
- ⚠️ Complex IF statements with text matching
- ⚠️ Time-series calculations
- ⚠️ Growth formulas with full dependency chains

---

## 🚀 **Next Steps**

1. **Test algorithms** against spreadsheet values to verify accuracy
2. **Implement INDEX/MATCH** for table lookups
3. **Add time-series** calculations for multi-year projections
4. **Enhance input sensitivity** to use algorithms for intermediate calculations
5. **Optimize caching** for better performance





