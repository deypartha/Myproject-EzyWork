import httpStatus from 'http-status';
import Worker from '../models/Worker.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const login = async(req, res)=>{
    try{
        const { email, password} = req.body;
        const worker = await Worker.findOne({ email }); 
        if(!worker){
            return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Invalid email or password' });
        }
        const isPasswordValid = await bcrypt.compare(password, worker.password);
        if(!isPasswordValid){
            return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Invalid email or password' });
        }
        // Generate a token or perform further actions upon successful login
        const token = crypto.randomBytes(16).toString('hex');
        res.status(httpStatus.OK).json({ message: 'Login successful', token });
    }catch(error){
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'An error occurred during login', error: error.message });
    }
}

const register = async(req, res)=>{
    try{
        const { name, email, password, number } = req.body;
        const existingWorker = await Worker.findOne({ email });
        if(existingWorker){
            return res.status(httpStatus.CONFLICT).json({ message: 'Email already in use' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newWorker = new Worker({ name, email, password: hashedPassword, number });
        await newWorker.save();
        res.status(httpStatus.CREATED).json({ message: 'Worker registered successfully' });
    }catch(error){
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'An error occurred during registration', error: error.message });
    }
}

// Add worker details
const addWorkerDetails = async(req, res) => {
    try {
        const { email, fullName, location, yearsOfExperience, typeOfWork, mobileNumber } = req.body;
        
        let worker = await Worker.findOne({ email });
        
        if (!worker) {
            // Create a new worker if they don't exist
            const hashedPassword = await bcrypt.hash('defaultPassword123', 10);
            worker = new Worker({ 
                name: fullName || 'Worker',
                email,
                password: hashedPassword,
                number: mobileNumber || '0000000000',
                fullName,
                location,
                yearsOfExperience,
                typeOfWork,
                mobileNumber
            });
        } else {
            // Update existing worker
            worker.fullName = fullName;
            worker.location = location;
            worker.yearsOfExperience = yearsOfExperience;
            worker.typeOfWork = typeOfWork;
            worker.mobileNumber = mobileNumber;
        }

        await worker.save();
        res.status(httpStatus.OK).json({ message: 'Worker details saved successfully', worker });
    } catch(error) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'An error occurred while updating worker details', error: error.message });
    }
}

// Get all workers
const getAllWorkers = async(req, res) => {
    try {
        const workers = await Worker.find().select('-password');
        res.status(httpStatus.OK).json(workers);
    } catch(error) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'An error occurred while fetching workers', error: error.message });
    }
}

// Get workers by type
const getWorkersByType = async(req, res) => {
    try {
        const { type } = req.params;
        const workers = await Worker.find({ typeOfWork: type }).select('-password');
        res.status(httpStatus.OK).json(workers);
    } catch(error) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'An error occurred while fetching workers', error: error.message });
    }
}

// Get worker by ID
const getWorkerById = async(req, res) => {
    try {
        const { id } = req.params;
        const worker = await Worker.findById(id).select('-password');
        if (!worker) {
            return res.status(httpStatus.NOT_FOUND).json({ message: 'Worker not found' });
        }
        res.status(httpStatus.OK).json(worker);
    } catch(error) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'An error occurred while fetching worker', error: error.message });
    }
}

// Toggle Online Status
const toggleOnline = async(req, res) => {
    try {
        const { email, isOnline, location } = req.body;
        const worker = await Worker.findOne({ email });
        
        if (!worker) {
            return res.status(httpStatus.NOT_FOUND).json({ message: 'Worker not found' });
        }

        worker.isOnline = isOnline;
        if (location) {
            worker.currentLocation = location;
        }

        await worker.save();
        res.status(httpStatus.OK).json({ message: 'Status updated', isOnline: worker.isOnline });
    } catch(error) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'An error occurred', error: error.message });
    }
}

// Update worker details by ID
const updateWorker = async(req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const worker = await Worker.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
        
        if (!worker) {
            return res.status(httpStatus.NOT_FOUND).json({ message: 'Worker not found' });
        }
        
        res.status(httpStatus.OK).json({ message: 'Worker updated successfully', worker });
    } catch(error) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'An error occurred while updating worker', error: error.message });
    }
}

export { login, register, addWorkerDetails, getAllWorkers, getWorkersByType, getWorkerById, toggleOnline, updateWorker };
