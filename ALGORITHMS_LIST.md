# Complete List of Algorithms

**Source File**: `valuation-algorithms.js`  
**Class**: `ValuationAlgorithms`

---

## 📋 **All Algorithms**

### **Core Valuation Algorithms** ⭐

1. **`calculateEarthValuation(scenario = 'base')`**
   - Calculates Earth business valuation (O153)
   - Formula: `O153 = O119 - O144 - O152`
   - Returns: Value in billions

2. **`calculateMarsValuation(scenario = 'base')`**
   - Calculates Mars colony valuation (K54)
   - Formula: `K54 = K53 + J54 * (1 - 1/B54)`
   - Returns: Value in billions

3. **`calculateMarsOptionValue(scenario = 'base')`**
   - Calculates Mars option value
   - Formula: `K54 + K8 - K27`
   - Returns: Option value in billions

---

### **Basic Pattern Algorithms**

4. **`directReference(sourceCell)`**
   - Direct cell reference: `=O153`
   - Usage: 2,230 formulas

5. **`multiply(a, b)`**
   - Multiplication: `=A1*B1`
   - Usage: 908 formulas

6. **`add(a, b)`**
   - Addition: `=A1+B1`
   - Usage: 348 formulas

7. **`subtract(a, b)`**
   - Subtraction: `=A1-B1`
   - Usage: 183 formulas

8. **`divide(a, b)`**
   - Division: `=A1/B1`
   - Usage: 380 formulas

---

### **Range & Statistical Algorithms**

9. **`sumRange(sheetName, startCell, endCell)`**
   - SUM range: `=SUM(A1:A10)`
   - Usage: 401 formulas
   - Status: ✅ Implemented (needs multi-range support)

10. **`maxRange(sheetName, startCell, endCell)`**
    - MAX range: `=MAX(A1:A10)`
    - Usage: 368 formulas
    - Status: 🟡 Partial (needs multi-arg support)

11. **`minRange(sheetName, startCell, endCell)`**
    - MIN range: `=MIN(A1:A10)`
    - Usage: 339 formulas
    - Status: 🟡 Partial (needs multi-arg support)

---

### **Conditional & Logic Algorithms**

12. **`ifStatement(condition, trueValue, falseValue)`**
    - IF statement: `=IF(condition, true, false)`
    - Usage: 1,605 formulas
    - Status: ✅ Implemented (may need AND/OR support)

13. **`ifError(value, defaultValue)`**
    - IFERROR: `=IFERROR(value, default)`
    - Usage: 233 formulas

---

### **Cross-Sheet & Reference Algorithms**

14. **`crossSheetReference(sheetName, cellRef)`**
    - Cross-sheet reference: `=Mars!K54`
    - Usage: 367 formulas

---

### **Mathematical Functions**

15. **`log(value, base = Math.E)`**
    - Logarithm: `=LOG(value, base)` or `=LN(value)`
    - Usage: 129 formulas (LN: 78, LOG: 51)

16. **`exp(value)`**
    - Exponential: `=EXP(value)`
    - Usage: 26 formulas

17. **`rri(nper, pv, fv)`**
    - Rate of Return: `=RRI(nper, pv, fv)`
    - Usage: 13 formulas

---

### **Lookup Algorithms** (Placeholder)

18. **`indexMatch(lookupValue, lookupRange, returnRange, exactMatch = true)`**
    - INDEX/MATCH lookup: `=INDEX(range, MATCH(value, lookup_range, 0))`
    - Usage: 131 formulas (INDEX: 131, MATCH: 131)
    - Status: ❌ Not Implemented (placeholder only)

---

### **Utility Functions**

19. **`getCellValue(sheetName, cellRef)`**
    - Get cell value from Excel data (with caching)

20. **`setCellValue(sheetName, cellRef, value)`**
    - Set cell value (for calculated results)

21. **`parseCellRef(cellRef)`**
    - Parse cell reference: `"O153"` → `[15, 153]`

22. **`cellRefFromColRow(col, row)`**
    - Convert to cell reference: `[15, 153]` → `"O153"`

23. **`clearCache()`**
    - Clear cached cell values

---

## ❌ **Missing Algorithms** (Need Implementation)

These algorithms are referenced in the mapping but not yet implemented:

1. **`and(...conditions)`** - AND function (277 formulas)
2. **`or(...conditions)`** - OR function (259 formulas)
3. **`quartile(array, quart)`** - QUARTILE calculation (6 formulas)
4. **`average(sheetName, startCell, endCell)`** - AVERAGE (3 formulas)
5. **`irr(values, guess)`** - IRR calculation (26 formulas)
6. **`random()`** - RAND() for Monte Carlo (17 formulas)
7. **`normInv(probability, mean, stdDev)`** - NORM.INV (2 formulas)
8. **`column(cellRef)`** - COLUMN() function (51 formulas)
9. **`roundDown(number, numDigits)`** - ROUNDDOWN (28 formulas)
10. **`mod(number, divisor)`** - MOD function (26 formulas)
11. **`offset(reference, rows, cols, height, width)`** - OFFSET (26 formulas)
12. **`countA(sheetName, startCell, endCell)`** - COUNTA (if used)

---

## 📊 **Algorithm Usage Summary**

| Algorithm | Formulas Covered | Status |
|-----------|------------------|--------|
| directReference | 2,230 | ✅ |
| ifStatement | 1,553 | ✅ |
| multiply | 1,230 | ✅ |
| add | 878 | ✅ |
| sumRange | 611 | ✅ |
| divide | 510 | ✅ |
| arithmetic | 448 | ✅ |
| crossSheetReference | 445 | ✅ |
| subtract | 280 | ✅ |
| ifError | 181 | ✅ |
| maxRange | 157 | 🟡 |
| minRange | 156 | 🟡 |
| indexMatch | 78 | ❌ |
| log | 77 | ✅ |
| composite | 26 | ✅ |
| and | 17 | ❌ |
| rri | 13 | ✅ |
| exp | 26 | ✅ |

**Total Implemented**: ~8,600+ formulas  
**Total Missing**: ~600+ formulas

---

## 📁 **Documentation Files**

- **`valuation-algorithms.js`** - Source code with all algorithms
- **`ALGORITHMS_EXPLAINED.md`** - Detailed explanations of each algorithm
- **`PATTERN_TO_ALGORITHM_MAPPING.md`** - Complete mapping of all 113 patterns to algorithms
- **`FORMULA_INVENTORY_TABLE.md`** - Complete inventory of all formula patterns
- **`COMPLETE_PATTERN_ALGORITHM_MAPPING.md`** - Quick reference guide

---

## 🔍 **How to Use**

```javascript
const ValuationAlgorithms = require('./valuation-algorithms');
const algorithms = new ValuationAlgorithms(excelData);

// Calculate valuations
const earthValue = algorithms.calculateEarthValuation('base');
const marsValue = algorithms.calculateMarsValuation('base');
const optionValue = algorithms.calculateMarsOptionValue('base');

// Use pattern algorithms
const sum = algorithms.sumRange('Earth', 'O116', 'O118');
const max = algorithms.maxRange('Earth', 'A1', 'A100');
const result = algorithms.ifStatement(condition, trueVal, falseVal);
```

---

*Last Updated: ${new Date().toISOString()}*





