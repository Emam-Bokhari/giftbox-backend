import cron from "node-cron";
import { Lottery } from "./lottery.model";
import { LOTTERY_STATUS } from "./lottery.constant";

// run per minute
export const startLotteryScheduler = () => {
    cron.schedule("* * * * *", async () => {
        try {
            const now = new Date();

            // activate Scheduled Lottery

            const scheduledLotteries = await Lottery.find({
                status: LOTTERY_STATUS.SCHEDULED,
                startAt: { $lte: now },
            });

            for (const lottery of scheduledLotteries) {
                // ensure only ONE active
                const activeExists = await Lottery.exists({ status: LOTTERY_STATUS.ACTIVE });

                if (activeExists) {
                    // skip (or you can log)
                    continue;
                }

                lottery.status = LOTTERY_STATUS.ACTIVE;
                await lottery.save();
            }


            // end Active Lottery

            const activeLotteries = await Lottery.find({
                status: LOTTERY_STATUS.ACTIVE,
                endAt: { $lte: now },
            });

            for (const lottery of activeLotteries) {
                lottery.status = LOTTERY_STATUS.ENDED;
                await lottery.save();
            }

        } catch (error) {
            console.error("Lottery Scheduler Error:", error);
        }
    });
};