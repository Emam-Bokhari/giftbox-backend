import { USER_ROLES } from "../../../enums/user";
import ApiError from "../../../errors/ApiErrors";
import { generateTicketId } from "../../../helpers/generateCustomId";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import QueryBuilder from "../../builder/queryBuilder";
import {
  NOTIFICATION_REFERENCE_MODEL,
  NOTIFICATION_TYPE,
} from "../notification/notification.constant";
import { LOTTERY_PARTICIPANT_STATUS } from "../participant/participant.constant";
import { LotteryParticipant } from "../participant/participant.model";
import { User } from "../user/user.model";
import { LotteryWinner } from "../winner/winner.model";
import { LOTTERY_MODE, LOTTERY_STATUS } from "./lottery.constant";
import { TLottery } from "./lottery.interface";
import { Lottery } from "./lottery.model";

const createLotteryToDB = async (payload: TLottery) => {
  const {
    title,
    description,
    banner,
    ticketPrice,
    currency,
    mode,
    manualParticipants,
    startAt,
    endAt,
  } = payload;

  if (!title || !ticketPrice || !currency || !mode || !endAt) {
    throw new ApiError(400, "Missing required fields");
  }

  const endTime = new Date(endAt);
  if (isNaN(endTime.getTime())) {
    throw new ApiError(400, "Invalid end date");
  }
  
  const ticketNumber = await generateTicketId();
  payload.ticketNumber = ticketNumber;

  let status: LOTTERY_STATUS;
  let startTime: Date | undefined;

  switch (mode) {
    case LOTTERY_MODE.INSTANT:
      status = LOTTERY_STATUS.ACTIVE;
      startTime = new Date();
      break;

    case LOTTERY_MODE.SCHEDULE:
      if (!startAt) {
        throw new ApiError(400, "Start time is required for schedule mode");
      }

      const parsedStart = new Date(startAt);
      if (isNaN(parsedStart.getTime())) {
        throw new ApiError(400, "Invalid start date");
      }

      if (parsedStart >= endTime) {
        throw new ApiError(400, "Start time must be before end time");
      }

      status = LOTTERY_STATUS.SCHEDULED;
      startTime = parsedStart;
      break;

    case LOTTERY_MODE.DRAFT:
      status = LOTTERY_STATUS.DRAFT;
      break;

    default:
      throw new ApiError(400, "Invalid lottery mode");
  }

  const lottery = await Lottery.create({
    ticketNumber,
    title,
    description,
    banner,
    ticketPrice,
    currency,
    mode,
    manualParticipants,
    status,
    startAt: startTime,
    endAt: endTime,
  });

  // admin notification
  const admin = await User.findOne({
    role: USER_ROLES.SUPER_ADMIN,
  }).select("_id");

  if (admin) {
    await sendNotifications({
      title: "New Lottery Created",
      text: `Lottery ${lottery.title} has been created`,
      receiver: admin._id.toString(),
      type: NOTIFICATION_TYPE.ADMIN,
      referenceId: lottery._id.toString(),
      referenceModel: NOTIFICATION_REFERENCE_MODEL.LOTTERY,
    });
  }

  return lottery;
};

const getActiveLotteriesFromDB = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const activeLotteries = await Lottery.find({
    status: LOTTERY_STATUS.ACTIVE,
  }).lean();

  if (!activeLotteries || activeLotteries.length === 0) {
    return [];
  }

  // check if user already participated in each lottery
   const enrichedLotteries = await Promise.all(
     activeLotteries.map(async (lottery) => {
       const isParticipated = await LotteryParticipant.exists({
         lotteryId: lottery._id,
         userId: userId,
       });

       // Count approved participants
       const approvedCount = await LotteryParticipant.countDocuments({
         lotteryId: lottery._id,
         status: LOTTERY_PARTICIPANT_STATUS.APPROVED,
       });

       const totalParticipants =
         (lottery.manualParticipants || 0) + approvedCount;

       // role based response
       // ADMIN → limited fields
       if (
         user.role === USER_ROLES.ADMIN ||
         user.role === USER_ROLES.SUPER_ADMIN
       ) {
         return {
           _id: lottery._id,
           title: lottery.title,
           startAt: lottery.startAt,
           endAt: lottery.endAt,
           createdAt: lottery.createdAt,
           isParticipated: !!isParticipated,
           manualParticipants: totalParticipants,
         };
       }

       // USER → full data
       return {
         ...lottery,
         isParticipated: !!isParticipated,
         manualParticipants: totalParticipants,
       };
     }),
   );

  return enrichedLotteries;
};

