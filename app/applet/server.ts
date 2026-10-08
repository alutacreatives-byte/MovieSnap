import express from 'express';
import { createServer as createViteServer } from 'vite';
import handler from './api/identify.ts';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API route
  app.post('/api/identify', async (req, res) => {
    return handler(req, res);
  });

  // Vite middleware for development
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
