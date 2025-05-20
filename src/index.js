import express from "express";
import dotenv from "dotenv";
import reportRoute from "./routes/report.route.js";
import scheduleRoute from "./routes/schedule.route.js";
import { sequelize } from "./db/db.js";
import { retriggerAllScheduledJobs } from "./utils/util.retriggerScheduledJobs.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());

app.use("/report", reportRoute);

app.use("/schedule", scheduleRoute);

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected successfully");
  } catch (error) {
    console.error("❌ Unable to connect to DB:", error.message);
  }
})();

async function syncDb() {
  await sequelize.sync({ alter: true });
  console.log("Database synced");
  await retriggerAllScheduledJobs();
}

syncDb();

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
