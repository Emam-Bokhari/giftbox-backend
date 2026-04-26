import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { AnalyticsServices } from "./analytics.service";

const getFinanceAndPaymentsStats = catchAsync(async (req, res) => {
    const result = await AnalyticsServices.getFinanceAndPaymentsStatsFromDB();
    sendResponse(res, {
        statusCode: 200,
        success: true,
        data: result,
    })
})

export const AnalyticsControllers={
    getFinanceAndPaymentsStats,
}