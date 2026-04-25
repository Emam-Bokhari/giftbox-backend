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

const getActiveLottery = catchAsync(async (req, res) => {
    const activeLottery = await LotteryServices.getActiveLotteryFromDB();
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Active lottery found successfully",
        data: activeLottery,
    })
})

const getLotteryById = catchAsync(async (req, res) => {
    const {id} = req.params;
    const lottery = await LotteryServices.getLotteryByIdFromDB(id);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Lottery found successfully",
        data: lottery,
    })
})

export const LotteryControllers = {
    createLottery,
    getActiveLottery,
    getLotteryById,
}