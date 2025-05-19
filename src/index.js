import express from "express";
import dotenv from "dotenv";
import reportRoute from "./routes/report.route.js";
import scheduleRoute from "./routes/schedule.route.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());

app.use("/report", reportRoute);

app.use("/schedule", scheduleRoute);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
