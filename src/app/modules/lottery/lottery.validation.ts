import { z } from "zod";
import { LOTTERY_MODE, LOTTERY_STATUS } from "./lottery.constant";

const createLotteryZodSchema = z.object({
  body: z.object({
    ticketNumber: z.string().trim().optional(),

    title: z
      .string({
        required_error: "Title is required",
      })
      .min(1, "Title cannot be empty")
      .trim(),

    description: z
      .string({
        required_error: "Description is required",
      })
      .min(1, "Description cannot be empty"),

    banner: z.string({
      required_error: "Banner is required",
    }),

    ticketPrice: z
      .number({
        required_error: "Ticket price is required",
        invalid_type_error: "Ticket price must be a number",
      })
      .nonnegative("Ticket price must be 0 or greater"),

    currency: z
      .string()
      .optional()
      .transform((val) => val?.toUpperCase()),

    status: z
      .enum(Object.values(LOTTERY_STATUS) as [string, ...string[]])
      .optional(),

    mode: z
      .enum(Object.values(LOTTERY_MODE) as [string, ...string[]])
      .optional(),

    startAt: z.coerce.date().optional(),

    endAt: z.coerce.date({
      required_error: "End date is required",
    }),
  }),
});

export const LotteryValidationSchema = {
  createLotteryZodSchema,
};
