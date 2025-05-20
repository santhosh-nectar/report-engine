import dotenv from "dotenv";
import fs from "fs";
import axios from "axios";
import { getAuthHeaders } from "../services/auth/auth.service.js";
import { AMERICANA_ENPOINTS } from "../services/endpoints/americnana-endpoints.js";

dotenv.config();

export async function sendReportEmail(to, attachmentPath) {
  try {
    const headers = await getAuthHeaders();
    const fileBuffer = fs.readFileSync(attachmentPath);
    const base64File = fileBuffer.toString("base64");

    const payload = {
      toAddresses: to,
      ccAddresses: null,
      bccAddresses: null,
      content: `<div style="padding:20px;"><h1 style="color:#6c5dd3">Your Energy Report is Ready</h1><p>Please find the attached Excel report.</p></div>`,
      subject: "Scheduled Energy Consumption Report",
      to: to.split("@")[0],
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

    const response = await axios.post(AMERICANA_ENPOINTS.EMAIL_API, payload, {
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });

    console.log("Email API Response:", response.status);
  } catch (err) {
    console.error("Failed to send email via API:", err.message);
    throw err;
  }
}
