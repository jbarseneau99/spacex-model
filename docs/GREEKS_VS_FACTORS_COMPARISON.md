# Greeks vs. Barra Factors: How Practitioners Compare Them

## 🎯 **Key Difference**

**Greeks** = **Model-specific sensitivities** (internal risk drivers)  
**Barra Factors** = **Market/systematic risk exposures** (external risk drivers)

---

## 📊 **What Each Measures**

### **Greeks (Your Current Implementation)**

Greeks measure **how valuation changes** when you **change model inputs**:

| Greek | Measures | Example for SpaceX |
|-------|----------|-------------------|
| **Delta (Δ)** | Sensitivity to input changes | How valuation changes if Starlink penetration increases 1% |
| **Gamma (Γ)** | Convexity (rate of change of Delta) | How Delta changes as penetration increases further |
| **Vega (ν)** | Volatility sensitivity | How valuation changes if uncertainty increases 1% |
| **Theta (Θ)** | Time decay | How valuation changes as Mars timeline shifts |
| **Rho (ρ)** | Discount rate sensitivity | How valuation changes if cost of capital increases 1% |

**Greeks answer:** "If I change THIS input, how much does valuation change?"

### **Barra Factors (Not Yet Implemented)**

Barra factors measure **how valuation correlates** with **market/systematic factors**:

| Factor Type | Measures | Example for SpaceX |
|-------------|----------|-------------------|
| **Style Factors** | Size, Value, Growth, Momentum, Volatility | How SpaceX valuation moves with tech sector growth factor |
| **Industry Factors** | Sector-specific risk | Exposure to aerospace/defense industry factor |
| **Country Factors** | Geographic risk | US market factor exposure |
| **Risk Indices** | Composite risk measures | Overall systematic risk exposure |

**Barra factors answer:** "When THIS market factor moves, how much does valuation move?"

---

## 🔄 **How They Complement Each Other**

### **1. Different Perspectives on Risk**

```
Greeks (Internal View):
┌─────────────────────────────────────┐
│ Model Inputs → Valuation Change    │
│                                     │
│ Starlink Penetration +1%            │
│ → Valuation +$50B                   │
└─────────────────────────────────────┘

Barra Factors (External View):
┌─────────────────────────────────────┐
│ Market Factors → Valuation Change   │
│                                     │
│ Tech Growth Factor +1%              │
│ → Valuation +$30B                   │
└─────────────────────────────────────┘
```

### **2. Greeks = "What Can I Control?"**
- **Model inputs** (penetration, launch volume, discount rate)
- **Internal risk drivers**
- **Actionable** - you can change these inputs

### **3. Barra Factors = "What Can't I Control?"**
- **Market movements** (tech sector, interest rates, market volatility)
- **External risk drivers**
- **Non-actionable** - these move independently

---

## 🏗️ **How Practitioners Use Them Together**

### **Framework 1: Risk Decomposition**

```
Total Risk = Model Risk (Greeks) + Market Risk (Factors) + Idiosyncratic Risk

Example:
Total Volatility = 25%
├─ Model Risk (Greeks): 15%
│  ├─ Delta (penetration): 8%
│  ├─ Vega (volatility): 5%
│  └─ Rho (discount rate): 2%
├─ Market Risk (Factors): 7%
│  ├─ Tech Growth Factor: 4%
│  ├─ Size Factor: 2%
│  └─ Volatility Factor: 1%
└─ Idiosyncratic Risk: 3%
```

### **Framework 2: Risk Attribution**

**Greeks Attribution:**
- "60% of risk comes from Starlink penetration uncertainty"
- "25% comes from Mars timeline uncertainty"
- "15% comes from discount rate uncertainty"

**Factor Attribution:**
- "40% of risk comes from tech sector exposure"
- "30% comes from growth factor exposure"
- "30% comes from idiosyncratic SpaceX-specific risk"

### **Framework 3: Stress Testing**

