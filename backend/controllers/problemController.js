import Problem from "../models/Problem.js";
import Worker from "../models/Worker.js";
import User from "../models/User.js";
import Razorpay from "razorpay";

const parseAmount = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/\d+(?:\.\d+)?/);
  if (!match) return null;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const emitProblemUpdate = async (req, problem, eventName, message) => {
  if (!req.io || !problem) return;

  const eventData = {
    message,
    problemId: String(problem._id),
    problem,
  };

  const rooms = new Set();
  const assignedToId = problem.assignedTo?.toString?.() || String(problem.assignedTo || "");
  const createdById = problem.createdBy?.toString?.() || String(problem.createdBy || "");

  if (assignedToId) rooms.add(`worker-${assignedToId}`);
  if (createdById) rooms.add(`user-${createdById}`);

  try {
    const worker = assignedToId ? await Worker.findById(assignedToId).select("email") : null;
    if (worker?.email) rooms.add(`worker-email-${worker.email}`);
  } catch (error) {
    console.warn("Failed to resolve worker email for status event:", error.message);
  }

  try {
    const user = createdById ? await User.findById(createdById).select("email") : null;
    if (user?.email) rooms.add(`user-email-${user.email}`);
  } catch (error) {
    console.warn("Failed to resolve user email for status event:", error.message);
  }

  rooms.forEach((room) => {
    req.io.to(room).emit(eventName, eventData);
  });
};

export const createProblem = async (req, res) => {
  try {
    const { title, description, category, location, createdBy, isVerified, verificationDetails } = req.body;

    const problem = new Problem({
      title,
      description,
      category,
      location,
      createdBy,
      status: "open",
      isVerified: isVerified || false,
      verificationDetails: verificationDetails || {},
    });

    await problem.save();

    // SOCKET.IO: Emit event to workers of this category
    // We assume req.io is attached in server.js
    if (req.io) {
      req.io.to(category).emit("new-problem", problem);
      console.log(`Emitted new-problem to room: ${category}`);
    }

    res.status(201).json(problem);
  } catch (error) {
    console.error("Error creating problem:", error);
    res.status(500).json({ message: "Failed to create problem" });
  }
};

export const getOpenProblems = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { status: "open" };
    if (category) filter.category = category;

    const problems = await Problem.find(filter).sort({ createdAt: -1 });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch problems" });
  }
};

export const requestWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const { workerId } = req.body;

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    if (problem.status !== "open") {
      return res
        .status(400)
        .json({ message: "Problem already requested or assigned" });
    }

    problem.status = "requested";
    problem.assignedTo = workerId;
    problem.requestedAt = new Date();
    await problem.save();

    // Notify the specific worker via socket
    if (req.io) {
      req.io.to(`worker-${workerId}`).emit("worker-request", {
        problem: problem,
        message: "You have a new job request",
      });
      console.log(`Emitted worker-request to worker: ${workerId}`);

      const worker = await Worker.findById(workerId).select("email");
      if (worker?.email) {
        req.io.to(`worker-email-${worker.email}`).emit("worker-request", {
          problem: problem,
          message: "You have a new job request",
        });
        console.log(`Emitted worker-request to worker email: ${worker.email}`);
      }
    }

    res.json({ message: "Worker requested successfully", problem });
  } catch (error) {
    console.error("Error requesting worker:", error);
    res.status(500).json({ message: "Failed to request worker" });
  }
};

export const acceptProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { workerId } = req.body; // Expecting worker ID in body

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    const assignedToId = problem.assignedTo?.toString();

    if (problem.status === "open") {
      problem.status = "assigned";
      problem.assignedTo = workerId;
      problem.assignedAt = new Date();
      await problem.save();

      if (req.io) {
        req.io.to(`user-${problem.createdBy}`).emit("request-accepted", {
          problem: problem,
          message: "A worker accepted your job request",
        });
      }

      await emitProblemUpdate(req, problem, "job-status-updated", "Job accepted successfully.");
      return res.json({ message: "Problem accepted", problem });
    }

    if (problem.status !== "requested" || assignedToId !== workerId) {
      return res.status(400).json({
        message: "Problem not requested by this worker or already processed",
      });
    }

    problem.status = "assigned";
    problem.assignedAt = new Date();
    await problem.save();
    await emitProblemUpdate(req, problem, "job-status-updated", "Job accepted successfully.");

    // Notify the user who posted the problem
    if (req.io) {
      req.io.to(`user-${problem.createdBy}`).emit("request-accepted", {
        problem: problem,
        message: "Your worker request has been accepted",
      });
      console.log(`Emitted request-accepted to user: ${problem.createdBy}`);
    }

    res.json({ message: "Problem accepted", problem });
  } catch (error) {
    res.status(500).json({ message: "Failed to accept problem" });
  }
};

