const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth endpoints
app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body;
  if (email === 'super@test.com' && password === 'password') {
    res.json({
      success: true,
      data: {
        access_token: 'mock-token-' + Date.now(),
        user: { id: 1, email, name: 'Super User' }
      }
    });
  } else {
    res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
  }
});

// File upload
app.post('/api/files/single', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'mock-file-' + Date.now(),
      filename: 'test.jpg',
      url: 'http://localhost:8080/files/test.jpg',
      size: 1024
    }
  });
});

app.listen(8080, () => console.log('Mock server running on port 8080'));
