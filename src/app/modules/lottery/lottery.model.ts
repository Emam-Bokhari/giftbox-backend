import { model, Schema } from "mongoose";
import { TLottery } from "./lottery.interface";
import { LOTTERY_MODE, LOTTERY_STATUS } from "./lottery.constant";

const lotterySchema = new Schema<TLottery>(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    banner: {
      type: String,
      required: true,
    },

    ticketPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: Object.values(LOTTERY_STATUS),
      default: LOTTERY_STATUS.DRAFT,
    },

    mode: {
      type: String,
      enum: Object.values(LOTTERY_MODE),
      required: true,
    },

    startAt: {
      type: Date,
    },

    endAt: {
      type: Date,
      required: true,
    },
    createdAt: {
      type: Date,
    },

    updatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// index
lotterySchema.index({ status: 1, endAt: 1 });
lotterySchema.index({ ticketNumber: 1 }, { unique: true });

export const Lottery = model<TLottery>("Lottery", lotterySchema);