const getLotteryByIdFromDB = async (id: string, userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const lottery = await Lottery.findById(id).lean();

  if (!lottery) {
    throw new ApiError(404, "Lottery not found");
  }

  // check if user already participated
  const isParticipated = await LotteryParticipant.exists({
    lotteryId: lottery._id,
    userId: userId,
  });

  // Count approved participants
  const approvedCount = await LotteryParticipant.countDocuments({
    lotteryId: lottery._id,
    status: LOTTERY_PARTICIPANT_STATUS.APPROVED,
  });

  const totalParticipants = (lottery.manualParticipants || 0) + approvedCount;

  // role based response
  // ADMIN → limited fields
  if (
    user.role === USER_ROLES.ADMIN ||
    user.role === USER_ROLES.SUPER_ADMIN
  ) {
    return {
      _id: lottery._id,
      title: lottery.title,
      startAt: lottery.startAt,
      endAt: lottery.endAt,
      createdAt: lottery.createdAt,
      isParticipated: !!isParticipated,
      manualParticipants: totalParticipants,
    };
  }

  // USER → full data
  return {
    ...lottery,
    isParticipated: !!isParticipated,
    manualParticipants: totalParticipants,
  };
};

const getAllLotteriesFromDB = async (query: Record<string, unknown>) => {
  const lotteryQuery = new QueryBuilder(Lottery.find(), query)
    .search(["title", "description", "ticketNumber"])
    .filter()
    .sort()
    .paginate()
    .fields();
    

  const data = await lotteryQuery.modelQuery;
  const meta = await lotteryQuery.countTotal();

  if (!data || data.length === 0) {
    return {
      meta,
      data,
    };
  }

  const lotteryIds = data.map((l) => l._id);

  const statsAgg = await LotteryParticipant.aggregate([
    { $match: { lotteryId: { $in: lotteryIds } } },
    {
      $group: {
        _id: "$lotteryId",
        pending: {
          $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] },
        },
        approved: {
          $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] },
        },
        rejected: {
          $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] },
        },
        drawn: {
          $sum: { $cond: [{ $eq: ["$status", "DRAWN"] }, 1, 0] },
        },
      },
    },
  ]);

  const statsMap = statsAgg.reduce((acc: any, curr: any) => {
    acc[curr._id.toString()] = curr;
    return acc;
  }, {});

  const enrichedData = data.map((lottery: any) => {
    const lotteryObj = lottery.toObject();
    const stats = statsMap[lottery._id.toString()] || {
      pending: 0,
      approved: 0,
      rejected: 0,
      drawn: 0,
    };

    const totalParticipants =
      (stats.pending || 0) +
      (stats.approved || 0) +
      (stats.rejected || 0) +
      (stats.drawn || 0);
    const approved = (stats.approved || 0) + (stats.drawn || 0);
    const revenue = approved * (lottery.ticketPrice || 0);

    return {
      ...lotteryObj,
      stats: {
        totalParticipants,
        pending: stats.pending || 0,
        approved,
        rejected: stats.rejected || 0,
        revenue,
      },
    };
  });

  return {
    meta,
    data: enrichedData,
  };
};

const getSingleLotteryFromDB = async (id: string) => {
  if (!id) {
    throw new ApiError(400, "Lottery ID is required");
  }

  const lottery = await Lottery.findById(id).lean();

  if (!lottery) {
    throw new ApiError(404, "Lottery not found");
  }

  return lottery;
};

