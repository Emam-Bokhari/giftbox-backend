import express from "express";
import { USER_ROLES } from "../../../enums/user";
import { BannerController } from "./banner.controller";
import { FOLDER_NAMES } from "../../../enums/files";
import auth from "../../middlewares/auth";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import validateRequest from "../../middlewares/validateRequest";
import parseAllFilesData from "../../middlewares/parseAllFileData";
import { BannerZodValidation } from "./banner.validation";

const router = express.Router();

router
  .route("/")
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    parseAllFilesData({ fieldName: FOLDER_NAMES.IMAGE, forceSingle: true }),
    validateRequest(BannerZodValidation.createBannerValidationSchema),
    BannerController.createBanner,
  )
  .get(BannerController.getBannersFromDB);

router.patch(
  "/status/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  BannerController.updateBannerStatus,
);

router
  .route("/:id")
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    parseAllFilesData({ fieldName: FOLDER_NAMES.IMAGE, forceSingle: true }),
    BannerController.updateBanner,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    BannerController.deleteBanner,
  );

router.get(
  "/all",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  BannerController.getAllBanner,
);

export const BannerRoutes = router;
