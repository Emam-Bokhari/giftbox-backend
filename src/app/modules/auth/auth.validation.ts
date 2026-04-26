// import { z } from "zod";

// /* ================= IDENTIFIER (EMAIL OR PHONE) ================= */
// const identifierSchema = z.string({
//   required_error: "Email or phone is required",
// });

// /* ================= OTP VERIFY ================= */
// const createVerifyOtpZodSchema = z.object({
//   body: z.object({
//     identifier: identifierSchema,
//     code: z.string({ required_error: "OTP code is required" }),
//   }),
// });

// /* ================= LOGIN ================= */
// const createLoginZodSchema = z.object({
//   body: z.object({
//     identifier: identifierSchema,
//     password: z.string({ required_error: "Password is required" }),

//     fcmToken: z.string().optional(),
//     deviceId: z.string().optional(),
//     deviceType: z.enum(["ios", "android", "web"]).optional(),
//   }),
// });

// /* ================= FORGET PASSWORD ================= */
// const createForgetPasswordZodSchema = z.object({
//   body: z.object({
//     identifier: identifierSchema,
//   }),
// });

// /* ================= RESET PASSWORD ================= */
// const createResetPasswordZodSchema = z.object({
//   body: z.object({
//     newPassword: z.string({ required_error: "New password is required" }),
//     confirmPassword: z.string({
//       required_error: "Confirm password is required",
//     }),
//   }),
// });

// /* ================= CHANGE PASSWORD ================= */
// const createChangePasswordZodSchema = z.object({
//   body: z.object({
//     currentPassword: z.string({
//       required_error: "Current password is required",
//     }),
//     newPassword: z.string({
//       required_error: "New password is required",
//     }),
//     confirmPassword: z.string({
//       required_error: "Confirm password is required",
//     }),
//   }),
// });

// /* ================= RESEND OTP ================= */
// const createResendOtpZodSchema = z.object({
//   body: z.object({
//     identifier: identifierSchema,
//   }),
// });

// export const AuthValidation = {
//   createVerifyOtpZodSchema,
//   createLoginZodSchema,
//   createForgetPasswordZodSchema,
//   createResetPasswordZodSchema,
//   createChangePasswordZodSchema,
//   createResendOtpZodSchema,
// };

import { z } from "zod";

const identifierSchema = z
  .string({ required_error: "Email or phone is required" })
  .min(3)
  .max(100);

const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(6)
  .max(100)
  .regex(/[A-Z]/, "Must contain uppercase letter")
  .regex(/[a-z]/, "Must contain lowercase letter")
  .regex(/[0-9]/, "Must contain number");

const createVerifyOtpZodSchema = z.object({
  body: z.object({
    identifier: identifierSchema,
    code: z
      .string({ required_error: "OTP code is required" })
      .min(4)
      .max(6)
      .regex(/^\d+$/, "OTP must contain only numbers"),
  }),
});

const createLoginZodSchema = z.object({
  body: z.object({
    identifier: identifierSchema,
    password: z.string({ required_error: "Password is required" }),

    fcmToken: z.string().optional(),
    deviceId: z.string().optional(),
    deviceType: z.enum(["ios", "android", "web"]).optional(),
  }),
});

const createForgetPasswordZodSchema = z.object({
  body: z.object({
    identifier: identifierSchema,
  }),
});

const createResetPasswordZodSchema = z.object({
  body: z
    .object({
      newPassword: passwordSchema,
      confirmPassword: passwordSchema,
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
});

const createChangePasswordZodSchema = z.object({
  body: z
    .object({
      currentPassword: passwordSchema,
      newPassword: passwordSchema,
      confirmPassword: passwordSchema,
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
});

const createResendOtpZodSchema = z.object({
  body: z.object({
    identifier: identifierSchema,
  }),
});

export const AuthValidation = {
  createVerifyOtpZodSchema,
  createLoginZodSchema,
  createForgetPasswordZodSchema,
  createResetPasswordZodSchema,
  createChangePasswordZodSchema,
  createResendOtpZodSchema,
};