export const bookProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp, paymentMethod, amount } = req.body;

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    if (problem.status !== "assigned" && problem.status !== "in_progress") {
      return res.status(400).json({ message: "Problem not assigned yet" });
    }

    problem.otp = otp;
    problem.paymentMethod = paymentMethod;
    const parsedAmount = parseAmount(amount);
    if (parsedAmount !== null) {
      problem.amount = parsedAmount;
    }
    if (problem.status === "assigned") {
      problem.status = "in_progress";
    }
    await problem.save();
    await emitProblemUpdate(req, problem, "job-status-updated", "Booking confirmed. Job is now in progress.");

    res.json({ message: "Problem booked successfully", problem });
  } catch (error) {
    res.status(500).json({ message: "Failed to book problem" });
  }
};

export const completeProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    if (problem.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    problem.status = "completed";
    if (problem.paymentStatus !== "completed") {
      problem.paymentStatus = "pending";
    }
    problem.completedAt = new Date();
    await problem.save();
    await emitProblemUpdate(req, problem, "job-status-updated", "OTP matched. Payment is pending from the customer.");

    // Emit socket event to notify user that OTP is verified
    if (req.io) {
      const userId = problem.createdBy.toString();
      const eventData = {
        message: "OTP verified successfully! Payment page opening...",
        problemId: id,
        problem: problem,
      };

      // Emit to user room (by ID)
      req.io.to(`user-${userId}`).emit("otp-verified", eventData);
      console.log(`Emitted otp-verified to user room: user-${userId}`);

      // Also try to get user email and emit to email-based room for redundancy
      try {
        const user = await User.findById(userId).select("email");
        if (user?.email) {
          req.io.to(`user-email-${user.email}`).emit("otp-verified", eventData);
          console.log(
            `Emitted otp-verified to user email room: user-email-${user.email}`,
          );
        }
      } catch (err) {
        console.warn("Could not emit to email room:", err.message);
      }
    }

    res.json({ message: "Problem completed successfully", problem });
  } catch (error) {
    res.status(500).json({ message: "Failed to complete problem" });
  }
};

export const startProblem = async (req, res) => {
  try {
    const { id } = req.params;

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    if (problem.status !== "assigned") {
      return res
        .status(400)
        .json({ message: "Problem not in assigned status" });
    }

    problem.status = "in_progress";
    await problem.save();
    await emitProblemUpdate(req, problem, "job-status-updated", "Worker started the job.");

    res.json({ message: "Problem started successfully", problem });
  } catch (error) {
    res.status(500).json({ message: "Failed to start problem" });
  }
};

export const getUserProblems = async (req, res) => {
  try {
    const { userId } = req.params;
    const problems = await Problem.find({ createdBy: userId })
      .populate("assignedTo", "fullName mobileNumber email")
      .sort({ createdAt: -1 });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user problems" });
  }
};

export const getWorkerProblems = async (req, res) => {
  try {
    const { workerId } = req.params;
    const problems = await Problem.find({ assignedTo: workerId })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch worker problems" });
  }
};

export const getProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await Problem.findById(id)
      .populate("assignedTo", "fullName mobileNumber email")
      .populate("createdBy", "name email");
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }
    res.json(problem);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch problem" });
  }
};

