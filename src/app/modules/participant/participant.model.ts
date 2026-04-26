import { Schema, model } from "mongoose";
import { TLotteryParticipant } from "./participant.interface";
import { LOTTERY_PARTICIPANT_STATUS } from "./participant.constant";

const lotteryParticipantSchema = new Schema<TLotteryParticipant>(
  {
    lotteryId: {
      type: Schema.Types.ObjectId,
      ref: "Lottery",
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    paymentProof: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      default: 0,
    },

    status: {
      type: String,
      enum: Object.values(LOTTERY_PARTICIPANT_STATUS),
      default: LOTTERY_PARTICIPANT_STATUS.PENDING,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

lotteryParticipantSchema.index({ lotteryId: 1, userId: 1 }, { unique: true });
lotteryParticipantSchema.index({ lotteryId: 1, status: 1 });
lotteryParticipantSchema.index({ userId: 1 });

export const LotteryParticipant = model<TLotteryParticipant>(
  "LotteryParticipant",
  lotteryParticipantSchema,
);
