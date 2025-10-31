// Vercel serverless function entry point
import { Hono } from 'hono';
import appModule from '../src/index';

// Handle import errors gracefully
let app: typeof appModule;

try {
  app = appModule;
  
  // Verify app is a Hono instance
  if (!app || typeof app.fetch !== 'function') {
    throw new Error('App is not a valid Hono instance');
  }
} catch (error: any) {
  console.error('Failed to load Hono app:', error);
  console.error('Error details:', {
    message: error?.message,
    stack: error?.stack,
    name: error?.name
  });
  
  // Create minimal error handler app
  const errorApp = new Hono();
  errorApp.all('*', (c) => {
    return c.json({ 
      error: 'FUNCTION_INVOCATION_FAILED',
      message: 'Failed to initialize application',
      details: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  });
  app = errorApp;
}

export default app;