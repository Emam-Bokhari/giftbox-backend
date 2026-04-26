import ApiError from "../../../errors/ApiErrors";
import { randomInt } from "crypto";
import { WINNER_SELECTED_BY } from "./winner.constant";
import { Lottery } from "../lottery/lottery.model";
import { LotteryParticipant } from "../participant/participant.model";
import { LOTTERY_PARTICIPANT_STATUS } from "../participant/participant.constant";
import { LotteryWinner } from "./winner.model";
import { LOTTERY_STATUS } from "../lottery/lottery.constant";
import QueryBuilder from "../../builder/queryBuilder";
import { User } from "../user/user.model";
import { USER_ROLES } from "../../../enums/user";
import { notificationHelper } from "../../builder/pushNotification";
import { NOTIFICATION_REFERENCE_MODEL, NOTIFICATION_TYPE } from "../notification/notification.constant";
import { sendNotifications } from "../../../helpers/notificationsHelper";

/* ================= SECURE SHUFFLE ================= */
const secureShuffle = (array: any[]) => {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const rand = randomInt(0, i + 1);
    [arr[i], arr[rand]] = [arr[rand], arr[i]];
  }

  return arr;
};

/* ================= RANDOM DRAW ================= */
const drawRandomWinners = (participants: any[], winnerCount: number) => {
  if (winnerCount > participants.length) {
    throw new ApiError(400, "Winner count exceeds participants");
  }

  const shuffled = secureShuffle(participants);

  return shuffled.slice(0, winnerCount).map((w, index) => ({
    userId: w.userId,
    rank: index + 1,
  }));
};

/* ================= MAIN SERVICE ================= */
// const drawLotteryWinnersIntoDB = async (payload: {
//   lotteryId: string;
//   mode: WINNER_SELECTED_BY;
//   winnerCount: number;
//   selectedUserIds?: string[];
// }) => {
//   const { lotteryId, mode, winnerCount, selectedUserIds } = payload;

//   if (!lotteryId) {
//     throw new ApiError(400, "Lottery ID is required");
//   }

//   const lottery = await Lottery.findById(lotteryId);

//   if (!lottery) {
//     throw new ApiError(404, "Lottery not found");
//   }

//   if (lottery.status === LOTTERY_STATUS.DRAWN) {
//     throw new ApiError(400, "Lottery already drawn");
//   }

//   /* ================= GET APPROVED PARTICIPANTS ================= */
//   const approvedParticipants = await LotteryParticipant.find({
//     lotteryId,
//     status: LOTTERY_PARTICIPANT_STATUS.APPROVED,
//   });

//   if (!approvedParticipants.length) {
//     throw new ApiError(400, "No approved participants found");
//   }

//   let winners: { userId: any; rank: number }[] = [];

//   /* ================= RANDOM MODE ================= */
//   if (mode === WINNER_SELECTED_BY.RANDOM) {
//     winners = drawRandomWinners(approvedParticipants, winnerCount);
//   }

//   /* ================= MANUAL MODE ================= */
//   if (mode === WINNER_SELECTED_BY.MANUAL) {
//     if (!selectedUserIds || selectedUserIds.length === 0) {
//       throw new ApiError(400, "Selected users required for manual mode");
//     }

//     winners = approvedParticipants
//       .filter((p) => selectedUserIds.includes(p.userId.toString()))
//       .map((w, index) => ({
//         userId: w.userId,
//         rank: index + 1,
//       }));

//     if (!winners.length) {
//       throw new ApiError(400, "No valid winners selected");
//     }
//   }

//   /* ================= SAVE WINNERS ================= */
//   await LotteryWinner.insertMany(
//     winners.map((w) => ({
//       lotteryId,
//       userId: w.userId,
//       selectedBy: mode,
//       rank: w.rank,
//     }))
//   );

//   /* ================= FETCH POPULATED WINNERS (FIX) ================= */
//   const populatedWinners = await LotteryWinner.find({ lotteryId })
//     .populate("userId", "name email phone city profileImage")
//     .sort({ rank: 1 });

//   /* ================= FINALIZE LOTTERY ================= */
//   lottery.status = LOTTERY_STATUS.DRAWN;
//   await lottery.save();

//   return {
//     lotteryId,
//     mode,
//     totalWinners: populatedWinners.length,
//     winners: populatedWinners,
//   };
// };


