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
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Attempt ADC or other default init if available
    admin.initializeApp();
  }
} catch (err) {
  console.warn("Failed to initialize Firebase Admin. Please configure FIREBASE_SERVICE_ACCOUNT.", err);
}

const db = admin.firestore();

// Initialize Paddle Node SDK
const paddleEnv = process.env.VITE_PADDLE_ENVIRONMENT === 'sandbox' ? Environment.sandbox : Environment.production;
const paddle = new Paddle(process.env.PADDLE_API_KEY || 'fake_key', { environment: paddleEnv, logLevel: LogLevel.verbose });
const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || '';

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // Vite middleware for development
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
