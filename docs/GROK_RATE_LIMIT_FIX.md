# Fixing Grok API Rate Limiting

## Problem
Grok API returns `429` errors indicating:
- "Your team has either used all available credits or reached its monthly spending limit"

## Solutions Implemented

### 1. ✅ Automatic Retry with Exponential Backoff
The code now automatically retries failed requests with exponential backoff:
- **Attempts**: Up to 3 retries
- **Delays**: 2s, 4s, 8s between retries
- **Only retries**: Rate limit errors (429), not other errors

### 2. ✅ Rate Limiting/Throttling
Built-in rate limiter prevents hitting limits:
- **Default**: 30 requests per minute (configurable)
- **Minimum delay**: 2 seconds between requests (configurable)
- **Automatic queuing**: Waits if limit is reached

### 3. ✅ Environment Variable Configuration

Add these to your `.env` file to control rate limiting:

```bash
# Grok Rate Limiting
GROK_MAX_REQUESTS_PER_MINUTE=30    # Max requests per minute (default: 30)
GROK_MIN_DELAY_MS=2000             # Minimum delay between requests in ms (default: 2000)

# Default AI Model (use Claude to avoid Grok limits)
DEFAULT_AI_MODEL=claude-opus-4-1-20250805  # Use Claude instead of Grok
```

### 4. ✅ Fallback to Claude
If Grok fails, the system automatically falls back to Claude (already implemented).

## Quick Fixes

### Option A: Use Claude as Default (Recommended)
**Easiest solution** - Switch to Claude to avoid Grok limits entirely:

```bash
# Add to .env file
DEFAULT_AI_MODEL=claude-opus-4-1-20250805
```

Then restart your server:
```bash
node scripts/restart-server.js
```

### Option B: Reduce Request Rate
If you want to keep using Grok, reduce the request rate:

```bash
# Add to .env file
GROK_MAX_REQUESTS_PER_MINUTE=10    # Lower limit
GROK_MIN_DELAY_MS=5000             # 5 seconds between requests
```

### Option C: Purchase More Credits
1. Go to [xAI Console](https://console.x.ai/)
2. Navigate to Billing/Settings
3. Increase spending limit or purchase credits
4. Wait for limit reset (usually monthly)

## How It Works

### Rate Limiter
```javascript
// Automatically tracks requests and enforces limits
grokRateLimiter.waitIfNeeded()  // Called before each API call
```

### Retry Logic
```javascript
// Automatically retries on rate limit errors
retryWithBackoff(fn, maxRetries=3, baseDelay=2000)
```

### Error Detection
The code detects rate limit errors by checking for:
- HTTP status `429`
- Error messages containing "exhausted", "spending limit", or "rate limit"

## Monitoring

Watch server logs for rate limit messages:
- `⏳ Grok rate limit: waiting Xs` - Rate limiter is active
- `⏳ Grok rate limited, retrying in Xms` - Retry in progress
- `⚠️ Grok API rate limit/spending limit reached` - Falling back to Claude

## Testing

Test the rate limiting:

```bash
# Make multiple rapid requests
for i in {1..5}; do
  curl -X POST http://localhost:2999/api/insights/enhanced \
    -H "Content-Type: application/json" \
    -d '{"tileId":"test","tileSize":"horizontal"}' &
done
```

You should see rate limiting messages in the logs.

## Best Practices

1. **Use Claude as default** if you're hitting limits frequently
2. **Monitor your usage** in xAI console
3. **Cache responses** when possible (already implemented for insights)
4. **Batch requests** instead of making many individual calls
5. **Use fallback models** - The system automatically falls back to Claude

## Troubleshooting

### Still Getting Rate Limit Errors?

1. **Check your .env file** - Make sure rate limiting variables are set
2. **Check xAI console** - Verify your account status and credits
3. **Switch to Claude** - Set `DEFAULT_AI_MODEL=claude-opus-4-1-20250805`
4. **Reduce request rate** - Lower `GROK_MAX_REQUESTS_PER_MINUTE`
5. **Check logs** - Look for rate limit messages

### Rate Limiter Not Working?

1. **Restart server** - Changes to `.env` require restart
2. **Check environment variables** - Verify they're loaded correctly
3. **Check logs** - Look for rate limit messages

## Cost Considerations

- **Grok**: Pay-per-use, can hit spending limits
- **Claude**: Pay-per-use, generally more reliable
- **Recommendation**: Use Claude as default, Grok as fallback

## Summary

✅ **Implemented**:
- Automatic retry with exponential backoff
- Rate limiting/throttling
- Environment variable configuration
- Automatic fallback to Claude

✅ **Recommended Action**:
Add to `.env`:
```bash
DEFAULT_AI_MODEL=claude-opus-4-1-20250805
```

Then restart the server.






