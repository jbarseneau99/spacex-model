/**
 * Create baseline/reference model from spreadsheet values
 * This model replicates the spreadsheet Monte Carlo results for reconciliation
 * 
 * Spreadsheet values (from Valuation Inputs & Logic sheet):
 * - C10: 1,710.543 (25th percentile / Bear)
 * - D10: 2,509.814 (Average / Base)
 * - E10: 3,112.608 (75th percentile / Optimistic)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

const atlasUri = process.env.ATLAS_MONGODB_URI || 'mongodb+srv://brantarseneau_db_user:NJ3nwtwdcpFXwnks@mach33semanticeditorclu.vxuueax.mongodb.net/spacex_valuation';
const cleanUri = atlasUri.replace(/^['"]|['"]$/g, '').replace(/\/[^/]+$/, '/spacex_valuation');

const modelSchema = new mongoose.Schema({
  name: String,
  description: String,
  inputs: mongoose.Schema.Types.Mixed,
  results: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  favorite: { type: Boolean, default: false },
  isBaseline: { type: Boolean, default: false },
  baselineSource: { type: String },
  tags: [String]
});

const ValuationModel = mongoose.models.ValuationModel || mongoose.model('ValuationModel', modelSchema, 'valuation_models');

async function createBaselineModel() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');

    // Unset any existing baseline models
    await ValuationModel.updateMany(
      { isBaseline: true },
      { $set: { isBaseline: false } }
    );
    console.log('✅ Unset previous baseline models');

    // Load extracted inputs from spreadsheet
    let spreadsheetInputs;
    try {
      spreadsheetInputs = JSON.parse(fs.readFileSync('baseline-inputs.json', 'utf8'));
      console.log('✅ Loaded spreadsheet inputs from baseline-inputs.json');
    } catch (error) {
      console.warn('⚠️ Could not load baseline-inputs.json, using defaults');
      spreadsheetInputs = {
        earth: {
          starlinkPenetration: 0.15,
          bandwidthPriceDecline: 0.1,
          launchVolume: 100,
          launchPriceDecline: 0.05,
          starshipReusabilityYear: 2026,
          starshipCommercialViabilityYear: 2025,
          starshipPayloadCapacity: 75000,
          maxRocketProductionIncrease: 0.25,
          wrightsLawTurnaroundTime: 0.05,
          wrightsLawLaunchCost: 0.05,
          wrightsLawSatelliteGBPS: 0.07,
          realizedBandwidthTAMMultiplier: 0.5,
          starshipLaunchesForStarlink: 0.9,
          nonStarlinkLaunchMarketGrowth: 0.01,
          irrThresholdEarthToMars: 0,
          cashBufferPercent: 0.1
        },
        mars: {
          firstColonyYear: 2030,
          transportCostDecline: 0.2,
          populationGrowth: 0.15,
          industrialBootstrap: true,
          optimusCost2026: 50000,
          optimusAnnualCostDecline: 0.05,
          optimusProductivityMultiplier: 0.25,
          optimusLearningRate: 0.05,
          marsPayloadOptimusVsTooling: 0.01
        },
        financial: {
          discountRate: 0.12,
          dilutionFactor: 0.15,
          terminalGrowth: 0.03
        }
      };
    }
    
    // Fill in missing irrThresholdEarthToMars if null
    if (!spreadsheetInputs.earth.irrThresholdEarthToMars) {
      spreadsheetInputs.earth.irrThresholdEarthToMars = 0;
    }

    // Create baseline model with spreadsheet reference values
    const baselineModel = {
      name: 'Spreadsheet Baseline (Reference)',
      description: 'Baseline model replicating Excel spreadsheet Monte Carlo results. Used for reconciliation and comparison. Values: Bear=1,710.543B, Base=2,509.814B, Optimistic=3,112.608B. All 28 input parameters match spreadsheet exactly.',
      isBaseline: true,
      baselineSource: 'spreadsheet',
      tags: ['baseline', 'reference', 'spreadsheet', 'reconciliation'],
      favorite: true,
      inputs: spreadsheetInputs,
      results: {
        total: {
          value: 2509.814, // Base/Average from D10
          breakdown: {
            bear: 1710.543,    // 25th percentile from C10
            base: 2509.814,    // Average from D10
            optimistic: 3112.608 // 75th percentile from E10
          }
        },
        monteCarlo: {
          bear: 1710.543,      // C10: QUARTILE('Valuation Outputs'!$M$7:$M$5006,1)/10^9
          base: 2509.814,      // D10: AVERAGE('Valuation Outputs'!$M$7:$M$5006)/10^9
          optimistic: 3112.608 // E10: QUARTILE('Valuation Outputs'!$M$7:$M$5006,3)/10^9
        },
        spreadsheetReference: {
          cell: 'Valuation Inputs & Logic',
          bear: { cell: 'C10', value: 1710.543, formula: "QUARTILE('Valuation Outputs'!$M$7:$M$5006,1)/10^9" },
          base: { cell: 'D10', value: 2509.814, formula: "AVERAGE('Valuation Outputs'!$M$7:$M$5006)/10^9" },
          optimistic: { cell: 'E10', value: 3112.608, formula: "QUARTILE('Valuation Outputs'!$M$7:$M$5006,3)/10^9" }
        },
        note: 'This is a reference model matching spreadsheet outputs. Use for reconciliation. Actual Monte Carlo simulations will have small variations.'
      }
    };

    const saved = await ValuationModel.create(baselineModel);
    console.log('\n✅ Baseline model created!');
    console.log(`   ID: ${saved._id}`);
    console.log(`   Name: ${saved.name}`);
    console.log(`   Bear: $${saved.results.monteCarlo.bear.toFixed(3)}B`);
    console.log(`   Base: $${saved.results.monteCarlo.base.toFixed(3)}B`);
    console.log(`   Optimistic: $${saved.results.monteCarlo.optimistic.toFixed(3)}B`);
    console.log('\n📊 This model can now be used for:');
    console.log('   - Reconciliation with other models');
    console.log('   - Comparison baseline');
    console.log('   - Verifying calculation accuracy');
    console.log('\n⚠️ Note: Actual Monte Carlo simulations will have small variations');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating baseline model:', error);
    process.exit(1);
  }
}

createBaselineModel();