const updateLotteryIntoDB = async (id: string, payload: any) => {
  if (!id) {
    throw new ApiError(400, "Lottery ID is required");
  }

  const lottery = await Lottery.findById(id);

  if (!lottery) {
    throw new ApiError(404, "Lottery not found");
  }

  // drawn lottery cannot be updated
  if (lottery.status === LOTTERY_STATUS.DRAWN) {
    throw new ApiError(400, "Cannot update a drawn lottery");
  }

  // active lottery strict lock
  if (lottery.status === LOTTERY_STATUS.ACTIVE) {
    const restrictedFields = [
      "ticketPrice",
      "currency",
      "mode",
      "startAt",
      "endAt",
      "status",
    ];

    restrictedFields.forEach((field) => {
      if (payload[field] !== undefined) {
        const currentValue = (lottery as any)[field];
        const newValue = payload[field];

        let isSame = false;

        const isCurrentDate =
          currentValue instanceof Date ||
          (typeof currentValue === "string" && !isNaN(Date.parse(currentValue)));
        const isNewDate =
          newValue instanceof Date ||
          (typeof newValue === "string" && !isNaN(Date.parse(newValue)));

        if (isCurrentDate && isNewDate) {
          const d1 = new Date(currentValue);
          const d2 = new Date(newValue);

          isSame = d1.getTime() === d2.getTime();

          // extra check for different formats representing the same date
          if (!isSame) {
            isSame = d1.toISOString() === d2.toISOString();
          }

          // if newValue is just a date string (YYYY-MM-DD) or doesn't have time, compare only the date part
          if (
            !isSame &&
            typeof newValue === "string" &&
            (/^\d{4}-\d{2}-\d{2}$/.test(newValue) ||
              (!newValue.includes("T") && !newValue.includes(":")))
          ) {
            isSame = d1.toISOString().split("T")[0] === d2.toISOString().split("T")[0];
          }
        } else {
          isSame = String(currentValue) === String(newValue);
        }

        if (!isSame) {
          throw new ApiError(
            400,
            `Cannot update ${field} of an active lottery`,
          );
        }
      }
    });
  }

  // scheduled lottery partial restriction
  if (lottery.status === LOTTERY_STATUS.SCHEDULED) {
    const restrictedFields = ["startAt", "mode", "status"];

    restrictedFields.forEach((field) => {
      if (payload[field] !== undefined) {
        const currentValue = (lottery as any)[field];
        const newValue = payload[field];

        let isSame = false;

        const isCurrentDate =
          currentValue instanceof Date ||
          (typeof currentValue === "string" && !isNaN(Date.parse(currentValue)));
        const isNewDate =
          newValue instanceof Date ||
          (typeof newValue === "string" && !isNaN(Date.parse(newValue)));

        if (isCurrentDate && isNewDate) {
          const d1 = new Date(currentValue);
          const d2 = new Date(newValue);

          isSame = d1.getTime() === d2.getTime();

          if (!isSame) {
            isSame = d1.toISOString() === d2.toISOString();
          }

          if (
            !isSame &&
            typeof newValue === "string" &&
            (/^\d{4}-\d{2}-\d{2}$/.test(newValue) ||
              (!newValue.includes("T") && !newValue.includes(":")))
          ) {
            isSame = d1.toISOString().split("T")[0] === d2.toISOString().split("T")[0];
          }
        } else {
          isSame = String(currentValue) === String(newValue);
        }

        if (!isSame) {
          throw new ApiError(
            400,
            `Cannot update ${field} of a scheduled lottery`,
          );
        }
      }
    });
  }

  // date validation
  // safe for DRAFT or allowed cases
  const startAt = payload.startAt || lottery.startAt;
  const endAt = payload.endAt || lottery.endAt;

  if (startAt && endAt) {
    const start = new Date(startAt);
    const end = new Date(endAt);

    if (start >= end) {
      throw new ApiError(400, "Start time must be before end time");
    }
  }

  const updatedLottery = await Lottery.findByIdAndUpdate(
    id,
    { $set: payload },
    {
      new: true,
      runValidators: true,
    },
  );

  return updatedLottery;
};

const updateLotteryStatusIntoDB = async (
  id: string,
  status: LOTTERY_STATUS,
) => {
  if (!id) {
    throw new ApiError(400, "Lottery ID is required");
  }

  if (!status) {
    throw new ApiError(400, "Status is required");
  }

  const lottery = await Lottery.findById(id);

  if (!lottery) {
    throw new ApiError(404, "Lottery not found");
  }

  // If already DRAWN → no further change allowed
  if (lottery.status === LOTTERY_STATUS.DRAWN) {
    throw new ApiError(400, "Cannot change status of a drawn lottery");
  }

  //  Prevent invalid transitions
  const invalidTransitions = [
    `${LOTTERY_STATUS.DRAWN}->${LOTTERY_STATUS.ACTIVE}`,
    `${LOTTERY_STATUS.DRAWN}->${LOTTERY_STATUS.SCHEDULED}`,
    `${LOTTERY_STATUS.ENDED}->${LOTTERY_STATUS.ACTIVE}`,
  ];

  const transition = `${lottery.status}->${status}`;

  if (invalidTransitions.includes(transition)) {
    throw new ApiError(
      400,
      `Invalid status transition from ${lottery.status} to ${status}`,
    );
  }

  lottery.status = status;
  await lottery.save();

  return lottery;
};

