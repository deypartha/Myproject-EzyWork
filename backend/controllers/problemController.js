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
      status: 'open'
    });

    await problem.save();

    // SOCKET.IO: Emit event to workers of this category
    // We assume req.io is attached in server.js
    if (req.io) {
      req.io.to(category).emit('new-problem', problem);
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
    const filter = { status: 'open' };
    if (category) filter.category = category;

    const problems = await Problem.find(filter).sort({ createdAt: -1 });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch problems" });
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

    if (problem.status !== 'open') {
      return res.status(400).json({ message: "Problem already assigned or closed" });
    }

    problem.status = 'assigned';
    problem.assignedTo = workerId;
    await problem.save();

    // Notify any listeners (e.g., the User who posted it) - optional for now
    // if (req.io) req.io.emit(`problem-update-${id}`, problem);

    res.json({ message: "Problem accepted", problem });
  } catch (error) {
    res.status(500).json({ message: "Failed to accept problem" });
  }
};
