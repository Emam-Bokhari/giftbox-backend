// import express from "express";
// import auth from "../../middlewares/auth";
// import validateRequest from "../../middlewares/validateRequest";
// import { AuthController } from "./auth.controller";
// import { AuthValidation } from "./auth.validation";
// import { USER_ROLES } from "../../../enums/user";

// const router = express.Router();

// /* ================= LOGIN ================= */
// router.post(
//   "/login",
//   validateRequest(AuthValidation.createLoginZodSchema),
//   AuthController.loginUser
// );

// /* ================= FORGET PASSWORD ================= */
// router.post(
//   "/forget-password",
//   validateRequest(AuthValidation.createForgetPasswordZodSchema),
//   AuthController.forgetPassword
// );

// /* ================= RESET PASSWORD ================= */
// router.post(
//   "/reset-password",
//   validateRequest(AuthValidation.createResetPasswordZodSchema),
//   AuthController.resetPassword
// );

// /* ================= CHANGE PASSWORD ================= */
// router.post(
//   "/change-password",
//   auth(
//     USER_ROLES.ADMIN,
//     USER_ROLES.USER,
//     USER_ROLES.SUPER_ADMIN
//   ),
//   validateRequest(AuthValidation.createChangePasswordZodSchema),
//   AuthController.changePassword
// );

// /* ================= VERIFY OTP (HYBRID EMAIL/PHONE) ================= */
// router.post(
//   "/verify-otp",
//   validateRequest(AuthValidation.createVerifyOtpZodSchema),
//   AuthController.verifyOtp
// );

// /* ================= RESEND OTP ================= */
// router.post(
//   "/resend-otp",
//   validateRequest(AuthValidation.createResendOtpZodSchema),
//   AuthController.resendOtp
// );

// /* ================= REFRESH TOKEN ================= */
// router.post(
//   "/refresh-token",
//   AuthController.newAccessToken
// );

// /* ================= DELETE ACCOUNT ================= */
// router.delete(
//   "/delete-account",
//   auth(
//     USER_ROLES.ADMIN,
//     USER_ROLES.USER,
//     USER_ROLES.SUPER_ADMIN
//   ),
//   AuthController.deleteUser
// );

// export const AuthRoutes = router;

import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";
import { USER_ROLES } from "../../../enums/user";
import rateLimit from "express-rate-limit";

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 3,
  message: "Too many OTP requests. Please try again later.",
});

router.post(
  "/login",
  validateRequest(AuthValidation.createLoginZodSchema),
  AuthController.loginUser,
);

router.post(
  "/forget-password",
  validateRequest(AuthValidation.createForgetPasswordZodSchema),
  AuthController.forgetPassword,
);

router.post("/reset-password", AuthController.resetPassword);

router.post(
  "/change-password",
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  // validateRequest(AuthValidation.createChangePasswordZodSchema),
  AuthController.changePassword,
);

router.post(
  "/verify-account",
  validateRequest(AuthValidation.createVerifyOtpZodSchema),
  AuthController.verifyOtp,
);

router.post(
  "/resend-otp",
  otpLimiter,
  validateRequest(AuthValidation.createResendOtpZodSchema),
  AuthController.resendOtp,
);

router.post("/refresh-token", AuthController.newAccessToken);

router.delete(
  "/delete-account",
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  AuthController.deleteUser,
);

export const AuthRoutes = router;
