/**
 * Seed default scenarios into the database
 * This script creates the three default scenarios (bear, base, bull) if they don't exist
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Database connection
let atlasUri = process.env.ATLAS_MONGODB_URI || 'mongodb+srv://brantarseneau_db_user:NJ3nwtwdcpFXwnks@mach33semanticeditorclu.vxuueax.mongodb.net/spacex_valuation';
atlasUri = atlasUri.replace(/^['"]|['"]$/g, '');
atlasUri = atlasUri.replace(/\/[^/]+$/, '/spacex_valuation');

// Scenario Schema
const scenarioSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
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
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: String,
  updatedBy: String
});

const Scenario = mongoose.models.Scenario || mongoose.model('Scenario', scenarioSchema, 'scenarios');

// Default scenarios
const defaultScenarios = [
  {
    key: 'bear',
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
    },
    isDefault: true
  },
  {
    key: 'base',
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
    },
    isDefault: true
  },
  {
    key: 'bull',
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
    },
    isDefault: true
  }
];

async function seedScenarios() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(atlasUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log('✓ Connected to MongoDB');

    console.log('\n📊 Seeding default scenarios...');
    
    let created = 0;
    let updated = 0;
    
    for (const scenarioData of defaultScenarios) {
      const existing = await Scenario.findOne({ key: scenarioData.key });
      
      if (existing) {
        // Update existing scenario
        await Scenario.findOneAndUpdate(
          { key: scenarioData.key },
          {
            ...scenarioData,
            updatedAt: new Date(),
            updatedBy: 'system'
          }
        );
        updated++;
        console.log(`  ✓ Updated scenario: ${scenarioData.key} (${scenarioData.name})`);
      } else {
        // Create new scenario
        await Scenario.create({
          ...scenarioData,
          createdBy: 'system',
          updatedBy: 'system'
        });
        created++;
        console.log(`  ✓ Created scenario: ${scenarioData.key} (${scenarioData.name})`);
      }
    }
    
    console.log(`\n✅ Scenario seeding complete!`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Total: ${defaultScenarios.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding scenarios:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedScenarios();
}

module.exports = { seedScenarios };

