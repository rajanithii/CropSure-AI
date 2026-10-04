const multer = require('multer');
const path   = require('path');
const uploadDir = require('../uploadsDir');

const allowedTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `crop-${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const valid = allowedTypes[extension] === file.mimetype;
  const error = valid ? null : new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed');
  if (error) error.status = 400;
  cb(error, valid);
};

module.exports = multer({
  storage,
  limits:     { fileSize: process.env.VERCEL ? 4 * 1024 * 1024 : 10 * 1024 * 1024 },
  fileFilter,
});
