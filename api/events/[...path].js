/**
 * Vercel Events Proxy - Forward all /events requests to ngrok backend
 */

const BACKEND_URL = 'https://59d2-45-77-178-85.ngrok-free.app';

export default async function handler(req, res) {
  const { path } = req.query;
  const targetPath = Array.isArray(path) ? path.join('/') : path || '';
  const targetUrl = `${BACKEND_URL}/events/${targetPath}`;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log(`[Events Proxy] ${req.method} ${targetUrl}`);

    const options = {
      method: req.method,
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Authorization': req.headers.authorization || '',
      },
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);
    
    // Handle SSE streams
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Note: Vercel has limitations with streaming responses
      // This is a simplified implementation
      const data = await response.text();
      res.status(response.status).send(data);
    } else {
      const data = await response.text();
      res.status(response.status).send(data);
    }

  } catch (error) {
    console.error('[Events Proxy] Error:', error);
    res.status(500).json({
      error: 'Events proxy error',
      message: error.message
    });
  }
} 