import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import translateRoutes from "./routes/translateRoutes.js";
import workerRoutes from "./routes/workerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import Worker from "./models/Worker.js";

import { createServer } from "http";
import { Server } from "socket.io";
import problemRoutes from "./routes/problemRoutes.js";

// Ensure .env is loaded even if server is started from the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Update this in production
    methods: ["GET", "POST"],
  },
});

// Prefer environment values, but allow defaults for local development.
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ezywork";
mongoose.set("bufferCommands", false);

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
  socket.on("join-room", async (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);

    // If a worker joins their unique worker-[id] room, set them online in DB and broadcast
    if (room.startsWith("worker-") && !room.startsWith("worker-email-")) {
      const workerId = room.replace("worker-", "");
      if (mongoose.Types.ObjectId.isValid(workerId)) {
        socket.workerId = workerId;
        try {
          const updatedWorker = await Worker.findByIdAndUpdate(
            workerId,
            { isOnline: true },
            { new: true }
          );
          if (updatedWorker) {
            console.log(`Worker ${updatedWorker.name} (${workerId}) set to ONLINE via socket connection`);
            io.emit("worker-status-changed", {
              workerId,
              isOnline: true,
              worker: {
                _id: String(updatedWorker._id),
                name: updatedWorker.name,
                fullName: updatedWorker.fullName,
                email: updatedWorker.email,
                mobileNumber: updatedWorker.mobileNumber || updatedWorker.number,
                typeOfWork: updatedWorker.typeOfWork,
                location: updatedWorker.location,
                yearsOfExperience: updatedWorker.yearsOfExperience,
              }
            });
          }
        } catch (err) {
          console.error(`Error marking worker ${workerId} online on join-room:`, err);
        }
      }
    }
  });

  // Worker leaves room
  socket.on("leave-room", (room) => {
    socket.leave(room);
    console.log(`Socket ${socket.id} left room: ${room}`);
  });

  socket.on("disconnect", async () => {
    console.log("Client disconnected:", socket.id);
    if (socket.workerId) {
      const workerId = socket.workerId;
      try {
        const updatedWorker = await Worker.findByIdAndUpdate(
          workerId,
          { isOnline: false },
          { new: true }
        );
        if (updatedWorker) {
          console.log(`Worker ${updatedWorker.name} (${workerId}) set to OFFLINE via socket disconnect`);
          io.emit("worker-status-changed", {
            workerId,
            isOnline: false,
            worker: {
              _id: String(updatedWorker._id),
              name: updatedWorker.name,
              fullName: updatedWorker.fullName,
              email: updatedWorker.email,
              mobileNumber: updatedWorker.mobileNumber || updatedWorker.number,
              typeOfWork: updatedWorker.typeOfWork,
              location: updatedWorker.location,
              yearsOfExperience: updatedWorker.yearsOfExperience,
            }
          });
        }
      } catch (err) {
        console.error(`Error marking worker ${workerId} offline on disconnect:`, err);
      }
    }
  });
});

if (MONGO_URI) {
  console.log("Mongo: connecting to", MONGO_URI.split("@").pop());
  mongoose
    .connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
    .then(async () => {
      console.log("MongoDB connected");
      try {
        await Worker.updateMany({}, { isOnline: false });
        console.log("Reset all workers' online status to offline on boot");
      } catch (err) {
        console.error("Failed to reset workers online status on boot:", err);
      }
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
      // don't exit the process; allow the server to run for frontend/dev work
    });
} else {
  console.warn(
    "MONGO_URI not provided — skipping MongoDB connection (development mode)",
  );
}

app.use("/api/auth", authRoutes);
app.use("/api", translateRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/admin", adminRoutes);

httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
