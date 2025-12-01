// const mongoose = require('mongoose');
import mongoose from 'mongoose';
// const bcrypt = require('bcrypt');
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'worker', 'admin'], default: 'user' },
}, { timestamps: true })

export default mongoose.model('User', userSchema);