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





export const LotteryParticipantServices = {
    createParticipantToDB,
};