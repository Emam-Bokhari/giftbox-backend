import express from "express";
import { LotteryControllers } from "./lottery.controller";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import validateRequest from "../../middlewares/validateRequest";
import { LotteryValidationSchema } from "./lottery.validation";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import parseAllFilesData from "../../middlewares/parseAllFileData";
import { FOLDER_NAMES } from "../../../enums/files";

const router = express.Router();

router.route("/")
    .post(auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN,),
        fileUploadHandler(),
        parseAllFilesData({ fieldName: FOLDER_NAMES.BANNER, forceSingle: true }),
        validateRequest(LotteryValidationSchema.createLotteryZodSchema),
        LotteryControllers.createLottery);

router.route("/active")
    .get(auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN,),
        LotteryControllers.getActiveLottery);

export const LotteryRoutes = router;
