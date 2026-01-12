/**
 * Final adjustments to scenarios based on user feedback
 * 
 * 1. China Accelerates Success - Boost further (currently too low)
 * 2. Democratic Administration - Reduce (currently too high/optimistic)
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

async function finalAdjustScenarios() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB\n');

    // 1. Boost China Accelerates Success Further
    const chinaModel = await ValuationModel.findOne({ 
      name: 'China Accelerates Success' 
    });
    
    if (chinaModel) {
      console.log('📊 Boosting China Accelerates Success Scenario...');
      console.log('   Current Launch Volume:', chinaModel.inputs.earth.launchVolume);
      console.log('   Current Penetration:', chinaModel.inputs.earth.starlinkPenetration);
      
      // More aggressive parameters - SpaceX wins through scale and innovation
      chinaModel.inputs.earth.launchVolume = 180; // Increased from 160 - massive scale
      chinaModel.inputs.earth.starlinkPenetration = 0.22; // Increased from 0.20 - aggressive market capture
      chinaModel.inputs.earth.realizedBandwidthTAMMultiplier = 0.55; // Increased from 0.50
      chinaModel.inputs.earth.maxRocketProductionIncrease = 0.50; // Increased from 0.45 - maximum scaling
      chinaModel.inputs.financial.discountRate = 0.12; // Reduced from 0.13 - competitive but successful
      chinaModel.inputs.financial.dilutionFactor = 0.15; // Reduced from 0.18 - less dilution needed
      chinaModel.inputs.earth.wrightsLawTurnaroundTime = 0.08; // Keep aggressive
      chinaModel.inputs.earth.wrightsLawLaunchCost = 0.10; // Keep aggressive
      chinaModel.inputs.earth.launchPriceDecline = 0.08; // Slightly reduced from 0.10 - maintain some margin
      chinaModel.inputs.earth.starshipPayloadCapacity = 100000; // Increased from 95000 - technology advantage
      
      // Update description
      chinaModel.description = 'China accelerates its space program success, creating intense competition. SpaceX responds with massive scale (180 launches/year), aggressive market penetration (22%), and accelerated innovation. Through superior technology and volume, SpaceX maintains market leadership despite competitive pressure.';
      
      await chinaModel.save();
      console.log('   ✅ Boosted parameters:');
      console.log('      - Launch Volume: 160 → 180 (massive scale)');
      console.log('      - Starlink Penetration: 0.20 → 0.22 (aggressive capture)');
      console.log('      - TAM Multiplier: 0.50 → 0.55');
      console.log('      - Max Rocket Production: 0.45 → 0.50 (maximum scaling)');
      console.log('      - Discount Rate: 0.13 → 0.12 (competitive success)');
      console.log('      - Dilution Factor: 0.18 → 0.15 (less dilution)');
      console.log('      - Launch Price Decline: 0.10 → 0.08 (maintain margins)');
      console.log('      - Starship Payload: 95000 → 100000 (tech advantage)');
      console.log(`   Model ID: ${chinaModel._id}\n`);
    } else {
      console.log('⚠️  China Accelerates Success Scenario not found\n');
    }

    // 2. Reduce Democratic Administration (too optimistic)
    const democraticModel = await ValuationModel.findOne({ 
      name: 'Democratic Administration Scenario' 
    });
    
    if (democraticModel) {
      console.log('📊 Reducing Democratic Administration Scenario...');
      console.log('   Current Penetration:', democraticModel.inputs.earth.starlinkPenetration);
      
      // Reduce optimistic assumptions - regulatory drag is real
      democraticModel.inputs.earth.starlinkPenetration = 0.14; // Reduced from 0.16 - regulation slows adoption
      democraticModel.inputs.earth.realizedBandwidthTAMMultiplier = 0.52; // Reduced from 0.60 - slower government rollout
      democraticModel.inputs.earth.maxRocketProductionIncrease = 0.28; // Reduced from 0.35 - compliance slows scaling
      democraticModel.inputs.earth.wrightsLawTurnaroundTime = 0.04; // Reduced from 0.05 - compliance slows learning
      democraticModel.inputs.earth.wrightsLawLaunchCost = 0.04; // Reduced from 0.05 - compliance costs
      democraticModel.inputs.earth.launchPriceDecline = 0.02; // Reduced from 0.03 - compliance costs reduce margin improvement
      democraticModel.inputs.financial.discountRate = 0.115; // Slightly increased from 0.11 - regulatory risk
      democraticModel.inputs.earth.cashBufferPercent = 0.18; // Increased from 0.15 - more compliance buffer needed
      
      // Update description
      democraticModel.description = 'Federal government change to Democratic administration. Increased regulation and compliance costs slow adoption and scaling. Government contracts provide volume but regulatory overhead reduces efficiency. Enhanced space policy support helps but compliance costs are significant.';
      
      await democraticModel.save();
      console.log('   ✅ Reduced parameters:');
      console.log('      - Starlink Penetration: 0.16 → 0.14 (regulation slows adoption)');
      console.log('      - TAM Multiplier: 0.60 → 0.52 (slower government rollout)');
      console.log('      - Max Rocket Production: 0.35 → 0.28 (compliance slows scaling)');
      console.log('      - Wright\'s Law improvements: reduced (compliance drag)');
      console.log('      - Launch Price Decline: 0.03 → 0.02 (compliance costs)');
      console.log('      - Discount Rate: 0.11 → 0.115 (regulatory risk)');
      console.log('      - Cash Buffer: 0.15 → 0.18 (more compliance buffer)');
      console.log(`   Model ID: ${democraticModel._id}\n`);
    } else {
      console.log('⚠️  Democratic Administration Scenario not found\n');
    }

    console.log('='.repeat(80));
    console.log('✅ SUCCESS! Both scenarios adjusted');
    console.log('='.repeat(80));
    console.log('\n💡 Next Steps:');
    console.log('   1. Load each model in the app');
    console.log('   2. Run Monte Carlo simulations to get updated valuations');
    console.log('   3. Compare results');
    console.log('\n📊 Expected Changes:');
    console.log('   - China Accelerates Success: Should be significantly higher ($3.5T-$4.0T range)');
    console.log('   - Democratic Administration: Should be lower/more realistic ($1.5T-$2.0T range)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adjusting scenarios:', error);
    process.exit(1);
  }
}

finalAdjustScenarios();















