import httpStatus from "http-status";
import Worker from "../models/Worker.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SKILL_ALIASES = {
  Plumber: [
    "plumber",
    "plumbing",
    "pipe",
    "leak",
    "tap",
    "drain",
    "water line",
    "toilet",
    "faucet",
    "ac",
    "air conditioner",
    "air conditioning",
    "hvac",
    "cooling",
    "not cooling",
    "ac repair",
    "ac service",
    "ac not working",
  ],
  Electrician: [
    "electrician",
    "electrical",
    "wiring",
    "wire",
    "switch",
    "socket",
    "power",
    "voltage",
  ],
  Cleaner: [
    "cleaner",
    "cleaning",
    "maid",
    "housekeeping",
    "sanitize",
    "wash",
    "deep clean",
  ],
  Painter: ["painter", "painting", "paint", "wall paint", "color", "colour"],
  Carpenter: [
    "carpenter",
    "carpentry",
    "woodwork",
    "wood",
    "furniture",
    "door repair",
    "table repair",
  ],
  Welder: [
    "welder",
    "welding",
    "metal work",
    "gate repair",
    "grill repair",
    "iron work",
    "steel work",
  ],
  Mechanic: [
    "mechanic",
    "car repair",
    "bike repair",
    "vehicle repair",
    "engine",
    "car not starting",
    "not starting",
    "breakdown",
    "puncture",
  ],
  Driver: [
    "driver",
    "driving",
    "chauffeur",
    "pickup",
    "drop",
    "transport",
    "ride",
  ],
};

const escapeRegExp = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeSkillName = (skill = "") => {
  const s = String(skill).trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase() === s)) {
      return canonical;
    }
  }

  if (!s) return null;
  return skill;
};

const detectSkillLocally = (text = "") => {
  const normalizedText = String(text).toLowerCase();
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    for (const alias of aliases) {
      if (normalizedText.includes(alias.toLowerCase())) {
        return canonical;
      }
    }
  }
  return null;
};

const detectSkillWithHuggingFace = async (text = "") => {
  const queryText = String(text || "").trim();
  if (!queryText) return null;

  const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;
  if (!apiKey) {
    console.warn("Hugging Face API key not provided — using local keyword matching fallback");
    return detectSkillLocally(queryText);
  }

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          inputs: queryText,
          parameters: {
            candidate_labels: Object.keys(SKILL_ALIASES),
            multi_label: false,
          },
          options: { wait_for_model: true },
        }),
      },
    );

    if (!response.ok) {
      console.warn(`Hugging Face API error (status: ${response.status}) — using local keyword matching fallback`);
      return detectSkillLocally(queryText);
    }

    const data = await response.json();
    const bestLabel = data?.labels?.[0];
    if (!bestLabel) return detectSkillLocally(queryText);

    return normalizeSkillName(bestLabel);
  } catch (err) {
    console.warn("Hugging Face lookup failed — using local keyword matching fallback:", err.message);
    return detectSkillLocally(queryText);
  }
};

const getSkillRegexList = (skill = "") => {
  const normalized = normalizeSkillName(skill);
  if (!normalized) return [];

  const aliases = SKILL_ALIASES[normalized] || [normalized.toLowerCase()];
  return aliases.map((alias) => new RegExp(`^${escapeRegExp(alias)}$`, "i"));
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const worker = await Worker.findOne({ email });
    if (!worker) {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "Invalid email or password" });
    }
    const isPasswordValid = await bcrypt.compare(password, worker.password);
    if (!isPasswordValid) {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "Invalid email or password" });
    }
    // Generate a token or perform further actions upon successful login
    const token = crypto.randomBytes(16).toString("hex");
    res.status(httpStatus.OK).json({ message: "Login successful", token });
  } catch (error) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred during login",
      error: error.message,
    });
  }
};

const register = async (req, res) => {
  try {
    const { name, email, password, number } = req.body;
    const existingWorker = await Worker.findOne({ email });
    if (existingWorker) {
      return res
        .status(httpStatus.CONFLICT)
        .json({ message: "Email already in use" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newWorker = new Worker({
      name,
      email,
      password: hashedPassword,
      number,
    });
    await newWorker.save();
    res
      .status(httpStatus.CREATED)
      .json({ message: "Worker registered successfully" });
  } catch (error) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred during registration",
      error: error.message,
    });
  }
};

