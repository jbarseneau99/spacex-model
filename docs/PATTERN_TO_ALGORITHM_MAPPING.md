# Pattern-to-Algorithm Mapping

**Total Patterns**: 113  
**Total Formulas**: 8890  
**Generated**: 2026-01-10T02:47:20.112Z

## Summary

- **✅ Fully Implemented**: 102 patterns
- **🟡 Partial/Needs Update**: 9 patterns
- **❌ Not Implemented**: 2 patterns
- **⚠️ Unmapped**: 0 patterns

---

## Complete Pattern-to-Algorithm Mapping

| # | Pattern | Count | Algorithm | Method | Status | Priority | Notes |
|---|---------|-------|-----------|--------|--------|----------|-------|
| 1 | `=CELL` | 2230 | **directReference** | `directReference(sourceCell)` | ✅ Implemented | P0 |  |
| 2 | `=CELL*CELL` | 908 | **multiply** | `multiply(a, b)` | ✅ Implemented | P0 |  |
| 3 | `=SUM(CELL:CELL)` | 401 | **sumRange** | `sumRange(sheetName, startCell, endCell)` | ✅ Implemented | P0 |  |
| 4 | `=CELL/CELL` | 380 | **divide** | `divide(a, b)` | ✅ Implemented | P0 |  |
| 5 | `SHEET!CELL` | 367 | **crossSheetReference** | `crossSheetReference(sheetName, cellRef)` | ✅ Implemented | P0 |  |
| 6 | `=CELL+CELL` | 348 | **add** | `add(a, b)` | ✅ Implemented | P0 |  |
| 7 | `=IF(CELL=STR,CELL,CELL)` | 312 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P0 | May need enhanced IF for complex conditions |
| 8 | `=CELL-CELL` | 183 | **subtract** | `subtract(a, b)` | ✅ Implemented | P0 |  |
| 9 | `=IF(CELL=STR,CELL,NUM)` | 130 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P0 | May need enhanced IF for complex conditions |
| 10 | `=IF(CELL=STR,NUM,CELL)` | 104 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P0 | May need enhanced IF for complex conditions |
| 11 | `=IF(CELL=STR,CELL-CELL,NUM)` | 104 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P0 | May need enhanced IF for complex conditions |
| 12 | `=IFERROR(CELL*(CELL/CELL),NUM)` | 104 | **ifError** | `ifError(value, defaultValue)` | ✅ Implemented | P0 |  |
| 13 | `=(CELL+CELL)*CELL` | 81 | **add** | `add(a, b)` | ✅ Implemented | P1 |  |
| 14 | `=CELL*CELL*CELL` | 80 | **multiply** | `multiply(a, b)` | ✅ Implemented | P1 |  |
| 15 | `=NUM-CELL` | 80 | **arithmetic** | `add/subtract/multiply/divide` | ✅ Implemented via basic operations | P1 |  |
| 16 | `=CELL+(CELL/CELL)` | 78 | **divide** | `divide(a, b)` | ✅ Implemented | P1 |  |
| 17 | `=IF(CELL>CELL,STR,STR)` | 78 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P1 | May need enhanced IF for complex conditions |
| 18 | `=MIN(CELL,CELL)` | 78 | **minRange** | `minRange(sheetName, startCell, endCell)` | 🟡 Partial - Needs multi-arg support | P1 | May need min(...values) for multiple arguments |
| 19 | `=INDEX(CELL:CELL,MATCH(CELL-CELL,CELL:CELL))` | 78 | **indexMatch** | `indexMatch(lookupValue, lookupRange, returnRange, exactMatch)` | ❌ Not Implemented | P0 |  |
| 20 | `=CELL+NUM` | 76 | **arithmetic** | `add/subtract/multiply/divide` | ✅ Implemented via basic operations | P1 |  |
| 21 | `=CELL*(NUM-CELL)` | 76 | **arithmetic** | `add/subtract/multiply/divide` | ✅ Implemented via basic operations | P1 |  |
| 22 | `=(CELL*CELL)` | 57 | **multiply** | `multiply(a, b)` | ✅ Implemented | P1 |  |
| 23 | `=CELL+CELL+CELL+CELL` | 54 | **add** | `add(a, b)` | ✅ Implemented | P1 |  |
| 24 | `=SUM(CELL:CELL,CELL)` | 54 | **sumRange** | `sumRange(sheetName, startCell, endCell)` | 🟡 Partial - Needs multi-range support | P1 | May need sumRangeMultiple() for multiple ranges |
| 25 | `=CELL/(NUM-CELL)` | 54 | **arithmetic** | `add/subtract/multiply/divide` | ✅ Implemented via basic operations | P1 |  |
| 26 | `=(CELL+CELL)/CELL` | 54 | **add** | `add(a, b)` | ✅ Implemented | P1 |  |
| 27 | `=CELL-CELL-CELL` | 54 | **subtract** | `subtract(a, b)` | ✅ Implemented | P1 |  |
| 28 | `=CELL+CELL+CELL` | 54 | **add** | `add(a, b)` | ✅ Implemented | P1 |  |
| 29 | `=IF(CELL>=NUM,MIN(CELL,CELL*(NUM+CELL)),MAX(CELL*(` | 52 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P1 | May need enhanced IF for complex conditions |
| 30 | `=(CELL*CELL*CELL)+(CELL*CELL)` | 52 | **multiply** | `multiply(a, b)` | ✅ Implemented | P1 |  |
| 31 | `=(CELL/CELL)/(NUM/CELL)` | 52 | **divide** | `divide(a, b)` | ✅ Implemented | P1 |  |
| 32 | `=IF(AND(CELL=STR,CELL=STR,CELL=STR),CELL-CELL,NUM)` | 52 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P1 | May need enhanced IF for complex conditions |
| 33 | `=IF(CELL>=CELL,STR,STR)` | 52 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P1 | May need enhanced IF for complex conditions |
| 34 | `=IFERROR(MAX(CELL,CELL)+(CELL/CELL),MAX(CELL,CELL)` | 52 | **maxRange** | `maxRange(sheetName, startCell, endCell)` | 🟡 Partial - Needs multi-arg support | P1 | May need max(...values) for multiple arguments |
| 35 | `=IF(AND(CELL=STR,CELL=STR),CELL+CELL,NUM)` | 52 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P1 | May need enhanced IF for complex conditions |
| 36 | `=IF(AND(CELL=STR,CELL=STR),(CELL/CELL)-CELL,NUM)` | 52 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P1 | May need enhanced IF for complex conditions |
| 37 | `=CELL*(NUM+CELL)` | 52 | **arithmetic** | `add/subtract/multiply/divide` | ✅ Implemented via basic operations | P1 |  |
| 38 | `=IF(CELL=STR,(SUM(CELL,CELL)/CELL)-CELL,CELL-CELL)` | 52 | **sumRange** | `sumRange(sheetName, startCell, endCell)` | 🟡 Partial - Needs multi-range support | P1 | May need sumRangeMultiple() for multiple ranges |
| 39 | `=CELL+((CELL+CELL+CELL)*(NUM/CELL))` | 52 | **add** | `add(a, b)` | ✅ Implemented | P1 |  |
| 40 | `=MAX(CELL:CELL)*(NUM+CELL)` | 52 | **maxRange** | `maxRange(sheetName, startCell, endCell)` | ✅ Implemented | P1 |  |
| 41 | `SHEET!CELL)*CELL)` | 27 | **crossSheetReference** | `crossSheetReference(sheetName, cellRef)` | ✅ Implemented | P2 |  |
| 42 | `=MAX(-CELL,IF(CELL>CELL,-CELL,-(CELL*CELL)))` | 27 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 43 | `=-CELL` | 27 | **arithmetic** | `add/subtract/multiply/divide` | ✅ Implemented via basic operations | P2 |  |
| 44 | `=CELL/NUM` | 27 | **arithmetic** | `add/subtract/multiply/divide` | ✅ Implemented via basic operations | P2 |  |
| 45 | `SHEET!CELL))*(IF((CELL*(NUM-CELL))>MAX(SHEET!CELL:` | 27 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 46 | `=(CELL-CELL)*CELL*CELL` | 27 | **multiply** | `multiply(a, b)` | ✅ Implemented | P2 |  |
| 47 | `=CELL+CELL+CELL+CELL+CELL+CELL` | 27 | **add** | `add(a, b)` | ✅ Implemented | P2 |  |
| 48 | `=CELL-CELL+CELL` | 27 | **add** | `add(a, b)` | ✅ Implemented | P2 |  |
| 49 | `=MAX(CELL,CELL)` | 27 | **maxRange** | `maxRange(sheetName, startCell, endCell)` | 🟡 Partial - Needs multi-arg support | P2 | May need max(...values) for multiple arguments |
| 50 | `=MAX(-CELL,-(CELL*CELL))` | 26 | **maxRange** | `maxRange(sheetName, startCell, endCell)` | 🟡 Partial - Needs multi-arg support | P2 | May need max(...values) for multiple arguments |
| 51 | `=(CELL/NUM)*(CELL/CELL)^((LN(NUM-CELL)/LN(NUM)))+(` | 26 | **log** | `log(value, base = Math.E)` | ✅ Implemented | P2 |  |
| 52 | `=IF(CELL>CELL,NUM,((CELL/NUM)*(CELL/CELL)^((LN(NUM` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 53 | `=IF(CELL>=NUM,MIN(CELL,CELL*(NUM+CELL)),MAX(CELL,C` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 54 | `=CELL+((CELL*(CELL+CELL))+(CELL*(CELL+CELL)))` | 26 | **add** | `add(a, b)` | ✅ Implemented | P2 |  |
| 55 | `=CELL+(CELL*CELL)-(CELL*CELL)` | 26 | **multiply** | `multiply(a, b)` | ✅ Implemented | P2 |  |
| 56 | `=(CELL+(CELL*CELL)-(CELL*CELL))` | 26 | **multiply** | `multiply(a, b)` | ✅ Implemented | P2 |  |
| 57 | `=(CELL/(CELL*(NUM-CELL)))*(CELL/(CELL/(CELL*(NUM-C` | 26 | **composite** | `divide/multiply combined` | ✅ Implemented via basic operations | P2 | Complex arithmetic pattern - uses divide and multiply |
| 58 | `=MIN(((CELL-(NUM/(NUM*NUM)))*CELL)/(CELL-(NUM/(NUM` | 26 | **minRange** | `minRange(sheetName, startCell, endCell)` | 🟡 Partial - Needs multi-arg support | P2 | May need min(...values) for multiple arguments |
| 59 | `=MIN(NUM,IF(CELL>=NUM,CELL,CELL*(NUM-(CELL/NUM))))` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 60 | `=CELL*(CELL-CELL)` | 26 | **subtract** | `subtract(a, b)` | ✅ Implemented | P2 |  |
| 61 | `=(CELL*(NUM-CELL))` | 26 | **arithmetic** | `add/subtract/multiply/divide` | ✅ Implemented via basic operations | P2 |  |
| 62 | `=-IF(CELL=STR,(CELL+CELL+CELL+CELL)/(CELL*CELL),(C` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 63 | `=(IF((CELL+NUM)>MAX(SHEET!CELL:CELL),INDEX(SHEET!C` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 64 | `=IFERROR(IRR(CELL:CELL),NUM)` | 26 | **ifError** | `ifError(value, defaultValue)` | ✅ Implemented | P2 |  |
| 65 | `=IF(CELL=STR,STR,IF(CELL=STR,IF(CELL>CELL,STR,STR)` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 66 | `=IF(CELL=STR,NUM,IF(CELL>=NUM,CELL,NUM))` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 67 | `=IF(OR(CELL=STR,AND(CELL=STR,CELL=STR)),CELL/CELL,` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 68 | `=IF(CELL=STR,IF(AND(CELL=STR, CELL=STR),NUM,CELL/C` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 69 | `=(CELL*CELL)+(CELL*CELL)+(CELL*(CELL+CELL+CELL))+(` | 26 | **multiply** | `multiply(a, b)` | ✅ Implemented | P2 |  |
| 70 | `=CELL/SUM(CELL:CELL)` | 26 | **sumRange** | `sumRange(sheetName, startCell, endCell)` | ✅ Implemented | P2 |  |
| 71 | `=MIN(CELL,CELL,CELL)` | 26 | **minRange** | `minRange(sheetName, startCell, endCell)` | 🟡 Partial - Needs multi-arg support | P2 | May need min(...values) for multiple arguments |
| 72 | `=CELL*(CELL+CELL)` | 26 | **add** | `add(a, b)` | ✅ Implemented | P2 |  |
| 73 | `=CELL-CELL+CELL-CELL` | 26 | **add** | `add(a, b)` | ✅ Implemented | P2 |  |
| 74 | `=IF(CELL=STR,IF(CELL>=NUM,CELL,NUM),NUM)` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 75 | `=IF(CELL=STR,NUM%,NUM)` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 76 | `=IF(CELL>=NUM,MIN(NUM,CELL*(NUM+CELL)),MAX(CELL*(N` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 77 | `=IF(CELL=STR,CELL*CELL,NUM)` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 78 | `=(CELL+CELL)*(CELL+CELL)` | 26 | **add** | `add(a, b)` | ✅ Implemented | P2 |  |
| 79 | `=IF(CELL=STR,CELL/CELL,NUM)` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 80 | `=IF(CELL=STR,NUM,CELL/CELL)` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 81 | `=IF(CELL=STR,IF(CELL<CELL,(CELL-CELL)*CELL,NUM),IF` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 82 | `=(CELL)*(CELL/CELL)^((LN(NUM+CELL)/LN(NUM)))` | 26 | **log** | `log(value, base = Math.E)` | ✅ Implemented | P2 |  |
| 83 | `=SUM(CELL:CELL)-SUM(CELL:CELL)` | 26 | **sumRange** | `sumRange(sheetName, startCell, endCell)` | ✅ Implemented | P2 |  |
| 84 | `SHEET!CELL,MOD(CELL,NUM)=NUM),STR,STR)` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 85 | `SHEET!CELL+CELL/CELL` | 26 | **add** | `add(a, b)` | ✅ Implemented | P2 |  |
| 86 | `=IFERROR(CELL/CELL,STR)` | 26 | **ifError** | `ifError(value, defaultValue)` | ✅ Implemented | P2 |  |
| 87 | `=CELL*(CELL+NUM)` | 26 | **arithmetic** | `add/subtract/multiply/divide` | ✅ Implemented via basic operations | P2 |  |
| 88 | `=IF(CELL<=CELL,SHEET!STR)` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 89 | `=ROUNDDOWN(MIN(CELL:CELL)/(CELL+NUM),NUM)*(NUM+CEL` | 26 | **minRange** | `minRange(sheetName, startCell, endCell)` | ✅ Implemented | P2 |  |
| 90 | `=IF(CELL=NUM,NUM,IF(AND(CELL>NUM,CELL=NUM),CELL,CE` | 26 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 91 | `=SUM(CELL,CELL)*(NUM+CELL)` | 26 | **sumRange** | `sumRange(sheetName, startCell, endCell)` | 🟡 Partial - Needs multi-range support | P2 | May need sumRangeMultiple() for multiple ranges |
| 92 | `SHEET!CELL/NUM)` | 26 | **crossSheetReference** | `crossSheetReference(sheetName, cellRef)` | ✅ Implemented | P2 |  |
| 93 | `=CELL/CELL*CELL` | 26 | **multiply** | `multiply(a, b)` | ✅ Implemented | P2 |  |
| 94 | `=SUM(CELL:CELL)-OFFSET(CELL,NUM,MAX(-CELL,-(COLUMN` | 26 | **sumRange** | `sumRange(sheetName, startCell, endCell)` | ✅ Implemented | P2 |  |
| 95 | `=CELL+CELL*(NUM-NUM/CELL)` | 26 | **add** | `add(a, b)` | ✅ Implemented | P2 |  |
| 96 | `=IFERROR((CELL-CELL)/CELL,NUM)` | 25 | **ifError** | `ifError(value, defaultValue)` | ✅ Implemented | P2 |  |
| 97 | `=(CELL+CELL)*(NUM-CELL)` | 25 | **add** | `add(a, b)` | ✅ Implemented | P2 |  |
| 98 | `=CELL*(NUM+CELL)^(LOG(COLUMN()-COLUMN(CELL)+NUM,NU` | 25 | **log** | `log(value, base = Math.E)` | ✅ Implemented | P2 |  |
| 99 | `=RAND()` | 17 | **and** | `and(...conditions)` | ❌ Not Implemented | P1 |  |
| 100 | `=(CELL-CELL)/NUM+CELL` | 17 | **subtract** | `subtract(a, b)` | ✅ Implemented | P2 |  |
| 101 | `=SHEET!CELL` | 16 | **crossSheetReference** | `crossSheetReference(sheetName, cellRef)` | ✅ Implemented | P2 |  |
| 102 | `=IF(CELL=CELL,CELL,IF(NORM.INV(CELL,CELL,(CELL-CEL` | 15 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P2 | May need enhanced IF for complex conditions |
| 103 | `=QUARTILE(SHEET!CELL:CELL,NUM)/NUM^NUM` | 6 | **crossSheetReference** | `crossSheetReference(sheetName, cellRef)` | ✅ Implemented | P3 |  |
| 104 | `=RRI(((CELL-CELL)/NUM),CELL,CELL)` | 5 | **rri** | `rri(nper, pv, fv)` | ✅ Implemented | P3 |  |
| 105 | `=_xlfn.RRI(((CELL-CELL)/NUM),CELL,CELL)` | 4 | **rri** | `rri(nper, pv, fv)` | ✅ Implemented | P3 |  |
| 106 | `=RRI(NUM,CELL,CELL)` | 4 | **rri** | `rri(nper, pv, fv)` | ✅ Implemented | P3 |  |
| 107 | `=AVERAGE(SHEET!CELL:CELL)/NUM^NUM` | 3 | **crossSheetReference** | `crossSheetReference(sheetName, cellRef)` | ✅ Implemented | P3 |  |
| 108 | `=NUM/CELL` | 2 | **arithmetic** | `add/subtract/multiply/divide` | ✅ Implemented via basic operations | P3 |  |
| 109 | `=NUM/NUM` | 2 | **arithmetic** | `add/subtract/multiply/divide` | ✅ Implemented via basic operations | P3 |  |
| 110 | `=ROUNDDOWN(MAX(IF(CELL=CELL,CELL,IF(NORM.INV(CELL,` | 1 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P3 | May need enhanced IF for complex conditions |
| 111 | `=ROUNDDOWN(IF(CELL=CELL,CELL,IF(NORM.INV(CELL,CELL` | 1 | **ifStatement** | `ifStatement(condition, trueValue, falseValue)` | ✅ Implemented | P3 | May need enhanced IF for complex conditions |
| 112 | `=CELL/(CELL*CELL)` | 1 | **multiply** | `multiply(a, b)` | ✅ Implemented | P3 |  |
| 113 | `=CELL*CELL*CELL*NUM` | 1 | **multiply** | `multiply(a, b)` | ✅ Implemented | P3 |  |

