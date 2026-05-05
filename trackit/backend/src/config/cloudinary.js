const cloudinary = require('cloudinary');
const multer = require('multer');
const path = require('path');
const CloudinaryStorage = require('multer-storage-cloudinary');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const requiredCloudinaryConfig = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const missingCloudinaryConfig = requiredCloudinaryConfig.filter((key) => !process.env[key]);

if (missingCloudinaryConfig.length > 0) {
  throw new Error(`Missing Cloudinary environment variables: ${missingCloudinaryConfig.join(', ')}`);
}

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage for receipts
const receiptStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'trackit/receipts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'heic'],
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' },
      { quality: 'auto' }
    ],
    format: 'jpg'
  }
});

// Configure storage for avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'trackit/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [
      { width: 200, height: 200, crop: 'fill' },
      { quality: 'auto' }
    ],
    format: 'jpg'
  }
});

// Multer upload middleware
const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF allowed.'));
    }
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG allowed.'));
    }
  }
});

module.exports = { cloudinary: cloudinary.v2, uploadReceipt, uploadAvatar };
