/**
 * Mach33Lib - Financial Greeks Calculation Library
 * 
 * Default implementation using Finite Difference Method
 * Supports extensible library selection through settings
 */

class Mach33Lib {
  constructor(options = {}) {
    this.method = options.method || 'finite-difference'; // Default method
    this.bumpSizes = options.bumpSizes || {
      percentage: 0.01,      // 1% for percentage inputs
      absolute: 1,            // 1 unit for absolute inputs
      time: 1,                // 1 year for time-based inputs
      volatility: 0.01,       // 1% for volatility
      rate: 0.001            // 0.1% for discount rate
    };
    this.useCentralDifference = options.useCentralDifference !== false; // Default: true (more accurate)
  }

  /**
   * Calculate Delta (first-order sensitivity)
   * Delta = ∂V/∂S = change in valuation per unit change in input
   */
  async calculateDelta(valuationFn, inputPath, inputValue, inputType = 'percentage') {
    const bumpSize = this.getBumpSize(inputType);
    
    // Debug logging
    console.log(`[Mach33Lib] Calculating Delta for ${inputPath}:`, {
      inputValue,
      bumpSize,
      inputType,
      useCentralDifference: this.useCentralDifference
    });
    
    if (this.useCentralDifference) {
      // Central difference: more accurate, requires two calculations
      const vUp = await valuationFn(inputPath, inputValue + bumpSize);
      const vDown = await valuationFn(inputPath, inputValue - bumpSize);
      const delta = {
        total: (vUp.total - vDown.total) / (2 * bumpSize),
        earth: (vUp.earth - vDown.earth) / (2 * bumpSize),
        mars: (vUp.mars - vDown.mars) / (2 * bumpSize)
      };
      console.log(`[Mach33Lib] Delta (central):`, {
        vUp: vUp.total,
        vDown: vDown.total,
        difference: vUp.total - vDown.total,
        bumpSize,
        delta: delta.total
      });
      return delta;
    } else {
      // Forward difference: faster, requires one calculation
      const vBase = await valuationFn(inputPath, inputValue);
      const vUp = await valuationFn(inputPath, inputValue + bumpSize);
      const delta = {
        total: (vUp.total - vBase.total) / bumpSize,
        earth: (vUp.earth - vBase.earth) / bumpSize,
        mars: (vUp.mars - vBase.mars) / bumpSize
      };
      console.log(`[Mach33Lib] Delta (forward):`, {
        vBase: vBase.total,
        vUp: vUp.total,
        difference: vUp.total - vBase.total,
        bumpSize,
        delta: delta.total
      });
      return delta;
    }
  }

  /**
   * Calculate Gamma (second-order sensitivity/convexity)
   * Gamma = ∂²V/∂S² = rate of change of Delta
   */
  async calculateGamma(valuationFn, inputPath, inputValue, inputType = 'percentage') {
    const bumpSize = this.getBumpSize(inputType);
    
    const vBase = await valuationFn(inputPath, inputValue);
    const vUp = await valuationFn(inputPath, inputValue + bumpSize);
    const vDown = await valuationFn(inputPath, inputValue - bumpSize);
    
    return {
      total: (vUp.total - 2 * vBase.total + vDown.total) / (bumpSize ** 2),
      earth: (vUp.earth - 2 * vBase.earth + vDown.earth) / (bumpSize ** 2),
      mars: (vUp.mars - 2 * vBase.mars + vDown.mars) / (bumpSize ** 2)
    };
  }

  /**
   * Calculate Vega (volatility sensitivity)
   * Vega = ∂V/∂σ = change in valuation per 1% change in volatility
   */
  async calculateVega(valuationFn, baseVolatility = 0.2) {
    const bumpSize = this.bumpSizes.volatility;
    
    const vBase = await valuationFn('volatility', baseVolatility);
    const vUp = await valuationFn('volatility', baseVolatility + bumpSize);
    
    return {
      total: (vUp.total - vBase.total) / bumpSize,
      earth: (vUp.earth - vBase.earth) / bumpSize,
      mars: (vUp.mars - vBase.mars) / bumpSize
    };
  }

  /**
   * Calculate Theta (time decay)
   * Theta = ∂V/∂t = change in valuation per unit time
   */
  async calculateTheta(valuationFn, currentTime, timeType = 'years') {
    const bumpSize = this.bumpSizes.time;
    
    const vBase = await valuationFn('time', currentTime);
    const vUp = await valuationFn('time', currentTime + bumpSize);
    
    return {
      total: (vUp.total - vBase.total) / bumpSize,
      earth: (vUp.earth - vBase.earth) / bumpSize,
      mars: (vUp.mars - vBase.mars) / bumpSize
    };
  }

  /**
   * Calculate Rho (discount rate sensitivity)
   * Rho = ∂V/∂r = change in valuation per 1% change in discount rate
   */
  async calculateRho(valuationFn, baseRate) {
    const bumpSize = this.bumpSizes.rate;
    
    if (this.useCentralDifference) {
      const vUp = await valuationFn('discountRate', baseRate + bumpSize);
      const vDown = await valuationFn('discountRate', baseRate - bumpSize);
      return {
        total: (vUp.total - vDown.total) / (2 * bumpSize),
        earth: (vUp.earth - vDown.earth) / (2 * bumpSize),
        mars: (vUp.mars - vDown.mars) / (2 * bumpSize)
      };
    } else {
      const vBase = await valuationFn('discountRate', baseRate);
      const vUp = await valuationFn('discountRate', baseRate + bumpSize);
      return {
        total: (vUp.total - vBase.total) / bumpSize,
        earth: (vUp.earth - vBase.earth) / bumpSize,
        mars: (vUp.mars - vBase.mars) / bumpSize
      };
    }
  }

