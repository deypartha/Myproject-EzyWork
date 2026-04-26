import mongoose from "mongoose";

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true }, // e.g., "Plumber", "Electrician"
  location: {
    latitude: Number,
    longitude: Number,
    city: String,
    address: String,
  },
  status: {
    type: String,
    enum: [
      "open",
      "requested",
      "assigned",
      "in_progress",
      "completed",
      "cancelled",
    ],
    default: "open",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Worker" },
  amount: { type: Number },
  otp: { type: String },
  paymentMethod: { type: String, enum: ["Pay Now", "Pay Later"] },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  paymentId: { type: String },
  paymentDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  assignedAt: { type: Date },
  completedAt: { type: Date },
});

export default mongoose.model("Problem", problemSchema);
