import cron from "node-cron";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { sendReportEmail } from "../utils/email.js";
import { generateFullExcelReport } from "../services/report.generator.js";
import { fetchMergedEnergyData } from "../services/report.service.js";

const jobStore = new Map();

export function scheduleReportJob({ cronTime, email }) {
  const jobId = uuidv4();

  const job = cron.schedule(cronTime, async () => {
    console.log(`Running job for ${email} at ${new Date().toISOString()}`);

    try {
      const mergedData = await fetchMergedEnergyData();

      const buffer = await generateFullExcelReport(
        mergedData.report1,
        mergedData.report2,
        mergedData.report3
      );

      const filename = `report-${jobId}-${Date.now()}.xlsx`;
      const filePath = path.join("output", filename);
      fs.mkdirSync("output", { recursive: true });
      fs.writeFileSync(filePath, buffer);
      console.log(`Report saved: ${filePath}`);

      await sendReportEmail(email, filePath);
    } catch (error) {
      console.error("Error during scheduled job execution:", error.message);
    }
  });

  jobStore.set(jobId, job);
  return jobId;
}
