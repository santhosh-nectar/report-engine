import express from "express";
import { scheduleReportJob } from "../jobs/jobManager.js";

const router = express.Router();

router.post("/", (req, res) => {
  const { email, time } = req.body;

  if (!email || !time) {
    return res.status(400).json({ error: "Both email and time are required." });
  }

  const [hour, minute] = time.split(":");
  if (!hour || !minute || isNaN(hour) || isNaN(minute)) {
    return res.status(400).json({ error: "Time format should be HH:mm" });
  }

  const cronTime = `${minute} ${hour} * * *`; // Daily at given time

  const jobId = scheduleReportJob({ cronTime, email });

  res.json({
    message: `Report scheduled daily at ${time} for ${email}`,
    jobId,
  });
});

export default router;
