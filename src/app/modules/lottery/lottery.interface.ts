import { LOTTERY_STATUS } from "./lottery.constant"

export type TLottery = {
    ticketNumber: string;
    title: string
    description: string
    banner: string
    ticketPrice: number
    currency: string
    status: LOTTERY_STATUS
    startAt?: Date
    endAt: Date
}
