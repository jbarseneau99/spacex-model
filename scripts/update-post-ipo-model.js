require('dotenv').config();
const mongoose = require('mongoose');

const atlasUri = process.env.ATLAS_MONGODB_URI || 'mongodb+srv://brantarseneau_db_user:NJ3nwtwdcpFXwnks@mach33semanticeditorclu.vxuueax.mongodb.net/spacex_valuation';
const cleanUri = atlasUri.replace(/^['"]|['"]$/g, '').replace(/\/[^/]+$/, '/spacex_valuation');

const modelSchema = new mongoose.Schema({}, { strict: false });
const ValuationModel = mongoose.models.ValuationModel || mongoose.model('ValuationModel', modelSchema, 'valuation_models');

async function updatePostIPOModel() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find the Post-IPO model
    const model = await ValuationModel.findOne({ name: /Post IOP|Post IPO/i });
    
    if (!model) {
      console.log('❌ No Post-IPO model found!');
      process.exit(1);
    }

    console.log('📊 Found Post-IPO model:', model.name);
    console.log('   Current ID:', model._id);
    console.log('\n📋 Current Parameters:');
    console.log('   Dilution Factor:', model.inputs.financial.dilutionFactor);
    console.log('   Discount Rate:', model.inputs.financial.discountRate);
    console.log('   Starlink Penetration:', model.inputs.earth.starlinkPenetration);
    console.log('   Launch Volume:', model.inputs.earth.launchVolume);
    console.log('   Terminal Growth:', model.inputs.financial.terminalGrowth);

    // IPO-appropriate parameter changes:
    // 1. Dilution Factor: Increase (more shares issued in IPO) - 0.15 → 0.22
    // 2. Discount Rate: Decrease (lower risk premium, more liquidity) - 0.12 → 0.10
    // 3. Starlink Penetration: Increase (public awareness boost) - 0.15 → 0.17
    // 4. Launch Volume: Increase (increased demand/visibility) - 100 → 115
    // 5. Terminal Growth: Slight increase (higher growth expectations) - 0.03 → 0.035

    const updatedInputs = {
      ...model.inputs,
      earth: {
        ...model.inputs.earth,
        starlinkPenetration: 0.17,  // +2% penetration due to public awareness
        launchVolume: 115,          // +15 launches/year due to increased demand
      },
      financial: {
        ...model.inputs.financial,
        dilutionFactor: 0.22,       // +7% dilution (shares issued in IPO)
        discountRate: 0.10,         // -2% discount rate (lower risk premium)
        terminalGrowth: 0.035,      // +0.5% terminal growth (higher expectations)
      }
    };

    console.log('\n🔄 Updating Parameters:');
    console.log('   Dilution Factor: 0.15 → 0.22 (+7% - IPO share issuance)');
    console.log('   Discount Rate: 0.12 → 0.10 (-2% - lower risk premium)');
    console.log('   Starlink Penetration: 0.15 → 0.17 (+2% - public awareness)');
    console.log('   Launch Volume: 100 → 115 (+15 launches - increased demand)');
    console.log('   Terminal Growth: 0.03 → 0.035 (+0.5% - higher expectations)');

    // Update the model
    model.inputs = updatedInputs;
    model.description = model.description || '';
    if (!model.description.includes('IPO')) {
      model.description += ' Updated with IPO-appropriate parameters: increased dilution (0.22), lower discount rate (0.10), higher Starlink penetration (0.17), increased launch volume (115), and higher terminal growth (0.035).';
    }
    model.markModified('inputs');
    await model.save();

    console.log('\n✅ Post-IPO model updated successfully!');
    console.log('\n📊 Updated Parameters:');
    console.log('   Dilution Factor:', model.inputs.financial.dilutionFactor);
    console.log('   Discount Rate:', model.inputs.financial.discountRate);
    console.log('   Starlink Penetration:', model.inputs.earth.starlinkPenetration);
    console.log('   Launch Volume:', model.inputs.earth.launchVolume);
    console.log('   Terminal Growth:', model.inputs.financial.terminalGrowth);
    console.log('\n💡 Note: You may need to re-run Monte Carlo simulation for this model to see updated valuation results.');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updatePostIPOModel();












