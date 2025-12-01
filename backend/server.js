import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import translateRoutes from "./routes/translateRoutes.js";

dotenv.config();
const app = express();

// Prefer environment values, but allow defaults for local development.
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || null;

app.use(cors());
app.use(express.json());

if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => {
      console.error("MongoDB connection error:", err);
      // don't exit the process; allow the server to run for frontend/dev work
    });
} else {
  console.warn("MONGO_URI not provided — skipping MongoDB connection (development mode)");
}

app.use("/api/auth", authRoutes);
app.use("/api", translateRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
