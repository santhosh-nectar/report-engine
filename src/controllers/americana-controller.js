import {
  scheduleReportJob,
  jobStore,
} from "../jobs/amaricana-report-job/index.js";
import { DateTime } from "luxon";
import ScheduledJob from "../models/amaricana-schedules.js";
import { processData } from "../jobs/amaricana-report-job/processData.js";
import { generateCharts } from "../jobs/amaricana-report-job/generate-charts.js";
import { createExcelReport } from "../jobs/amaricana-report-job/generate-excel.js";

export async function schedueleJob(req, res) {
  const {
    emails,
    time,
    timeZone = "UTC",
    days = "daily",
    period,
    domain,
    groupBy,
    type,
  } = req.body;

  // Validate required fields
  if (!period || !domain || !groupBy || !type) {
    return res.status(400).json({
      error: "Missing required parameters: period, domain, groupBy, type",
    });
  }

  if (!Array.isArray(emails) || !time) {
    return res.status(400).json({ error: "Both email and time are required." });
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timeRegex.test(time)) {
    return res.status(400).json({
      error: "Invalid time format. Please use HH:mm (24-hour format)",
    });
  }

  // Validate days input
  // Accept either "daily", "weekdays", or array of strings ["Mon", "Tue", ...]
  let dayOfWeekField = "*";

  if (typeof days === "string") {
    if (days.toLowerCase() === "daily") {
      dayOfWeekField = "*";
    } else if (days.toLowerCase() === "weekdays") {
      dayOfWeekField = "1-5";
    } else {
      return res.status(400).json({
        error:
          'Invalid "days" value. Use "daily", "weekdays", or an array of weekdays like ["Mon", "Wed"].',
      });
    }
  } else if (Array.isArray(days)) {
    // Map weekdays to cron numeric values (Sunday=0)
    const dayMap = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };

    const cronDays = days
      .map((d) => dayMap[d.toLowerCase()])
      .filter((d) => d !== undefined)
      .join(",");

    if (!cronDays) {
      return res.status(400).json({
        error: 'Invalid "days" array. Use days like ["Mon", "Wed", "Fri"].',
      });
    }
    dayOfWeekField = cronDays;
  } else {
    return res.status(400).json({
      error: 'Invalid "days" field. Must be string or array.',
    });
  }

  try {
    const [hour, minute] = time.split(":").map(Number);
    const userTime = DateTime.now()
      .setZone(timeZone)
      .set({ hour, minute, second: 0, millisecond: 0 });

    const utcTime = userTime.toUTC();

    // cron: minute hour dayOfMonth month dayOfWeek
    const cronTime = `${utcTime.minute} ${utcTime.hour} * * ${dayOfWeekField}`;

    const jobId = scheduleReportJob({
      cronTime,
      emails,
      timeZone,
      userLocalTime: time,
      //   days: dayOfWeekField,
      period,
      domain,
      groupBy,
      type,
    });

    // Save the job to the database
    await ScheduledJob.create({
      email_addresses: emails,
      cron_expression: cronTime,
      time_zone: timeZone,
      user_local_time: time,
      period,
      domain,
      group_by: groupBy,
      type: type,
      days: dayOfWeekField,
    });

    res.json({
      success: true,
      message: `Report scheduled at ${time} (${timeZone}) on days: ${days}`,
      jobId,
      utcCronTime: cronTime,
      utcTime: utcTime.toFormat("HH:mm"),
      nextRun: jobStore.get(jobId).nextRun,
    });
  } catch (error) {
    console.error("Error scheduling report job:", error);
    res.status(500).json({
      error: "Failed to schedule report job",
      details: error.message,
    });
  }
}

export async function getExcelReport(req, res) {
  //   const { period, domain, groupBy, type } = req.body;
  const period = "DAILY";
  const domain = "americana";
  const groupBy = "meter";
  const type = "LVPMeter";

  // Validate required fields
  if (!period || !domain || !groupBy || !type) {
    return res.status(400).json({
      error: "Missing required parameters: period domain, groupBy, type",
    });
  }

  try {
    const processedData = await processData(period, domain, groupBy, type);
    const chartPaths = await generateCharts(processedData);
    const excelBuffer = await createExcelReport(processedData, chartPaths);

    res.setHeader("Content-Disposition", "attachment; filename=report.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error generating Excel report:", error);
    res.status(500).json({
      error: "Failed to generate Excel report",
      details: error.message,
    });
  }
}
