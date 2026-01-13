#!/usr/bin/env node

/**
 * Test Grok connection with exponential backoff retry
 * Tests both direct connection and through server proxy
 */

require('dotenv').config();
const WebSocket = require('ws');
const http = require('http');

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
const SERVER_PORT = process.env.PORT || 3333;
const MAX_RETRIES = 5;
const RETRY_DELAYS = [5000, 10000, 20000, 30000, 60000]; // 5s, 10s, 20s, 30s, 60s

console.log('🧪 Grok Voice API Connection Test (with Retry)');
console.log('==============================================\n');

function testDirectConnection(attempt = 0) {
    return new Promise((resolve, reject) => {
        console.log(`\n📡 Test ${attempt + 1}/${MAX_RETRIES + 1}: Direct Grok Connection`);
        console.log(`   URL: wss://api.x.ai/v1/realtime`);
        
        const ws = new WebSocket('wss://api.x.ai/v1/realtime', {
            headers: {
                'Authorization': `Bearer ${GROK_API_KEY}`
            }
        });
        
        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Connection timeout'));
        }, 10000);
        
        ws.on('open', () => {
            clearTimeout(timeout);
            console.log('✅ Direct connection successful!');
            ws.close();
            resolve(true);
        });
        
        ws.on('error', (error) => {
            clearTimeout(timeout);
            if (error.message.includes('429')) {
                console.log('⚠️  Rate limited (429)');
                reject(new Error('RATE_LIMITED'));
            } else {
                console.log(`❌ Error: ${error.message}`);
                reject(error);
            }
        });
        
        ws.on('close', (code) => {
            if (code === 1006) {
                clearTimeout(timeout);
                reject(new Error('RATE_LIMITED'));
            }
        });
    });
}

function testServerProxy(attempt = 0) {
    return new Promise((resolve, reject) => {
        console.log(`\n📡 Test ${attempt + 1}/${MAX_RETRIES + 1}: Server Proxy Connection`);
        console.log(`   URL: ws://localhost:${SERVER_PORT}/api/analyst/ws/grok-voice`);
        
        // First check if server is running
        const healthCheck = http.get(`http://localhost:${SERVER_PORT}/api/analyst/browser/voice-health`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const health = JSON.parse(data);
                    console.log(`   Server status: Running`);
                    console.log(`   Grok connected: ${health.grokConnected || false}`);
                } catch (e) {
                    console.log(`   Server status: Running (health check OK)`);
                }
                
                // Now test WebSocket
                const ws = new WebSocket(`ws://localhost:${SERVER_PORT}/api/analyst/ws/grok-voice`);
                
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('WebSocket timeout'));
                }, 10000);
                
                ws.on('open', () => {
                    clearTimeout(timeout);
                    console.log('✅ Server proxy connection successful!');
                    ws.close();
                    resolve(true);
                });
                
                ws.on('error', (error) => {
                    clearTimeout(timeout);
                    console.log(`❌ Error: ${error.message}`);
                    reject(error);
                });
                
                ws.on('close', (code) => {
                    if (code === 1006) {
                        clearTimeout(timeout);
                        reject(new Error('Connection closed by server'));
                    }
                });
            });
        });
        
        healthCheck.on('error', (error) => {
            reject(new Error(`Server not running: ${error.message}`));
        });
        
        healthCheck.setTimeout(3000, () => {
            healthCheck.destroy();
            reject(new Error('Server health check timeout'));
        });
    });
}

async function runTests() {
    console.log('🔑 API Key:', GROK_API_KEY ? GROK_API_KEY.substring(0, 10) + '...' : 'NOT FOUND');
    console.log('');
    
    // Test 1: Direct connection
    let directSuccess = false;
    for (let i = 0; i <= MAX_RETRIES; i++) {
        try {
            await testDirectConnection(i);
            directSuccess = true;
            break;
        } catch (error) {
            if (error.message === 'RATE_LIMITED') {
                if (i < MAX_RETRIES) {
                    const delay = RETRY_DELAYS[i];
                    console.log(`⏳ Rate limited. Waiting ${delay/1000}s before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error('\n❌ Direct connection failed: Still rate limited after all retries');
                    console.error('💡 Wait 5-10 minutes and try again');
                }
            } else {
                console.error(`❌ Direct connection failed: ${error.message}`);
                break;
            }
        }
    }
    
    // Test 2: Server proxy
    let proxySuccess = false;
    for (let i = 0; i <= MAX_RETRIES; i++) {
        try {
            await testServerProxy(i);
            proxySuccess = true;
            break;
        } catch (error) {
            if (error.message.includes('not running')) {
                console.error(`\n❌ Server proxy test failed: ${error.message}`);
                console.error('💡 Start the server: node server.js');
                break;
            } else if (i < MAX_RETRIES) {
                const delay = RETRY_DELAYS[i];
                console.log(`⏳ Retrying in ${delay/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`\n❌ Server proxy failed: ${error.message}`);
            }
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Direct Grok Connection: ${directSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Server Proxy Connection: ${proxySuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
    
    if (directSuccess && proxySuccess) {
        console.log('✅✅✅ ALL TESTS PASSED ✅✅✅');
        console.log('🎉 Grok Voice is working correctly!');
        process.exit(0);
    } else if (!directSuccess) {
        console.log('❌ Grok API is rate limiting connections');
        console.log('💡 Wait 5-10 minutes and run tests again');
        process.exit(1);
    } else {
        console.log('⚠️  Direct connection works but server proxy failed');
        console.log('💡 Check server logs for errors');
        process.exit(1);
    }
}

runTests().catch(error => {
    console.error('\n❌ Test suite error:', error.message);
    process.exit(1);
});


