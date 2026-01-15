/**
 * Adjust scenario parameters to fix valuation issues
 * 
 * 1. Democratic Administration - Currently undervalued, needs higher penetration
 * 2. China Accelerates Success - User says it looks low, needs more aggressive parameters
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
  tags: [String]
});

const ValuationModel = mongoose.models.ValuationModel || mongoose.model('ValuationModel', modelSchema, 'valuation_models');

async function adjustScenarios() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB\n');

    // 1. Fix Democratic Administration Scenario
    const democraticModel = await ValuationModel.findOne({ 
      name: 'Democratic Administration Scenario' 
    });
    
    if (democraticModel) {
      console.log('📊 Adjusting Democratic Administration Scenario...');
      console.log('   Current Starlink Penetration:', democraticModel.inputs.earth.starlinkPenetration);
      
      // Increase penetration to offset the negative impact
      // Also increase TAM multiplier since government broadband initiatives help
      democraticModel.inputs.earth.starlinkPenetration = 0.16; // Increased from 0.12
      democraticModel.inputs.earth.realizedBandwidthTAMMultiplier = 0.60; // Increased from 0.55
      democraticModel.inputs.earth.maxRocketProductionIncrease = 0.35; // Increased from 0.30
      democraticModel.inputs.earth.wrightsLawTurnaroundTime = 0.05; // Improved from 0.04
      democraticModel.inputs.earth.wrightsLawLaunchCost = 0.05; // Improved from 0.04
      
      // Update description
      democraticModel.description = 'Federal government change to Democratic administration. Increased regulation, expanded government contracts, enhanced space policy support, and higher compliance costs. Government broadband initiatives boost Starlink penetration. Assumes more government oversight but also more federal space investment.';
      
      await democraticModel.save();
      console.log('   ✅ Updated parameters:');
      console.log('      - Starlink Penetration: 0.12 → 0.16');
      console.log('      - TAM Multiplier: 0.55 → 0.60');
      console.log('      - Max Rocket Production: 0.30 → 0.35');
      console.log('      - Wright\'s Law improvements restored');
      console.log(`   Model ID: ${democraticModel._id}\n`);
    } else {
      console.log('⚠️  Democratic Administration Scenario not found\n');
    }

    // 2. Boost China Accelerates Success Scenario
    const chinaModel = await ValuationModel.findOne({ 
      name: 'China Accelerates Success' 
    });
    
    if (chinaModel) {
      console.log('📊 Adjusting China Accelerates Success Scenario...');
      console.log('   Current Launch Volume:', chinaModel.inputs.earth.launchVolume);
      
      // Increase volume more aggressively
      // Increase penetration further
      // Reduce discount rate slightly (competitive but not catastrophic)
      chinaModel.inputs.earth.launchVolume = 160; // Increased from 140
      chinaModel.inputs.earth.starlinkPenetration = 0.20; // Increased from 0.18
      chinaModel.inputs.earth.realizedBandwidthTAMMultiplier = 0.50; // Increased from 0.45
      chinaModel.inputs.earth.maxRocketProductionIncrease = 0.45; // Increased from 0.40
      chinaModel.inputs.financial.discountRate = 0.13; // Reduced from 0.14 (still competitive but not as punitive)
      chinaModel.inputs.financial.dilutionFactor = 0.18; // Reduced from 0.20
      chinaModel.inputs.earth.wrightsLawTurnaroundTime = 0.08; // Increased from 0.07
      chinaModel.inputs.earth.wrightsLawLaunchCost = 0.10; // Increased from 0.09
      
      // Update description
      chinaModel.description = 'China accelerates its space program success, creating intense competition in the global launch market. SpaceX responds with aggressive scaling, higher launch volumes, and accelerated innovation. Increased competition pressures pricing but SpaceX maintains market leadership through volume and technology advantages.';
      
      await chinaModel.save();
      console.log('   ✅ Updated parameters:');
      console.log('      - Launch Volume: 140 → 160');
      console.log('      - Starlink Penetration: 0.18 → 0.20');
      console.log('      - TAM Multiplier: 0.45 → 0.50');
      console.log('      - Max Rocket Production: 0.40 → 0.45');
      console.log('      - Discount Rate: 0.14 → 0.13 (still competitive)');
      console.log('      - Dilution Factor: 0.20 → 0.18');
      console.log('      - Wright\'s Law improvements increased');
      console.log(`   Model ID: ${chinaModel._id}\n`);
    } else {
      console.log('⚠️  China Accelerates Success Scenario not found\n');
    }

    console.log('='.repeat(80));
    console.log('✅ SUCCESS! Both scenarios adjusted');
    console.log('='.repeat(80));
    console.log('\n💡 Next Steps:');
    console.log('   1. Load each model in the app');
    console.log('   2. Run Monte Carlo simulations to get updated valuations');
    console.log('   3. Compare results to baseline');
    console.log('\n📊 Expected Changes:');
    console.log('   - Democratic Administration: Should be higher (closer to or above baseline)');
    console.log('   - China Accelerates Success: Should be significantly higher (competitive but successful)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adjusting scenarios:', error);
    process.exit(1);
  }
}

adjustScenarios();





























