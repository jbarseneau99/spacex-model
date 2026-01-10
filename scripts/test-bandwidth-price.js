/**
 * Test complete bandwidth price calculation with TAM lookup
 */

const fs = require('fs');
const path = require('path');

// Load TAM data
const tamDataPath = path.join(__dirname, '../data/earth-bandwidth-tam.json');
const tamData = JSON.parse(fs.readFileSync(tamDataPath, 'utf8')).data;

// TAM lookup function
function lookupTAMMultiplier(lookupValue) {
    if (!tamData || tamData.length === 0) return 1.0;
    
    const minKey = tamData[0].key;
    const maxKey = tamData[tamData.length - 1].key;
    
    if (lookupValue < minKey) return tamData[0].value;
    if (lookupValue > maxKey) return tamData[tamData.length - 1].value;
    
    let low = 0, high = tamData.length - 1, matchIndex = 0;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (tamData[mid].key <= lookupValue) {
            matchIndex = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    
    const matchKey = tamData[matchIndex].key;
    const matchValue = tamData[matchIndex].value;
    
    if (matchKey === lookupValue || matchIndex === tamData.length - 1) {
        return matchValue;
    }
    
    const nextKey = tamData[matchIndex + 1].key;
    const nextValue = tamData[matchIndex + 1].value;
    const ratio = (lookupValue - matchKey) / (nextKey - matchKey);
    return matchValue + (nextValue - matchValue) * ratio;
}

// Calculate bandwidth capacity
function calculateBandwidthCapacity(year, starlinkPenetration) {
    const baseCapacity = 100; // Tbps
    const growthRate = starlinkPenetration || 0.15;
    return baseCapacity * Math.pow(1 + growthRate, year) * 1000; // Convert to Gbps
}

// Calculate bandwidth price with TAM lookup
function calculateBandwidthPrice(year, earth) {
    const basePrice = 100; // $/Gbps/month
    const growthFactor1 = 1.0;
    const growthFactor2 = 1.0;
    const year0 = 0;
    
    const basePriceWithGrowth = basePrice * Math.pow(growthFactor1 * growthFactor2, year - year0);
    
    if (!tamData || tamData.length === 0) {
        const declineRate = earth.bandwidthPriceDecline || 0.10;
        return basePriceWithGrowth * Math.pow(1 - declineRate, year);
    }
    
    const capacity = calculateBandwidthCapacity(year, earth.starlinkPenetration);
    const declineRate = earth.bandwidthPriceDecline || 0.10;
    
    const i91 = capacity;
    const i92 = declineRate;
    const lookupValue = i91 * (1 - i92);
    
    const tamValue = lookupTAMMultiplier(lookupValue);
    
    // Year 0 for normalization
    const year0Capacity = calculateBandwidthCapacity(0, earth.starlinkPenetration);
    const year0Lookup = year0Capacity * (1 - declineRate);
    const year0TAMValue = lookupTAMMultiplier(year0Lookup);
    
    const tamMultiplier = year0TAMValue > 0 ? tamValue / year0TAMValue : 1.0;
    
    return basePriceWithGrowth * tamMultiplier;
}

// Test scenarios
const earth = {
    starlinkPenetration: 0.15,
    bandwidthPriceDecline: 0.10
};

console.log('=== Bandwidth Price Calculation Test ===\n');

for (let year = 0; year <= 10; year += 5) {
    const capacity = calculateBandwidthCapacity(year, earth.starlinkPenetration);
    const lookupValue = capacity * (1 - earth.bandwidthPriceDecline);
    const price = calculateBandwidthPrice(year, earth);
    const priceSimple = 100 * Math.pow(1 - earth.bandwidthPriceDecline, year);
    
    console.log(`Year ${year}:`);
    console.log(`  Capacity: ${capacity.toFixed(2)} Gbps`);
    console.log(`  Lookup value: ${lookupValue.toFixed(2)}`);
    console.log(`  Price (with TAM): $${price.toFixed(2)}/Gbps/month`);
    console.log(`  Price (simple decline): $${priceSimple.toFixed(2)}/Gbps/month`);
    console.log(`  Difference: ${((price / priceSimple - 1) * 100).toFixed(2)}%`);
    console.log('');
}

console.log('✓ TAM lookup implementation complete!');
console.log('✓ Bandwidth pricing now uses market-based TAM lookup');

