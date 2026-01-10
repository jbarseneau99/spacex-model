/**
 * Factor Risk Models Service
 * 
 * Supports multiple factor models:
 * - Fama-French 3-Factor (open source, default)
 * - Fama-French 5-Factor (open source)
 * - Barra-style (framework, requires factor data)
 * - Custom factor models
 */

class FactorModelsService {
  constructor() {
    this.models = {
      'fama-french-3': {
        name: 'Fama-French 3-Factor',
        description: 'Market, Size, Value factors',
        factors: ['Market', 'Size', 'Value'],
        source: 'open-source',
        dataSource: 'kenneth-french'
      },
      'fama-french-5': {
        name: 'Fama-French 5-Factor',
        description: 'Market, Size, Value, Profitability, Investment',
        factors: ['Market', 'Size', 'Value', 'Profitability', 'Investment'],
        source: 'open-source',
        dataSource: 'kenneth-french'
      },
      'barra-style': {
        name: 'Barra-Style Multi-Factor',
        description: 'Style, Industry, Country factors (framework)',
        factors: [
          // Style factors
          'Growth', 'Size', 'Value', 'Momentum', 'Volatility', 'Leverage',
          // Industry factors
          'Tech', 'Aerospace', 'Telecommunications',
          // Country factors
          'US Market'
        ],
        source: 'framework',
        dataSource: 'custom'
      },
      'custom': {
        name: 'Custom Factor Model',
        description: 'User-defined factors',
        factors: [],
        source: 'custom',
        dataSource: 'user-provided'
      }
    };
  }

  /**
   * Get available factor models
   */
  getAvailableModels() {
    return Object.keys(this.models).map(key => ({
      id: key,
      ...this.models[key]
    }));
  }

  /**
   * Get factor exposures for SpaceX
   * This calculates how SpaceX valuation correlates with each factor
   */
  async calculateFactorExposures(modelId, valuationData, marketData = null) {
    const model = this.models[modelId];
    if (!model) {
      throw new Error(`Unknown factor model: ${modelId}`);
    }

    switch (modelId) {
      case 'fama-french-3':
        return this.calculateFamaFrench3(valuationData, marketData);
      case 'fama-french-5':
        return this.calculateFamaFrench5(valuationData, marketData);
      case 'barra-style':
        return this.calculateBarraStyle(valuationData, marketData);
      case 'custom':
        return this.calculateCustom(valuationData, marketData);
      default:
        throw new Error(`Unsupported model: ${modelId}`);
    }
  }

