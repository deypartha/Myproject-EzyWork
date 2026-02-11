import { Schema, model } from 'mongoose';
const workerSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    skills: { type: [String], default: [] },
    number: { type: String, required: true },
    fullName: { type: String },
    location: { type: String },
    yearsOfExperience: { type: Number },
    typeOfWork: { type: [String], default: [] },
    isOnline: { type: Boolean, default: false },
    currentLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        city: { type: String }
    },
    mobileNumber: { type: String }
}, { timestamps: true })

export default model('Worker', workerSchema);