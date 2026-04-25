import cron from "node-cron";
import { Lottery } from "./lottery.model";
import { LOTTERY_STATUS } from "./lottery.constant";

// run per minute
export const startLotteryScheduler = () => {
  console.log("🟢 Lottery Scheduler Started...");

  cron.schedule("* * * * *", async () => {
    const now = new Date();

    console.log(`\n⏱️ Cron Tick: ${now.toISOString()}`);

    try {
      // -------------------------------
      // 🎯 Activate Scheduled Lottery
      // -------------------------------
      const scheduledLotteries = await Lottery.find({
        status: LOTTERY_STATUS.SCHEDULED,
        startAt: { $lte: now },
      });

      console.log(
        `📌 Scheduled Lotteries Ready: ${scheduledLotteries.length}`
      );

      for (const lottery of scheduledLotteries) {
        const activeExists = await Lottery.exists({
          status: LOTTERY_STATUS.ACTIVE,
        });

        if (activeExists) {
          console.log(
            `⚠️ Skipped Activation (Active exists) → Lottery ID: ${lottery._id}`
          );
          continue;
        }

        lottery.status = LOTTERY_STATUS.ACTIVE;
        await lottery.save();

        console.log(
          `✅ Activated Lottery → ID: ${lottery._id}, Title: ${lottery.title}`
        );
      }

      // -------------------------------
      // 🛑 End Active Lottery
      // -------------------------------
      const activeLotteries = await Lottery.find({
        status: LOTTERY_STATUS.ACTIVE,
        endAt: { $lte: now },
      });

      console.log(`📌 Active Lotteries to End: ${activeLotteries.length}`);

      for (const lottery of activeLotteries) {
        lottery.status = LOTTERY_STATUS.ENDED;
        await lottery.save();

        console.log(
          `🔴 Ended Lottery → ID: ${lottery._id}, Title: ${lottery.title}`
        );
      }

      console.log("✅ Cron cycle completed");
    } catch (error) {
      console.error("❌ Lottery Scheduler Error:", error);
    }
  });
};