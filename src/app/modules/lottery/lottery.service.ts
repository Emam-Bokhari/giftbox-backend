import { USER_ROLES } from "../../../enums/user";
import ApiError from "../../../errors/ApiErrors";
import { generateTicketId } from "../../../helpers/generateCustomId";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import QueryBuilder from "../../builder/queryBuilder";
import {
    NOTIFICATION_REFERENCE_MODEL,
    NOTIFICATION_TYPE,
} from "../notification/notification.constant";
import { LotteryParticipant } from "../participant/participant.model";
import { User } from "../user/user.model";
import { LotteryWinner } from "../winner/winner.model";
import { LOTTERY_MODE, LOTTERY_STATUS } from "./lottery.constant";
import { TLottery } from "./lottery.interface";
import { Lottery } from "./lottery.model";

// const createLotteryToDB = async (payload: TLottery) => {
//     const {
//         title,
//         description,
//         banner,
//         ticketPrice,
//         currency,
//         mode,
//         startAt,
//         endAt,
//     } = payload;

//     if (!title || !ticketPrice || !currency || !mode || !endAt) {
//         throw new ApiError(400, "Missing required fields");
//     }

//     const endTime = new Date(endAt);
//     if (isNaN(endTime.getTime())) {
//         throw new ApiError(400, "Invalid end date");
//     }

//     // generate ticket number
//     const ticketNumber = await generateTicketId();
//     payload.ticketNumber = ticketNumber;

//     // only ONE ACTIVE lottery allowed

//     if (mode === LOTTERY_MODE.INSTANT) {
//         const activeExists = await Lottery.exists({
//             status: LOTTERY_STATUS.ACTIVE,
//         });

//         if (activeExists) {
//             throw new ApiError(
//                 400,
//                 "Another active lottery already exists. Please end it first."
//             );
//         }
//     }

//     // determine status safely

//     let status: LOTTERY_STATUS;
//     let startTime: Date | undefined;

//     switch (mode) {
//         case LOTTERY_MODE.INSTANT: {
//             status = LOTTERY_STATUS.ACTIVE;
//             startTime = new Date();
//             break;
//         }

//         case LOTTERY_MODE.SCHEDULE: {
//             if (!startAt) {
//                 throw new ApiError(
//                     400,
//                     "Start time is required for schedule mode"
//                 );
//             }

//             const parsedStart = new Date(startAt);
//             if (isNaN(parsedStart.getTime())) {
//                 throw new ApiError(400, "Invalid start date");
//             }

//             if (parsedStart >= endTime) {
//                 throw new ApiError(
//                     400,
//                     "Start time must be before end time"
//                 );
//             }

//             status = LOTTERY_STATUS.SCHEDULED;
//             startTime = parsedStart;
//             break;
//         }

//         case LOTTERY_MODE.DRAFT: {
//             status = LOTTERY_STATUS.DRAFT;
//             break;
//         }

//         default:
//             throw new ApiError(400, "Invalid lottery mode");
//     }

//     const lottery = await Lottery.create({
//         ticketNumber,
//         title,
//         description,
//         banner,
//         ticketPrice,
//         currency,
//         mode,
//         status,
//         startAt: startTime,
//         endAt: endTime,
//     });

//     return lottery;
// };

const createLotteryToDB = async (payload: TLottery) => {
    const {
        title,
        description,
        banner,
        ticketPrice,
        currency,
        mode,
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

    if (mode === LOTTERY_MODE.INSTANT) {
        const activeExists = await Lottery.exists({
            status: LOTTERY_STATUS.ACTIVE,
        });

        if (activeExists) {
            throw new ApiError(
                400,
                "Another active lottery already exists. Please end it first.",
            );
        }
    }

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
            text: `Lottery "${lottery.title}" has been created`,
            receiver: admin._id.toString(),
            type: NOTIFICATION_TYPE.ADMIN,
            referenceId: lottery._id.toString(),
            referenceModel: NOTIFICATION_REFERENCE_MODEL.LOTTERY,
        });
    }

    return lottery;
};

const getActiveLotteryFromDB = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    const activeLottery = await Lottery.findOne({
        status: LOTTERY_STATUS.ACTIVE,
    }).lean();

    if (!activeLottery) {
        throw new ApiError(404, "No active lottery found");
    }

    // role based response
    // ADMIN → limited fields
    if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN) {
        return {
            title: activeLottery.title,
            startAt: activeLottery.startAt,
            endAt: activeLottery.endAt,
            createdAt: activeLottery.createdAt,
        };
    }

    // USER → full data
    return activeLottery;
};

const getLotteryByIdFromDB = async (id: string) => {
    const lottery = await Lottery.findById(id);

    if (!lottery) {
        throw new ApiError(404, "Lottery not found");
    }

    return lottery;
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

    return {
        meta,
        data,
    };
};

