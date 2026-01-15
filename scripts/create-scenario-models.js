/**
 * Create two new scenario models with all 28 parameters
 * 
 * Scenario 1: Federal Government Change to Democratic
 * - More regulation, government contracts, space policy changes
 * 
 * Scenario 2: Accelerated Commercial Space Growth
 * - Faster growth, increased competition, market expansion
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

async function createScenarioModels() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find and delete old models (keep baseline)
    const oldModels = await ValuationModel.find({ isBaseline: { $ne: true } }).lean();
    console.log(`📊 Found ${oldModels.length} existing models (excluding baseline)`);
    
    if (oldModels.length > 0) {
      const deleteResult = await ValuationModel.deleteMany({ isBaseline: { $ne: true } });
      console.log(`✅ Deleted ${deleteResult.deletedCount} old models\n`);
    }

    // Scenario 1: Federal Government Change to Democratic
    const democraticScenario = {
      name: 'Democratic Administration Scenario',
      description: 'Federal government change to Democratic administration. Increased regulation, expanded government contracts, enhanced space policy support, and higher compliance costs. Assumes more government oversight but also more federal space investment.',
      tags: ['scenario', 'democratic', 'government', 'regulation', 'policy'],
      favorite: false,
      inputs: {
        earth: {
          // Starlink - More regulation may slow penetration, but government contracts help
          starlinkPenetration: 0.12, // Slightly lower due to increased regulation
          bandwidthPriceDecline: 0.08, // Slower decline due to regulatory compliance costs
          
          // Launch - More government contracts, but higher compliance costs
          launchVolume: 120, // Higher volume due to government contracts
          launchPriceDecline: 0.03, // Slower decline due to regulatory compliance
          
          // Starship - Government support accelerates development
          starshipReusabilityYear: 2025, // Earlier due to government support
          starshipCommercialViabilityYear: 2024, // Earlier government contracts
          starshipPayloadCapacity: 80000, // Higher capacity with government investment
          maxRocketProductionIncrease: 0.30, // Higher with government support
          
          // Wright's Law - Regulatory compliance slows learning curve
          wrightsLawTurnaroundTime: 0.04, // Slower improvement due to compliance
          wrightsLawLaunchCost: 0.04, // Slower improvement due to regulation
          wrightsLawSatelliteGBPS: 0.06, // Slightly slower
          
          // Market dynamics
          realizedBandwidthTAMMultiplier: 0.55, // Higher with government broadband initiatives
          starshipLaunchesForStarlink: 0.85, // More government launches
          nonStarlinkLaunchMarketGrowth: 0.015, // Higher growth with government support
          irrThresholdEarthToMars: 0.05, // Higher threshold due to regulatory costs
          cashBufferPercent: 0.15 // Higher buffer for regulatory compliance
        },
        mars: {
          // Mars - Government support accelerates timeline
          firstColonyYear: 2028, // Earlier with government support
          transportCostDecline: 0.22, // Faster decline with government investment
          populationGrowth: 0.55, // Higher growth with government support
          industrialBootstrap: true,
          
          // Optimus - Government contracts accelerate development
          optimusCost2026: 45000, // Lower cost with government scale
          optimusAnnualCostDecline: 0.06, // Faster decline
          optimusProductivityMultiplier: 0.28, // Higher productivity
          optimusLearningRate: 0.06, // Faster learning
          marsPayloadOptimusVsTooling: 0.012 // More Optimus with government support
        },
        financial: {
          discountRate: 0.11, // Slightly lower with government backing
          dilutionFactor: 0.12, // Lower dilution with government contracts
          terminalGrowth: 0.035 // Higher terminal growth with policy support
        }
      },
      results: {
        note: 'Scenario model - requires Monte Carlo simulation to calculate results'
      }
    };

    // Scenario 2: Accelerated Commercial Space Growth
    const acceleratedScenario = {
      name: 'Accelerated Commercial Space Growth',
      description: 'Rapid commercial space market expansion. Increased competition, faster technology adoption, aggressive market penetration, and accelerated cost reductions. Assumes strong private sector growth with minimal regulatory friction.',
      tags: ['scenario', 'accelerated', 'commercial', 'growth', 'competition'],
      favorite: false,
      inputs: {
        earth: {
          // Starlink - Aggressive market penetration
          starlinkPenetration: 0.20, // Higher penetration with aggressive growth
          bandwidthPriceDecline: 0.12, // Faster decline with competition
          
          // Launch - High volume commercial market
          launchVolume: 150, // Much higher volume
          launchPriceDecline: 0.08, // Faster decline with competition
          
          // Starship - Rapid commercial adoption
          starshipReusabilityYear: 2025, // Early commercial viability
          starshipCommercialViabilityYear: 2024, // Early commercial operations
          starshipPayloadCapacity: 90000, // Higher capacity with rapid iteration
          maxRocketProductionIncrease: 0.35, // Aggressive production scaling
          
          // Wright's Law - Faster learning with high volume
          wrightsLawTurnaroundTime: 0.06, // Faster improvement
          wrightsLawLaunchCost: 0.07, // Faster cost reduction
          wrightsLawSatelliteGBPS: 0.09, // Faster satellite improvement
          
          // Market dynamics - Aggressive expansion
          realizedBandwidthTAMMultiplier: 0.60, // Higher realized TAM
          starshipLaunchesForStarlink: 0.80, // More commercial launches
          nonStarlinkLaunchMarketGrowth: 0.025, // High commercial growth
          irrThresholdEarthToMars: 0, // Lower threshold, focus on Earth
          cashBufferPercent: 0.08 // Lower buffer, aggressive reinvestment
        },
        mars: {
          // Mars - Commercial focus delays Mars
          firstColonyYear: 2032, // Later, focus on Earth commercial
          transportCostDecline: 0.25, // Faster decline with high volume
          populationGrowth: 0.45, // Moderate growth, commercial focus
          industrialBootstrap: true,
          
          // Optimus - Commercial applications accelerate development
          optimusCost2026: 40000, // Lower with commercial scale
          optimusAnnualCostDecline: 0.08, // Faster decline
          optimusProductivityMultiplier: 0.30, // Higher productivity
          optimusLearningRate: 0.08, // Faster learning
          marsPayloadOptimusVsTooling: 0.008 // Less Optimus, more commercial focus
        },
        financial: {
          discountRate: 0.13, // Higher discount rate (more risk, higher growth)
          dilutionFactor: 0.18, // Higher dilution (aggressive growth)
          terminalGrowth: 0.04 // Higher terminal growth
        }
      },
      results: {
        note: 'Scenario model - requires Monte Carlo simulation to calculate results'
      }
    };

    // Create both models
    console.log('📊 Creating Scenario Models...\n');
    
    const model1 = await ValuationModel.create(democraticScenario);
    console.log('✅ Created Model 1: Democratic Administration Scenario');
    console.log(`   ID: ${model1._id}`);
    console.log(`   Earth params: ${Object.keys(model1.inputs.earth).length}`);
    console.log(`   Mars params: ${Object.keys(model1.inputs.mars).length}`);
    console.log(`   Financial params: ${Object.keys(model1.inputs.financial).length}`);
    console.log(`   TOTAL: ${Object.keys(model1.inputs.earth).length + Object.keys(model1.inputs.mars).length + Object.keys(model1.inputs.financial).length} parameters\n`);

    const model2 = await ValuationModel.create(acceleratedScenario);
    console.log('✅ Created Model 2: Accelerated Commercial Space Growth');
    console.log(`   ID: ${model2._id}`);
    console.log(`   Earth params: ${Object.keys(model2.inputs.earth).length}`);
    console.log(`   Mars params: ${Object.keys(model2.inputs.mars).length}`);
    console.log(`   Financial params: ${Object.keys(model2.inputs.financial).length}`);
    console.log(`   TOTAL: ${Object.keys(model2.inputs.earth).length + Object.keys(model2.inputs.mars).length + Object.keys(model2.inputs.financial).length} parameters\n`);

    console.log('='.repeat(80));
    console.log('✅ SUCCESS! Two new scenario models created with all 28 parameters');
    console.log('='.repeat(80));
    console.log('\n📊 Model Summary:');
    console.log(`   1. ${model1.name}`);
    console.log(`      - Focus: Government contracts, regulation, policy support`);
    console.log(`      - Key changes: Higher launch volume, earlier Starship, more regulation`);
    console.log(`\n   2. ${model2.name}`);
    console.log(`      - Focus: Aggressive commercial growth, competition`);
    console.log(`      - Key changes: Higher penetration, faster cost decline, higher volume`);
    console.log('\n💡 Next Steps:');
    console.log('   - Load each model in the app');
    console.log('   - Run Monte Carlo simulations');
    console.log('   - Compare results to baseline model');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating scenario models:', error);
    process.exit(1);
  }
}

createScenarioModels();





























