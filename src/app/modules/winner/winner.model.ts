import { Schema, model } from "mongoose";
import { TLotteryWinner } from "./winner.interface";
import { WINNER_SELECTED_BY } from "./winner.constant";

const lotteryWinnerSchema = new Schema<TLotteryWinner>(
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

    selectedBy: {
      type: String,
      enum: Object.values(WINNER_SELECTED_BY),
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


lotteryWinnerSchema.index({ lotteryId: 1, userId: 1 }, { unique: true });
lotteryWinnerSchema.index({ lotteryId: 1 });
lotteryWinnerSchema.index({ userId: 1 });

export const LotteryWinner = model<TLotteryWinner>(
  "LotteryWinner",
  lotteryWinnerSchema
);