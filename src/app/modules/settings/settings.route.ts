import express from "express";
import { SettingsControllers } from "./settings.controller";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import validateRequest from "../../middlewares/validateRequest";
import { SettingsValidationSchema } from "./settings.validation";

const router = express.Router();

router
  .route("/")
  .get(SettingsControllers.getSettings)
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(SettingsValidationSchema.settingsValidationSchema),
    SettingsControllers.createOrUpdateSettings,
  );

export const SettingsRoutes = router;
