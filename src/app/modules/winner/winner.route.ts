import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import validateRequest from "../../middlewares/validateRequest";
import { WinnerControllers } from "./winner.controller";
import { WinnerValidationSchema } from "./winner.validation";

const router = express.Router();

router.post(
  "/draw-winners",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(WinnerValidationSchema.drawWinnerZodSchema),
  WinnerControllers.drawLotteryWinners,
);

router.get(
  "/draw-history",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  WinnerControllers.getLotteryDrawHistory,
);

router.get(
  "/draw-history/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  WinnerControllers.getLotteryDrawHistoryById,
);

export const WinnerRoutes = router;
