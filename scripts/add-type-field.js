/**
 * Add 'type' field to existing models and scenarios
 * - Models: type='model' (actual market conditions)
 * - Scenarios: type='scenario' (what-if/stress test situations)
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
  type: { type: String, enum: ['model', 'scenario'], default: 'model' },
  tags: [String]
});

const ValuationModel = mongoose.models.ValuationModel || mongoose.model('ValuationModel', modelSchema, 'valuation_models');

async function addTypeField() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find all models
    const allModels = await ValuationModel.find({});
    
    console.log(`📊 Found ${allModels.length} models to categorize\n`);

    // Scenarios to mark (by name or tags)
    const scenarioNames = [
      'Democratic Administration Scenario',
      'Accelerated Commercial Space Growth',
      'China Accelerates Success',
      'AI Spending Bubble Retraction'
    ];

    let modelsUpdated = 0;
    let scenariosUpdated = 0;

    for (const model of allModels) {
      // Baseline is always a model
      if (model.isBaseline) {
        if (!model.type || model.type !== 'model') {
          model.type = 'model';
          model.markModified('type');
          await model.save();
          modelsUpdated++;
          console.log(`✅ Marked as MODEL: ${model.name}`);
        }
      }
      // Check if it's a scenario by name or tags
      else if (scenarioNames.includes(model.name) || 
               (model.tags && model.tags.includes('scenario'))) {
        if (!model.type || model.type !== 'scenario') {
          model.type = 'scenario';
          model.markModified('type');
          await model.save();
          scenariosUpdated++;
          console.log(`✅ Marked as SCENARIO: ${model.name}`);
        }
      }
      // Default to model if not specified
      else {
        if (!model.type) {
          model.type = 'model';
          model.markModified('type');
          await model.save();
          modelsUpdated++;
          console.log(`✅ Defaulted to MODEL: ${model.name}`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS! Type field added to all models');
    console.log('='.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Models updated: ${modelsUpdated}`);
    console.log(`   Scenarios updated: ${scenariosUpdated}`);
    console.log(`   Total: ${modelsUpdated + scenariosUpdated}`);

    // Verify
    const models = await ValuationModel.find({ type: 'model' }).select('name').lean();
    const scenarios = await ValuationModel.find({ type: 'scenario' }).select('name').lean();
    
    console.log(`\n📋 Verification:`);
    console.log(`   Models (${models.length}):`);
    models.forEach(m => console.log(`      - ${m.name}`));
    console.log(`\n   Scenarios (${scenarios.length}):`);
    scenarios.forEach(s => console.log(`      - ${s.name}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding type field:', error);
    process.exit(1);
  }
}

addTypeField();




