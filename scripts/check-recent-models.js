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
}, { collection: 'valuation_models' });

const ValuationModel = mongoose.models.ValuationModel || mongoose.model('ValuationModel', modelSchema, 'valuation_models');

async function checkRecentModels() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(cleanUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all models sorted by creation date (newest first)
    const models = await ValuationModel.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`📊 Found ${models.length} most recent models:\n`);

    if (models.length === 0) {
      console.log('❌ No models found in database');
      return;
    }

    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name || '(Unnamed)'}`);
      console.log(`   ID: ${model._id}`);
      console.log(`   Type: ${model.type || 'model'}`);
      console.log(`   Created: ${new Date(model.createdAt).toLocaleString()}`);
      console.log(`   Updated: ${new Date(model.updatedAt).toLocaleString()}`);
      console.log(`   Favorite: ${model.favorite ? '⭐' : 'No'}`);
      console.log(`   Baseline: ${model.isBaseline ? 'Yes' : 'No'}`);
      console.log(`   Tags: ${model.tags && model.tags.length > 0 ? model.tags.join(', ') : 'None'}`);
      console.log(`   Has Inputs: ${model.inputs ? 'Yes' : 'No'}`);
      console.log(`   Has Results: ${model.results ? 'Yes' : 'No'}`);
      if (model.description) {
        console.log(`   Description: ${model.description.substring(0, 100)}${model.description.length > 100 ? '...' : ''}`);
      }
      console.log('');
    });

    // Check for models created in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentModels = await ValuationModel.find({
      createdAt: { $gte: oneHourAgo }
    }).sort({ createdAt: -1 }).lean();

    console.log(`\n🕐 Models created in the last hour: ${recentModels.length}`);
    if (recentModels.length > 0) {
      recentModels.forEach(model => {
        console.log(`   - ${model.name || '(Unnamed)'} (${new Date(model.createdAt).toLocaleString()})`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkRecentModels();






