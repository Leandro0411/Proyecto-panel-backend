import fs from 'fs';
import path from 'path';
import multer from 'multer';
import ApiError from '../errors/ApiError';

const uploadsDir = path.resolve('uploads', 'products');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname) || '.jpg';
    const baseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .toLowerCase();

    callback(null, `${Date.now()}-${baseName}${extension}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  if (!file.mimetype.startsWith('image/')) {
    callback(new ApiError(400, 'Solo se permiten archivos de imagen.'));
    return;
  }

  callback(null, true);
};

export const productUpload = multer({
  storage,
  limits: {
    files: 4,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter,
});
