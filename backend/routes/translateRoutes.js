import express from 'express';
import multer from 'multer';
import { translateAudio } from '../controllers/translateController.js';

const router = express.Router();

// Multer memory storage — we don't persist the file on disk in this simple mock
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/translate', upload.single('file'), translateAudio);

export default router;
