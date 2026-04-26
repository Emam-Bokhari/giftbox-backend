import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { LotteryParticipantServices } from "./participant.service";

const createParticipant = catchAsync(async (req, res) => {
    const { id: userId } = req.user;

    const result = await LotteryParticipantServices.createParticipantToDB({
        ...req.body,
        userId,
    });

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Successfully joined lottery",
        data: result,
    });
});

const getMyParticipatedLotteries = catchAsync(
  async (req, res) => {
    const userId = req.user?.id;

    const result =
      await LotteryParticipantServices.getMyParticipatedLotteriesFromDB(
        userId,
        req.query
      );

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "My participated lotteries fetched successfully",
      data: result,
    });
  }
);

export const ParticipantControllers = {
    createParticipant,
    getMyParticipatedLotteries,
}
