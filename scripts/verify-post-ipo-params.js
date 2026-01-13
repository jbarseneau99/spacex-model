require('dotenv').config();
const mongoose = require('mongoose');

const atlasUri = process.env.ATLAS_MONGODB_URI || 'mongodb+srv://brantarseneau_db_user:NJ3nwtwdcpFXwnks@mach33semanticeditorclu.vxuueax.mongodb.net/spacex_valuation';
const cleanUri = atlasUri.replace(/^['"]|['"]$/g, '').replace(/\/[^/]+$/, '/spacex_valuation');

const modelSchema = new mongoose.Schema({}, { strict: false });
const ValuationModel = mongoose.models.ValuationModel || mongoose.model('ValuationModel', modelSchema, 'valuation_models');

async function verifyParameters() {
  try {
    await mongoose.connect(cleanUri);
    
    const postIPO = await ValuationModel.findOne({ name: /Post IOP|Post IPO/i });
    const baseline = await ValuationModel.findOne({ isBaseline: true });
    
    if (!postIPO || !baseline) {
      console.log('❌ Models not found');
      process.exit(1);
    }
    
    console.log('=== VERIFICATION: Parameter Differences ===\n');
    
    const differences = [];
    
    // Check each parameter
    if (Math.abs(postIPO.inputs.financial.dilutionFactor - baseline.inputs.financial.dilutionFactor) > 0.0001) {
      differences.push({
        param: 'Dilution Factor',
        base: baseline.inputs.financial.dilutionFactor,
        postIPO: postIPO.inputs.financial.dilutionFactor,
        diff: (postIPO.inputs.financial.dilutionFactor - baseline.inputs.financial.dilutionFactor).toFixed(3)
      });
    }
    
    if (Math.abs(postIPO.inputs.financial.discountRate - baseline.inputs.financial.discountRate) > 0.0001) {
      differences.push({
        param: 'Discount Rate',
        base: baseline.inputs.financial.discountRate,
        postIPO: postIPO.inputs.financial.discountRate,
        diff: (postIPO.inputs.financial.discountRate - baseline.inputs.financial.discountRate).toFixed(3)
      });
    }
    
    if (Math.abs(postIPO.inputs.earth.starlinkPenetration - baseline.inputs.earth.starlinkPenetration) > 0.0001) {
      differences.push({
        param: 'Starlink Penetration',
        base: baseline.inputs.earth.starlinkPenetration,
        postIPO: postIPO.inputs.earth.starlinkPenetration,
        diff: (postIPO.inputs.earth.starlinkPenetration - baseline.inputs.earth.starlinkPenetration).toFixed(3)
      });
    }
    
    if (Math.abs(postIPO.inputs.earth.launchVolume - baseline.inputs.earth.launchVolume) > 0.0001) {
      differences.push({
        param: 'Launch Volume',
        base: baseline.inputs.earth.launchVolume,
        postIPO: postIPO.inputs.earth.launchVolume,
        diff: (postIPO.inputs.earth.launchVolume - baseline.inputs.earth.launchVolume).toFixed(0)
      });
    }
    
    if (Math.abs(postIPO.inputs.financial.terminalGrowth - baseline.inputs.financial.terminalGrowth) > 0.0001) {
      differences.push({
        param: 'Terminal Growth',
        base: baseline.inputs.financial.terminalGrowth,
        postIPO: postIPO.inputs.financial.terminalGrowth,
        diff: (postIPO.inputs.financial.terminalGrowth - baseline.inputs.financial.terminalGrowth).toFixed(3)
      });
    }
    
    if (differences.length > 0) {
      console.log(`✅ FOUND ${differences.length} PARAMETER DIFFERENCES:\n`);
      differences.forEach(d => {
        console.log(`  ${d.param}:`);
        console.log(`    Baseline: ${d.base}`);
        console.log(`    Post-IPO: ${d.postIPO}`);
        console.log(`    Difference: ${d.diff > 0 ? '+' : ''}${d.diff}\n`);
      });
      console.log('✅ Attribution SHOULD detect these differences when you run it!');
    } else {
      console.log('⚠️ NO DIFFERENCES FOUND - Models have identical parameters');
      console.log('   This means attribution will show "Unexplained Difference"');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyParameters();












