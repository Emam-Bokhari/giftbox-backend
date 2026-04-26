import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { AnalyticsServices } from "./analytics.service";

const getFinanceAndPaymentsStats = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getFinanceAndPaymentsStatsFromDB(
    req.query,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    data: result,
  });
});

const getAdminDashboardStats = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getAdminDashboardStatsFromDB();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    data: result,
  });
});

const getYearlyTicketStats = catchAsync(async (req, res) => {
  const { year } = req.query;
  const yearNumber = Number(year);
  const result = await AnalyticsServices.getYearlyTicketStatsFromDB(yearNumber);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    data: result,
  });
});

const getYearlyRevenueStats = catchAsync(async (req, res) => {
  const { year } = req.query;
  const yearNumber = Number(year);
  const result =
    await AnalyticsServices.getYearlyRevenueStatsFromDB(yearNumber);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    data: result,
  });
});

export const AnalyticsControllers = {
  getFinanceAndPaymentsStats,
  getAdminDashboardStats,
  getYearlyTicketStats,
  getYearlyRevenueStats,
};
