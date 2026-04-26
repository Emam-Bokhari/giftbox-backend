import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { Lottery } from "../lottery/lottery.model";
import { LotteryParticipant } from "./participant.model";
import { LOTTERY_STATUS } from "../lottery/lottery.constant";
import { TLotteryParticipant } from "./participant.interface";
import QueryBuilder from "../../builder/queryBuilder";
import { LOTTERY_PARTICIPANT_STATUS } from "./participant.constant";
import { notificationHelper } from "../../builder/pushNotification";
import {
  NOTIFICATION_REFERENCE_MODEL,
  NOTIFICATION_TYPE,
} from "../notification/notification.constant";
import { User } from "../user/user.model";
import { USER_ROLES } from "../../../enums/user";
import { sendNotifications } from "../../../helpers/notificationsHelper";

// const createParticipantToDB = async (payload: TLotteryParticipant) => {
//     const { lotteryId, userId, paymentProof } = payload;

//     // validation
//     if (!lotteryId || !userId || !paymentProof) {
//         throw new ApiError(StatusCodes.BAD_REQUEST, "Missing required fields");
//     }

//    // check lottery exists
//     const lottery = await Lottery.findById(lotteryId);

//     if (!lottery) {
//         throw new ApiError(StatusCodes.NOT_FOUND, "Lottery not found");
//     }

//     // check lottery status
//     if (lottery.status !== LOTTERY_STATUS.ACTIVE) {
//         throw new ApiError(
//             StatusCodes.BAD_REQUEST,
//             "Only active lottery can be joined"
//         );
//     }

//     // check participant already joined
//     const alreadyJoined = await LotteryParticipant.findOne({
//         lotteryId,
//         userId,
//     });

//     if (alreadyJoined) {
//         throw new ApiError(
//             StatusCodes.CONFLICT,
//             "You already joined this lottery"
//         );
//     }

//     const participant = await LotteryParticipant.create({
//         lotteryId,
//         userId,
//         paymentProof,
//         amount: lottery.ticketPrice,
//     });

//     return participant;
// };

const createParticipantToDB = async (payload: TLotteryParticipant) => {
  const { lotteryId, userId, paymentProof } = payload;

  if (!lotteryId || !userId || !paymentProof) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Missing required fields");
  }

  const lottery = await Lottery.findById(lotteryId);

  if (!lottery) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Lottery not found");
  }

  if (lottery.status !== LOTTERY_STATUS.ACTIVE) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Only active lottery can be joined",
    );
  }

  const alreadyJoined = await LotteryParticipant.findOne({
    lotteryId,
    userId,
  });

  if (alreadyJoined) {
    throw new ApiError(StatusCodes.CONFLICT, "You already joined this lottery");
  }

  const participant = await LotteryParticipant.create({
    lotteryId,
    userId,
    paymentProof,
    amount: lottery.ticketPrice,
  });

  // notifications
  const notifications: Promise<any>[] = [];

  // 1. admin notification
  const admin = await User.findOne({
    role: USER_ROLES.SUPER_ADMIN,
  }).select("_id");

  if (admin) {
    await sendNotifications({
      title: "New Lottery Participation",
      text: `A user just joined "${lottery.title}"`,
      receiver: admin._id.toString(),
      type: NOTIFICATION_TYPE.ADMIN,
      referenceId: participant._id.toString(),
      referenceModel: NOTIFICATION_REFERENCE_MODEL.LOTTERY_PARTICIPANT,
    });
  }

  // 2. participant notification
  notifications.push(
    notificationHelper.sendToUser(userId.toString(), {
      title: "Successfully Joined Lottery",
      body: `You are now part of "${lottery.title}"`,
      type: NOTIFICATION_TYPE.USER,
      data: {
        lotteryId: lottery._id.toString(),
      },
    }),
  );

  await Promise.allSettled(notifications);

  return participant;
};

