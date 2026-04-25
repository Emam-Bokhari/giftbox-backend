import { z } from "zod";
import { WINNER_SELECTED_BY } from "./winner.constant";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createLotteryWinnerZodSchema = z.object({
  body: z.object({
    lotteryId: z
      .string({
        required_error: "Lottery ID is required",
      })
      .regex(objectIdRegex, "Invalid Lottery ID"),

    userId: z
      .string({
        required_error: "User ID is required",
      })
      .regex(objectIdRegex, "Invalid User ID"),

    selectedBy: z.enum(
      Object.values(WINNER_SELECTED_BY) as [string, ...string[]],
      {
        required_error: "SelectedBy is required",
        invalid_type_error: "Invalid selectedBy value",
      }
    ),
  }),
});

export const WinnerValidationSchema={
    createLotteryWinnerZodSchema,
}