---

## Algorithm Coverage Summary

| Algorithm | Patterns Covered | Total Formulas | Status |
|-----------|------------------|----------------|--------|
| **directReference** | 1 | 2230 | ✅ Implemented |
| **ifStatement** | 34 | 1553 | ✅ Implemented |
| **multiply** | 11 | 1230 | ✅ Implemented |
| **add** | 15 | 878 | ✅ Implemented |
| **sumRange** | 7 | 611 | ✅ Implemented |
| **divide** | 3 | 510 | ✅ Implemented |
| **arithmetic** | 11 | 448 | ✅ Implemented via basic operations |
| **crossSheetReference** | 6 | 445 | ✅ Implemented |
| **subtract** | 4 | 280 | ✅ Implemented |
| **ifError** | 4 | 181 | ✅ Implemented |
| **maxRange** | 4 | 157 | 🟡 Partial - Needs multi-arg support |
| **minRange** | 4 | 156 | 🟡 Partial - Needs multi-arg support |
| **indexMatch** | 1 | 78 | ❌ Not Implemented |
| **log** | 3 | 77 | ✅ Implemented |
| **composite** | 1 | 26 | ✅ Implemented via basic operations |
| **and** | 1 | 17 | ❌ Not Implemented |
| **rri** | 3 | 13 | ✅ Implemented |

