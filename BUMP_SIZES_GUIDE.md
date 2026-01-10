# Mach33Lib Bump Sizes Guide

## What Each Bump Size Controls

### 1. **Percentage Inputs (0.01 = 1%)**
**Controls:** Starlink Penetration, Population Growth, Discount Rate

**Default:** 0.01 (1%)

**What it does:**
- Tests valuation at `input + 1%` and `input - 1%`
- Calculates Delta = (V_up - V_down) / (2 × 0.01)

**When to change:**
- **Decrease to 0.005 (0.5%)** if:
  - Results seem unstable or jump around
  - You want more precision
  - Model is very smooth/linear
  
- **Increase to 0.02 (2%)** if:
  - Results seem too sensitive
  - Model has noise/discontinuities
  - You want more stable results

**Expected impact:**
- **Smaller bump (0.5%)**: More accurate Delta, but may be more sensitive to numerical noise
- **Larger bump (2%)**: More stable, but less accurate (approximation error increases)

---

### 2. **Absolute Inputs (1 unit)**
**Controls:** Launch Volume (launches/year)

**Default:** 1 launch

**What it does:**
- Tests valuation at `launchVolume + 1` and `launchVolume - 1`
- Calculates Delta = (V_up - V_down) / (2 × 1)

**When to change:**
- **Decrease to 0.5** if:
  - Launch volume is small (< 50 launches/year)
  - You want finer granularity
  
- **Increase to 5 or 10** if:
  - Launch volume is large (> 200 launches/year)
  - 1 launch change is too small to measure accurately

**Expected impact:**
- **Smaller bump (0.5)**: More precise for small volumes
- **Larger bump (5-10)**: Better for large volumes, smoother results

---

### 3. **Time Inputs (1 year)**
**Controls:** Colony Year (Mars first colony year)

**Default:** 1 year

**What it does:**
- Tests valuation at `colonyYear - 1` and `colonyYear + 1`
- Calculates Delta = (V_earlier - V_later) / (2 × 1 year)

**When to change:**
- **Decrease to 0.5 years** if:
  - You want monthly/quarterly precision
  - Colony year is very close (within 5 years)
  
- **Increase to 2-5 years** if:
  - Colony year is far in future (> 20 years)
  - 1 year precision isn't meaningful

**Expected impact:**
- **Smaller bump (0.5 years)**: More precise Theta, better for near-term analysis
- **Larger bump (2-5 years)**: More stable for long-term projections

---

### 4. **Volatility (0.01 = 1%)**
**Controls:** Overall volatility sensitivity (Vega)

**Default:** 0.01 (1%)

**What it does:**
- Tests valuation at `volatility + 1%` and `volatility - 1%`
- Calculates Vega = (V_up - V_down) / (2 × 0.01)

**When to change:**
- **Decrease to 0.005 (0.5%)** if:
  - You want more precise volatility sensitivity
  - Volatility is low (< 20%)
  
- **Increase to 0.02 (2%)** if:
  - Volatility is high (> 40%)
  - Results seem unstable

**Expected impact:**
- **Smaller bump**: More accurate Vega for low volatility
- **Larger bump**: More stable for high volatility scenarios

---

### 5. **Discount Rate (0.001 = 0.1%)**
**Controls:** Discount rate sensitivity (Rho)

**Default:** 0.001 (0.1%)

**What it does:**
- Tests valuation at `discountRate + 0.1%` and `discountRate - 0.1%`
- Calculates Rho = (V_up - V_down) / (2 × 0.001)

**When to change:**
- **Decrease to 0.0005 (0.05%)** if:
  - Discount rate is low (< 10%)
  - You want very precise Rho
  
- **Increase to 0.002 (0.2%)** if:
  - Discount rate is high (> 15%)
  - 0.1% change is too small to measure

**Expected impact:**
- **Smaller bump**: More precise Rho, better for low rates
- **Larger bump**: More stable for high rates

---

## What to Expect When You Change Bump Sizes

### Scenario 1: Decrease All Bumps by 50%
**Change:** All bumps → half their current value

**Expected results:**
- ✅ More accurate Greeks (closer to true derivatives)
- ⚠️ May be more sensitive to numerical noise
- ⚠️ Results might fluctuate more
- ✅ Better for smooth, linear models

**Example:**
- Before: Delta = 500 $B/%
- After: Delta = 520 $B/% (more accurate, but may vary)

---

### Scenario 2: Increase All Bumps by 2x
**Change:** All bumps → double their current value

**Expected results:**
- ✅ More stable results (less noise)
- ⚠️ Less accurate (approximation error increases)
- ✅ Better for noisy/non-linear models
- ⚠️ May miss fine-grained sensitivity

**Example:**
- Before: Delta = 500 $B/%
- After: Delta = 480 $B/% (more stable, but less precise)

---

### Scenario 3: Change Only Percentage Bump
**Change:** Percentage bump from 1% → 0.5%

**Expected results:**
- Only affects: Starlink Penetration, Population Growth, Discount Rate Deltas
- Launch Volume and Colony Year Deltas unchanged
- More precise sensitivity for percentage inputs

---

## Recommended Settings by Use Case

### **High Precision Analysis**
```
Percentage: 0.005 (0.5%)
Absolute: 0.5 units
Time: 0.5 years
Volatility: 0.005 (0.5%)
Rate: 0.0005 (0.05%)
```
**Use when:** You need maximum accuracy, model is smooth

---

### **Standard Analysis (Default)**
```
Percentage: 0.01 (1%)
Absolute: 1 unit
Time: 1 year
Volatility: 0.01 (1%)
Rate: 0.001 (0.1%)
```
**Use when:** Balanced accuracy and stability

---

### **Stable/Noisy Models**
```
Percentage: 0.02 (2%)
Absolute: 5 units
Time: 2 years
Volatility: 0.02 (2%)
Rate: 0.002 (0.2%)
```
**Use when:** Model has discontinuities or noise

---

## How to Test Changes

1. **Note current Greeks values** (write them down)
2. **Change one bump size** (e.g., Percentage: 1% → 0.5%)
3. **Save settings**
4. **Recalculate Greeks**
5. **Compare results:**
   - Did values change significantly? (> 10% change = meaningful)
   - Are results more stable or more variable?
   - Do they make sense?

---

## Red Flags

**If Greeks values:**
- Jump around wildly → bump may be too small
- Don't change at all → bump may be too large
- Are negative when they should be positive → check model logic
- Are orders of magnitude wrong → check bump size units

---

## Best Practice Workflow

1. **Start with defaults** (1% for percentages, 1 unit for absolute)
2. **Calculate Greeks** and note values
3. **If results seem unstable:**
   - Increase bump sizes by 50%
   - Recalculate
   - Compare
4. **If results seem too coarse:**
   - Decrease bump sizes by 50%
   - Recalculate
   - Compare
5. **Fine-tune** until you find the sweet spot

---

## Expected Value Ranges (for reference)

**Delta (Starlink Penetration):** 400-600 $B/%
**Delta (Launch Volume):** 0.5-2 $B/launch
**Delta (Colony Year):** 0.5-2 $B/year
**Vega:** 50-150 $B/%vol
**Rho:** -500 to -800 $B/%

If your values are outside these ranges, consider adjusting bump sizes.





