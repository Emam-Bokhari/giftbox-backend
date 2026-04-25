import { Schema } from "mongoose"

export type TLotteryParticipant = {
    lotteryId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    paymentProof: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
}