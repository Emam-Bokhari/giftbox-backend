import express from "express";
import { AnalyticsControllers } from "./analytics.controller";

const router = express.Router();

router.get("/finance-and-payments-stats", AnalyticsControllers.getFinanceAndPaymentsStats);

router.get("/admin-dashboard-stats", AnalyticsControllers.getAdminDashboardStats);

router.get("/yearly-ticket-stats", AnalyticsControllers.getYearlyTicketStats);



export const AnalyticsRoutes = router;