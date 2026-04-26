import { FOLDER_NAMES } from "./../../../enums/files";
import express from "express";
import { USER_ROLES } from "../../../enums/user";
import { UserController } from "./user.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import parseAllFilesData from "../../middlewares/parseAllFileData";
import { UserValidationSchema } from "./user.validation";

const router = express.Router();

const requireAdminOrSuperAdmin = auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN);
const requireSuperAdmin = auth(USER_ROLES.SUPER_ADMIN);
const requireUser = auth(USER_ROLES.USER);
const requireAnyUser = auth(
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.USER,
);

/* ---------------------------- PROFILE ROUTES ---------------------------- */
router
  .route("/profile")
  .get(requireAnyUser, UserController.getUserProfile)
  .delete(requireUser, UserController.deleteProfile);

/* ---------------------------- ADMIN CREATE ------------------------------ */
router.post(
  "/create-admin",
  requireSuperAdmin,
  validateRequest(UserValidationSchema.createUserZodSchema),
  UserController.createAdmin,
);

/* ---------------------------- ADMINS LIST ------------------------------- */
router.get("/admins", requireSuperAdmin, UserController.getAdmin);
router.delete("/admins/:id", requireSuperAdmin, UserController.deleteAdmin);

/* ---------------------------- USER CREATE & UPDATE ---------------------- */
router
  .route("/")
  .post(UserController.createUser)
  .get(requireAdminOrSuperAdmin, UserController.getAllUsers)
  .patch(
    requireAnyUser,
    fileUploadHandler(),
    parseAllFilesData(
      {
        fieldName: FOLDER_NAMES.PROFILE_IMAGE,
        forceSingle: true,
      },
      {
        fieldName: FOLDER_NAMES.COVER_IMAGE,
        forceSingle: true,
      },
    ),
    UserController.updateProfile,
  );

/* ---------------------------- STATUS UPDATE ----------------------------- */
router.patch(
  "/admin/status/:id",
  requireAdminOrSuperAdmin,
  UserController.updateAdminStatusById,
);
router.patch(
  "/status/:id",
  requireAdminOrSuperAdmin,
  UserController.updateUserStatusById,
);

/* ---------------------------- DYNAMIC USER ID ROUTES (KEEP LAST!) ------- */
router
  .route("/:id")
  .get(requireAdminOrSuperAdmin, UserController.getUserById)
  .delete(requireAdminOrSuperAdmin, UserController.deleteUserById);

export const UserRoutes = router;
