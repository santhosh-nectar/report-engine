import { scheduleReportJob } from "../jobs/amaricana-report-job/index.js";
import ScheduledJob from "../models/amaricana-schedules.js";

export async function retriggerAllScheduledJobs() {
  try {
    const jobs = await ScheduledJob.findAll();
    console.log(`🔄 Found ${jobs.length} scheduled jobs in DB`);

    for (const job of jobs) {
      scheduleReportJob({
        cronTime: job.cron_expression,
        emails: job.email_addresses,
        timeZone: job.time_zone,
        userLocalTime: job.user_local_time,
        // days: job.days,
        period: job.period,
        domain: job.domain,
        groupBy: job.group_by,
        type: job.type,
      });
    }

    console.log(`✅ Re-triggered ${jobs.length} scheduled jobs from DB`);
  } catch (err) {
    console.error("❌ Failed to re-trigger jobs from DB:", err);
  }
}
