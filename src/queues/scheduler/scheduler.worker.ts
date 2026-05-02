import { connection } from "./../../config/bull";
import { Worker } from "bullmq";
import cron from "node-cron";
import { Lottery } from "../../app/modules/lottery/lottery.model";
import { LOTTERY_STATUS } from "../../app/modules/lottery/lottery.constant";
import { User } from "../../app/modules/user/user.model";
import { USER_ROLES } from "../../enums/user";
import { NOTIFICATION_TYPE } from "../../app/modules/notification/notification.constant";
import { notificationHelper } from "../../app/builder/pushNotification";

export const schedulerWorker = new Worker(
  "schedulerQueue",
  async (job) => {
    const now = new Date(job.data.now);

    // active scheduled lotteries
    const scheduledLotteries = await Lottery.find({
      status: LOTTERY_STATUS.SCHEDULED,
      startAt: { $lte: now },
    });

    console.log(`📌 Scheduled Lotteries Ready: ${scheduledLotteries.length}`);

    // fetch admin once (performance optimization)
    const admin = await User.findOne({
      role: USER_ROLES.SUPER_ADMIN,
    }).select("_id");

    for (const lottery of scheduledLotteries) {
      const activeExists = await Lottery.exists({
        status: LOTTERY_STATUS.ACTIVE,
      });

      if (activeExists) {
        console.log(
          `⚠️ Skipped Activation (Active exists) → Lottery ID: ${lottery._id}`,
        );
        continue;
      }

      // update status to active
      lottery.status = LOTTERY_STATUS.ACTIVE;
      await lottery.save();

      console.log(
        `✅ Activated Lottery → ID: ${lottery._id}, Title: ${lottery.title}`,
      );

      // notification payload
      const payload = {
        title: "New Lottery Live",
        body: lottery.title,
        type: NOTIFICATION_TYPE.USER,
        data: {
          lotteryId: lottery._id.toString(),
        },
      };

      // get all users
      const users = await User.find({}).select("_id").lean();

      const userIds = users.map((u) => u._id.toString());

      // send notifications
      await Promise.all([
        // admin notification
        admin
          ? notificationHelper.sendToUser(admin._id.toString(), payload)
          : null,

        // all users broadcast
        notificationHelper.sendToBatch(userIds, payload),
      ]);
    }

    // end active lotteries
    const activeLotteries = await Lottery.find({
      status: LOTTERY_STATUS.ACTIVE,
      endAt: { $lte: now },
    });

    console.log(`📌 Active Lotteries to End: ${activeLotteries.length}`);

    for (const lottery of activeLotteries) {
      lottery.status = LOTTERY_STATUS.ENDED;
      await lottery.save();

      console.log(
        `🔴 Ended Lottery → ID: ${lottery._id}, Title: ${lottery.title}`,
      );
    }

    console.log("✅ Cron cycle completed");
  },
  { connection, concurrency: 1 },
);
