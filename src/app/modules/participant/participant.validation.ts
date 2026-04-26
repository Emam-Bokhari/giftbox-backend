import { z } from "zod";
import { LOTTERY_PARTICIPANT_STATUS } from "./participant.constant";

export const createLotteryParticipantZodSchema = z.object({
  body: z.object({
    lotteryId: z
      .string({
        required_error: "Lottery ID is required",
      })
      .min(1, "Lottery ID cannot be empty"),

    userId: z.string().optional(),

    paymentProof: z
      .string({
        required_error: "Payment proof is required",
      })
      .min(1, "Payment proof cannot be empty"),

    status: z
      .enum(Object.values(LOTTERY_PARTICIPANT_STATUS) as [string, ...string[]])
      .optional(),
  }),
});

const updateStatusZodSchema = z.object({
  body: z.object({
    status: z.enum([
      LOTTERY_PARTICIPANT_STATUS.APPROVED,
      LOTTERY_PARTICIPANT_STATUS.REJECTED,
    ]),
  }),
});

export const ParticipantValidationSchema = {
  createLotteryParticipantZodSchema,
  updateStatusZodSchema,
};
