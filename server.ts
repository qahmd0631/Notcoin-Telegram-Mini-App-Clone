import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { apiRouter } from './server/api.js';
import { initTelegramBot } from './server/bot.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-telegram-init-data', 'x-telegram-id'],
    })
  );
  app.use(express.json());

  // Mount backend API routes
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      project: 'AURA_AGEN',
      time: new Date().toISOString(),
    });
  });

  if (!isProd) {
    // Vite middleware for development
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('⚡ Vite development middleware attached');
  } else {
    // Production static assets
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('{*path}', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AURA_AGEN Server listening on http://0.0.0.0:${PORT}`);
  });

  // Start Telegram bot instance if configured
  initTelegramBot();
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
