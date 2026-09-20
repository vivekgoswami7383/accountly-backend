import express from "express";
import cors from "cors";
import morgan from "morgan";
import passport from "passport";

import { env } from "./src/config/env.config.js";
import { logger } from "./src/config/logger.config.js";
import { databaseConnection } from "./src/config/database.config.js";
import mongoose from "mongoose";
import { runMigrations } from "./src/migrations/index.js";
import { STATUS_CODES } from "./src/helpers/constants.js";
import { startNotificationScheduler } from "./src/helpers/due-notifications.js";

import "./src/config/load.models.js";
import "./src/utils/passport.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(passport.initialize());
app.use(express.urlencoded({ extended: true }));

import routes from "./src/routers/index.routes.js";

app.use("/api", routes);

app.get("/health", (req, res) => {
  res.status(STATUS_CODES.SUCCESS).send("Server is running");
});

databaseConnection()
  .then(() => Promise.all(Object.values(mongoose.models).map((model) => model.init())))
  .then(() =>
    runMigrations(mongoose.connection.db, (message) => logger.info(message))
  )
  .then(() => {
    app.listen(env.PORT, "0.0.0.0", () => {
      logger.info(`Server is running on port ${env.PORT}`);
      logger.info(`Server accessible at http://0.0.0.0:${env.PORT}`);
      logger.info(`✅ Connected to mongodb`);
      startNotificationScheduler();
    });
  })
  .catch((error) => {
    logger.error(`Startup failed: ${error.message}`);
    process.exit(1);
  });
