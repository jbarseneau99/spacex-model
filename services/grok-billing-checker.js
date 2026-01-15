/**
 * Grok Billing Status Checker
 * Checks billing status and provides detailed error information
 */

const https = require('https');

class GrokBillingChecker {
  constructor() {
    this.grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
    this.cache = {
      lastCheck: null,
      status: null,
      ttl: 60000 // Cache for 1 minute
    };
  }

  /**
   * Check billing status by making a test API call
   * Returns detailed billing information
   */
  async checkBillingStatus() {
    // Return cached result if recent
    if (this.cache.lastCheck && Date.now() - this.cache.lastCheck < this.cache.ttl) {
      return this.cache.status;
    }

    if (!this.grokApiKey) {
      return {
        error: 'API key not configured',
        type: 'configuration',
        message: 'GROK_API_KEY or XAI_API_KEY not set in environment'
      };
    }

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.x.ai',
        path: '/v1/models',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.grokApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const result = this.parseBillingResponse(res.statusCode, data);
          this.cache.lastCheck = Date.now();
          this.cache.status = result;
          resolve(result);
        });
      });

      req.on('error', (error) => {
        const result = {
          error: error.message,
          type: 'network',
          message: 'Network error checking billing status'
        };
        resolve(result);
      });

      req.on('timeout', () => {
        req.destroy();
        const result = {
          error: 'Timeout',
          type: 'network',
          message: 'Request timeout checking billing status'
        };
        resolve(result);
      });

      req.end();
    });
  }

  /**
   * Parse API response to determine billing status
   */
  parseBillingResponse(statusCode, responseBody) {
    try {
      const response = JSON.parse(responseBody);

      if (statusCode === 200) {
        return {
          status: 'ok',
          type: 'ok',
          message: 'API is working - billing is active',
          creditsAvailable: true
        };
      }

      if (statusCode === 429) {
        // Check if it's a billing limit or rate limit
        const errorMessage = response.error || '';
        const errorCode = response.code || '';
        
        const isBillingLimit = errorMessage.toLowerCase().includes('credits') ||
                              errorMessage.toLowerCase().includes('spending limit') ||
                              errorMessage.toLowerCase().includes('exhausted') ||
                              errorCode.toLowerCase().includes('exhausted');

        if (isBillingLimit) {
          // Extract team ID if present
          const teamIdMatch = errorMessage.match(/team\s+([a-f0-9-]+)/i);
          const teamId = teamIdMatch ? teamIdMatch[1] : null;

          return {
            status: 'billing_limit',
            type: 'billing',
            message: 'Credits exhausted or spending limit reached',
            error: errorMessage,
            errorCode: errorCode,
            teamId: teamId,
            creditsAvailable: false,
            action: 'Add credits or raise spending limit in xAI console',
            consoleUrl: 'https://console.x.ai/'
          };
        } else {
          // Rate limit (not billing)
          return {
            status: 'rate_limited',
            type: 'rate_limit',
            message: 'Rate limit reached - too many requests',
            error: errorMessage,
            creditsAvailable: true,
            action: 'Wait 5-10 minutes and try again'
          };
        }
      }

      if (statusCode === 401) {
        return {
          status: 'invalid_key',
          type: 'authentication',
          message: 'API key is invalid or expired',
          error: response.error || 'Unauthorized',
          creditsAvailable: null,
          action: 'Check API key in xAI console'
        };
      }

      if (statusCode === 402 || statusCode === 403) {
        return {
          status: 'payment_required',
          type: 'payment',
          message: 'Payment or permission issue',
          error: response.error || `HTTP ${statusCode}`,
          creditsAvailable: false,
          action: 'Check billing settings in xAI console'
        };
      }

      return {
        status: 'unknown',
        type: 'unknown',
        message: `Unexpected status: ${statusCode}`,
        error: response.error || responseBody.substring(0, 200),
        creditsAvailable: null
      };

    } catch (e) {
      return {
        status: 'parse_error',
        type: 'error',
        message: 'Could not parse API response',
        error: e.message,
        rawResponse: responseBody.substring(0, 200),
        creditsAvailable: null
      };
    }
  }

  /**
   * Parse WebSocket error to determine if it's billing related
   */
  parseWebSocketError(error) {
    const errorString = String(error);
    const errorLower = errorString.toLowerCase();

    // Check for billing indicators
    if (errorLower.includes('429')) {
      // WebSocket 429 could be billing or rate limit
      // We need to check via HTTP to be sure
      return {
        type: 'unknown_429',
        message: 'HTTP 429 error - checking billing status...',
        needsCheck: true
      };
    }

    if (errorLower.includes('credits') || 
        errorLower.includes('spending limit') || 
        errorLower.includes('exhausted')) {
      return {
        type: 'billing',
        message: 'Billing limit reached',
        creditsAvailable: false,
        action: 'Add credits in xAI console'
      };
    }

    if (errorLower.includes('401') || errorLower.includes('unauthorized')) {
      return {
        type: 'authentication',
        message: 'API key invalid',
        creditsAvailable: null,
        action: 'Check API key'
      };
    }

    return {
      type: 'unknown',
      message: error.message || 'Unknown error',
      creditsAvailable: null
    };
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(billingStatus) {
    if (!billingStatus) {
      return 'Unable to check billing status';
    }

    switch (billingStatus.type) {
      case 'billing':
        return {
          title: '💰 Credits Exhausted',
          message: billingStatus.message,
          details: billingStatus.error,
          action: billingStatus.action,
          consoleUrl: billingStatus.consoleUrl,
          severity: 'error'
        };

      case 'rate_limit':
        return {
          title: '⏱️ Rate Limited',
          message: billingStatus.message,
          action: billingStatus.action,
          severity: 'warning'
        };

      case 'authentication':
        return {
          title: '🔑 Invalid API Key',
          message: billingStatus.message,
          action: billingStatus.action,
          severity: 'error'
        };

      case 'payment':
        return {
          title: '💳 Payment Required',
          message: billingStatus.message,
          action: billingStatus.action,
          severity: 'error'
        };

      case 'ok':
        return {
          title: '✅ API Working',
          message: billingStatus.message,
          severity: 'success'
        };

      default:
        return {
          title: '⚠️ Unknown Status',
          message: billingStatus.message || 'Unknown error',
          severity: 'warning'
        };
    }
  }
}

// Singleton instance
let billingCheckerInstance = null;

function getGrokBillingChecker() {
  if (!billingCheckerInstance) {
    billingCheckerInstance = new GrokBillingChecker();
  }
  return billingCheckerInstance;
}

module.exports = { GrokBillingChecker, getGrokBillingChecker };










