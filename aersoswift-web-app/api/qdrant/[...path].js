import { Agent, fetch } from 'undici';

const TARGET = process.env.QDRANT_SERVICE_URL ?? 'https://ec2-18-206-222-103.compute-1.amazonaws.com';

// Skip TLS verification — EC2 instance uses a self-signed cert
const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });

export default async function handler(req, res) {
  const pathParts = req.query.path;
  const path = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts ?? '');
  const targetUrl = `${TARGET}/${path}`;

  const body = req.method !== 'GET' && req.method !== 'HEAD'
    ? JSON.stringify(req.body)
    : undefined;

  const response = await fetch(targetUrl, {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    body,
    dispatcher,
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
