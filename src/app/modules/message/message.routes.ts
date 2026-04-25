import express from "express";
import { MessageController } from "./message.controller";
import { USER_ROLES } from "../../../enums/user";
import { FOLDER_NAMES } from "../../../enums/files";
import auth from "../../middlewares/auth";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import parseAllFilesData from "../../middlewares/parseAllFileData";
const router = express.Router();

// Existing routes
router.post(
  "/send-message/:chatId",
  auth(
    USER_ROLES.USER,
    USER_ROLES.HOST,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
  ),
  fileUploadHandler(),
  parseAllFilesData({ fieldName: FOLDER_NAMES.IMAGE, forceSingle: true }),
  MessageController.sendMessage,
);

router.get(
  "/:chatId",
  auth(
    USER_ROLES.USER,
    USER_ROLES.HOST,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
  ),
  MessageController.getMessages,
);

router.delete(
  "/delete/:messageId",
  auth(
    USER_ROLES.USER,
    USER_ROLES.HOST,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
  ),
  MessageController.deleteMessage,
);

// New route for pin/unpin message
router.patch(
  "/pin-unpin/:messageId",
  auth(
    USER_ROLES.USER,
    USER_ROLES.HOST,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
  ),
  MessageController.pinUnpinMessage,
);

export const MessageRoutes = router;
