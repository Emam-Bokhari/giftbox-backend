import { initSchedulerQueue } from "../app/modules/lottery/lottery.scheduler";
import "./email/email.worker";
import "./notification/notification.worker";
import "./scheduler/scheduler.worker";


initSchedulerQueue().catch((err) => {
  console.error("❌ Failed to init scheduler queue:", err);
});