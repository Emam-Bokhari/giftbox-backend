import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthService } from "./auth.service";
import { JwtPayload } from "jsonwebtoken";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";

// ================= LOGIN =================
const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUserFromDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "User login successfully",
    data: result,
  });
});

// ================= FORGET PASSWORD =================
const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.forgetPasswordToDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "OTP sent successfully",
    data: result,
  });
});

// ================= RESET PASSWORD =================
const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const token = req.headers.resettoken as string;

  const result = await AuthService.resetPasswordToDB(token, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Password reset successfully",
    data: result,
  });
});

// ================= CHANGE PASSWORD =================
const changePassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.changePasswordToDB(
    req.user as JwtPayload,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Password changed successfully",
  });
});

// ================= NEW ACCESS TOKEN =================
const newAccessToken = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.newAccessTokenToUser(req.body.token);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Access token generated successfully",
    data: result,
  });
});

// ================= RESEND OTP =================
const resendVerificationOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.resendVerificationOtpToDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "OTP sent successfully",
    data: result,
  });
});

// ================= DELETE USER =================
const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.deleteUserFromDB(
    req.user as JwtPayload,
    req.body.password
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Account deleted successfully",
    data: result,
  });
});

// ================= VERIFY PHONE OTP =================
const verifyPhone = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyPhoneToDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.message,
    data: result,
  });
});



export const AuthController = {
  loginUser,
  forgetPassword,
  resetPassword,
  changePassword,
  newAccessToken,
  resendVerificationOtp,
  deleteUser,
  verifyPhone,
};