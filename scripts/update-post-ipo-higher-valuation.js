require('dotenv').config();
const mongoose = require('mongoose');

const atlasUri = process.env.ATLAS_MONGODB_URI || 'mongodb+srv://brantarseneau_db_user:NJ3nwtwdcpFXwnks@mach33semanticeditorclu.vxuueax.mongodb.net/spacex_valuation';
const cleanUri = atlasUri.replace(/^['"]|['"]$/g, '').replace(/\/[^/]+$/, '/spacex_valuation');

const modelSchema = new mongoose.Schema({}, { strict: false });
const ValuationModel = mongoose.models.ValuationModel || mongoose.model('ValuationModel', modelSchema, 'valuation_models');

async function updatePostIPOForHigherValuation() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(cleanUri);
    console.log('✅ Connected to MongoDB\n');

    const model = await ValuationModel.findOne({ name: /Post IOP|Post IPO/i });
    
    if (!model) {
      console.log('❌ No Post-IPO model found!');
      process.exit(1);
    }

    console.log('📊 Current Post-IPO Parameters:');
    console.log('   Dilution Factor:', model.inputs.financial.dilutionFactor, '(REDUCES valuation)');
    console.log('   Discount Rate:', model.inputs.financial.discountRate, '(LOWER = HIGHER valuation)');
    console.log('   Starlink Penetration:', model.inputs.earth.starlinkPenetration, '(HIGHER = HIGHER valuation)');
    console.log('   Launch Volume:', model.inputs.earth.launchVolume, '(HIGHER = HIGHER valuation)');
    console.log('   Terminal Growth:', model.inputs.financial.terminalGrowth, '(HIGHER = HIGHER valuation)');

    // To INCREASE valuation, we need to:
    // 1. REDUCE dilution factor (less dilution = higher per-share value)
    // 2. REDUCE discount rate further (less discounting = higher present value)
    // 3. INCREASE penetration, launch volume, terminal growth (more revenue/growth)
    
    const updatedInputs = {
      ...model.inputs,
      earth: {
        ...model.inputs.earth,
        starlinkPenetration: 0.19,  // +4% penetration (was 0.17, baseline 0.15)
        launchVolume: 125,          // +25 launches/year (was 115, baseline 100)
      },
      financial: {
        ...model.inputs.financial,
        dilutionFactor: 0.18,       // REDUCE from 0.22 to 0.18 (less dilution = higher valuation)
        discountRate: 0.095,        // REDUCE further from 0.10 to 0.095 (lower discount = higher valuation)
        terminalGrowth: 0.04,       // INCREASE from 0.035 to 0.04 (higher growth = higher terminal value)
      }
    };

    console.log('\n🔄 Updating Parameters to INCREASE Valuation:');
    console.log('   Dilution Factor: 0.22 → 0.18 (REDUCED - less dilution = higher valuation)');
    console.log('   Discount Rate: 0.10 → 0.095 (REDUCED - lower discount = higher valuation)');
    console.log('   Starlink Penetration: 0.17 → 0.19 (INCREASED - more revenue)');
    console.log('   Launch Volume: 115 → 125 (INCREASED - more revenue)');
    console.log('   Terminal Growth: 0.035 → 0.04 (INCREASED - higher terminal value)');

    model.inputs = updatedInputs;
    model.description = model.description || '';
    if (!model.description.includes('higher valuation')) {
      model.description += ' Updated with parameters optimized for higher post-IPO valuation: reduced dilution (0.18), lower discount rate (0.095), higher penetration (0.19), increased launch volume (125), and higher terminal growth (0.04).';
    }
    model.markModified('inputs');
    await model.save();

    console.log('\n✅ Post-IPO model updated for HIGHER valuation!');
    console.log('\n📊 Updated Parameters:');
    console.log('   Dilution Factor:', model.inputs.financial.dilutionFactor);
    console.log('   Discount Rate:', model.inputs.financial.discountRate);
    console.log('   Starlink Penetration:', model.inputs.earth.starlinkPenetration);
    console.log('   Launch Volume:', model.inputs.earth.launchVolume);
    console.log('   Terminal Growth:', model.inputs.financial.terminalGrowth);
    console.log('\n💡 Key Changes:');
    console.log('   - Reduced Dilution Factor (biggest impact - less dilution = higher per-share value)');
    console.log('   - Reduced Discount Rate (lower discounting = higher present value)');
    console.log('   - Increased all growth/revenue drivers');
    console.log('\n⚠️  Note: You may need to re-run Monte Carlo simulation for this model to see updated valuation results.');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updatePostIPOForHigherValuation();





















