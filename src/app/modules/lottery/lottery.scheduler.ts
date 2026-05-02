import { schedulerQueue } from "../../../queues";

export const initSchedulerQueue = async () => {
  // Remove all existing repeatable jobs first (cleanup stale ones)
  const repeatableJobs = await schedulerQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await schedulerQueue.removeRepeatableByKey(job.key);
    console.log(`Removed stale repeatable job: ${job.key}`);
  }

  // Add fresh repeatable job with proper pattern
  await schedulerQueue.add(
    "process-lottery",
    { now: new Date() },
    {
      repeat: { pattern: "* * * * *" }, // every minute
      jobId: "lottery-scheduler",        // unique ID to prevent duplicates
    }
  );

  console.log("Lottery repeatable job registered");
};