const getSingleLotteryFromDB = async (id: string) => {
    if (!id) {
        throw new ApiError(400, "Lottery ID is required");
    }

    const lottery = await Lottery.findById(id);

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
                throw new ApiError(400, `Cannot update ${field} of an active lottery`);
            }
        });
    }

    // scheduled lottery partial restriction
    if (lottery.status === LOTTERY_STATUS.SCHEDULED) {
        const restrictedFields = ["startAt", "mode", "status"];

        restrictedFields.forEach((field) => {
            if (payload[field] !== undefined) {
                throw new ApiError(
                    400,
                    `Cannot update ${field} of a scheduled lottery`,
                );
            }
        });
    }

    // date validation
    // safe for DRAFT or allowed cases
    if (payload.startAt && payload.endAt) {
        const start = new Date(payload.startAt);
        const end = new Date(payload.endAt);

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

// const getLotteryDashboardByIdFromDB = async (id: string, query: any) => {
//   if (!id) {
//     throw new ApiError(400, "Lottery ID is required");
//   }

//   const lottery = await Lottery.findById(id);

//   if (!lottery) {
//     throw new ApiError(404, "Lottery not found");
//   }

//   // participants query
//   const participantsQuery = new QueryBuilder(
//     LotteryParticipant.find({ lotteryId: id }).populate(
//       "userId",
//       "name email phone city",
//     ),
//     query,
//   )
//     .search(["status"])
//     .filter()
//     .sort()
//     .paginate()
//     .fields();

//   const participantsRaw = await participantsQuery.modelQuery;

//   const participantsMeta = await participantsQuery.countTotal();

//   const participants = participantsRaw.map((p: any) => ({
//     _id: p._id,
//     user: {
//       name: p.userId?.name,
//       email: p.userId?.email,
//       phone: p.userId?.phone,
//       city: p.userId?.city,
//     },
//     status: p.status,
//     amount: lottery.ticketPrice,
//     createdAt: p.createdAt,
//   }));

//   // payment proofs

//   const proofQuery = new QueryBuilder(
//     LotteryParticipant.find({ lotteryId: id }).populate("userId", "name email"),
//     query,
//   )
//     .search(["status"])
//     .filter()
//     .sort()
//     .paginate()
//     .fields();

//   const proofsRaw = await proofQuery.modelQuery;

//   const proofMeta = await proofQuery.countTotal();

//   const paymentProofs = proofsRaw.map((p: any) => ({
//     participantId: p._id,
//     user: {
//       name: p.userId?.name,
//       email: p.userId?.email,
//     },
//     paymentProof: p.paymentProof,
//     status: p.status,
//     amount: lottery.ticketPrice,
//   }));

//   // status

//   const statsAgg = await LotteryParticipant.aggregate([
//     { $match: { lotteryId: lottery._id } },
//     {
//       $group: {
//         _id: "$status",
//         count: { $sum: 1 },
//       },
//     },
//   ]);

//   let pending = 0,
//     approved = 0,
//     rejected = 0;

//   statsAgg.forEach((s) => {
//     if (s._id === "PENDING") pending = s.count;
//     if (s._id === "APPROVED") approved = s.count;
//     if (s._id === "REJECTED") rejected = s.count;
//   });

//   const totalParticipants = pending + approved + rejected;

//   const revenue = approved * lottery.ticketPrice;

//   return {
//     lottery,

//     participants: {
//       meta: participantsMeta,
//       data: participants,
//     },

//     paymentProofs: {
//       meta: proofMeta,
//       data: paymentProofs,
//     },

//     stats: {
//       totalParticipants,
//       pending,
//       approved,
//       rejected,
//       revenue,
//     },
//   };
// };

const getLotteryDashboardByIdFromDB = async (
    id: string,
    query: any
) => {
    if (!id) throw new ApiError(400, "Lottery ID is required");

    const lottery = await Lottery.findById(id);

    if (!lottery) throw new ApiError(404, "Lottery not found");

    const type = query.type || "participants";

    /* ================= BASE QUERY ================= */
    const baseQuery = LotteryParticipant.find({
        lotteryId: id,
    }).populate("userId", "name email phone city");

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
            name: p.userId?.name,
            email: p.userId?.email,
            phone: p.userId?.phone,
            city: p.userId?.city,
        },
        status: p.status,
        amount: lottery.ticketPrice,
        createdAt: p.createdAt,
    }));

    /* ================= PAYMENT PROOFS VIEW ================= */
    const paymentProofs = rawData.map((p: any) => ({
        participantId: p._id,
        user: {
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
        rejected = 0;

    statsAgg.forEach((s) => {
        if (s._id === "PENDING") pending = s.count;
        if (s._id === "APPROVED") approved = s.count;
        if (s._id === "REJECTED") rejected = s.count;
    });

    const totalParticipants = pending + approved + rejected;

    const revenue = approved * lottery.ticketPrice;

    /* ================= RESPONSE SWITCH ================= */
    return {
        lottery,
        stats: {
            totalParticipants,
            pending,
            approved,
            rejected,
            revenue,
        },



        data:
            type === "proofs"
                ? paymentProofs
                : participants,
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
    getActiveLotteryFromDB,
    getLotteryByIdFromDB,
    getAllLotteriesFromDB,
    getSingleLotteryFromDB,
    updateLotteryStatusIntoDB,
    updateLotteryIntoDB,
    deleteLotteryFromDB,
    getLotteryDashboardByIdFromDB,
    getLotteryWinnersByLotteryIdFromDB,
};
