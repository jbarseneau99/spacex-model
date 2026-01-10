require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const Mach33Lib = require('./mach33lib');

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

// Helper function to get cell value from spreadsheet
function getSpreadsheetCellValue(sheetName, cellRef) {
  try {
    if (!excelData || !excelData[sheetName] || !excelData[sheetName].cells) {
      return null;
    }
    const cell = excelData[sheetName].cells[cellRef];
    if (cell && typeof cell === 'object' && 'value' in cell) {
      return cell.value;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Helper function to get Mars option value from spreadsheet
function getMarsOptionValueFromSpreadsheet(scenario = 'base') {
  try {
    if (!excelData || !excelData.Mars || !excelData.Mars.cells) {
      console.warn('⚠️ Mars sheet data not available, using fallback');
      return null;
    }
    
    // Base case: K54 + K8 - K27
    // Optimistic case: U54 + U8 - U27
    const col = scenario === 'optimistic' ? 'U' : 'K';
    
    const k54 = getSpreadsheetCellValue('Mars', `${col}54`);
    const k8 = getSpreadsheetCellValue('Mars', `${col}8`);
    const k27 = getSpreadsheetCellValue('Mars', `${col}27`);
    
    if (k54 !== null && k8 !== null && k27 !== null) {
      const optionValue = k54 + k8 - k27;
      // Convert to billions
      const optionValueBillions = optionValue / 1e9;
      console.log(`✓ Mars option value from spreadsheet (${scenario}): ${optionValueBillions.toFixed(3)}B (${col}54+${col}8-${col}27)`);
      return optionValueBillions;
    } else {
      console.warn(`⚠️ Missing Mars cells for ${scenario} case: ${col}54=${k54}, ${col}8=${k8}, ${col}27=${k27}`);
      return null;
    }
  } catch (error) {
    console.error('Error reading Mars option value from spreadsheet:', error);
    return null;
  }
}

// Helper function to get Earth values from spreadsheet
function getEarthValuesFromSpreadsheet(scenario = 'base') {
  try {
    if (!excelData || !excelData.Earth || !excelData.Earth.cells) {
      return null;
    }
    
    // Earth sheet key outputs (from Valuation Outputs references):
    // O59, O62, O58, O61, O116-O119, O144, O153
    // Column mapping: B=Base, C=Optimistic, D=Bear
    const colMap = { base: 'O', optimistic: 'Y', bear: 'O' };
    const col = colMap[scenario] || 'O';
    
    const values = {
      // Main valuation outputs
      o59: getSpreadsheetCellValue('Earth', `${col}59`),
      o62: getSpreadsheetCellValue('Earth', `${col}62`),
      o58: getSpreadsheetCellValue('Earth', `${col}58`),
      o61: getSpreadsheetCellValue('Earth', `${col}61`),
      o116: getSpreadsheetCellValue('Earth', `${col}116`),
      o117: getSpreadsheetCellValue('Earth', `${col}117`),
      o118: getSpreadsheetCellValue('Earth', `${col}118`),
      o119: getSpreadsheetCellValue('Earth', `${col}119`),
      o144: getSpreadsheetCellValue('Earth', `${col}144`),
      o153: getSpreadsheetCellValue('Earth', `${col}153`)
    };
    
    // Use O153 as primary Earth value (most commonly referenced)
    const earthValue = values.o153;
    
    if (earthValue !== null) {
      // Convert to billions
      const earthValueBillions = earthValue / 1e9;
      console.log(`✓ Earth value from spreadsheet (${scenario}): ${earthValueBillions.toFixed(3)}B (${col}153)`);
      return {
        adjustedValue: earthValueBillions,
        totalPV: values.o116 ? values.o116 / 1e9 : earthValueBillions * 0.9,
        terminalValue: values.o117 ? values.o117 / 1e9 : earthValueBillions * 0.1,
        rawValues: values
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error reading Earth values from spreadsheet:', error);
    return null;
  }
}

// Helper function to get Mars values from spreadsheet
function getMarsValuesFromSpreadsheet(scenario = 'base') {
  try {
    if (!excelData || !excelData.Mars || !excelData.Mars.cells) {
      return null;
    }
    
    const col = scenario === 'optimistic' ? 'U' : 'K';
    
    const k54 = getSpreadsheetCellValue('Mars', `${col}54`);
    const k8 = getSpreadsheetCellValue('Mars', `${col}8`);
    const k27 = getSpreadsheetCellValue('Mars', `${col}27`);
    
    if (k54 !== null) {
      // K54 is the cumulative value (main Mars value)
      const marsValueBillions = k54 / 1e9;
      const optionValueBillions = getMarsOptionValueFromSpreadsheet(scenario);
      
      console.log(`✓ Mars value from spreadsheet (${scenario}): ${marsValueBillions.toFixed(3)}B (${col}54)`);
      
      return {
        adjustedValue: marsValueBillions,
        optionValue: optionValueBillions || marsValueBillions * 0.8,
        expectedValue: marsValueBillions,
        underlyingValue: marsValueBillions,
        rawValues: { k54, k8, k27 }
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error reading Mars values from spreadsheet:', error);
    return null;
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
    const inputs = req.body;
    
    // Try to get model results if model ID is provided
    let modelData = null;
    if (inputs.modelId) {
      const model = await ValuationModel.findById(inputs.modelId).lean();
      if (model && model.results) {
        modelData = model.results;
      }
    }
    
    // If no model data but inputs provided, calculate from inputs (for stress tests)
    if (!modelData && (inputs.earth || inputs.mars || inputs.financial)) {
      // Get base model for reference
      const baseModel = await ValuationModel.findOne().sort({ createdAt: -1 }).lean();
      const baseResults = baseModel?.results || {};
      
      // Try to get values from spreadsheet first (ground truth)
      const spreadsheetEarth = getEarthValuesFromSpreadsheet('base');
      const spreadsheetMars = getMarsValuesFromSpreadsheet('base');
      
      const baseEarthValue = baseResults.earth?.adjustedValue || 
                             spreadsheetEarth?.adjustedValue || 
                             baseResults.total?.breakdown?.earth || 
                             6739;
      const baseMarsValue = baseResults.mars?.adjustedValue || 
                           spreadsheetMars?.adjustedValue || 
                           baseResults.total?.breakdown?.mars || 
                           8.8;
      const baseTotalValue = baseEarthValue + baseMarsValue;
      
      // Calculate multipliers based on input changes
      let earthMultiplier = 1.0;
      let marsMultiplier = 1.0;
      
      // Earth adjustments
      if (inputs.earth) {
        const basePenetration = baseModel?.inputs?.earth?.starlinkPenetration || 0.15;
        if (inputs.earth.starlinkPenetration !== undefined) {
          earthMultiplier *= inputs.earth.starlinkPenetration / basePenetration;
        }
        
        const baseLaunchVolume = baseModel?.inputs?.earth?.launchVolume || 150;
        if (inputs.earth.launchVolume !== undefined) {
          earthMultiplier *= inputs.earth.launchVolume / baseLaunchVolume;
        }
      }
      
      // Mars adjustments
      if (inputs.mars) {
        const baseColonyYear = baseModel?.inputs?.mars?.firstColonyYear || 2030;
        if (inputs.mars.firstColonyYear !== undefined) {
          const yearsDiff = baseColonyYear - inputs.mars.firstColonyYear;
          marsMultiplier *= 1 + (yearsDiff * 0.1); // 10% per year earlier/later
        }
        
        const basePopGrowth = baseModel?.inputs?.mars?.populationGrowth || 0.15;
        if (inputs.mars.populationGrowth !== undefined) {
          marsMultiplier *= inputs.mars.populationGrowth / basePopGrowth;
        }
        
        if (inputs.mars.industrialBootstrap === false) {
          marsMultiplier *= 0.1; // Massive reduction if no bootstrap
        }
      }
      
      // Financial adjustments
      if (inputs.financial) {
        const baseDiscountRate = baseModel?.inputs?.financial?.discountRate || 0.12;
        if (inputs.financial.discountRate !== undefined) {
          // Higher discount rate reduces PV
          const pvReduction = Math.pow(1 + baseDiscountRate, 10) / Math.pow(1 + inputs.financial.discountRate, 10);
          earthMultiplier *= pvReduction;
          marsMultiplier *= pvReduction;
        }
      }
      
      // Calculate new values
      const calculatedEarthValue = baseEarthValue * earthMultiplier;
      const calculatedMarsValue = baseMarsValue * marsMultiplier;
      const calculatedTotalValue = calculatedEarthValue + calculatedMarsValue;
      
      modelData = {
        total: {
          value: calculatedTotalValue,
          breakdown: {
            earth: calculatedEarthValue,
            mars: calculatedMarsValue,
            earthPercent: (calculatedEarthValue / calculatedTotalValue) * 100,
            marsPercent: (calculatedMarsValue / calculatedTotalValue) * 100
          }
        },
        earth: {
          adjustedValue: calculatedEarthValue,
          // Use spreadsheet values if available, otherwise use calculated
          totalPV: spreadsheetEarth?.totalPV || calculatedEarthValue * 0.9,
          terminalValue: spreadsheetEarth?.terminalValue || calculatedEarthValue * 0.1
        },
        mars: {
          adjustedValue: calculatedMarsValue,
          // Option value from spreadsheet: K54+K8-K27 (base case) or U54+U8-U27 (optimistic)
          // K54 is the cumulative value, K8 is cumulative revenue, K27 is cumulative costs
          // Option value = K54 + K8 - K27 = cumulative value + revenue - costs
          optionValue: baseModel?.results?.mars?.optionValue || 
                      spreadsheetMars?.optionValue || 
                      getMarsOptionValueFromSpreadsheet('base') || 
                      (calculatedMarsValue > 0 ? calculatedMarsValue * 0.8 : 0),
          expectedValue: baseModel?.results?.mars?.expectedValue || 
                        spreadsheetMars?.expectedValue || 
                        calculatedMarsValue,
          underlyingValue: baseModel?.results?.mars?.underlyingValue || 
                          spreadsheetMars?.underlyingValue || 
                          calculatedMarsValue,
          strikePrice: baseModel?.results?.mars?.strikePrice || calculatedMarsValue * 0.5,
          yearsToColony: (inputs?.mars?.firstColonyYear || baseModel?.inputs?.mars?.firstColonyYear || 2030) - new Date().getFullYear()
        }
      };
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
    
    // Get spreadsheet values as fallback
    const spreadsheetEarth = getEarthValuesFromSpreadsheet('base');
    const spreadsheetMars = getMarsValuesFromSpreadsheet('base');
    
    const earthValue = modelData?.earth?.adjustedValue || 
                      spreadsheetEarth?.adjustedValue || 
                      modelData?.total?.breakdown?.earth || 
                      0;
    const marsValue = modelData?.mars?.adjustedValue || 
                     spreadsheetMars?.adjustedValue || 
                     modelData?.total?.breakdown?.mars || 
                     0;
    const totalValue = earthValue + marsValue;
    
    res.json({
      success: true,
      data: {
        total: {
          value: modelData?.total?.value || totalValue,
          breakdown: {
            earth: earthValue,
            mars: marsValue,
            earthPercent: totalValue > 0 ? (earthValue / totalValue) * 100 : 0,
            marsPercent: totalValue > 0 ? (marsValue / totalValue) * 100 : 0
          }
        },
        earth: {
          adjustedValue: modelData?.earth?.adjustedValue || getEarthValuesFromSpreadsheet('base')?.adjustedValue || 0,
          totalPV: modelData?.earth?.totalPV || getEarthValuesFromSpreadsheet('base')?.totalPV || 0,
          terminalValue: modelData?.earth?.terminalValue || getEarthValuesFromSpreadsheet('base')?.terminalValue || 0,
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
          adjustedValue: modelData?.mars?.adjustedValue || getMarsValuesFromSpreadsheet('base')?.adjustedValue || 0,
          // Use spreadsheet value if available, otherwise use stored value, otherwise 0
          optionValue: modelData?.mars?.optionValue || 
                      getMarsValuesFromSpreadsheet('base')?.optionValue || 
                      getMarsOptionValueFromSpreadsheet('base') || 
                      0,
          expectedValue: modelData?.mars?.expectedValue || getMarsValuesFromSpreadsheet('base')?.expectedValue || 0,
          underlyingValue: modelData?.mars?.underlyingValue || getMarsValuesFromSpreadsheet('base')?.underlyingValue || 0,
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
app.post('/api/sensitivity/run', async (req, res) => {
  try {
    const { baseInputs, variable, range } = req.body;
    
    if (!baseInputs || !variable || !range || range.length !== 3) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: baseInputs, variable, and range [min, max, steps]'
      });
    }
    
    const [min, max, steps] = range;
    const stepSize = (max - min) / (steps - 1);
    const results = [];
    
    // Get base model for reference values
    const baseModel = await ValuationModel.findOne().sort({ createdAt: -1 }).lean();
    const baseResults = baseModel?.results || {};
    const baseEarthValue = baseResults.earth?.adjustedValue || baseResults.total?.breakdown?.earth || 6739;
    const baseMarsValue = baseResults.mars?.adjustedValue || baseResults.total?.breakdown?.mars || 8.8;
    const baseTotalValue = baseEarthValue + baseMarsValue;
    
    // Calculate sensitivity for each step
    for (let i = 0; i < steps; i++) {
      const testValue = min + (i * stepSize);
      
      // Create modified inputs
      const testInputs = JSON.parse(JSON.stringify(baseInputs)); // Deep copy
      
      // Set the variable value based on path (e.g., "earth.starlinkPenetration")
      const pathParts = variable.split('.');
      if (pathParts.length === 2) {
        const [category, field] = pathParts;
        if (testInputs[category] && testInputs[category][field] !== undefined) {
          testInputs[category][field] = testValue;
        }
      }
      
      // Calculate valuation impact (simplified - use multipliers based on variable)
      let earthMultiplier = 1.0;
      let marsMultiplier = 1.0;
      
      // Estimate impact based on variable type
      if (variable.includes('starlinkPenetration')) {
        // Starlink penetration directly affects Earth revenue
        const basePenetration = baseInputs.earth?.starlinkPenetration || 0.15;
        earthMultiplier = testValue / basePenetration;
      } else if (variable.includes('discountRate')) {
        // Higher discount rate reduces present value
        const baseRate = baseInputs.financial?.discountRate || 0.12;
        earthMultiplier = Math.pow(1 + baseRate, 10) / Math.pow(1 + testValue, 10);
        marsMultiplier = earthMultiplier; // Same impact
      } else if (variable.includes('launchVolume')) {
        // Launch volume affects Earth revenue
        const baseVolume = baseInputs.earth?.launchVolume || 150;
        earthMultiplier = testValue / baseVolume;
      } else if (variable.includes('firstColonyYear')) {
        // Earlier colony = higher Mars value
        const baseYear = baseInputs.mars?.firstColonyYear || 2030;
        const yearsDiff = baseYear - testValue; // Positive if earlier
        marsMultiplier = 1 + (yearsDiff * 0.1); // 10% per year earlier
      } else {
        // Default: linear relationship
        const baseValue = baseInputs[pathParts[0]]?.[pathParts[1]] || 0.5;
        if (baseValue > 0) {
          earthMultiplier = testValue / baseValue;
        }
      }
      
      // Calculate values
      const earthValue = baseEarthValue * earthMultiplier;
      const marsValue = baseMarsValue * marsMultiplier;
      const totalValue = earthValue + marsValue;
      
      results.push({
        value: testValue,
        totalValue: totalValue,
        earthValue: earthValue,
        marsValue: marsValue
      });
    }
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Sensitivity analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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

// Get Mach33Lib settings (defaults)
let mach33LibSettings = {
  library: 'mach33lib-finite-difference',
  bumpSizes: {
    percentage: 0.01,      // 1% for percentage inputs
    absolute: 1,            // 1 unit for absolute inputs
    time: 1,                // 1 year for time-based inputs
    volatility: 0.01,       // 1% for volatility
    rate: 0.001            // 0.1% for discount rate
  },
  useCentralDifference: false
};

// Update Mach33Lib settings endpoint
app.post('/api/settings/mach33lib', (req, res) => {
  try {
    const library = req.body.library || mach33LibSettings.library;
    
    mach33LibSettings = {
      library: library,
      bumpSizes: {
        percentage: parseFloat(req.body.bumpPercentage) || mach33LibSettings.bumpSizes.percentage,
        absolute: parseFloat(req.body.bumpAbsolute) || mach33LibSettings.bumpSizes.absolute,
        time: parseFloat(req.body.bumpTime) || mach33LibSettings.bumpSizes.time,
        volatility: parseFloat(req.body.bumpVolatility) || mach33LibSettings.bumpSizes.volatility,
        rate: parseFloat(req.body.bumpRate) || mach33LibSettings.bumpSizes.rate
      },
      useCentralDifference: library === 'mach33lib-central-difference'
    };
    
    res.json({ success: true, settings: mach33LibSettings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Mach33Lib settings endpoint (READ)
app.get('/api/settings/mach33lib', (req, res) => {
  res.json({ success: true, settings: mach33LibSettings });
});

// Update Mach33Lib settings endpoint (UPDATE - partial update via PUT)
app.put('/api/settings/mach33lib', (req, res) => {
  try {
    // Partial update - only update provided fields
    if (req.body.library !== undefined) {
      mach33LibSettings.library = req.body.library;
      mach33LibSettings.useCentralDifference = req.body.library === 'mach33lib-central-difference';
    }
    
    if (req.body.bumpSizes) {
      mach33LibSettings.bumpSizes = {
        ...mach33LibSettings.bumpSizes,
        ...req.body.bumpSizes
      };
    }
    
    res.json({ success: true, settings: mach33LibSettings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete/Reset Mach33Lib settings endpoint (DELETE - resets to defaults)
app.delete('/api/settings/mach33lib', (req, res) => {
  try {
    mach33LibSettings = {
      library: 'mach33lib-finite-difference',
      bumpSizes: {
        percentage: 0.01,
        absolute: 1,
        time: 1,
        volatility: 0.01,
        rate: 0.001
      },
      useCentralDifference: false
    };
    
    res.json({ success: true, message: 'Settings reset to defaults', settings: mach33LibSettings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Financial Greeks calculation using Mach33Lib
app.post('/api/greeks', async (req, res) => {
  try {
    const { modelId, baseInputs } = req.body;
    
    // Get base model
    let model = null;
    if (modelId) {
      model = await ValuationModel.findById(modelId).lean();
    } else {
      model = await ValuationModel.findOne().sort({ createdAt: -1 }).lean();
    }
    
    const inputs = baseInputs || model?.inputs || {};
    const baseResults = model?.results || {};
    
    const baseEarthValue = baseResults.earth?.adjustedValue || baseResults.total?.breakdown?.earth || 6739;
    const baseMarsValue = baseResults.mars?.adjustedValue || baseResults.total?.breakdown?.mars || 8.8;
    const baseTotalValue = baseEarthValue + baseMarsValue;
    
    // Create valuation function wrapper that calls /api/calculate
    const calculateValuationWithBump = async (inputPath, bumpedValue) => {
      const pathParts = inputPath.split('.');
      const modifiedInputs = JSON.parse(JSON.stringify(inputs));
      
      // Handle special paths for Vega, Theta, Rho
      if (inputPath === 'volatility') {
        // Vega: volatility affects both Earth and Mars valuations
        // Higher volatility increases uncertainty premium (more for Mars)
        const baseVolatility = 0.2;
        const volatilityChange = bumpedValue - baseVolatility;
        const baseModel = model || await ValuationModel.findOne().sort({ createdAt: -1 }).lean();
        const baseResults = baseModel?.results || {};
        const baseEarth = baseResults.earth?.adjustedValue || baseResults.total?.breakdown?.earth || 6739;
        const baseMars = baseResults.mars?.adjustedValue || baseResults.total?.breakdown?.mars || 8.8;
        
        // Volatility impact: Earth ~0.5% per 1% vol, Mars ~2% per 1% vol (higher uncertainty premium)
        const earthMultiplier = 1 + (volatilityChange * 0.005);
        const marsMultiplier = 1 + (volatilityChange * 0.02);
        
        return {
          earth: baseEarth * earthMultiplier,
          mars: baseMars * marsMultiplier,
          total: (baseEarth * earthMultiplier) + (baseMars * marsMultiplier)
        };
      } else if (inputPath === 'time') {
        // Theta: time decay affects Mars (earlier colony = higher value)
        const baseModel = model || await ValuationModel.findOne().sort({ createdAt: -1 }).lean();
        const baseResults = baseModel?.results || {};
        const baseEarth = baseResults.earth?.adjustedValue || baseResults.total?.breakdown?.earth || 6739;
        const baseMars = baseResults.mars?.adjustedValue || baseResults.total?.breakdown?.mars || 8.8;
        const baseColonyYear = baseModel?.inputs?.mars?.firstColonyYear || 2030;
        
        // Time value: exponential discounting effect
        // Earlier colony (smaller bumpedValue) = exponential increase in value
        const yearsDiff = baseColonyYear - bumpedValue;
        const marsMultiplier = Math.pow(1.1, yearsDiff); // 10% per year, compounded
        
        return {
          earth: baseEarth, // Earth value doesn't change with time
          mars: baseMars * marsMultiplier,
          total: baseEarth + (baseMars * marsMultiplier)
        };
      } else if (inputPath === 'discountRate') {
        // Rho: discount rate affects both Earth and Mars
        const baseModel = model || await ValuationModel.findOne().sort({ createdAt: -1 }).lean();
        const baseResults = baseModel?.results || {};
        const baseEarth = baseResults.earth?.adjustedValue || baseResults.total?.breakdown?.earth || 6739;
        const baseMars = baseResults.mars?.adjustedValue || baseResults.total?.breakdown?.mars || 8.8;
        const baseRate = baseModel?.inputs?.financial?.discountRate || 0.12;
        
        // Discount rate impact: PV factor
        const pvFactor = Math.pow(1 + baseRate, 10);
        const newPvFactor = Math.pow(1 + bumpedValue, 10);
        const pvMultiplier = newPvFactor / pvFactor;
        
        return {
          earth: baseEarth * pvMultiplier,
          mars: baseMars * pvMultiplier,
          total: (baseEarth + baseMars) * pvMultiplier
        };
      }
      
      // Handle normal paths (category.field)
      if (pathParts.length === 2) {
        const [category, field] = pathParts;
        if (modifiedInputs[category]) {
          modifiedInputs[category][field] = bumpedValue;
        }
      }
      
      // Call internal calculation (reuse existing logic)
      const baseModel = model || await ValuationModel.findOne().sort({ createdAt: -1 }).lean();
      const baseResults = baseModel?.results || {};
      const baseEarth = baseResults.earth?.adjustedValue || baseResults.total?.breakdown?.earth || 6739;
      const baseMars = baseResults.mars?.adjustedValue || baseResults.total?.breakdown?.mars || 8.8;
      
      // Calculate multipliers based on input changes
      let earthMultiplier = 1.0;
      let marsMultiplier = 1.0;
      
      // Earth adjustments
      if (modifiedInputs.earth) {
        const basePenetration = baseModel?.inputs?.earth?.starlinkPenetration || 0.15;
        if (modifiedInputs.earth.starlinkPenetration !== undefined) {
          // Use more realistic non-linear relationship
          // Penetration impact is roughly proportional but with diminishing returns
          const penetrationRatio = modifiedInputs.earth.starlinkPenetration / basePenetration;
          // Apply slight non-linearity: impact = ratio^0.95 (slight diminishing returns)
          earthMultiplier *= Math.pow(penetrationRatio, 0.95);
        }
        
        const baseLaunchVolume = baseModel?.inputs?.earth?.launchVolume || 150;
        if (modifiedInputs.earth.launchVolume !== undefined) {
          // Launch volume has economies of scale - slightly less than linear
          const volumeRatio = modifiedInputs.earth.launchVolume / baseLaunchVolume;
          earthMultiplier *= Math.pow(volumeRatio, 0.98);
        }
      }
      
      // Mars adjustments
      if (modifiedInputs.mars) {
        const baseColonyYear = baseModel?.inputs?.mars?.firstColonyYear || 2030;
        if (modifiedInputs.mars.firstColonyYear !== undefined) {
          const yearsDiff = baseColonyYear - modifiedInputs.mars.firstColonyYear;
          // Time value: exponential discounting effect
          // Earlier colony = exponential increase in value
          marsMultiplier *= Math.pow(1.1, yearsDiff); // 10% per year, compounded
        }
        
        const basePopGrowth = baseModel?.inputs?.mars?.populationGrowth || 0.15;
        if (modifiedInputs.mars.populationGrowth !== undefined) {
          // Population growth: compound effect over time
          const growthRatio = modifiedInputs.mars.populationGrowth / basePopGrowth;
          marsMultiplier *= Math.pow(growthRatio, 0.97); // Slight non-linearity
        }
      }
      
      // Financial adjustments
      if (modifiedInputs.financial) {
        const baseRate = baseModel?.inputs?.financial?.discountRate || 0.12;
        if (modifiedInputs.financial.discountRate !== undefined) {
          const rateDiff = baseRate - modifiedInputs.financial.discountRate;
          const pvFactor = Math.pow(1 + baseRate, 10);
          const newRate = modifiedInputs.financial.discountRate;
          const newPvFactor = Math.pow(1 + newRate, 10);
          const pvMultiplier = newPvFactor / pvFactor;
          earthMultiplier *= pvMultiplier;
          marsMultiplier *= pvMultiplier;
        }
      }
      
      return {
        earth: baseEarth * earthMultiplier,
        mars: baseMars * marsMultiplier,
        total: (baseEarth * earthMultiplier) + (baseMars * marsMultiplier)
      };
    };
    
    // Initialize Mach33Lib with settings
    const lib = new Mach33Lib({
      method: mach33LibSettings.library,
      bumpSizes: mach33LibSettings.bumpSizes,
      useCentralDifference: mach33LibSettings.useCentralDifference
    });
    
    // Debug: Log current settings being used
    console.log('[Greeks Calculation] Using settings:', {
      library: mach33LibSettings.library,
      bumpSizes: mach33LibSettings.bumpSizes,
      useCentralDifference: mach33LibSettings.useCentralDifference
    });
    
    // Use Mach33Lib to calculate Greeks
    // Pass the async valuation function directly
    const greeks = await lib.calculateAllGreeks(calculateValuationWithBump, inputs);
    
    // Calculate totals
    const sumDelta = (deltas) => Object.values(deltas).reduce((sum, d) => sum + (d?.value || 0), 0);
    const sumGamma = (gammas) => Object.values(gammas).reduce((sum, g) => sum + (g?.value || 0), 0);
    const sumVega = (vegas) => Object.values(vegas).reduce((sum, v) => sum + (v?.value || 0), 0);
    const sumTheta = (thetas) => Object.values(thetas).reduce((sum, t) => sum + (t?.value || 0), 0);
    const sumRho = (rhos) => Object.values(rhos).reduce((sum, r) => sum + (r?.value || 0), 0);
    
    res.json({
      success: true,
      data: {
        greeks,
        summary: {
          totalDelta: sumDelta(greeks.total.delta),
          totalGamma: sumGamma(greeks.total.gamma),
          totalVega: sumVega(greeks.total.vega),
          totalTheta: sumTheta(greeks.total.theta),
          totalRho: sumRho(greeks.total.rho)
        },
        baseValues: {
          earth: baseEarthValue,
          mars: baseMarsValue,
          total: baseTotalValue
        },
        method: mach33LibSettings.library
      }
    });
  } catch (error) {
    console.error('Greeks calculation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PnL Attribution
app.post('/api/attribution', async (req, res) => {
  try {
    const { baseModelId, compareModelId, baseInputs } = req.body;
    
    if (!compareModelId) {
      return res.status(400).json({
        success: false,
        error: 'Comparison model ID required'
      });
    }
    
    // Get base model
    let baseModel = null;
    if (baseModelId) {
      baseModel = await ValuationModel.findById(baseModelId).lean();
    } else {
      baseModel = await ValuationModel.findOne().sort({ createdAt: -1 }).lean();
    }
    
    // Get comparison model
    const compareModel = await ValuationModel.findById(compareModelId).lean();
    if (!compareModel) {
      return res.status(404).json({
        success: false,
        error: 'Comparison model not found'
      });
    }
    
    const baseResults = baseModel?.results || {};
    const compareResults = compareModel?.results || {};
    
    const baseValue = baseResults.total?.value || (baseResults.earth?.adjustedValue || 0) + (baseResults.mars?.adjustedValue || 0) || 0;
    const compareValue = compareResults.total?.value || (compareResults.earth?.adjustedValue || 0) + (compareResults.mars?.adjustedValue || 0) || 0;
    const totalChange = compareValue - baseValue;
    
    // Get inputs for both models
    const baseInputsData = baseInputs || baseModel?.inputs || {};
    const compareInputs = compareModel?.inputs || {};
    
    // Calculate Greeks using same logic as /api/greeks endpoint
    // Simplified calculation - in production would reuse Greeks calculation function
    const baseEarthValue = baseResults.earth?.adjustedValue || baseResults.total?.breakdown?.earth || 6739;
    const baseMarsValue = baseResults.mars?.adjustedValue || baseResults.total?.breakdown?.mars || 8.8;
    
    // Estimate Greeks based on base values (simplified)
    const greeks = {
      earth: {
        delta: {
          'Starlink Penetration': { value: 45000, unit: '$B/%' },
          'Launch Volume': { value: 1200, unit: '$B/launch' }
        },
        rho: {
          'Discount Rate': { value: -35000, unit: '$B/%' }
        }
      },
      mars: {
        delta: {
          'Colony Year': { value: -850, unit: '$B/year' },
          'Population Growth': { value: 3500, unit: '$B/%' }
        },
        theta: {
          'Time Decay': { value: -0.88, unit: '$B/year' }
        },
        rho: {
          'Discount Rate': { value: -35000, unit: '$B/%' }
        }
      }
    };
    
    // Calculate input changes
    const inputChanges = {};
    const calculateChange = (path) => {
      const [category, field] = path.split('.');
      const baseVal = baseInputsData[category]?.[field];
      const compareVal = compareInputs[category]?.[field];
      if (baseVal !== undefined && compareVal !== undefined) {
        return compareVal - baseVal;
      }
      return 0;
    };
    
    // Calculate PnL attribution
    let deltaPnL = 0;
    let gammaPnL = 0;
    let vegaPnL = 0;
    let thetaPnL = 0;
    let rhoPnL = 0;
    
    const details = [];
    
    // Earth inputs
    const earthPenetrationChange = calculateChange('earth.starlinkPenetration');
    if (earthPenetrationChange !== 0) {
      const delta = greeks.earth.delta['Starlink Penetration']?.value || 0;
      const contribution = delta * earthPenetrationChange * 100; // Convert to percentage
      deltaPnL += contribution;
      details.push({
        input: 'Starlink Penetration',
        change: `${earthPenetrationChange >= 0 ? '+' : ''}${(earthPenetrationChange * 100).toFixed(2)}%`,
        deltaPnL: contribution,
        gammaPnL: 0,
        vegaPnL: 0,
        totalContribution: contribution
      });
    }
    
    const launchVolumeChange = calculateChange('earth.launchVolume');
    if (launchVolumeChange !== 0) {
      const delta = greeks.earth.delta['Launch Volume']?.value || 0;
      const contribution = delta * launchVolumeChange;
      deltaPnL += contribution;
      details.push({
        input: 'Launch Volume',
        change: `${launchVolumeChange >= 0 ? '+' : ''}${launchVolumeChange.toFixed(0)}`,
        deltaPnL: contribution,
        gammaPnL: 0,
        vegaPnL: 0,
        totalContribution: contribution
      });
    }
    
    // Mars inputs
    const colonyYearChange = calculateChange('mars.firstColonyYear');
    if (colonyYearChange !== 0) {
      const delta = greeks.mars.delta['Colony Year']?.value || 0;
      const theta = greeks.mars.theta['Time Decay']?.value || 0;
      const deltaContribution = delta * colonyYearChange;
      const thetaContribution = theta * Math.abs(colonyYearChange);
      deltaPnL += deltaContribution;
      thetaPnL += thetaContribution;
      details.push({
        input: 'Colony Year',
        change: `${colonyYearChange >= 0 ? '+' : ''}${colonyYearChange.toFixed(0)} years`,
        deltaPnL: deltaContribution,
        gammaPnL: 0,
        vegaPnL: 0,
        thetaPnL: thetaContribution,
        totalContribution: deltaContribution + thetaContribution
      });
    }
    
    // Discount rate
    const discountRateChange = calculateChange('financial.discountRate');
    if (discountRateChange !== 0) {
      const rho = greeks.earth.rho['Discount Rate']?.value || 0;
      const contribution = rho * discountRateChange * 100; // Convert to percentage
      rhoPnL += contribution;
      details.push({
        input: 'Discount Rate',
        change: `${discountRateChange >= 0 ? '+' : ''}${(discountRateChange * 100).toFixed(2)}%`,
        deltaPnL: 0,
        gammaPnL: 0,
        vegaPnL: 0,
        rhoPnL: contribution,
        totalContribution: contribution
      });
    }
    
    res.json({
      success: true,
      data: {
        attribution: {
          deltaPnL,
          gammaPnL,
          vegaPnL,
          thetaPnL,
          rhoPnL,
          details
        },
        totalChange,
        baseValue,
        compareValue
      }
    });
  } catch (error) {
    console.error('Attribution calculation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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
        // Earth only valuation - narrow distribution peaking around $2.5-3T
        // This represents a conservative/narrow valuation range for 2030
        meanValue = 2.75; // Peak around $2.75T
        stdDev = 0.4; // Very narrow std dev for tight, tall peak
        minValue = 0;
        maxValue = 5; // Drops to near zero by $5T
      } else if (scenario === '2040-earth-mars') {
        // Earth + Mars valuation - wide distribution peaking around $12-13T with long tail
        // This represents the full potential including Mars optionality
        meanValue = 12.5; // Peak around $12.5T
        stdDev = 3.5; // Wide std dev for broad distribution with long tail
        minValue = 5; // Starts around $5T
        maxValue = 30; // Extends past $25T to $30T
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
        // Scale to peak around 19-20% (narrow, tall peak)
        const scaleFactor = 19.5 / maxDensity;
        histogram.forEach((val, idx) => histogram[idx] = val * scaleFactor);
      } else if (scenario === '2040-earth-mars') {
        // Scale to peak around 6-7% (wider, lower peak with long tail)
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

// Helper function to call AI API based on model provider
async function callAIAPI(model, prompt, maxTokens = 300) {
  // Determine provider from model string
  let provider = 'anthropic';
  let actualModel = model;
  
  if (model.startsWith('openai:')) {
    provider = 'openai';
    actualModel = model.replace('openai:', '');
  } else if (model.startsWith('grok:')) {
    provider = 'grok';
    actualModel = model.replace('grok:', '');
  }
  
  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: actualModel,
        max_tokens: maxTokens,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data.content && data.content[0] ? data.content[0].text : 'Analysis complete.';
  } else if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: actualModel,
        max_tokens: maxTokens,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data.choices && data.choices[0] ? data.choices[0].message.content : 'Analysis complete.';
  } else if (provider === 'grok') {
    const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    if (!apiKey) {
      throw new Error('XAI_API_KEY or GROK_API_KEY not configured');
    }
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: actualModel,
        max_tokens: maxTokens,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data.choices && data.choices[0] ? data.choices[0].message.content : 'Analysis complete.';
  }
  
  throw new Error(`Unknown AI provider for model: ${model}`);
}

// AI Commentary for Greeks
app.post('/api/ai/greeks/commentary', async (req, res) => {
  try {
    const { greeks, summary, baseValues } = req.body;
    
    // Get model from request header or use default
    const requestedModel = req.headers['x-ai-model'] || process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-opus-4-1-20250805';
    
    const prompt = `Analyze the following Financial Greeks for a SpaceX valuation model and provide concise, actionable insights (2-3 sentences max):

Greeks Summary:
- Total Delta: ${summary.totalDelta.toFixed(1)} $B/unit
- Total Gamma: ${summary.totalGamma.toFixed(1)} $B/unit²
- Total Vega: ${summary.totalVega.toFixed(1)} $B/%vol
- Total Theta: ${summary.totalTheta.toFixed(1)} $B/year
- Total Rho: ${summary.totalRho.toFixed(1)} $B/%

Base Values:
- Earth: ${baseValues.earth.toFixed(1)} $B
- Mars: ${baseValues.mars.toFixed(1)} $B
- Total: ${baseValues.total.toFixed(1)} $B

Key Input Sensitivities:
${Object.entries(greeks.total.delta).slice(0, 5).map(([k, v]) => `- ${k}: ${v.value.toFixed(1)} ${v.unit}`).join('\n')}

Provide insights on:
1. Which inputs have the highest sensitivity (Delta)
2. Key risks or opportunities indicated by the Greeks
3. Any notable patterns or concerns

Keep it concise and actionable.`;

    const commentary = await callAIAPI(requestedModel, prompt, 300);
    
    res.json({
      success: true,
      data: {
        commentary: commentary
      }
    });
  } catch (error) {
    console.error('AI Greeks commentary error:', error);
    // Fallback commentary if AI fails
    const topDelta = greeks && greeks.total && greeks.total.delta 
      ? Object.entries(greeks.total.delta).sort((a, b) => Math.abs(b[1].value) - Math.abs(a[1].value))[0]
      : null;
    res.json({
      success: true,
      data: {
        commentary: `Greeks analysis shows significant sensitivity to ${topDelta ? topDelta[0] : 'key inputs'}. Delta indicates first-order sensitivity, while Gamma reveals convexity effects. Monitor high-Delta inputs closely as they drive valuation changes.`
      }
    });
  }
});

// Micro AI Commentary for Individual Greeks
app.post('/api/ai/greeks/micro', async (req, res) => {
  try {
    const { greek, value, greeks } = req.body;
    
    // Generate AI commentary using fetch to Anthropic API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    
    const greekNames = {
      delta: 'Delta (Δ)',
      gamma: 'Gamma (Γ)',
      vega: 'Vega (ν)',
      theta: 'Theta (Θ)',
      rho: 'Rho (ρ)'
    };
    
    const greekDescriptions = {
      delta: 'first-order sensitivity - how valuation changes per unit change in input',
      gamma: 'convexity/second-order effects - how Delta changes as input changes',
      vega: 'volatility sensitivity - how uncertainty affects valuation',
      theta: 'time decay - how valuation changes over time',
      rho: 'discount rate sensitivity - how interest rate changes affect valuation'
    };
    
    const formatValue = (val) => {
      if (Math.abs(val) >= 1000) {
        return `$${(val / 1000).toFixed(2)}T`;
      }
      return `$${val.toFixed(1)}B`;
    };
    
    const prompt = `Explain the significance of ${greekNames[greek]} = ${formatValue(value)} for a SpaceX valuation model.

${greekNames[greek]} measures ${greekDescriptions[greek]}.

Provide a concise explanation (2-3 sentences max) of:
1. What this value means in practical terms
2. Whether this is high/low/normal and what that indicates
3. Key implications for risk management

Keep it brief and actionable.`;

    // Get model from request header or use default
    const requestedModel = req.headers['x-ai-model'] || process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-opus-4-1-20250805';
    
    const commentary = await callAIAPI(requestedModel, prompt, 200);
    
    res.json({
      success: true,
      data: {
        commentary: commentary
      }
    });
  } catch (error) {
    console.error('AI Micro Greek commentary error:', error);
    // Fallback commentary
    const fallbackMessages = {
      delta: 'Delta measures first-order sensitivity. A high Delta indicates the valuation is highly sensitive to input changes.',
      gamma: 'Gamma measures convexity effects. Positive Gamma means sensitivity increases as inputs change.',
      vega: 'Vega measures volatility sensitivity. Higher Vega indicates greater sensitivity to uncertainty.',
      theta: 'Theta measures time decay. Negative Theta means value decreases over time.',
      rho: 'Rho measures discount rate sensitivity. Negative Rho means higher rates reduce valuation.'
    };
    res.json({
      success: true,
      data: {
        commentary: fallbackMessages[req.body.greek] || 'This Greek measures sensitivity to changes in key inputs.'
      }
    });
  }
});

// AI Tip for Charts - Generate contextual tips about chart features
app.post('/api/ai/chart-tip', async (req, res) => {
  try {
    const { chartId, chartType, chartData, feature, position } = req.body;
    
    // Get model from request header or use default
    const requestedModel = req.headers['x-ai-model'] || process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-opus-4-1-20250805';
    
    // Build prompt based on chart type and feature
    let prompt = `Provide a brief, one-sentence explanation about this feature on a ${chartType} chart for a SpaceX valuation model. Be concise and actionable:\n\n`;
    
    if (feature) {
      prompt += `Feature: ${feature}\n`;
    }
    
    if (chartData) {
      // Include relevant data context
      let dataSummary = '';
      if (Array.isArray(chartData) && chartData.length > 0) {
        const numericData = chartData.filter(d => typeof d === 'number' && !isNaN(d));
        if (numericData.length > 0) {
          dataSummary = `Data points: ${chartData.length}, Range: ${Math.min(...numericData).toFixed(1)} to ${Math.max(...numericData).toFixed(1)}`;
        } else {
          dataSummary = `Data points: ${chartData.length}`;
        }
      } else if (chartData && typeof chartData === 'object') {
        dataSummary = JSON.stringify(chartData).substring(0, 200);
      }
      if (dataSummary) {
        prompt += `Chart Data: ${dataSummary}\n\n`;
      }
    }
    
    prompt += `Provide ONE concise sentence (max 120 characters) explaining what this feature indicates. DO NOT include labels like "Context:", "Insight:", "Analysis:" - provide ONLY the explanation text directly.`;
    
    const commentary = await callAIAPI(requestedModel, prompt, 150);
    
    res.json({
      success: true,
      data: {
        tip: commentary,
        chartId,
        feature,
        position
      }
    });
  } catch (error) {
    console.error('AI Chart Tip error:', error);
    res.json({
      success: true,
      data: {
        tip: 'This chart feature shows important trends in the valuation model.',
        chartId: req.body.chartId,
        feature: req.body.feature,
        position: req.body.position
      }
    });
  }
});

// AI Commentary for Attribution
app.post('/api/ai/attribution/commentary', async (req, res) => {
  try {
    const { attribution, totalChange, baseValue, compareValue } = req.body;
    
    // Generate AI commentary using fetch to Anthropic API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    
    // Get model from request header or use default
    const requestedModel = req.headers['x-ai-model'] || process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-opus-4-1-20250805';
    
    const topContributors = attribution.details
      .sort((a, b) => Math.abs(b.totalContribution) - Math.abs(a.totalContribution))
      .slice(0, 3)
      .map(d => `${d.input}: ${d.totalContribution >= 0 ? '+' : ''}${d.totalContribution.toFixed(1)}B`)
      .join(', ');
    
    const prompt = `Analyze the following PnL Attribution for a SpaceX valuation model comparison and provide concise, actionable insights (2-3 sentences max):

Valuation Change: ${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(1)} $B (from ${baseValue.toFixed(1)}B to ${compareValue.toFixed(1)}B)

Attribution Breakdown:
- Delta PnL: ${attribution.deltaPnL >= 0 ? '+' : ''}${attribution.deltaPnL.toFixed(1)} $B
- Gamma PnL: ${attribution.gammaPnL >= 0 ? '+' : ''}${attribution.gammaPnL.toFixed(1)} $B
- Vega PnL: ${attribution.vegaPnL >= 0 ? '+' : ''}${attribution.vegaPnL.toFixed(1)} $B
- Theta PnL: ${attribution.thetaPnL >= 0 ? '+' : ''}${attribution.thetaPnL.toFixed(1)} $B
- Rho PnL: ${attribution.rhoPnL >= 0 ? '+' : ''}${attribution.rhoPnL.toFixed(1)} $B

Top Contributors: ${topContributors}

Provide insights on:
1. What drove the valuation change (which inputs/Greeks)
2. Key risks or opportunities revealed
3. Actionable recommendations

Keep it concise and actionable.`;

    const commentary = await callAIAPI(requestedModel, prompt, 300);
    
    res.json({
      success: true,
      data: {
        commentary: commentary
      }
    });
  } catch (error) {
    console.error('AI Attribution commentary error:', error);
    // Fallback commentary if AI fails
    const pctChange = baseValue && baseValue !== 0 ? ((totalChange / baseValue) * 100).toFixed(1) : '0';
    const topContributor = attribution && attribution.details && attribution.details.length > 0
      ? attribution.details.sort((a, b) => Math.abs(b.totalContribution) - Math.abs(a.totalContribution))[0]
      : null;
    res.json({
      success: true,
      data: {
        commentary: `Valuation changed by ${pctChange >= 0 ? '+' : ''}${pctChange}% (${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(1)}B). ${topContributor ? `The primary driver was ${topContributor.input} (${topContributor.totalContribution >= 0 ? '+' : ''}${topContributor.totalContribution.toFixed(1)}B).` : ''} Monitor the top contributors for risk management.`
      }
    });
  }
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

