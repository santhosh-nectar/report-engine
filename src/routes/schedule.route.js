import express from "express";
import {
  getExcelReport,
  schedueleJob,
} from "../controllers/americana-controller.js";

const router = express.Router();

router.post("/", schedueleJob);
router.get("/download", getExcelReport);

export default router;
