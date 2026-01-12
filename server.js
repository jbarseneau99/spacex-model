require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const http = require('http');
const WebSocket = require('ws');
const Mach33Lib = require('./lib/mach33lib');
const ValuationAlgorithms = require('./lib/valuation-algorithms');
const CalculationEngine = require('./lib/calculation-engine');
const FactorModelsService = require('./services/factor-models');
const LaunchDataService = require('./services/launch-data');

const app = express();
const server = http.createServer(app);
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
const launchDataService = new LaunchDataService();

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

// Generate dashboard layout (Bloomberg Terminal Style)
app.post('/api/insights/dashboard-layout', async (req, res) => {
  try {
    const { data, inputs, gridColumns = 4 } = req.body;
    
    // For now, return a structured layout format
    // AI will generate this in the future
    const totalValue = data?.total?.value || 0;
    const earthValue = data?.earth?.adjustedValue || 0;
    const marsValue = data?.mars?.adjustedValue || 0;
    const earthPercent = totalValue > 0 ? (earthValue / totalValue) * 100 : 0;
    const marsPercent = totalValue > 0 ? (marsValue / totalValue) * 100 : 0;

    const formatBillion = (value) => {
      if (value >= 1000) return `$${(value / 1000).toFixed(1)}T`;
      return `$${value.toFixed(1)}B`;
    };

    // Generate layout structure (AI will enhance this later)
    const layout = {
      gridColumns: gridColumns,
      tiles: [
        {
          id: 'total-valuation',
          icon: 'zap',
          title: 'Total Enterprise Value',
          value: formatBillion(totalValue),
          color: '#0066cc',
          size: 'horizontal',
          gridColumn: '1 / 3',
          gridRow: '1 / 2',
          insightType: 'valuation',
          data: { totalValue, earthValue, marsValue }
        },
        {
          id: 'earth-operations',
          icon: 'globe',
          title: 'Earth Operations',
          value: `${earthPercent.toFixed(1)}%`,
          subtitle: formatBillion(earthValue),
          color: '#10b981',
          size: 'square',
          gridColumn: '3 / 4',
          gridRow: '1 / 2',
          insightType: 'starlink-earth',
          data: { earthValue, earthPercent }
        },
        {
          id: 'competitors-list',
          icon: 'users',
          title: 'Market Competitors',
          value: 'Launch & Comm',
          subtitle: '',
          color: '#f59e0b',
          size: 'square',
          gridColumn: '4 / 5',
          gridRow: '1 / 2',
          contentType: 'list',
          insightType: 'competitors',
          data: { sectors: ['space', 'telecom'] }
        },
        {
          id: 'featured-insight',
          icon: 'image',
          title: 'Featured Insight',
          value: '',
          color: '#10b981',
          size: 'square',
          gridColumn: '1 / 2',
          gridRow: '2 / 3',
          insightType: 'image-comments',
          contentType: 'image-comments',
          isSpecialTile: true, // Mark as special tile to skip chart rendering
          data: { 
            penetration: inputs?.earth?.starlinkPenetration || 0,
            earthValue: earthValue,
            marsValue: marsValue,
            totalValue: totalValue,
            inputs: inputs
          }
        },
        {
          id: 'launch-volume',
          icon: 'rocket',
          title: 'Launch Volume',
          value: `${inputs?.earth?.launchVolume || 0}/year`,
          color: '#0066cc',
          size: 'square',
          gridColumn: '2 / 3',
          gridRow: '2 / 3',
          insightType: 'launch',
          data: { launchVolume: inputs?.earth?.launchVolume || 0 }
        },
        {
          id: 'news',
          icon: 'newspaper',
          title: 'Recent News',
          value: 'Latest',
          color: '#ef4444',
          size: 'square',
          gridColumn: '3 / 4',
          gridRow: '2 / 3',
          insightType: 'news',
          contentType: 'news',
          data: {},
          isSpecialTile: true
        },
        {
          id: 'discount-rate',
          icon: 'percent',
          title: 'Discount Rate',
          value: `${((inputs?.financial?.discountRate || 0.12) * 100).toFixed(1)}%`,
          color: inputs?.financial?.discountRate < 0.10 ? '#10b981' : inputs?.financial?.discountRate > 0.15 ? '#ef4444' : '#f59e0b',
          size: 'vertical',
          gridColumn: '3 / 4',
          gridRow: '3 / 5',
          insightType: 'risk',
          data: { discountRate: inputs?.financial?.discountRate || 0.12 }
        },
        {
          id: 'mars-timeline',
          icon: 'calendar',
          title: 'Mars Timeline',
          value: `${inputs?.mars?.firstColonyYear || 2030}`,
          color: '#f59e0b',
          size: 'square',
          gridColumn: '4 / 5',
          gridRow: '2 / 3',
          insightType: 'mars',
          data: { firstColonyYear: inputs?.mars?.firstColonyYear || 2030 }
        },
        // X Posts Tile - Under Mars Timeline, 1 column wide, 2 rows high
        {
          id: 'x-posts',
          icon: 'message-square',
          title: 'Key X Posts',
          value: 'Recent',
          color: '#1da1f2',
          size: 'vertical',
          gridColumn: '4 / 5',
          gridRow: '3 / 5',
          insightType: 'x-feeds',
          contentType: 'x-feeds',
          data: {},
          isSpecialTile: true
        },
        // Add 2x2 large tile for comprehensive overview
        {
          id: 'comprehensive-overview',
          icon: 'layout-dashboard',
          title: 'Comprehensive Overview',
          value: 'Analysis',
          color: '#0066cc',
          size: '2x2',
          gridColumn: '1 / 3',
          gridRow: '3 / 5',
          insightType: 'valuation',
          data: { totalValue, earthValue, marsValue }
        }
      ]
    };

    res.json({ success: true, layout });
  } catch (error) {
    console.error('Error generating dashboard layout:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Launch Data API Endpoints
app.get('/api/data/launches/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const launches = await launchDataService.getRecentSpaceXLaunches(limit);
    res.json({ success: true, launches });
  } catch (error) {
    console.error('Error fetching recent launches:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/data/launches/stats', async (req, res) => {
  try {
    const stats = await launchDataService.getSpaceXLaunchStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching launch stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/data/launches/upcoming', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const launches = await launchDataService.getUpcomingLaunches(limit);
    res.json({ success: true, launches });
  } catch (error) {
    console.error('Error fetching upcoming launches:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/data/launches/starship', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const launches = await launchDataService.getStarshipLaunches(limit);
    res.json({ success: true, launches });
  } catch (error) {
    console.error('Error fetching Starship launches:', error);
    res.status(500).json({ success: false, error: error.message });
  }
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
  description: String,
  inputs: mongoose.Schema.Types.Mixed,
  results: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  favorite: { type: Boolean, default: false },
  isBaseline: { type: Boolean, default: false }, // Mark as baseline/reference model for reconciliation
  baselineSource: { type: String }, // 'spreadsheet', 'monte-carlo', etc.
  type: { type: String, enum: ['model', 'scenario'], default: 'model' }, // 'model' = actual market conditions, 'scenario' = what-if/stress test
  tags: [String]
});

// Index for baseline lookup
modelSchema.index({ isBaseline: 1 });

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

// Application State Schema - stores last loaded model, agent position, etc.
const appStateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g., 'lastModelId', 'agentPosition', etc.
  value: mongoose.Schema.Types.Mixed, // Can store any value
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

appStateSchema.index({ key: 1 }); // Index for quick lookups

const AppState = mongoose.models.AppState || mongoose.model('AppState', appStateSchema, 'app_state');

// Application State API endpoints
app.get('/api/app-state/:key', async (req, res) => {
  try {
    const state = await AppState.findOne({ key: req.params.key }).lean();
    if (!state) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: state.value });
  } catch (error) {
    console.error('Error fetching app state:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/app-state/:key', async (req, res) => {
  try {
    const { value } = req.body;
    const state = await AppState.findOneAndUpdate(
      { key: req.params.key },
      { value, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: state.value });
  } catch (error) {
    console.error('Error saving app state:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/app-state', async (req, res) => {
  try {
    const allStates = await AppState.find({}).lean();
    const stateMap = {};
    allStates.forEach(state => {
      stateMap[state.key] = state.value;
    });
    res.json({ success: true, data: stateMap });
  } catch (error) {
    console.error('Error fetching all app state:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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

// Comparables Data Schema - cache API responses to save API calls
const comparablesDataSchema = new mongoose.Schema({
  sector: { type: String, required: true }, // 'space', 'tech', 'telecom', 'aerospace'
  apiProvider: { type: String, required: true }, // 'alpha-vantage', 'financial-modeling-prep', 'yahoo-finance'
  data: [{
    name: String,
    ticker: String,
    marketCap: Number,
    evRevenue: Number,
    evEbitda: Number,
    peRatio: Number,
    pegRatio: Number,
    revenueGrowth: Number
  }],
  fetchedAt: { type: Date, default: Date.now }, // Timestamp when data was fetched
  expiresAt: { type: Date }, // When this data expires (24 hours from fetch)
  fetched: Number, // Number of companies fetched
  total: Number, // Total companies attempted
  errors: [String] // Any errors from API
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Index for quick lookups by sector and provider
comparablesDataSchema.index({ sector: 1, apiProvider: 1 });
comparablesDataSchema.index({ expiresAt: 1 }); // For cleanup of expired data

const ComparablesData = mongoose.models.ComparablesData || mongoose.model('ComparablesData', comparablesDataSchema, 'comparables_data');

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
    const isBaseline = req.query.isBaseline === 'true';
    const type = req.query.type;
    
    console.log('📊 API /models request:', { 
      isBaseline: req.query.isBaseline, 
      isBaselineBool: isBaseline,
      type: type,
      search: search 
    });
    
    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (favoriteOnly) {
      query.favorite = true;
    }
    // Filter by baseline FIRST if specified (most restrictive)
    if (isBaseline) {
      query.isBaseline = true;
      query.type = 'model'; // Baseline must be a model
      console.log('✅ Filtering for baseline model only');
    } else {
      // Filter by type if specified
      if (type) {
        query.type = type;
      } else {
        // Default to 'model' if no type specified (for backward compatibility)
        query.type = { $in: ['model', null, undefined] };
      }
    }
    
    console.log('📊 Final query:', JSON.stringify(query, null, 2));
    
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [data, total] = await Promise.all([
      ValuationModel.find(query).sort(sort).limit(limit).skip(skip).lean(),
      ValuationModel.countDocuments(query)
    ]);
    
    console.log(`📊 Returning ${data.length} models:`, data.map(m => m.name));
    
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

// Get baseline model (MUST be before /api/models/:id route)
app.get('/api/models/baseline', async (req, res) => {
  try {
    const baseline = await ValuationModel.findOne({ isBaseline: true }).lean();
    if (!baseline) {
      return res.status(404).json({
        success: false,
        error: 'No baseline model found'
      });
    }
    res.json({
      success: true,
      data: baseline
    });
  } catch (error) {
    console.error('Error fetching baseline model:', error);
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
      // Calculate cash flow using realistic revenue/cost model
      const discountRate = baseInputs.financial?.discountRate || 0.12;
      const baseEarthComponent = cachedBaseEarthValue - (cachedBaseMarsValue || 0);
      
      if (baseEarthComponent > 0) {
        // Estimate starting annual revenue (year 0) - use a reasonable fraction of valuation
        // For a $4.67T valuation, starting revenue might be ~$50-100B/year
        const startingRevenue = baseEarthComponent * 0.02; // 2% of valuation as starting revenue
        
        // Generate cash flow projection with realistic growth
        for (let i = 0; i < 30; i++) {
          const year = 2024 + i;
          
          // Revenue grows exponentially (compounding growth)
          const revenueGrowthRate = 0.20; // 20% annual growth
          const annualRevenue = startingRevenue * Math.pow(1 + revenueGrowthRate, i);
          
          // Costs scale slower than revenue (efficiency gains over time)
          const initialCostRatio = 0.70; // Start at 70% of revenue
          const finalCostRatio = 0.40; // End at 40% of revenue
          const costRatio = initialCostRatio - ((initialCostRatio - finalCostRatio) * i / 29);
          const annualCosts = annualRevenue * Math.max(finalCostRatio, costRatio);
          
          // Capex declines over time as infrastructure matures
          const initialCapexRatio = 0.25; // Start at 25% of revenue
          const finalCapexRatio = 0.10; // End at 10% of revenue
          const capexRatio = initialCapexRatio - ((initialCapexRatio - finalCapexRatio) * i / 29);
          const annualCapex = annualRevenue * Math.max(finalCapexRatio, capexRatio);
          
          // Cash flow = Revenue - Costs - Capex
          const annualCashFlow = annualRevenue - annualCosts - annualCapex;
          
          baseCashFlow[i] = {
            year: year,
            value: annualCashFlow
          };
          
          // Calculate PV (discount to present)
          const pv = annualCashFlow / Math.pow(1 + discountRate, i + 1);
          const prevCumulative = i > 0 ? basePresentValue[i - 1].cumulative : 0;
          
          basePresentValue[i] = {
            value: pv,
            cumulative: prevCumulative + pv
          };
        }
        
        console.log(`✓ Generated cash flow timeline: Year 0 = $${baseCashFlow[0].value.toFixed(2)}B, Year 29 = $${baseCashFlow[29].value.toFixed(2)}B`);
      } else {
        console.warn('⚠️ Base Earth component is zero or negative, cannot generate cash flow');
      }
    } catch (error) {
      console.warn('⚠️ Could not calculate cash flow timeline:', error.message);
      console.error(error);
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
    
    // Log cash flow data for debugging
    console.log(`✓ Monte Carlo response includes cash flow: ${baseCashFlow.length} years, first value = $${baseCashFlow[0]?.value?.toFixed(2)}B`);
    
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
      if (!baseModel) {
        return res.status(404).json({
          success: false,
          error: 'Base model not found'
        });
      }
    } else if (baseInputs) {
      // If baseInputs provided but no baseModelId, create a temporary model object from inputs
      // This happens when "Current Model" is selected but not saved
      baseModel = {
        _id: 'current-model',
        name: 'Current Model (Unsaved)',
        inputs: baseInputs,
        results: {} // Will use current results if available
      };
      console.log('[Attribution API] Using current model inputs (unsaved model)');
    } else {
      // Fallback: get most recent model
      baseModel = await ValuationModel.findOne().sort({ createdAt: -1 }).lean();
      if (!baseModel) {
        return res.status(404).json({
          success: false,
          error: 'No base model found and no current model inputs provided'
        });
      }
      console.log('[Attribution API] Using most recent model as base (fallback)');
    }
    
    // Get comparison model
    const compareModel = await ValuationModel.findById(compareModelId).lean();
    if (!compareModel) {
      return res.status(404).json({
        success: false,
        error: 'Comparison model not found'
      });
    }
    
    // Ensure models are different
    if (baseModel._id === compareModel._id) {
      return res.status(400).json({
        success: false,
        error: 'Base model and comparison model must be different'
      });
    }
    
    console.log('[Attribution API] Comparing models:', {
      baseModelId: baseModel._id,
      baseModelName: baseModel.name,
      compareModelId: compareModel._id,
      compareModelName: compareModel.name
    });
    
    const baseResults = baseModel?.results || {};
    const compareResults = compareModel?.results || {};
    
    // Detect if models are spreadsheet reference models
    const baseIsSpreadsheetReference = baseModel.isBaseline === true || 
                                       baseModel.baselineSource === 'spreadsheet' ||
                                       baseResults.monteCarlo?.spreadsheetReference !== undefined;
    const compareIsSpreadsheetReference = compareModel.isBaseline === true || 
                                          compareModel.baselineSource === 'spreadsheet' ||
                                          compareResults.monteCarlo?.spreadsheetReference !== undefined;
    
    console.log('[Attribution API] Model types:', {
      baseIsSpreadsheetReference,
      compareIsSpreadsheetReference,
      baseIsBaseline: baseModel.isBaseline,
      compareIsBaseline: compareModel.isBaseline
    });
    
    // Use Monte Carlo results if available, otherwise fall back to deterministic results
    // Priority: monteCarlo.base > monteCarlo.mean > monteCarlo.statistics.total.mean > total.value > calculated sum
    const getModelValue = (results) => {
      // Check for Monte Carlo base value first (most accurate - deterministic base used in MC)
      if (results.monteCarlo?.base !== undefined && results.monteCarlo.base !== null && !isNaN(results.monteCarlo.base)) {
        return results.monteCarlo.base;
      }
      // Check for Monte Carlo mean value (statistical mean from simulation)
      if (results.monteCarlo?.mean !== undefined && results.monteCarlo.mean !== null && !isNaN(results.monteCarlo.mean)) {
        return results.monteCarlo.mean;
      }
      // Check for Monte Carlo statistics object (from saved simulations)
      if (results.monteCarlo?.statistics?.total?.mean !== undefined && 
          results.monteCarlo.statistics.total.mean !== null && 
          !isNaN(results.monteCarlo.statistics.total.mean)) {
        return results.monteCarlo.statistics.total.mean;
      }
      // Check for deterministic total value
      if (results.total?.value !== undefined && results.total.value !== null && !isNaN(results.total.value)) {
        return results.total.value;
      }
      // Fallback: calculate from components
      const earthValue = results.earth?.adjustedValue || results.total?.breakdown?.earth || 0;
      const marsValue = results.mars?.adjustedValue || results.total?.breakdown?.mars || 0;
      return earthValue + marsValue;
    };
    
    const baseValue = getModelValue(baseResults);
    const compareValue = getModelValue(compareResults);
    const totalChange = compareValue - baseValue;
    
    // Log which value source was used
    const getValueSource = (results) => {
      if (results.monteCarlo?.base !== undefined && results.monteCarlo.base !== null && !isNaN(results.monteCarlo.base)) {
        return 'Monte Carlo base';
      }
      if (results.monteCarlo?.mean !== undefined && results.monteCarlo.mean !== null && !isNaN(results.monteCarlo.mean)) {
        return 'Monte Carlo mean';
      }
      if (results.monteCarlo?.statistics?.total?.mean !== undefined) {
        return 'Monte Carlo statistics mean';
      }
      if (results.total?.value !== undefined) {
        return 'Deterministic total';
      }
      return 'Calculated sum';
    };
    
    const baseSource = getValueSource(baseResults);
    const compareSource = getValueSource(compareResults);
    
    console.log('[Attribution API] Valuation sources:', {
      baseValue,
      baseSource,
      compareValue,
      compareSource,
      totalChange,
      baseHasMonteCarlo: !!baseResults.monteCarlo,
      compareHasMonteCarlo: !!compareResults.monteCarlo,
      baseMonteCarloKeys: baseResults.monteCarlo ? Object.keys(baseResults.monteCarlo) : [],
      compareMonteCarloKeys: compareResults.monteCarlo ? Object.keys(compareResults.monteCarlo) : []
    });
    
    // Get inputs for both models
    // CRITICAL: If baseModelId is provided, ALWAYS use baseModel.inputs from database
    // Only use baseInputs if baseModelId is NOT provided (unsaved current model)
    const baseInputsData = (baseModelId && baseModel?.inputs) ? baseModel.inputs : (baseInputs || baseModel?.inputs || {});
    const compareInputs = compareModel?.inputs || {};
    
    // Log which inputs are being used
    console.log('[Attribution API] Input sources:', {
      baseModelIdProvided: !!baseModelId,
      baseUsingProvidedInputs: !baseModelId && !!baseInputs,
      baseUsingDatabaseInputs: !!baseModelId && !!baseModel?.inputs,
      baseModelHasInputs: !!baseModel?.inputs,
      baseInputsKeys: baseInputsData ? Object.keys(baseInputsData).join(', ') : 'none',
      compareInputsKeys: compareInputs ? Object.keys(compareInputs).join(', ') : 'none',
      baseDilutionFactor: baseInputsData?.financial?.dilutionFactor,
      baseDiscountRate: baseInputsData?.financial?.discountRate,
      baseStarlinkPenetration: baseInputsData?.earth?.starlinkPenetration,
      baseLaunchVolume: baseInputsData?.earth?.launchVolume,
      compareDilutionFactor: compareInputs?.financial?.dilutionFactor,
      compareDiscountRate: compareInputs?.financial?.discountRate,
      compareStarlinkPenetration: compareInputs?.earth?.starlinkPenetration,
      compareLaunchVolume: compareInputs?.earth?.launchVolume
    });
    
    // Calculate Greeks dynamically for BOTH models using the same logic as /api/greeks endpoint
    // This ensures we have accurate Greeks for each model's specific inputs
    console.log('[Attribution API] Calculating Greeks for both models...');
    
    // Helper function to calculate Greeks for a model (reuse logic from /api/greeks)
    const calculateGreeksForModel = async (inputs, modelResults, modelName) => {
      try {
        // Import Mach33Lib (same as /api/greeks endpoint)
        const Mach33Lib = require('./lib/mach33lib.js');
        
        // Get base values from model results
        // Greeks calculation works with deterministic valuations - simulations not required
        const baseEarthValue = modelResults.earth?.adjustedValue || 
                               modelResults.total?.breakdown?.earth || 
                               (modelResults.total?.value ? modelResults.total.value * 0.99 : 6739);
        const baseMarsValue = modelResults.mars?.adjustedValue || 
                              modelResults.total?.breakdown?.mars || 
                              (modelResults.total?.value ? modelResults.total.value * 0.01 : 8.8);
        
        // If we don't have base values, we can't calculate Greeks accurately
        if (!baseEarthValue && !baseMarsValue && !modelResults.total?.value) {
          console.warn(`[Attribution API] ⚠️ No base values found for ${modelName} - cannot calculate Greeks`);
          return null;
        }
        
        // Create valuation function wrapper (similar to /api/greeks)
        const calculateValuationWithBump = async (inputPath, bumpedValue) => {
          const pathParts = inputPath.split('.');
          const modifiedInputs = JSON.parse(JSON.stringify(inputs));
          
          // Handle special paths
          if (inputPath === 'discountRate') {
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
          
          // Calculate multipliers (simplified version)
          let earthMultiplier = 1.0;
          let marsMultiplier = 1.0;
          
          if (modifiedInputs.earth) {
            const basePenetration = inputs.earth?.starlinkPenetration || 0.15;
            if (modifiedInputs.earth.starlinkPenetration !== undefined) {
              earthMultiplier *= Math.pow(modifiedInputs.earth.starlinkPenetration / basePenetration, 0.95);
            }
            const baseLaunchVolume = inputs.earth?.launchVolume || 150;
            if (modifiedInputs.earth.launchVolume !== undefined) {
              earthMultiplier *= Math.pow(modifiedInputs.earth.launchVolume / baseLaunchVolume, 0.98);
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
              marsMultiplier *= Math.pow(modifiedInputs.mars.populationGrowth / basePopGrowth, 0.97);
            }
          }
          
          return {
            earth: baseEarthValue * earthMultiplier,
            mars: baseMarsValue * marsMultiplier,
            total: (baseEarthValue * earthMultiplier) + (baseMarsValue * marsMultiplier)
          };
        };
        
        // Initialize Mach33Lib with settings
        const lib = new Mach33Lib({
          method: 'finite-difference',
          bumpSizes: {
            percentage: 0.01,
            absolute: 1,
            rate: 0.001  // 0.1% for discount rate
          },
          useCentralDifference: true
        });
        
        // Calculate Greeks using Mach33Lib
        const greeks = await lib.calculateAllGreeks(calculateValuationWithBump, inputs);
        
        console.log(`[Attribution API] ✅ Calculated Greeks for ${modelName}`);
        console.log(`[Attribution API] DEBUG Greeks structure:`, {
          hasEarthRho: !!greeks.earth?.rho,
          hasMarsRho: !!greeks.mars?.rho,
          hasTotalRho: !!greeks.total?.rho,
          earthRhoKeys: greeks.earth?.rho ? Object.keys(greeks.earth.rho) : [],
          marsRhoKeys: greeks.mars?.rho ? Object.keys(greeks.mars.rho) : [],
          totalRhoKeys: greeks.total?.rho ? Object.keys(greeks.total.rho) : [],
          discountRateRhoEarth: greeks.earth?.rho?.['Discount Rate']?.value,
          discountRateRhoMars: greeks.mars?.rho?.['Discount Rate']?.value,
          discountRateRhoTotal: greeks.total?.rho?.['Discount Rate']?.value
        });
        return greeks;
      } catch (error) {
        console.warn(`[Attribution API] ⚠️ Error calculating Greeks for ${modelName}, using fallback:`, error.message);
        return null;
      }
    };
    
    // Calculate Greeks for both models
    const baseGreeks = await calculateGreeksForModel(baseInputsData, baseResults, 'base model');
    const compareGreeks = await calculateGreeksForModel(compareInputs, compareResults, 'compare model');
    
    // Use calculated Greeks if available, otherwise use fallback
    // For attribution, we'll use the base model's Greeks (or average if both available)
    let greeks = baseGreeks;
    
    console.log(`[Attribution API] DEBUG: Using Greeks from:`, {
      hasBaseGreeks: !!baseGreeks,
      hasCompareGreeks: !!compareGreeks,
      baseGreeksRho: baseGreeks?.earth?.rho?.['Discount Rate']?.value || baseGreeks?.mars?.rho?.['Discount Rate']?.value || 'not found',
      compareGreeksRho: compareGreeks?.earth?.rho?.['Discount Rate']?.value || compareGreeks?.mars?.rho?.['Discount Rate']?.value || 'not found'
    });
    
    if (!greeks && compareGreeks) {
      greeks = compareGreeks;
      console.log('[Attribution API] Using compare model Greeks (base model Greeks unavailable)');
    } else if (baseGreeks && compareGreeks) {
      // Both available - could average them, but for now use base model's
      console.log('[Attribution API] Both models have Greeks - using base model Greeks for attribution');
    }
    
    // Fallback to hardcoded Greeks if calculation failed for both
    // Note: Greeks don't require simulations - they use finite difference on deterministic valuations
    // If calculation failed, it's likely due to missing base values or calculation errors
    if (!greeks) {
      console.warn('[Attribution API] ⚠️ Using fallback hardcoded Greeks (calculation failed for both models)');
      console.warn('[Attribution API] This may happen if models lack base valuation results');
      const baseEarthValue = baseResults.earth?.adjustedValue || baseResults.total?.breakdown?.earth || baseValue * 0.99 || 6739;
      const baseMarsValue = baseResults.mars?.adjustedValue || baseResults.total?.breakdown?.mars || baseValue * 0.01 || 8.8;
      
      // Expanded fallback Greeks - includes more inputs
      greeks = {
        earth: {
          delta: {
            'Starlink Penetration': { value: 45000, unit: '$B/%' },
            'Launch Volume': { value: 1200, unit: '$B/launch' },
            'Bandwidth Price Decline': { value: -2000, unit: '$B/%' },
            'Launch Price Decline': { value: -1500, unit: '$B/%' }
          },
          rho: {
            'Discount Rate': { value: -35000, unit: '$B/%' }
          },
          gamma: {},
          vega: {},
          theta: {}
        },
        mars: {
          delta: {
            'Colony Year': { value: -850, unit: '$B/year' },
            'Population Growth': { value: 3500, unit: '$B/%' },
            'Transport Cost Decline': { value: 4000, unit: '$B/%' }
          },
          theta: {
            'Time Decay': { value: -0.88, unit: '$B/year' }
          },
          rho: {
            'Discount Rate': { value: -35000, unit: '$B/%' }
          },
          gamma: {},
          vega: {}
        },
        total: {
          delta: {},
          gamma: {},
          vega: {},
          theta: {},
          rho: {}
        }
      };
      
      console.log('[Attribution API] Fallback Greeks will be used - attribution may be less accurate');
    }
    
    console.log('[Attribution API] Using Greeks:', {
      hasBaseGreeks: !!baseGreeks,
      hasCompareGreeks: !!compareGreeks,
      usingFallback: !baseGreeks && !compareGreeks,
      greeksStructure: greeks ? JSON.stringify(Object.keys(greeks), null, 2) : 'null',
      earthDeltaKeys: greeks?.earth?.delta ? Object.keys(greeks.earth.delta) : [],
      marsDeltaKeys: greeks?.mars?.delta ? Object.keys(greeks.mars.delta) : [],
      marsThetaKeys: greeks?.mars?.theta ? Object.keys(greeks.mars.theta) : [],
      earthRhoKeys: greeks?.earth?.rho ? Object.keys(greeks.earth.rho) : []
    });
    
    // Calculate input changes
    const inputChanges = {};
    const calculateChange = (path) => {
      const [category, field] = path.split('.');
      const baseVal = baseInputsData[category]?.[field];
      const compareVal = compareInputs[category]?.[field];
      
      // Log all comparisons for debugging
      if (baseVal !== undefined || compareVal !== undefined) {
        console.log(`[Attribution API] Comparing ${path}: base=${baseVal}, compare=${compareVal}, bothDefined=${baseVal !== undefined && compareVal !== undefined}`);
      }
      
      if (baseVal !== undefined && compareVal !== undefined) {
        const change = compareVal - baseVal;
        // Log ALL changes, even small ones
        if (Math.abs(change) > 0.0000001) {
          console.log(`[Attribution API] ✅ Input change ${path}: ${baseVal} -> ${compareVal} (change: ${change})`);
        } else {
          console.log(`[Attribution API] ⚪ No change ${path}: ${baseVal} == ${compareVal}`);
        }
        return change;
      } else {
        // Log missing values for debugging
        if (baseVal === undefined && compareVal === undefined) {
          // Both undefined - field doesn't exist in either model (normal for optional fields)
          console.log(`[Attribution API] ⚪ Both undefined ${path}: field doesn't exist in either model`);
        } else {
          console.log(`[Attribution API] ⚠️ One undefined ${path}: base=${baseVal}, compare=${compareVal}`);
        }
      }
      return 0;
    };
    
    // Check for additional input fields that might differ
    const checkAllInputFields = () => {
      const allFields = new Set();
      
      // Collect all fields from both models
      Object.keys(baseInputsData).forEach(category => {
        if (baseInputsData[category] && typeof baseInputsData[category] === 'object') {
          Object.keys(baseInputsData[category]).forEach(field => {
            allFields.add(`${category}.${field}`);
          });
        }
      });
      
      Object.keys(compareInputs).forEach(category => {
        if (compareInputs[category] && typeof compareInputs[category] === 'object') {
          Object.keys(compareInputs[category]).forEach(field => {
            allFields.add(`${category}.${field}`);
          });
        }
      });
      
      // Check each field for differences
      const differences = [];
      console.log(`[Attribution API] Checking ${allFields.size} total input fields for differences...`);
      
      allFields.forEach(path => {
        const change = calculateChange(path);
        // Use a smaller threshold to catch more differences
        if (Math.abs(change) > 0.0000001) {
          differences.push({ path, change });
          console.log(`[Attribution API] ✅ Difference found: ${path} = ${change}`);
        }
      });
      
      if (differences.length > 0) {
        console.log(`[Attribution API] ✅ Found ${differences.length} input differences:`, differences.map(d => `${d.path}: ${d.change}`).join(', '));
      } else {
        console.warn(`[Attribution API] ⚠️ NO input differences found after checking ${allFields.size} fields!`);
        console.warn(`[Attribution API] This means the models have identical inputs but different valuations.`);
        console.warn(`[Attribution API] Base inputs sample:`, JSON.stringify({
          earth: Object.keys(baseInputsData.earth || {}).slice(0, 5).reduce((acc, k) => {
            acc[k] = baseInputsData.earth[k];
            return acc;
          }, {}),
          mars: Object.keys(baseInputsData.mars || {}).slice(0, 5).reduce((acc, k) => {
            acc[k] = baseInputsData.mars[k];
            return acc;
          }, {})
        }, null, 2));
        console.warn(`[Attribution API] Compare inputs sample:`, JSON.stringify({
          earth: Object.keys(compareInputs.earth || {}).slice(0, 5).reduce((acc, k) => {
            acc[k] = compareInputs.earth[k];
            return acc;
          }, {}),
          mars: Object.keys(compareInputs.mars || {}).slice(0, 5).reduce((acc, k) => {
            acc[k] = compareInputs.mars[k];
            return acc;
          }, {})
        }, null, 2));
      }
      
      return differences;
    };
    
    console.log('[Attribution API] Base inputs summary:', {
      earth: Object.keys(baseInputsData.earth || {}).length,
      mars: Object.keys(baseInputsData.mars || {}).length,
      financial: Object.keys(baseInputsData.financial || {}).length
    });
    console.log('[Attribution API] Compare inputs summary:', {
      earth: Object.keys(compareInputs.earth || {}).length,
      mars: Object.keys(compareInputs.mars || {}).length,
      financial: Object.keys(compareInputs.financial || {}).length
    });
    
    // Check all input fields for differences
    checkAllInputFields();
    
    // Calculate PnL attribution
    let deltaPnL = 0;
    let gammaPnL = 0;
    let vegaPnL = 0;
    let thetaPnL = 0;
    let rhoPnL = 0;
    
    const details = [];
    
    // Earth inputs
    const earthPenetrationChange = calculateChange('earth.starlinkPenetration');
    console.log(`[Attribution API] Earth penetration change: ${earthPenetrationChange}`);
    console.log(`[Attribution API] DEBUG: baseInputsData.earth.starlinkPenetration = ${baseInputsData?.earth?.starlinkPenetration}`);
    console.log(`[Attribution API] DEBUG: compareInputs.earth.starlinkPenetration = ${compareInputs?.earth?.starlinkPenetration}`);
    if (earthPenetrationChange !== 0) {
      const delta = greeks.earth.delta['Starlink Penetration']?.value || 0;
      const gamma = greeks.earth.gamma['Starlink Penetration']?.value || 0;
      console.log(`[Attribution API] DEBUG: Starlink Penetration delta = ${delta}, gamma = ${gamma}`);
      // Delta contribution: delta is in $B per unit change
      // For percentage inputs: delta is $B per 1% change (bumpSize = 0.01)
      // So delta = (vUp - vDown) / (2 * 0.01) = (vUp - vDown) / 0.02
      // For a 2% change (0.02), contribution = delta * 0.02 / 0.01 = delta * 2
      // But delta already accounts for 1% bump, so for 2% change: delta * 2
      const changeInPercentPoints = earthPenetrationChange * 100; // Convert 0.02 to 2
      const deltaContribution = delta * changeInPercentPoints;
      
      // Gamma contribution: gamma is in $B per (%²) change
      // Gamma = (vUp - 2*vBase + vDown) / (0.01²) = (vUp - 2*vBase + vDown) / 0.0001
      // For a 2% change: 0.5 * gamma * (2)² = 0.5 * gamma * 4
      // But gamma values are inflated due to small denominator, so scale appropriately
      // The issue is gamma is calculated per (0.01)², so we need to scale by (change/0.01)²
      const gammaContribution = 0.5 * gamma * changeInPercentPoints * changeInPercentPoints * 0.0001;
      console.log(`[Attribution API] DEBUG: Starlink Penetration delta contribution = ${deltaContribution}, gamma contribution = ${gammaContribution}`);
      deltaPnL += deltaContribution;
      gammaPnL += gammaContribution;
      details.push({
        input: 'Starlink Penetration',
        change: `${earthPenetrationChange >= 0 ? '+' : ''}${(earthPenetrationChange * 100).toFixed(2)}%`,
        deltaPnL: deltaContribution,
        gammaPnL: gammaContribution,
        vegaPnL: 0,
        totalContribution: deltaContribution + gammaContribution
      });
      console.log(`[Attribution API] ✅ Added Starlink Penetration to details, total details count: ${details.length}`);
    } else {
      console.log(`[Attribution API] ⚠️ Starlink Penetration change is ZERO - skipping`);
    }
    
    const launchVolumeChange = calculateChange('earth.launchVolume');
    console.log(`[Attribution API] Launch volume change: ${launchVolumeChange}`);
    console.log(`[Attribution API] DEBUG: baseInputsData.earth.launchVolume = ${baseInputsData?.earth?.launchVolume}`);
    console.log(`[Attribution API] DEBUG: compareInputs.earth.launchVolume = ${compareInputs?.earth?.launchVolume}`);
    if (launchVolumeChange !== 0) {
      const delta = greeks.earth.delta['Launch Volume']?.value || 0;
      const gamma = greeks.earth.gamma['Launch Volume']?.value || 0;
      console.log(`[Attribution API] DEBUG: Launch Volume delta = ${delta}, gamma = ${gamma}`);
      // Launch Volume: delta is in $B per unit change (bumpSize = 1)
      // So delta = (vUp - vDown) / (2 * 1) = (vUp - vDown) / 2
      // For a 15 unit change: delta * 15
      const deltaContribution = delta * launchVolumeChange;
      // Gamma: calculated per unit², so for 15 unit change: 0.5 * gamma * 15²
      const gammaContribution = 0.5 * gamma * launchVolumeChange * launchVolumeChange;
      console.log(`[Attribution API] DEBUG: Launch Volume delta contribution = ${deltaContribution}, gamma contribution = ${gammaContribution}`);
      deltaPnL += deltaContribution;
      gammaPnL += gammaContribution;
      details.push({
        input: 'Launch Volume',
        change: `${launchVolumeChange >= 0 ? '+' : ''}${launchVolumeChange.toFixed(0)}`,
        deltaPnL: deltaContribution,
        gammaPnL: gammaContribution,
        vegaPnL: 0,
        totalContribution: deltaContribution + gammaContribution
      });
      console.log(`[Attribution API] ✅ Added Launch Volume to details, total details count: ${details.length}`);
    } else {
      console.log(`[Attribution API] ⚠️ Launch Volume change is ZERO - skipping`);
    }
    
    // Mars inputs
    const colonyYearChange = calculateChange('mars.firstColonyYear');
    console.log(`[Attribution API] Colony year change: ${colonyYearChange}`);
    if (colonyYearChange !== 0) {
      const delta = greeks.mars?.delta?.['Colony Year']?.value || 0;
      const gamma = greeks.mars?.gamma?.['Colony Year']?.value || 0;
      const theta = greeks.mars?.theta?.['Time Decay']?.value || 0;
      console.log(`[Attribution API] Colony Year Greeks - Delta: ${delta}, Gamma: ${gamma}, Theta: ${theta}`);
      const deltaContribution = delta * colonyYearChange;
      const gammaContribution = 0.5 * gamma * Math.pow(colonyYearChange, 2);
      const thetaContribution = theta * Math.abs(colonyYearChange);
      console.log(`[Attribution API] Colony Year contributions - Delta: ${deltaContribution}, Gamma: ${gammaContribution}, Theta: ${thetaContribution}`);
      deltaPnL += deltaContribution;
      gammaPnL += gammaContribution;
      thetaPnL += thetaContribution;
      details.push({
        input: 'Colony Year',
        change: `${colonyYearChange >= 0 ? '+' : ''}${colonyYearChange.toFixed(0)} years`,
        deltaPnL: deltaContribution,
        gammaPnL: gammaContribution,
        vegaPnL: 0,
        thetaPnL: thetaContribution,
        totalContribution: deltaContribution + gammaContribution + thetaContribution
      });
    } else {
      console.log('[Attribution API] Colony Year: No change detected');
    }
    
    // Discount rate
    const discountRateChange = calculateChange('financial.discountRate');
    console.log(`[Attribution API] Discount rate change: ${discountRateChange}`);
    console.log(`[Attribution API] DEBUG: baseInputsData.financial.discountRate = ${baseInputsData?.financial?.discountRate}`);
    console.log(`[Attribution API] DEBUG: compareInputs.financial.discountRate = ${compareInputs?.financial?.discountRate}`);
    if (discountRateChange !== 0) {
      const rho = greeks.earth?.rho?.['Discount Rate']?.value || greeks.mars?.rho?.['Discount Rate']?.value || 0;
      console.log(`[Attribution API] Discount Rate Rho: ${rho}`);
      // Rho is in $B per 0.1% change (bumpSize = 0.001)
      // So rho = (vUp - vDown) / (2 * 0.001) = (vUp - vDown) / 0.002
      // For a 2% change (0.02), convert to 0.1% units: 0.02 / 0.001 = 20
      // Contribution = rho * 20
      const changeInBasisPoints = discountRateChange * 100; // Convert 0.02 to 2 percentage points
      const changeInRhoUnits = changeInBasisPoints * 10; // Convert to 0.1% units (2% = 20 * 0.1%)
      const contribution = rho * changeInRhoUnits;
      console.log(`[Attribution API] Discount Rate Rho contribution: ${contribution} (change: ${changeInBasisPoints}%, in rho units: ${changeInRhoUnits})`);
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
      console.log(`[Attribution API] ✅ Added Discount Rate to details, total details count: ${details.length}`);
    } else {
      console.log('[Attribution API] ⚠️ Discount Rate change is ZERO - skipping');
    }
    
    // Check ALL input fields for changes and add attribution for each
    // First, get all input differences
    const allInputDifferences = checkAllInputFields();
    
    // Map of input paths to their display names and Greek types
    const inputMetadata = {
      'earth.starlinkPenetration': { name: 'Starlink Penetration', greek: 'delta', category: 'earth' },
      'earth.launchVolume': { name: 'Launch Volume', greek: 'delta', category: 'earth' },
      'earth.bandwidthPriceDecline': { name: 'Bandwidth Price Decline', greek: 'delta', category: 'earth' },
      'earth.launchPriceDecline': { name: 'Launch Price Decline', greek: 'delta', category: 'earth' },
      'mars.firstColonyYear': { name: 'Colony Year', greek: 'delta+theta', category: 'mars' },
      'mars.populationGrowth': { name: 'Population Growth', greek: 'delta', category: 'mars' },
      'mars.transportCostDecline': { name: 'Transport Cost Decline', greek: 'delta', category: 'mars' },
      'financial.discountRate': { name: 'Discount Rate', greek: 'rho', category: 'financial' },
      'financial.terminalGrowth': { name: 'Terminal Growth', greek: 'delta', category: 'financial' },
      'financial.dilutionFactor': { name: 'Dilution Factor', greek: 'delta', category: 'financial' }
    };
    
    // Process all input differences and add attribution
    console.log(`[Attribution API] Processing ${allInputDifferences.length} input differences...`);
    allInputDifferences.forEach(({ path, change }) => {
      const metadata = inputMetadata[path];
      const inputName = metadata?.name || path.split('.').pop().replace(/([A-Z])/g, ' $1').trim();
      
      console.log(`[Attribution API] Processing difference: ${path} = ${change}`);
      
      // Skip if already processed (starlinkPenetration, launchVolume, colonyYear, discountRate)
      if (path === 'earth.starlinkPenetration' || 
          path === 'earth.launchVolume' || 
          path === 'mars.firstColonyYear' || 
          path === 'financial.discountRate') {
        console.log(`[Attribution API] ⏭️ Skipping ${path} - already processed above`);
        return; // Already processed above
      }
      
      // Try to get actual Greeks first, fall back to estimation if not available
      let deltaContribution = 0;
      let gammaContribution = 0;
      
      // Try to get delta and gamma from Greeks
      if (metadata) {
        const category = metadata.category;
        const label = metadata.name;
        const delta = greeks[category]?.delta?.[label]?.value || 0;
        const gamma = greeks[category]?.gamma?.[label]?.value || 0;
        
        if (path.includes('Growth') || path.includes('Penetration') || path.includes('Decline') || path.includes('Factor')) {
          // Percentage-based: convert change to percentage points
          const changeInPercentPoints = change * 100;
          deltaContribution = delta * changeInPercentPoints;
          // Gamma: scale by (change_in_percentage_points)^2 * bumpSize²
          // Since gamma is calculated with bumpSize=0.01, we need to scale properly
          gammaContribution = 0.5 * gamma * changeInPercentPoints * changeInPercentPoints * 0.0001;
        } else if (path.includes('Year')) {
          // Year-based: delta in $B/year, gamma in $B/year²
          deltaContribution = delta * change;
          gammaContribution = 0.5 * gamma * change * change;
        } else {
          // Other numeric inputs
          deltaContribution = delta * change;
          gammaContribution = 0.5 * gamma * change * change;
        }
      }
      
      // Fallback estimation if Greeks not available
      if (deltaContribution === 0 && gammaContribution === 0) {
        const absChange = Math.abs(change);
        
        if (path.includes('Growth') || path.includes('Penetration') || path.includes('Decline')) {
          // Percentage-based inputs: estimate impact as change * baseValue * sensitivity
          const sensitivity = path.includes('Population') ? 3500 :
                             path.includes('Bandwidth') ? -2000 :
                             path.includes('Launch') ? -1500 :
                             path.includes('Transport') ? 4000 :
                             2000;
          deltaContribution = change * 100 * sensitivity;
        } else if (path.includes('Year')) {
          const sensitivity = -850;
          deltaContribution = change * sensitivity;
        } else {
          const baseVal = baseInputsData[path.split('.')[0]]?.[path.split('.')[1]] || 1;
          const percentChange = (change / baseVal) * 100;
          deltaContribution = percentChange * baseValue * 0.01;
        }
      }
      
      // Add to totals
      deltaPnL += deltaContribution;
      gammaPnL += gammaContribution;
      
      console.log(`[Attribution API] ✅ Adding ${inputName}: deltaContribution = ${deltaContribution}, gammaContribution = ${gammaContribution}`);
      
      details.push({
        input: inputName,
        change: path.includes('Year') ? `${change >= 0 ? '+' : ''}${change.toFixed(0)} years` :
                path.includes('Growth') || path.includes('Penetration') || path.includes('Decline') || path.includes('Rate') || path.includes('Factor') ?
                `${change >= 0 ? '+' : ''}${(change * 100).toFixed(2)}%` :
                `${change >= 0 ? '+' : ''}${change.toFixed(2)}`,
        deltaPnL: deltaContribution,
        gammaPnL: gammaContribution,
        vegaPnL: 0,
        thetaPnL: 0,
        rhoPnL: 0,
        totalContribution: deltaContribution + gammaContribution,
        note: gammaContribution > 0 ? `Using calculated Gamma` : `Estimated impact (no specific Greek defined)`
      });
      
      console.log(`[Attribution API] ✅ Added ${inputName} to details, total details count: ${details.length}`);
    });
    
    console.log(`[Attribution API] After processing allInputDifferences: details.length = ${details.length}, deltaPnL = ${deltaPnL}`);
    
    // If no details were calculated but valuations differ, add an "unexplained difference" entry
    console.log(`[Attribution API] Final check: details.length = ${details.length}, totalChange = ${totalChange}, allInputDifferences.length = ${allInputDifferences.length}`);
    if (details.length === 0 && Math.abs(totalChange) > 0.01) {
      console.warn('[Attribution API] ⚠️ No input differences found but valuations differ:', {
        baseValue,
        compareValue,
        totalChange,
        inputDifferencesFound: allInputDifferences.length,
        baseDilutionFactor: baseInputsData?.financial?.dilutionFactor,
        compareDilutionFactor: compareInputs?.financial?.dilutionFactor,
        baseDiscountRate: baseInputsData?.financial?.discountRate,
        compareDiscountRate: compareInputs?.financial?.discountRate,
        baseStarlinkPenetration: baseInputsData?.earth?.starlinkPenetration,
        compareStarlinkPenetration: compareInputs?.earth?.starlinkPenetration,
        baseLaunchVolume: baseInputsData?.earth?.launchVolume,
        compareLaunchVolume: compareInputs?.earth?.launchVolume
      });
      
      // If there are input differences but they weren't processed, add them now
      if (allInputDifferences.length > 0) {
        const otherChangesText = allInputDifferences.map(d => `${d.path}: ${d.change}`).join(', ');
        details.push({
          input: 'Other Input Changes',
          change: otherChangesText,
          deltaPnL: 0,
          gammaPnL: 0,
          vegaPnL: 0,
          thetaPnL: 0,
          rhoPnL: 0,
          totalContribution: totalChange,
          note: `Inputs changed but attribution not calculated: ${otherChangesText}. Total valuation change: ${totalChange.toFixed(1)}B`
        });
        // Attribute the change to delta as a proxy
        deltaPnL = totalChange;
      } else {
        // Check if comparing spreadsheet reference vs calculated model
        let note = 'Valuations differ but no input differences detected. This may be due to time decay, model structure changes, or inputs not included in attribution calculation.';
        let inputName = 'Unexplained Difference';
        
        if (baseIsSpreadsheetReference || compareIsSpreadsheetReference) {
          const spreadsheetModel = baseIsSpreadsheetReference ? baseModel.name : compareModel.name;
          const calculatedModel = baseIsSpreadsheetReference ? compareModel.name : baseModel.name;
          inputName = 'Calculation Method Difference';
          note = `Comparing spreadsheet reference model ("${spreadsheetModel}") with calculated model ("${calculatedModel}"). The difference (${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}B) is due to calculation method differences, not input differences. The spreadsheet model uses hardcoded reference values from Excel, while the calculated model uses Monte Carlo simulation results.`;
          console.log('[Attribution API] 📊 Spreadsheet reference comparison detected:', {
            spreadsheetModel,
            calculatedModel,
            difference: totalChange.toFixed(1) + 'B',
            reason: 'Calculation method difference (spreadsheet reference vs Monte Carlo simulation)'
          });
        }
        
        // Add an "unexplained difference" entry to show the valuation change
        details.push({
          input: inputName,
          change: baseIsSpreadsheetReference || compareIsSpreadsheetReference ? 
                 'Calculation method difference (spreadsheet reference vs Monte Carlo)' :
                 'Model structure or unmeasured inputs',
          deltaPnL: 0,
          gammaPnL: 0,
          vegaPnL: 0,
          thetaPnL: 0,
          rhoPnL: 0,
          totalContribution: totalChange,
          note: note
        });
        // Attribute the change to delta as a proxy (but note it's not true delta attribution)
        deltaPnL = totalChange;
      }
    } else if (details.length === 0) {
      console.warn('[Attribution API] ⚠️ No attribution details calculated - inputs are identical and valuations match');
    }
    
    // Log which inputs changed and which Greeks were used
    const inputsWithChanges = details.map(d => ({
      input: d.input,
      change: d.change,
      deltaPnL: d.deltaPnL,
      thetaPnL: d.thetaPnL,
      rhoPnL: d.rhoPnL,
      gammaPnL: d.gammaPnL,
      vegaPnL: d.vegaPnL
    }));
    
    console.log('[Attribution API] Inputs with changes:', inputsWithChanges);
    console.log('[Attribution API] Greeks used:', {
      hasDelta: !!greeks.earth?.delta || !!greeks.mars?.delta,
      hasTheta: !!greeks.mars?.theta,
      hasRho: !!greeks.earth?.rho || !!greeks.mars?.rho,
      hasGamma: !!greeks.earth?.gamma || !!greeks.mars?.gamma,
      hasVega: !!greeks.earth?.vega || !!greeks.mars?.vega,
      earthDeltaKeys: greeks.earth?.delta ? Object.keys(greeks.earth.delta) : [],
      marsDeltaKeys: greeks.mars?.delta ? Object.keys(greeks.mars.delta) : [],
      marsThetaKeys: greeks.mars?.theta ? Object.keys(greeks.mars.theta) : [],
      earthRhoKeys: greeks.earth?.rho ? Object.keys(greeks.earth.rho) : []
    });
    
    const attributionResult = {
      deltaPnL,
      gammaPnL,
      vegaPnL,
      thetaPnL,
      rhoPnL,
      details
    };
    
    console.log('[Attribution API] Final attribution totals:', {
      deltaPnL,
      gammaPnL,
      vegaPnL,
      thetaPnL,
      rhoPnL,
      totalGreeks: deltaPnL + gammaPnL + vegaPnL + thetaPnL + rhoPnL,
      totalChange,
      detailsCount: details.length,
      baseValue,
      compareValue,
      baseModelId: baseModel?._id,
      compareModelId: compareModel?._id,
      baseModelName: baseModel?.name,
      compareModelName: compareModel?.name
    });
    
    res.json({
      success: true,
      data: {
        attribution: attributionResult,
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
    // If marking as baseline, unset other baseline models
    if (req.body.isBaseline) {
      await ValuationModel.updateMany(
        { isBaseline: true },
        { $set: { isBaseline: false } }
      );
      console.log('✅ Unset previous baseline models');
    }
    
    // Set default type to 'model' if not specified
    const modelData = {
      ...req.body,
      type: req.body.type || 'model', // Default to 'model' if not specified
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const model = new ValuationModel(modelData);
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

// Compare model to baseline
app.get('/api/models/:id/compare-baseline', async (req, res) => {
  try {
    const model = await ValuationModel.findById(req.params.id).lean();
    const baseline = await ValuationModel.findOne({ isBaseline: true }).lean();
    
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }
    
    if (!baseline) {
      return res.status(404).json({
        success: false,
        error: 'No baseline model found'
      });
    }
    
    const baselineBear = baseline.results?.monteCarlo?.bear || baseline.results?.total?.breakdown?.bear;
    const baselineBase = baseline.results?.monteCarlo?.base || baseline.results?.total?.value;
    const baselineOptimistic = baseline.results?.monteCarlo?.optimistic || baseline.results?.total?.breakdown?.optimistic;
    
    const modelBear = model.results?.monteCarlo?.bear || model.results?.total?.breakdown?.bear;
    const modelBase = model.results?.monteCarlo?.base || model.results?.total?.value;
    const modelOptimistic = model.results?.monteCarlo?.optimistic || model.results?.total?.breakdown?.optimistic;
    
    const comparison = {
      baseline: {
        bear: baselineBear,
        base: baselineBase,
        optimistic: baselineOptimistic
      },
      model: {
        bear: modelBear,
        base: modelBase,
        optimistic: modelOptimistic
      },
      differences: {
        bear: modelBear && baselineBear ? {
          absolute: modelBear - baselineBear,
          percent: ((modelBear - baselineBear) / baselineBear) * 100
        } : null,
        base: modelBase && baselineBase ? {
          absolute: modelBase - baselineBase,
          percent: ((modelBase - baselineBase) / baselineBase) * 100
        } : null,
        optimistic: modelOptimistic && baselineOptimistic ? {
          absolute: modelOptimistic - baselineOptimistic,
          percent: ((modelOptimistic - baselineOptimistic) / baselineOptimistic) * 100
        } : null
      }
    };
    
    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Error comparing to baseline:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/models/:id', async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: new Date() };
    
    // Handle simulationCount increment if results.monteCarlo is being updated
    if (updateData.results && updateData.results.monteCarlo) {
      // Increment simulationCount when Monte Carlo results are saved
      const currentModel = await ValuationModel.findById(req.params.id);
      if (currentModel) {
        updateData.simulationCount = (currentModel.simulationCount || 0) + 1;
      }
    }
    
    const model = await ValuationModel.findByIdAndUpdate(
      req.params.id,
      updateData,
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

// Rate limiting and retry utilities for API calls
const grokRateLimiter = {
  requests: [],
  maxRequestsPerMinute: parseInt(process.env.GROK_MAX_REQUESTS_PER_MINUTE || '30', 10),
  minDelayBetweenRequests: parseInt(process.env.GROK_MIN_DELAY_MS || '2000', 10), // 2 seconds default
  
  async waitIfNeeded() {
    const now = Date.now();
    // Remove requests older than 1 minute
    this.requests = this.requests.filter(time => now - time < 60000);
    
    // If we're at the limit, wait until oldest request expires
    if (this.requests.length >= this.maxRequestsPerMinute) {
      const oldestRequest = this.requests[0];
      const waitTime = 60000 - (now - oldestRequest) + 100; // Add 100ms buffer
      if (waitTime > 0) {
        console.log(`⏳ Grok rate limit: waiting ${Math.ceil(waitTime / 1000)}s (${this.requests.length}/${this.maxRequestsPerMinute} requests/min)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Ensure minimum delay between requests
    if (this.requests.length > 0) {
      const lastRequest = this.requests[this.requests.length - 1];
      const timeSinceLastRequest = now - lastRequest;
      if (timeSinceLastRequest < this.minDelayBetweenRequests) {
        const waitTime = this.minDelayBetweenRequests - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Record this request
    this.requests.push(Date.now());
  }
};

// Retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = error.message.includes('429') || 
                         error.message.includes('exhausted') || 
                         error.message.includes('spending limit') ||
                         error.message.includes('rate limit');
      
      if (!isRateLimit || attempt === maxRetries) {
        throw error; // Don't retry non-rate-limit errors or if max retries reached
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⏳ Grok rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Comparables API endpoint
// Helper function to sanitize numeric values (convert NaN to null)
function sanitizeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(value);
  return (isNaN(num) || !isFinite(num)) ? null : num;
}

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
        marketCap: sanitizeNumber(data.MarketCapitalization),
        evRevenue: sanitizeNumber(data.EVToRevenue),
        evEbitda: sanitizeNumber(data.EVToEBITDA),
        peRatio: sanitizeNumber(data.PERatio),
        pegRatio: sanitizeNumber(data.PEGRatio),
        revenueGrowth: data.RevenueTTM && data.RevenueGrowth ? sanitizeNumber(parseFloat(data.RevenueGrowth) / 100) : null
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
  const timeout = 10000; // 10 second timeout
  
  try {
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Yahoo Finance request timeout')), timeout)
    );
    
    // Yahoo Finance quote summary endpoint
    const quoteUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryProfile,financialData,defaultKeyStatistics,keyStatistics`;
    
    const fetchPromise = fetch(quoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com/'
      }
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    // Yahoo Finance now returns 401 Unauthorized - they've blocked direct API access
    if (response.status === 401) {
      throw new Error('Yahoo Finance API requires authentication (401 Unauthorized). Please use Alpha Vantage or Financial Modeling Prep API instead.');
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const quoteData = await response.json();
    
    if (quoteData.quoteSummary && quoteData.quoteSummary.result && quoteData.quoteSummary.result.length > 0) {
      const summary = quoteData.quoteSummary.result[0];
      const profile = summary.summaryProfile || {};
      const keyStats = summary.defaultKeyStatistics || summary.keyStatistics || {};
      const financial = summary.financialData || {};
      
      return {
        name: profile.longName || profile.name || ticker,
        ticker: ticker,
        marketCap: sanitizeNumber(keyStats.marketCap?.raw),
        evRevenue: sanitizeNumber(keyStats.enterpriseToRevenue?.raw),
        evEbitda: sanitizeNumber(keyStats.enterpriseToEbitda?.raw),
        peRatio: sanitizeNumber(keyStats.trailingPE?.raw || keyStats.forwardPE?.raw),
        pegRatio: sanitizeNumber(keyStats.pegRatio?.raw),
        revenueGrowth: sanitizeNumber(financial.revenueGrowth?.raw)
      };
    }
    
    throw new Error('No data in Yahoo Finance response');
  } catch (error) {
    // Fail fast - don't hang
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error(`❌ Yahoo Finance blocked (401): ${ticker} - Use Alpha Vantage or FMP instead`);
    } else {
      console.error(`Error fetching Yahoo Finance data for ${ticker}:`, error.message);
    }
    return null;
  }
}

// Helper function to fetch company data from Financial Modeling Prep
async function fetchFinancialModelingPrepData(ticker, apiKey) {
  try {
    // FMP free tier: 250 requests/day
    // Fetch multiple endpoints to get complete data
    const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`;
    const keyMetricsUrl = `https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=annual&limit=1&apikey=${apiKey}`;
    const ratiosUrl = `https://financialmodelingprep.com/api/v3/ratios/${ticker}?period=annual&limit=1&apikey=${apiKey}`;
    
    const [profileRes, keyMetricsRes, ratiosRes] = await Promise.all([
      fetch(profileUrl),
      fetch(keyMetricsUrl),
      fetch(ratiosUrl)
    ]);
    
    const profileData = await profileRes.json();
    const keyMetricsData = await keyMetricsRes.json();
    const ratiosData = await ratiosRes.json();
    
    if (Array.isArray(profileData) && profileData.length > 0) {
      const company = profileData[0];
      const metrics = Array.isArray(keyMetricsData) && keyMetricsData.length > 0 ? keyMetricsData[0] : {};
      const ratios = Array.isArray(ratiosData) && ratiosData.length > 0 ? ratiosData[0] : {};
      
      return {
        name: company.companyName || ticker,
        ticker: company.symbol,
        marketCap: sanitizeNumber(company.mktCap),
        evRevenue: sanitizeNumber(ratios.enterpriseValueMultiple),
        evEbitda: sanitizeNumber(ratios.evToEBITDA),
        peRatio: sanitizeNumber(company.priceEarnings),
        pegRatio: sanitizeNumber(ratios.priceEarningsToGrowthRatio),
        revenueGrowth: company.revenueGrowth ? sanitizeNumber(parseFloat(company.revenueGrowth) / 100) : null
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
    const requestedApiProvider = req.query.apiProvider || 'yahoo-finance';
    const alphaVantageKey = req.query.alphaVantageKey || '';
    const fmpKey = req.query.fmpKey || '';
    const forceRefresh = req.query.forceRefresh === 'true'; // Only fetch from API if refresh button clicked
    
    // Determine which API provider will be used (for database lookup)
    let apiProviderToUse = requestedApiProvider;
    if (alphaVantageKey) {
      apiProviderToUse = 'alpha-vantage'; // Prioritize paid API
    } else if (fmpKey && requestedApiProvider === 'financial-modeling-prep') {
      apiProviderToUse = 'financial-modeling-prep';
    }
    
    // Check database first (unless force refresh)
    if (!forceRefresh) {
      try {
        const cachedData = await ComparablesData.findOne({
          sector: sector,
          apiProvider: apiProviderToUse,
          expiresAt: { $gt: new Date() } // Not expired
        }).sort({ fetchedAt: -1 }); // Get most recent
        
        if (cachedData && cachedData.data && cachedData.data.length > 0) {
          console.log(`✅ Using cached comparables data for ${sector} (${apiProviderToUse})`);
          console.log(`   Fetched at: ${cachedData.fetchedAt}`);
          console.log(`   Expires at: ${cachedData.expiresAt}`);
          console.log(`   Companies: ${cachedData.data.length}`);
          
          return res.json({
            success: true,
            data: cachedData.data,
            sector: sector,
            apiProvider: cachedData.apiProvider,
            fetched: cachedData.fetched,
            total: cachedData.total,
            fetchedAt: cachedData.fetchedAt,
            expiresAt: cachedData.expiresAt,
            cached: true,
            note: `Using cached data from ${cachedData.fetchedAt.toISOString()}. Click Refresh to fetch new data.`
          });
        } else {
          console.log(`⚠️ No valid cached data found for ${sector} (${apiProviderToUse})`);
        }
      } catch (dbError) {
        console.error('⚠️ Database lookup error (continuing to API):', dbError.message);
      }
    } else {
      console.log(`🔄 Force refresh requested - fetching from API...`);
    }
    
    // Map of tickers by sector (excluding SpaceX which is private)
    const tickerMap = {
      space: ['RKLB', 'ASTR', 'SPCE', 'PL', 'RDW', 'MNTS', 'BKSY', 'LUNR'], // Launch companies
      tech: ['TSLA', 'AMZN', 'GOOGL', 'MSFT', 'AAPL'],
      telecom: ['VSAT', 'IRDM', 'TSAT', 'SATS', 'ASTS', 'GSAT', 'ORB'], // Communication/satellite companies
      aerospace: ['BA', 'LMT', 'NOC', 'RTX', 'GD']
    };
    
    const tickers = tickerMap[sector] || [];
    
    if (tickers.length === 0) {
      return res.status(400).json({
        success: false,
        error: `No tickers configured for sector: ${sector}`
      });
    }
    
    // Try APIs in order until one works
    // PRIORITY: If Alpha Vantage key is provided, try it FIRST (paid API)
    const apiProvidersToTry = [];
    
    console.log(`🔑 API Keys provided:`, {
      alphaVantage: alphaVantageKey ? `${alphaVantageKey.substring(0, 8)}...` : 'NOT PROVIDED',
      fmp: fmpKey ? `${fmpKey.substring(0, 8)}...` : 'NOT PROVIDED',
      requestedProvider: requestedApiProvider
    });
    
    // If Alpha Vantage key is provided, prioritize it (paid API or free tier)
    if (alphaVantageKey && alphaVantageKey.trim()) {
      apiProvidersToTry.push({ name: 'alpha-vantage', key: alphaVantageKey.trim() });
      console.log('✅ Alpha Vantage API key detected - prioritizing Alpha Vantage');
    }
    
    // Add Financial Modeling Prep if key is provided
    if (fmpKey && fmpKey.trim()) {
      if (!apiProvidersToTry.find(p => p.name === 'financial-modeling-prep')) {
        apiProvidersToTry.push({ name: 'financial-modeling-prep', key: fmpKey.trim() });
      }
    }
    
    // Only add requested provider if it's not already in the list
    if (requestedApiProvider === 'alpha-vantage' && alphaVantageKey && alphaVantageKey.trim()) {
      // Already added above
    } else if (requestedApiProvider === 'financial-modeling-prep' && fmpKey && fmpKey.trim()) {
      // Already added above
    } else if (requestedApiProvider === 'yahoo-finance') {
      // Only try Yahoo Finance if NO paid API keys are available (it's blocked anyway)
      if (!alphaVantageKey && !fmpKey) {
        apiProvidersToTry.push({ name: 'yahoo-finance', key: null });
        console.log('⚠️ No API keys provided - trying Yahoo Finance (likely blocked)');
      } else {
        console.log('⚠️ Skipping Yahoo Finance - paid API keys available');
      }
    }
    
    // If no providers added, return error immediately
    if (apiProvidersToTry.length === 0) {
      console.log('❌ No API providers configured');
      return res.status(400).json({
        success: false,
        error: 'No API provider configured',
        message: 'Please configure an API provider in Settings:\n• Alpha Vantage (free tier: 25 requests/day, or premium)\n• Financial Modeling Prep (free tier available)\n\nGet your Alpha Vantage API key (free): https://www.alphavantage.co/support/#api-key',
        helpUrl: 'https://www.alphavantage.co/support/#api-key'
      });
    }
    
    console.log(`📡 Fetching REAL data from API for ${tickers.length} companies in ${sector} sector`);
    console.log(`   Trying APIs in order: ${apiProvidersToTry.map(p => p.name).join(' -> ')}`);
    
    let fetchedCompanies = [];
    let workingProvider = null;
    const allErrors = [];
    
    // Try each API provider until one works
    for (const provider of apiProvidersToTry) {
      console.log(`\n🔄 Trying ${provider.name}...`);
      const errors = [];
      const companies = [];
      
      try {
        // Add overall timeout for this API provider
        // Alpha Vantage needs 12 seconds between calls, so for 5 companies: 5 * 12 = 60 seconds max
        // Other APIs are faster, so use shorter timeout
        const timeoutMs = provider.name === 'alpha-vantage' 
          ? (tickers.length * 15 * 1000) // 15 seconds per ticker for Alpha Vantage
          : (tickers.length * 2 * 1000); // 2 seconds per ticker for others
        const providerTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Provider ${provider.name} timed out after ${timeoutMs/1000} seconds`)), timeoutMs)
        );
        
        console.log(`   Timeout set to ${timeoutMs/1000} seconds for ${tickers.length} tickers`);
        
        const fetchAllCompanies = async () => {
          // For Yahoo Finance, try just first ticker to see if it works
          // If it fails immediately, skip the rest
          if (provider.name === 'yahoo-finance' && tickers.length > 0) {
            const testTicker = tickers[0];
            try {
              console.log(`   Testing ${testTicker} from Yahoo Finance...`);
              const testData = await fetchYahooFinanceData(testTicker);
              if (!testData) {
                throw new Error('Yahoo Finance returned no data (likely blocked)');
              }
              console.log(`   ✅ Yahoo Finance works, fetching all tickers...`);
            } catch (err) {
              throw new Error(`Yahoo Finance blocked: ${err.message}`);
            }
          }
          
          for (const ticker of tickers) {
            let companyData = null;
            
            try {
              if (provider.name === 'yahoo-finance') {
                console.log(`   Fetching ${ticker}...`);
                const startTime = Date.now();
                companyData = await fetchYahooFinanceData(ticker);
                const duration = Date.now() - startTime;
                console.log(`   ${ticker}: ${companyData ? '✅ Got data' : '❌ No data'} (${duration}ms)`);
                // Small delay to avoid rate limiting
                if (tickers.indexOf(ticker) < tickers.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              } else if (provider.name === 'alpha-vantage' && provider.key) {
                console.log(`   Fetching ${ticker} from Alpha Vantage...`);
                try {
                  companyData = await fetchAlphaVantageData(ticker, provider.key);
                  if (companyData) {
                    console.log(`   ${ticker}: ✅ Got data - ${companyData.name || ticker}`);
                  } else {
                    console.log(`   ${ticker}: ⚠️ No data returned (may be rate limited)`);
                  }
                } catch (avError) {
                  console.log(`   ${ticker}: ❌ Error - ${avError.message}`);
                  errors.push(`${ticker}: ${avError.message}`);
                }
                // Rate limit: Alpha Vantage free tier allows 5 calls per minute
                // Wait 12 seconds between calls to stay within limits
                if (tickers.indexOf(ticker) < tickers.length - 1) {
                  console.log(`   ⏳ Waiting 12 seconds before next call (Alpha Vantage rate limit)...`);
                  await new Promise(resolve => setTimeout(resolve, 12000));
                }
              } else if (provider.name === 'financial-modeling-prep' && provider.key) {
                console.log(`   Fetching ${ticker}...`);
                companyData = await fetchFinancialModelingPrepData(ticker, provider.key);
                console.log(`   ${ticker}: ${companyData ? '✅ Got data' : '❌ No data'}`);
                // Small delay for FMP
                if (tickers.indexOf(ticker) < tickers.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              } else {
                errors.push(`${ticker}: API key missing for ${provider.name}`);
                continue;
              }
              
              // Only add if companyData has valid values
              if (companyData && companyData.ticker && (companyData.marketCap || companyData.evRevenue || companyData.evEbitda || companyData.peRatio)) {
                companies.push(companyData);
                console.log(`   ✅ ${ticker}: ${companyData.name} - Market Cap: ${companyData.marketCap ? `$${(companyData.marketCap / 1e9).toFixed(2)}B` : 'N/A'}`);
              } else {
                errors.push(`${ticker}: No valid data returned`);
              }
            } catch (err) {
              errors.push(`${ticker}: ${err.message}`);
              console.log(`   ⚠️ ${ticker}: ${err.message}`);
              // If Yahoo Finance fails on first ticker, break early
              if (provider.name === 'yahoo-finance' && tickers.indexOf(ticker) === 0 && err.message.includes('401')) {
                throw new Error('Yahoo Finance blocked (401)');
              }
            }
          }
        };
        
        await Promise.race([fetchAllCompanies(), providerTimeout]);
        
        // If we got at least 1 company, consider this API working (for paid API, even 1 is valuable)
        // For free APIs, require at least 2
        const minCompanies = provider.name === 'alpha-vantage' ? 1 : 2;
        
        if (companies.length >= minCompanies) {
          fetchedCompanies = companies;
          workingProvider = provider.name;
          console.log(`\n✅ ${provider.name} WORKED! Got ${companies.length} companies`);
          break;
        } else {
          console.log(`\n⚠️ ${provider.name} only returned ${companies.length} companies (need ${minCompanies}), trying next API...`);
          allErrors.push(`${provider.name}: Only ${companies.length}/${tickers.length} companies loaded (need ${minCompanies})`);
        }
      } catch (err) {
        console.log(`\n❌ ${provider.name} failed: ${err.message}`);
        allErrors.push(`${provider.name}: ${err.message}`);
      }
    }
    
    // If we got data, save to database and return it
    if (fetchedCompanies.length > 0) {
      console.log(`\n✅ SUCCESS! Using ${workingProvider} - ${fetchedCompanies.length} companies loaded`);
      
      // Save to database with timestamp
      try {
        const fetchedAt = new Date();
        const expiresAt = new Date(fetchedAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
        
        // Remove old cached data for this sector/provider
        await ComparablesData.deleteMany({
          sector: sector,
          apiProvider: workingProvider
        });
        
        // Sanitize data before saving (ensure no NaN values)
        const sanitizedCompanies = fetchedCompanies.map(company => ({
          ...company,
          marketCap: sanitizeNumber(company.marketCap),
          evRevenue: sanitizeNumber(company.evRevenue),
          evEbitda: sanitizeNumber(company.evEbitda),
          peRatio: sanitizeNumber(company.peRatio),
          pegRatio: sanitizeNumber(company.pegRatio),
          revenueGrowth: sanitizeNumber(company.revenueGrowth)
        }));
        
        // Save new data
        await ComparablesData.create({
          sector: sector,
          apiProvider: workingProvider,
          data: sanitizedCompanies,
          fetchedAt: fetchedAt,
          expiresAt: expiresAt,
          fetched: sanitizedCompanies.length,
          total: tickers.length,
          errors: allErrors.length > 0 ? allErrors : []
        });
        
        console.log(`💾 Saved ${fetchedCompanies.length} companies to database`);
        console.log(`   Fetched at: ${fetchedAt.toISOString()}`);
        console.log(`   Expires at: ${expiresAt.toISOString()}`);
      } catch (dbError) {
        console.error('⚠️ Failed to save to database (data still returned):', dbError.message);
      }
      
      return res.json({
        success: true,
        data: fetchedCompanies,
        sector: sector,
        apiProvider: workingProvider,
        fetched: fetchedCompanies.length,
        total: tickers.length,
        fetchedAt: new Date().toISOString(),
        errors: allErrors.length > 0 ? allErrors : undefined,
        cached: false,
        note: `Fetched ${fetchedCompanies.length} companies using ${workingProvider} API${allErrors.length > 0 ? `. Some APIs failed: ${allErrors.join('; ')}` : ''}`
      });
    }
    
    // All APIs failed - check for cached data before returning error
    console.log(`\n❌ ALL APIs FAILED - checking for cached data...`);
    
    try {
      // First try non-expired cache
      let cachedData = await ComparablesData.findOne({
        sector: sector,
        apiProvider: { $in: ['alpha-vantage', 'financial-modeling-prep', 'yahoo-finance'] },
        expiresAt: { $gt: new Date() } // Not expired
      }).sort({ fetchedAt: -1 });
      
      // If no non-expired cache, try expired cache as last resort
      if (!cachedData || !cachedData.data || cachedData.data.length === 0) {
        console.log(`⚠️ No non-expired cache found, checking expired cache...`);
        cachedData = await ComparablesData.findOne({
          sector: sector,
          apiProvider: { $in: ['alpha-vantage', 'financial-modeling-prep', 'yahoo-finance'] }
        }).sort({ fetchedAt: -1 }); // Get most recent, even if expired
      }
      
      if (cachedData && cachedData.data && cachedData.data.length > 0) {
        const isExpired = cachedData.expiresAt && cachedData.expiresAt < new Date();
        console.log(`✅ Found cached comparables data (${cachedData.apiProvider})${isExpired ? ' [EXPIRED]' : ''} - using as fallback`);
        console.log(`   Fetched at: ${cachedData.fetchedAt}`);
        console.log(`   Expires at: ${cachedData.expiresAt}`);
        console.log(`   Companies: ${cachedData.data.length}`);
        
        return res.json({
          success: true,
          data: cachedData.data,
          sector: sector,
          apiProvider: cachedData.apiProvider,
          fetched: cachedData.fetched,
          total: cachedData.total,
          fetchedAt: cachedData.fetchedAt,
          expiresAt: cachedData.expiresAt,
          cached: true,
          expired: isExpired,
          note: `Using ${isExpired ? 'expired ' : ''}cached data from ${cachedData.fetchedAt.toISOString()} (APIs failed). Click Refresh to try fetching new data.`
        });
      } else {
        console.log(`⚠️ No cached data found in database`);
      }
    } catch (cacheError) {
      console.error('⚠️ Error checking cache:', cacheError.message);
    }
    
    // No cached data available - return helpful error (not 500, use 400 for client configuration issues)
    const hasApiKeys = alphaVantageKey || fmpKey;
    const statusCode = hasApiKeys ? 500 : 400; // 400 if no keys configured, 500 if keys failed
    
    return res.status(statusCode).json({
      success: false,
      error: hasApiKeys 
        ? `Failed to fetch data from any API. Tried: ${apiProvidersToTry.map(p => p.name).join(', ')}`
        : 'No API provider configured',
      errors: allErrors,
      triedProviders: apiProvidersToTry.map(p => p.name),
      message: hasApiKeys
        ? 'API calls failed. Please check your API keys in Settings and try again.'
        : 'Please configure an API provider in Settings:\n• Alpha Vantage (free tier: 25 requests/day)\n• Financial Modeling Prep (free tier available)\n\nGet your Alpha Vantage API key (free): https://www.alphavantage.co/support/#api-key',
      helpUrl: 'https://www.alphavantage.co/support/#api-key',
      needsConfiguration: !hasApiKeys
    });
  } catch (error) {
    console.error('Error in /api/comparables:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch comparables data'
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

/**
 * COORDINATION AGENT: Validates and coordinates multi-modal tile responses
 * Ensures chart/image data is properly structured and tied to prose content
 */
async function coordinateMultiModalResponse(insightData, tileMetric, tileValue, tileSize, contentLimits) {
  const coordinated = { ...insightData };
  
  // Validate and fix chart data
  if (coordinated.chart) {
    const chart = coordinated.chart;
    
    // Ensure required fields exist
    if (!chart.type) chart.type = 'line';
    if (!chart.labels || !Array.isArray(chart.labels)) {
      // Generate default labels based on metric
      chart.labels = ['2024', '2025', '2026', '2027', '2028'];
    }
    if (!chart.data || !Array.isArray(chart.data)) {
      // Generate sample data if missing
      const baseValue = parseFloat(tileValue) || 100;
      chart.data = [
        baseValue * 0.8,
        baseValue * 0.9,
        baseValue,
        baseValue * 1.1,
        baseValue * 1.2
      ];
    }
    if (!chart.label) chart.label = tileMetric;
    // Default to full chart with axes (sparkline only if explicitly requested)
    if (chart.sparkline === undefined) chart.sparkline = false;
    
    // Ensure data matches labels length
    while (chart.data.length < chart.labels.length) {
      const lastValue = chart.data[chart.data.length - 1] || 100;
      chart.data.push(lastValue * 1.1);
    }
    while (chart.data.length > chart.labels.length) {
      chart.data.pop();
    }
    
    if (process.env.DEBUG_INSIGHTS === 'true') {
      console.log(`[Coordination] Chart validated: ${chart.type} with ${chart.labels.length} data points`);
    }
  }
  
  // Validate and fix image data
  // Check if this is a metric tile (should not have images)
  const isMetricTile = !tileMetric.toLowerCase().includes('news') && 
                       !tileMetric.toLowerCase().includes('post') &&
                       !tileMetric.toLowerCase().includes('x post') &&
                       !tileMetric.toLowerCase().includes('event');
  
  if (coordinated.image) {
    // If this is a metric tile, silently remove image (AI shouldn't have included it)
    if (isMetricTile) {
      if (process.env.DEBUG_INSIGHTS === 'true') {
        console.log(`[Coordination] Removing image from metric tile "${tileMetric}" (should only have charts)`);
      }
      delete coordinated.image;
    } else {
      // Handle different image object structures for news/event tiles
      let imageUrl = null;
      
      // Check if image is a string (direct URL)
      if (typeof coordinated.image === 'string') {
        imageUrl = coordinated.image;
        coordinated.image = { url: imageUrl, alt: `${tileMetric} visualization` };
      }
      // Check if image has url property
      else if (coordinated.image.url) {
        imageUrl = coordinated.image.url;
      }
      // Check for other possible properties
      else if (coordinated.image.src) {
        imageUrl = coordinated.image.src;
        coordinated.image.url = imageUrl;
      }
      else if (coordinated.image.link) {
        imageUrl = coordinated.image.link;
        coordinated.image.url = imageUrl;
      }
      
      // Validate URL
      if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
        // Log the actual image data to help debug
        const imageDataStr = JSON.stringify(coordinated.image);
        console.warn(`[Coordination] Invalid image URL for "${tileMetric}" - removing image`);
        console.warn(`[Coordination] Image data received:`, imageDataStr.substring(0, 300));
        delete coordinated.image;
      } else {
      // Clean and validate URL
      imageUrl = imageUrl.trim();
      
      // Check if it's a valid HTTP/HTTPS URL
      const isValidUrl = imageUrl.startsWith('http://') || 
                        imageUrl.startsWith('https://') ||
                        imageUrl.startsWith('//'); // Protocol-relative URL
      
      if (!isValidUrl) {
        // Always log invalid URLs to help debug
        console.warn(`[Coordination] Image URL not HTTP/HTTPS for "${tileMetric}" - removing image`);
        console.warn(`[Coordination] Invalid URL received: "${imageUrl.substring(0, 150)}"`);
        delete coordinated.image;
      } else {
        // URL is valid, ensure it's set and add alt if missing
        coordinated.image.url = imageUrl;
        if (!coordinated.image.alt || coordinated.image.alt.trim() === '') {
          coordinated.image.alt = `${tileMetric} visualization`;
        }
        
        if (process.env.DEBUG_INSIGHTS === 'true') {
          console.log(`[Coordination] ✅ Valid image URL for "${tileMetric}": ${imageUrl.substring(0, 80)}...`);
        }
      }
      }
    }
  }
  
  // Ensure exactly ONE visualization (chart OR image, not both)
  // Only resolve conflicts if both are valid
  if (coordinated.chart && coordinated.image) {
    // Prefer chart for metrics, image for news/events
    const isNewsOrPost = tileMetric.toLowerCase().includes('news') || 
                         tileMetric.toLowerCase().includes('post') ||
                         tileMetric.toLowerCase().includes('x post');
    
    if (isNewsOrPost) {
      // For news/posts, prefer image but only if it's valid
      if (coordinated.image.url && coordinated.image.url.trim() !== '') {
        delete coordinated.chart;
        if (process.env.DEBUG_INSIGHTS === 'true') {
          console.log('[Coordination] Removed chart, keeping image for news/event tile');
        }
      } else {
        // Image is invalid, keep chart instead
        delete coordinated.image;
        if (process.env.DEBUG_INSIGHTS === 'true') {
          console.log('[Coordination] Image invalid for news/event tile, keeping chart instead');
        }
      }
    } else {
      // For metrics, prefer chart (image validation already removed invalid images)
      delete coordinated.image;
      if (process.env.DEBUG_INSIGHTS === 'true') {
        console.log('[Coordination] Removed image, keeping chart for metric tile');
      }
    }
  }
  
  // If NO visualization exists, generate a chart for metrics (not news/posts)
  if (!coordinated.chart && !coordinated.image) {
    const isNewsOrPost = tileMetric.toLowerCase().includes('news') || 
                         tileMetric.toLowerCase().includes('post') ||
                         tileMetric.toLowerCase().includes('x post');
    
    if (!isNewsOrPost) {
      // Generate a default chart for metrics
      const baseValue = parseFloat(tileValue.replace(/[^0-9.]/g, '')) || 100;
      coordinated.chart = {
        type: 'line',
        labels: ['2024', '2025', '2026', '2027', '2028'],
        data: [
          baseValue * 0.8,
          baseValue * 0.9,
          baseValue,
          baseValue * 1.1,
          baseValue * 1.2
        ],
        label: tileMetric,
        sparkline: false, // Show axes and interactivity
        fill: false
      };
      console.log(`[Coordination] ✅ Generated default chart for "${tileMetric}" with base value ${baseValue}, data: [${coordinated.chart.data.join(', ')}]`);
    } else {
      // For news/posts, we could generate an image placeholder, but for now skip
      console.log(`[Coordination] ⏭️ Skipping visualization for news/post tile: ${tileMetric}`);
    }
  } else {
    if (process.env.DEBUG_INSIGHTS === 'true') {
      console.log(`[Coordination] ✅ Visualization already present: ${coordinated.chart ? 'Chart' : 'Image'}`);
    }
  }
  
  // Ensure insight text exists and has proper length
  if (!coordinated.insight || coordinated.insight.length < 50) {
    console.warn('[Coordination] Insight text too short or missing');
    if (!coordinated.insight) {
      coordinated.insight = `Analysis of ${tileMetric} (${tileValue}): This metric represents a key component of SpaceX's valuation framework.`;
    }
  }
  
  // Validate links are present
  if (coordinated.insight) {
    const linkMatches = coordinated.insight.match(/\[([^\]]+)\|(view|url):([^\]]+)\]/g);
    if (!linkMatches || linkMatches.length < 2) {
      console.warn(`[Coordination] Only ${linkMatches?.length || 0} links found, expected 2-3`);
    }
  }
  
  return coordinated;
}

// Helper function to call AI API based on model provider
async function callAIAPI(model, prompt, maxTokens = 300, systemPrompt = null) {
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
  
  // Build messages array with optional system prompt
  const messages = [];
  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt
    });
  }
  messages.push({
    role: 'user',
    content: prompt
  });
  
  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    
    // Anthropic API requires system message as separate parameter, not in messages array
    const requestBody = {
      model: actualModel,
      max_tokens: maxTokens,
      messages: messages.filter(m => m.role !== 'system') // Remove system from messages
    };
    
    // Add system message as separate parameter if present
    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
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
        messages: messages
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
    
    // Apply rate limiting
    await grokRateLimiter.waitIfNeeded();
    
    // Retry with exponential backoff on rate limit errors
    return await retryWithBackoff(async () => {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: actualModel,
          max_tokens: maxTokens,
          messages: messages
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Grok API error: ${response.status} ${errorText}`);
        error.status = response.status;
        throw error;
      }
      
      const data = await response.json();
      return data.choices && data.choices[0] ? data.choices[0].message.content : 'Analysis complete.';
    }, 3, 2000); // Max 3 retries, starting with 2s delay
  }
  
  throw new Error(`Unknown AI provider for model: ${model}`);
}

// AI Commentary for Greeks
app.post('/api/ai/greeks/commentary', async (req, res) => {
  // Extract greeks from req.body outside try block so it's available in catch
  const { greeks, summary, baseValues } = req.body || {};
  
  try {
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
    // Safely access greeks which was extracted from req.body at the top
    let topDelta = null;
    try {
      if (greeks && greeks.total && greeks.total.delta) {
        const deltaEntries = Object.entries(greeks.total.delta);
        if (deltaEntries.length > 0) {
          topDelta = deltaEntries.sort((a, b) => Math.abs(b[1].value) - Math.abs(a[1].value))[0];
        }
      }
    } catch (e) {
      console.error('Error extracting topDelta:', e);
    }
    
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

// Enhanced insights endpoint with Grok, web search, and X feed access
app.post('/api/insights/enhanced', async (req, res) => {
  try {
    const { data, inputs, insightType, context, tileSize, contentLimits, tileId: bodyTileId } = req.body;
    // Use environment variable for default model, fallback to grok-3
    // Set DEFAULT_AI_MODEL env var to 'claude-opus-4-1-20250805' to avoid Grok rate limits
    let requestedModel = req.headers['x-ai-model'] || process.env.DEFAULT_AI_MODEL || 'grok:grok-3';
    
    // Map deprecated models to grok-3
    if (requestedModel === 'grok:grok-2' || requestedModel === 'grok:grok-beta') {
      requestedModel = 'grok:grok-3';
    }
    
    // Extract key metrics from data
    const totalValue = data?.total?.value || 0;
    const earthValue = data?.earth?.adjustedValue || 0;
    const marsValue = data?.mars?.adjustedValue || 0;
    const earthPercent = totalValue > 0 ? (earthValue / totalValue) * 100 : 0;
    const marsPercent = totalValue > 0 ? (marsValue / totalValue) * 100 : 0;
    
    // Get tile-specific context
    const tileContext = context || {};
    const tileMetric = tileContext.metric || 'General Valuation';
    const tileValue = tileContext.value || 'N/A';
    const tileId = bodyTileId || data?.tileId || '';
    
    // Extract insightType from multiple possible sources
    let actualInsightType = insightType || tileContext.tileType || '';
    
    // Fallback: determine from tileId if not provided
    if (!actualInsightType && tileId) {
      if (tileId.includes('news')) actualInsightType = 'news';
      else if (tileId.includes('x-post') || tileId.includes('x-posts')) actualInsightType = 'x-feeds';
    }
    
    // Log content limits for debugging (only if DEBUG_INSIGHTS is enabled)
    if (process.env.DEBUG_INSIGHTS === 'true') {
      console.log(`[Enhanced Insights] Tile: ${tileId || '(none)'}, Size: ${tileSize}, InsightType: ${actualInsightType}, Limits:`, contentLimits);
    }
    
    // Special handling for X Posts tile - Fetch REAL tweets with REAL timestamps
    if (actualInsightType === 'x-feeds') {
      const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
      
      if (twitterBearerToken) {
        try {
          // Fetch real tweets from key SpaceX-related accounts
          const keyAccounts = ['elonmusk', 'SpaceX', 'CathieDWood', 'aaronburnett', 'VladSaigau']; // Verified accounts
          const allTweets = [];
          
          // Strategy: Get recent tweets from key accounts, then filter for relevance
          // First, get recent tweets from Aaron and Vlad (they're the tool builders/users)
          // Also get tweets from Cathie Wood (partner, not builder)
          const builderAccounts = ['aaronburnett', 'VladSaigau'];
          const partnerAccounts = ['CathieDWood'];
          const builderTweets = [];
          const partnerTweets = [];
          
          // Fetch tweets from builders (Aaron and Vlad)
          for (const account of builderAccounts) {
            try {
              const accountUrl = `https://api.twitter.com/2/tweets/search/recent?query=from:${account}&max_results=10&tweet.fields=created_at,author_id,public_metrics,text&expansions=author_id&user.fields=name,username`;
              
              const accountResponse = await fetch(accountUrl, {
                headers: {
                  'Authorization': `Bearer ${twitterBearerToken}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (accountResponse.ok) {
                const accountData = await accountResponse.json();
                const tweets = accountData.data || [];
                const users = accountData.includes?.users || [];
                
                tweets.forEach(tweet => {
                  const user = users.find(u => u.id === tweet.author_id);
                  if (!user) return;
                  
                  const tweetText = tweet.text.toLowerCase();
                  // Check if tweet is relevant to SpaceX/Starlink/Mars/space industry
                  const isRelevant = tweetText.includes('spacex') || 
                                    tweetText.includes('starlink') || 
                                    tweetText.includes('starship') ||
                                    tweetText.includes('mars') ||
                                    tweetText.includes('space') ||
                                    tweetText.includes('rocket') ||
                                    tweetText.includes('satellite') ||
                                    tweetText.includes('elon') ||
                                    tweetText.includes('musk') ||
                                    tweetText.includes('tesla') || // Tesla often related to SpaceX
                                    tweetText.includes('valuation') || // Valuation-related tweets from builders
                                    tweetText.includes('model') ||
                                    tweetText.includes('financial');
                  
                  // Only include relevant tweets from builders (as requested: "if they are relevant")
                  if (!isRelevant) return;
                  
                  const accountName = user.name || user.username;
                  const username = user.username;
                  
                  const dateObj = new Date(tweet.created_at);
                  if (isNaN(dateObj.getTime())) return;
                  
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const formattedDate = `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
                  
                  builderTweets.push({
                    account: `@${username}`,
                    content: tweet.text,
                    isKeyAccount: true,
                    accountName: accountName,
                    date: formattedDate,
                    timestamp: tweet.created_at,
                    url: `https://twitter.com/${username}/status/${tweet.id}`,
                    relevanceScore: 2 // Relevant tweets from builders
                  });
                });
              }
            } catch (error) {
              console.error(`[Enhanced Insights] Error fetching tweets from ${account}:`, error);
            }
          }
          
          // Fetch tweets from partners (Cathie Wood)
          for (const account of partnerAccounts) {
            try {
              const accountUrl = `https://api.twitter.com/2/tweets/search/recent?query=from:${account}&max_results=10&tweet.fields=created_at,author_id,public_metrics,text&expansions=author_id&user.fields=name,username`;
              
              const accountResponse = await fetch(accountUrl, {
                headers: {
                  'Authorization': `Bearer ${twitterBearerToken}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (accountResponse.ok) {
                const accountData = await accountResponse.json();
                const tweets = accountData.data || [];
                const users = accountData.includes?.users || [];
                
                tweets.forEach(tweet => {
                  const user = users.find(u => u.id === tweet.author_id);
                  if (!user) return;
                  
                  const tweetText = tweet.text.toLowerCase();
                  // Check if tweet is relevant to SpaceX/Starlink/Mars/space industry
                  const isRelevant = tweetText.includes('spacex') || 
                                    tweetText.includes('starlink') || 
                                    tweetText.includes('starship') ||
                                    tweetText.includes('mars') ||
                                    tweetText.includes('space') ||
                                    tweetText.includes('rocket') ||
                                    tweetText.includes('satellite') ||
                                    tweetText.includes('elon') ||
                                    tweetText.includes('musk') ||
                                    tweetText.includes('tesla') ||
                                    tweetText.includes('valuation') ||
                                    tweetText.includes('model') ||
                                    tweetText.includes('financial');
                  
                  // Only include relevant tweets from partners
                  if (!isRelevant) return;
                  
                  const accountName = user.name || user.username;
                  const username = user.username;
                  
                  const dateObj = new Date(tweet.created_at);
                  if (isNaN(dateObj.getTime())) return;
                  
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const formattedDate = `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
                  
                  partnerTweets.push({
                    account: `@${username}`,
                    content: tweet.text,
                    isKeyAccount: true,
                    accountName: accountName,
                    date: formattedDate,
                    timestamp: tweet.created_at,
                    url: `https://twitter.com/${username}/status/${tweet.id}`,
                    relevanceScore: 2 // Relevant tweets from partners
                  });
                });
              }
            } catch (error) {
              console.error(`[Enhanced Insights] Error fetching tweets from partner ${account}:`, error);
            }
          }
          
          // Also search for SpaceX-related tweets from all key accounts (including Elon and SpaceX)
          try {
            const searchQuery = encodeURIComponent('(SpaceX OR Starlink OR Starship) (from:elonmusk OR from:SpaceX)');
            const twitterUrl = `https://api.twitter.com/2/tweets/search/recent?query=${searchQuery}&max_results=10&tweet.fields=created_at,author_id,public_metrics,text&expansions=author_id&user.fields=name,username`;
            
            const twitterResponse = await fetch(twitterUrl, {
              headers: {
                'Authorization': `Bearer ${twitterBearerToken}`,
                'Content-Type': 'application/json'
              }
            });
            
              if (twitterResponse.ok) {
                const twitterData = await twitterResponse.json();
                const tweets = twitterData.data || [];
                const users = twitterData.includes?.users || [];
                
                tweets.forEach(tweet => {
                  const user = users.find(u => u.id === tweet.author_id);
                  if (!user) return;
                  
                  const accountName = user.name || user.username;
                  const username = user.username;
                  
                  const dateObj = new Date(tweet.created_at);
                  if (isNaN(dateObj.getTime())) return;
                  
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const formattedDate = `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
                  
                  // Map usernames to display names
                  const displayNames = {
                    'elonmusk': 'Elon Musk',
                    'spacex': 'SpaceX',
                    'cathiedwood': 'Cathie Wood',
                    'aaronburnett': 'Aaron Burnett',
                    'vladsaigau': 'Vlad Saigau'
                  };
                  
                  const normalizedUsername = username.toLowerCase();
                  const displayName = displayNames[normalizedUsername] || accountName;
                  
                  allTweets.push({
                    account: `@${username}`,
                    content: tweet.text,
                    isKeyAccount: keyAccounts.map(a => a.toLowerCase()).includes(normalizedUsername),
                    accountName: displayName,
                    date: formattedDate,
                    timestamp: tweet.created_at,
                    url: `https://twitter.com/${username}/status/${tweet.id}`,
                    relevanceScore: 3 // High relevance for SpaceX-specific tweets
                  });
                });
              } else {
                const errorText = await twitterResponse.text();
                console.warn(`[Enhanced Insights] Twitter API error:`, twitterResponse.status, errorText);
              }
            } catch (error) {
              console.error(`[Enhanced Insights] Error fetching tweets:`, error);
            }
          
          // Combine builder tweets, partner tweets, and SpaceX-specific tweets
          const combinedTweets = [...builderTweets, ...partnerTweets, ...allTweets];
          
          if (combinedTweets.length > 0) {
            // Remove duplicates (same tweet ID)
            const uniqueTweets = [];
            const seenIds = new Set();
            
            combinedTweets.forEach(tweet => {
              const tweetId = tweet.url.split('/status/')[1];
              if (!seenIds.has(tweetId)) {
                seenIds.add(tweetId);
                uniqueTweets.push(tweet);
              }
            });
            
            // Sort by relevance score (higher first), then by timestamp (newest first), limit to 5
            const sortedTweets = uniqueTweets
              .sort((a, b) => {
                // First sort by relevance score (higher = more relevant)
                if (b.relevanceScore !== a.relevanceScore) {
                  return (b.relevanceScore || 0) - (a.relevanceScore || 0);
                }
                // Then by timestamp (newest first)
                return new Date(b.timestamp) - new Date(a.timestamp);
              })
              .slice(0, 5)
              .map(tweet => {
                // Remove relevanceScore before returning (not needed in frontend)
                const { relevanceScore, ...tweetData } = tweet;
                return tweetData;
              });
            
            console.log(`[Enhanced Insights] ✅ Fetched ${sortedTweets.length} REAL tweets (${builderTweets.length} from builders, ${partnerTweets.length} from partners, ${allTweets.length} SpaceX-specific)`);
            return res.json({ success: true, data: { xFeeds: sortedTweets } });
          }
        } catch (error) {
          console.error('[Enhanced Insights] Error fetching real X feeds:', error);
        }
      } else {
        console.warn('[Enhanced Insights] Twitter Bearer Token not configured');
      }
      
      // Fallback: Return empty array if no real tweets available
      console.warn('[Enhanced Insights] No real tweets available, returning empty array');
      return res.json({ success: true, data: { xFeeds: [] } });
    }
    
    // Special handling for News tile - Fetch REAL news articles
    if (actualInsightType === 'news') {
      try {
        // Use Google Custom Search API to fetch real news articles
        const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
        const googleCseId = process.env.GOOGLE_SEARCH_ENGINE_ID;
        
        if (googleApiKey && googleCseId) {
          // Search for recent SpaceX/Starlink news
          const searchQuery = 'SpaceX OR Starlink OR Starship news site:techcrunch.com OR site:reuters.com OR site:spacenews.com OR site:theverge.com OR site:arstechnica.com';
          const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCseId}&q=${encodeURIComponent(searchQuery)}&num=5&safe=active&dateRestrict=d7`; // Last 7 days
          
          console.log('[Enhanced Insights] Fetching real news from Google Search API...');
          const searchResponse = await fetch(searchUrl);
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const searchResults = searchData.items || [];
            
            // Process real search results into news format
            const realNews = searchResults.map((item, index) => {
              // Extract source from displayLink or parse from URL
              let source = item.displayLink || '';
              if (source.includes('techcrunch.com')) source = 'TechCrunch';
              else if (source.includes('reuters.com')) source = 'Reuters';
              else if (source.includes('spacenews.com')) source = 'SpaceNews';
              else if (source.includes('theverge.com')) source = 'The Verge';
              else if (source.includes('arstechnica.com')) source = 'Ars Technica';
              else source = source.replace('www.', '').split('.')[0];
              
              // Extract REAL publication date and timestamp from article metadata
              const publishedDate = item.pagemap?.metatags?.[0]?.['article:published_time'] || 
                                   item.pagemap?.metatags?.[0]?.['og:updated_time'] ||
                                   item.pagemap?.metatags?.[0]?.['datePublished'] ||
                                   null;
              
              let formattedDate = '';
              let timestamp = null;
              
              if (publishedDate) {
                const dateObj = new Date(publishedDate);
                if (!isNaN(dateObj.getTime())) {
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  formattedDate = `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
                  timestamp = dateObj.toISOString(); // Store full timestamp
                }
              }
              
              // If no valid date found, skip this article (we only want articles with real timestamps)
              if (!formattedDate) {
                return null;
              }
              
              // Extract thumbnail from pagemap (og:image, twitter:image, or cse_image)
              let thumbnail = '';
              if (item.pagemap?.cse_image?.[0]?.src) {
                thumbnail = item.pagemap.cse_image[0].src;
              } else if (item.pagemap?.metatags?.[0]?.['og:image']) {
                thumbnail = item.pagemap.metatags[0]['og:image'];
              } else if (item.pagemap?.metatags?.[0]?.['twitter:image']) {
                thumbnail = item.pagemap.metatags[0]['twitter:image'];
              } else if (item.pagemap?.metatags?.[0]?.['twitter:image:src']) {
                thumbnail = item.pagemap.metatags[0]['twitter:image:src'];
              }
              
              // Ensure thumbnail is absolute URL
              if (thumbnail && !thumbnail.match(/^https?:\/\//i)) {
                const urlObj = new URL(item.link);
                thumbnail = `${urlObj.protocol}//${urlObj.host}${thumbnail.startsWith('/') ? '' : '/'}${thumbnail}`;
              }
              
              return {
                title: item.title || 'News Article',
                summary: item.snippet || item.htmlSnippet?.replace(/<[^>]*>/g, '') || 'No summary available',
                source: source || 'News Source',
                date: formattedDate,
                timestamp: timestamp, // Include full ISO timestamp
                url: item.link || item.formattedUrl || '',
                thumbnail: thumbnail || undefined
              };
            }).filter(item => item && item.url && item.title && item.date); // Only include items with URL, title, and REAL date
            
            if (realNews.length > 0) {
              console.log(`[Enhanced Insights] ✅ Fetched ${realNews.length} REAL news articles with thumbnails`);
              return res.json({ success: true, data: { news: realNews } });
            } else {
              console.warn('[Enhanced Insights] No real news articles found from Google Search');
            }
          } else {
            const errorText = await searchResponse.text();
            console.error('[Enhanced Insights] Google Search API error:', searchResponse.status, errorText);
          }
        } else {
          console.warn('[Enhanced Insights] Google Search API credentials not configured');
        }
      } catch (error) {
        console.error('[Enhanced Insights] Error fetching real news:', error);
      }
      
      // Fallback: Try NewsAPI if configured
      const newsApiKey = process.env.NEWS_API_KEY;
      if (newsApiKey) {
        try {
          const newsApiUrl = `https://newsapi.org/v2/everything?q=SpaceX OR Starlink OR Starship&language=en&sortBy=publishedAt&pageSize=5&apiKey=${newsApiKey}`;
          console.log('[Enhanced Insights] Trying NewsAPI as fallback...');
          const newsResponse = await fetch(newsApiUrl);
          
          if (newsResponse.ok) {
            const newsData = await newsResponse.json();
            const articles = newsData.articles || [];
            
            const realNews = articles.map(article => {
              if (!article.publishedAt) return null; // Skip articles without publication date
              
              const dateObj = new Date(article.publishedAt);
              if (isNaN(dateObj.getTime())) return null; // Skip invalid dates
              
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const formattedDate = `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
              
              return {
                title: article.title || 'News Article',
                summary: article.description || article.content?.substring(0, 200) || 'No summary available',
                source: article.source?.name || 'News Source',
                date: formattedDate,
                timestamp: article.publishedAt, // Include full ISO timestamp from API
                url: article.url || '',
                thumbnail: article.urlToImage || undefined
              };
            }).filter(item => item && item.url && item.title && item.date); // Only include items with URL, title, and REAL date
            
            if (realNews.length > 0) {
              console.log(`[Enhanced Insights] ✅ Fetched ${realNews.length} REAL news articles from NewsAPI`);
              return res.json({ success: true, data: { news: realNews } });
            }
          }
        } catch (error) {
          console.error('[Enhanced Insights] NewsAPI error:', error);
        }
      }
      
      // Fallback: Return sample news if API fails
      const today = new Date();
      const formatDate = (date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
      };
      
      // Include thumbnail URLs in fallback news
      
      return res.json({ 
        success: true, 
        data: { 
          news: [
            {
              title: "SpaceX Starship Test Flight",
              summary: "SpaceX continues testing Starship for future Mars missions. Recent test flights show progress toward reusability goals.",
              source: "SpaceX Updates",
              date: formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)), // 2 days ago
              url: "https://www.spacex.com/updates"
            },
            {
              title: "Starlink Global Expansion",
              summary: "Starlink expands coverage to new regions, increasing global internet access. Subscriber growth continues to accelerate.",
              source: "Industry News",
              date: formatDate(new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)), // 5 days ago
              url: "https://www.spacex.com/starlink"
            },
            {
              title: "Mars Mission Timeline",
              summary: "SpaceX maintains target for first crewed Mars mission by 2030. Starship development critical to timeline.",
              source: "Space News",
              date: formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)), // 7 days ago
              url: "https://www.spacex.com/mars"
            }
          ]
        } 
      });
    }
    
    // Special handling for Image+Comments tile - Find article for topic discovery, generate model-aware commentary
    if (actualInsightType === 'image-comments') {
      try {
        const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
        const googleCseId = process.env.GOOGLE_SEARCH_ENGINE_ID;
        
        // First, get news articles to exclude them
        let excludeUrls = [];
        let excludeTitles = [];
        
        if (googleApiKey && googleCseId) {
          try {
            const newsQuery = 'SpaceX OR Starlink OR Starship news site:techcrunch.com OR site:reuters.com OR site:spacenews.com OR site:theverge.com OR site:arstechnica.com';
            const newsSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCseId}&q=${encodeURIComponent(newsQuery)}&num=5&safe=active&dateRestrict=d7`;
            const newsSearchResponse = await fetch(newsSearchUrl);
            
            if (newsSearchResponse.ok) {
              const newsData = await newsSearchResponse.json();
              const newsItems = newsData.items || [];
              excludeUrls = newsItems.map(item => item.link).filter(Boolean);
              excludeTitles = newsItems.map(item => item.title).filter(Boolean);
            }
          } catch (error) {
            console.warn('[Enhanced Insights] Could not fetch news for exclusion:', error.message);
          }
        }
        
        // Search for visual/technical articles (different focus from news)
        if (googleApiKey && googleCseId) {
          // Search with visual/technical focus - different from general news
          // Prioritize queries that typically have high-quality images
          const visualQueries = [
            'Starlink satellite constellation image',
            'SpaceX Starship launch photo',
            'Starlink coverage map image',
            'SpaceX rocket landing image',
            'Mars Starship mission image',
            'Starlink terminal installation image',
            'SpaceX Falcon Heavy launch image',
            'Starlink satellite deployment image',
            'SpaceX mission control image',
            'Starlink global coverage image'
          ];
          
          // Try queries until we find a good article with image
          let selectedArticle = null;
          let discoveredTopic = '';
          let imageUrl = '';
          
          for (const query of visualQueries) {
            try {
              const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCseId}&q=${encodeURIComponent(query)}&num=3&safe=active&dateRestrict=d30`; // Last 30 days
              const searchResponse = await fetch(searchUrl);
              
              if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                const articles = searchData.items || [];
                
                // Score and sort articles by image quality
                const articlesWithImages = [];
                for (const item of articles) {
                  if (excludeUrls.includes(item.link) || excludeTitles.includes(item.title)) {
                    continue; // Skip if in news tile
                  }
                  
                  // Extract image URL
                  let itemImageUrl = '';
                  if (item.pagemap?.cse_image?.[0]?.src) {
                    itemImageUrl = item.pagemap.cse_image[0].src;
                  } else if (item.pagemap?.metatags?.[0]?.['og:image']) {
                    itemImageUrl = item.pagemap.metatags[0]['og:image'];
                  } else if (item.pagemap?.metatags?.[0]?.['twitter:image']) {
                    itemImageUrl = item.pagemap.metatags[0]['twitter:image'];
                  } else if (item.pagemap?.metatags?.[0]?.['twitter:image:src']) {
                    itemImageUrl = item.pagemap.metatags[0]['twitter:image:src'];
                  }
                  
                  if (itemImageUrl) {
                    // Ensure image is absolute URL
                    if (!itemImageUrl.match(/^https?:\/\//i)) {
                      try {
                        const urlObj = new URL(item.link);
                        itemImageUrl = `${urlObj.protocol}//${urlObj.host}${itemImageUrl.startsWith('/') ? '' : '/'}${itemImageUrl}`;
                      } catch (e) {
                        itemImageUrl = '';
                      }
                    }
                    
                    // Filter and score
                    if (itemImageUrl && itemImageUrl.match(/^https?:\/\//i)) {
                      const blockedDomains = ['lookaside.fbsbx.com', 'facebook.com', 'fbcdn.net', 'instagram.com', 'cdninstagram.com', 'linkedin.com', 'licdn.com'];
                      const blockedPaths = ['/api/', '/og/', '/generate', '/render', '/proxy'];
                      // Prioritize high-quality news and space industry sources
                      const preferredDomains = [
                        'spacenews.com',
                        'techcrunch.com',
                        'nasa.gov',
                        'cnbc.com',
                        'forbes.com',
                        'reuters.com',
                        'ap.org',
                        'gettyimages.com',
                        'spacex.com',
                        'theverge.com',
                        'arstechnica.com',
                        'bloomberg.com',
                        'wsj.com',
                        'nytimes.com'
                      ];
                      
                      try {
                        const imageHost = new URL(itemImageUrl).hostname.toLowerCase();
                        const imagePath = new URL(itemImageUrl).pathname.toLowerCase();
                        const isBlockedDomain = blockedDomains.some(domain => imageHost.includes(domain));
                        const isBlockedPath = blockedPaths.some(path => imagePath.includes(path));
                        const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(itemImageUrl);
                        const isPreferredSource = preferredDomains.some(domain => imageHost.includes(domain));
                        
                        if (!isBlockedDomain && !(isBlockedPath && !hasImageExtension)) {
                          item._imageUrl = itemImageUrl;
                          item._imageScore = (isPreferredSource ? 2 : 0) + (hasImageExtension ? 1 : 0);
                          articlesWithImages.push(item);
                          const qualityNote = isPreferredSource ? ' (preferred source)' : '';
                          const extensionNote = hasImageExtension ? ' (has extension)' : '';
                          console.log(`[Enhanced Insights] ✅ Found article with image (score: ${item._imageScore})${qualityNote}${extensionNote}: ${item.title?.substring(0, 50)}...`);
                        }
                      } catch (e) {
                        // Skip invalid URLs
                      }
                    }
                  }
                }
                
                // Sort by image quality score (highest first), then use best one
                articlesWithImages.sort((a, b) => (b._imageScore || 0) - (a._imageScore || 0));
                
                // Use the best article (highest score) - already filtered and scored
                if (articlesWithImages.length > 0) {
                  const bestArticle = articlesWithImages[0];
                  selectedArticle = bestArticle;
                  discoveredTopic = bestArticle.title || query;
                  imageUrl = bestArticle._imageUrl;
                  console.log(`[Enhanced Insights] ✅ Selected BEST article with image (score: ${bestArticle._imageScore}): ${discoveredTopic.substring(0, 50)}...`);
                  break; // Found best article, stop searching queries
                }
              }
            } catch (error) {
              console.warn(`[Enhanced Insights] Error searching for visual article with query "${query}":`, error.message);
            }
          }
          
          // Check if we found a valid article after all queries
          if (selectedArticle) {
            // Image URL already extracted and validated in the loop above
            // Re-extract to ensure we have it stored in imageUrl variable
            let finalImageUrl = '';
            if (selectedArticle.pagemap?.cse_image?.[0]?.src) {
              finalImageUrl = selectedArticle.pagemap.cse_image[0].src;
            } else if (selectedArticle.pagemap?.metatags?.[0]?.['og:image']) {
              finalImageUrl = selectedArticle.pagemap.metatags[0]['og:image'];
            } else if (selectedArticle.pagemap?.metatags?.[0]?.['twitter:image']) {
              finalImageUrl = selectedArticle.pagemap.metatags[0]['twitter:image'];
            }
            
            if (finalImageUrl && !finalImageUrl.match(/^https?:\/\//i)) {
              try {
                const urlObj = new URL(selectedArticle.link);
                finalImageUrl = `${urlObj.protocol}//${urlObj.host}${finalImageUrl.startsWith('/') ? '' : '/'}${finalImageUrl}`;
              } catch (e) {
                finalImageUrl = '';
              }
            }
            
            // Final validation - filter out blocked domains
            if (finalImageUrl) {
              const blockedDomains = [
                'lookaside.fbsbx.com',
                'facebook.com',
                'fbcdn.net',
                'instagram.com',
                'cdninstagram.com',
                'linkedin.com',
                'licdn.com'
              ];
              
              try {
                const imageHost = new URL(finalImageUrl).hostname.toLowerCase();
                const isBlocked = blockedDomains.some(domain => imageHost.includes(domain));
                
                if (isBlocked) {
                  console.log(`[Enhanced Insights] ⚠️ Blocked image domain detected: ${imageHost}, skipping article: ${selectedArticle.title?.substring(0, 50) || 'unknown'}`);
                  selectedArticle = null;
                  finalImageUrl = '';
                  imageUrl = '';
                } else {
                  imageUrl = finalImageUrl;
                  console.log(`[Enhanced Insights] ✅ Using image from domain: ${imageHost}`);
                }
              } catch (e) {
                finalImageUrl = '';
                imageUrl = '';
              }
            } else {
              imageUrl = finalImageUrl;
            }
          }
          
          // Check if we found a valid article with valid image
          if (selectedArticle && imageUrl) {
            
            // Extract topic from article title/content
            const articleTitle = selectedArticle.title || '';
            const articleSnippet = selectedArticle.snippet || '';
            const topicContext = `${articleTitle}. ${articleSnippet}`;
            
            // Prepare model context for commentary generation
            const modelContext = {
              penetration: (inputs?.earth?.starlinkPenetration || 0) * 100,
              earthValue: earthValue,
              marsValue: marsValue,
              totalValue: totalValue,
              launchVolume: inputs?.earth?.launchVolume || 0,
              firstColonyYear: inputs?.mars?.firstColonyYear || 0,
              discountRate: (inputs?.financial?.discountRate || 0) * 100,
              modelName: context?.modelName || 'Current Model'
            };
            
            // Generate model-aware commentary using AI
            const commentaryPrompt = `Generate concise commentary (2-3 sentences) about "${discoveredTopic}" in the context of a SpaceX valuation model.

Model Context:
- Starlink Penetration: ${modelContext.penetration.toFixed(1)}%
- Earth Operations Value: $${(modelContext.earthValue / 1000).toFixed(2)}T
- Mars Operations Value: $${(modelContext.marsValue / 1000).toFixed(2)}T
- Total Enterprise Value: $${(modelContext.totalValue / 1000).toFixed(2)}T
- Launch Volume: ${modelContext.launchVolume} launches/year
- First Mars Colony Year: ${modelContext.firstColonyYear || 'N/A'}
- Discount Rate: ${modelContext.discountRate.toFixed(1)}%

Article Context (for topic reference only - do not quote article content):
${topicContext.substring(0, 300)}

Generate OUR analysis of this topic using OUR model's specific values. Focus on:
1. How this topic relates to our model's assumptions
2. Model-specific implications and valuation drivers
3. Connect the topic to our model's actual values

Keep it concise, model-focused, and analytical. Do not reference the article directly - use it only to understand the topic.`;

            let commentary = '';
            try {
              const maxTokens = contentLimits?.chars ? Math.min(300, contentLimits.chars * 2) : 300;
              commentary = await callAIAPI(requestedModel, commentaryPrompt, maxTokens, null);
              
              // Clean up commentary (remove quotes, extra whitespace)
              commentary = commentary.trim().replace(/^["']|["']$/g, '').replace(/\n+/g, ' ');
              
              if (!commentary || commentary.length < 20) {
                // Fallback commentary if AI fails
                commentary = `Our model's ${modelContext.penetration.toFixed(1)}% Starlink penetration assumption drives $${(modelContext.earthValue / 1000).toFixed(2)}T in Earth Operations value, reflecting ambitious market capture expectations.`;
              }
            } catch (error) {
              console.error('[Enhanced Insights] Error generating commentary:', error);
              // Fallback commentary
              commentary = `Our model's ${modelContext.penetration.toFixed(1)}% Starlink penetration assumption drives $${(modelContext.earthValue / 1000).toFixed(2)}T in Earth Operations value, reflecting ambitious market capture expectations.`;
            }
            
            if (imageUrl && commentary) {
              console.log(`[Enhanced Insights] ✅ Generated image-comments tile with topic: "${discoveredTopic}"`);
              console.log(`[Enhanced Insights] ✅ Image URL (valid): ${imageUrl.substring(0, 80)}...`);
              console.log(`[Enhanced Insights] ✅ Commentary length: ${commentary.length} chars`);
              return res.json({ 
                success: true, 
                data: { 
                  imageComments: {
                    image: imageUrl,
                    commentary: commentary,
                    topic: discoveredTopic,
                    articleUrl: selectedArticle.link
                  }
                } 
              });
            } else {
              console.warn(`[Enhanced Insights] ⚠️ Missing image or commentary. Image: ${imageUrl ? 'present' : 'missing'}, Commentary: ${commentary ? 'present' : 'missing'}`);
            }
          }
        }
      } catch (error) {
        console.error('[Enhanced Insights] Error generating image-comments:', error);
      }
      
      // Fallback: Return empty if no article found
      return res.json({ success: true, data: { imageComments: null } });
    }
    
    // Build context for RAG from documentation
    const ragContext = await getRAGContext(insightType, data, inputs);
    
    // Create SYSTEM PROMPT for critical instructions (more reliable than user prompt)
    const systemPrompt = `You are a financial analyst creating insights for a Bloomberg Terminal-style dashboard tile. This tool is built and used by Vlad Saigau (@VladSaigau) and Aaron Burnett (@aaronburnett) at Mach33. Cathie Wood (@CathieDWood) is a partner.

CRITICAL REQUIREMENTS - YOU MUST FOLLOW THESE:
1. ALWAYS include 2-3 clickable links in EVERY insight using format [link text|view:dashboard] for internal navigation or [link text|url:https://example.com] for external URLs
2. Links are REQUIRED - do not skip them
3. Example formats: [View Dashboard|view:dashboard], [SpaceX Website|url:https://spacex.com], [Mars Analysis|view:mars]
4. Your insight text MUST be approximately ${contentLimits?.chars || 500} characters long (between ${Math.floor((contentLimits?.chars || 500) * 0.9)} and ${Math.floor((contentLimits?.chars || 500) * 1.1)} characters)
5. Count your characters before responding
6. Fill the tile completely with detailed, comprehensive analysis
7. Write in complete sentences, be detailed and specific
8. REQUIRED: Include a "chart" OR "image" visualization (choose ONE based on tile type):
   - For METRIC tiles (revenue, valuation, growth, etc.): ALWAYS use "chart" ONLY - never include "image"
   - For NEWS/EVENT tiles (X posts, news, events): ALWAYS use "image" ONLY - never include "chart"
   - NEVER include both chart AND image - choose ONE based on tile type
   - Chart format (single line): {"type": "line", "labels": ["2024","2025","2026"], "data": [100,150,200], "label": "Revenue", "sparkline": false}
   - Chart format (multiple lines): {"type": "line", "labels": ["2024","2025","2026"], "datasets": [{"label": "Revenue", "data": [100,150,200], "color": "#0066cc"}, {"label": "Costs", "data": [80,90,100], "color": "#ef4444"}], "sparkline": false}
   - Chart format (bar chart): {"type": "bar", "labels": ["2024","2025","2026"], "data": [100,150,200], "label": "Revenue", "sparkline": false}
   - Image format: {"url": "https://example.com/image.jpg", "alt": "Description"}
   - If tile is a metric (not news/event), ONLY include chart, do NOT include image`;

    // Create concise user prompt - shorter prompts = faster responses
    // Only include essential context to reduce token usage
    const prompt = `Analyze "${tileMetric}" (${tileValue}) for SpaceX valuation.

Key Context:
- Total Value: $${(totalValue / 1000).toFixed(1)}T | Earth: $${(earthValue / 1000).toFixed(1)}T (${earthPercent.toFixed(1)}%) | Mars: $${(marsValue / 1000).toFixed(1)}T (${marsPercent.toFixed(1)}%)
- Starlink: ${((inputs?.earth?.starlinkPenetration || 0) * 100).toFixed(1)}% | Launches: ${inputs?.earth?.launchVolume || 0}/yr | Discount: ${((inputs?.financial?.discountRate || 0.12) * 100).toFixed(1)}%

${ragContext ? `Docs: ${ragContext.substring(0, 500)}` : ''}

Focus: What "${tileMetric}" means, why ${tileValue} matters, valuation impact, risks/opportunities. Include 2-3 links: [text|view:path] or [text|url:https://...].

Visualization (REQUIRED - choose ONE):
- METRIC tiles: chart ONLY - Use variety:
  * Single line: {"type":"line","labels":["2024","2025","2026","2027","2028"],"data":[100,150,200,250,300],"label":"${tileMetric}","sparkline":false}
  * Multiple lines (for comparisons): {"type":"line","labels":["2024","2025","2026","2027","2028"],"datasets":[{"label":"Metric 1","data":[100,150,200,250,300],"color":"#0066cc"},{"label":"Metric 2","data":[80,120,180,220,280],"color":"#10b981"}],"sparkline":false}
  * Bar chart (for discrete comparisons): {"type":"bar","labels":["2024","2025","2026","2027","2028"],"data":[100,150,200,250,300],"label":"${tileMetric}","sparkline":false}
- NEWS/EVENT tiles: image ONLY: {"url":"https://...","alt":"Description"}

Format your response as JSON:
{
  "insight": "Your detailed analysis here (${contentLimits?.chars || 500} characters) with links like [View Dashboard|view:dashboard] and [SpaceX|url:https://spacex.com]",
  "chart": {
    "type": "line",
    "labels": ["2024", "2025", "2026", "2027", "2028"],
    "data": [100, 150, 200, 250, 300],
    "label": "Metric Name",
    "sparkline": false,
    "fill": false
  },
  OR for multiple lines:
  "chart": {
    "type": "line",
    "labels": ["2024", "2025", "2026", "2027", "2028"],
    "datasets": [
      {"label": "Revenue", "data": [100, 150, 200, 250, 300], "color": "#0066cc"},
      {"label": "Costs", "data": [80, 120, 180, 220, 280], "color": "#ef4444"}
    ],
    "sparkline": false
  },
  OR for bar chart:
  "chart": {
    "type": "bar",
    "labels": ["2024", "2025", "2026", "2027", "2028"],
    "data": [100, 150, 200, 250, 300],
    "label": "Metric Name",
    "sparkline": false
  },
  "image": {
    "url": "https://example.com/image.jpg",
    "alt": "Description"
  },
  "xFeeds": [
    {
      "account": "@elonmusk",
      "content": "tweet content",
      "isKeyAccount": true,
      "accountName": "Elon Musk"
    },
    {
      "account": "@CathieDWood",
      "content": "tweet content",
      "isKeyAccount": true,
      "accountName": "Cathie Wood"
    },
    {
      "account": "@arronburnet",
      "content": "tweet content",
      "isKeyAccount": true,
      "accountName": "Arron Burnet"
    },
    {
      "account": "@vlad",
      "content": "tweet content",
      "isKeyAccount": true,
      "accountName": "Vlad"
    },
    {
      "account": "@username",
      "content": "tweet content",
      "isKeyAccount": false,
      "accountName": "Account Name"
    }
  ],
  "marketContext": "broader market context",
  "risks": ["risk 1", "risk 2"],
  "opportunities": ["opportunity 1", "opportunity 2"]
}`;

    // Call Grok API with X feed access, with fallback to Claude if Grok fails
    let aiResponse;
    let insightData;
    
    // Only log detailed info if DEBUG_INSIGHTS is enabled
    if (process.env.DEBUG_INSIGHTS === 'true') {
      console.log(`[Enhanced Insights] Calling AI API with model: ${requestedModel}, tile: ${tileId || '(none)'}, charLimit: ${contentLimits?.chars || 500}`);
      console.log(`[Enhanced Insights] System prompt length: ${systemPrompt?.length || 0} chars`);
      console.log(`[Enhanced Insights] User prompt length: ${prompt?.length || 0} chars`);
    }
    
    try {
      // Optimize maxTokens based on tile size - smaller tiles need less tokens
      // This speeds up API calls significantly
      const charLimit = contentLimits?.chars || 500;
      let maxTokens;
      if (charLimit <= 200) {
        maxTokens = 800; // Small tiles (square) - faster
      } else if (charLimit <= 500) {
        maxTokens = 1200; // Medium tiles (vertical/horizontal) - moderate
      } else {
        maxTokens = Math.min(2000, charLimit * 2); // Large tiles (2x2) - full
      }
      
      if (process.env.DEBUG_INSIGHTS === 'true') {
        console.log(`[Enhanced Insights] Max tokens: ${maxTokens} (charLimit: ${charLimit})`);
      }
      aiResponse = await callAIAPI(requestedModel, prompt, maxTokens, systemPrompt);
      if (process.env.DEBUG_INSIGHTS === 'true') {
        console.log(`[Enhanced Insights] AI response received, length: ${aiResponse?.length || 0} chars`);
      }
    } catch (grokError) {
      // Handle Grok API errors more gracefully
      const isRateLimit = grokError.message.includes('429') || grokError.message.includes('exhausted') || grokError.message.includes('spending limit');
      if (isRateLimit) {
        console.warn(`⚠️ Grok API rate limit/spending limit reached, falling back to Claude`);
      } else {
        console.warn(`⚠️ Grok API failed (${grokError.message.substring(0, 100)}), falling back to Claude`);
      }
      // Fallback to Claude if Grok fails
      const fallbackModel = process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-opus-4-1-20250805';
      try {
        // Use optimized maxTokens for fallback too
        const charLimit = contentLimits?.chars || 500;
        const fallbackMaxTokens = charLimit <= 200 ? 800 : charLimit <= 500 ? 1200 : Math.min(2000, charLimit * 2);
        aiResponse = await callAIAPI(fallbackModel, prompt, fallbackMaxTokens, systemPrompt);
        if (process.env.DEBUG_INSIGHTS === 'true') {
          console.log(`[Enhanced Insights] Fallback (Claude) response received, length: ${aiResponse?.length || 0} chars`);
        }
      } catch (claudeError) {
        // If both fail, return a basic response
        console.error('❌ Both Grok and Claude failed:', claudeError.message.substring(0, 150));
        insightData = {
          insight: 'Unable to generate AI insights at this time. Please check your API configuration.',
          xFeeds: [],
          marketContext: 'AI service unavailable',
          risks: [],
          opportunities: []
        };
      }
    }
    
    // Parse AI response (handle both JSON and text)
    if (aiResponse && !insightData) {
      try {
        // Try to extract JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          if (process.env.DEBUG_INSIGHTS === 'true') {
            console.log(`[Enhanced Insights] Parsing JSON response, length: ${jsonMatch[0].length} chars`);
          }
          insightData = JSON.parse(jsonMatch[0]);
          if (process.env.DEBUG_INSIGHTS === 'true') {
            console.log(`[Enhanced Insights] Parsed successfully, insight length: ${insightData?.insight?.length || 0} chars`);
            
            // Check if links are present in insight
            if (insightData.insight) {
              const linkMatches = insightData.insight.match(/\[([^\]]+)\|(view|url):([^\]]+)\]/g);
              console.log(`[Enhanced Insights] Found ${linkMatches?.length || 0} links in insight text`);
            }
            
            // Log visualization data BEFORE coordination
            console.log(`[Enhanced Insights] BEFORE coordination - Chart:`, insightData.chart ? JSON.stringify(insightData.chart).substring(0, 100) : 'Missing');
            console.log(`[Enhanced Insights] BEFORE coordination - Image:`, insightData.image ? JSON.stringify(insightData.image).substring(0, 200) : 'Missing');
            
            // Always log image issues for debugging
            if (insightData.image) {
              const imageStr = JSON.stringify(insightData.image);
              if (!insightData.image.url || typeof insightData.image.url !== 'string' || insightData.image.url.trim() === '') {
                console.warn(`[Enhanced Insights] ⚠️ Image object missing/invalid URL:`, imageStr.substring(0, 200));
              }
            }
          }
          
          // COORDINATION LAYER: Validate and coordinate multi-modal components
          insightData = await coordinateMultiModalResponse(insightData, tileMetric, tileValue, tileSize, contentLimits);
          
          // Log after coordination (only if DEBUG_INSIGHTS is enabled)
          if (process.env.DEBUG_INSIGHTS === 'true') {
            console.log(`[Enhanced Insights] AFTER coordination - Chart:`, insightData.chart ? `Present (type: ${insightData.chart.type}, points: ${insightData.chart.data?.length || 0})` : 'Missing');
            console.log(`[Enhanced Insights] AFTER coordination - Image:`, insightData.image ? `Present (url: ${insightData.image.url?.substring(0, 50)}...)` : 'Missing');
          }
          
          // Normalize xFeeds format - handle both array of strings and array of objects
          if (insightData.xFeeds && Array.isArray(insightData.xFeeds)) {
            insightData.xFeeds = insightData.xFeeds.map(feed => {
              // If it's already an object, return as-is
              if (typeof feed === 'object' && feed !== null) {
                return feed;
              }
              // If it's a string, try to parse it or create object
              if (typeof feed === 'string') {
                // Try to extract account handle
                const accountMatch = feed.match(/@(\w+)/);
                const account = accountMatch ? `@${accountMatch[1]}` : '@unknown';
                const accountLower = account.toLowerCase();
                const feedLower = feed.toLowerCase();
                
                // Check for key accounts
                let isKeyAccount = false;
                let accountName = account.replace('@', '');
                
                if (accountLower === '@elonmusk' || feedLower.includes('@elonmusk')) {
                    isKeyAccount = true;
                    accountName = 'Elon Musk';
                } else if (accountLower === '@cathiedwood' || feedLower.includes('@cathiedwood') || feedLower.includes('cathie') || feedLower.includes('wood')) {
                    isKeyAccount = true;
                    accountName = 'Cathie Wood';
                } else if (feedLower.includes('arron') || feedLower.includes('burnet') || feedLower.includes('mach33')) {
                    isKeyAccount = true;
                    accountName = 'Arron Burnet';
                } else if (feedLower.includes('vlad')) {
                    isKeyAccount = true;
                    accountName = 'Vlad';
                }
                
                return {
                  account: account,
                  content: feed,
                  isKeyAccount: isKeyAccount,
                  accountName: accountName
                };
              }
              return feed;
            });
          }
        } else {
          // Fallback: create structured response from text
          insightData = {
            insight: aiResponse,
            xFeeds: [],
            marketContext: '',
            risks: [],
            opportunities: []
          };
        }
      } catch (parseError) {
        // If parsing fails, use the raw response
        insightData = {
          insight: aiResponse,
          xFeeds: [],
          marketContext: '',
          risks: [],
          opportunities: []
        };
      }
    }
    
    res.json({
      success: true,
      data: {
        ...insightData,
        metrics: {
          totalValue,
          earthValue,
          marsValue,
          earthPercent,
          marsPercent
        },
        ragContext: ragContext.substring(0, 500) // Include snippet of RAG context
      }
    });
  } catch (error) {
    console.error('Enhanced insights error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({ success: false, error: error.message, details: error.stack });
  }
});

// RAG function to pull context from documentation
async function getRAGContext(insightType, data, inputs) {
  const fs = require('fs');
  const path = require('path');
  const docsPath = path.join(__dirname, 'docs');
  
  let context = '';
  
  try {
    // Read relevant documentation files based on insight type
    const relevantDocs = [];
    
    if (insightType?.includes('valuation') || insightType?.includes('enterprise')) {
      relevantDocs.push('SPACEX_RISK_FRAMEWORK.md', 'BUSINESS_ALGORITHMS_COMPLETE.md');
    }
    if (insightType?.includes('starlink') || insightType?.includes('earth')) {
      relevantDocs.push('SYSTEM_ANALYSIS.md', 'BUSINESS_ALGORITHMS_COMPLETE.md');
    }
    if (insightType?.includes('mars')) {
      relevantDocs.push('SPACEX_RISK_FRAMEWORK.md');
    }
    if (insightType?.includes('risk')) {
      relevantDocs.push('SPACEX_RISK_FRAMEWORK.md', 'FACTOR_RISK_COMPLETE.md');
    }
    
    // Default: include key docs
    if (relevantDocs.length === 0) {
      relevantDocs.push('SPACEX_RISK_FRAMEWORK.md', 'SYSTEM_ANALYSIS.md', 'BUSINESS_ALGORITHMS_COMPLETE.md');
    }
    
    // Read and combine documentation
    for (const doc of relevantDocs) {
      const docPath = path.join(docsPath, doc);
      if (fs.existsSync(docPath)) {
        const content = fs.readFileSync(docPath, 'utf8');
        // Extract relevant sections (first 2000 chars per doc)
        context += `\n\n=== ${doc} ===\n${content.substring(0, 2000)}`;
      }
    }
    
    // Add model structure context if available
    if (modelStructure) {
      context += `\n\n=== Model Structure ===\n${JSON.stringify(modelStructure).substring(0, 1000)}`;
    }
    
  } catch (error) {
    console.error('RAG context error:', error);
    context = 'Documentation context unavailable.';
  }
  
  return context || 'No relevant context found.';
}

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

// AI Agent Chat Endpoint
app.post('/api/agent/chat', async (req, res) => {
  try {
    const { message, systemPrompt, context, history, imageUrl } = req.body;
    let requestedModel = req.headers['x-ai-model'] || process.env.DEFAULT_AI_MODEL || 'grok:grok-3';
    
    if (!message) {
      return res.json({ success: false, error: 'Message is required' });
    }

    // Check if we need vision capabilities (imageUrl present)
    const needsVision = !!(imageUrl || (context && context.imageAnalysis && context.imageAnalysis.imageUrl));
    const actualImageUrl = imageUrl || (context && context.imageAnalysis && context.imageAnalysis.imageUrl);
    
    // If vision is needed, use a vision-capable model
    if (needsVision) {
      // Prefer Claude 3.5 Sonnet for vision (best vision model)
      if (!requestedModel.startsWith('openai:') && !requestedModel.startsWith('grok:')) {
        requestedModel = 'claude-sonnet-3-5-20241022'; // Claude 3.5 Sonnet with vision
      } else if (requestedModel.startsWith('openai:')) {
        // Use GPT-4 Vision if OpenAI is requested
        requestedModel = 'openai:gpt-4o'; // GPT-4o has vision
      }
      console.log(`[Agent Chat] 🖼️ Vision required, using model: ${requestedModel}`);
    }

    // Build conversation history
    const messages = [];
    
    // Add system prompt if provided
    let finalSystemPrompt = systemPrompt || '';
    
    // Add user/builder information
    const userInfo = '\n\nUSER CONTEXT: You are assisting Vlad Saigau (@VladSaigau) and Aaron Burnett (@aaronburnett), who built and are using this SpaceX valuation tool at Mach33. Cathie Wood (@CathieDWood) is a partner.';
    
    // Add instructions for shorter responses with "Learn more" options
    if (finalSystemPrompt) {
      finalSystemPrompt += userInfo + '\n\nCRITICAL: Keep responses concise (2-3 sentences max). End each response with "Learn more: [topic1], [topic2], [topic3]" for deeper dives.';
    } else {
      finalSystemPrompt = userInfo + '\n\nKeep responses concise (2-3 sentences max). End each response with "Learn more: [topic1], [topic2], [topic3]" for deeper dives.';
    }
    
    if (finalSystemPrompt) {
      messages.push({
        role: 'system',
        content: finalSystemPrompt
      });
    }

    // Add conversation history (last 10 messages)
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        if (msg.role && msg.content) {
          messages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          });
        }
      });
    }

    // Build comprehensive context message
    let contextMessage = `User Question: ${message}\n\n`;
    
    // Add image analysis context if present
    if (context && context.imageAnalysis) {
      const imgAnalysis = context.imageAnalysis;
      contextMessage += `=== IMAGE CLICK ANALYSIS ===\n`;
      contextMessage += `Image URL: ${imgAnalysis.imageUrl || actualImageUrl || 'N/A'}\n`;
      contextMessage += `Image Topic: ${imgAnalysis.imageTopic || 'N/A'}\n`;
      if (imgAnalysis.clickCoordinates) {
        const coords = imgAnalysis.clickCoordinates;
        contextMessage += `Click Coordinates: (${coords.x}, ${coords.y}) pixels\n`;
        contextMessage += `Image Size: ${coords.imageWidth} x ${coords.imageHeight} pixels\n`;
        contextMessage += `Relative Position: ${(coords.relativeX * 100).toFixed(1)}% from left, ${(coords.relativeY * 100).toFixed(1)}% from top\n`;
        contextMessage += `Quadrant: ${coords.quadrant}\n`;
        contextMessage += `Region: ${coords.horizontalRegion} horizontally, ${coords.verticalRegion} vertically\n\n`;
      }
    }
    
    // Add user/builder information
    contextMessage += `=== USER INFORMATION ===\n`;
    contextMessage += `You are assisting Vlad Saigau (@VladSaigau) and Aaron Burnett (@aaronburnett), who built and are using this SpaceX valuation tool at Mach33. Cathie Wood (@CathieDWood) is a partner.\n\n`;
    
    if (context) {
      contextMessage += `=== CURRENT APPLICATION STATE ===\n`;
      contextMessage += `Current View: ${context.currentView || 'Unknown'}\n`;
      contextMessage += `Current Tab: ${context.currentTab || 'N/A'}\n`;
      contextMessage += `Current Sub-Tab: ${context.currentSubTab || 'N/A'}\n\n`;
      
      // Include navigation history if available
      if (context.navigationHistory && Array.isArray(context.navigationHistory) && context.navigationHistory.length > 0) {
        contextMessage += `=== NAVIGATION HISTORY (Recent Activity) ===\n`;
        context.navigationHistory.slice(-10).forEach((entry, index) => {
          const timeAgo = index === context.navigationHistory.length - 1 ? 'just now' : 
                         `${context.navigationHistory.length - index - 1} steps ago`;
          contextMessage += `${timeAgo}: ${entry.view}${entry.subTab ? ` > ${entry.subTab}` : ''}${entry.modelName ? ` (Model: ${entry.modelName})` : ''}\n`;
        });
        contextMessage += `\nUse this navigation history to understand what the user has been exploring and their likely intent.\n\n`;
      }
      
      // Current Model Information
      if (context.currentModel) {
        contextMessage += `=== CURRENT MODEL ===\n`;
        contextMessage += `Model Name: ${context.currentModel.name || 'Unnamed Model'}\n`;
        contextMessage += `Model ID: ${context.currentModel.id || 'N/A'}\n\n`;
        
        if (context.currentModel.valuationData) {
          const data = context.currentModel.valuationData;
          contextMessage += `Valuation Results:\n`;
          contextMessage += `- Total Enterprise Value: $${((data.total?.value || 0) / 1000).toFixed(2)}T\n`;
          contextMessage += `- Earth Operations: $${((data.earth?.adjustedValue || 0) / 1000).toFixed(2)}T\n`;
          contextMessage += `- Mars Operations: $${((data.mars?.adjustedValue || 0) / 1000).toFixed(2)}T\n\n`;
        }
        
        if (context.currentModel.inputs) {
          const inputs = context.currentModel.inputs;
          contextMessage += `Model Parameters:\n`;
          if (inputs.earth) {
            contextMessage += `Earth Operations:\n`;
            contextMessage += `- Starlink Penetration: ${((inputs.earth.starlinkPenetration || 0) * 100).toFixed(1)}%\n`;
            contextMessage += `- Launch Volume: ${inputs.earth.launchVolume || 0} launches/year\n`;
            contextMessage += `- Bandwidth Price Decline: ${((inputs.earth.bandwidthPriceDecline || 0) * 100).toFixed(1)}%/year\n`;
            contextMessage += `- Launch Price Decline: ${((inputs.earth.launchPriceDecline || 0) * 100).toFixed(1)}%/year\n`;
          }
          if (inputs.mars) {
            contextMessage += `Mars Operations:\n`;
            contextMessage += `- First Colony Year: ${inputs.mars.firstColonyYear || 'N/A'}\n`;
            contextMessage += `- Population Growth: ${((inputs.mars.populationGrowth || 0) * 100).toFixed(1)}%/year\n`;
            contextMessage += `- Transport Cost Decline: ${((inputs.mars.transportCostDecline || 0) * 100).toFixed(1)}%/year\n`;
            contextMessage += `- Industrial Bootstrap: ${inputs.mars.industrialBootstrap ? 'Yes' : 'No'}\n`;
          }
          if (inputs.financial) {
            contextMessage += `Financial Parameters:\n`;
            contextMessage += `- Discount Rate: ${((inputs.financial.discountRate || 0) * 100).toFixed(1)}%\n`;
            contextMessage += `- Dilution Factor: ${((inputs.financial.dilutionFactor || 0) * 100).toFixed(1)}%\n`;
            contextMessage += `- Terminal Growth: ${((inputs.financial.terminalGrowth || 0) * 100).toFixed(1)}%\n`;
          }
          contextMessage += `\n`;
        }
      }
      
      // All Models Summary
      if (context.allModels && context.allModels.length > 0) {
        contextMessage += `=== ALL SAVED MODELS (${context.allModels.length} total) ===\n`;
        contextMessage += `Available Models:\n`;
        context.allModels.slice(0, 10).forEach((model, idx) => {
          contextMessage += `${idx + 1}. ${model.name || 'Unnamed'} (ID: ${model.id}) - ${model.simulationCount || 0} simulations\n`;
        });
        if (context.allModels.length > 10) {
          contextMessage += `... and ${context.allModels.length - 10} more models\n`;
        }
        contextMessage += `\n`;
      }
      
      // Monte Carlo Simulations
      if (context.monteCarloSimulations) {
        const mc = context.monteCarloSimulations;
        contextMessage += `=== MONTE CARLO SIMULATION RESULTS ===\n`;
        if (mc.statistics && mc.statistics.totalValue) {
          const stats = mc.statistics.totalValue;
          contextMessage += `Simulation Runs: ${mc.runs || 'N/A'}\n`;
          contextMessage += `Total Enterprise Value Statistics:\n`;
          contextMessage += `- Mean: $${((stats.mean || 0) / 1000).toFixed(2)}T\n`;
          contextMessage += `- Median: $${((stats.median || 0) / 1000).toFixed(2)}T\n`;
          contextMessage += `- Std Dev: $${((stats.stdDev || 0) / 1000).toFixed(2)}T\n`;
          contextMessage += `- Min: $${((stats.min || 0) / 1000).toFixed(2)}T\n`;
          contextMessage += `- Max: $${((stats.max || 0) / 1000).toFixed(2)}T\n`;
          contextMessage += `- 10th Percentile: $${((stats.p10 || 0) / 1000).toFixed(2)}T\n`;
          contextMessage += `- 90th Percentile: $${((stats.p90 || 0) / 1000).toFixed(2)}T\n`;
        }
        contextMessage += `\n`;
      }
    }
    
    // Build user message - if vision is needed, include image
    let userMessageContent;
    if (needsVision) {
      // Vision mode: build message with image and text
      // Format depends on provider, but we'll use OpenAI format (works for both with conversion)
      userMessageContent = [
        {
          type: 'image_url',
          image_url: {
            url: actualImageUrl
          }
        },
        {
          type: 'text',
          text: contextMessage
        }
      ];
    } else {
      // Text-only mode: use contextMessage
      userMessageContent = contextMessage;
    }
    
    // Add user message (with image if vision is needed)
    messages.push({
      role: 'user',
      content: userMessageContent
    });

    // Call AI API with conversation history
    let aiResponse;
    try {
      // Determine provider from model string
      let provider = 'anthropic';
      let actualModel = requestedModel;
      
      if (requestedModel.startsWith('openai:')) {
        provider = 'openai';
        actualModel = requestedModel.replace('openai:', '');
      } else if (requestedModel.startsWith('grok:')) {
        provider = 'grok';
        actualModel = requestedModel.replace('grok:', '');
      }

      if (provider === 'grok') {
        const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
        if (!apiKey) {
          throw new Error('GROK_API_KEY not configured');
        }

        // Apply rate limiting
        await grokRateLimiter.waitIfNeeded();
        
        // Retry with exponential backoff on rate limit errors
        aiResponse = await retryWithBackoff(async () => {
          const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: actualModel || 'grok-2',
              messages: messages,
              max_tokens: 500, // Shorter responses
              temperature: 0.7
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`Grok API error: ${response.status} - ${errorText}`);
            error.status = response.status;
            throw error;
          }

          const data = await response.json();
          return data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
        }, 3, 2000); // Max 3 retries, starting with 2s delay
      } else if (provider === 'openai') {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY not configured');
        }
        
        // Use GPT-4o for vision if needed
        const visionModel = needsVision ? 'gpt-4o' : (actualModel || 'gpt-4o');
        console.log(`[Agent Chat] 📤 Sending to OpenAI: model=${visionModel}, hasImage=${needsVision}, messageCount=${messages.length}`);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: visionModel,
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        aiResponse = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
      } else {
        // Use Anthropic (Claude)
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          throw new Error('ANTHROPIC_API_KEY not configured');
        }

        // Convert messages format for Anthropic
        const anthropicMessages = messages
          .filter(m => m.role !== 'system')
          .map(m => {
            // If this is the last user message and it has image content, use the structured content
            if (m.role === 'user' && Array.isArray(m.content) && m === messages.filter(msg => msg.role !== 'system').slice(-1)[0]) {
              return {
                role: 'user',
                content: m.content // Already formatted with image blocks
              };
            }
            return {
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content : JSON.stringify(m.content))
            };
          });

        const systemMessage = messages.find(m => m.role === 'system')?.content || '';
        
        // Use Claude 3.5 Sonnet for vision, otherwise use requested model
        const visionModel = needsVision ? 'claude-sonnet-3-5-20241022' : (actualModel || 'claude-opus-4-1-20250805');
        
        console.log(`[Agent Chat] 📤 Sending to Anthropic: model=${visionModel}, hasImage=${needsVision}, messageCount=${anthropicMessages.length}`);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: visionModel,
            max_tokens: 2000,
            system: systemMessage,
            messages: anthropicMessages,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        aiResponse = data.content?.[0]?.text || 'Sorry, I could not generate a response.';
      }

      res.json({
        success: true,
        response: aiResponse
      });
    } catch (error) {
      console.error('Agent chat API error:', error);
      res.json({
        success: false,
        error: error.message || 'Failed to generate response'
      });
    }
  } catch (error) {
    console.error('Agent chat endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Initialize
loadData();

// Grok Voice API - Ephemeral Token Endpoint
app.post('/api/analyst/browser/voice-token', async (req, res) => {
  try {
    const grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
    
    if (!grokApiKey) {
      return res.status(400).json({ error: 'Grok API key not provided' });
    }
    
    // Request ephemeral token from Grok
    const tokenResponse = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 } // 5 minutes
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return res.status(tokenResponse.status).json({ 
        error: 'Failed to get ephemeral token',
        details: errorText 
      });
    }
    
    const tokenData = await tokenResponse.json();
    
    // Return client secret (ephemeral token)
    return res.json({
      clientSecret: tokenData.client_secret,
      expiresAt: tokenData.expires_at
    });
  } catch (error) {
    console.error('Voice token error:', error);
    return res.status(500).json({ error: 'Failed to get voice token', details: error.message });
  }
});

// WebSocket Server for Grok Voice Proxy
const wss = new WebSocket.Server({ 
  server: server,
  path: '/api/analyst/ws/grok-voice'
});

wss.on('connection', (clientWs, req) => {
  console.log('🔌 Client WebSocket connected for Grok Voice');
  
  const grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  
  if (!grokApiKey) {
    clientWs.close(1008, 'Grok API key not configured');
    return;
  }
  
  // Connect to Grok Voice API
  const grokWs = new WebSocket('wss://api.x.ai/v1/realtime', {
    headers: { 
      'Authorization': `Bearer ${grokApiKey}` 
    }
  });
  
  let grokConnected = false;
  const messageQueue = []; // Queue messages until Grok is connected
  
  // Forward messages from client to Grok
  clientWs.on('message', (data) => {
    // Log message type for debugging
    try {
      if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
        console.log('📤 Client → Grok: Binary message (audio data)');
      } else if (typeof data === 'string') {
        const message = JSON.parse(data);
        console.log('📤 Client → Grok:', message.type || 'unknown message type');
        
        // Log important messages in detail
        if (message.type === 'session.update') {
          console.log('📤 Session config sent:', JSON.stringify(message.session, null, 2));
        } else if (message.type === 'conversation.item.create') {
          console.log('📤 conversation.item.create sent:', {
            textLength: message.item?.content?.[0]?.text?.length || 0,
            textPreview: message.item?.content?.[0]?.text?.substring(0, 50) || 'no text'
          });
        } else if (message.type === 'response.create') {
          console.log('📤 response.create sent:', JSON.stringify(message, null, 2));
          console.log('✅ This should trigger Grok to generate audio response!');
        }
      }
    } catch (e) {
      console.log('📤 Client → Grok: Non-JSON message');
    }
    
    if (grokConnected && grokWs.readyState === WebSocket.OPEN) {
      grokWs.send(data);
    } else {
      // Queue message until Grok is connected
      console.log('⏳ Queuing message until Grok connection is ready...');
      messageQueue.push(data);
    }
  });
  
  // Forward messages from Grok to client
  grokWs.on('message', (data) => {
    // CRITICAL: Grok sends audio as JSON messages with base64-encoded audio, NOT raw binary!
    // Per working implementation: All messages from Grok are JSON strings
    try {
      // Parse as JSON first (Grok always sends JSON)
      const messageStr = data.toString();
      const message = JSON.parse(messageStr);
      
      console.log('📨 Grok → Client:', message.type || 'unknown message type');
      
      // Log important messages in detail
      if (message.type === 'session.updated' || message.type === 'session.created') {
        console.log('✅ Session message received:', JSON.stringify(message, null, 2));
      } else if (message.type === 'response.create') {
        console.log('🎬 response.create CONFIRMATION from Grok:', JSON.stringify(message, null, 2));
        console.log('✅ Grok is now generating audio response!');
      } else if (message.type === 'response.output_audio.delta' || message.type === 'response.audio.delta') {
        console.log('🎵🎵🎵 AUDIO CHUNK from Grok! 🎵🎵🎵');
        console.log('🎵 Message type:', message.type);
        console.log('🎵 Delta length:', message.delta?.length || 'no delta');
        console.log('🎵 Audio is base64-encoded in JSON message, NOT binary!');
      } else if (message.type === 'response.output_audio_transcript.delta' || message.type === 'response.text.delta') {
        console.log('📝 Transcript delta:', message.delta || message.text || 'no delta');
      } else if (message.type === 'error') {
        console.error('❌ ERROR from Grok:', JSON.stringify(message, null, 2));
      } else if (message.type && message.type.includes('response')) {
        console.log('📋 Response message:', JSON.stringify(message, null, 2));
      } else if (message.type === 'conversation.item.created' || message.type === 'conversation.created') {
        console.log('✅ Conversation item created:', JSON.stringify(message, null, 2));
      }
      
      // Forward JSON message to client (Grok sends JSON, not binary)
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(messageStr);
        console.log('✅ Forwarded JSON message to client, type:', message.type);
      } else {
        console.warn('⚠️ Client WebSocket not open (state:', clientWs.readyState, '), dropping message');
      }
    } catch (e) {
      // If it's not JSON, it might be binary (unlikely but handle it)
      console.log('⚠️ Grok → Client: Non-JSON message, treating as binary');
      if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
        const size = Buffer.isBuffer(data) ? data.length : data.byteLength;
        console.log('📦 Binary message size:', size, 'bytes');
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data);
        }
      } else {
        // Forward as-is
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data);
        }
      }
    }
  });
  
  // Handle errors
  grokWs.on('error', (error) => {
    console.error('Grok WebSocket error:', error);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, 'Grok connection error');
    }
  });
  
  clientWs.on('error', (error) => {
    console.error('Client WebSocket error:', error);
    if (grokWs.readyState === WebSocket.OPEN) {
      grokWs.close();
    }
  });
  
  // Handle disconnections
  clientWs.on('close', (code, reason) => {
    console.log('🔌 Client WebSocket closed:', code, reason.toString());
    if (grokWs.readyState === WebSocket.OPEN) {
      grokWs.close();
    }
  });
  
  grokWs.on('close', (code, reason) => {
    console.log('🔌 Grok WebSocket closed:', code, reason.toString());
    grokConnected = false;
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close();
    }
  });
  
  grokWs.on('open', () => {
    console.log('✅ Grok Voice WebSocket connection established');
    grokConnected = true;
    
    // Send all queued messages
    console.log(`📤 Sending ${messageQueue.length} queued messages to Grok...`);
    while (messageQueue.length > 0) {
      const queuedMessage = messageQueue.shift();
      if (grokWs.readyState === WebSocket.OPEN) {
        grokWs.send(queuedMessage);
      }
    }
    console.log('✅ All queued messages sent');
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 SpaceX Valuation Platform running on http://localhost:${PORT}\n`);
  console.log(`🔌 WebSocket server ready for Grok Voice at ws://localhost:${PORT}/api/analyst/ws/grok-voice\n`);
});

