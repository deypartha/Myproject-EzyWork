/**
 * Seed Admin User Script
 * Run this script once to create the initial admin user
 * Usage: node backend/seed-admin.js
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const MONGO_URI =
  process.env.MONGO_URI;

async function seedAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("✗ Admin already exists:", existingAdmin.email);
      process.exit(0);
    }

    // Create admin user
    const adminData = {
      name: "Admin",
      email: "admin@ezywork.com",
      password: "Admin@123", // Change this to a secure password
      role: "admin",
    };

    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    const admin = new User({
      name: adminData.name,
      email: adminData.email,
      password: hashedPassword,
      role: adminData.role,
    });

    await admin.save();
    console.log("✓ Admin user created successfully!");
    console.log("\nAdmin Credentials:");
    console.log("Email:", adminData.email);
    console.log("Password:", adminData.password);
    console.log("\n⚠ WARNING: Change the admin password after first login!");

    process.exit(0);
  } catch (err) {
    console.error("✗ Error:", err.message);
    process.exit(1);
  }
}

seedAdmin();