---

## Missing Algorithms (Need Implementation)

### and

**Patterns**: 1
**Total Formulas**: 17

Patterns using this algorithm:
1. `=RAND()` (17x)

### indexMatch

**Patterns**: 1
**Total Formulas**: 78

Patterns using this algorithm:
1. `=INDEX(CELL:CELL,MATCH(CELL-CELL,CELL:CELL))` (78x)

### maxRange

**Patterns**: 4
**Total Formulas**: 157

Patterns using this algorithm:
1. `=IFERROR(MAX(CELL,CELL)+(CELL/CELL),MAX(CELL,CELL))` (52x)
2. `=MAX(CELL:CELL)*(NUM+CELL)` (52x)
3. `=MAX(CELL,CELL)` (27x)
4. `=MAX(-CELL,-(CELL*CELL))` (26x)

### minRange

**Patterns**: 4
**Total Formulas**: 156

Patterns using this algorithm:
1. `=MIN(CELL,CELL)` (78x)
2. `=MIN(((CELL-(NUM/(NUM*NUM)))*CELL)/(CELL-(NUM/(NUM*NUM))),NU` (26x)
3. `=MIN(CELL,CELL,CELL)` (26x)
4. `=ROUNDDOWN(MIN(CELL:CELL)/(CELL+NUM),NUM)*(NUM+CELL)` (26x)

