/**
 * Extract all input parameters from Excel spreadsheet
 * These will be used to create a baseline model that matches the spreadsheet exactly
 */

const fs = require('fs');

const excelData = JSON.parse(fs.readFileSync('excel_parsed_detailed.json', 'utf8'));
const sheet = excelData['Valuation Inputs & Logic'];

function getCellValue(cellRef) {
  if (!sheet || !sheet.cells || !sheet.cells[cellRef]) return null;
  return sheet.cells[cellRef].value;
}

function getCellValueFromValues(cellRef) {
  if (!sheet || !sheet.values || !sheet.values[cellRef]) return null;
  return sheet.values[cellRef];
}

console.log('📊 Extracting Input Parameters from Excel Spreadsheet');
console.log('='.repeat(80));

// Extract Monte Carlo inputs (rows 32-48)
const monteCarloInputs = {
  // Row 32: Starship Reusability Year
  starshipReusabilityYear: getCellValue('C32') || getCellValueFromValues('C32'),
  
  // Row 33: Wright's Law Turnaround Time
  wrightsLawTurnaroundTime: getCellValue('C33') || getCellValueFromValues('C33'),
  
  // Row 34: Starship Payload Capacity
  starshipPayloadCapacity: getCellValue('C34') || getCellValueFromValues('C34'),
  
  // Row 35: Realized Bandwidth TAM Multiplier
  realizedBandwidthTAMMultiplier: getCellValue('C35') || getCellValueFromValues('C35'),
  
  // Row 36: Wright's Law Launch Cost
  wrightsLawLaunchCost: getCellValue('C36') || getCellValueFromValues('C36'),
  
  // Row 37: Cash Buffer Percent
  cashBufferPercent: getCellValue('C37') || getCellValueFromValues('C37'),
  
  // Row 38: Starship Commercial Viability Year
  starshipCommercialViabilityYear: getCellValue('C38') || getCellValueFromValues('C38'),
  
  // Row 39: IRR Threshold Earth to Mars
  irrThresholdEarthToMars: getCellValue('C39') || getCellValueFromValues('C39'),
  
  // Row 40: Non-Starlink Launch Market Growth
  nonStarlinkLaunchMarketGrowth: getCellValue('C40') || getCellValueFromValues('C40'),
  
  // Row 41: Starship Launches for Starlink
  starshipLaunchesForStarlink: getCellValue('C41') || getCellValueFromValues('C41'),
  
  // Row 42: Max Rocket Production Increase
  maxRocketProductionIncrease: getCellValue('C42') || getCellValueFromValues('C42'),
  
  // Row 43: Wright's Law Satellite GBPS
  wrightsLawSatelliteGBPS: getCellValue('C43') || getCellValueFromValues('C43'),
  
  // Row 44: Optimus Cost 2026
  optimusCost2026: getCellValue('C44') || getCellValueFromValues('C44'),
  
  // Row 45: Optimus Annual Cost Decline
  optimusAnnualCostDecline: getCellValue('C45') || getCellValueFromValues('C45'),
  
  // Row 46: Mars Payload Optimus vs Tooling
  marsPayloadOptimusVsTooling: getCellValue('C46') || getCellValueFromValues('C46'),
  
  // Row 47: Optimus Productivity Multiplier
  optimusProductivityMultiplier: getCellValue('C47') || getCellValueFromValues('C47'),
  
  // Row 48: Optimus Learning Rate
  optimusLearningRate: getCellValue('C48') || getCellValueFromValues('C48')
};

// Extract core inputs (need to check Earth and Mars sheets)
const earthSheet = excelData.Earth;
const marsSheet = excelData.Mars;

function getEarthCellValue(cellRef) {
  if (!earthSheet || !earthSheet.cells || !earthSheet.cells[cellRef]) return null;
  return earthSheet.cells[cellRef].value;
}

function getMarsCellValue(cellRef) {
  if (!marsSheet || !marsSheet.cells || !marsSheet.cells[cellRef]) return null;
  return marsSheet.cells[cellRef].value;
}

// Core inputs (these might be in different sheets or hardcoded)
// Based on documentation, these are the defaults:
const coreInputs = {
  // Earth inputs
  starlinkPenetration: 0.15, // Default from docs
  bandwidthPriceDecline: 0.10, // Default from docs
  launchVolume: 100, // Default from docs
  launchPriceDecline: 0.05, // Default from docs
  
  // Mars inputs
  firstColonyYear: 2030, // Default from docs
  transportCostDecline: 0.20, // Default from docs
  populationGrowth: 0.50, // Default from docs (but spreadsheet might have 0.15)
  industrialBootstrap: true, // Default from docs
  
  // Financial inputs
  discountRate: 0.12, // Default from docs
  terminalGrowth: 0.03, // Default from docs
  dilutionFactor: 0.15 // Default from docs
};

