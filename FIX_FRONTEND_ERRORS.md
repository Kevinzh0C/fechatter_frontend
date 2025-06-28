# Frontend Error Fixes

## Issue 1: SSE EventSource MIME Type Error

**Error**: EventSource's response has a MIME type ("text/html") that is not "text/event-stream"

**Root Cause**: The SSE endpoint `/events` is returning HTML (likely a 404 or error page) instead of the expected event stream.

**Solution**:

1. Update the ngrok URL in `src/utils/apiUrlResolver.js` to the current active ngrok tunnel
2. Verify the backend is serving SSE at the `/events` endpoint
3. Check if the backend requires the access token in headers instead of query params

```javascript
// In src/utils/apiUrlResolver.js, update:
const NGROK_URL = 'https://ca90-45-77-178-85.ngrok-free.app'; // Update to current ngrok URL
```

## Issue 2: Markdown Code Rendering Object Error

**Error**: Code parameter is object, not string

**Root Cause**: The marked library is passing an object to the code renderer instead of a string. This is likely due to a version mismatch or API change.

**Current Status**: Already handled - the code has comprehensive object-to-string conversion logic

## Issue 3: Image Loading Failures

**Error**: Failed to load images from blob URLs

**Root Cause**: The static file endpoint `/files/` is returning 404 errors

**Solutions**:

1. Verify the backend is serving static files at `/files/` endpoint
2. Update the ngrok URL to match the current backend tunnel
3. Check if files need to be accessed with authentication headers

## Quick Fix Script

Run this to update the ngrok URL:

```bash
# Get current ngrok URL from backend
CURRENT_NGROK=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')

# Update the frontend config
sed -i "s|const NGROK_URL = '.*'|const NGROK_URL = '$CURRENT_NGROK'|" src/utils/apiUrlResolver.js
```

## Verification Steps

1. Check if backend is running: `curl https://[ngrok-url]/api/health`
2. Test SSE endpoint: `curl -N https://[ngrok-url]/events?access_token=[token]`
3. Test file endpoint: `curl https://[ngrok-url]/files/test.png`
