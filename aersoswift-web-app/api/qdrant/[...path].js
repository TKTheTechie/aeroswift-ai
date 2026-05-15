const https = require('https');

const TARGET = process.env.QDRANT_SERVICE_URL ?? 'https://ec2-18-206-222-103.compute-1.amazonaws.com';

// Skip TLS verification — EC2 instance uses a self-signed cert
const agent = new https.Agent({ rejectUnauthorized: false });

module.exports = async function handler(req, res) {
  const pathParts = req.query.path;
  const path = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts ?? '');

  const url = new URL(`${TARGET}/${path}`);
  const body = req.method !== 'GET' && req.method !== 'HEAD'
    ? JSON.stringify(req.body)
    : undefined;

  const result = await new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      },
      agent,
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let raw = '';
      proxyRes.on('data', chunk => { raw += chunk; });
      proxyRes.on('end', () => {
        try {
          resolve({ status: proxyRes.statusCode, body: JSON.parse(raw) });
        } catch {
          reject(new Error(`Non-JSON response (${proxyRes.statusCode}): ${raw}`));
        }
      });
    });

    proxyReq.on('error', reject);
    if (body) proxyReq.write(body);
    proxyReq.end();
  });

  res.status(result.status).json(result.body);
};
