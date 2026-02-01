import express from 'express';
import { login, register, addWorkerDetails, getAllWorkers, getWorkersByType, getWorkerById } from '../controllers/workerController.js';

const router = express.Router();

// Authentication routes
router.post('/login', login);
router.post('/register', register);

// Worker details routes
router.post('/details', addWorkerDetails);
router.get('/all', getAllWorkers);
router.get('/type/:type', getWorkersByType);
router.get('/:id', getWorkerById);

export default router;
