import type { IncomingMessage, ServerResponse } from 'node:http';
import { identifySceneFromImage } from './identifyHandler';

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    let bodyData = '';
    for await (const chunk of req) {
      bodyData += chunk;
    }

    const { image } = JSON.parse(bodyData || '{}');
    if (!image) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ identified: false, reason: 'No image data provided.' }));
      return;
    }

    const result = await identifySceneFromImage(image);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err: unknown) {
    console.error('API /api/identify error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ identified: false, reason: 'Internal error processing scene image.' }));
  }
}
