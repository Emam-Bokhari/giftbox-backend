import bcrypt from "bcrypt";
import { JwtPayload, Secret } from "jsonwebtoken";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { jwtHelper } from "../../../helpers/jwtHelper";
import { User } from "../user/user.model";
import { ResetToken } from "../resetToken/resetToken.model";
import generateOTP from "../../../util/generateOTP";
import { twilioService } from "../twilioService/sendOtpWithVerify";
import { IAuthResetPassword, IChangePassword } from "../../../types/auth";
import { emailTemplate } from "../../../shared/emailTemplate";
import { emailHelper } from "../../../helpers/emailHelper";

/* ================= NORMALIZER ================= */
export const normalizeIdentifier = (value: string) => value.trim().toLowerCase();

/* ================= FIND USER (HYBRID) ================= */
const findUserByIdentifier = (identifier: string, selectPassword = false) => {
  const id = identifier.trim().toLowerCase();

  const query = id.includes("@")
    ? User.findOne({ email: id })
    : User.findOne({ phone: id });

  if (selectPassword) {
    query.select("+password");
  }

  return query;
};

/* ================= LOGIN ================= */
const loginUserFromDB = async (payload: {
  identifier: string;
  password: string;
}) => {
  const { identifier, password } = payload;

  const user = await findUserByIdentifier(identifier).select("+password");

  if (!user) throw new ApiError(400, "User doesn't exist");

  if (!user.verified) {
    throw new ApiError(400, "Please verify your account first");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) throw new ApiError(400, "Invalid credentials");

  const token = jwtHelper.createToken(
    {
      id: user._id,
      role: user.role,
      email: user.email,
      phone: user.phone,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  user.password = undefined as any;

  return { token, user };
};

/* ================= FORGET PASSWORD ================= */
const forgetPasswordToDB = async (identifier: string) => {
  const user = await findUserByIdentifier(identifier);

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const otp = generateOTP();

  // save OTP in DB (common for both email & phone)
  user.authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
    isResetPassword: true,
  } as any;

  await user.save();

  /* ================= EMAIL FLOW ================= */
  if (user.email && identifier.includes("@")) {
    const value = {
      otp,
      email: user.email,
    };

    const emailData = emailTemplate.resetPassword(value);

    await emailHelper.sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
    });
  }

  /* ================= PHONE FLOW ================= */
  else {
    if (!user.countryCode || !user.phone) {
      throw new ApiError(400, "Country code or phone number missing for user");
    }



    await twilioService.sendOTPWithVerify(
      user.phone,
      user.countryCode
    );
  }

  return {
    message: "OTP sent successfully",
  };
};

// ================= VERIFY OTP =================
const verifyOtpToDB = async (payload: {
  identifier: string;
  code: string;
}) => {
  const user = await findUserByIdentifier(payload.identifier).select(
    "+authentication"
  );

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  /* ================= EMAIL OTP FLOW ================= */
  if (user.email && payload.identifier.includes("@")) {
    const isValid =
      user.authentication?.oneTimeCode === Number(payload.code) &&
      user.authentication?.expireAt &&
      new Date(user.authentication.expireAt) > new Date();

    if (!isValid) {
      throw new ApiError(400, "Invalid or expired OTP");
    }

    user.authentication = undefined as any;
    await user.save();

    return {
      message: "Email verified successfully",
    };
  }

  /* ================= PHONE OTP FLOW ================= */
  if (!user.countryCode || !user.phone) {
    throw new ApiError(400, "Country code or phone number missing for user");
  }

  const isApproved = await twilioService.verifyOTP(
    user.phone,
    payload.code,
    user.countryCode
  );

  if (!isApproved) {
    throw new ApiError(400, "Invalid OTP");
  }

  user.verified = true;
  user.authentication = undefined as any;

  await user.save();

  return {
    message: "Phone verified successfully",
  };
};

