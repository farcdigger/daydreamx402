// Vercel serverless function - minimal test version
import { Hono } from 'hono';

const app = new Hono();

// Test endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok',
    message: 'Server is working',
    timestamp: new Date().toISOString()
  });
});

// Basic pay endpoint (without external imports first)
app.post('/pay', async (c) => {
  try {
    return c.json({
      status: 'test',
      message: 'Pay endpoint reached',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      error: error?.message || 'Unknown error',
      stack: error?.stack
    }, 500);
  }
});

export default app;