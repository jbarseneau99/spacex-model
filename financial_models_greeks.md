# Financial Models for Greeks Calculation

## Recommended Approaches

### 1. **Finite Difference Method** (Recommended - Most Practical)
**Best for:** Real-time Greeks calculation with existing valuation function

**Method:**
- Bump each input variable up and down by small amounts
- Calculate valuation at each bumped value
- Use numerical derivatives to compute Greeks

**Advantages:**
- Works with any valuation function (Excel model, Monte Carlo, etc.)
- Fast and accurate
- Industry standard approach
- Easy to implement

**Formulas:**
```
Delta (forward difference):  Δ = (V(S+ΔS) - V(S)) / ΔS
Delta (central difference):  Δ = (V(S+ΔS) - V(S-ΔS)) / (2×ΔS)  [More accurate]

Gamma:  Γ = (V(S+ΔS) - 2V(S) + V(S-ΔS)) / ΔS²

Vega:   ν = (V(σ+Δσ) - V(σ)) / Δσ

Theta:  Θ = (V(t+Δt) - V(t)) / Δt

Rho:    ρ = (V(r+Δr) - V(r)) / Δr
```

**Implementation:**
```javascript
// Use your existing calculateValuation function
// Bump inputs, recalculate, measure change
```

---

### 2. **Monte Carlo-Based Greeks** (Most Accurate)
**Best for:** When you already have Monte Carlo infrastructure (which you do!)

**Method:**
- Run Monte Carlo simulations with bumped inputs
- Compare distributions to calculate Greeks
- Use statistical methods (regression, correlation) for sensitivity

**Advantages:**
- Most accurate for complex models
- Captures non-linearities and interactions
- Provides confidence intervals
- Uses your existing Monte Carlo system

**Implementation:**
```javascript
// Run MC with base inputs → get base distribution
// Run MC with bumped inputs → get bumped distribution
// Delta = (mean(bumped) - mean(base)) / bumpSize
// Gamma = (variance(bumped) - variance(base)) / bumpSize²
```

---

### 3. **Sensitivity Analysis Regression** (Good for Multiple Inputs)
**Best for:** Understanding interactions between variables

**Method:**
- Run multiple Monte Carlo simulations with different input combinations
- Use regression analysis to estimate sensitivities
- Can capture cross-Greeks (e.g., how Delta changes with volatility)

**Advantages:**
- Captures variable interactions
- Can estimate higher-order effects
- Provides statistical significance

---

### 4. **Pathwise Greeks** (Advanced - For Monte Carlo)
**Best for:** Efficient Greeks from single Monte Carlo run

**Method:**
- Calculate Greeks along each simulation path
- Average across all paths
- More efficient than bump-and-revalue

**Advantages:**
- Single MC run gives all Greeks
- Very efficient
- More complex to implement

---

## Recommended Implementation Plan

### Phase 1: Finite Difference Method (Start Here)
1. Create a `calculateValuationWithInputs(inputs)` function that:
   - Takes modified inputs
   - Runs valuation calculation
   - Returns Earth, Mars, and Total values

2. For each Greek:
   - Calculate base valuation
   - Bump input up → calculate V_up
   - Bump input down → calculate V_down
   - Use central difference: `Greek = (V_up - V_down) / (2 × bumpSize)`

3. For Gamma (second derivative):
   - Use: `Gamma = (V_up - 2V_base + V_down) / bumpSize²`

### Phase 2: Monte Carlo Greeks (More Accurate)
1. Extend your existing Monte Carlo system:
   - Add `runMonteCarloWithBumpedInputs(inputPath, bumpAmount)`
   - Run base MC → get base distribution
   - Run bumped MC → get bumped distribution
   - Calculate Greeks from distribution changes

2. For each Greek:
   - Delta = (mean(bumped) - mean(base)) / bumpSize
   - Gamma = (std(bumped) - std(base)) / bumpSize  [measures convexity]
   - Vega = Run MC with increased volatility → measure change

### Phase 3: Advanced Features
- Cross-Greeks (e.g., Vanna = ∂Delta/∂Volatility)
- Greeks over time (term structure)
- Greeks by scenario (stress testing)

---

## Bump Sizes (Industry Standards)

**Percentage inputs (penetration, growth, rates):**
- Small bump: 0.1% (0.001)
- Standard bump: 1% (0.01)
- Large bump: 5% (0.05)

**Absolute inputs (launch volume, years):**
- Small bump: 1 unit
- Standard bump: 5-10 units
- Large bump: 20 units

**Volatility (for Vega):**
- Standard bump: 1% (0.01)

**Time (for Theta):**
- Standard bump: 1 year (365 days)

**Discount Rate (for Rho):**
- Standard bump: 0.1% (0.001) or 1% (0.01)

---

## Code Structure Recommendation

```javascript
// Greeks calculation service
class GreeksCalculator {
  constructor(valuationFunction) {
    this.calculateValuation = valuationFunction;
  }
  
  // Finite difference method
  calculateDelta(inputPath, bumpSize) {
    const base = this.calculateValuation();
    const bumped = this.calculateValuationWithBump(inputPath, bumpSize);
    return (bumped.total - base.total) / bumpSize;
  }
  
  // Central difference (more accurate)
  calculateDeltaCentral(inputPath, bumpSize) {
    const base = this.calculateValuation();
    const up = this.calculateValuationWithBump(inputPath, bumpSize);
    const down = this.calculateValuationWithBump(inputPath, -bumpSize);
    return (up.total - down.total) / (2 * bumpSize);
  }
  
  calculateGamma(inputPath, bumpSize) {
    const base = this.calculateValuation();
    const up = this.calculateValuationWithBump(inputPath, bumpSize);
    const down = this.calculateValuationWithBump(inputPath, -bumpSize);
    return (up.total - 2 * base.total + down.total) / (bumpSize ** 2);
  }
  
  // Monte Carlo based (more accurate)
  async calculateDeltaMC(inputPath, bumpSize, mcRuns = 1000) {
    const baseMC = await this.runMonteCarlo(mcRuns);
    const bumpedMC = await this.runMonteCarloWithBump(inputPath, bumpSize, mcRuns);
    return (bumpedMC.mean - baseMC.mean) / bumpSize;
  }
}
```

---

## Which Method Should You Use?

**Start with Finite Difference** because:
- ✅ Fastest to implement
- ✅ Works with your current valuation function
- ✅ Industry standard
- ✅ Good accuracy for most use cases

**Upgrade to Monte Carlo Greeks** when:
- ✅ You need higher accuracy
- ✅ Model has significant non-linearities
- ✅ You want confidence intervals
- ✅ You already have MC infrastructure (you do!)

---

## Next Steps

1. **Implement Finite Difference Method** - Replace hardcoded multipliers
2. **Test with your Excel model** - Ensure valuations match
3. **Add Monte Carlo Greeks** - For higher accuracy
4. **Add caching** - Store Greeks to avoid recalculation
5. **Add Greeks visualization** - Show how Greeks change over time





