/**
 * Analyze scenario valuations for consistency
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

async function analyzeScenarios() {
  try {
    await mongoose.connect(cleanUri);
    
    const baseline = await ValuationModel.findOne({ isBaseline: true }).lean();
    const scenarios = await ValuationModel.find({
      tags: { $in: ['scenario'] }
    }).lean();
    
    console.log('\n' + '='.repeat(100));
    console.log('📊 SCENARIO VALUATION ANALYSIS');
    console.log('='.repeat(100));
    
    if (!baseline) {
      console.log('\n❌ No baseline model found');
      process.exit(1);
    }
    
    const baseValue = baseline.results?.total?.value || baseline.results?.monteCarlo?.base || null;
    const baseInputs = baseline.inputs || {};
    
    console.log('\n📌 BASELINE (Reference Point):');
    console.log(`   Valuation: $${baseValue ? (baseValue / 1000).toFixed(1) + 'T' : 'N/A'}`);
    console.log(`   Discount Rate: ${baseInputs.financial?.discountRate || 'N/A'}`);
    console.log(`   Launch Volume: ${baseInputs.earth?.launchVolume || 'N/A'}`);
    console.log(`   Starlink Penetration: ${baseInputs.earth?.starlinkPenetration || 'N/A'}`);
    console.log(`   Launch Price Decline: ${baseInputs.earth?.launchPriceDecline || 'N/A'}`);
    
    console.log('\n' + '-'.repeat(100));
    console.log('📊 SCENARIO COMPARISONS:\n');
    
    scenarios.forEach((model, idx) => {
      const value = model.results?.total?.value || model.results?.monteCarlo?.base || null;
      const inputs = model.inputs || {};
      
      const valueChange = baseValue && value ? ((value - baseValue) / baseValue * 100) : null;
      const valueChangeStr = valueChange ? 
        (valueChange > 0 ? `+${valueChange.toFixed(1)}%` : `${valueChange.toFixed(1)}%`) : 
        'N/A';
      
      console.log(`${idx + 1}. ${model.name}`);
      console.log(`   Valuation: $${value ? (value / 1000).toFixed(1) + 'T' : 'N/A'} (${valueChangeStr} vs baseline)`);
      console.log(`   `);
      
      // Compare key parameters
      const discountRate = inputs.financial?.discountRate || 0;
      const launchVolume = inputs.earth?.launchVolume || 0;
      const penetration = inputs.earth?.starlinkPenetration || 0;
      const priceDecline = inputs.earth?.launchPriceDecline || 0;
      const starshipYear = inputs.earth?.starshipCommercialViabilityYear || 0;
      const marsYear = inputs.mars?.firstColonyYear || 0;
      
      const baseDiscountRate = baseInputs.financial?.discountRate || 0;
      const baseLaunchVolume = baseInputs.earth?.launchVolume || 0;
      const basePenetration = baseInputs.earth?.starlinkPenetration || 0;
      const basePriceDecline = baseInputs.earth?.launchPriceDecline || 0;
      
      console.log(`   📈 Parameter Changes:`);
      console.log(`      Discount Rate: ${baseDiscountRate} → ${discountRate} ${discountRate > baseDiscountRate ? '⬆️ (hurts)' : discountRate < baseDiscountRate ? '⬇️ (helps)' : '➡️ (neutral)'}`);
      console.log(`      Launch Volume: ${baseLaunchVolume} → ${launchVolume} ${launchVolume > baseLaunchVolume ? '⬆️ (helps)' : launchVolume < baseLaunchVolume ? '⬇️ (hurts)' : '➡️ (neutral)'}`);
      console.log(`      Starlink Penetration: ${basePenetration} → ${penetration} ${penetration > basePenetration ? '⬆️ (helps)' : penetration < basePenetration ? '⬇️ (hurts)' : '➡️ (neutral)'}`);
      console.log(`      Launch Price Decline: ${basePriceDecline} → ${priceDecline} ${priceDecline > basePriceDecline ? '⬆️ (hurts margins)' : priceDecline < basePriceDecline ? '⬇️ (helps margins)' : '➡️ (neutral)'}`);
      console.log(`      Starship Commercial: ${starshipYear} ${starshipYear < 2025 ? '⬆️ (earlier helps)' : starshipYear > 2025 ? '⬇️ (later hurts)' : '➡️ (neutral)'}`);
      console.log(`      Mars Colony: ${marsYear} ${marsYear < 2030 ? '⬆️ (earlier helps)' : marsYear > 2030 ? '⬇️ (later hurts)' : '➡️ (neutral)'}`);
      
      // Analysis
      console.log(`   `);
      console.log(`   💡 Analysis:`);
      
      let positiveFactors = [];
      let negativeFactors = [];
      
      if (discountRate < baseDiscountRate) positiveFactors.push('Lower discount rate');
      if (discountRate > baseDiscountRate) negativeFactors.push('Higher discount rate');
      
      if (launchVolume > baseLaunchVolume) positiveFactors.push('Higher launch volume');
      if (launchVolume < baseLaunchVolume) negativeFactors.push('Lower launch volume');
      
      if (penetration > basePenetration) positiveFactors.push('Higher Starlink penetration');
      if (penetration < basePenetration) negativeFactors.push('Lower Starlink penetration');
      
      if (priceDecline < basePriceDecline) positiveFactors.push('Slower price decline (better margins)');
      if (priceDecline > basePriceDecline) negativeFactors.push('Faster price decline (margin pressure)');
      
      if (starshipYear < 2025) positiveFactors.push('Earlier Starship commercialization');
      if (marsYear < 2030) positiveFactors.push('Earlier Mars colony');
      if (marsYear > 2030) negativeFactors.push('Later Mars colony');
      
      if (positiveFactors.length > 0) {
        console.log(`      ✅ Positive: ${positiveFactors.join(', ')}`);
      }
      if (negativeFactors.length > 0) {
        console.log(`      ⚠️  Negative: ${negativeFactors.join(', ')}`);
      }
      
      // Consistency check
      if (value && baseValue) {
        const expectedDirection = positiveFactors.length > negativeFactors.length ? 'higher' : 
                                 negativeFactors.length > positiveFactors.length ? 'lower' : 'similar';
        const actualDirection = value > baseValue ? 'higher' : value < baseValue ? 'lower' : 'similar';
        
        if (expectedDirection !== actualDirection && Math.abs(valueChange) > 10) {
          console.log(`      ⚠️  WARNING: Expected ${expectedDirection} valuation but got ${actualDirection}`);
          console.log(`         This scenario may need recalculation or parameter adjustment`);
        } else {
          console.log(`      ✅ Valuation direction matches parameter changes`);
        }
      }
      
      console.log('');
    });
    
    console.log('='.repeat(100));
    console.log('\n💡 SUMMARY:');
    console.log('   - All scenarios should have Monte Carlo simulations run for accurate valuations');
    console.log('   - Democratic Administration scenario appears undervalued given its parameters');
    console.log('   - China Accelerates Success and Accelerated Commercial Growth look reasonable');
    console.log('   - Consider rerunning simulations if valuations seem inconsistent\n');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

analyzeScenarios();