// Add worker details
const addWorkerDetails = async (req, res) => {
  try {
    const {
      email,
      fullName,
      location,
      yearsOfExperience,
      typeOfWork,
      mobileNumber,
    } = req.body;

    if (!email) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: "Email is required to save worker details" });
    }

    const selectedType = Array.isArray(typeOfWork) ? typeOfWork[0] : typeOfWork;
    const parsedExp = yearsOfExperience !== "" && yearsOfExperience !== undefined && yearsOfExperience !== null ? Number(yearsOfExperience) : 0;

    let worker = await Worker.findOne({ email });

    if (!worker) {
      // Create a new worker if they don't exist
      const hashedPassword = await bcrypt.hash("defaultPassword123", 10);
      worker = new Worker({
        name: fullName || "Worker",
        email,
        password: hashedPassword,
        number: mobileNumber || "0000000000",
        fullName: fullName || "Worker",
        location: location || "",
        yearsOfExperience: isNaN(parsedExp) ? 0 : parsedExp,
        typeOfWork: selectedType || "Worker",
        mobileNumber: mobileNumber || "",
      });
    } else {
      // Update existing worker
      worker.name = fullName || worker.name || "Worker";
      worker.fullName = fullName || worker.fullName || "Worker";
      worker.location = location !== undefined ? location : worker.location;
      worker.yearsOfExperience = isNaN(parsedExp) ? (worker.yearsOfExperience || 0) : parsedExp;
      worker.typeOfWork = selectedType || worker.typeOfWork || "Worker";
      worker.mobileNumber = mobileNumber !== undefined ? mobileNumber : worker.mobileNumber;
      worker.number = mobileNumber || worker.number || "0000000000";
    }

    await worker.save();
    res
      .status(httpStatus.OK)
      .json({ message: "Worker details saved successfully", worker });
  } catch (error) {
    console.error("Error in addWorkerDetails:", error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while updating worker details",
      error: error.message,
    });
  }
};

// Get all workers
const getAllWorkers = async (req, res) => {
  try {
    const workers = await Worker.find().select("-password");
    res.status(httpStatus.OK).json(workers);
  } catch (error) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while fetching workers",
      error: error.message,
    });
  }
};

// Get workers by type if online
const getWorkersByType = async (req, res) => {
  try {
    const { type } = req.params;
    const regexList = getSkillRegexList(type);
    const workers = await Worker.find({
      typeOfWork: {
        $in: regexList.length
          ? regexList
          : [new RegExp(`^${escapeRegExp(type)}$`, "i")],
      },
      isOnline: true,
    }).select("-password").$where("this.isOnline === true");
    res.status(httpStatus.OK).json(workers);
  } catch (error) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while fetching workers",
      error: error.message,
    });
  }
};

// Detect skill from user query using Hugging Face only
const detectSkill = async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || !String(text).trim()) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: "text is required" });
    }

    const skill = await detectSkillWithHuggingFace(text);

    return res.status(httpStatus.OK).json({ skill });
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "Failed to detect skill", error: error.message });
  }
};

// Search workers by free-text query using Hugging Face only
const searchWorkers = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (!query) {
      return res
        .status(httpStatus.OK)
        .json({ detectedSkill: null, workers: [] });
    }

    const detectedSkill = await detectSkillWithHuggingFace(query);

    const workers = detectedSkill
      ? await Worker.find({
          typeOfWork: { $in: getSkillRegexList(detectedSkill) },
          isOnline: true,
        }).select("-password")
      : [];

    return res.status(httpStatus.OK).json({ detectedSkill, workers });
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "Failed to search workers", error: error.message });
  }
};

// Get worker by ID
const getWorkerById = async (req, res) => {
  try {
    const { id } = req.params;
    const worker = await Worker.findById(id).select("-password");
    if (!worker) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "Worker not found" });
    }
    res.status(httpStatus.OK).json(worker);
  } catch (error) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while fetching worker",
      error: error.message,
    });
  }
};

// Toggle Online Status
const toggleOnline = async (req, res) => {
  try {
    const { email, isOnline, location } = req.body;
    const worker = await Worker.findOne({ email });

    if (!worker) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "Worker not found" });
    }

    worker.isOnline = isOnline;
    if (location) {
      worker.currentLocation = location;
    }

    await worker.save();

    // SOCKET.IO: Emit event to notify all connected clients
    if (req.io) {
      req.io.emit("worker-status-changed", {
        workerId: String(worker._id),
        isOnline: worker.isOnline,
        worker: {
          _id: String(worker._id),
          name: worker.name,
          fullName: worker.fullName,
          email: worker.email,
          mobileNumber: worker.mobileNumber || worker.number,
          typeOfWork: worker.typeOfWork,
          location: worker.location,
          yearsOfExperience: worker.yearsOfExperience,
        }
      });
      console.log(`Socket.io: Emitted worker-status-changed for worker ${worker._id} (isOnline: ${worker.isOnline})`);
    }

    res
      .status(httpStatus.OK)
      .json({ message: "Status updated", isOnline: worker.isOnline });
  } catch (error) {
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "An error occurred", error: error.message });
  }
};

// Update worker details by ID
const updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const worker = await Worker.findByIdAndUpdate(id, updateData, {
      new: true,
    }).select("-password");

    if (!worker) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "Worker not found" });
    }

    res
      .status(httpStatus.OK)
      .json({ message: "Worker updated successfully", worker });
  } catch (error) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while updating worker",
      error: error.message,
    });
  }
};

export {
  login,
  register,
  addWorkerDetails,
  getAllWorkers,
  getWorkersByType,
  getWorkerById,
  toggleOnline,
  updateWorker,
  detectSkill,
  searchWorkers,
};
