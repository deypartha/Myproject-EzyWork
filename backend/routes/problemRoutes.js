import express from "express";
import { createProblem, getOpenProblems, acceptProblem } from "../controllers/problemController.js";

const router = express.Router();

router.post("/create", createProblem);
router.get("/open", getOpenProblems);
router.put("/:id/accept", acceptProblem);

export default router;
