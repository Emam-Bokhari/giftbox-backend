import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import { JwtPayload, Secret } from "jsonwebtoken";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { jwtHelper } from "../../../helpers/jwtHelper";
import {
  IAuthResetPassword,
  IChangePassword,
} from "../../../types/auth";
import { User } from "../user/user.model";
import cryptoToken from "../../../util/cryptoToken";
import { ResetToken } from "../resetToken/resetToken.model";
import generateOTP from "../../../util/generateOTP";
import { twilioService } from "../twilioService/sendOtpWithVerify";
const loginUserFromDB = async (payload: {
  phone: string;
  countryCode: string;
  password: string;
}) => {
  const { phone, countryCode, password } = payload;

  //  normalize
  const normalizedPhone = phone.trim();
  const normalizedCode = countryCode.trim();

  //  find user by phone + countryCode
  const user = await User.findOne({
    phone: normalizedPhone,
    countryCode: normalizedCode,
  }).select("+password");

  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (!user.verified) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Please verify your account first"
    );
  }

  const isMatch = await User.isMatchPassword(
    password,
    user.password
  );

  if (!isMatch) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Password is incorrect"
    );
  }

  const accessToken = jwtHelper.createToken(
    {
      id: user._id,
      role: user.role,
      phone: user.phone,
      countryCode: user.countryCode,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  // never return password
  user.password = undefined as any;

  return {
    token: accessToken,
    user,
  };
};

// ========================== forget password ===========================
const forgetPasswordToDB = async (payload: {
  phone: string;
  countryCode: string;
}) => {
  const { phone, countryCode } = payload;

  // normalize
  const normalizedPhone = phone.trim();
  const normalizedCode = countryCode.trim();

  //  find user
  const user = await User.findOne({
    phone: normalizedPhone,
    countryCode: normalizedCode,
  });

  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //  optional: block unverified users
  if (!user.verified) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Please verify your account first"
    );
  }

  //  generate OTP
  const otp = generateOTP();

  //  send OTP via SMS (Twilio or any service)
  await twilioService.sendOTPWithVerify(normalizedPhone, normalizedCode);

  //  save OTP in DB (fallback verification)
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000), // 3 minutes
    isResetPassword: true,
  };

  await User.findByIdAndUpdate(user._id, {
    $set: { authentication },
  });

  return {
    message: "OTP sent successfully",
  };
};

// ======================================= verify phone otp============================
const verifyPhoneToDB = async (payload: {
  phone: string;
  code: string;
  countryCode: string;
}) => {
  const { phone, code, countryCode } = payload;

  const normalizedPhone = phone.trim();
  const normalizedCode = countryCode.trim();

  //  find user properly (phone + countryCode)
  const user = await User.findOne({
    phone: normalizedPhone,
    countryCode: normalizedCode,
  }).select("+authentication");

  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User not found");
  }

  //  verify OTP (Twilio)
  const isApproved = await twilioService.verifyOTP(
    normalizedPhone,
    code,
    normalizedCode
  );

  if (!isApproved) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid or expired OTP");
  }

  //  CASE 1: Phone verification (signup)
  if (!user.verified) {
    user.verified = true;

    // clear auth data
    user.authentication = undefined as any;

    await user.save();

    const token = jwtHelper.createToken(
      {
        id: user._id,
        role: user.role,
        phone: user.phone,
        countryCode: user.countryCode,
      },
      config.jwt.jwt_secret as Secret,
      config.jwt.jwt_expire_in as string
    );

    return {
      message: "Phone verified successfully",
      token,
      user,
    };
  }

  // CASE 2: Forgot password flow
  const resetToken = cryptoToken();

  await ResetToken.create({
    user: user._id,
    token: resetToken,
    expireAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  // clear OTP data
  user.authentication = {
    isResetPassword: true,
    oneTimeCode: null,
    expireAt: null,
  } as any;

  await user.save();

  return {
    message: "OTP verified. Use reset token to change password",
    resetToken,
  };
};

const resetPasswordToDB = async (
  token: string,
  payload: IAuthResetPassword
) => {
  const { newPassword, confirmPassword } = payload;

  // check token existence
  const isExistToken = await ResetToken.isExistToken(token);
  if (!isExistToken) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid reset token");
  }

  //  check token expiry
  const isValid = await ResetToken.isExpireToken(token);
  if (!isValid) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Token expired, please request again"
    );
  }

  //  find user
  const user = await User.findById(isExistToken.user).select("+authentication");

  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User not found");
  }

  // permission check (must come from forgot password flow)
  if (!user.authentication?.isResetPassword) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "Reset permission denied. Please request forgot password again"
    );
  }

  // password match check
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Passwords do not match"
    );
  }

  // optional: prevent same password reuse
  const isSamePassword = await User.isMatchPassword(
    newPassword,
    user.password as string
  );

  if (isSamePassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "New password must be different from old password"
    );
  }

  //  hash password
  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  // update user
  user.password = hashedPassword;
  user.authentication = undefined as any;

  await user.save();

  // 🔹 delete used token (VERY IMPORTANT)
  await ResetToken.findOneAndDelete({ token });

  return {
    message: "Password reset successfully",
  };
};

