# SpaceX Risk Framework: Model Inputs vs. Market Factors

## 🎯 **The Key Distinction**

**Greeks** = "What if **I change** this model input?" (You control these)  
**Factors** = "What if **the market** changes?" (You don't control these)

---

## 📊 **Your SpaceX Model: Inputs vs. Factors**

### **GREEKS: Model Inputs (What You Control)**

These are the inputs **you set** in your valuation model:

| Input | Type | Greeks Question | Example |
|-------|------|----------------|---------|
| **Starlink Penetration** | Model Input | "What if penetration changes from 15% to 20%?" | Delta: +$50B per 1% increase |
| **Launch Volume** | Model Input | "What if launch volume changes from 150 to 200/year?" | Delta: +$2.5B per launch |
| **First Colony Year** | Model Input | "What if Mars colony is delayed from 2030 to 2035?" | Theta: -$100B per year delay |
| **Population Growth** | Model Input | "What if Mars population grows faster?" | Delta: +$30B per 10% growth increase |
| **Bandwidth Price Decline** | Model Input | "What if prices decline faster?" | Delta: -$20B per 1% faster decline |
| **Launch Price Decline** | Model Input | "What if launch costs drop faster?" | Delta: +$15B per 1% faster decline |
| **Transport Cost Decline** | Model Input | "What if Mars transport costs drop faster?" | Delta: +$40B per 1% faster decline |
| **Discount Rate** | Model Input | "What if discount rate changes from 12% to 15%?" | Rho: -$80B per 1% increase |

**These are YOUR assumptions** - you can change them in the model.

---

### **BARRA FACTORS: Market Factors (What You Don't Control)**

These are **market/systematic factors** that affect SpaceX but aren't model inputs:

| Factor | Type | Factors Question | Example |
|-------|------|-----------------|---------|
| **Tech Sector Growth** | Market Factor | "What if tech sector crashes 20%?" | Factor Exposure: +$120B impact |
| **Market Volatility** | Market Factor | "What if market volatility spikes?" | Vega Factor: +$60B impact |
| **Interest Rates** | Market Factor | "What if Fed raises rates 2%?" | Rate Factor: -$50B impact |
| **Aerospace Industry** | Industry Factor | "What if aerospace sector underperforms?" | Industry Factor: -$40B impact |
| **Growth Factor** | Style Factor | "What if growth stocks sell off?" | Growth Factor: +$80B impact |
| **Size Factor** | Style Factor | "What if small caps outperform?" | Size Factor: -$20B impact |
| **Momentum Factor** | Style Factor | "What if momentum reverses?" | Momentum Factor: -$30B impact |

**These are MARKET MOVEMENTS** - you can't control them, only measure exposure.

---

## 🔍 **The Critical Distinction**

### **Example 1: Starlink Penetration**

**Greeks (Model Input):**
```
Question: "What if Starlink penetration increases from 15% to 20%?"
Answer: Delta = +$50B per 1% increase
→ Total impact: +$250B (5% × $50B)
```

**Factors (Market Factor):**
```
Question: "What if tech sector crashes and reduces demand for satellite internet?"
Answer: Tech Growth Factor exposure = 0.75 beta
→ If tech sector drops 20%, SpaceX valuation drops $120B (20% × 0.75 × $800B base)
```

**Key Difference:**
- **Greeks**: You're asking "What if MY assumption changes?"
- **Factors**: You're asking "What if THE MARKET changes?"

---

### **Example 2: Discount Rate**

**Greeks (Model Input):**
```
Question: "What if I change my discount rate assumption from 12% to 15%?"
Answer: Rho = -$80B per 1% increase
→ Total impact: -$240B (3% × $80B)
```

**Factors (Market Factor):**
```
Question: "What if the Fed raises interest rates and market discount rates rise?"
Answer: Interest Rate Factor exposure = 0.60 beta
→ If rates rise 2%, SpaceX valuation drops $96B (2% × 0.60 × $800B base)
```

**Key Difference:**
- **Greeks**: You're changing YOUR model assumption
- **Factors**: The MARKET is changing, affecting your valuation

---

## 🎯 **Why This Matters for SpaceX**

### **Scenario: Tech Sector Crash**

**Greeks View:**
```
"Should I change my Starlink penetration assumption?"
→ No, the model input hasn't changed
→ But valuation still drops because market factors moved
```

**Factors View:**
```
"Tech sector crashed 20%"
→ Factor exposure: 0.75 beta to tech growth
→ Valuation drops $120B due to market factor
→ This is SEPARATE from model inputs
```

**Combined View:**
```
Tech crash → Market factor impact: -$120B
BUT ALSO: Tech crash might reduce actual penetration
→ Model input (penetration) might need to change
→ Greeks impact: -$50B (if penetration drops 1%)
→ Total impact: -$170B (factor + Greeks)
```

---

## 📈 **Practical Framework**

### **Step 1: Identify What You Control**

**Model Inputs (Greeks):**
- ✅ Starlink Penetration
- ✅ Launch Volume
- ✅ First Colony Year
- ✅ Population Growth
- ✅ Price Decline Rates
- ✅ Discount Rate (your assumption)

**You can change these in the model.**

### **Step 2: Identify What You Don't Control**

**Market Factors (Barra Factors):**
- ❌ Tech sector performance
- ❌ Market volatility
- ❌ Interest rates (Fed policy)
- ❌ Aerospace industry trends
- ❌ Growth/value factor rotations
- ❌ Market sentiment

**You can only measure exposure, not control them.**

### **Step 3: Understand Interactions**

**Correlation Matters:**

```
High Correlation Example:
- Starlink penetration increases (Greeks: +$50B)
- Tech sector also grows (Factors: +$40B)
- → Combined impact: +$90B
- → Risk is concentrated (both move together)

Low Correlation Example:
- Mars colony delayed (Greeks: -$100B)
- Market factors unchanged (Factors: $0)
- → Total impact: -$100B
- → Risk is independent (model vs. market)
```

---

## 🔧 **How to Use This Framework**

### **For Model Validation (Greeks)**

```
Question: "Are my model inputs reasonable?"
→ Use Greeks to test sensitivity
→ "If penetration is 10% vs 20%, how much does valuation change?"
→ This validates your MODEL assumptions
```

### **For Risk Management (Factors)**

```
Question: "What market risks am I exposed to?"
→ Use Factors to measure market exposure
→ "If tech sector crashes, how much do I lose?"
→ This measures MARKET risk
```

### **For Combined Analysis**

```
Question: "What's my total risk?"
→ Greeks: Model risk from input uncertainty
→ Factors: Market risk from systematic exposure
→ Combined: Total risk = Model Risk + Market Risk - Correlation
```

---

## 📊 **Visual Framework**

```
┌─────────────────────────────────────────────────────────┐
│              SPACEX RISK ANALYSIS                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  MODEL INPUTS (Greeks)                                  │
│  ──────────────────────                                  │
│  • Starlink Penetration: 15%                            │
│    → Delta: +$50B per 1%                                │
│                                                          │
│  • Launch Volume: 150/year                             │
│    → Delta: +$2.5B per launch                           │
│                                                          │
│  • First Colony Year: 2030                              │
│    → Theta: -$100B per year delay                       │
│                                                          │
│  Question: "What if I change these?"                    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  MARKET FACTORS (Barra Factors)                         │
│  ────────────────────────────                            │
│  • Tech Growth Factor: 0.75 beta                        │
│    → If tech drops 20%: -$120B                          │
│                                                          │
│  • Market Volatility: 0.60 beta                         │
│    → If vol spikes 10%: -$48B                           │
│                                                          │
│  • Interest Rate Factor: 0.60 beta                       │
│    → If rates rise 2%: -$96B                           │
│                                                          │
│  Question: "What if the market changes?"               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎓 **Key Insights**

### **1. Different Questions**

- **Greeks**: "What if **I** change my assumption?"
- **Factors**: "What if **the market** changes?"

### **2. Different Uses**

- **Greeks**: Model validation, sensitivity analysis, scenario planning
- **Factors**: Risk management, portfolio context, hedging

### **3. Both Are Needed**

- **Greeks** tell you about your MODEL
- **Factors** tell you about MARKET exposure
- **Together** they tell you about TOTAL risk

### **4. Correlation Matters**

- If Greeks and Factors are correlated → concentrated risk
- If they're independent → diversified risk
- Measure correlation to understand total risk

---

## 🚀 **Next Steps**

1. **Keep using Greeks** ✅ (already implemented)
   - Test model input sensitivity
   - Validate assumptions
   - Scenario planning

2. **Add Factor Analysis** (new)
   - Measure market factor exposure
   - Understand systematic risk
   - Portfolio context

3. **Combine Both**
   - Total risk decomposition
   - Correlation analysis
   - Comprehensive risk view

---

## 💡 **The Bottom Line**

**Greeks** = "What if **Starlink penetration changes**?" (your model input)  
**Factors** = "What if **tech sector crashes**?" (market factor)

**Both matter. Both are used. Both tell you different things about risk.**