  /**
   * Get appropriate bump size based on input type
   */
  getBumpSize(inputType) {
    switch (inputType) {
      case 'percentage':
        return this.bumpSizes.percentage;
      case 'absolute':
        return this.bumpSizes.absolute;
      case 'time':
        return this.bumpSizes.time;
      case 'volatility':
        return this.bumpSizes.volatility;
      case 'rate':
        return this.bumpSizes.rate;
      default:
        return this.bumpSizes.percentage;
    }
  }

  /**
   * Calculate all Greeks for a set of inputs
   * valuationFn can be async or sync
   */
  async calculateAllGreeks(valuationFn, inputs) {
    const greeks = {
      earth: {
        delta: {},
        gamma: {},
        vega: {},
        rho: {}
      },
      mars: {
        delta: {},
        gamma: {},
        vega: {},
        theta: {},
        rho: {}
      },
      total: {
        delta: {},
        gamma: {},
        vega: {},
        theta: {},
        rho: {}
      }
    };

    // Inputs to test
    const inputsToTest = [
      { path: 'earth.starlinkPenetration', label: 'Starlink Penetration', type: 'percentage', value: inputs.earth?.starlinkPenetration },
      { path: 'earth.launchVolume', label: 'Launch Volume', type: 'absolute', value: inputs.earth?.launchVolume },
      { path: 'mars.firstColonyYear', label: 'Colony Year', type: 'time', value: inputs.mars?.firstColonyYear },
      { path: 'mars.populationGrowth', label: 'Population Growth', type: 'percentage', value: inputs.mars?.populationGrowth },
      { path: 'financial.discountRate', label: 'Discount Rate', type: 'rate', value: inputs.financial?.discountRate }
    ];

    // Calculate Delta and Gamma for each input
    for (const { path, label, type, value } of inputsToTest) {
      if (value === undefined || value === null) continue;

      const delta = await this.calculateDelta(valuationFn, path, value, type);
      const gamma = await this.calculateGamma(valuationFn, path, value, type);

      // Determine which component (earth/mars/total)
      if (path.startsWith('earth.')) {
        greeks.earth.delta[label] = { value: delta.earth, unit: this.getUnit(type, 'delta') };
        greeks.earth.gamma[label] = { value: gamma.earth, unit: this.getUnit(type, 'gamma') };
      } else if (path.startsWith('mars.')) {
        greeks.mars.delta[label] = { value: delta.mars, unit: this.getUnit(type, 'delta') };
        greeks.mars.gamma[label] = { value: gamma.mars, unit: this.getUnit(type, 'gamma') };
      }

      greeks.total.delta[label] = { value: delta.total, unit: this.getUnit(type, 'delta') };
      greeks.total.gamma[label] = { value: gamma.total, unit: this.getUnit(type, 'gamma') };
    }

    // Calculate Vega (overall volatility)
    const vega = await this.calculateVega(valuationFn);
    greeks.earth.vega['Overall Volatility'] = { value: vega.earth, unit: '$B/%vol' };
    greeks.mars.vega['Overall Volatility'] = { value: vega.mars, unit: '$B/%vol' };
    greeks.total.vega['Overall Volatility'] = { value: vega.total, unit: '$B/%vol' };

    // Calculate Theta (time decay - only for Mars)
    if (inputs.mars?.firstColonyYear) {
      const theta = await this.calculateTheta(valuationFn, inputs.mars.firstColonyYear);
      greeks.mars.theta['Time Decay'] = { value: theta.mars, unit: '$B/year' };
      greeks.total.theta['Time Decay'] = { value: theta.total, unit: '$B/year' };
    }

    // Calculate Rho (discount rate sensitivity)
    if (inputs.financial?.discountRate) {
      const rho = await this.calculateRho(valuationFn, inputs.financial.discountRate);
      greeks.earth.rho['Discount Rate'] = { value: rho.earth, unit: '$B/%' };
      greeks.mars.rho['Discount Rate'] = { value: rho.mars, unit: '$B/%' };
      greeks.total.rho['Discount Rate'] = { value: rho.total, unit: '$B/%' };
    }

    return greeks;
  }

  /**
   * Get unit string for Greek
   */
  getUnit(inputType, greekType) {
    const units = {
      percentage: { delta: '$B/%', gamma: '$B/%²' },
      absolute: { delta: '$B/unit', gamma: '$B/unit²' },
      time: { delta: '$B/year', gamma: '$B/year²' },
      rate: { delta: '$B/%', gamma: '$B/%²' }
    };
    return units[inputType]?.[greekType] || '$B/unit';
  }

  /**
   * Set calculation method
   */
  setMethod(method) {
    this.method = method;
    // Future: switch between different library implementations
  }

  /**
   * Update bump sizes
   */
  updateBumpSizes(bumpSizes) {
    this.bumpSizes = { ...this.bumpSizes, ...bumpSizes };
  }

  /**
   * Set central difference preference
   */
  setUseCentralDifference(use) {
    this.useCentralDifference = use;
  }
}

// Export for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Mach33Lib;
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.Mach33Lib = Mach33Lib;
}