export const markPaymentSuccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentId } = req.body;

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    problem.paymentStatus = "completed";
    problem.paymentId = paymentId || problem.paymentId;
    problem.paymentDate = new Date();
    await problem.save();

    if (req.io) {
      const eventData = {
        message: "Payment completed successfully",
        problemId: id,
        problem,
      };

      const rooms = new Set();
      const assignedToId = problem.assignedTo?.toString?.() || String(problem.assignedTo || "");
      const createdById = problem.createdBy?.toString?.() || String(problem.createdBy || "");

      if (assignedToId) rooms.add(`worker-${assignedToId}`);
      if (createdById) rooms.add(`user-${createdById}`);

      try {
        const worker = assignedToId ? await Worker.findById(assignedToId).select("email") : null;
        if (worker?.email) rooms.add(`worker-email-${worker.email}`);
      } catch (error) {
        console.warn("Failed to resolve worker email for payment event:", error.message);
      }

      try {
        const user = createdById ? await User.findById(createdById).select("email") : null;
        if (user?.email) rooms.add(`user-email-${user.email}`);
      } catch (error) {
        console.warn("Failed to resolve user email for payment event:", error.message);
      }

      rooms.forEach((room) => {
        req.io.to(room).emit("payment-updated", eventData);
      });
    }

    return res.json({ message: "Payment marked as completed", problem });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update payment status" });
  }
};

