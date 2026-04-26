import { z } from "zod";
import { WINNER_SELECTED_BY } from "./winner.constant";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const drawWinnerZodSchema = z.object({
  body: z.object({
    lotteryId: z.string(),
    mode: z.enum([WINNER_SELECTED_BY.RANDOM, WINNER_SELECTED_BY.MANUAL]),
    winnerCount: z.number().min(1),
    selectedUserIds: z.array(z.string()).optional(),
  }),
});

export const WinnerValidationSchema = {
  drawWinnerZodSchema,
};