  /**
   * Fama-French 3-Factor Model
   * Factors: Market, Size (SMB), Value (HML)
   */
  async calculateFamaFrench3(valuationData, marketData) {
    // For SpaceX, estimate exposures based on characteristics
    // In production, this would use historical returns regression
    
    const exposures = {
      Market: 1.2,        // High beta to market (tech growth stock)
      Size: -0.3,         // Negative = small cap exposure (SpaceX is private but behaves like small cap)
      Value: -0.5         // Negative = growth stock (not value)
    };

    // Calculate factor contributions
    const contributions = this.calculateContributions(exposures, marketData);
    
    return {
      model: 'fama-french-3',
      exposures,
      contributions,
      totalFactorRisk: this.calculateTotalFactorRisk(exposures, marketData),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Fama-French 5-Factor Model
   * Adds: Profitability (RMW), Investment (CMA)
   */
  async calculateFamaFrench5(valuationData, marketData) {
    const exposures = {
      Market: 1.2,
      Size: -0.3,
      Value: -0.5,
      Profitability: 0.4,   // High profitability exposure
      Investment: -0.6     // Negative = aggressive investment (high capex)
    };

    const contributions = this.calculateContributions(exposures, marketData);
    
    return {
      model: 'fama-french-5',
      exposures,
      contributions,
      totalFactorRisk: this.calculateTotalFactorRisk(exposures, marketData),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Barra-Style Multi-Factor Model
   * Style, Industry, Country factors
   */
  async calculateBarraStyle(valuationData, marketData) {
    // Style factors
    const styleExposures = {
      Growth: 0.75,        // Strong growth exposure
      Size: -0.30,         // Small cap characteristics
      Value: -0.50,        // Growth, not value
      Momentum: 0.60,      // High momentum
      Volatility: 0.80,    // High volatility exposure
      Leverage: 0.40       // Moderate leverage
    };

    // Industry factors
    const industryExposures = {
      Tech: 0.85,          // Strong tech exposure
      Aerospace: 0.60,     // Aerospace exposure
      Telecommunications: 0.70  // Telecom exposure (Starlink)
    };

    // Country factors
    const countryExposures = {
      'US Market': 1.0     // US-based company
    };

    const exposures = {
      ...styleExposures,
      ...industryExposures,
      ...countryExposures
    };

    const contributions = this.calculateContributions(exposures, marketData);
    
    return {
      model: 'barra-style',
      exposures,
      contributions,
      styleExposures,
      industryExposures,
      countryExposures,
      totalFactorRisk: this.calculateTotalFactorRisk(exposures, marketData),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Custom factor model
   */
  async calculateCustom(valuationData, marketData) {
    // Placeholder for custom factors
    return {
      model: 'custom',
      exposures: {},
      contributions: {},
      totalFactorRisk: 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate factor contributions to risk
   */
  calculateContributions(exposures, marketData) {
    const contributions = {};
    
    // If market data provided, calculate actual contributions
    if (marketData && marketData.factorReturns) {
      for (const [factor, exposure] of Object.entries(exposures)) {
        const factorReturn = marketData.factorReturns[factor] || 0;
        const factorVolatility = marketData.factorVolatilities?.[factor] || 0.15;
        
        contributions[factor] = {
          exposure,
          contribution: exposure * factorVolatility,
          returnContribution: exposure * factorReturn,
          riskContribution: Math.abs(exposure) * factorVolatility
        };
      }
    } else {
      // Use default estimates
      const defaultVolatilities = {
        Market: 0.15,
        Size: 0.10,
        Value: 0.08,
        Growth: 0.12,
        Tech: 0.20,
        Aerospace: 0.15,
        'US Market': 0.15
      };

      for (const [factor, exposure] of Object.entries(exposures)) {
        const volatility = defaultVolatilities[factor] || 0.15;
        contributions[factor] = {
          exposure,
          contribution: exposure * volatility,
          riskContribution: Math.abs(exposure) * volatility
        };
      }
    }

    return contributions;
  }

  /**
   * Calculate total factor risk
   */
  calculateTotalFactorRisk(exposures, marketData) {
    const contributions = this.calculateContributions(exposures, marketData);
    
    // Sum of squared contributions (simplified)
    let totalRisk = 0;
    for (const contrib of Object.values(contributions)) {
      totalRisk += Math.pow(contrib.riskContribution || contrib.contribution || 0, 2);
    }
    
    return Math.sqrt(totalRisk);
  }

  /**
   * Calculate factor-adjusted Greeks
   * Adjusts Greeks for market factor exposure
   */
  calculateFactorAdjustedGreeks(greeks, factorExposures) {
    // Example: If penetration Delta correlates with Growth factor,
    // adjust Delta to remove factor-driven component
    
    const adjusted = {};
    
    for (const [input, greek] of Object.entries(greeks)) {
      // Estimate correlation with factors
      const factorCorrelation = this.estimateCorrelation(input, factorExposures);
      
      adjusted[input] = {
        raw: greek,
        factorAdjusted: greek * (1 - factorCorrelation),
        factorComponent: greek * factorCorrelation
      };
    }
    
    return adjusted;
  }

  /**
   * Estimate correlation between model input and factors
   */
  estimateCorrelation(input, factorExposures) {
    // Simplified correlation estimates
    const correlations = {
      'starlinkPenetration': 0.3,  // Correlates with Growth factor
      'discountRate': 0.4,          // Correlates with Market/Interest factors
      'launchVolume': 0.2,           // Lower correlation
      'firstColonyYear': 0.1         // Low correlation
    };
    
    return correlations[input] || 0.1;
  }

  /**
   * Stress test factor exposure
   */
  stressTestFactor(modelId, factorName, shock, baseValuation) {
    const model = this.models[modelId];
    if (!model) {
      throw new Error(`Unknown factor model: ${modelId}`);
    }

    // Calculate factor exposures
    return this.calculateFactorExposures(modelId, { valuation: baseValuation })
      .then(result => {
        const exposure = result.exposures[factorName] || 0;
        const impact = exposure * shock * baseValuation;
        
        return {
          factor: factorName,
          exposure,
          shock,
          impact,
          newValuation: baseValuation + impact
        };
      });
  }
}

module.exports = FactorModelsService;





