/**
 * Vercel API Route - Dynamic Backend Proxy
 * Handles all API requests: /api/proxy/* → https://45.77.178.85:8443/*
 */

// Backend configuration
const BACKEND_BASE_URL = 'https://45.77.178.85:8443';

// Disable body parsing to handle raw data
export const config = {
  api: {
    bodyParser: false,
  },
};

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-API-Key, X-Request-Id, X-Workspace-Id, Cache-Control',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400'
};

export default async function handler(req, res) {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(204).end();
  }
  
  // Debug logging
  console.log(`🔍 [Vercel Proxy] ${req.method} ${req.url} - Body type: ${typeof req.body}`);
  
  try {
    // Extract path from dynamic route
    const { path } = req.query;
    const targetPath = Array.isArray(path) ? path.join('/') : path || '';
    
    // Build target URL - remove /proxy prefix and forward to backend
    const targetUrl = `${BACKEND_BASE_URL}/${targetPath}`;
    
    console.log(`🌐 [Vercel Proxy] ${req.method} /${targetPath} → ${targetUrl}`);
    
    // Prepare headers (remove host to avoid conflicts)
    const forwardHeaders = { ...req.headers };
    delete forwardHeaders.host;
    delete forwardHeaders['x-forwarded-for'];
    delete forwardHeaders['x-forwarded-proto'];
    
    // Prepare request options
    const requestOptions = {
      method: req.method,
      headers: forwardHeaders
    };
    
    // Get request body for POST/PUT/PATCH requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);
      if (body.length > 0) {
        requestOptions.body = body;
      }
    }
    
    // Make request to backend (Node.js fetch ignores SSL issues in serverless)
    const response = await fetch(targetUrl, requestOptions);
    
    // Prepare response headers
    const responseHeaders = { ...CORS_HEADERS };
    
    // Copy important headers from backend response
    ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified'].forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders[header] = value;
      }
    });
    
    // Handle different response types
    let responseBody;
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      responseBody = await response.text();
    } else if (contentType.includes('text/')) {
      responseBody = await response.text();
    } else {
      // Handle binary data (images, files, etc.)
      const buffer = await response.arrayBuffer();
      responseBody = Buffer.from(buffer);
    }
    
    console.log(`📡 [Vercel Proxy] Response: ${response.status} (${contentType}) for /${targetPath}`);
    
    // Set headers and send response
    Object.entries(responseHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    return res.status(response.status).send(responseBody);
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Return error response with CORS headers
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    return res.status(503).json({
      error: 'Backend service temporarily unavailable',
      code: 'VERCEL_PROXY_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
      development: false
    });
  }
} 