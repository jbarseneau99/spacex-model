/**
 * Restore baseline model to spreadsheet reference values
 * This fixes the baseline if it was overwritten by simulations
 */

require('dotenv').config();
const mongoose = require('mongoose');

const atlasUri = process.env.ATLAS_MONGODB_URI || 'mongodb+srv://brantarseneau_db_user:NJ3nwtwdcpFXwnks@mach33semanticeditorclu.vxuueax.mongodb.net/spacex_valuation';
const cleanUri = atlasUri.replace(/^['"]|['"]$/g, '').replace(/\/[^/]+$/, '/spacex_valuation');

const modelSchema = new mongoose.Schema({
  name: String,
  description: String,
  inputs: mongoose.Schema.Types.Mixed,
  results: mongoose.Schema.Types.Mixed,
  isBaseline: Boolean,
  baselineSource: String
});

const ValuationModel = mongoose.models.ValuationModel || mongoose.model('ValuationModel', modelSchema, 'valuation_models');

async function restoreBaseline() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB\n');

    const baseline = await ValuationModel.findOne({ isBaseline: true });
    
    if (!baseline) {
      console.log('❌ No baseline model found!');
      process.exit(1);
    }

    console.log('📊 Restoring baseline to spreadsheet reference values...\n');
    console.log('Current values:');
    console.log('   Total Value:', baseline.results?.total?.value ? `$${(baseline.results.total.value / 1000).toFixed(1)}T` : 'N/A');
    console.log('   Monte Carlo Base:', baseline.results?.monteCarlo?.base ? `$${(baseline.results.monteCarlo.base / 1000).toFixed(1)}T` : 'N/A');
    console.log('   Monte Carlo Bear:', baseline.results?.monteCarlo?.bear ? `$${(baseline.results.monteCarlo.bear / 1000).toFixed(1)}T` : 'N/A');
    console.log('   Monte Carlo Optimistic:', baseline.results?.monteCarlo?.optimistic ? `$${(baseline.results.monteCarlo.optimistic / 1000).toFixed(1)}T` : 'N/A');
    console.log('');

    // Spreadsheet reference values (in billions)
    const spreadsheetBear = 1710.543;
    const spreadsheetBase = 2509.814;
    const spreadsheetOptimistic = 3112.608;

    // Restore the exact spreadsheet values
    baseline.results = {
      total: {
        value: spreadsheetBase, // Base case value
        breakdown: {
          earth: null, // Not specified in spreadsheet
          mars: null  // Not specified in spreadsheet
        }
      },
      monteCarlo: {
        bear: spreadsheetBear,
        base: spreadsheetBase,
        optimistic: spreadsheetOptimistic,
        statistics: {
          note: 'Reference values from spreadsheet - do not recalculate'
        },
        runs: null, // Not a simulation, just reference values
        spreadsheetReference: {
          bear: 'C10 (25th percentile)',
          base: 'D10 (Average)',
          optimistic: 'E10 (75th percentile)',
          sheet: 'Valuation Inputs & Logic'
        }
      },
      spreadsheetReference: {
        bear: spreadsheetBear,
        base: spreadsheetBase,
        optimistic: spreadsheetOptimistic,
        source: 'excel_parsed_detailed.json',
        note: 'These are reference values from the spreadsheet Monte Carlo results. Do not overwrite with calculated values.'
      }
    };

    // Ensure baseline flags are set
    baseline.isBaseline = true;
    baseline.baselineSource = 'spreadsheet';
    
    // Update description to emphasize it's a reference
    baseline.description = 'Baseline model replicating Excel spreadsheet Monte Carlo results. Used for reconciliation and comparison. Values: Bear=1,710.543B, Base=2,509.814B, Optimistic=3,112.608B. All 28 input parameters match spreadsheet exactly. DO NOT RUN SIMULATIONS ON THIS MODEL - it is a reference point only.';

    baseline.markModified('results');
    await baseline.save();

    console.log('✅ Restored spreadsheet reference values:');
    console.log('   Bear: $' + (spreadsheetBear / 1000).toFixed(3) + 'T');
    console.log('   Base: $' + (spreadsheetBase / 1000).toFixed(3) + 'T');
    console.log('   Optimistic: $' + (spreadsheetOptimistic / 1000).toFixed(3) + 'T');
    console.log('');
    console.log('⚠️  IMPORTANT:');
    console.log('   The baseline model should NOT have Monte Carlo simulations run on it.');
    console.log('   It is a reference point from the spreadsheet.');
    console.log('   If simulations are run, they will overwrite these reference values.');
    console.log('');
    console.log('💡 To prevent this in the future:');
    console.log('   1. Consider adding a check to prevent simulations on baseline models');
    console.log('   2. Or create a separate "Baseline Reference" model that is read-only');
    console.log(`\n✅ Baseline restored! Model ID: ${baseline._id}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error restoring baseline:', error);
    process.exit(1);
  }
}

restoreBaseline();