const drawLotteryWinnersIntoDB = async (payload: {
  lotteryId: string;
  mode: WINNER_SELECTED_BY;
  winnerCount: number;
  selectedUserIds?: string[];
}) => {
  const { lotteryId, mode, winnerCount, selectedUserIds } = payload;

  if (!lotteryId) {
    throw new ApiError(400, "Lottery ID is required");
  }

  const lottery = await Lottery.findById(lotteryId);

  if (!lottery) {
    throw new ApiError(404, "Lottery not found");
  }

  if (lottery.status === LOTTERY_STATUS.DRAWN) {
    throw new ApiError(400, "Lottery already drawn");
  }

  /* ================= GET APPROVED PARTICIPANTS ================= */
  const approvedParticipants = await LotteryParticipant.find({
    lotteryId,
    status: LOTTERY_PARTICIPANT_STATUS.APPROVED,
  });

  if (!approvedParticipants.length) {
    throw new ApiError(400, "No approved participants found");
  }

  const participantUserIds = approvedParticipants.map((p) =>
    p.userId.toString()
  );

  let winners: { userId: any; rank: number }[] = [];

  /* ================= RANDOM MODE ================= */
  if (mode === WINNER_SELECTED_BY.RANDOM) {
    winners = drawRandomWinners(approvedParticipants, winnerCount);
  }

  /* ================= MANUAL MODE ================= */
  if (mode === WINNER_SELECTED_BY.MANUAL) {
    if (!selectedUserIds || selectedUserIds.length === 0) {
      throw new ApiError(400, "Selected users required for manual mode");
    }

    winners = approvedParticipants
      .filter((p) => selectedUserIds.includes(p.userId.toString()))
      .map((w, index) => ({
        userId: w.userId,
        rank: index + 1,
      }));

    if (!winners.length) {
      throw new ApiError(400, "No valid winners selected");
    }
  }

  /* ================= SAVE WINNERS ================= */
  await LotteryWinner.insertMany(
    winners.map((w) => ({
      lotteryId,
      userId: w.userId,
      selectedBy: mode,
      rank: w.rank,
    }))
  );

  /* ================= POPULATED WINNERS ================= */
  const populatedWinners = await LotteryWinner.find({ lotteryId })
    .populate("userId", "name email phone city profileImage")
    .sort({ rank: 1 });

  /* ================= FINALIZE LOTTERY ================= */
  lottery.status = LOTTERY_STATUS.DRAWN;
  await lottery.save();

  /* ================= NOTIFICATIONS ================= */

  const notifications: Promise<any>[] = [];

  /* ================= 1. ADMIN ================= */
  const admin = await User.findOne({
    role: USER_ROLES.SUPER_ADMIN,
  }).select("_id");

  if (admin) {
    await sendNotifications({
      title: "New Lottery Winners Announced",
      text: `Lottery "${lottery.title}" result published`,
      receiver: admin._id.toString(),
      type: NOTIFICATION_TYPE.ADMIN,
      referenceId: lottery._id.toString(),
      referenceModel: NOTIFICATION_REFERENCE_MODEL.LOTTERY_WINNER,
    });
  }

  /* ================= 2. WINNERS ================= */
  for (const winner of populatedWinners) {
    notifications.push(
      notificationHelper.sendToUser(winner.userId.toString(), {
        title: "🎉 You Won!",
        body: `Congratulations! You’ve won in "${lottery.title}". 🎉`,
        type: NOTIFICATION_TYPE.USER,
        data: {
          lotteryId: lottery._id.toString(),
          rank: String(winner.rank),
        },
      })
    );
  }

  /* ================= 3. ALL PARTICIPANTS (IMPORTANT) ================= */
  notifications.push(
    notificationHelper.sendToBatch(participantUserIds, {
      title: "📢 Lottery Result Announced",
      body: `Results for "${lottery.title}" have been published`,
      type: NOTIFICATION_TYPE.USER,
      data: {
        lotteryId: lottery._id.toString(),
      },
    })
  );

  /* ================= EXECUTE ALL ================= */
  await Promise.allSettled(notifications);

  return {
    lotteryId,
    mode,
    totalParticipants: participantUserIds.length,
    totalWinners: populatedWinners.length,
    winners: populatedWinners,
  };
};

