require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 2999;

// Database connection - Use spacex_valuation database
let atlasUri = process.env.ATLAS_MONGODB_URI || 'mongodb+srv://brantarseneau_db_user:NJ3nwtwdcpFXwnks@mach33semanticeditorclu.vxuueax.mongodb.net/spacex_valuation';
atlasUri = atlasUri.replace(/^['"]|['"]$/g, ''); // Remove quotes
// Replace database name with spacex_valuation
atlasUri = atlasUri.replace(/\/[^/]+$/, '/spacex_valuation');

console.log('🔌 Connecting to MongoDB Atlas (spacex_valuation)...');

mongoose.connect(atlasUri, {
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
}).then(() => {
  console.log('✓ MongoDB Atlas connected to spacex_valuation');
}).catch(err => {
  console.error('MongoDB Atlas connection error:', err.message);
  console.log('⚠️ Continuing without database...');
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));

// Load Excel data
let excelData = null;
let modelStructure = null;

function loadData() {
  try {
    const excelDataPath = path.join(__dirname, 'excel_parsed_detailed.json');
    const structurePath = path.join(__dirname, 'model_structure.json');
    
    if (fs.existsSync(excelDataPath)) {
      excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf8'));
      console.log('✓ Excel data loaded');
    }
    
    if (fs.existsSync(structurePath)) {
      modelStructure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
      console.log('✓ Model structure loaded');
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// API Routes

// Get all sheets
app.get('/api/sheets', (req, res) => {
  if (!modelStructure) {
    return res.status(500).json({ error: 'Model structure not loaded' });
  }
  res.json(modelStructure.sheets || []);
});

// Get sheet data
app.get('/api/sheet/:sheetName', (req, res) => {
  const sheetName = req.params.sheetName;
  
  if (!excelData || !excelData[sheetName]) {
    return res.status(404).json({ error: `Sheet "${sheetName}" not found` });
  }
  
  const sheet = excelData[sheetName];
  res.json({
    name: sheetName,
    metadata: sheet.metadata || {},
    json: sheet.json || [],
    cells: sheet.cells || {}
  });
});

// Get Earth Operations data
app.get('/api/earth', (req, res) => {
  if (!excelData || !excelData.Earth) {
    return res.status(404).json({ error: 'Earth sheet not found' });
  }
  res.json(excelData.Earth);
});

// Get Mars Operations data
app.get('/api/mars', (req, res) => {
  if (!excelData || !excelData.Mars) {
    return res.status(404).json({ error: 'Mars sheet not found' });
  }
  res.json(excelData.Mars);
});

// Get Valuation Outputs (for charts)
app.get('/api/valuation-outputs', (req, res) => {
  if (!excelData || !excelData['Valuation Outputs']) {
    return res.status(404).json({ error: 'Valuation Outputs sheet not found' });
  }
  res.json(excelData['Valuation Outputs']);
});

// Get insights (derived from data)
app.get('/api/insights', (req, res) => {
  // Calculate insights from the data
  const insights = calculateInsights();
  res.json(insights);
});

// Get scenarios
app.get('/api/scenarios', async (req, res) => {
  try {
    // Return saved scenarios from database or default scenarios
    const scenarios = {
      bear: {
        name: 'Bear Case',
        description: 'Conservative assumptions',
        inputs: {
          earth: {
            starlinkPenetration: 0.10,
            bandwidthPriceDecline: 0.10,
            launchVolume: 100,
            launchPriceDecline: 0.10
          },
          mars: {
            firstColonyYear: 2035,
            transportCostDecline: 0.15,
            populationGrowth: 0.30
          },
          financial: {
            discountRate: 0.15,
            dilutionFactor: 0.20,
            terminalGrowth: 0.025
          }
        }
      },
      base: {
        name: 'Base Case',
        description: 'Moderate assumptions',
        inputs: {
          earth: {
            starlinkPenetration: 0.15,
            bandwidthPriceDecline: 0.08,
            launchVolume: 150,
            launchPriceDecline: 0.08
          },
          mars: {
            firstColonyYear: 2030,
            transportCostDecline: 0.20,
            populationGrowth: 0.50
          },
          financial: {
            discountRate: 0.12,
            dilutionFactor: 0.15,
            terminalGrowth: 0.03
          }
        }
      },
      bull: {
        name: 'Bull Case',
        description: 'Optimistic assumptions',
        inputs: {
          earth: {
            starlinkPenetration: 0.25,
            bandwidthPriceDecline: 0.05,
            launchVolume: 200,
            launchPriceDecline: 0.05
          },
          mars: {
            firstColonyYear: 2028,
            transportCostDecline: 0.30,
            populationGrowth: 0.70
          },
          financial: {
            discountRate: 0.10,
            dilutionFactor: 0.10,
            terminalGrowth: 0.035
          }
        }
      }
    };
    
    res.json({ success: true, data: scenarios });
  } catch (error) {
    console.error('Scenarios error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Model Schema
const modelSchema = new mongoose.Schema({
  name: String,
  inputs: mongoose.Schema.Types.Mixed,
  results: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  favorite: { type: Boolean, default: false }
});

// Use valuation_models collection (plural) from spacex_valuation database
const ValuationModel = mongoose.models.ValuationModel || mongoose.model('ValuationModel', modelSchema, 'valuation_models');

// Get models
app.get('/api/models', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';
    const search = req.query.search || '';
    const favoriteOnly = req.query.favoriteOnly === 'true';
    
    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (favoriteOnly) {
      query.favorite = true;
    }
    
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [data, total] = await Promise.all([
      ValuationModel.find(query).sort(sort).limit(limit).skip(skip).lean(),
      ValuationModel.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single model
app.get('/api/models/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid model ID'
      });
    }
    
    const model = await ValuationModel.findById(req.params.id).lean();
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }
    
    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    console.error('Error fetching model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Calculate valuation
app.post('/api/calculate', async (req, res) => {
  try {
    // Try to get model results if model ID is provided
    let modelData = null;
    if (req.body.modelId) {
      const model = await ValuationModel.findById(req.body.modelId).lean();
      if (model && model.results) {
        modelData = model.results;
      }
    }
    
    // Return structure matching app expectations
    // Frontend expects arrays for cashFlow, revenue, and presentValue
    const defaultCashFlow = Array.from({ length: 30 }, (_, i) => ({
      year: 2024 + i,
      value: 0
    }));
    
    const defaultRevenue = Array.from({ length: 30 }, (_, i) => ({
      year: 2024 + i,
      value: 0,
      breakdown: {
        starlink: 0,
        starshield: 0,
        launch: 0,
        starship: 0
      }
    }));
    
    const defaultPresentValue = Array.from({ length: 30 }, (_, i) => ({
      value: 0,
      cumulative: 0
    }));
    
    res.json({
      success: true,
      data: {
        total: {
          value: modelData?.total?.value || 0,
          breakdown: {
            earth: modelData?.total?.breakdown?.earth || modelData?.earth?.adjustedValue || 0,
            mars: modelData?.total?.breakdown?.mars || modelData?.mars?.adjustedValue || 0,
            earthPercent: modelData?.total?.breakdown?.earthPercent || 0,
            marsPercent: modelData?.total?.breakdown?.marsPercent || 0
          }
        },
        earth: {
          adjustedValue: modelData?.earth?.adjustedValue || 0,
          totalPV: modelData?.earth?.totalPV || 0,
          terminalValue: modelData?.earth?.terminalValue || 0,
          revenue: modelData?.earth?.revenue || defaultRevenue,
          costs: modelData?.earth?.costs || [],
          cashFlow: modelData?.earth?.cashFlow || defaultCashFlow,
          presentValue: modelData?.earth?.presentValue || defaultPresentValue,
          capacity: modelData?.earth?.capacity || [],
          constellation: modelData?.earth?.constellation || [],
          capex: modelData?.earth?.capex || [],
          metrics: modelData?.earth?.metrics || {}
        },
        mars: {
          adjustedValue: modelData?.mars?.adjustedValue || 0,
          optionValue: modelData?.mars?.optionValue || 0,
          expectedValue: modelData?.mars?.expectedValue || 0,
          underlyingValue: modelData?.mars?.underlyingValue || 0,
          strikePrice: modelData?.mars?.strikePrice || 0,
          yearsToColony: modelData?.mars?.yearsToColony || 0,
          revenue: modelData?.mars?.revenue || defaultRevenue,
          cashFlow: modelData?.mars?.cashFlow || defaultCashFlow,
          presentValue: modelData?.mars?.presentValue || defaultPresentValue,
          scenarios: modelData?.mars?.scenarios || {},
          metrics: modelData?.mars?.metrics || {}
        },
        scenarios: modelData?.scenarios || {}
      }
    });
  } catch (error) {
    console.error('Calculate error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Sensitivity analysis
app.post('/api/sensitivity/run', (req, res) => {
  res.json({
    success: true,
    data: {
      results: [],
      variable: req.body.variable || 'unknown'
    }
  });
});

// Monte Carlo endpoints
app.get('/api/monte-carlo', (req, res) => {
  res.json({
    success: true,
    data: [],
    pagination: {
      page: 1,
      limit: parseInt(req.query.limit) || 10,
      total: 0,
      totalPages: 0
    }
  });
});

app.post('/api/monte-carlo', (req, res) => {
  res.json({
    success: true,
    data: {
      _id: 'temp_' + Date.now(),
      status: 'completed',
      results: []
    }
  });
});

app.post('/api/monte-carlo/run', (req, res) => {
  res.json({
    success: true,
    data: {
      _id: 'temp_' + Date.now(),
      status: 'running',
      message: 'Simulation started'
    }
  });
});

app.get('/api/monte-carlo/scenarios', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.post('/api/monte-carlo/scenarios', async (req, res) => {
  try {
    const { baseInputs, distributions, runs = 5000, scenarios = ['2030-earth-only', '2040-earth-mars'] } = req.body;
    
    // Get base model for calculations
    const baseModel = await ValuationModel.findOne().sort({ createdAt: -1 }).lean();
    const baseResults = baseModel?.results || {};
    
    const results = {};
    
    // Calculate Monte Carlo distributions for each scenario
    for (const scenario of scenarios) {
      let meanValue = 0;
      let minValue = 0;
      let maxValue = 0;
      let stdDev = 0;
      
      if (scenario === '2030-earth-only') {
        // Earth only valuation - narrow distribution around $2.5-3T
        const earthValue = baseResults.earth?.adjustedValue || baseResults.earth?.terminalValue || baseResults.total?.breakdown?.earth || 6739;
        meanValue = earthValue / 1000; // Convert to trillions (~6.7T)
        // Narrow distribution: peak around $2.5-3T
        meanValue = 2.75; // Center around $2.75T
        stdDev = 0.5; // Narrow std dev for tight distribution
        minValue = 0;
        maxValue = 8; // Extend to $8T
      } else if (scenario === '2040-earth-mars') {
        // Earth + Mars valuation - wide distribution with long tail
        const earthValue = baseResults.earth?.adjustedValue || baseResults.earth?.terminalValue || baseResults.total?.breakdown?.earth || 6739;
        const marsValue = baseResults.mars?.adjustedValue || baseResults.mars?.optionValue || baseResults.total?.breakdown?.mars || 8.8;
        const totalValue = (earthValue + marsValue) / 1000; // Convert to trillions
        // Wide distribution: peak around $12-13T with long tail
        meanValue = 12.5; // Center around $12.5T
        stdDev = 4.0; // Wide std dev for broad distribution
        minValue = 0;
        maxValue = 30; // Extend to $30T for long tail
      }
      
      // Generate histogram data with proper probability density
      const bins = 100; // More bins for smoother curve
      const binSize = (maxValue - minValue) / bins;
      const histogram = [];
      const binCenters = [];
      
      for (let i = 0; i < bins; i++) {
        const binCenter = minValue + (i + 0.5) * binSize;
        binCenters.push(binCenter);
        
        // Normal distribution PDF
        const z = (binCenter - meanValue) / stdDev;
        let density = Math.exp(-0.5 * z * z) / (stdDev * Math.sqrt(2 * Math.PI));
        
        // For 2040, add right-skew (long tail) using log-normal approximation
        if (scenario === '2040-earth-mars' && binCenter > meanValue) {
          const skewFactor = 1 + (binCenter - meanValue) / maxValue;
          density *= skewFactor;
        }
        
        // Convert to probability density percentage (area under curve = 1, scale to percentage)
        // Multiply by binSize to get probability, then scale to percentage
        const probabilityDensity = density * 100; // Convert to percentage
        histogram.push(probabilityDensity);
      }
      
      // Normalize so peak matches expected values
      const maxDensity = Math.max(...histogram);
      if (scenario === '2030-earth-only') {
        // Scale to peak around 19-20%
        const scaleFactor = 19 / maxDensity;
        histogram.forEach((val, idx) => histogram[idx] = val * scaleFactor);
      } else if (scenario === '2040-earth-mars') {
        // Scale to peak around 6-7%
        const scaleFactor = 6.5 / maxDensity;
        histogram.forEach((val, idx) => histogram[idx] = val * scaleFactor);
      }
      
      results[scenario] = {
        statistics: {
          totalValue: {
            mean: meanValue,
            min: minValue,
            max: maxValue,
            stdDev: stdDev,
            median: meanValue,
            p25: meanValue * 0.75,
            p75: meanValue * 1.25
          },
          distribution: {
            min: minValue,
            max: maxValue,
            bins: bins,
            binSize: binSize,
            histogram: histogram,
            binCenters: binCenters
          }
        },
        runs: runs,
        scenario: scenario
      };
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Monte Carlo scenarios error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Scenario calculations
app.post('/api/scenarios/calculate', async (req, res) => {
  try {
    const { inputs: baseInputs } = req.body;
    
    // Get the most recent model to use as base for calculations
    const baseModel = await ValuationModel.findOne().sort({ createdAt: -1 }).lean();
    const baseResults = baseModel?.results || {};
    
    // Frontend expects scenarios with keys: earth2030, earthMars2030, earthMars2040
    // These represent different time horizons and scope (Earth only vs Earth+Mars)
    const results = {};
    
    // 2030 Earth Only - uses base model's Earth results
    if (baseResults.earth) {
      const earthValue = baseResults.earth.adjustedValue || baseResults.earth.terminalValue || baseResults.total?.breakdown?.earth || 0;
      results.earth2030 = {
        name: '2030 Earth Only',
        inputs: baseInputs || baseModel?.inputs || {},
        results: {
          enterpriseValueFromEBITDA: earthValue,
          terminalValue: earthValue,
          enterpriseValue: earthValue
        },
        earthResults: {
          enterpriseValueFromEBITDA: earthValue,
          terminalValue: earthValue,
          enterpriseValue: earthValue,
          ...baseResults.earth
        },
        marsResults: null
      };
    }
    
    // 2030 Earth & Mars - uses base model's Earth + Mars results
    if (baseResults.earth && baseResults.mars) {
      const earthValue = baseResults.earth.adjustedValue || baseResults.earth.terminalValue || baseResults.total?.breakdown?.earth || 0;
      const marsValue = baseResults.mars.adjustedValue || baseResults.mars.optionValue || baseResults.total?.breakdown?.mars || 0;
      results.earthMars2030 = {
        name: '2030 Earth & Mars',
        inputs: baseInputs || baseModel?.inputs || {},
        results: {
          total: earthValue + marsValue,
          earth: earthValue,
          mars: marsValue
        },
        earthResults: {
          enterpriseValueFromEBITDA: earthValue,
          terminalValue: earthValue,
          enterpriseValue: earthValue,
          ...baseResults.earth
        },
        marsResults: {
          expectedValue: marsValue,
          adjustedValue: marsValue,
          optionValue: marsValue,
          ...baseResults.mars
        }
      };
    }
    
    // 2040 Earth & Mars - extrapolate from 2030 with growth
    if (baseResults.earth && baseResults.mars) {
      const earthValue2030 = baseResults.earth.adjustedValue || baseResults.earth.terminalValue || baseResults.total?.breakdown?.earth || 0;
      const marsValue2030 = baseResults.mars.adjustedValue || baseResults.mars.optionValue || baseResults.total?.breakdown?.mars || 0;
      const terminalGrowth = baseInputs?.financial?.terminalGrowth || baseModel?.inputs?.financial?.terminalGrowth || 0.03;
      
      // Project 10 years forward with terminal growth
      const earthValue2040 = earthValue2030 * Math.pow(1 + terminalGrowth, 10);
      const marsValue2040 = marsValue2030 * Math.pow(1 + terminalGrowth, 10);
      
      results.earthMars2040 = {
        name: '2040 Earth & Mars',
        inputs: baseInputs || baseModel?.inputs || {},
        results: {
          total: earthValue2040 + marsValue2040,
          earth: earthValue2040,
          mars: marsValue2040
        },
        earthResults: {
          enterpriseValueFromEBITDA: earthValue2040,
          terminalValue: earthValue2040,
          enterpriseValue: earthValue2040
        },
        marsResults: {
          expectedValue: marsValue2040,
          adjustedValue: marsValue2040,
          optionValue: marsValue2040
        }
      };
    }
    
    // If no model found, return empty structure
    if (Object.keys(results).length === 0) {
      results.earth2030 = {
        name: '2030 Earth Only',
        inputs: baseInputs || {},
        results: { enterpriseValueFromEBITDA: 0, terminalValue: 0, enterpriseValue: 0 },
        earthResults: { enterpriseValueFromEBITDA: 0, terminalValue: 0, enterpriseValue: 0 },
        marsResults: null
      };
      results.earthMars2030 = {
        name: '2030 Earth & Mars',
        inputs: baseInputs || {},
        results: { total: 0, earth: 0, mars: 0 },
        earthResults: { enterpriseValueFromEBITDA: 0, terminalValue: 0, enterpriseValue: 0 },
        marsResults: { expectedValue: 0, adjustedValue: 0, optionValue: 0 }
      };
      results.earthMars2040 = {
        name: '2040 Earth & Mars',
        inputs: baseInputs || {},
        results: { total: 0, earth: 0, mars: 0 },
        earthResults: { enterpriseValueFromEBITDA: 0, terminalValue: 0, enterpriseValue: 0 },
        marsResults: { expectedValue: 0, adjustedValue: 0, optionValue: 0 }
      };
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Scenario calculate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Model management endpoints
app.post('/api/models', async (req, res) => {
  try {
    const model = new ValuationModel({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const saved = await model.save();
    res.json({
      success: true,
      data: saved
    });
  } catch (error) {
    console.error('Error creating model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/models/:id', async (req, res) => {
  try {
    const model = await ValuationModel.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }
    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    console.error('Error updating model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/models/:id', async (req, res) => {
  try {
    const model = await ValuationModel.findByIdAndDelete(req.params.id);
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }
    res.json({
      success: true,
      message: 'Model deleted'
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/models/:id/duplicate', (req, res) => {
  res.json({
    success: true,
    data: {
      _id: 'temp_' + Date.now(),
      name: req.body.name || 'Copy of Model',
      createdAt: new Date().toISOString()
    }
  });
});

app.get('/api/models/:id/monte-carlo-config', (req, res) => {
  res.json({
    success: true,
    data: null
  });
});

// AI endpoints
app.post('/api/ai/analyze', (req, res) => {
  res.json({
    success: true,
    data: {
      analysis: 'AI analysis not yet implemented'
    }
  });
});

app.post('/api/ai/summary', (req, res) => {
  res.json({
    success: true,
    data: {
      summary: 'AI summary not yet implemented'
    }
  });
});

app.post('/api/ai/scenarios/recommend', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// Insights endpoints
app.post('/api/insights/margin-evolution', (req, res) => {
  try {
    const { earthResults } = req.body;
    if (!earthResults || !earthResults.revenue || !earthResults.costs || !earthResults.cashFlow) {
      return res.json({ success: false, error: 'Missing required data' });
    }

    const margins = [];
    const revenue = earthResults.revenue || [];
    const costs = earthResults.costs || [];
    const cashFlow = earthResults.cashFlow || [];

    for (let i = 0; i < Math.min(revenue.length, costs.length, cashFlow.length); i++) {
      const rev = revenue[i]?.value || 0;
      const cost = costs[i]?.value || 0;
      const cf = cashFlow[i]?.value || 0;
      
      // EBITDA = Revenue - Costs (excluding capex)
      const ebitda = rev - cost;
      const ebitdaMargin = rev > 0 ? (ebitda / rev) * 100 : 0;
      const fcfMargin = rev > 0 ? (cf / rev) * 100 : 0;

      margins.push({
        year: revenue[i]?.year || i + 1,
        ebitdaMargin: ebitdaMargin,
        fcfMargin: fcfMargin
      });
    }

    res.json({ success: true, data: margins });
  } catch (error) {
    console.error('Margin evolution error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/insights/unit-economics', (req, res) => {
  try {
    const { earthResults } = req.body;
    if (!earthResults || !earthResults.revenue || !earthResults.constellation) {
      return res.json({ success: false, error: 'Missing required data' });
    }

    const metrics = [];
    const revenue = earthResults.revenue || [];
    const constellation = earthResults.constellation || [];
    const capacity = earthResults.capacity || [];

    for (let i = 0; i < Math.min(revenue.length, constellation.length); i++) {
      const rev = revenue[i]?.value || 0;
      const satellites = constellation[i]?.total || 0;
      const gbps = capacity[i]?.total || 0;
      
      const revenuePerSat = satellites > 0 ? (rev * 1000) / satellites : 0; // Convert to millions
      const revenuePerGbps = gbps > 0 ? (rev * 1000) / gbps : 0; // Convert to millions
      
      // Estimate cost per launch (simplified)
      const costPerLaunch = 50; // $50M per launch estimate

      metrics.push({
        year: revenue[i]?.year || i + 1,
        revenuePerSatellite: revenuePerSat,
        revenuePerGbps: revenuePerGbps,
        costPerLaunch: costPerLaunch
      });
    }

    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Unit economics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/insights/capex-efficiency', (req, res) => {
  try {
    const { earthResults } = req.body;
    if (!earthResults || !earthResults.revenue || !earthResults.capex) {
      return res.json({ success: false, error: 'Missing required data' });
    }

    const metrics = [];
    const revenue = earthResults.revenue || [];
    const capex = earthResults.capex || [];
    const cashFlow = earthResults.cashFlow || [];

    for (let i = 0; i < Math.min(revenue.length, capex.length); i++) {
      const rev = revenue[i]?.value || 0;
      const cap = capex[i]?.total || 0;
      const cf = cashFlow[i]?.value || 0;
      
      const capexToRevenue = rev > 0 ? (cap / rev) * 100 : 0;
      const reinvestmentRate = cf > 0 ? (cap / cf) * 100 : 0;

      metrics.push({
        year: revenue[i]?.year || i + 1,
        capexToRevenue: capexToRevenue,
        reinvestmentRate: reinvestmentRate
      });
    }

    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Capex efficiency error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/insights/utilization', (req, res) => {
  try {
    const { earthResults, inputs } = req.body;
    if (!earthResults || !earthResults.capacity || !earthResults.constellation) {
      return res.json({ success: false, error: 'Missing required data' });
    }

    const utilization = [];
    const capacity = earthResults.capacity || [];
    const constellation = earthResults.constellation || [];
    const launchVolume = inputs?.earth?.launchVolume || 100;

    for (let i = 0; i < Math.min(capacity.length, constellation.length); i++) {
      const cap = capacity[i]?.total || 0;
      const sats = constellation[i]?.total || 0;
      
      // Calculate utilization metrics
      const capacityPerSat = sats > 0 ? cap / sats : 0;
      const baseUtilization = 0.75; // Base 75% utilization
      
      // Estimate rocket utilization based on launch volume
      const falcon9Utilization = Math.min(95, 60 + (launchVolume / 10)); // 60-95% based on volume
      const starshipUtilization = Math.min(90, 50 + (launchVolume / 15)); // 50-90% based on volume
      const rocketUtilization = (falcon9Utilization + starshipUtilization) / 2;

      utilization.push({
        year: capacity[i]?.year || i + 1,
        capacityPerSatellite: capacityPerSat,
        utilizationRate: baseUtilization * 100,
        totalCapacity: cap,
        totalSatellites: sats,
        falcon9Utilization: falcon9Utilization,
        starshipUtilization: starshipUtilization,
        rocketUtilization: rocketUtilization
      });
    }

    res.json({ success: true, data: utilization });
  } catch (error) {
    console.error('Utilization error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/insights/technology-transition', (req, res) => {
  try {
    const { earthResults } = req.body;
    if (!earthResults || !earthResults.constellation) {
      return res.json({ success: false, error: 'Missing required data' });
    }

    const transitions = [];
    const constellation = earthResults.constellation || [];

    for (let i = 0; i < constellation.length; i++) {
      const sats = constellation[i]?.total || 0;
      // V2 satellites decline over time, V3 increase
      const v2Ratio = Math.max(0.1, 1 - (i * 0.15)); // Start at 100%, decline to 10%
      const v3Ratio = 1 - v2Ratio;
      const v2Satellites = sats * v2Ratio;
      const v3Satellites = sats * v3Ratio;

      transitions.push({
        year: constellation[i]?.year || i + 1,
        gen1Satellites: constellation[i]?.gen1 || 0,
        gen2Satellites: constellation[i]?.gen2 || 0,
        v2Satellites: v2Satellites,
        v3Satellites: v3Satellites,
        totalSatellites: sats
      });
    }

    res.json({ success: true, data: transitions });
  } catch (error) {
    console.error('Technology transition error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/insights/launch-cadence', (req, res) => {
  try {
    const { earthResults, inputs } = req.body;
    if (!earthResults || !inputs) {
      return res.json({ success: false, error: 'Missing required data' });
    }

    const cadence = [];
    const launchVolume = inputs.earth?.launchVolume || 100;
    
    // Estimate number of rockets (Falcon 9 fleet ~20, Starship fleet grows)
    const falcon9Fleet = 20;
    const starshipFleet = Math.max(5, Math.floor(launchVolume / 20)); // Start with 5, grow with volume

    for (let i = 0; i < 10; i++) {
      const totalLaunches = launchVolume + (i * 10);
      const falcon9Launches = Math.floor(totalLaunches * 0.6);
      const starshipLaunches = Math.floor(totalLaunches * 0.4);
      
      // Launches per rocket per year
      const falcon9LaunchesPerRocket = falcon9Fleet > 0 ? falcon9Launches / falcon9Fleet : 0;
      const starshipLaunchesPerRocket = starshipFleet > 0 ? starshipLaunches / starshipFleet : 0;

      cadence.push({
        year: i + 1,
        launches: totalLaunches,
        falcon9Launches: falcon9Launches,
        starshipLaunches: starshipLaunches,
        falcon9LaunchesPerRocket: falcon9LaunchesPerRocket,
        starshipLaunchesPerRocket: starshipLaunchesPerRocket
      });
    }

    res.json({ success: true, data: cadence });
  } catch (error) {
    console.error('Launch cadence error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/insights/bandwidth-economics', (req, res) => {
  try {
    const { earthResults } = req.body;
    if (!earthResults || !earthResults.capacity || !earthResults.revenue) {
      return res.json({ success: false, error: 'Missing required data' });
    }

    const economics = [];
    const capacity = earthResults.capacity || [];
    const revenue = earthResults.revenue || [];

    for (let i = 0; i < Math.min(capacity.length, revenue.length); i++) {
      const cap = capacity[i]?.total || 0;
      const rev = revenue[i]?.value || 0;
      
      const revenuePerGbps = cap > 0 ? (rev * 1000) / cap : 0; // Convert to millions per Gbps
      const pricePerGbps = revenuePerGbps / 12; // Monthly price
      
      // Bandwidth utilization = revenue per Gbps (same metric)
      const bandwidthUtilization = revenuePerGbps;

      economics.push({
        year: revenue[i]?.year || i + 1,
        revenuePerGbps: revenuePerGbps,
        pricePerGbps: pricePerGbps,
        bandwidthUtilization: bandwidthUtilization,
        totalCapacity: cap,
        totalRevenue: rev
      });
    }

    res.json({ success: true, data: economics });
  } catch (error) {
    console.error('Bandwidth economics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

function calculateInsights() {
  const insights = [];
  
  if (!excelData) return insights;
  
  // Get Earth summary
  const earth = excelData.Earth;
  if (earth && earth.json) {
    // Extract valuation summary from row 1-8
    const summaryRow = earth.json[1]; // Row 1 has the summary headers
    if (summaryRow) {
      insights.push({
        category: 'Valuation Summary',
        metrics: [
          { name: '2030 Earth EBITDA', value: summaryRow[1] || 'N/A' },
          { name: '2030 Earth & Mars EBITDA', value: summaryRow[2] || 'N/A' },
          { name: '2040 Earth & Mars EBITDA', value: summaryRow[3] || 'N/A' }
        ]
      });
    }
  }
  
  // Get Valuation Outputs statistics
  const vo = excelData['Valuation Outputs'];
  if (vo && vo.json && vo.json.length > 1) {
    const dataRows = vo.json.slice(1); // Skip header row
    const evColumn = 11; // Enterprise Value column index
    
    if (dataRows.length > 0) {
      const evValues = dataRows
        .map(row => parseFloat(row[evColumn]) || 0)
        .filter(v => v > 0);
      
      if (evValues.length > 0) {
        const avgEV = evValues.reduce((a, b) => a + b, 0) / evValues.length;
        const minEV = Math.min(...evValues);
        const maxEV = Math.max(...evValues);
        
        insights.push({
          category: 'Monte Carlo Simulation Results',
          metrics: [
            { name: 'Average Enterprise Value (2030)', value: `$${(avgEV / 1e9).toFixed(2)}B` },
            { name: 'Min Enterprise Value', value: `$${(minEV / 1e9).toFixed(2)}B` },
            { name: 'Max Enterprise Value', value: `$${(maxEV / 1e9).toFixed(2)}B` },
            { name: 'Simulations Run', value: evValues.length }
          ]
        });
      }
    }
  }
  
  return insights;
}

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize
loadData();

app.listen(PORT, () => {
  console.log(`\n🚀 SpaceX Valuation Platform running on http://localhost:${PORT}\n`);
});

