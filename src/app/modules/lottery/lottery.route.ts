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

router
  .route("/active")
  .get(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    LotteryControllers.getActiveLottery,
  );

router
  .route("/active/:id")
  .get(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    LotteryControllers.getLotteryById,
  );

router
  .route("/")
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    parseAllFilesData({
      fieldName: FOLDER_NAMES.BANNER,
      forceSingle: true,
    }),
    validateRequest(LotteryValidationSchema.createLotteryZodSchema),
    LotteryControllers.createLottery,
  )
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    LotteryControllers.getAllLotteries,
  );

router
  .route("/:id/status")
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    LotteryControllers.updateLotteryStatus,
  );

router.get(
  "/:id/dashboard",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  LotteryControllers.getLotteryDashboardById,
);

router.get(
  "/:id/winners",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.USER),
  LotteryControllers.getLotteryWinnersByLotteryId,
);

router
  .route("/:id")
  .get(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    LotteryControllers.getSingleLottery,
  )
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    parseAllFilesData({
      fieldName: FOLDER_NAMES.BANNER,
      forceSingle: true,
    }),
    LotteryControllers.updateLottery,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    LotteryControllers.deleteLottery,
  );

export const LotteryRoutes = router;
