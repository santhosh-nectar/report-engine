import { Sequelize } from "sequelize";
import { config } from "../constants/config.js";

export const sequelize = new Sequelize(
  config.DB_NAME,
  "appuser",
  config.PASSWORD,
  {
    host: config.HOST,
    dialect: "postgres",
    port: 5432,
    logging: false,
  }
);