**Greeks Stress Test:**
```
Scenario: Starlink penetration drops 5%
→ Delta tells us: Valuation drops $250B
```

**Factor Stress Test:**
```
Scenario: Tech sector crashes 20%
→ Factor exposure tells us: Valuation drops $120B
```

**Combined Stress Test:**
```
Scenario: Both happen simultaneously
→ Total impact: $250B (Greeks) + $120B (Factors) = $370B
→ But correlation matters! (May be less due to diversification)
```

---

## 📈 **Practical Comparison Methods**

### **Method 1: Risk Contribution Matrix**

| Risk Source | Greeks Contribution | Factor Contribution | Total |
|-------------|-------------------|-------------------|-------|
| **Volatility** | Vega: 5% | Volatility Factor: 3% | 8% |
| **Growth** | Delta (penetration): 8% | Growth Factor: 4% | 12% |
| **Time** | Theta: 2% | Momentum Factor: 1% | 3% |
| **Rates** | Rho: 2% | Interest Rate Factor: 1% | 3% |

### **Method 2: Correlation Analysis**

**Question:** "Do Greeks and Factors move together?"

```
High Correlation Example:
- When Starlink penetration increases (Delta)
- Tech growth factor also increases
- → Both drive valuation up together
- → Risk is concentrated

Low Correlation Example:
- When Mars timeline shifts (Theta)
- Market factors don't move
- → Independent risk sources
- → Risk is diversified
```

### **Method 3: Factor-Adjusted Greeks**

**Adjust Greeks for market factor exposure:**

```
Raw Delta (penetration): +$50B per 1% increase
Factor-Adjusted Delta: +$35B per 1% increase

Why? Because penetration changes correlate with tech growth factor.
The $15B difference is "explained" by market factors.
```

---

## 🎯 **Real-World Usage Patterns**

### **1. Portfolio Managers**

**Use Greeks for:**
- Understanding which inputs drive most risk
- Deciding which assumptions to stress test
- Model validation and sensitivity analysis

**Use Factors for:**
- Understanding portfolio-level risk
- Comparing SpaceX to other holdings
- Hedging systematic risk exposure

### **2. Risk Managers**

**Use Greeks for:**
- Setting limits on model inputs
- Monitoring model risk
- Internal risk reporting

**Use Factors for:**
- Regulatory reporting (systematic risk)
- Benchmark comparison
- External risk reporting

### **3. Analysts**

**Use Greeks for:**
- Understanding model mechanics
- Scenario analysis
- "What-if" analysis

**Use Factors for:**
- Market context
- Peer comparison
- Relative valuation

---

## 🔧 **Integration in SpaceX Model**

### **Current State: Greeks Only**

```javascript
// Current: Greeks measure model input sensitivity
const greeks = {
  delta: {
    'Starlink Penetration': 50.0,  // $50B per 1% increase
    'Launch Volume': 2.5            // $2.5B per launch
  },
  vega: {
    'Overall Volatility': 15.0       // $15B per 1% vol increase
  }
};
```

### **Proposed: Add Factor Analysis**

```javascript
// Proposed: Factors measure market exposure
const factors = {
  style: {
    'Growth Factor': 0.75,          // 0.75 beta to growth factor
    'Size Factor': -0.30,           // Negative (small cap exposure)
    'Volatility Factor': 0.60       // High volatility exposure
  },
  industry: {
    'Tech Sector': 0.85,            // Strong tech exposure
    'Aerospace': 0.40               // Moderate aerospace exposure
  }
};
```

### **Combined Risk View**

```javascript
// Total risk decomposition
const riskDecomposition = {
  totalVolatility: 0.25,            // 25% annual volatility
  
  greeksRisk: {
    contribution: 0.15,             // 15% from model inputs
    breakdown: {
      penetration: 0.08,
      volatility: 0.05,
      discountRate: 0.02
    }
  },
  
  factorRisk: {
    contribution: 0.07,             // 7% from market factors
    breakdown: {
      techGrowth: 0.04,
      size: 0.02,
      volatility: 0.01
    }
  },
  
  idiosyncratic: 0.03                // 3% SpaceX-specific
};
```

