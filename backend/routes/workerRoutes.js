import express from 'express';
import { login, register, addWorkerDetails, getAllWorkers, getWorkersByType, getWorkerById, toggleOnline, updateWorker } from '../controllers/workerController.js';

const router = express.Router();

// Authentication routes
router.post('/login', login);
router.post('/register', register);

// Worker details routes
router.post('/details', addWorkerDetails);
router.get('/all', getAllWorkers);
router.get('/type/:type', getWorkersByType);
router.put('/toggle-online', toggleOnline);
router.get('/:id', getWorkerById);
router.put('/:id', updateWorker);

export default router;
