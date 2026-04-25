import { z } from "zod";
import { GENDER, STATUS, USER_ROLES } from "../../../enums/user";

// location schema
const locationSchema = z.object({
  type: z.literal("Point").optional(),
  coordinates: z
    .array(z.number())
    .length(2, "Coordinates must be [longitude, latitude]")
    .optional(),
  address: z.string().optional(),
});

// authentication schema (optional, internal mostly)
const authenticationSchema = z.object({
  isResetPassword: z.boolean().optional(),
  oneTimeCode: z.number().nullable().optional(),
  expireAt: z.date().nullable().optional(),
  authType: z.string().nullable().optional(),
});

//  create user
const createUserZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }),

    role: z.enum([...Object.values(USER_ROLES)] as [string, ...string[]]).optional(),

    email: z.string().email().optional(),

    profileImage: z.string().optional(),
    coverImage: z.string().optional(),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .optional(),

    status: z.enum([...Object.values(STATUS)] as [string, ...string[]]).optional(),

    phone: z.string({ required_error: "Phone is required" }),

    countryCode: z.string().optional(),

    city: z.string({ required_error: "City is required" }),

    gender: z.enum([...Object.values(GENDER)] as [string, ...string[]]).optional(),

    firebaseUid: z.string().optional(),

    deviceToken: z.string().optional(),

    verified: z.boolean().optional(),

    location: locationSchema.optional(),

    authentication: authenticationSchema.optional(),
  }),
});

const updateUserZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    role: z.enum([...Object.values(USER_ROLES)] as [string, ...string[]]).optional(),
    email: z.string().email().optional(),
    profileImage: z.string().optional(),
    coverImage: z.string().optional(),
    password: z.string().min(8).optional(),
    status: z.enum([...Object.values(STATUS)] as [string, ...string[]]).optional(),
    phone: z.string().optional(),
    countryCode: z.string().optional(),
    city: z.string().optional(),
    gender: z.enum([...Object.values(GENDER)] as [string, ...string[]]).optional(),
    firebaseUid: z.string().optional(),
    deviceToken: z.string().optional(),
    verified: z.boolean().optional(),
    location: locationSchema.optional(),
  }),
});

export const UserValidationSchema = {
  createUserZodSchema,
  updateUserZodSchema,
}