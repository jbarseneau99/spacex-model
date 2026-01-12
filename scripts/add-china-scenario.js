/**
 * Add "China Accelerates Success" scenario model
 * 
 * Scenario: China Accelerates Success
 * - Increased competition from China's space program
 * - Pressure on launch pricing
 * - Faster technology development needed
 * - More competitive market landscape
 * - Potential impact on SpaceX's market share
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

async function addChinaScenario() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB\n');

    // Check if scenario already exists
    const existing = await ValuationModel.findOne({ 
      name: 'China Accelerates Success',
      tags: { $in: ['china', 'scenario'] }
    }).lean();
    
    if (existing) {
      console.log('⚠️  Scenario "China Accelerates Success" already exists');
      console.log(`   ID: ${existing._id}`);
      console.log('   Skipping creation...\n');
      process.exit(0);
    }

    // China Accelerates Success Scenario
    const chinaScenario = {
      name: 'China Accelerates Success',
      description: 'China accelerates its space program success, creating intense competition in the global launch market. Increased competition pressures pricing, accelerates technology development timelines, and creates a more competitive landscape. SpaceX must innovate faster and maintain cost leadership.',
      tags: ['scenario', 'china', 'competition', 'market-pressure', 'accelerated-development'],
      favorite: false,
      inputs: {
        earth: {
          // Starlink - Competition may slow penetration, but SpaceX must be aggressive
          starlinkPenetration: 0.18, // Higher penetration needed to maintain market position
          bandwidthPriceDecline: 0.15, // Faster decline due to competitive pressure
          
          // Launch - Intense competition from China
          launchVolume: 140, // Higher volume to compete, but pricing pressure
          launchPriceDecline: 0.10, // Much faster decline due to competition
          
          // Starship - Must accelerate development to stay ahead
          starshipReusabilityYear: 2024, // Earlier - critical competitive advantage
          starshipCommercialViabilityYear: 2023, // Earlier - urgent need
          starshipPayloadCapacity: 95000, // Higher capacity to differentiate
          maxRocketProductionIncrease: 0.40, // Aggressive scaling to compete
          
          // Wright's Law - Must learn faster to maintain advantage
          wrightsLawTurnaroundTime: 0.07, // Faster improvement - survival mode
          wrightsLawLaunchCost: 0.09, // Faster cost reduction - competitive necessity
          wrightsLawSatelliteGBPS: 0.10, // Faster satellite improvement
          
          // Market dynamics - Competitive pressure
          realizedBandwidthTAMMultiplier: 0.45, // Lower multiplier - more competition
          starshipLaunchesForStarlink: 0.75, // More commercial focus
          nonStarlinkLaunchMarketGrowth: 0.03, // Higher growth but more competitive
          irrThresholdEarthToMars: 0, // Focus on Earth - Mars delayed
          cashBufferPercent: 0.12 // Higher buffer for competitive investments
        },
        mars: {
          // Mars - Delayed due to Earth competition focus
          firstColonyYear: 2035, // Later - resources focused on Earth competition
          transportCostDecline: 0.28, // Faster decline with high volume competition
          populationGrowth: 0.40, // Moderate growth - delayed timeline
          industrialBootstrap: true,
          
          // Optimus - Accelerated for competitive advantage
          optimusCost2026: 35000, // Lower cost - competitive necessity
          optimusAnnualCostDecline: 0.10, // Faster decline - aggressive pricing
          optimusProductivityMultiplier: 0.32, // Higher productivity - competitive edge
          optimusLearningRate: 0.10, // Faster learning - survival mode
          marsPayloadOptimusVsTooling: 0.006 // Less Optimus - Earth focus
        },
        financial: {
          discountRate: 0.14, // Higher discount rate - more competitive risk
          dilutionFactor: 0.20, // Higher dilution - need capital for competition
          terminalGrowth: 0.035 // Moderate terminal growth - competitive market
        }
      },
      results: {
        note: 'Scenario model - requires Monte Carlo simulation to calculate results'
      }
    };

    // Create the model
    console.log('📊 Creating China Accelerates Success Scenario Model...\n');
    
    const model = await ValuationModel.create(chinaScenario);
    console.log('✅ Created Model: China Accelerates Success');
    console.log(`   ID: ${model._id}`);
    console.log(`   Earth params: ${Object.keys(model.inputs.earth).length}`);
    console.log(`   Mars params: ${Object.keys(model.inputs.mars).length}`);
    console.log(`   Financial params: ${Object.keys(model.inputs.financial).length}`);
    console.log(`   TOTAL: ${Object.keys(model.inputs.earth).length + Object.keys(model.inputs.mars).length + Object.keys(model.inputs.financial).length} parameters\n`);

    console.log('='.repeat(80));
    console.log('✅ SUCCESS! China Accelerates Success scenario model created');
    console.log('='.repeat(80));
    console.log('\n📊 Model Summary:');
    console.log(`   Name: ${model.name}`);
    console.log(`   Focus: Intense competition from China's accelerated space program`);
    console.log(`   Key changes:`);
    console.log(`      - Faster launch price decline (0.10 vs 0.05)`);
    console.log(`      - Earlier Starship development (2023-2024)`);
    console.log(`      - Higher launch volume (140 vs 100)`);
    console.log(`      - Aggressive Wright's Law improvements`);
    console.log(`      - Higher discount rate (0.14) due to competitive risk`);
    console.log(`      - Mars delayed to 2035 (Earth competition focus)`);
    console.log('\n💡 Next Steps:');
    console.log('   - Load the model in the app');
    console.log('   - Run Monte Carlo simulations');
    console.log('   - Compare results to baseline and other scenarios');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating China scenario model:', error);
    process.exit(1);
  }
}

addChinaScenario();














