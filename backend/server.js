import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import translateRoutes from "./routes/translateRoutes.js";
import workerRoutes from "./routes/workerRoutes.js";

import { createServer } from "http";
import { Server } from "socket.io";
import problemRoutes from "./routes/problemRoutes.js";

// Ensure .env is loaded even if server is started from the project root
dotenv.config({ path: new URL('./.env', import.meta.url).pathname });
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Update this in production
    methods: ["GET", "POST"]
  }
});

// Prefer environment values, but allow defaults for local development.
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ezywork_db";

app.use(cors());
app.use(express.json());

// Inject io into request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Worker joins room based on skill
  socket.on("join-room", (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });
  
  // Worker leaves room
  socket.on("leave-room", (room) => {
      socket.leave(room);
      console.log(`Socket ${socket.id} left room: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

if (MONGO_URI) {
  console.log("Mongo: connecting to", MONGO_URI.split('@').pop());
  mongoose
    .connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
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
app.use("/api/workers", workerRoutes);
app.use("/api/problems", problemRoutes);

httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
