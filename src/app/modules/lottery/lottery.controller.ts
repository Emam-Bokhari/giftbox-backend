import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { LotteryServices } from "./lottery.service";

const createLottery = catchAsync(async (req, res) => {
    const data = req.body;
    const result = await LotteryServices.createLotteryToDB(data);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Lottery created successfully",
        data: result,
    })
})

export const LotteryControllers = {
    createLottery,
}