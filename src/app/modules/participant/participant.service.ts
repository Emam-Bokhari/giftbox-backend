import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { Lottery } from "../lottery/lottery.model";
import { LotteryParticipant } from "./participant.model";
import { LOTTERY_STATUS } from "../lottery/lottery.constant";
import { TLotteryParticipant } from "./participant.interface";

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


const getLotteryDashboardByIdFromDB = async (id: string) => {
  if (!id) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Lottery ID is required");
  }

 // lottery details
  const lottery = await Lottery.findById(id);

  if (!lottery) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Lottery not found");
  }

  // participants
  const participants = await LotteryParticipant.find({
    lotteryId: id,
  })
    .populate("userId", "name email phone profileImage")
    .sort({ createdAt: -1 });

  // payment proofs
  const paymentProofs = participants.map((p) => ({
    participantId: p._id,
    user: p.userId,
    paymentProof: p.paymentProof,
    status: p.status,
  }));

  // stats
  const totalParticipants = participants.length;

  const pending = participants.filter(
    (p) => p.status === "PENDING"
  ).length;

  const approved = participants.filter(
    (p) => p.status === "APPROVED"
  ).length;

  const rejected = participants.filter(
    (p) => p.status === "REJECTED"
  ).length;

  return {
    lottery,
    participants,
    paymentProofs,
    stats: {
      totalParticipants,
      pending,
      approved,
      rejected,
    },
  };
};


export const LotteryParticipantServices = {
    createParticipantToDB,
    getLotteryDashboardByIdFromDB,
};