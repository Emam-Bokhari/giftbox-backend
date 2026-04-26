import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { WinnerServices } from "./winner.service";

const drawLotteryWinners = catchAsync(
    async (req, res) => {
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
    }
);

export const WinnerControllers = {
    drawLotteryWinners,
}