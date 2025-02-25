/**
 * Vercel API Proxy - Forward all /api requests to ngrok backend
 * Fixed: Add ngrok headers to bypass free tier data restrictions
 */

const BACKEND_URL = 'https://62f5-45-77-178-85.ngrok-free.app';

export default async function handler(req, res) {
  const { path } = req.query;
  const targetPath = Array.isArray(path) ? path.join('/') : path || '';
  const targetUrl = `${BACKEND_URL}/${targetPath}`;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log(`[Vercel Proxy] ${req.method} ${targetUrl}`);

    const options = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Authorization': req.headers.authorization || '',
        // 🔧 CRITICAL FIX: Add ngrok headers to bypass free tier restrictions
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'Fechatter-Frontend/1.0',
        'Accept': 'application/json',
      },
    };

    // Add body for POST/PUT requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      if (typeof req.body === 'string') {
        options.body = req.body;
      } else {
        options.body = JSON.stringify(req.body);
      }
    }

    const response = await fetch(targetUrl, options);
    
    // 🔧 CRITICAL FIX: Better response handling for ngrok data
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await response.text();
      
      // Check if we got the nginx status instead of real data
      if (data.includes('"gateway":"nginx-http"')) {
        console.warn('[Vercel Proxy] Received nginx status instead of real data, ngrok may be filtering');
        // Return a more informative error
        res.status(503).json({
          error: 'Backend service unavailable',
          message: 'ngrok tunnel is not properly forwarding data',
          ngrok_status: JSON.parse(data),
          suggestion: 'Backend service may need restart or ngrok configuration update'
        });
        return;
      }
      
      // Try to parse as JSON
      let responseData;
      try {
        responseData = JSON.parse(data);
      } catch {
        responseData = data;
      }
      
      res.status(response.status).json(responseData);
    } else {
      // Handle non-JSON responses
      const data = await response.text();
      res.status(response.status).send(data);
    }

  } catch (error) {
    console.error('[Vercel Proxy] Error:', error);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message,
      target: targetUrl,
      suggestion: 'Check if ngrok tunnel is running and properly configured'
    });
  }
} 