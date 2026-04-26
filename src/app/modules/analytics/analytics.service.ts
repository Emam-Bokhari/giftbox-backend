import { USER_ROLES } from "../../../enums/user";
import { LOTTERY_STATUS } from "../lottery/lottery.constant";
import { Lottery } from "../lottery/lottery.model";
import { LOTTERY_PARTICIPANT_STATUS } from "../participant/participant.constant";
import { LotteryParticipant } from "../participant/participant.model";
import { User } from "../user/user.model";

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

const getAdminDashboardStatsFromDB = async () => {
  const [
    totalUsers,
    totalDrawCompleted,
    pendingPayments,
    ticketStats,
  ] = await Promise.all([
  //  total users
    User.countDocuments({
      role: USER_ROLES.USER,
      verified: true,
    }),

    //  total draw completed
    Lottery.countDocuments({
      status: LOTTERY_STATUS.DRAWN,
    }),

    //  total pending payments
    LotteryParticipant.countDocuments({
      status: LOTTERY_PARTICIPANT_STATUS.PENDING,
    }),

    //  total tickets sold + total revenue
    LotteryParticipant.aggregate([
      {
        $match: {
          status: LOTTERY_PARTICIPANT_STATUS.APPROVED,
        },
      },
      {
        $lookup: {
          from: "lotteries",
          localField: "lotteryId",
          foreignField: "_id",
          as: "lottery",
        },
      },
      { $unwind: "$lottery" },

      {
        $group: {
          _id: null,
          totalTicketsSold: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $ifNull: ["$amount", "$lottery.ticketPrice"],
            },
          },
        },
      },
    ]),
  ]);

  const totalTicketsSold = ticketStats[0]?.totalTicketsSold || 0;
  const totalRevenue = ticketStats[0]?.totalRevenue || 0;

  return {
    stats: {
      totalUsers,
      totalDrawCompleted,
      pendingPayments,
      totalTicketsSold,
      totalRevenue,
    },
  };
};

export const AnalyticsServices = {
    getFinanceAndPaymentsStatsFromDB,
    getAdminDashboardStatsFromDB,
}