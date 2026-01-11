# Factor Risk Models Implementation

## Overview

Added Factor Risk analysis to complement existing Greeks analysis. Users can now:
- Select from multiple factor models (Fama-French 3/5, Barra-style, Custom)
- Calculate factor exposures for SpaceX
- View factor risk contributions
- Stress test factor exposures
- Compare factor risk with Greeks risk

## Open Source Libraries Used

### Default Models (Built-in)

1. **Fama-French 3-Factor Model** (Default)
   - Factors: Market, Size (SMB), Value (HML)
   - Data Source: Kenneth French Data Library (open source)
   - Implementation: Built-in estimates based on SpaceX characteristics

2. **Fama-French 5-Factor Model**
   - Adds: Profitability (RMW), Investment (CMA)
   - Data Source: Kenneth French Data Library (open source)
   - Implementation: Built-in estimates

3. **Barra-Style Multi-Factor** (Framework)
   - Style Factors: Growth, Size, Value, Momentum, Volatility, Leverage
   - Industry Factors: Tech, Aerospace, Telecommunications
   - Country Factors: US Market
   - Note: Framework structure provided; requires factor data for full implementation

### Future Integration Options

For production use, consider integrating:

1. **Python Libraries** (via API):
   - `factor-pricing-model-risk-model` (PyPI)
   - `simulate` (GitHub: leolle/simulate)
   - `skfolio` (Skfolio Labs)

2. **Data Sources**:
   - Kenneth French Data Library (free, academic)
   - FRED (Federal Reserve Economic Data) - for macro factors
   - Yahoo Finance API - for market data

## Implementation Structure

```
services/
  └── factor-models.js       # Factor model service

API Endpoints:
  GET  /api/factor-models                    # List available models
  POST /api/factor-models/calculate          # Calculate factor exposures
  POST /api/factor-models/stress-test        # Stress test factor
  POST /api/factor-models/adjusted-greeks    # Factor-adjusted Greeks

UI Components:
  - Factor Model Selector
  - Factor Exposure Dashboard
  - Factor Risk Contribution Charts
  - Factor Stress Testing
```

## Default Factor Exposures (SpaceX Estimates)

### Fama-French 3-Factor
- Market: 1.2 (high beta)
- Size: -0.3 (small cap characteristics)
- Value: -0.5 (growth stock)

### Barra-Style
- Growth: 0.75
- Size: -0.30
- Value: -0.50
- Momentum: 0.60
- Volatility: 0.80
- Tech: 0.85
- Aerospace: 0.60
- Telecommunications: 0.70
- US Market: 1.0

## Usage

### Calculate Factor Exposures

```javascript
// Select model and calculate
const response = await fetch('/api/factor-models/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    modelId: 'fama-french-3',
    valuationData: { valuation: 800 },
    marketData: null  // Optional
  })
});
```

### Stress Test Factor

```javascript
// Test impact of factor shock
const response = await fetch('/api/factor-models/stress-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    modelId: 'fama-french-3',
    factorName: 'Market',
    shock: -0.20,  // 20% drop
    baseValuation: 800
  })
});
```

## Next Steps

1. ✅ Factor model service created
2. ✅ API endpoints added
3. 🔄 UI components (in progress)
4. ⏳ Integration with Greeks dashboard
5. ⏳ Historical factor data integration
6. ⏳ Real-time factor updates

## Notes

- Barra models are proprietary (MSCI). This implementation provides a Barra-style framework structure.
- For production, integrate with actual factor data sources (Kenneth French, FRED, etc.)
- Factor exposures are currently estimated. For accuracy, use historical returns regression.





