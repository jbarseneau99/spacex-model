# Monte Carlo Simulation - Where It Fits

## 🎯 **The Missing Piece**

You're absolutely right - **Monte Carlo simulation is the core of the model**, but it's **not implemented yet**!

---

## 📊 **How Monte Carlo Works in the Spreadsheet**

### 1. **Valuation Outputs Sheet** (5,000 Simulation Runs)

The spreadsheet has a **"Valuation Outputs"** sheet with **5,000 rows** (rows 7-5006):
- **Column M** (rows 7-5006): Earth valuation results for each run
- **Column BZ** (rows 7-5006): Mars valuation results for each run
- Each row = **one Monte Carlo iteration**

### 2. **How Each Run Works**

For each of the 5,000 iterations:

1. **Random Input Generation**: 
   - Vary inputs randomly based on probability distributions
   - Examples:
     - Starlink Penetration: Normal distribution (mean=15%, std=3%)
     - Launch Volume: Normal distribution (mean=150, std=20)
     - First Colony Year: Uniform distribution (2028-2035)
     - Population Growth: Normal distribution (mean=15%, std=2%)

2. **Calculate Valuation** (using our algorithms):
   - Run `calculateEarthValuation()` with random inputs
   - Run `calculateMarsValuation()` with random inputs
   - Store results in Valuation Outputs sheet

3. **Repeat 5,000 times**

### 3. **Statistics Calculation**

After all 5,000 runs, calculate statistics:

**From "Valuation Inputs & Logic" sheet:**
```excel
=QUARTILE('Valuation Outputs'!$M$7:$M$5006,1)  // 25th percentile (Q1)
=AVERAGE('Valuation Outputs'!$M$7:$M$5006)      // Mean
=QUARTILE('Valuation Outputs'!$M$7:$M$5006,3)   // 75th percentile (Q3)
```

**For Mars:**
```excel
=QUARTILE('Valuation Outputs'!$BZ$7:$BZ$5006,1)  // Q1
=AVERAGE('Valuation Outputs'!$BZ$7:$BZ$5006)      // Mean
=QUARTILE('Valuation Outputs'!$BZ$7:$BZ$5006,3)   // Q3
```

---

## 🔧 **Current State**

### ✅ **What We Have:**

1. **Deterministic Algorithms** (`valuation-algorithms.js`):
   - `calculateEarthValuation()` - Calculates Earth value for given inputs
   - `calculateMarsValuation()` - Calculates Mars value for given inputs
   - `calculateMarsOptionValue()` - Calculates option value

2. **Placeholder Endpoints** (`server.js`):
   - `/api/monte-carlo` - Returns empty data
   - `/api/monte-carlo/run` - Placeholder
   - `/api/monte-carlo/scenarios` - Has some logic but doesn't actually run simulations

### ❌ **What's Missing:**

1. **Monte Carlo Engine**:
   - Input distribution definitions
   - Random number generation
   - Loop to run 5,000 iterations
   - Store results for each iteration
   - Calculate statistics from results

2. **Integration**:
   - Connect Monte Carlo engine to our algorithms
   - Use algorithms for each iteration calculation
   - Store results in database or return as JSON

---

## 🏗️ **How It Should Work**

### **Monte Carlo Flow:**

```
1. Define Input Distributions
   ├─ Starlink Penetration: Normal(μ=0.15, σ=0.03)
   ├─ Launch Volume: Normal(μ=150, σ=20)
   ├─ First Colony Year: Uniform(2028, 2035)
   └─ Population Growth: Normal(μ=0.15, σ=0.02)

2. For each iteration (1 to 5,000):
   ├─ Generate random inputs from distributions
   ├─ Run calculateEarthValuation(randomInputs)
   ├─ Run calculateMarsValuation(randomInputs)
   └─ Store results: { iteration: i, earth: value, mars: value }

3. Calculate Statistics:
   ├─ Mean, Median, Std Dev
   ├─ Quartiles (Q1, Q2, Q3)
   ├─ Percentiles (10th, 90th)
   └─ Distribution histogram

4. Return Results:
   ├─ All 5,000 individual results
   ├─ Statistics summary
   └─ Distribution charts data
```

---

## 💡 **The Relationship**

**Algorithms = Deterministic Calculation Engine**
- Given specific inputs → Returns specific output
- Used **inside** each Monte Carlo iteration

