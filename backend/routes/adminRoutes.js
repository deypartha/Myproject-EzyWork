import express from "express";
import { verifyAdminToken, isAdmin } from "../middlewares/adminAuth.js";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker,
  createAdminUser,
  getDashboardStats,
} from "../controllers/adminController.js";

const router = express.Router();

// Admin setup (create admin user - should be done once)
router.post("/setup", createAdminUser);

// All admin routes require token verification and admin role
router.use(verifyAdminToken, isAdmin);

// Dashboard
router.get("/dashboard/stats", getDashboardStats);

// Users CRUD
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Workers CRUD
router.get("/workers", getAllWorkers);
router.get("/workers/:id", getWorkerById);
router.put("/workers/:id", updateWorker);
router.delete("/workers/:id", deleteWorker);

export default router;
