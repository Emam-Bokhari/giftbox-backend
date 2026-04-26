import cron from "node-cron";
import { Lottery } from "./lottery.model";
import { LOTTERY_STATUS } from "./lottery.constant";
import { notificationHelper } from "../../builder/pushNotification";
import { User } from "../user/user.model";
import { USER_ROLES } from "../../../enums/user";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";

// run per minute
// export const startLotteryScheduler = () => {
//   console.log("🟢 Lottery Scheduler Started...");

//   cron.schedule("* * * * *", async () => {
//     const now = new Date();

//     console.log(`\n⏱️ Cron Tick: ${now.toISOString()}`);

//     try {

//       // Activate Scheduled Lottery

//       const scheduledLotteries = await Lottery.find({
//         status: LOTTERY_STATUS.SCHEDULED,
//         startAt: { $lte: now },
//       });

//       console.log(
//         `📌 Scheduled Lotteries Ready: ${scheduledLotteries.length}`
//       );

//       for (const lottery of scheduledLotteries) {
//         const activeExists = await Lottery.exists({
//           status: LOTTERY_STATUS.ACTIVE,
//         });

//         if (activeExists) {
//           console.log(
//             `⚠️ Skipped Activation (Active exists) → Lottery ID: ${lottery._id}`
//           );
//           continue;
//         }

//         lottery.status = LOTTERY_STATUS.ACTIVE;
//         await lottery.save();

//         console.log(
//           `✅ Activated Lottery → ID: ${lottery._id}, Title: ${lottery.title}`
//         );
//       }


//       //  end Active Lottery

//       const activeLotteries = await Lottery.find({
//         status: LOTTERY_STATUS.ACTIVE,
//         endAt: { $lte: now },
//       });

//       console.log(`📌 Active Lotteries to End: ${activeLotteries.length}`);

//       for (const lottery of activeLotteries) {
//         lottery.status = LOTTERY_STATUS.ENDED;
//         await lottery.save();

//         console.log(
//           `🔴 Ended Lottery → ID: ${lottery._id}, Title: ${lottery.title}`
//         );
//       }

//       console.log("✅ Cron cycle completed");
//     } catch (error) {
//       console.error("❌ Lottery Scheduler Error:", error);
//     }
//   });
// };

export const startLotteryScheduler = () => {
  console.log("🟢 Lottery Scheduler Started...");

  cron.schedule("* * * * *", async () => {
    const now = new Date();

    console.log(`\n⏱️ Cron Tick: ${now.toISOString()}`);

    try {
      /* ================= ACTIVATE SCHEDULED LOTTERIES ================= */
      const scheduledLotteries = await Lottery.find({
        status: LOTTERY_STATUS.SCHEDULED,
        startAt: { $lte: now },
      });

      console.log(
        `📌 Scheduled Lotteries Ready: ${scheduledLotteries.length}`
      );

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
            `⚠️ Skipped Activation (Active exists) → Lottery ID: ${lottery._id}`
          );
          continue;
        }

        /* ================= UPDATE STATUS ================= */
        lottery.status = LOTTERY_STATUS.ACTIVE;
        await lottery.save();

        console.log(
          `✅ Activated Lottery → ID: ${lottery._id}, Title: ${lottery.title}`
        );

        /* ================= NOTIFICATION PAYLOAD ================= */
        const payload = {
          title: "New Lottery Live",
          body: lottery.title,
          type: NOTIFICATION_TYPE.USER,
          data: {
            lotteryId: lottery._id.toString(),
          },
        };

        /* ================= GET USERS ================= */
        const users = await User.find({})
          .select("_id")
          .lean();

        const userIds = users.map((u) => u._id.toString());

        /* ================= SEND NOTIFICATIONS ================= */
        await Promise.all([
          // admin notification
          admin
            ? notificationHelper.sendToUser(admin._id.toString(), payload)
            : null,

          // all users broadcast
          notificationHelper.sendToBatch(userIds, payload),
        ]);
      }

      /* ================= END ACTIVE LOTTERIES ================= */
      const activeLotteries = await Lottery.find({
        status: LOTTERY_STATUS.ACTIVE,
        endAt: { $lte: now },
      });

      console.log(
        `📌 Active Lotteries to End: ${activeLotteries.length}`
      );

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