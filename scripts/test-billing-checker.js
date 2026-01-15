#!/usr/bin/env node
/**
 * Test Grok Billing Checker
 * Tests the billing status checker service
 */

require('dotenv').config();
const { getGrokBillingChecker } = require('../services/grok-billing-checker');

async function testBillingChecker() {
  console.log('🧪 Testing Grok Billing Checker\n');
  console.log('='.repeat(60));
  
  const billingChecker = getGrokBillingChecker();
  
  console.log('\n📋 Checking billing status...');
  const billingStatus = await billingChecker.checkBillingStatus();
  
  console.log('\n📊 Billing Status Result:');
  console.log(JSON.stringify(billingStatus, null, 2));
  
  console.log('\n💬 User-Friendly Error Message:');
  const errorMessage = billingChecker.getErrorMessage(billingStatus);
  console.log(JSON.stringify(errorMessage, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log(`  Status: ${billingStatus.status}`);
  console.log(`  Type: ${billingStatus.type}`);
  console.log(`  Message: ${billingStatus.message}`);
  if (billingStatus.creditsAvailable !== null) {
    console.log(`  Credits Available: ${billingStatus.creditsAvailable ? 'Yes' : 'No'}`);
  }
  if (billingStatus.action) {
    console.log(`  Action: ${billingStatus.action}`);
  }
  console.log('='.repeat(60));
}

testBillingChecker().catch(console.error);