const getMyParticipatedLotteriesFromDB = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const baseQuery = LotteryParticipant.find({ userId }).populate({
    path: "lotteryId",
    select: "title banner ticketPrice status startAt endAt",
  });

  const participantQuery = new QueryBuilder(baseQuery, query)
    .search(["status"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const rawData = await participantQuery.modelQuery;

  const meta = await participantQuery.countTotal();

  const data = rawData.map((p: any) => ({
    participantId: p._id,
    status: p.status,
    paymentProof: p.paymentProof,
    createdAt: p.createdAt,

    lottery: {
      id: p.lotteryId?._id,
      title: p.lotteryId?.title,
      banner: p.lotteryId?.banner,
      ticketPrice: p.lotteryId?.ticketPrice,
      status: p.lotteryId?.status,
      startAt: p.lotteryId?.startAt,
      endAt: p.lotteryId?.endAt,
    },

    amount: p.lotteryId?.ticketPrice,
  }));

  return {
    meta,
    data,
  };
};

const getMyParticipationDetailsFromDB = async (
  userId: string,
  participantId: string,
) => {
  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  if (!participantId) {
    throw new ApiError(400, "Participant ID is required");
  }

  const participant = await LotteryParticipant.findOne({
    _id: participantId,
    userId,
  }).populate({
    path: "lotteryId",
    select:
      "title description banner ticketPrice ticketNumber status mode startAt endAt",
  });

  if (!participant) {
    throw new ApiError(404, "Participation not found");
  }

  const lottery: any = participant.lotteryId;

  return {
    participantId: participant._id,
    status: participant.status,
    paymentProof: participant.paymentProof,
    createdAt: participant.createdAt,

    lottery: {
      id: lottery?._id,
      title: lottery?.title,
      description: lottery?.description,
      banner: lottery?.banner,
      ticketPrice: lottery?.ticketPrice,
      ticketNumber: lottery?.ticketNumber,
      status: lottery?.status,
      mode: lottery?.mode,
      startAt: lottery?.startAt,
      endAt: lottery?.endAt,
    },

    amount: lottery?.ticketPrice,
  };
};

// const updateParticipantStatusIntoDB = async (
//   id: string,
//   status: LOTTERY_PARTICIPANT_STATUS
// ) => {
//   if (!id) {
//     throw new ApiError(400, "Participant ID is required");
//   }

//   if (!status) {
//     throw new ApiError(400, "Status is required");
//   }

//   const participant = await LotteryParticipant.findById(id);

//   if (!participant) {
//     throw new ApiError(404, "Participant not found");
//   }

//   // prevent double finalization
//   if (
//     participant.status === LOTTERY_PARTICIPANT_STATUS.APPROVED ||
//     participant.status === LOTTERY_PARTICIPANT_STATUS.REJECTED
//   ) {
//     throw new ApiError(
//       400,
//       "This participant is already finalized"
//     );
//   }

//   // validate transition
//   const allowedTransitions = [
//     `${LOTTERY_PARTICIPANT_STATUS.PENDING}->${LOTTERY_PARTICIPANT_STATUS.APPROVED}`,
//     `${LOTTERY_PARTICIPANT_STATUS.PENDING}->${LOTTERY_PARTICIPANT_STATUS.REJECTED}`,
//   ];

//   const transition = `${participant.status}->${status}`;

//   if (!allowedTransitions.includes(transition)) {
//     throw new ApiError(
//       400,
//       `Invalid status transition: ${participant.status} → ${status}`
//     );
//   }

//   participant.status = status;

//   await participant.save();

//   return participant;
// };

const updateParticipantStatusIntoDB = async (
  id: string,
  status: LOTTERY_PARTICIPANT_STATUS,
) => {
  if (!id) {
    throw new ApiError(400, "Participant ID is required");
  }

  if (!status) {
    throw new ApiError(400, "Status is required");
  }

  const participant = await LotteryParticipant.findById(id).populate(
    "userId",
    "name",
  );

  if (!participant) {
    throw new ApiError(404, "Participant not found");
  }

  // prevent double finalization
  if (
    participant.status === LOTTERY_PARTICIPANT_STATUS.APPROVED ||
    participant.status === LOTTERY_PARTICIPANT_STATUS.REJECTED
  ) {
    throw new ApiError(400, "This participant is already finalized");
  }

  const allowedTransitions = [
    `${LOTTERY_PARTICIPANT_STATUS.PENDING}->${LOTTERY_PARTICIPANT_STATUS.APPROVED}`,
    `${LOTTERY_PARTICIPANT_STATUS.PENDING}->${LOTTERY_PARTICIPANT_STATUS.REJECTED}`,
  ];

  const transition = `${participant.status}->${status}`;

  if (!allowedTransitions.includes(transition)) {
    throw new ApiError(
      400,
      `Invalid status transition: ${participant.status} → ${status}`,
    );
  }

  participant.status = status;
  await participant.save();

  // notifications
  const notifications: Promise<any>[] = [];

  // 1. admin notification
  const admin = await User.findOne({
    role: USER_ROLES.SUPER_ADMIN,
  }).select("_id");

  if (admin) {
    await sendNotifications({
      title: "Lottery Participant Status Updated",
      text: `Lottery "${participant.lotteryId}" has been ${status.toLowerCase()}`,
      receiver: admin._id.toString(),
      type: NOTIFICATION_TYPE.ADMIN,
      referenceId: participant._id.toString(),
      referenceModel: NOTIFICATION_REFERENCE_MODEL.LOTTERY_PARTICIPANT,
    });
  }

  // 2. participant notification
  notifications.push(
    notificationHelper.sendToUser(participant.userId.toString(), {
      title:
        status === LOTTERY_PARTICIPANT_STATUS.APPROVED
          ? "Approved for Lottery"
          : "Lottery Request Rejected",
      body:
        status === LOTTERY_PARTICIPANT_STATUS.APPROVED
          ? `You have been approved for "${participant.lotteryId}"`
          : `Your lottery participation was rejected`,
      type: NOTIFICATION_TYPE.USER,
      data: {
        participantId: participant._id.toString(),
        status,
      },
    }),
  );

  await Promise.allSettled(notifications);

  return participant;
};

export const LotteryParticipantServices = {
  createParticipantToDB,
  getMyParticipatedLotteriesFromDB,
  getMyParticipationDetailsFromDB,
  updateParticipantStatusIntoDB,
};
