import express from 'express';
import { createServer as createViteServer } from 'vite';
import * as path from 'path';
import { Environment, LogLevel, Paddle } from '@paddle/paddle-node-sdk';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// We need FIREBASE_SERVICE_ACCOUNT set in .env for this to work
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    // Avoid re-initializing if already app exists (like in serverless cold starts)
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } else {
    // Attempt ADC or other default init if available
    if (!admin.apps.length) {
      admin.initializeApp();
    }
  }
} catch (err) {
  console.warn("Failed to initialize Firebase Admin. Please configure FIREBASE_SERVICE_ACCOUNT.", err);
}

const db = admin.firestore();

// Initialize Paddle Node SDK
const paddleEnv = process.env.VITE_PADDLE_ENVIRONMENT === 'sandbox' ? Environment.sandbox : Environment.production;
const paddleKey = process.env.PADDLE_API_KEY || 'fake_key';
// Disable paddle verbose logging on serverless unless debugging
const paddle = new Paddle(paddleKey, { environment: paddleEnv, logLevel: LogLevel.warn });
const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || '';

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: Express raw body parsing is needed for Paddle webhooks signature verification
app.post('/api/webhooks/paddle', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = (req.headers['paddle-signature'] as string) || '';
  
  try {
    if (!webhookSecret) {
       console.warn("PADDLE_WEBHOOK_SECRET not defined, skipping validation");
    }
    
    const eventData = webhookSecret 
          ? paddle.webhooks.unmarshal(req.body, webhookSecret, signature)
          : JSON.parse(req.body.toString());

    console.log('Webhook received:', eventData.eventType);

    if (eventData.eventType === 'transaction.completed') {
       const customData = eventData.data?.customData;
       const schoolId = customData?.schoolId;

       if (schoolId) {
           console.log(`Upgrading school ${schoolId} to PRO plan`);
           const schoolRef = db.collection('schools').doc(schoolId);
           await schoolRef.update({ plan: 'pro' });
       } else {
           console.warn('No schoolId in transaction customData');
       }
    }

    res.status(200).send('Webhook processed');
  } catch (e: any) {
    console.error('Webhook processing failed:', e.message);
    res.status(400).send('Webhook parsing / execution failed');
  }
});

// Regular JSON parsing for other routes
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Export the app for Vercel serverless functions
export default app;

// Vite middleware for development (only run when started natively, not on serverless)
async function startDevServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Check if we are running under Vercel Serverless functions (which sets process.env.VERCEL)
// If NOT running on Vercel, start the daemon
if (!process.env.VERCEL) {
  startDevServer();
}
