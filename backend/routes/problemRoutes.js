import express from "express";
import {
  createProblem,
  getOpenProblems,
  requestWorker,
  acceptProblem,
  bookProblem,
  startProblem,
  completeProblem,
  getUserProblems,
  getWorkerProblems,
  getProblem,
  rejectProblem,
  markPaymentSuccess,
  createPaymentOrder,
  getPaymentConfig,
  verifyProblem,
} from "../controllers/problemController.js";

const router = express.Router();

router.post("/verify", verifyProblem);
router.post("/create", createProblem);
router.get("/open", getOpenProblems);
router.put("/:id/request", requestWorker);
router.put("/:id/accept", acceptProblem);
router.put("/:id/book", bookProblem);
router.put("/:id/start", startProblem);
router.put("/:id/complete", completeProblem);
router.put("/:id/reject", rejectProblem);
router.put("/:id/payment-success", markPaymentSuccess);
router.post("/:id/payment-order", createPaymentOrder);
router.get("/:id/payment-config", getPaymentConfig);
router.get("/user/:userId", getUserProblems);
router.get("/worker/:workerId", getWorkerProblems);
router.get("/:id", getProblem);

export default router;
