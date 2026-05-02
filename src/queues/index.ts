import { initSchedulerQueue } from "../app/modules/lottery/lottery.scheduler";
import "./email/email.worker";
import "./notification/notification.worker";
import "./scheduler/scheduler.worker";

// workers
export { emailWorker } from "./email/email.worker";
export { notificationWorker } from "./notification/notification.worker";
export { schedulerWorker } from "./scheduler/scheduler.worker";

// queues
export { emailQueue } from "./email/email.queue";
export { notificationQueue } from "./notification/notification.queue";
export { schedulerQueue } from "./scheduler/scheduler.queue";


initSchedulerQueue().catch((err) => {
  console.error("❌ Failed to init scheduler queue:", err);
});