---

## 📊 **Visual Comparison Framework**

### **Side-by-Side Dashboard**

```
┌─────────────────────────────────────────────────────────┐
│              RISK ANALYSIS DASHBOARD                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  GREEKS (Model Risk)          │  FACTORS (Market Risk)  │
│  ───────────────────          │  ────────────────────    │
│                               │                          │
│  Delta:                       │  Growth Factor:          │
│  • Penetration: $50B/%        │  • Exposure: 0.75       │
│  • Launch Vol: $2.5B/launch   │  • Contribution: 4%     │
│                               │                          │
│  Vega:                        │  Tech Sector:            │
│  • Volatility: $15B/%         │  • Exposure: 0.85        │
│                               │  • Contribution: 3%      │
│                               │                          │
│  Total Greeks Risk: 15%       │  Total Factor Risk: 7%   │
│                               │                          │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ **Do Quants Use Both? YES!**

**Answer: Quantitative analysts commonly use BOTH Greeks and Barra factors together.**

### **Industry Practice**

According to quantitative finance research and industry practice:

1. **Greeks** are used for:
   - Managing derivative positions
   - Understanding instrument-specific sensitivities
   - Hedging individual positions
   - Model validation

2. **Barra Factors** are used for:
   - Portfolio-level risk management
   - Systematic risk assessment
   - Regulatory reporting
   - Benchmark comparison

3. **Together** they provide:
   - Comprehensive risk view (instrument + portfolio)
   - Both systematic and specific risk coverage
   - More effective hedging strategies
   - Complete risk decomposition

### **Real-World Example**

**Portfolio Manager at a Hedge Fund:**

```
Morning Risk Meeting:
├─ Greeks Dashboard: "Our options portfolio has high Vega exposure"
├─ Factor Dashboard: "We're overexposed to tech growth factor"
└─ Combined View: "Tech volatility spike would hit us from both sides"
   → Decision: Hedge tech factor exposure to reduce combined risk
```

**Risk Manager at Investment Bank:**

```
Daily Risk Report:
├─ Greeks: "Delta exposure within limits ✅"
├─ Factors: "Size factor exposure exceeds threshold ⚠️"
└─ Action: "Reduce small-cap exposure to bring factor risk in line"
```

---

## 🎓 **Key Insights**

### **1. Greeks ≠ Factors**

- **Greeks** measure **internal** model sensitivity
- **Factors** measure **external** market exposure
- They answer **different questions**

### **2. Both Are Needed**

- **Greeks** for model understanding and validation
- **Factors** for portfolio context and benchmarking
- **Together** for comprehensive risk view
- **Industry standard**: Most quants use both

### **3. Correlation Matters**

- If Greeks and Factors are **correlated** → risk is concentrated
- If they're **uncorrelated** → risk is diversified
- Measure correlation to understand total risk

### **4. Use Cases Differ**

- **Greeks**: "What if penetration changes?"
- **Factors**: "What if tech sector crashes?"
- **Both**: "What if both happen? (And are they correlated?)"

---

## 🚀 **Next Steps for SpaceX Model**

1. **Keep Greeks** (already implemented) ✅
2. **Add Factor Framework** (new)
   - Define relevant factors for SpaceX
   - Calculate factor exposures
   - Decompose risk into Greeks + Factors
3. **Create Combined Dashboard**
   - Show Greeks and Factors side-by-side
   - Show risk decomposition
   - Show correlation analysis

---

## 📚 **References**

- **Greeks**: Standard derivatives pricing theory
- **Barra Factors**: Barra Risk Model Handbook
- **Integration**: Multi-factor risk models in portfolio management

