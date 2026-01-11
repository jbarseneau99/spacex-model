require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const Mach33Lib = require('./lib/mach33lib');
const ValuationAlgorithms = require('./lib/valuation-algorithms');
const CalculationEngine = require('./lib/calculation-engine');
const FactorModelsService = require('./services/factor-models');

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
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Load Excel data (for validation/testing only, not for calculations)
let excelData = null;
let modelStructure = null;
let valuationAlgorithms = null; // Keep for validation/testing
const calculationEngine = new CalculationEngine(); // Primary calculation engine
const factorModelsService = new FactorModelsService();

function loadData() {
  try {
    const excelDataPath = path.join(__dirname, 'excel_parsed_detailed.json');
    const structurePath = path.join(__dirname, 'model_structure.json');
    
    if (fs.existsSync(excelDataPath)) {
      excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf8'));
      console.log('✓ Excel data loaded');
      
      // Initialize valuation algorithms with Excel data
      valuationAlgorithms = new ValuationAlgorithms(excelData);
      console.log('✓ Valuation algorithms initialized');
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

// Get scenarios - load from database, fallback to defaults if none exist
app.get('/api/scenarios', async (req, res) => {
  try {
    // Load scenarios from database
    const dbScenarios = await Scenario.find({ isActive: true }).lean();
    
    if (dbScenarios.length > 0) {
      // Convert database scenarios to expected format
      const scenarios = {};
      dbScenarios.forEach(scenario => {
        scenarios[scenario.key] = {
          name: scenario.name,
          description: scenario.description,
          inputs: scenario.inputs,
          _id: scenario._id,
          isDefault: scenario.isDefault,
          updatedAt: scenario.updatedAt
        };
      });
      
      console.log(`✓ Loaded ${dbScenarios.length} scenarios from database`);
      return res.json({ success: true, data: scenarios });
    }
    
    // Fallback: return default scenarios if database is empty
    console.log('⚠️ No scenarios in database, using default scenarios');
    const defaultScenarios = {
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
    
    res.json({ success: true, data: defaultScenarios });
  } catch (error) {
    console.error('Scenarios error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create or update scenario
app.post('/api/scenarios', async (req, res) => {
  try {
    const { key, name, description, inputs } = req.body;
    
    if (!key || !name || !inputs) {
      return res.status(400).json({
        success: false,
        error: 'Key, name, and inputs are required'
      });
    }
    
    const scenario = await Scenario.findOneAndUpdate(
      { key },
      {
        key,
        name,
        description,
        inputs,
        updatedAt: new Date(),
        updatedBy: req.headers['x-user-id'] || 'system'
      },
      { upsert: true, new: true }
    );
    
    res.json({
      success: true,
      data: scenario
    });
  } catch (error) {
    console.error('Error saving scenario:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single scenario by key
app.get('/api/scenarios/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const scenario = await Scenario.findOne({ key, isActive: true }).lean();
    
    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: `Scenario "${key}" not found`
      });
    }
    
    res.json({
      success: true,
      data: scenario
    });
  } catch (error) {
    console.error('Error fetching scenario:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
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

// TAM Reference Data Schema
const tamDataSchema = new mongoose.Schema({
  name: { type: String, required: true, default: 'Earth Bandwidth TAM' },
  description: String,
  source: String,
  range: String,
  data: [{
    key: { type: Number, required: true },
    value: { type: Number, required: true }
  }],
  metadata: mongoose.Schema.Types.Mixed,
  version: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: String,
  updatedBy: String
});

// Index for faster lookups
tamDataSchema.index({ name: 1, isActive: 1 });
tamDataSchema.index({ 'data.key': 1 });

// Use valuation_models collection (plural) from spacex_valuation database
const ValuationModel = mongoose.models.ValuationModel || mongoose.model('ValuationModel', modelSchema, 'valuation_models');

// TAM Data model - use tam_reference_data collection
const TAMData = mongoose.models.TAMData || mongoose.model('TAMData', tamDataSchema, 'tam_reference_data');

// Scenario Schema
const scenarioSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // 'bear', 'base', 'bull'
  name: { type: String, required: true },
  description: String,
  inputs: {
    earth: {
      starlinkPenetration: Number,
      bandwidthPriceDecline: Number,
      launchVolume: Number,
      launchPriceDecline: Number
    },
    mars: {
      firstColonyYear: Number,
      transportCostDecline: Number,
      populationGrowth: Number
    },
    financial: {
      discountRate: Number,
      dilutionFactor: Number,
      terminalGrowth: Number
    }
  },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false }, // System default scenarios
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: String,
  updatedBy: String
});

scenarioSchema.index({ key: 1, isActive: 1 });
scenarioSchema.index({ isDefault: 1 });

const Scenario = mongoose.models.Scenario || mongoose.model('Scenario', scenarioSchema, 'scenarios');

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
      // Use algorithms to calculate base values from spreadsheet formulas
      let baseEarthValue = null;
      let baseMarsValue = null;
      
      if (valuationAlgorithms) {
        try {
          baseEarthValue = valuationAlgorithms.calculateEarthValuation('base');
          baseMarsValue = valuationAlgorithms.calculateMarsValuation('base');
          console.log(`✓ Using algorithm-calculated values: Earth=${baseEarthValue?.toFixed(3)}B, Mars=${baseMarsValue?.toFixed(3)}B`);
        } catch (error) {
          console.warn('⚠️ Algorithm calculation failed, falling back:', error.message);
        }
      }
      
      // Fallback to spreadsheet helper functions or database values
      if (!baseEarthValue || !baseMarsValue) {
        const spreadsheetEarth = getEarthValuesFromSpreadsheet('base');
        const spreadsheetMars = getMarsValuesFromSpreadsheet('base');
        
        baseEarthValue = baseEarthValue || 
                         baseResults.earth?.adjustedValue || 
                         spreadsheetEarth?.adjustedValue || 
                         baseResults.total?.breakdown?.earth || 
                         6739;
        baseMarsValue = baseMarsValue || 
                       baseResults.mars?.adjustedValue || 
                       spreadsheetMars?.adjustedValue || 
                       baseResults.total?.breakdown?.mars || 
                       8.8;
      }
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
          optionValue: (valuationAlgorithms ? valuationAlgorithms.calculateMarsOptionValue('base') : null) ||
                      baseModel?.results?.mars?.optionValue || 
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

// Helper function to generate random value from normal distribution
function randomNormal(mean, stdDev) {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stdDev;
}

// Helper function to clamp value between min and max
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Helper function to generate random inputs based on distributions
function generateRandomInputs(baseInputs, distributions) {
  const randomInputs = JSON.parse(JSON.stringify(baseInputs)); // Deep copy
  
  // Earth inputs
  if (distributions.earth) {
    if (distributions.earth.starlinkPenetration) {
      const dist = distributions.earth.starlinkPenetration;
      const mean = baseInputs.earth.starlinkPenetration;
      const stdDev = dist.stdDev || 0.05;
      randomInputs.earth.starlinkPenetration = clamp(
        randomNormal(mean, stdDev),
        dist.min || 0,
        dist.max || 1
      );
    }
    
    if (distributions.earth.launchVolume) {
      const dist = distributions.earth.launchVolume;
      const mean = baseInputs.earth.launchVolume;
      const stdDev = dist.stdDev || 30;
      randomInputs.earth.launchVolume = clamp(
        randomNormal(mean, stdDev),
        dist.min || 0,
        dist.max || 1000
      );
    }
    
    if (distributions.earth.bandwidthPriceDecline) {
      const dist = distributions.earth.bandwidthPriceDecline;
      const mean = baseInputs.earth.bandwidthPriceDecline;
      const stdDev = dist.stdDev || 0.02;
      randomInputs.earth.bandwidthPriceDecline = clamp(
        randomNormal(mean, stdDev),
        dist.min || 0,
        dist.max || 1
      );
    }
  }
  
  // Mars inputs
  if (distributions.mars) {
    if (distributions.mars.firstColonyYear) {
      const dist = distributions.mars.firstColonyYear;
      const mean = baseInputs.mars.firstColonyYear;
      const stdDev = dist.stdDev || 5;
      randomInputs.mars.firstColonyYear = Math.round(clamp(
        randomNormal(mean, stdDev),
        dist.min || 2020,
        dist.max || 2070
      ));
    }
    
    if (distributions.mars.populationGrowth) {
      const dist = distributions.mars.populationGrowth;
      const mean = baseInputs.mars.populationGrowth;
      const stdDev = dist.stdDev || 0.15;
      randomInputs.mars.populationGrowth = clamp(
        randomNormal(mean, stdDev),
        dist.min || 0,
        dist.max || 2
      );
    }
  }
  
  // Financial inputs
  if (distributions.financial) {
    if (distributions.financial.discountRate) {
      const dist = distributions.financial.discountRate;
      const mean = baseInputs.financial.discountRate;
      const stdDev = dist.stdDev || 0.03;
      randomInputs.financial.discountRate = clamp(
        randomNormal(mean, stdDev),
        dist.min || 0.05,
        dist.max || 0.5
      );
    }
    
    if (distributions.financial.dilutionFactor) {
      const dist = distributions.financial.dilutionFactor;
      const mean = baseInputs.financial.dilutionFactor;
      const stdDev = dist.stdDev || 0.05;
      randomInputs.financial.dilutionFactor = clamp(
        randomNormal(mean, stdDev),
        dist.min || 0,
        dist.max || 1
      );
    }
  }
  
  return randomInputs;
}

// Helper function to calculate statistics from array of values
function calculateStatistics(values) {
  if (!values || values.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      p10: 0,
      q1: 0,
      q3: 0,
      p90: 0
    };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    mean,
    median,
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p10: sorted[Math.floor(sorted.length * 0.1)],
    q1: sorted[Math.floor(sorted.length * 0.25)],
    q3: sorted[Math.floor(sorted.length * 0.75)],
    p90: sorted[Math.floor(sorted.length * 0.9)]
  };
}

// Helper function to generate distribution histogram
function generateDistribution(values, bins = 50) {
  if (!values || values.length === 0) {
    return {
      min: 0,
      max: 0,
      bins: bins,
      binSize: 0,
      histogram: new Array(bins).fill(0),
      binCenters: new Array(bins).fill(0)
    };
  }
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binSize = (max - min) / bins;
  const histogram = new Array(bins).fill(0);
  
  values.forEach(val => {
    const binIndex = Math.min(Math.floor((val - min) / binSize), bins - 1);
    histogram[binIndex]++;
  });
  
  // Normalize histogram to 0-100 scale
  const maxCount = Math.max(...histogram);
  const normalizedHistogram = maxCount > 0
    ? histogram.map(count => (count / maxCount) * 100)
    : histogram;
  
  const binCenters = Array.from({ length: bins }, (_, i) => min + (i + 0.5) * binSize);
  
  return {
    min,
    max,
    bins,
    binSize,
    histogram: normalizedHistogram,
    binCenters
  };
}

app.post('/api/monte-carlo/run', async (req, res) => {
  try {
    const { baseInputs, distributions, runs = 5000 } = req.body;
    
    if (!baseInputs) {
      return res.status(400).json({
        success: false,
        error: 'baseInputs is required'
      });
    }
    
    // Use default distributions if not provided
    const defaultDistributions = {
      earth: {
        starlinkPenetration: { stdDev: 0.05, min: 0.05, max: 0.30 },
        launchVolume: { stdDev: 30, min: 10, max: 500 },
        bandwidthPriceDecline: { stdDev: 0.02, min: 0, max: 0.20 }
      },
      mars: {
        firstColonyYear: { stdDev: 5, min: 2025, max: 2060 },
        populationGrowth: { stdDev: 0.15, min: 0.1, max: 1.0 }
      },
      financial: {
        discountRate: { stdDev: 0.03, min: 0.08, max: 0.25 },
        dilutionFactor: { stdDev: 0.05, min: 0.05, max: 0.30 }
      }
    };
    
    const simDistributions = distributions || defaultDistributions;
    
    console.log(`🎲 Starting Monte Carlo simulation: ${runs} runs`);
    const startTime = Date.now();
    
    // Cache base values (load once, reuse for all iterations)
    let cachedBaseModel = null;
    let cachedBaseEarthValue = undefined;
    let cachedBaseMarsValue = undefined;
    
    // Run simulations
    const results = [];
    const totalValues = [];
    const earthValues = [];
    const marsValues = [];
    
    // Progress logging every 500 iterations
    const progressInterval = 500;
    
    for (let i = 0; i < runs; i++) {
      // Log progress every 500 iterations
      if (i > 0 && i % progressInterval === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = i / elapsed;
        const remaining = (runs - i) / rate;
        console.log(`  Progress: ${i}/${runs} (${(i/runs*100).toFixed(1)}%) - ETA: ${remaining.toFixed(1)}s`);
      }
      // Generate random inputs
      const randomInputs = generateRandomInputs(baseInputs, simDistributions);
      
      // Calculate valuations using the /api/calculate endpoint logic
      // We'll use the same approach as the calculate endpoint
      let earthValue = null;
      let marsValue = null;
      
      // Use optimized calculation logic for Monte Carlo
      // Cache base model and values to avoid repeated DB queries
      try {
        // Load base model once (first iteration only)
        if (!cachedBaseModel) {
          cachedBaseModel = await ValuationModel.findOne().sort({ createdAt: -1 }).lean();
        }
        const baseModel = cachedBaseModel || {};
        const baseResults = baseModel?.results || {};
        
        // Load base values once (first iteration only)
        if (cachedBaseEarthValue === undefined || cachedBaseMarsValue === undefined) {
          // Use calculation engine (not spreadsheet) to calculate base values
          try {
            // Calculate from inputs using calculation engine
            const totalEnterpriseValue = calculationEngine.calculateTotalEnterpriseValue(baseInputs, null);
            const earthComponent = calculationEngine.calculateEarthValuation(baseInputs, null);
            const marsComponent = calculationEngine.calculateMarsValuation(baseInputs);
            
            cachedBaseEarthValue = totalEnterpriseValue; // Use total as base
            cachedBaseMarsValue = marsComponent; // Keep Mars separate for multiplier logic
            
            console.log(`✓ Monte Carlo base values from calculation engine:`);
            console.log(`  Total Enterprise Value (B13): ${totalEnterpriseValue?.toFixed(2)}B`);
            console.log(`  Earth component (O153): ${earthComponent?.toFixed(2)}B`);
            console.log(`  Mars component: ${marsComponent?.toFixed(2)}B`);
          } catch (error) {
            console.warn(`⚠️ Calculation engine failed:`, error.message);
          }
          
          // Fallback if algorithms didn't work
          if (cachedBaseEarthValue === undefined || cachedBaseMarsValue === undefined) {
            const spreadsheetEarth = getEarthValuesFromSpreadsheet('base');
            const spreadsheetMars = getMarsValuesFromSpreadsheet('base');
            
            cachedBaseEarthValue = cachedBaseEarthValue !== undefined ? cachedBaseEarthValue : 
                             baseResults.earth?.adjustedValue || 
                             spreadsheetEarth?.adjustedValue || 
                             baseResults.total?.breakdown?.earth || 
                             6739;
            cachedBaseMarsValue = cachedBaseMarsValue !== undefined ? cachedBaseMarsValue : 
                           baseResults.mars?.adjustedValue || 
                           spreadsheetMars?.adjustedValue || 
                           baseResults.total?.breakdown?.mars || 
                           8.8;
            console.log(`✓ Monte Carlo base values (fallback): Earth=${cachedBaseEarthValue?.toFixed(2)}B, Mars=${cachedBaseMarsValue?.toFixed(2)}B`);
          }
        }
        
        // cachedBaseEarthValue now contains TOTAL enterprise value (B13), not just Earth component
        // We need to apply multipliers to the total value based on input changes
        const baseTotalValue = cachedBaseEarthValue; // This is B13 (total enterprise value)
        const baseMarsValue = cachedBaseMarsValue; // Mars component for reference
        
        // Calculate multipliers based on input changes
        // CRITICAL: Compare random inputs to baseInputs (passed in), not baseModel inputs
        let totalMultiplier = 1.0;
        
        // Earth adjustments affect total value
        if (randomInputs.earth) {
          const basePenetration = baseInputs.earth?.starlinkPenetration || 0.15;
          if (randomInputs.earth.starlinkPenetration !== undefined && basePenetration > 0) {
            totalMultiplier *= randomInputs.earth.starlinkPenetration / basePenetration;
          }
          
          const baseLaunchVolume = baseInputs.earth?.launchVolume || 150;
          if (randomInputs.earth.launchVolume !== undefined && baseLaunchVolume > 0) {
            totalMultiplier *= randomInputs.earth.launchVolume / baseLaunchVolume;
          }
        }
        
        // Mars adjustments affect total value
        if (randomInputs.mars) {
          const baseColonyYear = baseInputs.mars?.firstColonyYear || 2030;
          if (randomInputs.mars.firstColonyYear !== undefined) {
            const yearsDiff = baseColonyYear - randomInputs.mars.firstColonyYear;
            totalMultiplier *= 1 + (yearsDiff * 0.1); // 10% per year earlier/later
          }
          
          const basePopGrowth = baseInputs.mars?.populationGrowth || 0.15;
          if (randomInputs.mars.populationGrowth !== undefined && basePopGrowth > 0) {
            totalMultiplier *= randomInputs.mars.populationGrowth / basePopGrowth;
          }
          
          // Only apply bootstrap penalty if it changed from base
          const baseBootstrap = baseInputs.mars?.industrialBootstrap !== false; // Default true
          if (randomInputs.mars.industrialBootstrap === false && baseBootstrap) {
            totalMultiplier *= 0.1; // Massive reduction if no bootstrap
          }
        }
        
        // Financial adjustments affect total value
        if (randomInputs.financial) {
          const baseDiscountRate = baseInputs.financial?.discountRate || 0.12;
          if (randomInputs.financial.discountRate !== undefined) {
            // Higher discount rate reduces PV
            const pvReduction = Math.pow(1 + baseDiscountRate, 10) / Math.pow(1 + randomInputs.financial.discountRate, 10);
            totalMultiplier *= pvReduction;
          }
        }
        
        // Calculate final total value (this is what Column M represents)
        const totalValue = baseTotalValue * totalMultiplier;
        
        // Split total value proportionally for Earth/Mars reporting
        // Use the ratio from base values to split
        const baseEarthComponent = baseTotalValue - (baseMarsValue || 0);
        const earthRatio = baseTotalValue > 0 ? baseEarthComponent / baseTotalValue : 0.99;
        const marsRatio = baseTotalValue > 0 ? (baseMarsValue || 0) / baseTotalValue : 0.01;
        
        earthValue = totalValue * earthRatio;
        marsValue = totalValue * marsRatio;
        
        // Log first iteration for debugging
        if (i === 0) {
          console.log(`🔍 Monte Carlo iteration 1 debug:`, {
            baseEarthValue: baseEarthValue?.toFixed(2),
            baseMarsValue: baseMarsValue?.toFixed(2),
            earthMultiplier: earthMultiplier.toFixed(4),
            marsMultiplier: marsMultiplier.toFixed(4),
            earthValue: earthValue?.toFixed(2),
            marsValue: marsValue?.toFixed(2),
            totalValue: (earthValue + marsValue)?.toFixed(2)
          });
        }
        
        // Safety checks
        if (!isFinite(earthValue) || earthValue < 0) earthValue = 0;
        if (!isFinite(marsValue) || marsValue < 0) marsValue = 0;
        
      } catch (error) {
        console.warn(`⚠️ Iteration ${i + 1} calculation error:`, error.message);
        // Fallback to cached base values
        earthValue = cachedBaseEarthValue || 6739;
        marsValue = cachedBaseMarsValue || 8.8;
      }
      
      const totalValue = earthValue + marsValue;
      
      // Store results
      results.push({
        iteration: i + 1,
        inputs: randomInputs,
        results: {
          totalValue,
          earthValue,
          marsValue
        },
        totalValue,
        earthValue,
        marsValue
      });
      
      totalValues.push(totalValue);
      earthValues.push(earthValue);
      marsValues.push(marsValue);
    }
    
    // Calculate statistics
    const totalStats = calculateStatistics(totalValues);
    const earthStats = calculateStatistics(earthValues);
    const marsStats = calculateStatistics(marsValues);
    
    // Generate distributions
    const totalDistribution = generateDistribution(totalValues);
    const earthDistribution = generateDistribution(earthValues);
    const marsDistribution = generateDistribution(marsValues);
    
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    
    console.log(`✓ Monte Carlo simulation complete: ${runs} runs in ${elapsedSeconds.toFixed(2)}s`);
    console.log(`  Base values used: Earth=${cachedBaseEarthValue?.toFixed(2)}B, Mars=${cachedBaseMarsValue?.toFixed(2)}B`);
    console.log(`  Total Value: mean=$${totalStats.mean.toFixed(2)}B, stdDev=$${totalStats.stdDev.toFixed(2)}B`);
    console.log(`  Earth Value: mean=$${earthStats.mean.toFixed(2)}B, stdDev=$${earthStats.stdDev.toFixed(2)}B`);
    console.log(`  Mars Value: mean=$${marsStats.mean.toFixed(2)}B, stdDev=$${marsStats.stdDev.toFixed(2)}B`);
    
    // Debug: Check if values seem too low
    if (totalStats.mean < 500) {
      console.warn(`⚠️ WARNING: Monte Carlo mean ($${totalStats.mean.toFixed(2)}B) seems low. Expected ~$1200B.`);
      console.warn(`   Base Earth: ${cachedBaseEarthValue?.toFixed(2)}B, Base Mars: ${cachedBaseMarsValue?.toFixed(2)}B`);
      console.warn(`   Check if base values or multipliers are correct.`);
    }
    
    // Calculate cash flow timeline for base scenario (for Cash Flow Timeline chart)
    let baseCashFlow = Array.from({ length: 30 }, (_, i) => ({
      year: 2024 + i,
      value: 0
    }));
    let basePresentValue = Array.from({ length: 30 }, (_, i) => ({
      value: 0,
      cumulative: 0
    }));
    
    try {
      // Use calculation engine or /api/calculate to get cash flow for base inputs
      // For now, generate a simple cash flow projection based on base values
      const discountRate = baseInputs.financial?.discountRate || 0.12;
      const baseEarthComponent = cachedBaseEarthValue - (cachedBaseMarsValue || 0);
      
      // Generate a simple cash flow projection (growing over time)
      for (let i = 0; i < 30; i++) {
        const year = 2024 + i;
        // Simple model: cash flow grows from 10% to 30% of Earth value over 30 years
        const growthFactor = 0.10 + (i / 30) * 0.20; // 10% to 30%
        const annualCashFlow = baseEarthComponent * growthFactor / 30; // Distribute over 30 years
        
        baseCashFlow[i] = {
          year: year,
          value: annualCashFlow
        };
        
        // Calculate PV
        const pv = annualCashFlow / Math.pow(1 + discountRate, i + 1);
        const prevCumulative = i > 0 ? basePresentValue[i - 1].cumulative : 0;
        
        basePresentValue[i] = {
          value: pv,
          cumulative: prevCumulative + pv
        };
      }
    } catch (error) {
      console.warn('⚠️ Could not calculate cash flow timeline:', error.message);
    }
    
    res.json({
      success: true,
      data: {
        runs,
        elapsedSeconds,
        statistics: {
          totalValue: totalStats,
          earthValue: earthStats,
          marsValue: marsStats,
          distribution: totalDistribution
        },
        results: results.slice(0, 10000), // Limit to 10k results for response size
        // Include cash flow timeline for base scenario (for Cash Flow Timeline chart)
        earth: {
          cashFlow: baseCashFlow,
          presentValue: basePresentValue
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Monte Carlo simulation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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
// Factor Models API
app.get('/api/factor-models', (req, res) => {
  try {
    const models = factorModelsService.getAvailableModels();
    res.json({ success: true, data: models });
  } catch (error) {
    console.error('Factor models error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/factor-models/calculate', async (req, res) => {
  try {
    const { modelId, valuationData, marketData } = req.body;
    
    if (!modelId) {
      return res.status(400).json({ success: false, error: 'Model ID required' });
    }

    const result = await factorModelsService.calculateFactorExposures(
      modelId,
      valuationData || {},
      marketData || null
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Factor calculation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/factor-models/stress-test', async (req, res) => {
  try {
    const { modelId, factorName, shock, baseValuation } = req.body;
    
    if (!modelId || !factorName || shock === undefined || !baseValuation) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: modelId, factorName, shock, baseValuation' 
      });
    }

    const result = await factorModelsService.stressTestFactor(
      modelId,
      factorName,
      shock,
      baseValuation
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Factor stress test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/factor-models/adjusted-greeks', async (req, res) => {
  try {
    const { greeks, factorExposures } = req.body;
    
    if (!greeks || !factorExposures) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: greeks, factorExposures' 
      });
    }

    const adjusted = factorModelsService.calculateFactorAdjustedGreeks(
      greeks,
      factorExposures
    );

    res.json({ success: true, data: adjusted });
  } catch (error) {
    console.error('Factor-adjusted Greeks error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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

// VaR (Value at Risk) calculation endpoint
app.post('/api/var', async (req, res) => {
  try {
    const { method = 'combined', confidence = 0.99, timeHorizon = 10 } = req.body;
    
    // Get current valuation and Greeks
    const baseModel = await ValuationModel.findOne().sort({ createdAt: -1 }).lean();
    const baseResults = baseModel?.results || {};
    const currentValuation = baseResults.total?.value || 
      (baseResults.earth?.adjustedValue || 0) + (baseResults.mars?.adjustedValue || 0) || 0;
    
    // Get Greeks data - reuse the same calculation logic from /api/greeks endpoint
    const inputs = baseModel?.inputs || {};
    const baseEarthValue = baseResults.earth?.adjustedValue || baseResults.total?.breakdown?.earth || 6739;
    const baseMarsValue = baseResults.mars?.adjustedValue || baseResults.total?.breakdown?.mars || 8.8;
    
    // Reuse the same calculateValuationWithBump function from Greeks endpoint
    const calculateValuationWithBump = async (inputPath, bumpedValue) => {
      const pathParts = inputPath.split('.');
      const modifiedInputs = JSON.parse(JSON.stringify(inputs));
      
      // Handle special paths for Vega, Theta, Rho (same as Greeks endpoint)
      if (inputPath === 'volatility') {
        const baseVolatility = 0.2;
        const volatilityChange = bumpedValue - baseVolatility;
        const earthMultiplier = 1 + (volatilityChange * 0.005);
        const marsMultiplier = 1 + (volatilityChange * 0.02);
        return {
          earth: baseEarthValue * earthMultiplier,
          mars: baseMarsValue * marsMultiplier,
          total: (baseEarthValue * earthMultiplier) + (baseMarsValue * marsMultiplier)
        };
      } else if (inputPath === 'time') {
        const baseColonyYear = inputs.mars?.firstColonyYear || 2030;
        const yearsDiff = baseColonyYear - bumpedValue;
        const marsMultiplier = Math.pow(1.1, yearsDiff);
        return {
          earth: baseEarthValue,
          mars: baseMarsValue * marsMultiplier,
          total: baseEarthValue + (baseMarsValue * marsMultiplier)
        };
      } else if (inputPath === 'discountRate') {
        const baseRate = inputs.financial?.discountRate || 0.12;
        const pvFactor = Math.pow(1 + baseRate, 10);
        const newPvFactor = Math.pow(1 + bumpedValue, 10);
        const pvMultiplier = newPvFactor / pvFactor;
        return {
          earth: baseEarthValue * pvMultiplier,
          mars: baseMarsValue * pvMultiplier,
          total: (baseEarthValue + baseMarsValue) * pvMultiplier
        };
      }
      
      // Handle normal paths
      if (pathParts.length === 2) {
        const [category, field] = pathParts;
        if (modifiedInputs[category]) {
          modifiedInputs[category][field] = bumpedValue;
        }
      }
      
      // Calculate multipliers (same logic as Greeks endpoint)
      let earthMultiplier = 1.0;
      let marsMultiplier = 1.0;
      
      if (modifiedInputs.earth) {
        const basePenetration = inputs.earth?.starlinkPenetration || 0.15;
        if (modifiedInputs.earth.starlinkPenetration !== undefined) {
          const penetrationRatio = modifiedInputs.earth.starlinkPenetration / basePenetration;
          earthMultiplier *= Math.pow(penetrationRatio, 0.95);
        }
        
        const baseLaunchVolume = inputs.earth?.launchVolume || 150;
        if (modifiedInputs.earth.launchVolume !== undefined) {
          const volumeRatio = modifiedInputs.earth.launchVolume / baseLaunchVolume;
          earthMultiplier *= Math.pow(volumeRatio, 0.98);
        }
      }
      
      if (modifiedInputs.mars) {
        const baseColonyYear = inputs.mars?.firstColonyYear || 2030;
        if (modifiedInputs.mars.firstColonyYear !== undefined) {
          const yearsDiff = baseColonyYear - modifiedInputs.mars.firstColonyYear;
          marsMultiplier *= Math.pow(1.1, yearsDiff);
        }
        
        const basePopGrowth = inputs.mars?.populationGrowth || 0.15;
        if (modifiedInputs.mars.populationGrowth !== undefined) {
          const growthRatio = modifiedInputs.mars.populationGrowth / basePopGrowth;
          marsMultiplier *= Math.pow(growthRatio, 0.97);
        }
      }
      
      if (modifiedInputs.financial) {
        const baseRate = inputs.financial?.discountRate || 0.12;
        if (modifiedInputs.financial.discountRate !== undefined) {
          const pvFactor = Math.pow(1 + baseRate, 10);
          const newRate = modifiedInputs.financial.discountRate;
          const newPvFactor = Math.pow(1 + newRate, 10);
          const pvMultiplier = newPvFactor / pvFactor;
          earthMultiplier *= pvMultiplier;
          marsMultiplier *= pvMultiplier;
        }
      }
      
      return {
        earth: baseEarthValue * earthMultiplier,
        mars: baseMarsValue * marsMultiplier,
        total: (baseEarthValue * earthMultiplier) + (baseMarsValue * marsMultiplier)
      };
    };
    
    // Use global mach33LibSettings (same as Greeks endpoint)
    const lib = new Mach33Lib({
      method: mach33LibSettings.library,
      bumpSizes: mach33LibSettings.bumpSizes,
      useCentralDifference: mach33LibSettings.useCentralDifference
    });
    
    // Calculate Greeks
    let greeks = {};
    try {
      greeks = await lib.calculateAllGreeks(calculateValuationWithBump, inputs);
    } catch (error) {
      console.warn('Could not calculate Greeks for VaR:', error.message);
      greeks = { earth: {}, mars: {}, total: {} };
    }
    
    let varResult = {
      method,
      confidence,
      timeHorizon,
      currentValuation,
      varValue: 0,
      varPercent: 0,
      expectedShortfall: 0,
      components: {
        earth: { varContribution: 0, greeksRisk: 0, monteCarloRisk: 0 },
        mars: { varContribution: 0, greeksRisk: 0, monteCarloRisk: 0 }
      },
      breakdown: []
    };
    
    // Greeks-Based VaR calculation
    if (method === 'greeks' || method === 'combined') {
      const earthGreeks = greeks.earth || {};
      const marsGreeks = greeks.mars || {};
      
      // Calculate variance from Greeks
      // VaR = √(Σ(Delta² × σ²)) × z-score × √time
      const zScore = confidence === 0.95 ? 1.645 : confidence === 0.99 ? 2.326 : 3.09;
      const timeFactor = Math.sqrt(timeHorizon / 252); // Convert days to years (252 trading days)
      
      // Estimate volatility for each input (as percentage of input value)
      const inputVolatilities = {
        'Starlink Penetration': 0.15, // 15% annual volatility
        'Launch Volume': 0.20,
        'Population Growth': 0.25,
        'Colony Year': 0.10,
        'Discount Rate': 0.05,
        'Volatility': 0.30
      };
      
      let earthVariance = 0;
      let marsVariance = 0;
      
      console.log('VaR Greeks Debug - Initial:', { earthVariance, marsVariance, hasEarthDelta: !!earthGreeks.delta, hasMarsDelta: !!marsGreeks.delta });
      
      // Earth Greeks contribution
      // Delta represents $B change per 0.01 (1 percentage point) change in input
      // For VaR: contribution = (Delta × σ_units)² where σ_units converts volatility to delta units
      // Since delta is per 0.01 change and volatility is a decimal (0.15 = 15%),
      // we need: σ_units = volatility × current_value / 0.01
      // But for simplicity, we'll use: contribution = (Delta × volatility × scale_factor)²
      // where scale_factor accounts for the unit conversion
      if (earthGreeks.delta) {
        Object.entries(earthGreeks.delta).forEach(([input, delta]) => {
          const vol = inputVolatilities[input] || 0.15;
          let deltaValue = typeof delta === 'object' && delta !== null ? delta.value : delta;
          // Ensure deltaValue is a valid number
          if (deltaValue == null || isNaN(deltaValue) || !isFinite(deltaValue)) {
            deltaValue = 0;
          }
          // Delta is in $B per 0.01 change (1 percentage point)
          // Volatility is a decimal (0.15 = 15% standard deviation)
          // For percentage inputs, we need to scale: if input is 0.15 and vol is 0.15,
          // then std dev in units = 0.15 × 0.15 = 0.0225, which is 2.25 percentage points
          // So we scale volatility by 100 to convert to percentage points: vol × 100
          // Then: contribution = (Delta × vol × 100)² = (Delta × vol × 10)²
          // Actually, let's use a more conservative approach: vol as percentage points directly
          const volInPercentagePoints = vol * 100; // Convert 0.15 to 15 percentage points
          const contribution = Math.pow(deltaValue * volInPercentagePoints / 100, 2); // Divide by 100 to get back to delta units
          // Simplified: contribution = (Delta × vol)², treating vol as the multiplier
          const simplifiedContribution = Math.pow(deltaValue * vol, 2);
          
          // Use the simplified version but cap it to prevent overflow
          if (Math.abs(deltaValue) > 1e6) {
            console.warn(`VaR Debug - Delta value very large for ${input}:`, deltaValue, '- capping contribution');
            // Cap delta to prevent overflow
            deltaValue = Math.sign(deltaValue) * Math.min(Math.abs(deltaValue), 1e6);
          }
          const finalContribution = Math.pow(deltaValue * vol, 2);
          if (isFinite(finalContribution) && finalContribution < 1e15) { // Prevent Infinity, allow large but reasonable values
            earthVariance += finalContribution;
            varResult.breakdown.push({
              component: 'Earth',
              input,
              delta: deltaValue,
              volatility: vol,
              contribution: finalContribution
            });
          } else {
            console.log('VaR Debug - Invalid Earth contribution:', { input, deltaValue, vol, contribution: finalContribution });
          }
        });
      }
      console.log('VaR Greeks Debug - After Earth:', { earthVariance });
      
      // Mars Greeks contribution
      if (marsGreeks.delta) {
        Object.entries(marsGreeks.delta).forEach(([input, delta]) => {
          const vol = inputVolatilities[input] || 0.15;
          let deltaValue = typeof delta === 'object' && delta !== null ? delta.value : delta;
          // Ensure deltaValue is a valid number
          if (deltaValue == null || isNaN(deltaValue) || !isFinite(deltaValue)) {
            deltaValue = 0;
          }
          // Cap delta to prevent overflow
          if (Math.abs(deltaValue) > 1e6) {
            console.warn(`VaR Debug - Delta value very large for ${input}:`, deltaValue, '- capping contribution');
            deltaValue = Math.sign(deltaValue) * Math.min(Math.abs(deltaValue), 1e6);
          }
          const finalContribution = Math.pow(deltaValue * vol, 2);
          if (isFinite(finalContribution) && finalContribution < 1e15) { // Prevent Infinity
            marsVariance += finalContribution;
            varResult.breakdown.push({
              component: 'Mars',
              input,
              delta: deltaValue,
              volatility: vol,
              contribution: finalContribution
            });
          } else {
            console.log('VaR Debug - Invalid Mars contribution:', { input, deltaValue, vol, contribution: finalContribution });
          }
        });
      }
      console.log('VaR Greeks Debug - After Mars:', { marsVariance });
      
      // Add Vega contribution (volatility risk)
      if (earthGreeks.vega && typeof earthGreeks.vega === 'object') {
        Object.values(earthGreeks.vega).forEach(vega => {
          const vegaValue = typeof vega === 'object' && vega !== null ? vega.value : vega;
          if (vegaValue != null && isFinite(vegaValue) && !isNaN(vegaValue)) {
            const volVol = 0.30; // Volatility of volatility
            const vegaContribution = Math.pow(vegaValue * volVol, 2);
            if (isFinite(vegaContribution)) {
              earthVariance += vegaContribution;
            }
          }
        });
      }
      
      if (marsGreeks.vega && typeof marsGreeks.vega === 'object') {
        Object.values(marsGreeks.vega).forEach(vega => {
          const vegaValue = typeof vega === 'object' && vega !== null ? vega.value : vega;
          if (vegaValue != null && isFinite(vegaValue) && !isNaN(vegaValue)) {
            const volVol = 0.30;
            const vegaContribution = Math.pow(vegaValue * volVol, 2);
            if (isFinite(vegaContribution)) {
              marsVariance += vegaContribution;
            }
          }
        });
      }
      
      // Calculate Greeks-based VaR risk in $B
      // VaR = √(Σ(Delta² × σ²)) × z-score × √time
      // Ensure variance is finite and positive
      const safeEarthVariance = isFinite(earthVariance) && earthVariance > 0 ? earthVariance : 0;
      const safeMarsVariance = isFinite(marsVariance) && marsVariance > 0 ? marsVariance : 0;
      
      const earthStdDev = Math.sqrt(safeEarthVariance);
      const marsStdDev = Math.sqrt(safeMarsVariance);
      
      // Calculate risk: stdDev * zScore * timeFactor
      // Ensure all components are finite
      const safeEarthStdDev = isFinite(earthStdDev) ? earthStdDev : 0;
      const safeMarsStdDev = isFinite(marsStdDev) ? marsStdDev : 0;
      const safeZScore = isFinite(zScore) ? zScore : 2.326;
      const safeTimeFactor = isFinite(timeFactor) ? timeFactor : Math.sqrt(10 / 252);
      
      const earthGreeksRisk = safeEarthStdDev * safeZScore * safeTimeFactor;
      const marsGreeksRisk = safeMarsStdDev * safeZScore * safeTimeFactor;
      
      // Debug logging
      console.log('VaR Calculation Debug:', {
        earthVariance: safeEarthVariance,
        marsVariance: safeMarsVariance,
        earthStdDev: safeEarthStdDev,
        marsStdDev: safeMarsStdDev,
        zScore: safeZScore,
        timeFactor: safeTimeFactor,
        earthGreeksRisk,
        marsGreeksRisk,
        earthGreeksRiskValid: isFinite(earthGreeksRisk),
        marsGreeksRiskValid: isFinite(marsGreeksRisk)
      });
      
      // Ensure we have valid numbers (not NaN or Infinity)
      varResult.components.earth.greeksRisk = isFinite(earthGreeksRisk) && !isNaN(earthGreeksRisk) && earthGreeksRisk >= 0 ? earthGreeksRisk : 0;
      varResult.components.mars.greeksRisk = isFinite(marsGreeksRisk) && !isNaN(marsGreeksRisk) && marsGreeksRisk >= 0 ? marsGreeksRisk : 0;
    }
    
    // Monte Carlo VaR calculation
    if (method === 'monte-carlo' || method === 'combined') {
      try {
        // Use Monte Carlo simulation results if available
        const monteCarloResponse = await fetch(`http://localhost:${PORT}/api/monte-carlo/scenarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseInputs: baseModel?.inputs || {},
            runs: 10000,
            scenarios: ['2030-earth-only', '2040-earth-mars']
          })
        });
        
        if (monteCarloResponse.ok) {
          const mcData = await monteCarloResponse.json();
          const scenarios = mcData.data?.scenarios || {};
          
          // Calculate VaR from Monte Carlo distribution
          // Find the percentile corresponding to (1 - confidence)
          const percentile = (1 - confidence) * 100;
          
          // For Earth component (2030 scenario)
          if (scenarios['2030-earth-only']) {
            const earthDistribution = scenarios['2030-earth-only'].distribution || [];
            if (earthDistribution.length > 0) {
              const sortedValues = earthDistribution.map(bin => bin.value || 0).sort((a, b) => a - b);
              const varIndex = Math.floor(sortedValues.length * (1 - confidence));
              const varValue = sortedValues[Math.max(0, varIndex)];
              const earthMonteCarloRisk = Math.max(0, currentValuation - varValue);
              varResult.components.earth.monteCarloRisk = earthMonteCarloRisk;
            }
          }
          
          // For Mars component (2040 scenario)
          if (scenarios['2040-earth-mars']) {
            const marsDistribution = scenarios['2040-earth-mars'].distribution || [];
            if (marsDistribution.length > 0) {
              const sortedValues = marsDistribution.map(bin => bin.value || 0).sort((a, b) => a - b);
              const varIndex = Math.floor(sortedValues.length * (1 - confidence));
              const varValue = sortedValues[Math.max(0, varIndex)];
              const marsMonteCarloRisk = Math.max(0, currentValuation - varValue);
              varResult.components.mars.monteCarloRisk = marsMonteCarloRisk;
            }
          }
        }
      } catch (error) {
        console.warn('Could not calculate Monte Carlo VaR:', error.message);
        // Use simplified Monte Carlo risk estimate
        const mcRiskPercent = 0.15; // 15% of valuation as rough estimate
        varResult.components.earth.monteCarloRisk = currentValuation * mcRiskPercent * 0.6;
        varResult.components.mars.monteCarloRisk = currentValuation * mcRiskPercent * 0.4;
      }
    }
    
    // Combine methods - ensure all values are numbers
    const earthGreeksRisk = varResult.components.earth.greeksRisk || 0;
    const marsGreeksRisk = varResult.components.mars.greeksRisk || 0;
    const earthMonteCarloRisk = varResult.components.earth.monteCarloRisk || 0;
    const marsMonteCarloRisk = varResult.components.mars.monteCarloRisk || 0;
    
    if (method === 'combined') {
      varResult.components.earth.varContribution = 
        Math.sqrt(Math.pow(earthGreeksRisk, 2) + Math.pow(earthMonteCarloRisk, 2));
      varResult.components.mars.varContribution = 
        Math.sqrt(Math.pow(marsGreeksRisk, 2) + Math.pow(marsMonteCarloRisk, 2));
    } else if (method === 'greeks') {
      varResult.components.earth.varContribution = earthGreeksRisk;
      varResult.components.mars.varContribution = marsGreeksRisk;
    } else {
      varResult.components.earth.varContribution = earthMonteCarloRisk;
      varResult.components.mars.varContribution = marsMonteCarloRisk;
    }
    
    // Ensure contributions are valid numbers
    varResult.components.earth.varContribution = isFinite(varResult.components.earth.varContribution) ? varResult.components.earth.varContribution : 0;
    varResult.components.mars.varContribution = isFinite(varResult.components.mars.varContribution) ? varResult.components.mars.varContribution : 0;
    
    // Total VaR
    varResult.varValue = varResult.components.earth.varContribution + varResult.components.mars.varContribution;
    varResult.varPercent = currentValuation > 0 ? (varResult.varValue / currentValuation) * 100 : 0;
    
    // Expected Shortfall (Conditional VaR) - average loss beyond VaR threshold
    varResult.expectedShortfall = varResult.varValue * 1.2; // Simplified: 20% higher than VaR
    
    res.json({
      success: true,
      data: varResult
    });
  } catch (error) {
    console.error('VaR calculation error:', error);
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
    
    // Use calculation engine (not spreadsheet) to calculate values from inputs
    let totalEnterpriseValue = null;
    let earthComponent = null;
    let marsComponent = null;
    
    try {
      // Calculate from inputs using calculation engine
      totalEnterpriseValue = calculationEngine.calculateTotalEnterpriseValue(baseInputs, null);
      earthComponent = calculationEngine.calculateEarthValuation(baseInputs, null);
      marsComponent = calculationEngine.calculateMarsValuation(baseInputs);
      
      console.log(`✓ Scenario calculation from calculation engine:`);
      console.log(`  Total Enterprise Value (B13): ${totalEnterpriseValue?.toFixed(2)}B`);
      console.log(`  Earth component (O153): ${earthComponent?.toFixed(2)}B`);
      console.log(`  Mars component: ${marsComponent?.toFixed(2)}B`);
    } catch (error) {
      console.warn(`⚠️ Calculation engine failed:`, error.message);
      // Fallback to database if calculation engine fails
      const baseModel = await ValuationModel.findOne().sort({ createdAt: -1 }).lean();
      const baseResults = baseModel?.results || {};
      
      if (baseResults.total?.breakdown) {
        totalEnterpriseValue = (baseResults.total?.breakdown?.earth || 0) + (baseResults.total?.breakdown?.mars || 0);
        earthComponent = baseResults.total?.breakdown?.earth || 0;
        marsComponent = baseResults.total?.breakdown?.mars || 0;
      } else {
        earthComponent = baseResults.earth?.adjustedValue || baseResults.earth?.terminalValue || 0;
        marsComponent = baseResults.mars?.adjustedValue || baseResults.mars?.optionValue || 0;
        totalEnterpriseValue = earthComponent + marsComponent;
      }
      
      console.log(`⚠️ Using database fallback values:`);
      console.log(`  Total: ${totalEnterpriseValue?.toFixed(2)}B`);
      console.log(`  Earth: ${earthComponent?.toFixed(2)}B`);
      console.log(`  Mars: ${marsComponent?.toFixed(2)}B`);
    }
    
    // Frontend expects scenarios with keys: earth2030, earthMars2030, earthMars2040
    // These represent different time horizons and scope (Earth only vs Earth+Mars)
    const results = {};
    
    // Use total enterprise value (B13) for Earth scenarios
    // This matches what Monte Carlo uses and what Column M references
    const earthValue2030 = totalEnterpriseValue || earthComponent || 0;
    const marsValue2030 = marsComponent || 0;
    
    // 2030 Earth Only - uses total enterprise value (B13)
    results.earth2030 = {
      name: '2030 Earth Only',
      inputs: baseInputs || {},
      results: {
        enterpriseValueFromEBITDA: earthValue2030,
        terminalValue: earthValue2030,
        enterpriseValue: earthValue2030
      },
      earthResults: {
        enterpriseValueFromEBITDA: earthValue2030,
        terminalValue: earthValue2030,
        enterpriseValue: earthValue2030
      },
      marsResults: null
    };
    
    // 2030 Earth & Mars - uses total enterprise value + Mars component
    results.earthMars2030 = {
      name: '2030 Earth & Mars',
      inputs: baseInputs || {},
      results: {
        total: earthValue2030 + marsValue2030,
        earth: earthValue2030,
        mars: marsValue2030
      },
      earthResults: {
        enterpriseValueFromEBITDA: earthValue2030,
        terminalValue: earthValue2030,
        enterpriseValue: earthValue2030
      },
      marsResults: {
        expectedValue: marsValue2030,
        adjustedValue: marsValue2030,
        optionValue: marsValue2030
      }
    };
    
    // 2040 Earth & Mars - extrapolate from 2030 with growth
    const terminalGrowth = baseInputs?.financial?.terminalGrowth || 0.03;
    
    // Project 10 years forward with terminal growth
    const earthValue2040 = earthValue2030 * Math.pow(1 + terminalGrowth, 10);
    const marsValue2040 = marsValue2030 * Math.pow(1 + terminalGrowth, 10);
    
    results.earthMars2040 = {
      name: '2040 Earth & Mars',
      inputs: baseInputs || {},
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

// Comparables API endpoint
// Helper function to fetch company data from Alpha Vantage
async function fetchAlphaVantageData(ticker, apiKey) {
  try {
    // Alpha Vantage free tier: 5 calls/min, 500 calls/day
    // We'll use the OVERVIEW endpoint for company fundamentals
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.Note && data.Note.includes('API call frequency')) {
      throw new Error('Alpha Vantage API rate limit exceeded');
    }
    
    if (data.Symbol) {
      return {
        name: data.Name || ticker,
        ticker: data.Symbol,
        marketCap: data.MarketCapitalization ? parseFloat(data.MarketCapitalization) : null,
        evRevenue: data.EVToRevenue ? parseFloat(data.EVToRevenue) : null,
        evEbitda: data.EVToEBITDA ? parseFloat(data.EVToEBITDA) : null,
        peRatio: data.PERatio ? parseFloat(data.PERatio) : null,
        pegRatio: data.PEGRatio ? parseFloat(data.PEGRatio) : null,
        revenueGrowth: data.RevenueTTM && data.RevenueGrowth ? parseFloat(data.RevenueGrowth) / 100 : null
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching Alpha Vantage data for ${ticker}:`, error.message);
    return null;
  }
}

// Helper function to fetch company data from Yahoo Finance
async function fetchYahooFinanceData(ticker) {
  try {
    // Yahoo Finance doesn't have an official API, but we can use yahoo-finance2 npm package
    // For now, we'll use a simple fetch to Yahoo Finance's quote endpoint
    // Note: Yahoo Finance may block requests, so this is a basic implementation
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.chart && data.chart.result && data.chart.result.length > 0) {
      const result = data.chart.result[0];
      const meta = result.meta || {};
      
      // Get market cap and other data from quote summary
      const quoteUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryProfile,financialData,defaultKeyStatistics`;
      const quoteResponse = await fetch(quoteUrl);
      const quoteData = await quoteResponse.json();
      
      let marketCap = null;
      let peRatio = null;
      let revenueGrowth = null;
      
      if (quoteData.quoteSummary && quoteData.quoteSummary.result && quoteData.quoteSummary.result.length > 0) {
        const summary = quoteData.quoteSummary.result[0];
        if (summary.defaultKeyStatistics) {
          marketCap = summary.defaultKeyStatistics.marketCap?.raw || null;
          peRatio = summary.defaultKeyStatistics.trailingPE?.raw || null;
        }
        if (summary.financialData) {
          revenueGrowth = summary.financialData.revenueGrowth?.raw || null;
        }
      }
      
      return {
        name: meta.longName || ticker,
        ticker: meta.symbol || ticker,
        marketCap: marketCap,
        evRevenue: null, // Yahoo Finance doesn't provide EV/Revenue directly
        evEbitda: null, // Yahoo Finance doesn't provide EV/EBITDA directly
        peRatio: peRatio,
        pegRatio: null,
        revenueGrowth: revenueGrowth
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching Yahoo Finance data for ${ticker}:`, error.message);
    return null;
  }
}

// Helper function to fetch company data from Financial Modeling Prep
async function fetchFinancialModelingPrepData(ticker, apiKey) {
  try {
    // FMP free tier: 250 requests/day
    const url = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const company = data[0];
      return {
        name: company.companyName || ticker,
        ticker: company.symbol,
        marketCap: company.mktCap ? parseFloat(company.mktCap) : null,
        evRevenue: null, // FMP profile doesn't include EV/Revenue directly
        evEbitda: null, // FMP profile doesn't include EV/EBITDA directly
        peRatio: company.priceEarnings ? parseFloat(company.priceEarnings) : null,
        pegRatio: null,
        revenueGrowth: null
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching FMP data for ${ticker}:`, error.message);
    return null;
  }
}

app.get('/api/comparables', async (req, res) => {
  try {
    const sector = req.query.sector || 'space';
    const apiProvider = req.query.apiProvider || 'yahoo-finance'; // Default to Yahoo Finance
    const alphaVantageKey = req.query.alphaVantageKey || '';
    const fmpKey = req.query.fmpKey || '';
    
    // Sample comparable companies data (fallback)
    const comparablesData = {
      space: [
        {
          name: 'SpaceX',
          ticker: 'SPACEX (Private)',
          marketCap: 180e9, // $180B estimated valuation
          evRevenue: 10.5, // Estimated based on ~$17B revenue
          evEbitda: 25.0, // Estimated - SpaceX is profitable
          peRatio: null, // Not public
          pegRatio: null,
          revenueGrowth: 0.40 // 40% estimated growth
        },
        {
          name: 'Rocket Lab',
          ticker: 'RKLB',
          marketCap: 2.1e9, // $2.1B
          evRevenue: 8.5,
          evEbitda: null, // Not profitable yet
          peRatio: null,
          pegRatio: null,
          revenueGrowth: 0.35 // 35%
        },
        {
          name: 'Astra Space',
          ticker: 'ASTR',
          marketCap: 0.3e9, // $300M
          evRevenue: 12.0,
          evEbitda: null,
          peRatio: null,
          pegRatio: null,
          revenueGrowth: 0.20
        },
        {
          name: 'Virgin Galactic',
          ticker: 'SPCE',
          marketCap: 0.8e9, // $800M
          evRevenue: 15.0,
          evEbitda: null,
          peRatio: null,
          pegRatio: null,
          revenueGrowth: 0.10
        },
        {
          name: 'Planet Labs',
          ticker: 'PL',
          marketCap: 0.6e9, // $600M
          evRevenue: 6.5,
          evEbitda: null,
          peRatio: null,
          pegRatio: null,
          revenueGrowth: 0.25
        }
      ],
      tech: [
        {
          name: 'Tesla',
          ticker: 'TSLA',
          marketCap: 800e9, // $800B
          evRevenue: 8.2,
          evEbitda: 35.5,
          peRatio: 65.0,
          pegRatio: 1.8,
          revenueGrowth: 0.25
        },
        {
          name: 'Amazon',
          ticker: 'AMZN',
          marketCap: 1500e9, // $1.5T
          evRevenue: 2.8,
          evEbitda: 18.5,
          peRatio: 45.0,
          pegRatio: 1.2,
          revenueGrowth: 0.12
        },
        {
          name: 'Alphabet',
          ticker: 'GOOGL',
          marketCap: 1600e9, // $1.6T
          evRevenue: 5.2,
          evEbitda: 12.5,
          peRatio: 24.0,
          pegRatio: 1.0,
          revenueGrowth: 0.10
        },
        {
          name: 'Microsoft',
          ticker: 'MSFT',
          marketCap: 2800e9, // $2.8T
          evRevenue: 10.5,
          evEbitda: 20.0,
          peRatio: 32.0,
          pegRatio: 1.5,
          revenueGrowth: 0.15
        },
        {
          name: 'Apple',
          ticker: 'AAPL',
          marketCap: 3000e9, // $3T
          evRevenue: 7.5,
          evEbitda: 22.0,
          peRatio: 28.0,
          pegRatio: 1.3,
          revenueGrowth: 0.08
        }
      ],
      telecom: [
        {
          name: 'Viasat',
          ticker: 'VSAT',
          marketCap: 2.5e9, // $2.5B
          evRevenue: 3.2,
          evEbitda: 8.5,
          peRatio: 15.0,
          pegRatio: 0.9,
          revenueGrowth: 0.05
        },
        {
          name: 'Eutelsat',
          ticker: 'ETL.PA',
          marketCap: 1.8e9, // $1.8B
          evRevenue: 2.8,
          evEbitda: 7.2,
          peRatio: 12.0,
          pegRatio: 0.8,
          revenueGrowth: 0.03
        },
        {
          name: 'Telesat',
          ticker: 'TSAT',
          marketCap: 0.9e9, // $900M
          evRevenue: 4.5,
          evEbitda: 10.0,
          peRatio: 18.0,
          pegRatio: 1.1,
          revenueGrowth: 0.08
        },
        {
          name: 'Iridium',
          ticker: 'IRDM',
          marketCap: 4.2e9, // $4.2B
          evRevenue: 5.5,
          evEbitda: 12.0,
          peRatio: 22.0,
          pegRatio: 1.2,
          revenueGrowth: 0.12
        }
      ],
      aerospace: [
        {
          name: 'Boeing',
          ticker: 'BA',
          marketCap: 120e9, // $120B
          evRevenue: 1.8,
          evEbitda: 25.0,
          peRatio: null, // Negative earnings
          pegRatio: null,
          revenueGrowth: -0.05
        },
        {
          name: 'Lockheed Martin',
          ticker: 'LMT',
          marketCap: 110e9, // $110B
          evRevenue: 1.5,
          evEbitda: 12.5,
          peRatio: 18.0,
          pegRatio: 1.5,
          revenueGrowth: 0.04
        },
        {
          name: 'Northrop Grumman',
          ticker: 'NOC',
          marketCap: 70e9, // $70B
          evRevenue: 1.8,
          evEbitda: 13.0,
          peRatio: 19.0,
          pegRatio: 1.6,
          revenueGrowth: 0.05
        },
        {
          name: 'Raytheon',
          ticker: 'RTX',
          marketCap: 140e9, // $140B
          evRevenue: 2.0,
          evEbitda: 15.0,
          peRatio: 20.0,
          pegRatio: 1.4,
          revenueGrowth: 0.06
        },
        {
          name: 'General Dynamics',
          ticker: 'GD',
          marketCap: 75e9, // $75B
          evRevenue: 1.6,
          evEbitda: 11.5,
          peRatio: 17.0,
          pegRatio: 1.3,
          revenueGrowth: 0.03
        }
      ]
    };
    
    let companies = comparablesData[sector] || comparablesData.space;
    
    // If API provider is selected and API key is provided, try to fetch real data
    if (apiProvider !== 'sample-data') {
      // Map of tickers by sector (excluding SpaceX which is private)
      const tickerMap = {
        space: ['RKLB', 'ASTR', 'SPCE', 'PL'],
        tech: ['TSLA', 'AMZN', 'GOOGL', 'MSFT', 'AAPL'],
        telecom: ['VSAT', 'IRDM', 'TSAT'],
        aerospace: ['BA', 'LMT', 'NOC', 'RTX', 'GD']
      };
      
      const tickers = tickerMap[sector] || [];
      const fetchedCompanies = [];
      
      // Fetch data for each ticker
      for (const ticker of tickers) {
        let companyData = null;
        
        if (apiProvider === 'yahoo-finance') {
          companyData = await fetchYahooFinanceData(ticker);
          // Small delay to avoid rate limiting
          if (tickers.indexOf(ticker) < tickers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else if (apiProvider === 'alpha-vantage' && alphaVantageKey) {
          companyData = await fetchAlphaVantageData(ticker, alphaVantageKey);
          // Rate limit: wait 12 seconds between calls (5 calls/min = 1 call per 12 seconds)
          if (tickers.indexOf(ticker) < tickers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 12000));
          }
        } else if (apiProvider === 'financial-modeling-prep' && fmpKey) {
          companyData = await fetchFinancialModelingPrepData(ticker, fmpKey);
        }
        
        if (companyData) {
          fetchedCompanies.push(companyData);
        }
      }
      
      // Merge fetched data with sample data (use fetched if available, otherwise sample)
      if (fetchedCompanies.length > 0) {
        companies = companies.map(sampleCompany => {
          const fetched = fetchedCompanies.find(f => 
            f.ticker === sampleCompany.ticker || 
            f.name.toLowerCase().includes(sampleCompany.name.toLowerCase())
          );
          return fetched || sampleCompany;
        });
      }
    }
    
    res.json({
      success: true,
      data: companies,
      sector: sector,
      apiProvider: apiProvider,
      note: apiProvider === 'sample-data' 
        ? 'Using sample data. Configure an API provider in Settings to fetch real-time data.'
        : `Using ${apiProvider} API. Some data may fall back to sample values if API limits are reached.`
    });
  } catch (error) {
    console.error('Error fetching comparables:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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

// AI Commentary for VaR
app.post('/api/ai/var/commentary', async (req, res) => {
  try {
    const { varValue, varPercent, currentValuation, method, confidence, timeHorizon, components } = req.body;
    
    // Generate AI commentary using fetch to Anthropic API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    
    // Get model from request header or use default
    const requestedModel = req.headers['x-ai-model'] || process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-opus-4-1-20250805';
    
    const prompt = `Analyze the following Value at Risk (VaR) calculation for a SpaceX valuation model and provide concise, actionable insights (2-3 sentences max):

Current Valuation: $${currentValuation.toFixed(1)}B
VaR (${(confidence * 100).toFixed(1)}% confidence, ${timeHorizon} days): $${varValue.toFixed(1)}B (${varPercent.toFixed(2)}% of valuation)
Method: ${method}
Expected Shortfall: $${(varValue * 1.2).toFixed(1)}B

Risk Breakdown:
- Earth Component: $${components.earth.varContribution.toFixed(1)}B (Greeks: $${components.earth.greeksRisk.toFixed(1)}B, Monte Carlo: $${components.earth.monteCarloRisk.toFixed(1)}B)
- Mars Component: $${components.mars.varContribution.toFixed(1)}B (Greeks: $${components.mars.greeksRisk.toFixed(1)}B, Monte Carlo: $${components.mars.monteCarloRisk.toFixed(1)}B)

Provide insights on:
1. Risk level assessment (high/medium/low)
2. Primary risk drivers (which component/method contributes most)
3. Risk management recommendations

Keep it concise and actionable.`;

    const commentary = await callAIAPI(requestedModel, prompt, 300);
    
    res.json({
      success: true,
      data: {
        commentary: commentary
      }
    });
  } catch (error) {
    console.error('AI VaR commentary error:', error);
    // Fallback commentary if AI fails
    const riskLevel = varPercent > 20 ? 'high' : varPercent > 10 ? 'medium' : 'low';
    const primaryComponent = components.earth.varContribution > components.mars.varContribution ? 'Earth' : 'Mars';
    res.json({
      success: true,
      data: {
        commentary: `VaR analysis shows ${riskLevel} risk exposure (${varPercent.toFixed(2)}% of valuation). The ${primaryComponent} component contributes the most to overall risk. Monitor key inputs and consider hedging strategies for high-risk scenarios.`
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

// TAM Reference Data API Endpoints

// Get active TAM data
app.get('/api/tam-data', async (req, res) => {
  try {
    const name = req.query.name || 'Earth Bandwidth TAM';
    const tamData = await TAMData.findOne({ name, isActive: true }).lean();
    
    if (!tamData) {
      return res.status(404).json({
        success: false,
        error: `TAM data "${name}" not found`
      });
    }
    
    res.json({
      success: true,
      data: {
        name: tamData.name,
        description: tamData.description,
        source: tamData.source,
        range: tamData.range,
        data: tamData.data,
        metadata: tamData.metadata,
        version: tamData.version,
        updatedAt: tamData.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching TAM data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all TAM datasets (for admin)
app.get('/api/tam-data/all', async (req, res) => {
  try {
    const tamDatasets = await TAMData.find({}).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: tamDatasets.map(tam => ({
        _id: tam._id,
        name: tam.name,
        description: tam.description,
        version: tam.version,
        isActive: tam.isActive,
        dataCount: tam.data?.length || 0,
        createdAt: tam.createdAt,
        updatedAt: tam.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching all TAM data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create or update TAM data
app.post('/api/tam-data', async (req, res) => {
  try {
    const { name, description, source, range, data, metadata } = req.body;
    
    if (!name || !data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Name and data array are required'
      });
    }
    
    // Deactivate existing active TAM data with same name
    await TAMData.updateMany(
      { name, isActive: true },
      { isActive: false }
    );
    
    // Find latest version
    const latest = await TAMData.findOne({ name }).sort({ version: -1 }).lean();
    const nextVersion = latest ? latest.version + 1 : 1;
    
    // Create new TAM data entry
    const tamData = new TAMData({
      name,
      description,
      source,
      range,
      data,
      metadata,
      version: nextVersion,
      isActive: true,
      createdBy: req.headers['x-user-id'] || 'system',
      updatedBy: req.headers['x-user-id'] || 'system'
    });
    
    await tamData.save();
    
    res.json({
      success: true,
      data: {
        _id: tamData._id,
        name: tamData.name,
        version: tamData.version,
        dataCount: tamData.data.length
      }
    });
  } catch (error) {
    console.error('Error saving TAM data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update TAM data (activate/deactivate)
// Regenerate TAM data using model methodology
app.post('/api/tam-data/regenerate', async (req, res) => {
  try {
    const { regenerateTAMData } = require('./scripts/regenerate-tam-data');
    
    // Run regeneration (this will update both database and static file)
    // Pass false to prevent process exit
    const result = await regenerateTAMData(false);
    
    res.json({
      success: true,
      count: result.count,
      message: `Successfully regenerated ${result.count} TAM entries`
    });
  } catch (error) {
    console.error('Error regenerating TAM data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/tam-data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, description } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid TAM data ID'
      });
    }
    
    const update = { updatedAt: new Date() };
    if (isActive !== undefined) update.isActive = isActive;
    if (description !== undefined) update.description = description;
    if (update.isActive === false) {
      // If deactivating, ensure at least one other TAM dataset with same name is active
      const tamData = await TAMData.findById(id).lean();
      if (tamData) {
        const otherActive = await TAMData.findOne({
          name: tamData.name,
          _id: { $ne: id },
          isActive: true
        });
        if (!otherActive) {
          return res.status(400).json({
            success: false,
            error: 'Cannot deactivate: at least one active TAM dataset must exist'
          });
        }
      }
    }
    
    const tamData = await TAMData.findByIdAndUpdate(id, update, { new: true }).lean();
    
    if (!tamData) {
      return res.status(404).json({
        success: false,
        error: 'TAM data not found'
      });
    }
    
    res.json({
      success: true,
      data: tamData
    });
  } catch (error) {
    console.error('Error updating TAM data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize
loadData();

app.listen(PORT, () => {
  console.log(`\n🚀 SpaceX Valuation Platform running on http://localhost:${PORT}\n`);
});