const deleteLotteryFromDB = async (id: string) => {
  if (!id) {
    throw new ApiError(400, "Lottery ID is required");
  }

  const lottery = await Lottery.findById(id);

  if (!lottery) {
    throw new ApiError(404, "Lottery not found");
  }

  if (
    lottery.status === LOTTERY_STATUS.ACTIVE ||
    lottery.status === LOTTERY_STATUS.SCHEDULED
  ) {
    throw new ApiError(400, "Active or scheduled lottery cannot be deleted");
  }

  const data = await Lottery.findByIdAndDelete(id);

  return data;
};

const getLotteryDashboardByIdFromDB = async (id: string, query: any) => {
  if (!id) throw new ApiError(400, "Lottery ID is required");

  const lottery = await Lottery.findById(id);

  if (!lottery) throw new ApiError(404, "Lottery not found");

  const type = query.type || "participants";

  /* ================= BASE QUERY ================= */
  const baseQuery = LotteryParticipant.find({
    lotteryId: id,
  }).populate("userId", "_id name email phone city");

  const qb = new QueryBuilder(baseQuery, query)
    .search(["status"])
    .filter()
    .sort()
    .paginate();

  const rawData = await qb.modelQuery;
  const meta = await qb.countTotal();

  /* ================= PARTICIPANTS VIEW ================= */
  const participants = rawData.map((p: any) => ({
    _id: p._id,
    user: {
      _id: p.userId?._id,
      name: p.userId?.name,
      email: p.userId?.email,
      phone: p.userId?.phone,
      city: p.userId?.city,
    },
    status: p.status,
    paymentProof: p.paymentProof,
    amount: lottery.ticketPrice,
    createdAt: p.createdAt,
  }));

  /* ================= PAYMENT PROOFS VIEW ================= */
  const paymentProofs = rawData.map((p: any) => ({
    participantId: p._id,
    user: {
      _id: p.userId?._id,
      name: p.userId?.name,
      email: p.userId?.email,
    },
    paymentProof: p.paymentProof,
    status: p.status,
    amount: lottery.ticketPrice,
  }));

  /* ================= STATS ================= */
  const statsAgg = await LotteryParticipant.aggregate([
    { $match: { lotteryId: lottery._id } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  let pending = 0,
    approved = 0,
    rejected = 0,
    drawn = 0;

  statsAgg.forEach((s) => {
    if (s._id === "PENDING") pending = s.count;
    if (s._id === "APPROVED" || s._id === "DRAWN") approved += s.count;
    if (s._id === "REJECTED") rejected = s.count;
  });

  const totalParticipants = pending + approved + rejected;

  const revenue = approved * (lottery.ticketPrice || 0);

  /* ================= RESPONSE SWITCH ================= */
  return {
    lottery,
    stats: {
      totalParticipants,
      pending,
      approved,
      rejected,
      drawn: 0,
      revenue,
    },

    data: type === "proofs" ? paymentProofs : participants,
    meta,
  };
};

const getLotteryWinnersByLotteryIdFromDB = async (lotteryId: string) => {
  if (!lotteryId) {
    throw new ApiError(400, "Lottery ID is required");
  }

  // lottery check
  const lottery = await Lottery.findById(lotteryId).select("ticketNumber");

  if (!lottery) {
    throw new ApiError(404, "Lottery not found");
  }

  // winners
  const winners = await LotteryWinner.find({ lotteryId })
    .populate("userId", "name email phone city profileImage")
    .sort({ rank: 1 });

  return {
    ticketNumber: lottery.ticketNumber,

    totalWinners: winners.length,

    winners: winners.map((w: any) => ({
      id: w._id,
      userId: w.userId?._id,

      name: w.userId?.name,
      email: w.userId?.email,
      phone: w.userId?.phone,
      city: w.userId?.city,
      profileImage: w.userId?.profileImage,

      createdAt: w.createdAt,
    })),
  };
};

export const LotteryServices = {
  createLotteryToDB,
  getActiveLotteriesFromDB,
  getLotteryByIdFromDB,
  getAllLotteriesFromDB,
  getSingleLotteryFromDB,
  updateLotteryStatusIntoDB,
  updateLotteryIntoDB,
  deleteLotteryFromDB,
  getLotteryDashboardByIdFromDB,
  getLotteryWinnersByLotteryIdFromDB,
};
