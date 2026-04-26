import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { Lottery } from "../lottery/lottery.model";
import { LotteryParticipant } from "./participant.model";
import { LOTTERY_STATUS } from "../lottery/lottery.constant";
import { TLotteryParticipant } from "./participant.interface";
import QueryBuilder from "../../builder/queryBuilder";

const createParticipantToDB = async (payload: TLotteryParticipant) => {
    const { lotteryId, userId, paymentProof } = payload;

    // validation
    if (!lotteryId || !userId || !paymentProof) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Missing required fields");
    }

   // check lottery exists
    const lottery = await Lottery.findById(lotteryId);

    if (!lottery) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Lottery not found");
    }

    // check lottery status
    if (lottery.status !== LOTTERY_STATUS.ACTIVE) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            "Only active lottery can be joined"
        );
    }

    // check participant already joined
    const alreadyJoined = await LotteryParticipant.findOne({
        lotteryId,
        userId,
    });

    if (alreadyJoined) {
        throw new ApiError(
            StatusCodes.CONFLICT,
            "You already joined this lottery"
        );
    }

    const participant = await LotteryParticipant.create({
        lotteryId,
        userId,
        paymentProof
    });

    return participant;
};

const getMyParticipatedLotteriesFromDB = async (
  userId: string,
  query: Record<string, unknown>
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
  participantId: string
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
      "title description banner ticketPrice status mode startAt endAt",
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
      status: lottery?.status,
      mode: lottery?.mode,
      startAt: lottery?.startAt,
      endAt: lottery?.endAt,
    },

    amount: lottery?.ticketPrice,
  };
};

export const LotteryParticipantServices = {
    createParticipantToDB,
    getMyParticipatedLotteriesFromDB,
    getMyParticipationDetailsFromDB,
};