### sumRange

**Patterns**: 7
**Total Formulas**: 611

Patterns using this algorithm:
1. `=SUM(CELL:CELL)` (401x)
2. `=SUM(CELL:CELL,CELL)` (54x)
3. `=IF(CELL=STR,(SUM(CELL,CELL)/CELL)-CELL,CELL-CELL)` (52x)
4. `=CELL/SUM(CELL:CELL)` (26x)
5. `=SUM(CELL:CELL)-SUM(CELL:CELL)` (26x)
... and 2 more


---

## Implementation Checklist

### P0 - Critical (Must Implement)
*All P0 patterns are implemented!*

### P1 - High Priority
- [ ] **indexMatch** - `=INDEX(CELL:CELL,MATCH(CELL-CELL,CELL:CELL))` (78 formulas)

---

## Notes

1. **Pattern Normalization**: Patterns are normalized (CELL = cell reference, NUM = number, STR = string)
2. **Composite Patterns**: Complex patterns may require multiple algorithm calls
3. **Status Legend**:
   - ✅ Implemented: Fully working
   - 🟡 Partial: Partially implemented, may need enhancements
   - ❌ Not Implemented: Missing algorithm
   - ⚠️ Unmapped: Pattern not yet analyzed

---

*This mapping ensures all 8890 formulas across 113 unique patterns are accounted for.*
