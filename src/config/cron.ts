import { startLotteryScheduler } from "../app/modules/lottery/lottery.scheduler";


export const initCronJobs = () => {
  startLotteryScheduler();
};