const getLotteryDrawHistoryFromDB = async (query: Record<string, unknown>) => {
  //  Base lottery query (ONLY drawn lotteries)
  const baseQuery = Lottery.find({
    status: LOTTERY_STATUS.DRAWN,
  }).sort({ updatedAt: -1 });

  //  Pagination only on lottery list
  const lotteryQuery = new QueryBuilder(baseQuery, query)
    .search(["title", "ticketNumber"])
    .filter()
    .paginate()
    .fields();

  const lotteries = await lotteryQuery.modelQuery;
  const meta = await lotteryQuery.countTotal();

  // Enrich each lottery with dashboard data
  const data = await Promise.all(
    lotteries.map(async (lottery) => {
      const lotteryId = lottery._id;

      // participants
      const participants = await LotteryParticipant.find({
        lotteryId,
      })
        .populate("userId", "name email phone city profileImage")
        .lean();

      // winners
      const winners = await LotteryWinner.find({
        lotteryId,
      })
        .populate("userId", "name email phone city profileImage")
        .lean();

      // payment proofs (from participants)
      const paymentProofs = participants.map((p: any) => ({
        participantId: p._id,
        user: p.userId,
        paymentProof: p.paymentProof,
        status: p.status,
      }));

      // stats
      const totalParticipants = participants.length;

      const approvedParticipants = participants.filter(
        (p) => p.status === LOTTERY_PARTICIPANT_STATUS.APPROVED
      );

      const revenue = approvedParticipants.reduce((sum, p: any) => {
        return sum + (p.amount || lottery.ticketPrice);
      }, 0);

      return {
        lottery: {
          _id: lottery._id,
          ticketNumber: lottery.ticketNumber,
          title: lottery.title,
          banner: lottery.banner,
          ticketPrice: lottery.ticketPrice,
          currency: lottery.currency,
          status: lottery.status,
          mode: lottery.mode,
          startAt: lottery.startAt,
          endAt: lottery.endAt,
          createdAt: lottery.createdAt,
          updatedAt: lottery.updatedAt,
        },

        // participants: participants.map((p: any) => ({
        //   _id: p._id,
        //   name: p.userId?.name,
        //   email: p.userId?.email,
        //   phone: p.userId?.phone,
        //   city: p.userId?.city,
        //   status: p.status,
        //   paymentProof: p.paymentProof,
        // })),

        winners: winners.map((w: any) => ({
          _id: w._id,
          user: {
            name: w.userId?.name,
            email: w.userId?.email,
            phone: w.userId?.phone,
            city: w.userId?.city,
          },
          selectedBy: w.selectedBy,
          rank: w.rank,
        })),

        // paymentProofs,

        stats: {
          totalParticipants,
          approved: approvedParticipants.length,
          pending: participants.filter(
            (p) => p.status === LOTTERY_PARTICIPANT_STATUS.PENDING
          ).length,
          rejected: participants.filter(
            (p) => p.status === LOTTERY_PARTICIPANT_STATUS.REJECTED
          ).length,
          revenue,
        },
      };
    })
  );

  return {
    meta,
    data,
  };
};

const getLotteryDrawHistoryByIdFromDB = async (
  lotteryId: string,
  query: Record<string, unknown>
) => {
  if (!lotteryId) {
    throw new ApiError(400, "Lottery ID is required");
  }

  /* ================= LOTTERY INFO ================= */
  const lottery = await Lottery.findById(lotteryId);

  if (!lottery) {
    throw new ApiError(404, "Lottery not found");
  }

  /* ================= PARTICIPANTS (TAB 1) ================= */
  const participantBaseQuery = LotteryParticipant.find({
    lotteryId,
  }).populate("userId", "name email phone city profileImage");

  const participantQuery = new QueryBuilder(
    participantBaseQuery,
    query
  )
    .search(["status"])
    .filter()
    .sort()
    .paginate();

  const participants = await participantQuery.modelQuery;
  const participantMeta = await participantQuery.countTotal();

  /* ================= WINNERS (TAB 2) ================= */
  const winnerBaseQuery = LotteryWinner.find({
    lotteryId,
  }).populate("userId", "name email phone city profileImage");

  const winnerQuery = new QueryBuilder(winnerBaseQuery, query)
    .filter()
    .sort()
    .paginate();

  const winners = await winnerQuery.modelQuery;
  const winnerMeta = await winnerQuery.countTotal();

  /* ================= PAYMENT PROOFS (TAB 3) ================= */
  const proofBaseQuery = LotteryParticipant.find({
    lotteryId,
    paymentProof: { $exists: true },
  })
    .populate("userId", "name email phone city")
    .select("paymentProof status userId");

  const proofQuery = new QueryBuilder(proofBaseQuery, query)
    .filter()
    .sort()
    .paginate();

  const paymentProofs = await proofQuery.modelQuery;
  const proofMeta = await proofQuery.countTotal();

  /* ================= STATS ================= */
  const allParticipants = await LotteryParticipant.find({
    lotteryId,
  });

  const approvedParticipants = allParticipants.filter(
    (p) => p.status === LOTTERY_PARTICIPANT_STATUS.APPROVED
  );

  const totalParticipants = allParticipants.length;

  const revenue =
    approvedParticipants.length * (lottery.ticketPrice || 0);

  /* ================= FINAL RESPONSE ================= */
  return {
    lottery: {
      _id: lottery._id,
      title: lottery.title,
      banner: lottery.banner,
      ticketPrice: lottery.ticketPrice,
      currency: lottery.currency,
      status: lottery.status,
      startAt: lottery.startAt,
      endAt: lottery.endAt,
    },

    participants: {
      data: participants,
      meta: participantMeta,
    },

    winners: {
      data: winners,
      meta: winnerMeta,
    },

    paymentProofs: {
      data: paymentProofs,
      meta: proofMeta,
    },

    stats: {
      totalParticipants,
      approvedParticipants: approvedParticipants.length,
      revenue,
    },
  };
};

export const WinnerServices = {
  drawLotteryWinnersIntoDB,
  getLotteryDrawHistoryFromDB,
  getLotteryDrawHistoryByIdFromDB,
};