const changePasswordToDB = async (
  user: JwtPayload,
  payload: IChangePassword
) => {
  const { currentPassword, newPassword, confirmPassword } = payload;

  // find user
  const isExistUser = await User.findById(user.id).select("+password");

  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //  current password required
  if (!currentPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Current password is required"
    );
  }

  //  match current password
  const isMatch = await User.isMatchPassword(
    currentPassword,
    isExistUser.password
  );

  if (!isMatch) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Password is incorrect");
  }

  //  new vs current
  if (currentPassword === newPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "New password must be different from current password"
    );
  }

  //  confirm password check
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Passwords do not match"
    );
  }

  //  optional: prevent reuse (extra safe)
  const isSamePassword = await User.isMatchPassword(
    newPassword,
    isExistUser.password
  );

  if (isSamePassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You cannot reuse your old password"
    );
  }

  //  set new password (IMPORTANT: use save to trigger pre hook)
  isExistUser.password = newPassword;

  await isExistUser.save();

  return {
    message: "Password changed successfully",
  };
};

const newAccessTokenToUser = async (refreshToken: string) => {
  // check token
  if (!refreshToken) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Refresh token is required!");
  }

  let decoded;

  try {
    decoded = jwtHelper.verifyToken(
      refreshToken,
      config.jwt.jwtRefreshSecret as Secret
    );
  } catch (error) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid or expired token");
  }

  //  find user
  const user = await User.findById(decoded?.id);

  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized access");
  }

  //  optional: block inactive users
  if (user.status !== "ACTIVE") {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User is not active");
  }

  //  create new access token phone countryCode payload
  const accessToken = jwtHelper.createToken(
    {
      id: user._id,
      role: user.role,
      phone: user.phone,
      countryCode: user.countryCode,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  return { accessToken };
};

// ==================resend otp phone =======================
const resendVerificationOtpToDB = async (payload: {
  phone: string;
  countryCode: string;
}) => {
  const { phone, countryCode } = payload;

  const normalizedPhone = phone.trim();
  const normalizedCode = countryCode.trim();

  // find user by phone
  const user = await User.findOne({
    phone: normalizedPhone,
    countryCode: normalizedCode,
  }).select("+authentication");

  if (!user) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "User does not exist!"
    );
  }

  //  already verified check
  if (user.verified) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "User is already verified!"
    );
  }

  //  generate OTP
  const otp = generateOTP();

  //  update authentication
  user.authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60 * 1000),
  } as any;

  await user.save();

  //  send OTP via SMS
  await twilioService.sendOTPWithVerify(
    normalizedPhone,
    normalizedCode,
  );

  return {
    message: "OTP sent successfully",
  };
};

const deleteUserFromDB = async (
  user: JwtPayload,
  password: string
) => {
  //  find user
  const isExistUser = await User.findById(user.id).select("+password");

  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //  password mandatory (IMPORTANT FIX)
  if (!password) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Password is required to delete account"
    );
  }

  //  check password
  const isMatch = await User.isMatchPassword(
    password,
    isExistUser.password!
  );

  if (!isMatch) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Password is incorrect"
    );
  }

  //  optional safety check
  if (!isExistUser.verified) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Unverified account cannot be deleted"
    );
  }

  //  delete user (hard delete)
  await User.findByIdAndDelete(user.id);

  return {
    message: "User deleted successfully",
  };
};



export const AuthService = {
  loginUserFromDB,
  forgetPasswordToDB,
  resetPasswordToDB,
  verifyPhoneToDB,
  changePasswordToDB,
  newAccessTokenToUser,
  resendVerificationOtpToDB,
  deleteUserFromDB,
};
