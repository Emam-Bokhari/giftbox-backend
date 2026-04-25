import { z } from "zod";

/* ================= PHONE OTP VERIFY ================= */
const createVerifyPhoneZodSchema = z.object({
  body: z.object({
    phone: z.string({ required_error: "Phone is required" }),
    countryCode: z.string({ required_error: "Country code is required" }),
    code: z.string({ required_error: "OTP code is required" }),
  }),
});

/* ================= LOGIN ================= */
const createLoginZodSchema = z.object({
  body: z.object({
    phone: z.string({ required_error: "Phone is required" }),
    countryCode: z.string({ required_error: "Country code is required" }),
    password: z.string({ required_error: "Password is required" }),

    fcmToken: z.string().optional(),
    deviceId: z.string().optional(),
    deviceType: z.enum(["ios", "android", "web"]).optional(),
  }),
});

/* ================= FORGET PASSWORD ================= */
const createForgetPasswordZodSchema = z.object({
  body: z.object({
    phone: z.string({ required_error: "Phone is required" }),
    countryCode: z.string({ required_error: "Country code is required" }),
  }),
});

/* ================= RESET PASSWORD ================= */
const createResetPasswordZodSchema = z.object({
  body: z.object({
    newPassword: z.string({ required_error: "New password is required" }),
    confirmPassword: z.string({
      required_error: "Confirm password is required",
    }),
  }),
});

/* ================= CHANGE PASSWORD ================= */
const createChangePasswordZodSchema = z.object({
  body: z.object({
    currentPassword: z.string({
      required_error: "Current password is required",
    }),
    newPassword: z.string({
      required_error: "New password is required",
    }),
    confirmPassword: z.string({
      required_error: "Confirm password is required",
    }),
  }),
});

/* ================= RESEND OTP ================= */
const createResendOtpZodSchema = z.object({
  body: z.object({
    phone: z.string({ required_error: "Phone is required" }),
    countryCode: z.string({ required_error: "Country code is required" }),
  }),
});

export const AuthValidation = {
  createVerifyPhoneZodSchema,
  createLoginZodSchema,
  createForgetPasswordZodSchema,
  createResetPasswordZodSchema,
  createChangePasswordZodSchema,
  createResendOtpZodSchema,
};