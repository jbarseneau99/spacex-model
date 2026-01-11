/**
 * Compare a model against the baseline model
 * Shows reconciliation differences
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  favorite: { type: Boolean, default: false },
  isBaseline: { type: Boolean, default: false },
  baselineSource: { type: String },
  tags: [String]
});

const ValuationModel = mongoose.models.ValuationModel || mongoose.model('ValuationModel', modelSchema, 'valuation_models');

async function compareToBaseline(modelId = null) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get baseline model
    const baseline = await ValuationModel.findOne({ isBaseline: true }).lean();
    if (!baseline) {
      console.log('❌ No baseline model found. Run: node scripts/create-baseline-model.js');
      process.exit(1);
    }

    console.log('📊 BASELINE MODEL:');
    console.log(`   Name: ${baseline.name}`);
    console.log(`   Bear: $${baseline.results?.monteCarlo?.bear?.toFixed(3) || 'N/A'}B`);
    console.log(`   Base: $${baseline.results?.monteCarlo?.base?.toFixed(3) || 'N/A'}B`);
    console.log(`   Optimistic: $${baseline.results?.monteCarlo?.optimistic?.toFixed(3) || 'N/A'}B\n`);

    // Get model to compare (or latest)
    let model;
    if (modelId) {
      model = await ValuationModel.findById(modelId).lean();
      if (!model) {
        console.log(`❌ Model ${modelId} not found`);
        process.exit(1);
      }
    } else {
      model = await ValuationModel.findOne({ isBaseline: false }).sort({ createdAt: -1 }).lean();
      if (!model) {
        console.log('❌ No models found to compare');
        process.exit(1);
      }
    }

    console.log('📊 COMPARISON MODEL:');
    console.log(`   Name: ${model.name}`);
    console.log(`   ID: ${model._id}\n`);

    // Compare values
    const baselineBear = baseline.results?.monteCarlo?.bear || baseline.results?.total?.breakdown?.bear;
    const baselineBase = baseline.results?.monteCarlo?.base || baseline.results?.total?.value;
    const baselineOptimistic = baseline.results?.monteCarlo?.optimistic || baseline.results?.total?.breakdown?.optimistic;

    const modelBear = model.results?.monteCarlo?.bear || model.results?.total?.breakdown?.bear;
    const modelBase = model.results?.monteCarlo?.base || model.results?.total?.value;
    const modelOptimistic = model.results?.monteCarlo?.optimistic || model.results?.total?.breakdown?.optimistic;

    console.log('='.repeat(80));
    console.log('RECONCILIATION COMPARISON');
    console.log('='.repeat(80));

    if (baselineBear && modelBear) {
      const diff = modelBear - baselineBear;
      const pctDiff = (diff / baselineBear) * 100;
      console.log(`\nBear Scenario (25th percentile):`);
      console.log(`   Baseline: $${baselineBear.toFixed(3)}B`);
      console.log(`   Model:    $${modelBear.toFixed(3)}B`);
      console.log(`   Difference: $${diff.toFixed(3)}B (${pctDiff > 0 ? '+' : ''}${pctDiff.toFixed(2)}%)`);
    }

    if (baselineBase && modelBase) {
      const diff = modelBase - baselineBase;
      const pctDiff = (diff / baselineBase) * 100;
      console.log(`\nBase Scenario (Average):`);
      console.log(`   Baseline: $${baselineBase.toFixed(3)}B`);
      console.log(`   Model:    $${modelBase.toFixed(3)}B`);
      console.log(`   Difference: $${diff.toFixed(3)}B (${pctDiff > 0 ? '+' : ''}${pctDiff.toFixed(2)}%)`);
    }

    if (baselineOptimistic && modelOptimistic) {
      const diff = modelOptimistic - baselineOptimistic;
      const pctDiff = (diff / baselineOptimistic) * 100;
      console.log(`\nOptimistic Scenario (75th percentile):`);
      console.log(`   Baseline: $${baselineOptimistic.toFixed(3)}B`);
      console.log(`   Model:    $${modelOptimistic.toFixed(3)}B`);
      console.log(`   Difference: $${diff.toFixed(3)}B (${pctDiff > 0 ? '+' : ''}${pctDiff.toFixed(2)}%)`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Comparison complete');
    console.log('\n💡 Note: Small differences are expected due to:');
    console.log('   - Monte Carlo simulation randomness');
    console.log('   - Rounding differences');
    console.log('   - Input parameter variations');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

const modelId = process.argv[2] || null;
compareToBaseline(modelId);



