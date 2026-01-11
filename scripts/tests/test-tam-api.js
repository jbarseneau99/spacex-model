/**
 * Test script to verify TAM API endpoints
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.API_URL || 'http://localhost:2999';

async function testTAMAPI() {
    console.log('🧪 Testing TAM API Endpoints\n');
    console.log(`Base URL: ${BASE_URL}\n`);

    try {
        // Test 1: Get active TAM data
        console.log('Test 1: GET /api/tam-data');
        const response1 = await fetch(`${BASE_URL}/api/tam-data?name=Earth Bandwidth TAM`);
        const result1 = await response1.json();
        
        if (result1.success) {
            console.log('✓ Success');
            console.log(`  Name: ${result1.data.name}`);
            console.log(`  Version: ${result1.data.version}`);
            console.log(`  Data entries: ${result1.data.data.length}`);
            console.log(`  Key range: ${result1.data.data[0].key} to ${result1.data.data[result1.data.data.length - 1].key}`);
            console.log(`  Updated: ${new Date(result1.data.updatedAt).toLocaleString()}\n`);
        } else {
            console.log('✗ Failed:', result1.error);
        }

        // Test 2: Get all TAM datasets
        console.log('Test 2: GET /api/tam-data/all');
        const response2 = await fetch(`${BASE_URL}/api/tam-data/all`);
        const result2 = await response2.json();
        
        if (result2.success) {
            console.log('✓ Success');
            console.log(`  Found ${result2.data.length} TAM dataset(s)`);
            result2.data.forEach((tam, idx) => {
                console.log(`  ${idx + 1}. ${tam.name} (v${tam.version}) - ${tam.isActive ? 'Active' : 'Inactive'} - ${tam.dataCount} entries`);
            });
            console.log('');
        } else {
            console.log('✗ Failed:', result2.error);
        }

        console.log('✅ All API tests completed');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('   Make sure the server is running on', BASE_URL);
        process.exit(1);
    }
}

testTAMAPI();