/* ================= RESET PASSWORD ================= */
const resetPasswordToDB = async (
  token: string,
  payload: IAuthResetPassword
) => {
  const { newPassword, confirmPassword } = payload;

  const isExistToken = await ResetToken.isExistToken(token);
  if (!isExistToken) throw new ApiError(401, "Invalid token");

  const isValid = await ResetToken.isExpireToken(token);
  if (!isValid) throw new ApiError(400, "Token expired");

  const user = await User.findById(isExistToken.user).select(
    "+authentication +password"
  );

  if (!user) throw new ApiError(400, "User not found");

  if (!user.authentication?.isResetPassword) {
    throw new ApiError(401, "Invalid reset request");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Password mismatch");
  }

  const isSame = await bcrypt.compare(newPassword, user.password);

  if (isSame) {
    throw new ApiError(400, "Cannot reuse old password");
  }

  user.password = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  user.authentication = undefined as any;

  await user.save();

  await ResetToken.findOneAndDelete({ token });

  return { message: "Password reset successful" };
};

/* ================= CHANGE PASSWORD ================= */
const changePasswordToDB = async (
  user: JwtPayload,
  payload: IChangePassword
) => {
  const dbUser = await User.findById(user.id).select("+password");

  if (!dbUser) throw new ApiError(400, "User not found");

  const isMatch = await bcrypt.compare(
    payload.currentPassword,
    dbUser.password
  );

  if (!isMatch) throw new ApiError(400, "Wrong password");

  if (payload.currentPassword === payload.newPassword) {
    throw new ApiError(400, "New password must be different");
  }

  if (payload.newPassword !== payload.confirmPassword) {
    throw new ApiError(400, "Password mismatch");
  }

  dbUser.password = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  await dbUser.save();

  return { message: "Password changed successfully" };
};

/* ================= REFRESH TOKEN ================= */
const newAccessTokenToUser = async (refreshToken: string) => {
  if (!refreshToken) throw new ApiError(400, "Token required");

  const decoded = jwtHelper.verifyToken(
    refreshToken,
    config.jwt.jwtRefreshSecret as Secret
  );

  const user = await User.findById(decoded.id);

  if (!user) throw new ApiError(401, "Unauthorized");

  const accessToken = jwtHelper.createToken(
    {
      id: user._id,
      role: user.role,
      phone: user.phone,
      email: user.email,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  return { accessToken };
};

/* ================= RESEND OTP ================= */
const resendOtpToDB = async (payload: {
  identifier: string;
}) => {
  const user = await findUserByIdentifier(payload.identifier);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const otp = generateOTP();

  // save OTP in DB (common for both email & phone)
  user.authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  } as any;

  await user.save();

  /* ================= EMAIL FLOW ================= */
  if (user.email && payload.identifier.includes("@")) {
    const value = {
      otp,
      email: user.email,
    };

    const emailData = emailTemplate.resetPassword(value);

    await emailHelper.sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
    });

    return {
      message: "OTP sent to email successfully",
    };
  }

  /* ================= PHONE FLOW ================= */
  if (!user.countryCode || !user.phone) {
    throw new ApiError(400, "Country code or phone number missing for user");
  }

  await twilioService.sendOTPWithVerify(
    user.phone,
    user.countryCode
  );

  return {
    message: "OTP sent to phone successfully",
  };
};

/* ================= DELETE USER ================= */
const deleteUserFromDB = async (
  user: JwtPayload,
  password: string
) => {
  const dbUser = await User.findById(user.id).select("+password");

  if (!dbUser) throw new ApiError(400, "User not found");

  const isMatch = await bcrypt.compare(password, dbUser.password);

  if (!isMatch) throw new ApiError(400, "Wrong password");

  await User.findByIdAndDelete(user.id);

  return { message: "Account deleted successfully" };
};

/* ================= EXPORT ================= */
export const AuthService = {
  loginUserFromDB,
  forgetPasswordToDB,
  verifyOtpToDB,
  resetPasswordToDB,
  changePasswordToDB,
  newAccessTokenToUser,
  resendOtpToDB,
  deleteUserFromDB,
};