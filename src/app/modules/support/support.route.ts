import express from "express";
import { USER_ROLES } from "../../../enums/user";
import auth from "../../middlewares/auth";
import { SupportControllers } from "./support.controller";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import parseAllFilesData from "../../middlewares/parseAllFileData";
import { FOLDER_NAMES } from "../../../enums/files";

const router = express.Router();

router
  .route("/")
  .post(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN),
    fileUploadHandler(),
    parseAllFilesData({
      fieldName: FOLDER_NAMES.ATTACHMENT,
      forceSingle: true,
    }),
    SupportControllers.submitSupportRequest,
  )
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    SupportControllers.getAllSupports,
  );

router
  .route("/:id/review")
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    SupportControllers.reviewSupportByAdmin,
  );

router
  .route("/:id")
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    SupportControllers.getSupportById,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    SupportControllers.deleteSupportById,
  );

export const SupportRoutes = router;