// Try to get actual values from spreadsheet
// Check Mars sheet for transport cost decline and population growth
const marsTransportCostDecline = getMarsCellValue('B30');
const marsPopulationGrowth = getMarsCellValue('B31');

if (marsTransportCostDecline !== null) {
  coreInputs.transportCostDecline = marsTransportCostDecline;
}
if (marsPopulationGrowth !== null) {
  coreInputs.populationGrowth = marsPopulationGrowth;
}

console.log('\n📋 Monte Carlo Inputs (Rows 32-48):');
Object.entries(monteCarloInputs).forEach(([key, value]) => {
  console.log(`   ${key}: ${value !== null ? value : 'NOT FOUND'}`);
});

console.log('\n📋 Core Calculation Inputs:');
Object.entries(coreInputs).forEach(([key, value]) => {
  console.log(`   ${key}: ${value}`);
});

// Combine all inputs
const allInputs = {
  earth: {
    ...coreInputs,
    ...monteCarloInputs
  },
  mars: {
    firstColonyYear: coreInputs.firstColonyYear,
    transportCostDecline: coreInputs.transportCostDecline,
    populationGrowth: coreInputs.populationGrowth,
    industrialBootstrap: coreInputs.industrialBootstrap,
    optimusCost2026: monteCarloInputs.optimusCost2026,
    optimusAnnualCostDecline: monteCarloInputs.optimusAnnualCostDecline,
    optimusProductivityMultiplier: monteCarloInputs.optimusProductivityMultiplier,
    optimusLearningRate: monteCarloInputs.optimusLearningRate,
    marsPayloadOptimusVsTooling: monteCarloInputs.marsPayloadOptimusVsTooling
  },
  financial: {
    discountRate: coreInputs.discountRate,
    dilutionFactor: coreInputs.dilutionFactor,
    terminalGrowth: coreInputs.terminalGrowth
  }
};

// Separate Earth-specific inputs
allInputs.earth = {
  starlinkPenetration: coreInputs.starlinkPenetration,
  bandwidthPriceDecline: coreInputs.bandwidthPriceDecline,
  launchVolume: coreInputs.launchVolume,
  launchPriceDecline: coreInputs.launchPriceDecline,
  starshipReusabilityYear: monteCarloInputs.starshipReusabilityYear,
  starshipCommercialViabilityYear: monteCarloInputs.starshipCommercialViabilityYear,
  starshipPayloadCapacity: monteCarloInputs.starshipPayloadCapacity,
  maxRocketProductionIncrease: monteCarloInputs.maxRocketProductionIncrease,
  wrightsLawTurnaroundTime: monteCarloInputs.wrightsLawTurnaroundTime,
  wrightsLawLaunchCost: monteCarloInputs.wrightsLawLaunchCost,
  wrightsLawSatelliteGBPS: monteCarloInputs.wrightsLawSatelliteGBPS,
  realizedBandwidthTAMMultiplier: monteCarloInputs.realizedBandwidthTAMMultiplier,
  starshipLaunchesForStarlink: monteCarloInputs.starshipLaunchesForStarlink,
  nonStarlinkLaunchMarketGrowth: monteCarloInputs.nonStarlinkLaunchMarketGrowth,
  irrThresholdEarthToMars: monteCarloInputs.irrThresholdEarthToMars,
  cashBufferPercent: monteCarloInputs.cashBufferPercent
};

console.log('\n✅ All Inputs Extracted:');
console.log(JSON.stringify(allInputs, null, 2));

// Count total parameters
const totalParams = Object.keys(allInputs.earth).length + 
                   Object.keys(allInputs.mars).length + 
                   Object.keys(allInputs.financial).length;

console.log(`\n📊 Total Parameters: ${totalParams}`);
console.log(`   Earth: ${Object.keys(allInputs.earth).length}`);
console.log(`   Mars: ${Object.keys(allInputs.mars).length}`);
console.log(`   Financial: ${Object.keys(allInputs.financial).length}`);

// Save to file for use in baseline model creation
fs.writeFileSync('baseline-inputs.json', JSON.stringify(allInputs, null, 2));
console.log('\n✅ Saved to baseline-inputs.json');



