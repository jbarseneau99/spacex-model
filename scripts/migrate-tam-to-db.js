/**
 * Migration script to load TAM data from JSON file into MongoDB database
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// TAM Data Schema (same as in server.js)
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

// Connect to MongoDB
const atlasUri = process.env.ATLAS_MONGODB_URI || 'mongodb+srv://brantarseneau_db_user:NJ3nwtwdcpFXwnks@mach33semanticeditorclu.vxuueax.mongodb.net/spacex_valuation';
const cleanUri = atlasUri.replace(/^['"]|['"]$/g, '').replace(/\/[^/]+$/, '/spacex_valuation');

async function migrateTAMData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(cleanUri);
    console.log('✓ Connected to MongoDB\n');

    const TAMData = mongoose.model('TAMData', tamDataSchema, 'tam_reference_data');

    // Load TAM JSON file
    const tamJsonPath = path.join(__dirname, '../data/earth-bandwidth-tam.json');
    if (!fs.existsSync(tamJsonPath)) {
      throw new Error(`TAM JSON file not found: ${tamJsonPath}`);
    }

    console.log('📖 Reading TAM JSON file...');
    const tamJson = JSON.parse(fs.readFileSync(tamJsonPath, 'utf8'));
    console.log(`✓ Loaded ${tamJson.data.length} TAM entries\n`);

    // Check if TAM data already exists
    const existing = await TAMData.findOne({ name: 'Earth Bandwidth TAM', isActive: true });
    if (existing) {
      console.log('⚠️  Active TAM data already exists in database');
      console.log(`   Name: ${existing.name}`);
      console.log(`   Version: ${existing.version}`);
      console.log(`   Data entries: ${existing.data.length}`);
      console.log(`   Created: ${existing.createdAt}`);
      console.log('\n   Do you want to:');
      console.log('   1. Create a new version (deactivate old, create new)');
      console.log('   2. Skip migration');
      
      // For automated script, we'll create new version
      console.log('\n   Creating new version...\n');
      
      // Deactivate existing
      await TAMData.updateMany(
        { name: 'Earth Bandwidth TAM', isActive: true },
        { isActive: false }
      );
      
      // Get next version number
      const latest = await TAMData.findOne({ name: 'Earth Bandwidth TAM' }).sort({ version: -1 });
      const nextVersion = latest ? latest.version + 1 : 1;
      
      // Create new entry
      const newTAMData = new TAMData({
        name: 'Earth Bandwidth TAM',
        description: tamJson.metadata.description || 'Total Addressable Market lookup table for bandwidth pricing',
        source: tamJson.metadata.source || 'Earth Bandwidth TAM',
        range: tamJson.metadata.range || 'A8:B1012',
        data: tamJson.data,
        metadata: tamJson.metadata,
        version: nextVersion,
        isActive: true,
        createdBy: 'migration-script',
        updatedBy: 'migration-script'
      });
      
      await newTAMData.save();
      console.log(`✓ Created new TAM data version ${nextVersion}`);
      console.log(`✓ Deactivated previous version(s)`);
    } else {
      // Create initial entry
      console.log('📝 Creating TAM data entry...');
      const tamData = new TAMData({
        name: 'Earth Bandwidth TAM',
        description: tamJson.metadata.description || 'Total Addressable Market lookup table for bandwidth pricing',
        source: tamJson.metadata.source || 'Earth Bandwidth TAM',
        range: tamJson.metadata.range || 'A8:B1012',
        data: tamJson.data,
        metadata: tamJson.metadata,
        version: 1,
        isActive: true,
        createdBy: 'migration-script',
        updatedBy: 'migration-script'
      });
      
      await tamData.save();
      console.log(`✓ Created TAM data entry`);
    }

    // Verify
    const verify = await TAMData.findOne({ name: 'Earth Bandwidth TAM', isActive: true });
    console.log('\n✅ Migration complete!');
    console.log(`   Name: ${verify.name}`);
    console.log(`   Version: ${verify.version}`);
    console.log(`   Data entries: ${verify.data.length}`);
    console.log(`   Key range: ${verify.data[0].key} to ${verify.data[verify.data.length - 1].key}`);
    console.log(`   Value range: ${verify.data[0].value} to ${verify.data[verify.data.length - 1].value}`);

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateTAMData();

