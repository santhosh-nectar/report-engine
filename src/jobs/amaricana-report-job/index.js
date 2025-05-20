import cron from "node-cron";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { sendReportEmail } from "../../utils/email.js";
import { DateTime } from "luxon";
import { processData } from "./processData.js";
import { generateCharts } from "./generate-charts.js";
import { createExcelReport } from "./generate-excel.js";

export const jobStore = new Map();

export function scheduleReportJob({
  cronTime,
  email,
  timeZone,
  userLocalTime,
  days, // optional, for metadata only
}) {
  const jobId = uuidv4();

  // Parse cronTime fields (minute, hour, dayOfWeek)
  const [minute, hour, , , dayOfWeek] = cronTime.split(" ");

  const now = DateTime.utc();
  let nextRun = DateTime.utc().set({
    hour: parseInt(hour),
    minute: parseInt(minute),
    second: 0,
    millisecond: 0,
  });

  if (nextRun <= now) {
    nextRun = nextRun.plus({ days: 1 });
  }

  const adjustedCronTime = cronTime;

  console.log(`Scheduling job:
    - Local time: ${userLocalTime} (${timeZone})
    - Cron expression: ${adjustedCronTime}
    - Next run at: ${nextRun.toISO()}`);

  const job = cron.schedule(
    adjustedCronTime,
    async () => {
      console.log(
        `Executing job ${jobId} for ${email} at ${new Date().toISOString()}`
      );
      try {
        const processedData = await processData();
        const chartPaths = await generateCharts(processedData);
        const excelBuffer = await createExcelReport(processedData, chartPaths);

        const filename = `report-${jobId}-${Date.now()}.xlsx`;
        const filePath = path.join("output", filename);
        fs.mkdirSync("output", { recursive: true });
        fs.writeFileSync(filePath, excelBuffer);

        console.log(`Report generated: ${filePath}`);
        await sendReportEmail(email, filePath);
        console.log(`Email sent to ${email}`);
      } catch (error) {
        console.error(`Job ${jobId} failed:`, error.message);
      }
    },
    {
      scheduled: true,
      timezone: "UTC",
    }
  );

  jobStore.set(jobId, {
    job,
    email,
    timeZone,
    userLocalTime,
    days: dayOfWeek,
    nextRun: nextRun.toISO(),
    cronTime: adjustedCronTime,
  });

  return jobId;
}

// List all scheduled jobs
export function listScheduledJobs() {
  return Array.from(jobStore.entries()).map(([id, jobData]) => ({
    id,
    ...jobData,
    running: jobData.job.task.isRunning(),
  }));
}

// Cancel a job
export function cancelJob(jobId) {
  const jobData = jobStore.get(jobId);
  if (jobData) {
    jobData.job.stop();
    jobStore.delete(jobId);
    return true;
  }
  return false;
}
