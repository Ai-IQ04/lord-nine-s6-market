const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// สร้าง uploads directory ถ้ายังไม่มี
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ใช้ disk storage สำหรับ local development, memory storage สำหรับ production
let storage;
if (process.env.NODE_ENV === 'production') {
    // บน Render ใช้ memory storage และจะ encode เป็น base64
    storage = multer.memoryStorage();
} else {
    // บน local ใช้ disk storage
    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, UPLOAD_DIR);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${uuidv4()}${ext}`);
        },
    });
}

const fileFilter = (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only .jpg, .png, .webp files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

module.exports = { upload, UPLOAD_DIR };
