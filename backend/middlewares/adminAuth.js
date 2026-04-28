import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verify JWT token and check if user is admin
export const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "No token provided" });

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );
    req.userId = decoded.id;
    req.role = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
};

// Check if user is admin
export const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res
        .status(403)
        .json({ msg: "Access denied. Admin privileges required." });
    }
    next();
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
