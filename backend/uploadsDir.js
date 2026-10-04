const fs = require('fs');
const path = require('path');

// Vercel's /tmp filesystem is temporary; use external object storage for durable images.
const uploadsDir = process.env.VERCEL
  ? path.resolve('/tmp', 'cropsure-ai-uploads')
  : path.resolve(__dirname, 'uploads');

fs.mkdirSync(uploadsDir, { recursive: true });

module.exports = uploadsDir;