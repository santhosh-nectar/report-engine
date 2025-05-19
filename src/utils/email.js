import { Resend } from "resend";
import dotenv from "dotenv";
import fs from "fs";
import axios from "axios";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReportEmail(to, attachmentPath) {
  try {
    const fileBuffer = fs.readFileSync(attachmentPath);
    const base64File = fileBuffer.toString("base64");

    const payload = {
      toAddresses: to,
      ccAddresses: null,
      bccAddresses: null,
      content: `<div style="padding:20px;"><h1 style="color:#6c5dd3">Your Energy Report is Ready</h1><p>Please find the attached Excel report.</p></div>`,
      subject: "Scheduled Energy Consumption Report",
      to: to.split("@")[0], // or some user-friendly name if available
      emailTemplate: "BasicNotification.vm",
      url: null,
      userName: null,
      domain: null,
      profile: null,
      attachFile: base64File,
      attachFiles: null,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      attachFileName: "EnergyReport.xlsx",
      model: null,
    };

    const response = await axios.post(
      "https://assets.nectarit.com:8280/notification/1.0.0/notification/email",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer 37164b0e-036b-3c58-9392-8a72030bb30e`,
        },
      }
    );

    console.log("Email API Response:", response.status);
  } catch (err) {
    console.error("Failed to send email via API:", err.message);
    throw err;
  }
}
