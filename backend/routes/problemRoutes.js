import express from "express";
import { createProblem, getOpenProblems, requestWorker, acceptProblem, bookProblem, startProblem, completeProblem, getUserProblems, getWorkerProblems, getProblem, rejectProblem } from "../controllers/problemController.js";

const router = express.Router();

router.post("/create", createProblem);
router.get("/open", getOpenProblems);
router.put("/:id/request", requestWorker);
router.put("/:id/accept", acceptProblem);
router.put("/:id/book", bookProblem);
router.put("/:id/start", startProblem);
router.put("/:id/complete", completeProblem);
router.put("/:id/reject", rejectProblem);
router.get("/user/:userId", getUserProblems);
router.get("/worker/:workerId", getWorkerProblems);
router.get("/:id", getProblem);

export default router;
