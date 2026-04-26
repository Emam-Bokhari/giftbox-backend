import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";

import validateRequest from "../../middlewares/validateRequest";
import { ParticipantControllers } from "./participant.controller";
import { ParticipantValidationSchema } from "./participant.validation";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import parseAllFilesData from "../../middlewares/parseAllFileData";
import { FOLDER_NAMES } from "../../../enums/files";

const router = express.Router();

router.route("/").post(
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  fileUploadHandler(),
  parseAllFilesData({
    fieldName: FOLDER_NAMES.PAYMENT_PROOF,
    forceSingle: true,
  }),
  validateRequest(
    ParticipantValidationSchema.createLotteryParticipantZodSchema,
  ),
  ParticipantControllers.createParticipant,
);

router
  .route("/my-participated")
  .get(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    ParticipantControllers.getMyParticipatedLotteries,
  );

router.get(
  "/my-participations/:id",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ParticipantControllers.getMyParticipationDetails,
);

router.patch(
  "/:id/status",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(ParticipantValidationSchema.updateStatusZodSchema),
  ParticipantControllers.updateParticipantStatus,
);

export const LotteryParticipantRoutes = router;
