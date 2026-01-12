/**
 * Add "AI Spending Bubble Retraction" scenario model
 * 
 * Scenario: Market views AI spending as a bubble and retracts by 35%
 * - Reduced market spending and investment
 * - Lower growth expectations
 * - Higher risk/discount rates
 * - Reduced TAM and penetration
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

async function addAIBubbleScenario() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB\n');

    // Check if scenario already exists
    const existing = await ValuationModel.findOne({ 
      name: { $regex: /AI.*Bubble|Bubble.*Retraction/i }
    }).lean();
    
    if (existing) {
      console.log('⚠️  Similar scenario already exists');
      console.log(`   Name: ${existing.name}`);
      console.log(`   ID: ${existing._id}`);
      console.log('   Skipping creation...\n');
      process.exit(0);
    }

    // AI Spending Bubble Retraction Scenario
    // Market retracts by 35% - applying this to key growth metrics
    const aiBubbleScenario = {
      name: 'AI Spending Bubble Retraction',
      description: 'Market views AI spending as a bubble and retracts by 35%. Reduced technology investment, lower growth expectations, higher risk premiums, and decreased market penetration. SpaceX faces reduced demand for AI-related services and infrastructure, leading to slower growth and higher discount rates.',
      tags: ['scenario', 'ai-bubble', 'market-correction', 'retraction', 'risk'],
      favorite: false,
      inputs: {
        earth: {
          // Starlink - 35% reduction in penetration due to market retraction
          starlinkPenetration: 0.0975, // 0.15 * 0.65 = 0.0975 (35% reduction)
          bandwidthPriceDecline: 0.065, // 0.10 * 0.65 = slower decline, less competition
          
          // Launch - Reduced volume due to lower AI/infrastructure spending
          launchVolume: 65, // 100 * 0.65 = 35% reduction
          launchPriceDecline: 0.0325, // 0.05 * 0.65 = slower decline
          
          // Starship - Delayed due to reduced investment
          starshipReusabilityYear: 2027, // Delayed by 1 year
          starshipCommercialViabilityYear: 2026, // Delayed by 1 year
          starshipPayloadCapacity: 75000, // Baseline - no increase
          maxRocketProductionIncrease: 0.1625, // 0.25 * 0.65 = reduced scaling
          
          // Wright's Law - Slower learning due to reduced volume
          wrightsLawTurnaroundTime: 0.0325, // 0.05 * 0.65 = slower improvement
          wrightsLawLaunchCost: 0.0325, // 0.05 * 0.65 = slower cost reduction
          wrightsLawSatelliteGBPS: 0.0455, // 0.07 * 0.65 = slower improvement
          
          // Market dynamics - Reduced TAM and growth
          realizedBandwidthTAMMultiplier: 0.325, // 0.5 * 0.65 = 35% reduction
          starshipLaunchesForStarlink: 0.9, // Keep baseline
          nonStarlinkLaunchMarketGrowth: 0.0065, // 0.01 * 0.65 = slower growth
          irrThresholdEarthToMars: 0, // Keep baseline
          cashBufferPercent: 0.15 // Increased buffer for market uncertainty
        },
        mars: {
          // Mars - Delayed due to reduced investment and focus on Earth operations
          firstColonyYear: 2032, // Delayed by 2 years
          transportCostDecline: 0.13, // 0.2 * 0.65 = slower decline
          populationGrowth: 0.0975, // 0.15 * 0.65 = slower growth
          industrialBootstrap: true,
          
          // Optimus - Reduced investment and slower development
          optimusCost2026: 65000, // Higher cost - less investment
          optimusAnnualCostDecline: 0.0325, // 0.05 * 0.65 = slower decline
          optimusProductivityMultiplier: 0.1625, // 0.25 * 0.65 = lower productivity
          optimusLearningRate: 0.0325, // 0.05 * 0.65 = slower learning
          marsPayloadOptimusVsTooling: 0.01 // Keep baseline
        },
        financial: {
          discountRate: 0.156, // 0.12 * 1.30 = 30% increase (higher risk premium)
          dilutionFactor: 0.195, // 0.15 * 1.30 = higher dilution (harder to raise capital)
          terminalGrowth: 0.0195 // 0.03 * 0.65 = lower terminal growth
        }
      },
      results: {
        note: 'Scenario model - requires Monte Carlo simulation to calculate results'
      }
    };

    // Create the model
    console.log('📊 Creating AI Spending Bubble Retraction Scenario Model...\n');
    
    const model = await ValuationModel.create(aiBubbleScenario);
    console.log('✅ Created Model: AI Spending Bubble Retraction');
    console.log(`   ID: ${model._id}`);
    console.log(`   Earth params: ${Object.keys(model.inputs.earth).length}`);
    console.log(`   Mars params: ${Object.keys(model.inputs.mars).length}`);
    console.log(`   Financial params: ${Object.keys(model.inputs.financial).length}`);
    console.log(`   TOTAL: ${Object.keys(model.inputs.earth).length + Object.keys(model.inputs.mars).length + Object.keys(model.inputs.financial).length} parameters\n`);

    console.log('='.repeat(80));
    console.log('✅ SUCCESS! AI Spending Bubble Retraction scenario model created');
    console.log('='.repeat(80));
    console.log('\n📊 Model Summary:');
    console.log(`   Name: ${model.name}`);
    console.log(`   Focus: Market retraction of 35% in AI spending`);
    console.log(`   Key changes:`);
    console.log(`      - Starlink Penetration: 0.15 → 0.0975 (35% reduction)`);
    console.log(`      - Launch Volume: 100 → 65 (35% reduction)`);
    console.log(`      - TAM Multiplier: 0.5 → 0.325 (35% reduction)`);
    console.log(`      - Discount Rate: 0.12 → 0.156 (30% increase for risk)`);
    console.log(`      - Terminal Growth: 0.03 → 0.0195 (35% reduction)`);
    console.log(`      - Starship delayed by 1 year`);
    console.log(`      - Mars colony delayed to 2032`);
    console.log('\n💡 Next Steps:');
    console.log('   - Load the model in the app');
    console.log('   - Run Monte Carlo simulations');
    console.log('   - Compare results to baseline and other scenarios');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating AI Bubble scenario model:', error);
    process.exit(1);
  }
}

addAIBubbleScenario();















