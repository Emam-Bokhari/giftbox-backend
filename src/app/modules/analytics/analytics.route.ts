import express from "express";
import { AnalyticsControllers } from "./analytics.controller";

const router = express.Router();

router.get("/finance-and-payments-stats", AnalyticsControllers.getFinanceAndPaymentsStats);

export const AnalyticsRoutes = router;