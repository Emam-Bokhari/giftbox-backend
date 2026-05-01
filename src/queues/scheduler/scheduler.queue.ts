import { connection, defaultJobOptions } from "./../../config/bull";
import { Queue } from "bullmq";

export const schedulerQueue = new Queue("schedulerQueue", {
  connection,
  defaultJobOptions,
});
