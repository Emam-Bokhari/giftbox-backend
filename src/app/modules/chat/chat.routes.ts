import { Router } from "express";
import { ChatController } from "./chat.controller";
import { USER_ROLES } from "../../../enums/user";
import auth from "../../middlewares/auth";

const router = Router();

router.get(
  "/",
  auth(
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.USER,
    USER_ROLES.HOST,
  ),
  ChatController.getChats,
);

router.get(
  "/:chatId/images",
  auth(
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.USER,
    USER_ROLES.HOST,
  ),
  ChatController.getChatImages,
);

router.post(
  "/create-chat",
  auth(
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.USER,
    USER_ROLES.HOST,
  ),
  ChatController.createChat,
);

router.patch(
  "/mark-chat-as-read/:id",
  auth(
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.USER,
    USER_ROLES.HOST,
  ),
  ChatController.markChatAsRead,
);

router.delete(
  "/delete/:chatId",
  auth(
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.USER,
    USER_ROLES.HOST,
  ),
  ChatController.deleteChat,
);

export const ChatRoutes = router;
