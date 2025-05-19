import express from "express";
import { generateFullExcelReport } from "../services/report.generator.js";
import { fetchMergedEnergyData } from "../services/report.service.js";

const router = express.Router();

// POST /report
router.post("/", async (req, res) => {
  try {
    // if (!filterPayload || Object.keys(filterPayload).length === 0) {
    //   return res
    //     .status(400)
    //     .json({ error: "Missing filter payload in request body" });
    // }

    // 1. Fetch and merge data from APIs
    console.log("Fetching merged energy data...");

    const mergedData = await fetchMergedEnergyData();
    // 2. Generate Excel buffer from the data
    const buffer = await generateFullExcelReport(mergedData);

    // 3. Send the Excel file as a response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="energy-report.xlsx"'
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;