**Monte Carlo = Probabilistic Framework**
- Runs algorithms **5,000 times** with random inputs
- Generates probability distribution of outcomes
- Shows uncertainty and risk

**Example:**

```javascript
// Single deterministic calculation
const earthValue = algorithms.calculateEarthValuation('base');
// Returns: 6739.234 (billions)

// Monte Carlo: Run 5,000 times
const results = [];
for (let i = 0; i < 5000; i++) {
  // Generate random inputs
  const randomPenetration = normalRandom(0.15, 0.03);
  const randomLaunchVolume = normalRandom(150, 20);
  
  // Calculate with random inputs
  const earthValue = algorithms.calculateEarthValuation({
    starlinkPenetration: randomPenetration,
    launchVolume: randomLaunchVolume
  });
  
  results.push(earthValue);
}

// Calculate statistics
const mean = results.reduce((a, b) => a + b) / results.length;
const q1 = quartile(results, 0.25);
const q3 = quartile(results, 0.75);
```

---

## 🚀 **What Needs to Be Built**

### **1. Monte Carlo Engine** (`monte-carlo-engine.js`)

```javascript
class MonteCarloEngine {
  constructor(algorithms) {
    this.algorithms = algorithms;
  }
  
  // Define input distributions
  defineDistributions() {
    return {
      starlinkPenetration: { type: 'normal', mean: 0.15, std: 0.03 },
      launchVolume: { type: 'normal', mean: 150, std: 20 },
      firstColonyYear: { type: 'uniform', min: 2028, max: 2035 },
      populationGrowth: { type: 'normal', mean: 0.15, std: 0.02 }
    };
  }
  
  // Generate random value from distribution
  generateRandom(distribution) {
    // Implementation for normal, uniform, etc.
  }
  
  // Run single iteration
  runIteration(iterationNumber) {
    const inputs = this.generateRandomInputs();
    const earthValue = this.algorithms.calculateEarthValuation(inputs);
    const marsValue = this.algorithms.calculateMarsValuation(inputs);
    return { iteration: iterationNumber, earth: earthValue, mars: marsValue };
  }
  
  // Run full simulation
  async runSimulation(runs = 5000) {
    const results = [];
    for (let i = 0; i < runs; i++) {
      results.push(this.runIteration(i + 1));
    }
    return this.calculateStatistics(results);
  }
  
  // Calculate statistics
  calculateStatistics(results) {
    return {
      earth: {
        mean: mean(results.map(r => r.earth)),
        q1: quartile(results.map(r => r.earth), 0.25),
        q3: quartile(results.map(r => r.earth), 0.75),
        // ... more stats
      },
      mars: {
        // ... same for Mars
      }
    };
  }
}
```

### **2. Update Algorithms to Accept Inputs**

Currently, algorithms read from spreadsheet. We need to:

```javascript
calculateEarthValuation(scenario = 'base', customInputs = null) {
  // If customInputs provided, use those
  // Otherwise, read from spreadsheet
}
```

### **3. Integration Endpoint**

```javascript
app.post('/api/monte-carlo/run', async (req, res) => {
  const { runs = 5000, distributions } = req.body;
  
  const engine = new MonteCarloEngine(valuationAlgorithms);
  const results = await engine.runSimulation(runs);
  
  res.json({ success: true, data: results });
});
```

---

## 📈 **Why Monte Carlo Matters**

1. **Uncertainty Quantification**: Shows range of possible outcomes
2. **Risk Analysis**: Identifies worst-case and best-case scenarios
3. **Probability Distributions**: Shows likelihood of different valuations
4. **Sensitivity**: Reveals which inputs drive most uncertainty

**Without Monte Carlo**: Single point estimate (e.g., $6.7T)  
**With Monte Carlo**: Distribution (e.g., 25th percentile=$5.2T, mean=$6.7T, 75th percentile=$8.1T)

---

## ✅ **Next Steps**

1. **Build Monte Carlo Engine** (`monte-carlo-engine.js`)
2. **Update Algorithms** to accept custom inputs
3. **Add Statistics Functions** (quartile, percentile, etc.)
4. **Integrate** with existing endpoints
5. **Test** against spreadsheet results

**The algorithms are the engine - Monte Carlo is the framework that runs it 5,000 times!**





