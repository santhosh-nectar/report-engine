import { DataTypes } from "sequelize";
import { sequelize } from "../db/db.js";

const ScheduledJob = sequelize.define(
  "ScheduledJob",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email_addresses: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
    },
    cron_expression: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    time_zone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_local_time: {
      type: DataTypes.STRING,
    },
    period: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    days: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    domain: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    group_by: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "scheduled_jobs",
    timestamps: true,
  }
);

export default ScheduledJob;
