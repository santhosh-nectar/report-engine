import cron from "node-cron";
import { v4 as uuidv4 } from "uuid";
import { sendReportEmail } from "../../utils/email.js";
import { DateTime } from "luxon";
import { processData } from "./processData.js";
import { generateCharts } from "./generate-charts.js";
import { createExcelReport } from "./generate-excel.js";

export const jobStore = new Map();

export function scheduleReportJob({
  cronTime,
  emails,
  timeZone,
  userLocalTime,
  period,
  domain,
  groupBy,
  type,
}) {
  const jobId = uuidv4();

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

  console.log(`Scheduling job:
    - Local time: ${userLocalTime} (${timeZone})
    - Cron expression: ${cronTime}
    - Next run at: ${nextRun.toISO()}`);

  // ✅ This closure must capture all required parameters
  const job = cron.schedule(
    cronTime,
    async () => {
      console.log(
        `Executing job ${jobId} to ${emails.join(", ")} at ${new Date().toISOString()}`
      );
      try {
        // ✅ These must be captured from the outer scope
        const processedData = await processData(period, domain, groupBy, type);
        const chartPaths = await generateCharts(processedData);
        const excelBuffer = await createExcelReport(processedData, chartPaths);

        console.log(`Report generated...`);
        await sendReportEmail(emails, excelBuffer);
        console.log(`Email sent to ${emails.join(", ")}`);
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
    emails,
    timeZone,
    userLocalTime,
    days: dayOfWeek,
    nextRun: nextRun.toISO(),
    cronTime,
  });

  return jobId;
}
