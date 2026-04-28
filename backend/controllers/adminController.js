import User from "../models/User.js";
import Worker from "../models/Worker.js";
import bcrypt from "bcryptjs";

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password");
    res.json({
      msg: "Users fetched successfully",
      users,
      total: users.length,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Get single user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json({ msg: "User fetched successfully", user });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!name && !email) {
      return res
        .status(400)
        .json({ msg: "At least one field (name or email) is required" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { name, email },
      { new: true },
    ).select("-password");

    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json({ msg: "User updated successfully", user });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json({
      msg: "User deleted successfully",
      user: { id: user._id, name: user.name },
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Get all workers
export const getAllWorkers = async (req, res) => {
  try {
    const workers = await Worker.find().select("-password");
    res.json({
      msg: "Workers fetched successfully",
      workers,
      total: workers.length,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Get single worker by ID
export const getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id).select("-password");
    if (!worker) return res.status(404).json({ msg: "Worker not found" });
    res.json({ msg: "Worker fetched successfully", worker });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Update worker
export const updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      skills,
      number,
      fullName,
      location,
      yearsOfExperience,
      typeOfWork,
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (skills) updateData.skills = skills;
    if (number) updateData.number = number;
    if (fullName) updateData.fullName = fullName;
    if (location) updateData.location = location;
    if (yearsOfExperience) updateData.yearsOfExperience = yearsOfExperience;
    if (typeOfWork) updateData.typeOfWork = typeOfWork;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ msg: "At least one field is required" });
    }

    const worker = await Worker.findByIdAndUpdate(id, updateData, {
      new: true,
    }).select("-password");
    if (!worker) return res.status(404).json({ msg: "Worker not found" });
    res.json({ msg: "Worker updated successfully", worker });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Delete worker
export const deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);
    if (!worker) return res.status(404).json({ msg: "Worker not found" });
    res.json({
      msg: "Worker deleted successfully",
      worker: { id: worker._id, name: worker.name },
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Create admin user (one-time setup)
export const createAdminUser = async (req, res) => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      return res.status(400).json({ msg: "Admin already exists" });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new User({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();
    res.status(201).json({
      msg: "Admin user created successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalWorkers = await Worker.countDocuments();
    const recentUsers = await User.find({ role: "user" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("-password");
    const recentWorkers = await Worker.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("-password");

    res.json({
      msg: "Dashboard statistics fetched",
      stats: {
        totalUsers,
        totalWorkers,
        recentUsers,
        recentWorkers,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
