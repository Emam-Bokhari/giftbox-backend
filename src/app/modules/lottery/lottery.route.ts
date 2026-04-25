import express from "express";
import { LotteryControllers } from "./lottery.controller";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import validateRequest from "../../middlewares/validateRequest";
import { LotteryValidationSchema } from "./lottery.validation";

const router = express.Router();

router.route("/")
    .post(auth(USER_ROLES.USER), validateRequest(LotteryValidationSchema.createLotteryZodSchema), LotteryControllers.createLottery);

export const LotteryRoutes = router;
