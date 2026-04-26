import { Schema } from "mongoose";
import { WINNER_SELECTED_BY } from "./winner.constant";

export type TLotteryWinner = {
  lotteryId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  selectedBy: WINNER_SELECTED_BY;
  createdAt: Date;
  rank?: number;
};