export const createPaymentOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    const amountInRupees = parseAmount(problem.amount);
    if (!amountInRupees || amountInRupees <= 0) {
      return res.status(400).json({ message: "Payment amount is missing" });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim() || "rzp_test_5g6TNuZJqA8y4T";
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    console.log("🔐 Razorpay Credentials Check:");
    console.log(
      "  Key ID present:",
      !!process.env.RAZORPAY_KEY_ID,
      `(length: ${process.env.RAZORPAY_KEY_ID?.length})`,
    );
    console.log(
      "  Key Secret present:",
      !!razorpayKeySecret,
      `(length: ${razorpayKeySecret?.length})`,
    );

    if (!process.env.RAZORPAY_KEY_ID || !razorpayKeySecret) {
      console.log("⚠️  Using Razorpay Test API in client-side capture mode (credentials missing or incomplete)");
      const mockOrderId = `order_mock_${Date.now()}`;
      return res.json({
        orderId: mockOrderId,
        amount: amountInRupees,
        currency: "INR",
        keyId: razorpayKeyId,
        isMockMode: true,
        problem,
      });
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    console.log(
      "💳 Creating Razorpay order with amount:",
      Math.round(amountInRupees * 100),
      "paise",
    );

    try {
      const orderData = await razorpay.orders.create({
        amount: Math.round(amountInRupees * 100),
        currency: "INR",
        receipt: `problem_${problem._id}`,
        notes: {
          problemId: String(problem._id),
          title: problem.title,
        },
      });

      console.log("✅ Order created successfully:", orderData.id);

      return res.json({
        orderId: orderData.id,
        amount: amountInRupees,
        currency: orderData.currency || "INR",
        keyId: razorpayKeyId,
        problem,
      });
    } catch (razorpayError) {
      console.warn("⚠️  Razorpay failed, falling back to MOCK mode");
      console.warn(
        "  Error:",
        razorpayError?.error?.description || razorpayError?.message,
      );

      // Fallback to mock mode if Razorpay auth fails
      const mockOrderId = `order_mock_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      return res.json({
        orderId: mockOrderId,
        amount: amountInRupees,
        currency: "INR",
        keyId: "pk_test_mock",
        isMockMode: true,
        problem,
      });
    }
  } catch (error) {
    console.error("❌ Failed to create payment order:");
    console.error("  Error:", error?.message);

    return res.status(500).json({
      message: error?.message || "Failed to create payment order",
    });
  }
};

export const getPaymentConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    const amountInRupees = parseAmount(problem.amount);
    if (!amountInRupees || amountInRupees <= 0) {
      return res.status(400).json({ message: "Payment amount is missing" });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim() || "rzp_test_5g6TNuZJqA8y4T";

    return res.json({
      keyId: razorpayKeyId,
      amount: amountInRupees,
      currency: "INR",
      problem,
    });
  } catch (error) {
    console.error("Failed to get payment config:", error);
    return res.status(500).json({ message: "Failed to get payment config" });
  }
};

export const rejectProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { workerId } = req.body;

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    const isSameWorker = problem.assignedTo?.toString() === workerId;

    // If the worker is rejecting a requested or assigned job, return it to the open pool.
    // Clear stale completion state so reject cannot fall back into the OTP flow.
    if (
      isSameWorker &&
      (problem.status === "requested" || problem.status === "assigned")
    ) {
      problem.status = "open";
      problem.assignedTo = null;
      problem.requestedAt = null;
      problem.assignedAt = null;
      problem.otp = null;
      problem.paymentMethod = null;
      problem.paymentStatus = "pending";
      problem.paymentId = null;
      problem.paymentDate = null;
      await problem.save();

      // Notify the customer that the worker rejected
      if (req.io) {
        const createdById = problem.createdBy?.toString();
        const createdByUser = createdById
          ? await User.findById(createdById).select("email")
          : null;

        const userRooms = new Set();
        if (createdById) userRooms.add(`user-${createdById}`);
        if (createdByUser?.email)
          userRooms.add(`user-email-${createdByUser.email}`);

        userRooms.forEach((room) => {
          req.io.to(room).emit("request-rejected", {
            problem,
            message:
              "The worker rejected your request. Please select another worker.",
          });
        });
      }

      return res.json({
        message: "Job rejected and returned to open pool",
        problem,
      });
    }

    // If it's an open job and a worker rejects from the available list, no status change required
    if (problem.status === "open") {
      return res.json({ message: "Job rejected by worker", problem });
    }

    return res
      .status(400)
      .json({ message: "Job cannot be rejected in current state" });
  } catch (error) {
    console.error("Failed to reject problem", error);
    res.status(500).json({ message: "Failed to reject problem" });
  }
};

const SKILL_ALIASES = {
  Plumber: ["plumber", "plumbing", "pipe", "leak", "tap", "drain", "water line", "toilet", "faucet", "ac", "air conditioner", "air conditioning", "hvac", "cooling", "not cooling", "ac repair", "ac service", "ac not working"],
  Electrician: ["electrician", "electrical", "wiring", "wire", "switch", "socket", "power", "voltage"],
  Cleaner: ["cleaner", "cleaning", "maid", "housekeeping", "sanitize", "wash", "deep clean"],
  Painter: ["painter", "painting", "paint", "wall paint", "color", "colour"],
  Carpenter: ["carpenter", "carpentry", "woodwork", "wood", "furniture", "door repair", "table repair"],
  Welder: ["welder", "welding", "metal work", "gate repair", "grill repair", "iron work", "steel work"],
  Mechanic: ["mechanic", "car repair", "bike repair", "vehicle repair", "engine", "car not starting", "not starting", "breakdown", "puncture"],
  Driver: ["driver", "driving", "chauffeur", "pickup", "drop", "transport", "ride"],
};

const escapeRegExp = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

export const verifyProblem = async (req, res) => {
  try {
    const { description, title } = req.body;
    if (!description || !description.trim()) {
      return res.status(400).json({
        isValid: false,
        message: "Problem description is required.",
        reason: "Description is empty"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let verification = null;
    let usingFallback = false;

    if (apiKey) {
      try {
        const prompt = `You are a home service request validator. Your task is to analyze a user's description of a home service problem and determine if it is a valid, genuine home service problem (e.g. plumbing, electrical, cleaning, painting, carpentry, welding, vehicle repair, or driver service).
If it is a valid home service problem, extract its structured details.
If it is vague, unrelated to home services (e.g. general chat, homework, code, business queries), or spam, mark it as invalid and provide a clear reason.

The allowed worker types (recommendedWorkerTypes) are: ["Plumber", "Electrician", "Cleaner", "Painter", "Carpenter", "Welder", "Mechanic", "Driver"].

Return a JSON object matching this schema exactly:
{
  "isValidProblem": boolean,
  "problemType": string (specific type, e.g. "Pipe Leak", "AC Repair", "Deep Cleaning", "Fan Installation"),
  "severity": "Low" | "Medium" | "High",
  "urgency": "Can Wait" | "Normal" | "Urgent",
  "estimatedCost": string (e.g. "$30-$80", "$100-$250"),
  "skillsRequired": string[] (skills/specialties needed, e.g. ["Plumbing", "AC Repair", "Carpentry"]),
  "keyIssues": string[] (bullet points of what is wrong),
  "recommendedWorkerTypes": string[] (must be subset of the allowed worker types above, e.g. ["Plumber"]),
  "confidence": number (confidence score between 0.0 and 1.0),
  "reason": string (explain why it is invalid if isValidProblem is false, or empty string if valid)
}

Analyze this description: "${description}"`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            let cleanText = responseText.trim();
            if (cleanText.startsWith("```json")) {
              cleanText = cleanText.substring(7);
            } else if (cleanText.startsWith("```")) {
              cleanText = cleanText.substring(3);
            }
            if (cleanText.endsWith("```")) {
              cleanText = cleanText.substring(0, cleanText.length - 3);
            }
            verification = JSON.parse(cleanText.trim());
          }
        } else {
          console.warn(`Gemini API returned status ${response.status}. Falling back to keyword matching.`);
        }
      } catch (geminiError) {
        console.error("Gemini API call or parsing failed:", geminiError);
      }
    } else {
      console.warn("GEMINI_API_KEY is not defined. Using local fallback.");
    }

    // Fallback if Gemini key is missing, call failed, or parse failed
    if (!verification) {
      usingFallback = true;
      const fallbackSkill = detectSkillLocally(description);
      verification = {
        isValidProblem: !!fallbackSkill,
        problemType: fallbackSkill ? `${fallbackSkill} Issue` : "General Repair",
        severity: "Medium",
        urgency: "Normal",
        estimatedCost: "$50-$120",
        skillsRequired: fallbackSkill ? [fallbackSkill] : [],
        keyIssues: ["Issue processed using local keyword matching fallback"],
        recommendedWorkerTypes: fallbackSkill ? [fallbackSkill] : [],
        confidence: 0.7,
        reason: fallbackSkill ? "" : "Description is too vague or could not be matched to any supported home services."
      };
    }

    if (!verification.isValidProblem) {
      return res.status(400).json({
        isValid: false,
        message: "Problem verification failed",
        reason: verification.reason || "The problem does not appear to be a valid home service request.",
        verification
      });
    }

    // Find online workers
    let workers = await Worker.find({ isOnline: true }).select("-password");
    if (workers.length === 0) {
      console.log("No online workers found, querying all workers for easier testing/development");
      workers = await Worker.find({}).select("-password");
    }

    // Calculate matchScore for each worker
    const scoredWorkers = workers.map(worker => {
      let score = 0;
      const reasons = [];

      // Worker type match (+30 points)
      const recWorkerTypes = verification.recommendedWorkerTypes || [];
      const isTypeMatch = recWorkerTypes.some(type =>
        worker.typeOfWork && worker.typeOfWork.toLowerCase() === type.toLowerCase()
      );
      if (isTypeMatch) {
        score += 30;
        reasons.push("Recommended worker type match (+30)");
      }

      // Matching skills (+25 points each skill)
      const skillsReq = verification.skillsRequired || [];
      let skillsMatchedCount = 0;
      skillsReq.forEach(skill => {
        const hasSkill = (worker.skills && worker.skills.some(s => s.toLowerCase() === skill.toLowerCase())) ||
                         (worker.typeOfWork && worker.typeOfWork.toLowerCase() === skill.toLowerCase());
        if (hasSkill) {
          score += 25;
          skillsMatchedCount++;
        }
      });
      if (skillsMatchedCount > 0) {
        reasons.push(`Matched ${skillsMatchedCount} required skill(s) (+${skillsMatchedCount * 25})`);
      }

      // Experience (+5 points per year)
      const exp = worker.yearsOfExperience || 0;
      if (exp > 0) {
        score += exp * 5;
        reasons.push(`${exp} years of experience (+${exp * 5})`);
      }

      // Rating (+5 points per star, default is 4.5)
      const rating = worker.rating || 4.5;
      score += rating * 5;
      reasons.push(`Rating of ${rating} stars (+${Math.round(rating * 5)})`);

      const workerObj = worker.toObject();
      workerObj.rating = rating;
      workerObj.matchScore = score;
      workerObj.scoreReason = reasons.join(", ");

      return workerObj;
    });

    // Sort by matchScore descending and slice top 10
    const suggestedWorkers = scoredWorkers
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);

    return res.status(200).json({
      isValid: true,
      message: "Problem verified successfully",
      verification,
      suggestedWorkers,
      usingFallback
    });

  } catch (error) {
    console.error("Error in verifyProblem controller:", error);
    return res.status(500).json({
      isValid: false,
      message: "An internal error occurred during verification",
      reason: error.message
    });
  }
};
