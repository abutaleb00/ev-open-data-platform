const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the standard storage target directory exists dynamically
const uploadDir = path.join(__dirname, '../../uploads/locations');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Build unique file keys to prevent collision overlays
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'loc-img-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Enforce image file filters
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only image uploads are allowed.'), false);
    }
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });