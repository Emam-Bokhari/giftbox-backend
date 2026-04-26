import { LOTTERY_PARTICIPANT_STATUS } from "../participant/participant.constant";
import { LotteryParticipant } from "../participant/participant.model";

const getFinanceAndPaymentsStatsFromDB = async (query: any) => {
  const filterType = query?.filter || "all";

  let dateFilter = {};

  const now = new Date();

  /* ================= ONLY APPLY FILTER IF NOT "all" ================= */
  if (filterType === "thisWeek") {
    dateFilter = {
      createdAt: { $gte: new Date(now.setDate(now.getDate() - 7)) },
    };
  }

  if (filterType === "thisMonth") {
    dateFilter = {
      createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 1)) },
    };
  }

  if (filterType === "thisYear") {
    dateFilter = {
      createdAt: { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) },
    };
  }

  /* ================= ALL DATA BY DEFAULT ================= */
  const allParticipations = await LotteryParticipant.find(dateFilter);

  if (!allParticipations.length) {
    return {
      filter: "all",
      totalRevenue: 0,
      totalParticipations: 0,
      averageTicketPrice: 0,
    };
  }

  const totalParticipations = allParticipations.length;

  const approvedParticipants = allParticipations.filter(
    (p) => p.status === LOTTERY_PARTICIPANT_STATUS.APPROVED
  );

  const totalRevenue = approvedParticipants.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  const totalTicketsValue = allParticipations.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  const averageTicketPrice =
    totalParticipations > 0
      ? totalTicketsValue / totalParticipations
      : 0;

  return {
    filter: filterType,
    totalRevenue,
    totalParticipations,
    averageTicketPrice,
  };
};

export const AnalyticsServices = {
    getFinanceAndPaymentsStatsFromDB,
}