/**
 * Test script for TAM lookup implementation
 * Validates that the lookup function works correctly
 */

const fs = require('fs');
const path = require('path');

// Load TAM data
const tamDataPath = path.join(__dirname, '../data/earth-bandwidth-tam.json');
const tamData = JSON.parse(fs.readFileSync(tamDataPath, 'utf8')).data;

console.log(`Loaded ${tamData.length} TAM entries`);
console.log(`Key range: ${tamData[0].key} to ${tamData[tamData.length - 1].key}`);
console.log(`Value range: ${tamData[0].value} to ${tamData[tamData.length - 1].value}\n`);

// TAM lookup function (matching JavaScript implementation)
function lookupTAMMultiplier(lookupValue) {
    if (!tamData || tamData.length === 0) {
        return 1.0;
    }
    
    // If lookup value exceeds max, return last value
    const maxKey = tamData[tamData.length - 1].key;
    if (lookupValue > maxKey) {
        return tamData[tamData.length - 1].value;
    }
    
    // Binary search for matching row
    let low = 0;
    let high = tamData.length - 1;
    let matchIndex = 0;
    
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
    
    // Linear interpolation
    const nextKey = tamData[matchIndex + 1].key;
    const nextValue = tamData[matchIndex + 1].value;
    
    const ratio = (lookupValue - matchKey) / (nextKey - matchKey);
    return matchValue + (nextValue - matchValue) * ratio;
}

// Test cases
console.log('=== Testing TAM Lookup ===\n');

// Test 1: Exact match
const test1 = 100000;
const result1 = lookupTAMMultiplier(test1);
console.log(`Test 1 - Exact match (${test1}):`);
console.log(`  Result: ${result1}`);
console.log(`  Expected: ${tamData[0].value}`);
console.log(`  Match: ${Math.abs(result1 - tamData[0].value) < 0.01 ? '✓' : '✗'}\n`);

// Test 2: Interpolation
const test2 = 150000; // Between 100000 and 200000
const result2 = lookupTAMMultiplier(test2);
const expected2 = tamData[0].value + (tamData[1].value - tamData[0].value) * 0.5;
console.log(`Test 2 - Interpolation (${test2}):`);
console.log(`  Result: ${result2}`);
console.log(`  Expected: ${expected2}`);
console.log(`  Match: ${Math.abs(result2 - expected2) < 0.01 ? '✓' : '✗'}\n`);

// Test 3: Exceeds max
const test3 = 2000000000; // Exceeds max key
const result3 = lookupTAMMultiplier(test3);
const maxValue = tamData[tamData.length - 1].value;
console.log(`Test 3 - Exceeds max (${test3}):`);
console.log(`  Result: ${result3}`);
console.log(`  Expected: ${maxValue}`);
console.log(`  Match: ${Math.abs(result3 - maxValue) < 0.01 ? '✓' : '✗'}\n`);

// Test 4: Realistic bandwidth capacity scenarios
console.log('=== Testing Realistic Scenarios ===\n');

function calculateBandwidthCapacity(year, starlinkPenetration) {
    const baseCapacity = 100; // Tbps
    const growthRate = starlinkPenetration || 0.15;
    return baseCapacity * Math.pow(1 + growthRate, year) * 1000; // Convert to Gbps
}

// Year 0 scenario (updated: I91 = capacity, not capacity * penetration)
const year0Capacity = calculateBandwidthCapacity(0, 0.15);
const year0Decline = 0.10;
const year0Lookup = year0Capacity * (1 - year0Decline);
const year0TAM = lookupTAMMultiplier(year0Lookup);

console.log(`Year 0:`);
console.log(`  Capacity: ${year0Capacity.toFixed(2)} Gbps`);
console.log(`  Decline: ${year0Decline}`);
console.log(`  Lookup value: ${year0Lookup.toFixed(2)}`);
console.log(`  TAM value: ${year0TAM.toFixed(2)}`);
console.log(`  TAM normalized: 1.0 (base)\n`);

// Year 5 scenario
const year5Capacity = calculateBandwidthCapacity(5, 0.15);
const year5Lookup = year5Capacity * (1 - year0Decline);
const year5TAM = lookupTAMMultiplier(year5Lookup);
const year5Multiplier = year5TAM / year0TAM;

console.log(`Year 5:`);
console.log(`  Capacity: ${year5Capacity.toFixed(2)} Gbps`);
console.log(`  Lookup value: ${year5Lookup.toFixed(2)}`);
console.log(`  TAM value: ${year5TAM.toFixed(2)}`);
console.log(`  TAM multiplier: ${year5Multiplier.toFixed(4)}`);
console.log(`  Price impact: ${year5Multiplier > 1 ? 'Increase' : 'Decrease'} by ${Math.abs(year5Multiplier - 1) * 100}%\n`);

// Year 10 scenario
const year10Capacity = calculateBandwidthCapacity(10, 0.15);
const year10Lookup = year10Capacity * (1 - year0Decline);
const year10TAM = lookupTAMMultiplier(year10Lookup);
const year10Multiplier = year10TAM / year0TAM;

console.log(`Year 10:`);
console.log(`  Capacity: ${year10Capacity.toFixed(2)} Gbps`);
console.log(`  Lookup value: ${year10Lookup.toFixed(2)}`);
console.log(`  TAM value: ${year10TAM.toFixed(2)}`);
console.log(`  TAM multiplier: ${year10Multiplier.toFixed(4)}`);
console.log(`  Price impact: ${year10Multiplier > 1 ? 'Increase' : 'Decrease'} by ${Math.abs(year10Multiplier - 1) * 100}%\n`);

// Check if lookup values are in reasonable range
console.log('=== Lookup Value Range Analysis ===');
console.log(`Year 0 lookup: ${year0Lookup.toFixed(2)}`);
console.log(`Year 5 lookup: ${year5Lookup.toFixed(2)}`);
console.log(`Year 10 lookup: ${year10Lookup.toFixed(2)}`);
console.log(`TAM key range: ${tamData[0].key} to ${tamData[tamData.length - 1].key}`);
console.log(`\nLookup values are ${year0Lookup < tamData[0].key ? 'BELOW' : year0Lookup > tamData[tamData.length - 1].key ? 'ABOVE' : 'WITHIN'} TAM key range`);

