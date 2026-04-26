import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { WinnerServices } from "./winner.service";

const drawLotteryWinners = catchAsync(async (req, res) => {
  const { lotteryId, mode, winnerCount, selectedUserIds } = req.body;

  const result = await WinnerServices.drawLotteryWinnersIntoDB({
    lotteryId,
    mode,
    winnerCount,
    selectedUserIds,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Winners drawn successfully",
    data: result,
  });
});

const getLotteryDrawHistoryById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await WinnerServices.getLotteryDrawHistoryByIdFromDB(
    id,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Lottery draw history fetched successfully",
    data: result,
  });
});

const getLotteryDrawHistory = catchAsync(async (req, res) => {
  const result = await WinnerServices.getLotteryDrawHistoryFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Lottery draw history fetched successfully",
    data: result,
  });
});

export const WinnerControllers = {
  drawLotteryWinners,
  getLotteryDrawHistoryById,
  getLotteryDrawHistory,
};
