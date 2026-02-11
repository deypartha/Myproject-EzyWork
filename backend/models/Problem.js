import mongoose from "mongoose";

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true }, // e.g., "Plumber", "Electrician"
  location: {
    latitude: Number,
    longitude: Number,
    city: String,
    address: String
  },
  status: { 
    type: String, 
    enum: ["open", "assigned", "completed", "cancelled"], 
    default: "open" 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Worker" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Problem", problemSchema);
