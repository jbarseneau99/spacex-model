# Detailed Formula Analysis

## Key Findings

### Repetition is EXTREMELY High! ✅

**Earth Sheet:**
- **7,705 formulas** but only **100 unique templates**
- **Average: 77 formulas per template**
- Most common template used **2,124 times** (just copying a cell value)

**Mars Sheet:**
- **1,038 formulas** but only **37 unique templates**
- **Average: 28 formulas per template**
- Most common template used **105 times**

### Formula Complexity Breakdown

**Earth Sheet:**
- **55.0%** Simple (no functions, ≤2 cell references)
- **35.2%** Medium (≤2 functions, ≤10 complexity)
- **9.8%** Complex (multiple functions, nested)

**Mars Sheet:**
- **47.5%** Simple
- **37.6%** Medium
- **14.9%** Complex

### Most Common Formula Types

**Earth:**
1. Direct Reference: `=O153` (2,124 times)
2. Simple Arithmetic: `=B7*B8` (697 times)
3. SUM: `=SUM(I20:I21)` (375 times)
4. Division: `=B11/B12` (351 times)
5. Addition: `=B9+B10` (296 times)
6. IF statements: `=IF(J245="Starlink Constellation Complete",J267,J398)` (260 times)

**Mars:**
1. Direct Reference: `=G31` (105 times)
2. Multiplication: `=F16*F11` (78 times)
3. Addition: `=F26+F18` (52 times)
4. Cross-sheet: `=Earth!I203` (26 times)
5. SUM with subtraction: `=SUM($F7:F7)-SUM($E27:E27)` (26 times)

### Functions Used

**Earth (Top 12):**
- IF: 1,692
- INDEX: 631
- MATCH: 631
- SUM: 507
- MAX: 419
- MIN: 287
- AND: 208
- IFERROR: 207
- LN: 156
- IRR: 26
- OR: 26
- RRI: 4

**Mars (Top 12):**
- SUM: 130
- IF: 130
- COLUMN: 76
- AND: 52
- MIN: 52
- LOG: 51
- MOD: 26
- IFERROR: 26
- ROUNDDOWN: 26
- EXP: 26
- OFFSET: 26
- MAX: 26

**Total unique functions: ~20-25** (very manageable!)

### Key Input Cells

**Earth:**
- A$8: used by **869 formulas**
- A$1012: used by **869 formulas**
- B$8: used by **316 formulas**
- B$1012: used by **316 formulas**

**Mars:**
- B45: used by **52 formulas**
- F44: used by **51 formulas**
- F7: used by **27 formulas**

### Key Output Cells

**Earth O153** (main output):
```
O153 = O119 - O144 - O152
  O119 = SUM(O116:O118)
    O116 = O96
    O118 = O113
  O144 = SUM(O142:O143)
    O142 = O130 * O58
    O143 = O137 * O59
  O152 = (O146 + O150) * O119
```

**Mars K54** (main output):
```
K54 = K53 + J54 * (1 - 1/$B54)
  K53 = K44 * K52
    K44 = $F44 * (1 + $B52)^(LOG(COLUMN()-COLUMN($F44)+1, 2))
    K52 = SUM($F47:K47) - OFFSET(...)
```

---

## Execution Strategy

### Phase 1: Build Formula Parser ✅

Parse Excel formulas into AST (Abstract Syntax Tree):
- Cell references: `A1`, `$A$1`, `A$1`, `$A1`
- Functions: `SUM()`, `IF()`, `INDEX()`, etc.
- Operators: `+`, `-`, `*`, `/`, `^`
- Cross-sheet: `Earth!A1`

### Phase 2: Build Dependency Graph ✅

- Map all cell dependencies
- Topological sort for execution order
- Identify input cells (no dependencies)

### Phase 3: Formula Execution Engine

**Simple formulas (55%):**
- Direct reference: `=A1` → return value of A1
- Arithmetic: `=A1+B1` → evaluate expression

**Medium formulas (35%):**
- SUM: `=SUM(A1:A10)` → sum range
- IF: `=IF(condition, true, false)` → conditional
- Functions: Use formulajs library

**Complex formulas (10%):**
- Nested functions: Execute recursively
- Cross-sheet: Resolve sheet references
- Array formulas: Handle ranges

### Phase 4: Execution Order

1. Identify all input cells (no formulas)
2. Topological sort formulas by dependencies
3. Execute in order
4. Cache results

---

## Implementation Plan

### Step 1: Formula Parser

Use or build parser for Excel formulas:
- Parse into tokens
- Build AST
- Resolve cell references

### Step 2: Dependency Resolver

- Build dependency graph
- Topological sort
- Identify execution order

### Step 3: Execution Engine

- Simple evaluator for arithmetic
- Function library (formulajs) for Excel functions
- Cross-sheet resolution
- Caching for performance

### Step 4: Integration

- Replace multiplier-based calculations
- Use formula execution for all calculations
- Cache results for performance

---

## Estimated Effort

- **Formula Parser**: 2-3 days
- **Dependency Resolver**: 1-2 days
- **Execution Engine**: 3-5 days
- **Integration**: 2-3 days
- **Testing**: 2-3 days

**Total: ~2-3 weeks**

---

## Libraries to Consider

1. **formulajs** - Excel formula execution
   - Supports ~100 Excel functions
   - Good for most formulas
   - May need extensions for some functions

2. **xlsx-populate** - Excel manipulation
   - Can read formulas
   - Limited execution

3. **exceljs** - Excel file handling
   - Good for reading/writing
   - Formula execution requires external engine

**Recommendation: formulajs + custom parser**

---

*Analysis Date: 2025-01-XX*




