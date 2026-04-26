import { Schema } from "mongoose";
import { LOTTERY_PARTICIPANT_STATUS } from "./participant.constant";

export type TLotteryParticipant = {
  lotteryId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  paymentProof: string;
  status: LOTTERY_PARTICIPANT_STATUS;
  createdAt: Date;
  updatedAt: Date;
  amount: number;
};
