import Problem from "../models/Problem.js";
import Worker from "../models/Worker.js";

export const createProblem = async (req, res) => {
  try {
    const { title, description, category, location, createdBy } = req.body;

    const problem = new Problem({
      title,
      description,
      category,
      location,
      createdBy,
      status: "open",
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

    if (
      problem.status !== "requested" ||
      problem.assignedTo.toString() !== workerId
    ) {
      return res.status(400).json({
        message: "Problem not requested by this worker or already processed",
      });
    }

    problem.status = "assigned";
    problem.assignedAt = new Date();
    await problem.save();

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
    const { otp, paymentMethod } = req.body;

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    if (problem.status !== "assigned") {
      return res.status(400).json({ message: "Problem not assigned yet" });
    }

    problem.otp = otp;
    problem.paymentMethod = paymentMethod;
    problem.status = "in_progress";
    await problem.save();

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
    problem.completedAt = new Date();
    await problem.save();

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

export const rejectProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { workerId } = req.body;

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    // If the worker is rejecting a requested job, we revert it to open and clear assignment
    if (
      problem.status === "requested" &&
      problem.assignedTo?.toString() === workerId
    ) {
      problem.status = "open";
      problem.assignedTo = null;
      problem.requestedAt = null;
      await problem.save();

      // Notify the customer that the worker rejected
      if (req.io) {
        req.io.to(`user-${problem.createdBy}`).emit("request-rejected", {
          problem,
          message:
            "The worker rejected your request. You can request another worker.",
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
