/**
 * Vercel API Proxy - Forward all /api requests to ngrok backend
 */

const BACKEND_URL = 'https://62f5-45-77-178-85.ngrok-free.app';

export default async function handler(req, res) {
  const { path } = req.query;
  const targetPath = Array.isArray(path) ? path.join('/') : path || '';
  const targetUrl = `${BACKEND_URL}/${targetPath}`;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
    const data = await response.text();

    // Try to parse as JSON, fallback to text
    let responseData;
    try {
      responseData = JSON.parse(data);
    } catch {
      responseData = data;
    }

    res.status(response.status).json(responseData);

  } catch (error) {
    console.error('[Vercel Proxy] Error:', error);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message,
      target: targetUrl
    });
  }
} 