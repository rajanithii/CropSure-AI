const path = require('path');

if (!process.env.VERCEL) {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

const app = express();
const PORT = process.env.PORT || 5000;
const uploadsDir = require('./uploadsDir');
const claimsRouter = require('./routes/claims');
const mongoCacheKey = '__cropsureMongoConnection';

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    name: 'CropSure AI API',
    status: 'ok',
    health: '/api/health',
    claims: '/api/claims',
  });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

app.get('/uploads/:filename', (req, res, next) => {
  const filePath = path.join(uploadsDir, path.basename(req.params.filename));
  res.sendFile(filePath, (err) => {
    if (err) next(err);
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'CropSure AI Server Running',
    timestamp: new Date(),
    mockMode: process.env.USE_MOCK_AI === 'true',
  });
});

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI ||
    (process.env.VERCEL ? null : 'mongodb://127.0.0.1:27017/agriclaim');

  if (!mongoUri) {
    if (!globalThis.__cropsureMissingMongoUriLogged) {
      console.warn('MONGODB_URI is not set; using in-memory claim storage.');
      globalThis.__cropsureMissingMongoUriLogged = true;
    }
    return false;
  }

  if (mongoose.connection.readyState === 1) return true;

  const cached = globalThis[mongoCacheKey];
  if (cached?.status === 'pending') return cached.promise;
  if (cached?.status === 'failed' && Date.now() < cached.retryAfter) return false;

  const connection = {
    status: 'pending',
    retryAfter: 0,
    promise: null,
  };
  connection.promise = Promise.resolve().then(() => mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    maxPoolSize: 10,
  })).then(() => {
    connection.status = 'connected';
    console.log('MongoDB connected.');
    return true;
  }).catch((err) => {
    connection.status = 'failed';
    connection.retryAfter = Date.now() + 10000;
    console.warn('MongoDB unavailable; using in-memory claim storage:', err.message);
    return false;
  });
  globalThis[mongoCacheKey] = connection;

  return connection.promise;
}

app.use('/api/claims', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/claims', claimsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const status = Number(err.status || err.statusCode) ||
    (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error('Unhandled request error:', err);

  res.status(status).json({
    error: status >= 500
      ? 'Internal server error'
      : status === 404
        ? 'File not found'
        : err.message,
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`
CropSure AI Server Started
Server: http://localhost:${PORT}
API:    http://localhost:${PORT}/api/claims
Health: http://localhost:${PORT}/api/health
AI:     ${process.env.USE_MOCK_AI === 'true' ? 'Mock (Demo Mode)' : 'Live API'}
`);
  });
}

module.exports = app;
