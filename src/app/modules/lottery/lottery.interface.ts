import { LOTTERY_MODE, LOTTERY_STATUS } from "./lottery.constant";

export type TLottery = {
  ticketNumber: string;
  title: string;
  description: string;
  banner: string;
  ticketPrice: number;
  currency: string;
  status: LOTTERY_STATUS;
  mode: LOTTERY_MODE;
  startAt?: Date;
  endAt: Date;
  createdAt: Date;
  updatedAt: Date;
};
