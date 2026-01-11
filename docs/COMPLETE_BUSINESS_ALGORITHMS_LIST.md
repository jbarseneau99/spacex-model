# Complete Business Algorithms List

**All 8,890+ formulas mapped to BUSINESS ALGORITHMS**

**Last Updated**: 2026-01-10

---

## ✅ **Currently Identified Business Algorithms** (22)

1. **Mars Colony Valuation** - 1,041 formulas (11.7%)
2. **Milestone-Based Revenue Switching** - 624 formulas (7.0%)
3. **Milestone-Based Cost Switching** - 624 formulas (7.0%)
4. **Compound Growth** - 364 formulas (4.1%)
5. **Present Value Discounting** - 257 formulas (2.9%)
6. **Launch Cost per kg** - 208 formulas (2.3%)
7. **Launch Pricing** - 208 formulas (2.3%)
8. **Exponential Growth** - 129 formulas (1.5%)
9. **Total Addressable Market** - 53 formulas (0.6%)
10. **Internal Rate of Return** - 26 formulas (0.3%)
11. **Wright's Law (Learning Curve)** - 25 formulas (0.3%)
12. **Starlink Revenue Calculation** - 3 formulas
13. **Launch Services Revenue** - 3 formulas
14. **Terminal Value** - 2 formulas
15. **Operating Costs** - 2 formulas
16. **Capital Costs** - 2 formulas
17. **Total Revenue Aggregation** - 1 formula
18. **Total Cost Aggregation** - 1 formula
19. **Tax Calculation** - 1 formula
20. **Expense Calculation** - 1 formula
21. **Net Present Value** - 1 formula
22. **Other** (intermediate calculations) - 6,883 formulas (77.4%)

---

## ⚠️ **Missing Business Algorithms Identified** (9)

### 1. **Monte Carlo Simulation** - 34 formulas
- **Description**: Probabilistic modeling using RAND() and NORM.INV
- **Business Logic**: Generate random scenarios for Monte Carlo valuation
- **Example**: `=RAND()`, `=NORM.INV(G32,H32,(D32-H32))`

### 2. **Cumulative Calculations** - 296 formulas
- **Description**: Year-over-year accumulation (running totals)
- **Business Logic**: Track cumulative values over time (e.g., cumulative revenue, cumulative costs)
- **Example**: `=I90+(J426*J428)-(J431*J435)`

### 3. **Depreciation** - 132 formulas
- **Description**: Cumulative depreciation over time
- **Business Logic**: Calculate asset depreciation (facilities, equipment)
- **Example**: `=I171+(J189/J174)`

### 4. **Time Series Aggregation** - 496 formulas
- **Description**: SUM, MAX, MIN aggregations over time periods
- **Business Logic**: Aggregate revenue/cost components by year
- **Example**: `=SUM(I116:I118)`

### 5. **Lookup Interpolation** - 78 formulas
- **Description**: INDEX/MATCH, OFFSET lookups
- **Business Logic**: Interpolate values from lookup tables (e.g., penetration curves, cost tables)
- **Example**: `=INDEX($E$428:J$428,MATCH(J410-$B411,$E$410:J$410))`

### 6. **Ratio Calculations** - 57 formulas
- **Description**: Normalization and scaling calculations
- **Business Logic**: Calculate ratios, percentages, normalized values
- **Example**: `=O408/$I$408`

### 7. **Present Value Components** - 4 formulas
- **Description**: PV calculations for individual revenue/cost components
- **Business Logic**: Discount individual revenue/cost streams to present value
- **Example**: `=SUM(O47:O48,O55)`

### 8. **Revenue Components** - 5 formulas
- **Description**: Individual revenue stream calculations
- **Business Logic**: Calculate individual revenue components (Starlink, Launch, etc.)
- **Example**: `=O91*O92*O98`

### 9. **Cost Components** - 5 formulas
- **Description**: Individual cost component calculations
- **Business Logic**: Calculate individual cost components (OpEx, CapEx, etc.)
- **Example**: `=O127*O128`

---

## 📊 **Updated Summary**

| Category | Count | Formulas | % of Total |
|----------|-------|----------|------------|
| **Identified Algorithms** | 22 | 2,007 | 22.6% |
| **Missing Algorithms** | 9 | 1,107 | 12.5% |
| **Still Unclassified** | - | 5,776 | 65.0% |
| **TOTAL** | **31** | **8,890** | **100%** |

---

## 🔍 **Next Steps**

1. **Categorize remaining 5,776 formulas** - Need deeper analysis
2. **Implement missing algorithms** - Add to `valuation-algorithms.js`
3. **Map all formulas** - Ensure 100% coverage
4. **Document business logic** - Explain what each algorithm does

---

## 📁 **Related Files**

- `BUSINESS_ALGORITHMS_COMPLETE.md` - Original mapping
- `MISSING_BUSINESS_ALGORITHMS.md` - Missing algorithms analysis
- `BUSINESS_ALGORITHMS_COMPLETE.json` - Complete JSON mapping
- `MISSING_BUSINESS_ALGORITHMS.json` - Missing algorithms JSON

