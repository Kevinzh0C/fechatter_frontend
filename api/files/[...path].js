/**
 * Vercel Files Proxy - Forward all /files requests to ngrok backend
 */

const BACKEND_URL = 'https://59d2-45-77-178-85.ngrok-free.app';

export default async function handler(req, res) {
  const { path } = req.query;
  const targetPath = Array.isArray(path) ? path.join('/') : path || '';
  const targetUrl = `${BACKEND_URL}/files/${targetPath}`;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log(`[Files Proxy] ${req.method} ${targetUrl}`);

    const options = {
      method: req.method,
      headers: {
        'Authorization': req.headers.authorization || '',
      },
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);
    
    // Handle binary data
    if (response.headers.get('content-type')?.includes('image') || 
        response.headers.get('content-type')?.includes('application/octet-stream')) {
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', response.headers.get('content-type'));
      res.status(response.status).send(Buffer.from(buffer));
    } else {
      const data = await response.text();
      res.status(response.status).send(data);
    }

  } catch (error) {
    console.error('[Files Proxy] Error:', error);
    res.status(500).json({
      error: 'Files proxy error',
      message: error.message
    });
  }
} 